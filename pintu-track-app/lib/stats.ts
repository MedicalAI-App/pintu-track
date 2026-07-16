import { eq } from "drizzle-orm";
import { db } from "./db";
import { budgets, pockets, transactions } from "./db/schema";
import {
  monthlySummary,
  pocketBalances,
  saldoUtama,
  type LedgerRow,
} from "./ledger";
import type { Pocket, TransactionType } from "./types";

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function allRows(userId: string): Promise<LedgerRow[]> {
  const rows = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
      pocketId: transactions.pocketId,
      date: transactions.date,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId));
  return rows.map((r) => ({ ...r, type: r.type as TransactionType }));
}

/** Angka untuk bot & peringatan anggaran. totalToday/totalMonth = expense saja. */
export async function totalsFor(userId: string) {
  const rows = await allRows(userId);
  const today = startOfDay();
  const month = startOfMonth();
  const totalToday = rows
    .filter((r) => r.type === "expense" && new Date(r.date) >= today)
    .reduce((s, r) => s + r.amount, 0);
  const totalMonth = rows
    .filter((r) => r.type === "expense" && new Date(r.date) >= month)
    .reduce((s, r) => s + r.amount, 0);
  const [budget] = await db
    .select()
    .from(budgets)
    .where(eq(budgets.userId, userId))
    .limit(1);
  return { totalToday, totalMonth, budget: budget ?? null, saldo: saldoUtama(rows) };
}

/** Ringkasan lengkap untuk /api/summary & halaman kantong. */
export async function summaryFor(userId: string) {
  const rows = await allRows(userId);
  const list = await db
    .select()
    .from(pockets)
    .where(eq(pockets.userId, userId))
    .orderBy(pockets.createdAt);
  const balances = pocketBalances(rows);
  const m = monthlySummary(rows);
  const out: Pocket[] = list.map((p) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    targetAmount: p.targetAmount,
    balance: balances.get(p.id) ?? 0,
  }));
  return {
    saldoUtama: saldoUtama(rows),
    incomeMonth: m.income,
    expenseMonth: m.expense,
    savedMonth: m.saved,
    pockets: out,
  };
}

export async function pocketBalance(userId: string, pocketId: string) {
  const rows = await allRows(userId);
  return pocketBalances(rows).get(pocketId) ?? 0;
}

export type PocketResolution =
  | { pocket: typeof pockets.$inferSelect }
  | {
      error: "not_found" | "ambiguous";
      candidates: (typeof pockets.$inferSelect)[];
    };

/** Cocokkan nama kantong dari teks bebas user. */
export async function resolvePocket(
  userId: string,
  q: string
): Promise<PocketResolution> {
  const list = await db
    .select()
    .from(pockets)
    .where(eq(pockets.userId, userId));
  const ql = q.trim().toLowerCase();
  if (ql) {
    const exact = list.filter((p) => p.name.toLowerCase() === ql);
    if (exact.length === 1) return { pocket: exact[0] };
    const partial = list.filter(
      (p) => p.name.toLowerCase().includes(ql) || ql.includes(p.name.toLowerCase())
    );
    if (partial.length === 1) return { pocket: partial[0] };
    if (partial.length > 1) return { error: "ambiguous", candidates: partial };
  }
  return { error: "not_found", candidates: list };
}
