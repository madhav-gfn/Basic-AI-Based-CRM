import cron from "node-cron";
import type { ScheduledTask } from "node-cron";
import { prisma } from "../config/database";
import { CampaignStatus } from "@prisma/client";
import { executionService } from "../services/execution.service";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DueCampaign {
  id:   string;
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Poll logic
//
// Runs every tick of the cron schedule.
// Finds every SCHEDULED campaign whose scheduledAt timestamp is in the past
// (or has no scheduledAt — immediate dispatch).
// ─────────────────────────────────────────────────────────────────────────────

async function pollAndDispatch(): Promise<void> {
  const now = new Date();

  let dueCampaigns: DueCampaign[];

  try {
    dueCampaigns = await prisma.campaign.findMany({
      where: {
        status: CampaignStatus.SCHEDULED,
        // scheduledAt: null means "run as soon as polled"
        // scheduledAt <= now means "the scheduled time has passed"
        OR: [
          { scheduledAt: null },
          { scheduledAt: { lte: now } },
        ],
      },
      select: { id: true, name: true },
    });
  } catch (err) {
    // DB unavailable — log and wait for next tick rather than crashing the process
    console.error("[Cron] Failed to query due campaigns:", err);
    return;
  }

  if (dueCampaigns.length === 0) return;

  console.log(
    `[Cron] ${now.toISOString()} — found ${dueCampaigns.length} due campaign(s): ` +
    dueCampaigns.map((c) => `"${c.name}"`).join(", ")
  );

  // Fire each campaign independently.
  // Errors in one campaign are caught here — they do NOT abort the others.
  for (const campaign of dueCampaigns) {
    executionService
      .executeCampaign(campaign.id)
      .catch((err) =>
        console.error(
          `[Cron] Unhandled rejection for campaign "${campaign.name}" (${campaign.id}):`,
          err
        )
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cron job
// ─────────────────────────────────────────────────────────────────────────────

/**
 * initCron
 *
 * Registers the campaign dispatcher as a cron job and returns the task handle
 * so the caller can stop it cleanly (e.g. during graceful shutdown).
 *
 * Schedule: every minute  →  "* * * * *"
 * Timezone: Asia/Kolkata  (override with CRON_TIMEZONE env var)
 */
export function initCron(): ScheduledTask {
  const schedule = process.env.CRON_SCHEDULE  ?? "* * * * *";
  const timezone = process.env.CRON_TIMEZONE  ?? "Asia/Kolkata";

  if (!cron.validate(schedule)) {
    throw new Error(`[Cron] Invalid cron expression: "${schedule}"`);
  }

  console.log(
    `[Cron] Registering campaign dispatcher | schedule: "${schedule}" | tz: ${timezone}`
  );

  const task = cron.schedule(
    schedule,
    async () => {
      // Wrap the entire poll in a try/catch as a final safety net.
      // pollAndDispatch() already handles its own DB errors, but this
      // guards against any truly unexpected synchronous throws.
      try {
        await pollAndDispatch();
      } catch (err) {
        console.error("[Cron] Unexpected error in poll cycle:", err);
      }
    },
    {
      timezone,
    }
  );

  // Graceful shutdown — stop the cron when the process exits
  const stop = () => {
    console.log("[Cron] Shutting down campaign dispatcher...");
    task.stop();
    prisma.$disconnect().catch(console.error);
  };

  process.on("SIGTERM", stop);
  process.on("SIGINT",  stop);

  return task;
}
