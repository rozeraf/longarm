import { bot } from "./bot";
import { authMiddleware } from "./auth";
import { scheduleJobs } from "./scheduler";
import { modules } from "../modules/modules";

export async function loadModules() {
  console.log("[LOADER] Loading modules...");

  bot.use(authMiddleware);

  let totalCommands = 0;
  let totalJobs = 0;

  for (const mod of modules) {
    if (mod.onLoad) {
      await mod.onLoad();
    }

    if (mod.commands) {
      for (const cmd of mod.commands) {
        bot.command(cmd.command, cmd.handler);
        totalCommands++;
      }
    }

    if (mod.jobs) {
      scheduleJobs(mod.jobs);
      totalJobs += mod.jobs.length;
    }

    console.log(`[LOADER] Module '${mod.name}' loaded.`);
  }

  console.log(`[LOADER] Registered ${totalCommands} commands and ${totalJobs} jobs.`);
}
