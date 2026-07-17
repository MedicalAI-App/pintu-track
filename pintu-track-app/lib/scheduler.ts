import { eq } from "drizzle-orm";
import { isDailyDue, isWeeklyDue } from "./cron";
import { db } from "./db";
import { jobRuns } from "./db/schema";
import { runDailyReminders, runWeeklyReports } from "./jobs";

const JOB_WEEKLY = "weekly_report";
const JOB_REMINDERS = "daily_reminders";

let started = false;
let inFlight = false;

async function markRun(job: string, at: Date) {
  await db
    .insert(jobRuns)
    .values({ job, lastRunAt: at })
    .onConflictDoUpdate({ target: jobRuns.job, set: { lastRunAt: at } });
}

async function tick() {
  if (inFlight) return;
  inFlight = true;
  try {
    const now = new Date();
    const runs = await db.select().from(jobRuns);
    const lastOf = (job: string) =>
      runs.find((r) => r.job === job)?.lastRunAt ?? null;

    if (isWeeklyDue(now, lastOf(JOB_WEEKLY))) {
      await markRun(JOB_WEEKLY, now); // tandai dulu — kegagalan kirim tidak memicu badai retry per menit
      const sent = await runWeeklyReports(now);
      console.log(`[scheduler] laporan mingguan terkirim: ${sent}`);
    }
    if (isDailyDue(now, lastOf(JOB_REMINDERS))) {
      await markRun(JOB_REMINDERS, now);
      const sent = await runDailyReminders(now);
      console.log(`[scheduler] pengingat tagihan terkirim: ${sent}`);
    }
  } catch (e) {
    console.error("[scheduler] tick gagal:", e);
  } finally {
    inFlight = false;
  }
}

/** Mulai loop penjadwal (idempotent; dipanggil dari instrumentation.ts). */
export function startScheduler() {
  if (started) return;
  started = true;
  console.log("[scheduler] aktif — cek tiap 60 detik (WIB)");
  setInterval(tick, 60_000);
  void tick();
}
