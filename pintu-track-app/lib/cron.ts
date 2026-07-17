/**
 * Logika penjadwalan murni (zona waktu WIB = UTC+7, offset manual).
 * Semantik "catch-up": job jatuh tempo bila now ≥ target terakhir
 * dan lastRun < target — aplikasi yang sempat mati tetap mengirim
 * sekali begitu hidup lagi, tanpa dobel.
 */

const WIB_MS = 7 * 3600 * 1000;

/** Geser instan +7 jam; baca komponennya via getUTC* = waktu WIB. */
export function toWib(d: Date): Date {
  return new Date(d.getTime() + WIB_MS);
}

/** Instan UTC untuk "hari ini (WIB) pukul hourWib:00". */
function todayTargetUtc(now: Date, hourWib: number): Date {
  const w = toWib(now);
  return new Date(
    Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate(), hourWib) - WIB_MS
  );
}

export function isDailyDue(
  now: Date,
  lastRun: Date | null,
  hourWib = 7
): boolean {
  const target = todayTargetUtc(now, hourWib);
  return now >= target && (!lastRun || lastRun < target);
}

/** Instan UTC untuk "Senin terakhir (WIB) pukul hourWib:00". */
function lastMondayTargetUtc(now: Date, hourWib: number): Date {
  const w = toWib(now);
  const dow = w.getUTCDay(); // 0=Minggu..1=Senin
  const sinceMonday = (dow + 6) % 7;
  return new Date(
    Date.UTC(
      w.getUTCFullYear(),
      w.getUTCMonth(),
      w.getUTCDate() - sinceMonday,
      hourWib
    ) - WIB_MS
  );
}

export function isWeeklyDue(
  now: Date,
  lastRun: Date | null,
  hourWib = 7
): boolean {
  const target = lastMondayTargetUtc(now, hourWib);
  return now >= target && (!lastRun || lastRun < target);
}

/** Cocokkah pengingat tanggal-N dengan hari ini (WIB)? 29–31 di-clamp ke akhir bulan. */
export function reminderMatchesToday(dayOfMonth: number, now: Date): boolean {
  const w = toWib(now);
  const daysInMonth = new Date(
    Date.UTC(w.getUTCFullYear(), w.getUTCMonth() + 1, 0)
  ).getUTCDate();
  return w.getUTCDate() === Math.min(dayOfMonth, daysInMonth);
}

/** Rentang minggu lalu: [Senin lalu 00:00 WIB, Senin ini 00:00 WIB) sebagai instan UTC. */
export function lastWeekRangeUtc(now: Date): {
  start: Date;
  end: Date;
  label: string;
} {
  const w = toWib(now);
  const dow = w.getUTCDay();
  const sinceMonday = (dow + 6) % 7;
  const end = new Date(
    Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate() - sinceMonday) -
      WIB_MS
  );
  const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);

  const fmt = (d: Date) =>
    toWib(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });
  const lastDay = new Date(end.getTime() - 24 * 3600 * 1000);
  return { start, end, label: `${fmt(start)} – ${fmt(lastDay)}` };
}
