import { describe, expect, test } from "vitest";
import {
  monthlySummary,
  pocketBalances,
  saldoUtama,
  type LedgerRow,
} from "@/lib/ledger";

const d = (iso: string) => new Date(iso);
const rows: LedgerRow[] = [
  { type: "income", amount: 5_000_000, date: d("2026-07-01") },
  { type: "expense", amount: 30_000, date: d("2026-07-02") },
  { type: "saving_deposit", amount: 100_000, pocketId: "p1", date: d("2026-07-03") },
  { type: "saving_withdrawal", amount: 25_000, pocketId: "p1", date: d("2026-07-04") },
  { type: "saving_deposit", amount: 50_000, pocketId: "p2", date: d("2026-06-10") },
  { type: "expense", amount: 10_000, date: d("2026-06-15") },
];

describe("ledger", () => {
  test("saldoUtama = income − expense − deposit + withdrawal", () => {
    expect(saldoUtama(rows)).toBe(
      5_000_000 - 30_000 - 100_000 + 25_000 - 50_000 - 10_000
    );
  });
  test("pocketBalances per kantong", () => {
    const b = pocketBalances(rows);
    expect(b.get("p1")).toBe(75_000);
    expect(b.get("p2")).toBe(50_000);
  });
  test("monthlySummary hanya bulan berjalan", () => {
    const s = monthlySummary(rows, d("2026-07-20"));
    expect(s).toEqual({ income: 5_000_000, expense: 30_000, saved: 75_000 });
  });
  test("saldo boleh negatif", () => {
    expect(
      saldoUtama([{ type: "expense", amount: 7_000, date: d("2026-07-01") }])
    ).toBe(-7_000);
  });
});

describe("saving_topup (top-up dari luar)", () => {
  const topupRows: LedgerRow[] = [
    { type: "income", amount: 1_000_000, date: d("2026-07-01") },
    { type: "saving_topup", amount: 200_000, pocketId: "p1", date: d("2026-07-05") },
  ];
  test("Saldo Utama TIDAK berubah oleh topup", () => {
    expect(saldoUtama(topupRows)).toBe(1_000_000);
  });
  test("isi kantong bertambah oleh topup", () => {
    expect(pocketBalances(topupRows).get("p1")).toBe(200_000);
  });
  test("ditabung bulan ini menghitung topup", () => {
    expect(monthlySummary(topupRows, d("2026-07-20")).saved).toBe(200_000);
  });
});
