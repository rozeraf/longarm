// Longarm Bot Entry Point
import { bot } from "./core/bot";
import { loadModules } from "./core/loader";
import { scheduleJobs, startScheduler } from "./core/scheduler";

async function main() {
    console.log("Starting Longarm Bot...");

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
