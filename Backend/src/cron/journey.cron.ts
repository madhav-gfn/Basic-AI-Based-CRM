import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import { journeyService } from "../services/journey.service";

// ─────────────────────────────────────────────────────────────────────────────
// Journey engine cron
//
// Runs on its own (slower) schedule than the campaign dispatcher — enrollment
// scans and step dispatch are inherently lower-urgency than a marketer hitting
// "launch now" on a campaign. Two passes per tick:
//   1. Enrollment scan — evaluate triggers, enroll newly-qualifying customers
//   2. Step dispatch   — send any step whose delay has elapsed
// ─────────────────────────────────────────────────────────────────────────────

async function runJourneyTick(): Promise<void> {
  try {
    await journeyService.runEnrollmentScan();
  } catch (err) {
    console.error("[JourneyCron] Enrollment scan failed:", err);
  }

  try {
    await journeyService.runStepDispatch();
  } catch (err) {
    console.error("[JourneyCron] Step dispatch failed:", err);
  }
}

/**
 * initJourneyCron
 *
 * Schedule: every 5 minutes  →  "*\/5 * * * *"
 * Timezone: Asia/Kolkata  (override with CRON_TIMEZONE env var)
 */
export function initJourneyCron(): ScheduledTask {
  const schedule = process.env.JOURNEY_CRON_SCHEDULE ?? "*/5 * * * *";
  const timezone = process.env.CRON_TIMEZONE ?? "Asia/Kolkata";

  if (!cron.validate(schedule)) {
    throw new Error(`[JourneyCron] Invalid cron expression: "${schedule}"`);
  }

  console.log(`[JourneyCron] Registering journey engine | schedule: "${schedule}" | tz: ${timezone}`);

  const task = cron.schedule(schedule, runJourneyTick, { timezone });

  process.on("SIGTERM", () => task.stop());
  process.on("SIGINT", () => task.stop());

  return task;
}
