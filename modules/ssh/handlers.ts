import { InlineKeyboard } from "grammy";
import type { BotContext, BotConversation } from "../../core/types";

// User state for building connection strings
const userState = new Map<number, { user: string; port: string }>();

function getState(ctx: BotContext) {
  const uid = ctx.from?.id;
  if (!uid) return { user: "root", port: "22" };
  if (!userState.has(uid)) {
    userState.set(uid, { user: "root", port: "22" });
  }
  return userState.get(uid)!;
}

function updateState(
  ctx: BotContext,
  partial: { user?: string; port?: string },
) {
  const uid = ctx.from?.id;
  if (!uid) return;
  const state = getState(ctx);
  Object.assign(state, partial);
}

export async function sshCommand(ctx: BotContext) {
  // Initialize state on new command
  const uid = ctx.from?.id;
  if (uid) userState.set(uid, { user: "root", port: "22" });

  await ctx.reply("Где ты сейчас?", {
    reply_markup: new InlineKeyboard()
      .text("Дома, в локальной сети", "ssh:local")
      .text("Удалённо", "ssh:remote"),
  });
}

export async function handleLocal(ctx: BotContext) {
  const state = getState(ctx);
  const text = `Локальное подключение\n\n192.168.1.105`;
  const kb = new InlineKeyboard()
    .text("Скопировать команду", "ssh:copy:local")
    .text("Другой пользователь", "ssh:user:select");

  await ctx.editMessageText(text, { reply_markup: kb });
}

export async function handleRemote(ctx: BotContext) {
  await ctx.editMessageText("Проверяю Tailscale...");

  // Simulated check delay
  await new Promise((r) => setTimeout(r, 500));

  const text = `Tailscale запущен\n\n100.64.x.x`;
  const kb = new InlineKeyboard()
    .text("Подключиться", "ssh:copy:remote")
    .text("Нужен другой порт", "ssh:port:select")
    .row()
    .text("Статус", "ssh:status");

  await ctx.editMessageText(text, { reply_markup: kb });
}

export async function handleStatus(ctx: BotContext) {
  const state = getState(ctx);
  const text = `Tailscale: запущен\nSSH-демон: запущен\nПорт: ${state.port}\nАптайм: 3д 14ч`;
  const kb = new InlineKeyboard().text("Назад", "ssh:back:remote");

  await ctx.editMessageText(text, { reply_markup: kb });
}

export async function handleUserSelect(ctx: BotContext) {
  const kb = new InlineKeyboard()
    .text("vasya", "ssh:user:vasya")
    .text("root", "ssh:user:root")
    .text("другой...", "ssh:user:custom")
    .row()
    .text("Назад", "ssh:local");
  await ctx.editMessageText("Выбери пользователя", { reply_markup: kb });
}

export async function handleUserSet(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (
    data?.startsWith("ssh:user:") &&
    data !== "ssh:user:custom" &&
    data !== "ssh:user:select"
  ) {
    const user = data.replace("ssh:user:", "");
    updateState(ctx, { user });
    await ctx.answerCallbackQuery({ text: `Пользователь ${user} выбран` });
    await handleLocal(ctx);
  } else {
    await ctx.answerCallbackQuery();
  }
}

export async function customUserConversation(
  conversation: BotConversation,
  ctx: BotContext,
) {
  await ctx.editMessageText("Напиши имя пользователя текстом:");
  const responseCtx = await conversation.wait();

  if (responseCtx.message?.text) {
    updateState(ctx, { user: responseCtx.message.text.trim() });

    // Attempt to delete user message and our prompt to keep chat clean
    await responseCtx.deleteMessage().catch(() => {});
    await ctx.deleteMessage().catch(() => {});

    const text = `Локальное подключение\n\n192.168.1.105`;
    const kb = new InlineKeyboard()
      .text("Скопировать команду", "ssh:copy:local")
      .text("Другой пользователь", "ssh:user:select");

    await responseCtx.reply(text, { reply_markup: kb });
  }
}

export async function handleCustomUser(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter("ssh-custom-user");
}

export async function handlePortSelect(ctx: BotContext) {
  const kb = new InlineKeyboard()
    .text("22", "ssh:port:22")
    .text("2222", "ssh:port:2222")
    .row()
    .text("8022", "ssh:port:8022")
    .text("Ввести вручную", "ssh:port:custom")
    .row()
    .text("Назад", "ssh:back:remote");
  await ctx.editMessageText("Выбери порт", { reply_markup: kb });
}

export async function handlePortSet(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (
    data?.startsWith("ssh:port:") &&
    data !== "ssh:port:custom" &&
    data !== "ssh:port:select"
  ) {
    const port = data.replace("ssh:port:", "");
    updateState(ctx, { port });
    await ctx.answerCallbackQuery({ text: `Порт ${port} выбран` });
    await handleRemote(ctx);
  } else {
    await ctx.answerCallbackQuery();
  }
}

export async function customPortConversation(
  conversation: BotConversation,
  ctx: BotContext,
) {
  await ctx.editMessageText("Введи номер порта:");
  const responseCtx = await conversation.wait();

  if (responseCtx.message?.text) {
    updateState(ctx, { port: responseCtx.message.text.trim() });

    await responseCtx.deleteMessage().catch(() => {});
    await ctx.deleteMessage().catch(() => {});

    const text = `Tailscale запущен\n\n100.64.x.x`;
    const kb = new InlineKeyboard()
      .text("Подключиться", "ssh:copy:remote")
      .text("Нужен другой порт", "ssh:port:select")
      .row()
      .text("Статус", "ssh:status");

    await responseCtx.reply(text, { reply_markup: kb });
  }
}

export async function handleCustomPort(ctx: BotContext) {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter("ssh-custom-port");
}

export async function handleCopy(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  const state = getState(ctx);
  const isLocal = data === "ssh:copy:local";
  const ip = isLocal ? "192.168.1.105" : "100.64.x.x";
  const portPart = !isLocal && state.port !== "22" ? ` -p ${state.port}` : "";
  const cmd = `\`ssh ${state.user}@${ip}${portPart}\``;

  await ctx.answerCallbackQuery();
  await ctx.reply(cmd, { parse_mode: "Markdown" });
}

export async function sshCallbackHandler(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  switch (data) {
    case "ssh:local":
      return handleLocal(ctx);
    case "ssh:remote":
      return handleRemote(ctx);
    case "ssh:status":
      return handleStatus(ctx);
    case "ssh:user:select":
      return handleUserSelect(ctx);
    case "ssh:user:custom":
      return handleCustomUser(ctx);
    case "ssh:port:select":
      return handlePortSelect(ctx);
    case "ssh:port:custom":
      return handleCustomPort(ctx);
    case "ssh:copy:local":
    case "ssh:copy:remote":
      return handleCopy(ctx);
    case "ssh:back:remote":
      return handleRemote(ctx);
    default:
      if (data.startsWith("ssh:user:")) return handleUserSet(ctx);
      if (data.startsWith("ssh:port:")) return handlePortSet(ctx);
  }
}
