import { describe, expect, test } from "vitest";
import { buildWeeklyReport } from "@/lib/report";

const base = {
  name: "Dwiki",
  rangeLabel: "6 Jul – 12 Jul",
  totalExpense: 472_000,
  topCategories: [
    { category: "Makanan & Minuman", total: 250_000 },
    { category: "Transportasi", total: 122_000 },
    { category: "Hiburan", total: 100_000 },
  ],
  income: 5_000_000,
  saved: 150_000,
  saldo: 4_500_000,
  budget: { monthlyLimit: 2_000_000, spentMonth: 800_000 },
};

describe("buildWeeklyReport", () => {
  test("memuat rentang, total, dan saldo berformat rupiah", () => {
    const r = buildWeeklyReport(base);
    expect(r).toContain("6 Jul – 12 Jul");
    expect(r).toContain("472.000");
    expect(r).toContain("5.000.000");
    expect(r).toContain("150.000");
    expect(r).toContain("4.500.000");
  });
  test("top kategori urut dengan emoji", () => {
    const r = buildWeeklyReport(base);
    const i1 = r.indexOf("Makanan & Minuman");
    const i2 = r.indexOf("Transportasi");
    const i3 = r.indexOf("Hiburan");
    expect(i1).toBeGreaterThan(-1);
    expect(i1).toBeLessThan(i2);
    expect(i2).toBeLessThan(i3);
    expect(r).toContain("🍔");
  });
  test("baris anggaran memuat persentase saat budget ada", () => {
    expect(buildWeeklyReport(base)).toContain("40%");
  });
  test("tanpa budget → tidak ada baris anggaran", () => {
    const r = buildWeeklyReport({ ...base, budget: null });
    expect(r).not.toContain("nggaran");
  });
});
