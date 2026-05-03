import { InlineKeyboard } from "grammy";
import { execSync, spawnSync } from "child_process";
import os from "os";
import type { BotContext, BotConversation } from "../../core/types";

// ─── State ───────────────────────────────────────────────────────────────────

interface SshState {
    user: string;
    port: string;
}

const userState = new Map<number, SshState>();

function getState(ctx: BotContext): SshState {
    const uid = ctx.from?.id;
    if (!uid) return { user: systemUser(), port: "22" };
    if (!userState.has(uid)) {
        userState.set(uid, { user: systemUser(), port: "22" });
    }
    return userState.get(uid)!;
}

function updateState(ctx: BotContext, partial: Partial<SshState>) {
    const uid = ctx.from?.id;
    if (!uid) return;
    Object.assign(getState(ctx), partial);
}

// ─── System helpers ───────────────────────────────────────────────────────────

function systemUser(): string {
    try {
        return os.userInfo().username;
    } catch {
        return "user";
    }
}

function getLocalIp(): string | null {
    const ifaces = os.networkInterfaces();
    for (const iface of Object.values(ifaces)) {
        for (const entry of iface ?? []) {
            if (
                entry.family === "IPv4" &&
                !entry.internal &&
                (entry.address.startsWith("192.168.") ||
                    entry.address.startsWith("10.") ||
                    entry.address.startsWith("172."))
            ) {
                return entry.address;
            }
        }
    }
    return null;
}

function getTailscaleIp(): string | null {
    try {
        const result = spawnSync("tailscale", ["ip", "-4"], {
            encoding: "utf8",
            timeout: 5000,
        });
        if (result.status === 0 && result.stdout.trim()) {
            return result.stdout.trim();
        }
        return null;
    } catch {
        return null;
    }
}

function ensureTailscale(): { ok: boolean; ip: string | null } {
    // Check current status
    try {
        const status = spawnSync("tailscale", ["status", "--json"], {
            encoding: "utf8",
            timeout: 5000,
        });
        if (status.status === 0) {
            const json = JSON.parse(status.stdout);
            if (json.BackendState === "Running") {
                const ip = getTailscaleIp();
                return { ok: true, ip };
            }
        }
    } catch {}

    // Try to bring up
    try {
        spawnSync("tailscale", ["up"], { timeout: 10_000 });
        const ip = getTailscaleIp();
        return { ok: ip !== null, ip };
    } catch {
        return { ok: false, ip: null };
    }
}

function getUptime(): string {
    const secs = os.uptime();
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d > 0) return `${d}д ${h}ч`;
    if (h > 0) return `${h}ч ${m}м`;
    return `${m}м`;
}

function isSshDaemonRunning(): boolean {
    try {
        // Linux (systemd)
        const r = spawnSync("systemctl", ["is-active", "--quiet", "ssh"], {
            timeout: 3000,
        });
        if (r.status === 0) return true;
        // macOS
        const m = spawnSync("launchctl", ["list", "com.openssh.sshd"], {
            timeout: 3000,
        });
        return m.status === 0;
    } catch {
        return false;
    }
}

// ─── Screen builders ──────────────────────────────────────────────────────────

function buildLocalText(state: SshState, ip: string): string {
    return [
        "Локальное подключение",
        "",
        `Адрес: ${ip}`,
        `Пользователь: ${state.user}`,
        `Порт: ${state.port}`,
    ].join("\n");
}

function buildRemoteText(state: SshState, ip: string): string {
    return [
        "Tailscale запущен",
        "",
        `Адрес: ${ip}`,
        `Пользователь: ${state.user}`,
        `Порт: ${state.port}`,
    ].join("\n");
}

