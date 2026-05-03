import { Bot, session } from "grammy";
import { conversations } from "@grammyjs/conversations";
import type { BotContext, SessionData } from "./types";

export const bot = new Bot<BotContext>(process.env.BOT_TOKEN || "");

bot.use(
  session({
    initial: (): SessionData => ({
      authenticatedAt: undefined,
    }),
  }),
);

bot.use(conversations());
