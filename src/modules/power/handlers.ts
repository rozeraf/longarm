import { exec } from "child_process";
import { promisify } from "util";
import type { BotContext } from "../../core/types";

const execAsync = promisify(exec);

export async function rebootHandler(ctx: BotContext) {
  await ctx.reply("Rebooting system in a few seconds...");
  try {
    // We don't await this immediately so the message has time to send
    setTimeout(() => {
      execAsync("reboot").catch(console.error);
    }, 2000);
  } catch (err) {
    await ctx.reply(`Failed to initiate reboot: ${err}`);
  }
}

export async function shutdownHandler(ctx: BotContext) {
  await ctx.reply("Shutting down system in a few seconds...");
  try {
    setTimeout(() => {
      execAsync("poweroff").catch(console.error);
    }, 2000);
  } catch (err) {
    await ctx.reply(`Failed to initiate shutdown: ${err}`);
  }
}
