import { formatRupiah } from "./format";
import { CATEGORY_EMOJI, type Category } from "./types";

export type WeeklyReportInput = {
  name: string;
  rangeLabel: string;
  totalExpense: number;
  topCategories: { category: string; total: number }[];
  income: number;
  saved: number;
  saldo: number;
  budget?: { monthlyLimit: number; spentMonth: number } | null;
};

/** Susun teks laporan mingguan Telegram (murni, tanpa I/O). */
export function buildWeeklyReport(i: WeeklyReportInput): string {
  const lines: string[] = [
    `📅 Laporan Mingguan (${i.rangeLabel})`,
    `Halo ${i.name}! Ringkasan minggu lalu:`,
    "",
    `💸 Pengeluaran: ${formatRupiah(i.totalExpense)}`,
  ];

  for (const c of i.topCategories) {
    const emoji = CATEGORY_EMOJI[c.category as Category] ?? "📦";
    lines.push(`   ${emoji} ${c.category}: ${formatRupiah(c.total)}`);
  }

  lines.push(`💰 Pemasukan: ${formatRupiah(i.income)}`);
  lines.push(`🔵 Ditabung: ${formatRupiah(i.saved)}`);
  lines.push(`💼 Saldo Utama: ${formatRupiah(i.saldo)}`);

  if (i.budget && i.budget.monthlyLimit > 0) {
    const pct = Math.round((i.budget.spentMonth / i.budget.monthlyLimit) * 100);
    lines.push(
      `🎯 Anggaran bulan ini terpakai ${pct}% (${formatRupiah(i.budget.spentMonth)} / ${formatRupiah(i.budget.monthlyLimit)})`
    );
  }

  return lines.join("\n");
}
