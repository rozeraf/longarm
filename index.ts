import { bot } from "./core/bot";
import { loadModules } from "./core/loader";
import { rotateDailyPassword } from "./core/auth";
import { scheduleJobs, startScheduler } from "./core/scheduler";

async function main() {
  console.log("Starting Longarm Bot...");

  // Schedule daily password rotation at midnight
  scheduleJobs([
    {
      cronTime: "0 0 * * *",
      handler: () => {
        rotateDailyPassword();
        console.log("[AUTH] Daily password rotated.");
      },
    },
  ]);

  try {
    await loadModules();
    startScheduler();
    console.log("Starting bot polling...");

    bot.catch((err) => {
      console.error(`Error for ${err.ctx.update.update_id}:`, err.error);
    });

    await bot.start();
  } catch (err) {
    console.error("Failed to start bot:", err);
  }
}

main();
