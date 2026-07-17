import { NextResponse } from "next/server";
import { runDailyReminders, runWeeklyReports } from "@/lib/jobs";

/**
 * Pemicu manual (pengujian/darurat): POST /api/cron/run?job=weekly|reminders
 * Header: x-cron-secret = TELEGRAM_WEBHOOK_SECRET.
 * Tidak menyentuh job_runs — pemicu manual tidak menggeser jadwal otomatis.
 */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const given = req.headers.get("x-cron-secret");
  const isDev = process.env.NODE_ENV !== "production";
  if (secret ? given !== secret : !isDev) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = new URL(req.url).searchParams.get("job");
  if (job === "weekly") {
    return NextResponse.json({ job, sent: await runWeeklyReports() });
  }
  if (job === "reminders") {
    return NextResponse.json({ job, sent: await runDailyReminders() });
  }
  return NextResponse.json(
    { error: "job harus weekly atau reminders" },
    { status: 400 }
  );
}
