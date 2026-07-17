import { describe, expect, test } from "vitest";
import {
  isDailyDue,
  isWeeklyDue,
  lastWeekRangeUtc,
  reminderMatchesToday,
} from "@/lib/cron";

// Acuan kalender: 2026-07-13 = Senin, 2026-07-17 = Jumat (WIB = UTC+7).
const utc = (s: string) => new Date(s);

describe("isDailyDue (target 07:00 WIB = 00:00 UTC)", () => {
  test("due pukul 08:00 WIB bila lastRun kemarin", () => {
    expect(
      isDailyDue(utc("2026-07-17T01:00:00Z"), utc("2026-07-16T00:30:00Z"))
    ).toBe(true);
  });
  test("belum due pukul 06:59 WIB", () => {
    expect(
      isDailyDue(utc("2026-07-16T23:59:00Z"), utc("2026-07-16T00:30:00Z"))
    ).toBe(false);
  });
  test("tidak due bila sudah jalan hari ini", () => {
    expect(
      isDailyDue(utc("2026-07-17T05:00:00Z"), utc("2026-07-17T00:10:00Z"))
    ).toBe(false);
  });
  test("due bila belum pernah jalan (lastRun null)", () => {
    expect(isDailyDue(utc("2026-07-17T01:00:00Z"), null)).toBe(true);
  });
});

describe("isWeeklyDue (Senin 07:00 WIB)", () => {
  test("due Senin 07:30 WIB bila lastRun minggu lalu", () => {
    expect(
      isWeeklyDue(utc("2026-07-13T00:30:00Z"), utc("2026-07-06T00:30:00Z"))
    ).toBe(true);
  });
  test("tidak due Selasa bila sudah jalan Senin", () => {
    expect(
      isWeeklyDue(utc("2026-07-14T02:00:00Z"), utc("2026-07-13T00:30:00Z"))
    ).toBe(false);
  });
  test("catch-up: due Rabu bila lastRun 2 minggu lalu", () => {
    expect(
      isWeeklyDue(utc("2026-07-15T03:00:00Z"), utc("2026-06-29T00:30:00Z"))
    ).toBe(true);
  });
  test("belum due Senin 06:00 WIB", () => {
    expect(
      isWeeklyDue(utc("2026-07-12T23:00:00Z"), utc("2026-07-06T00:30:00Z"))
    ).toBe(false);
  });
});

describe("reminderMatchesToday (clamp akhir bulan, WIB)", () => {
  test("tanggal 15 cocok pada 15 Juli WIB", () => {
    expect(reminderMatchesToday(15, utc("2026-07-15T01:00:00Z"))).toBe(true);
  });
  test("tanggal 15 tidak cocok pada 16 Juli", () => {
    expect(reminderMatchesToday(15, utc("2026-07-16T01:00:00Z"))).toBe(false);
  });
  test("tanggal 31 di-clamp: cocok pada 30 Juni (hari terakhir)", () => {
    expect(reminderMatchesToday(31, utc("2026-06-30T01:00:00Z"))).toBe(true);
  });
  test("tanggal 31 tidak cocok pada 29 Juni", () => {
    expect(reminderMatchesToday(31, utc("2026-06-29T01:00:00Z"))).toBe(false);
  });
});

describe("lastWeekRangeUtc", () => {
  test("dari Jumat 17 Jul → Senin 6 Jul 00:00 WIB s/d Senin 13 Jul 00:00 WIB", () => {
    const r = lastWeekRangeUtc(utc("2026-07-17T01:00:00Z"));
    expect(r.start.toISOString()).toBe("2026-07-05T17:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-07-12T17:00:00.000Z");
    expect(r.label).toContain("6");
    expect(r.label).toContain("12");
  });
  test("dari Senin 13 Jul pagi → minggu yang sama (6–12 Jul)", () => {
    const r = lastWeekRangeUtc(utc("2026-07-13T00:30:00Z"));
    expect(r.start.toISOString()).toBe("2026-07-05T17:00:00.000Z");
    expect(r.end.toISOString()).toBe("2026-07-12T17:00:00.000Z");
  });
});
