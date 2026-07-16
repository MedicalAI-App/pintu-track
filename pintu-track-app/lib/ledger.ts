import type { TransactionType } from "./types";

/** Baris minimal yang dibutuhkan perhitungan — subset dari Transaction. */
export type LedgerRow = {
  type: TransactionType;
  amount: number;
  pocketId?: string | null;
  date: Date | string;
};

const SIGN: Record<TransactionType, number> = {
  income: 1,
  expense: -1,
  saving_deposit: -1,
  saving_withdrawal: 1,
};

/** Saldo Utama sepanjang masa. Boleh negatif — jangan pernah blokir pencatatan. */
export function saldoUtama(rows: LedgerRow[]): number {
  return rows.reduce((s, r) => s + SIGN[r.type] * r.amount, 0);
}

/** Isi tiap kantong: Σdeposit − Σwithdrawal per pocketId. */
export function pocketBalances(rows: LedgerRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (!r.pocketId) continue;
    if (r.type !== "saving_deposit" && r.type !== "saving_withdrawal") continue;
    const delta = r.type === "saving_deposit" ? r.amount : -r.amount;
    out.set(r.pocketId, (out.get(r.pocketId) ?? 0) + delta);
  }
  return out;
}

/** Ringkasan bulan berjalan: pemasukan, pengeluaran, bersih ditabung. */
export function monthlySummary(rows: LedgerRow[], now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  let income = 0;
  let expense = 0;
  let saved = 0;
  for (const r of rows) {
    const t = new Date(r.date);
    if (t < start || t > now) continue;
    if (r.type === "income") income += r.amount;
    if (r.type === "expense") expense += r.amount;
    if (r.type === "saving_deposit") saved += r.amount;
    if (r.type === "saving_withdrawal") saved -= r.amount;
  }
  return { income, expense, saved };
}
