import { describe, expect, test } from "vitest";
import {
  buildFamilyReport,
  familySummary,
  generateInviteCode,
} from "@/lib/household";
import type { LedgerRow } from "@/lib/ledger";

const d = (iso: string) => new Date(iso);
const now = d("2026-07-18T05:00:00Z");

describe("generateInviteCode", () => {
  test("6 karakter dari alfabet aman (tanpa O/0/I/1)", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
  test("deterministik dengan RNG injeksi", () => {
    const rng = () => 0; // selalu karakter pertama alfabet
    expect(generateInviteCode(rng)).toBe("AAAAAA");
  });
});

describe("familySummary", () => {
  const rowsA: LedgerRow[] = [
    { type: "expense", amount: 300_000, date: d("2026-07-10T01:00:00Z") },
    { type: "income", amount: 5_000_000, date: d("2026-07-01T01:00:00Z") },
    { type: "expense", amount: 50_000, date: d("2026-06-15T01:00:00Z") }, // bulan lalu — abaikan
  ];
  const rowsB: LedgerRow[] = [
    { type: "expense", amount: 700_000, date: d("2026-07-11T01:00:00Z") },
    { type: "saving_deposit", amount: 100_000, pocketId: "p", date: d("2026-07-12T01:00:00Z") },
  ];

  test("agregasi per anggota + total, urut pengeluaran terbesar", () => {
    const s = familySummary(
      [
        { name: "Adi", rows: rowsA },
        { name: "Bela", rows: rowsB },
      ],
      now
    );
    expect(s.perMember[0]).toEqual({ name: "Bela", expense: 700_000, income: 0, saved: 100_000 });
    expect(s.perMember[1]).toEqual({ name: "Adi", expense: 300_000, income: 5_000_000, saved: 0 });
    expect(s.total).toEqual({ expense: 1_000_000, income: 5_000_000, saved: 100_000 });
  });
});

describe("buildFamilyReport", () => {
  test("memuat nama rumah, total, dan baris per anggota", () => {
    const r = buildFamilyReport("Keluarga Dwiki", {
      perMember: [
        { name: "Bela", expense: 700_000, income: 0, saved: 100_000 },
        { name: "Adi", expense: 300_000, income: 5_000_000, saved: 0 },
      ],
      total: { expense: 1_000_000, income: 5_000_000, saved: 100_000 },
    });
    expect(r).toContain("Keluarga Dwiki");
    expect(r).toContain("1.000.000");
    expect(r.indexOf("Bela")).toBeLessThan(r.indexOf("Adi"));
    expect(r).toContain("700.000");
  });
});
