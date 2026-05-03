import type { NextFunction } from "grammy";
import type { BotContext } from "./types";
import { randomBytes } from "crypto";

const getWhitelistedUsers = () => {
  return (process.env.WHITELISTED_USERS || "")
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id));
};

let dailyPassword = "";

export function generateDailyPassword(): string {
  const pwd = randomBytes(4).toString("hex");
  console.log(`[AUTH] Daily password is: ${pwd}`);
  return pwd;
}

export function rotateDailyPassword() {
  dailyPassword = generateDailyPassword();
}

// Initialize on startup
rotateDailyPassword();

export async function authMiddleware(ctx: BotContext, next: NextFunction) {
  const userId = ctx.from?.id;
  const WHITELISTED_USERS = getWhitelistedUsers();

  if (!userId || !WHITELISTED_USERS.includes(userId)) {
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  if (ctx.session.authenticatedAt === today) {
    return next();
  }

  if (ctx.message?.text === dailyPassword) {
    ctx.session.authenticatedAt = today;
    await ctx.reply("Authentication successful. You can now use the bot.");
    return;
  }

  await ctx.reply("Please enter the daily password to continue.");
}
