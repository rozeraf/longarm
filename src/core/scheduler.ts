import { CronJob } from "cron";
import type { JobDefinition } from "./types";

const jobs: CronJob[] = [];

export function scheduleJobs(jobDefinitions: JobDefinition[]) {
  for (const jobDef of jobDefinitions) {
    const job = new CronJob(jobDef.cronTime, jobDef.handler, null, true);
    jobs.push(job);
  }
}

export function startScheduler() {
  console.log(`[SCHEDULER] Started with ${jobs.length} jobs.`);
}
