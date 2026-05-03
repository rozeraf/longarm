import { exec } from "child_process";
import { promisify } from "util";
import { existsSync, unlinkSync } from "fs";
import { InputFile } from "grammy";
import type { BotContext } from "../../core/types";
import path from "path";

const execAsync = promisify(exec);

export async function photoHandler(ctx: BotContext) {
  const tmpPath = path.join(process.cwd(), `photo_${Date.now()}.jpg`);

  await ctx.reply("Attempting to capture photo...");

  try {
    // Attempt to capture a frame from /dev/video0
    // -f v4l2: format
    // -i /dev/video0: input device
    // -frames:v 1: capture one frame
    // -y: overwrite output file
    await execAsync(`ffmpeg -f v4l2 -i /dev/video0 -frames:v 1 "${tmpPath}" -y`);

    if (existsSync(tmpPath)) {
      await ctx.replyWithPhoto(new InputFile(tmpPath));
      unlinkSync(tmpPath);
    } else {
      throw new Error("Failed to generate photo file.");
    }
  } catch (err: any) {
    console.error("[CAMERA] Error capturing photo:", err);
    let errorMsg = "Failed to capture photo.";
    if (err.message?.includes("No such file or directory") || err.stderr?.includes("No such file or directory")) {
      errorMsg = "No camera device found (/dev/video0).";
    }
    await ctx.reply(errorMsg);

    // Cleanup if file was somehow created but failed later
    if (existsSync(tmpPath)) {
      unlinkSync(tmpPath);
    }
  }
}