function buildCommand(state: SshState, ip: string): string {
    const portPart = state.port !== "22" ? ` -p ${state.port}` : "";
    return `ssh ${state.user}@${ip}${portPart}`;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function sshCommand(ctx: BotContext) {
    const uid = ctx.from?.id;
    if (uid) userState.set(uid, { user: systemUser(), port: "22" });

    await ctx.reply("Где ты сейчас?", {
        reply_markup: new InlineKeyboard()
            .text("Дома, в локальной сети", "ssh:local")
            .text("Удалённо", "ssh:remote"),
    });
}

export async function handleLocal(ctx: BotContext) {
    const state = getState(ctx);
    const ip = getLocalIp();

    if (!ip) {
        await ctx.editMessageText(
            "Не удалось определить локальный IP.\nПроверь подключение к сети.",
            {
                reply_markup: new InlineKeyboard().text("Назад", "ssh:start"),
            },
        );
        return;
    }

    const kb = new InlineKeyboard()
        .text("Получить команду", "ssh:copy:local")
        .row()
        .text("Пользователь", "ssh:user:select")
        .text("Порт", "ssh:port:select:local");

    await ctx.editMessageText(buildLocalText(state, ip), { reply_markup: kb });
}

export async function handleRemote(ctx: BotContext) {
    await ctx.editMessageText("Проверяю Tailscale...");

    const { ok, ip } = ensureTailscale();

    if (!ok || !ip) {
        await ctx.editMessageText(
            "Tailscale не запустился.\nПроверь подключение к интернету или запусти вручную.",
            {
                reply_markup: new InlineKeyboard()
                    .text("Повторить", "ssh:remote")
                    .text("Назад", "ssh:start"),
            },
        );
        return;
    }

    const state = getState(ctx);
    const kb = new InlineKeyboard()
        .text("Получить команду", "ssh:copy:remote")
        .row()
        .text("Пользователь", "ssh:user:select")
        .text("Порт", "ssh:port:select:remote")
        .row()
        .text("Статус", "ssh:status");

    await ctx.editMessageText(buildRemoteText(state, ip), { reply_markup: kb });
}

export async function handleStart(ctx: BotContext) {
    await ctx.editMessageText("Где ты сейчас?", {
        reply_markup: new InlineKeyboard()
            .text("Дома, в локальной сети", "ssh:local")
            .text("Удалённо", "ssh:remote"),
    });
}

export async function handleStatus(ctx: BotContext) {
    const state = getState(ctx);
    const tsIp = getTailscaleIp();
    const localIp = getLocalIp();
    const sshRunning = isSshDaemonRunning();

    const lines = [
        `SSH-демон: ${sshRunning ? "запущен" : "не запущен"}`,
        `Порт: ${state.port}`,
        `Пользователь: ${state.user}`,
        `Локальный IP: ${localIp ?? "не определён"}`,
        `Tailscale IP: ${tsIp ?? "не активен"}`,
        `Аптайм: ${getUptime()}`,
    ];

    await ctx.editMessageText(lines.join("\n"), {
        reply_markup: new InlineKeyboard().text("Назад", "ssh:back:remote"),
    });
}

export async function handleUserSelect(ctx: BotContext, backTo: string) {
    const sysUser = systemUser();
    const kb = new InlineKeyboard()
        .text(sysUser, `ssh:user:set:${sysUser}`)
        .text("root", "ssh:user:set:root");

    if (sysUser !== "root") {
        kb.row();
    }

    kb.text("другой...", "ssh:user:custom").row().text("Назад", backTo);

    await ctx.editMessageText("Выбери пользователя", { reply_markup: kb });
}

export async function handleUserSet(ctx: BotContext, user: string) {
    updateState(ctx, { user });
    await ctx.answerCallbackQuery({ text: `Пользователь: ${user}` });
    // Return to whichever screen user came from - check if tailscale is up
    const tsIp = getTailscaleIp();
    if (tsIp) {
        await handleRemote(ctx);
    } else {
        await handleLocal(ctx);
    }
}

export async function customUserConversation(
    conversation: BotConversation,
    ctx: BotContext,
) {
    await ctx.editMessageText("Напиши имя пользователя:");
    const response = await conversation.wait();
    const text = response.message?.text?.trim();

    await response.deleteMessage().catch(() => {});

    if (!text) {
        await ctx.reply("Имя не распознано, попробуй снова.", {
            reply_markup: new InlineKeyboard().text("Назад", "ssh:user:select"),
        });
        return;
    }

    updateState(ctx, { user: text });
    await ctx.answerCallbackQuery?.();

    const tsIp = getTailscaleIp();
    if (tsIp) {
        await handleRemote(ctx);
    } else {
        await handleLocal(ctx);
    }
}

export async function handleCustomUser(ctx: BotContext) {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter("ssh-custom-user");
}

export async function handlePortSelect(ctx: BotContext, backTo: string) {
    const kb = new InlineKeyboard()
        .text("22", `ssh:port:set:22`)
        .text("2222", `ssh:port:set:2222`)
        .text("8022", `ssh:port:set:8022`)
        .row()
        .text("Ввести вручную", "ssh:port:custom")
        .row()
        .text("Назад", backTo);

    await ctx.editMessageText("Выбери порт", { reply_markup: kb });
}

export async function handlePortSet(ctx: BotContext, port: string) {
    updateState(ctx, { port });
    await ctx.answerCallbackQuery({ text: `Порт: ${port}` });
    const tsIp = getTailscaleIp();
    if (tsIp) {
        await handleRemote(ctx);
    } else {
        await handleLocal(ctx);
    }
}

export async function customPortConversation(
    conversation: BotConversation,
    ctx: BotContext,
) {
    await ctx.editMessageText("Введи номер порта (например: 2222):");
    const response = await conversation.wait();
    const text = response.message?.text?.trim();

    await response.deleteMessage().catch(() => {});

    const port = Number(text);
    if (!text || isNaN(port) || port < 1 || port > 65535) {
        await ctx.reply("Некорректный порт. Введи число от 1 до 65535.", {
            reply_markup: new InlineKeyboard().text(
                "Назад",
                "ssh:port:select:local",
            ),
        });
        return;
    }

    updateState(ctx, { port: String(port) });

    const tsIp = getTailscaleIp();
    if (tsIp) {
        await handleRemote(ctx);
    } else {
        await handleLocal(ctx);
    }
}

export async function handleCustomPort(ctx: BotContext) {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter("ssh-custom-port");
}

export async function handleCopy(ctx: BotContext, type: "local" | "remote") {
    const state = getState(ctx);
    const ip = type === "local" ? getLocalIp() : getTailscaleIp();

    if (!ip) {
        await ctx.answerCallbackQuery({ text: "IP не определён" });
        return;
    }

    const cmd = buildCommand(state, ip);
    await ctx.answerCallbackQuery();
    await ctx.reply(`\`${cmd}\``, { parse_mode: "Markdown" });
}

// ─── Main callback router ─────────────────────────────────────────────────────

export async function sshCallbackHandler(ctx: BotContext) {
    const data = ctx.callbackQuery?.data;
    if (!data) return;

    // Exact matches
    switch (data) {
        case "ssh:start":
            return handleStart(ctx);
        case "ssh:local":
            return handleLocal(ctx);
        case "ssh:remote":
            return handleRemote(ctx);
        case "ssh:back:remote":
            return handleRemote(ctx);
        case "ssh:status":
            return handleStatus(ctx);
        case "ssh:user:select":
            return handleUserSelect(ctx, "ssh:local");
        case "ssh:user:custom":
            return handleCustomUser(ctx);
        case "ssh:port:custom":
            return handleCustomPort(ctx);
        case "ssh:copy:local":
            return handleCopy(ctx, "local");
        case "ssh:copy:remote":
            return handleCopy(ctx, "remote");

        // Port select with back context
        case "ssh:port:select:local":
            return handlePortSelect(ctx, "ssh:local");
        case "ssh:port:select:remote":
            return handlePortSelect(ctx, "ssh:back:remote");
    }

    // Prefix matches
    if (data.startsWith("ssh:user:set:")) {
        return handleUserSet(ctx, data.replace("ssh:user:set:", ""));
    }
    if (data.startsWith("ssh:port:set:")) {
        return handlePortSet(ctx, data.replace("ssh:port:set:", ""));
    }

    await ctx.answerCallbackQuery();
}
