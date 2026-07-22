import { eq, getTableColumns, inArray, or } from "drizzle-orm";
import { db } from "./db";
import {
  budgets,
  householdMembers,
  pockets,
  transactions,
  user as userTable,
} from "./db/schema";
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

async function myHouseholdId(userId: string): Promise<string | null> {
  const [m] = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1);
  return m?.householdId ?? null;
}

export type VisiblePocket = typeof pockets.$inferSelect & { ownerName: string };

/** Kantong yang terlihat user: milik sendiri ∪ kantong bersama rumahnya. */
export async function visiblePockets(userId: string): Promise<VisiblePocket[]> {
  const hid = await myHouseholdId(userId);
  return db
    .select({ ...getTableColumns(pockets), ownerName: userTable.name })
    .from(pockets)
    .innerJoin(userTable, eq(userTable.id, pockets.userId))
    .where(
      hid
        ? or(eq(pockets.userId, userId), eq(pockets.householdId, hid))
        : eq(pockets.userId, userId)
    )
    .orderBy(pockets.createdAt);
}

/** Saldo kantong dihitung dari SEMUA kontributor (shared-aware) untuk pocketIds terpilih. */
async function balancesForPockets(pocketIds: string[]): Promise<Map<string, number>> {
  if (!pocketIds.length) return new Map();
  const rows = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
      pocketId: transactions.pocketId,
      date: transactions.date,
    })
    .from(transactions)
    .where(inArray(transactions.pocketId, pocketIds));
  return pocketBalances(
    rows.map((r) => ({ ...r, type: r.type as TransactionType }))
  );
}

/** Ringkasan lengkap untuk /api/summary & halaman kantong. */
export async function summaryFor(userId: string) {
  const rows = await allRows(userId);
  const list = await visiblePockets(userId);
  const balances = await balancesForPockets(list.map((p) => p.id));
  const m = monthlySummary(rows);
  const out: Pocket[] = list.map((p) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    targetAmount: p.targetAmount,
    balance: balances.get(p.id) ?? 0,
    shared: Boolean(p.householdId),
    ownerName: p.ownerName,
  }));
  return {
    saldoUtama: saldoUtama(rows),
    incomeMonth: m.income,
    expenseMonth: m.expense,
    savedMonth: m.saved,
    pockets: out,
  };
}

/**
 * Saldo satu kantong (shared-aware) — null bila kantong tidak terlihat user
 * (sekaligus berfungsi sebagai pemeriksaan otorisasi).
 */
export async function visiblePocketBalance(
  userId: string,
  pocketId: string
): Promise<number | null> {
  const list = await visiblePockets(userId);
  if (!list.some((p) => p.id === pocketId)) return null;
  const balances = await balancesForPockets([pocketId]);
  return balances.get(pocketId) ?? 0;
}

export type PocketResolution =
  | { pocket: VisiblePocket }
  | { error: "not_found" | "ambiguous"; candidates: VisiblePocket[] };

/** Cocokkan nama kantong dari teks bebas user (termasuk kantong bersama). */
export async function resolvePocket(
  userId: string,
  q: string
): Promise<PocketResolution> {
  const list = await visiblePockets(userId);
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
