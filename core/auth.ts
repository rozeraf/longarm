import type { NextFunction } from "grammy";
import type { BotContext } from "./types";
import { scryptSync, timingSafeEqual } from "crypto";

const getWhitelistedUsers = () =>
    (process.env.WHITELISTED_USERS || "")
        .split(",")
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id));

function verifyPassword(input: string): boolean {
    const stored = process.env.PASSWORD_HASH;
    if (!stored) return false;

    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;

    try {
        const inputHash = scryptSync(input, salt, 64);
        const storedHash = Buffer.from(hash, "hex");
        return timingSafeEqual(inputHash, storedHash);
    } catch {
        return false;
    }
}

export async function authMiddleware(ctx: BotContext, next: NextFunction) {
    const userId = ctx.from?.id;
    if (!userId || !getWhitelistedUsers().includes(userId)) return;

    if (ctx.session.authenticated) {
        return next();
    }

    if (ctx.message?.text && verifyPassword(ctx.message.text)) {
        ctx.session.authenticated = true;
        await ctx.reply("Authenticated.");
        return;
    }

    await ctx.reply("Password:");
}
