import { and, eq, gte } from "drizzle-orm";
import { db } from "./db";
import { budgets, expenses } from "./db/schema";

export function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Total pengeluaran hari ini & bulan ini plus anggaran user (satu round-trip ringan). */
export async function totalsFor(userId: string) {
  const rows = await db
    .select({ amount: expenses.amount, date: expenses.date })
    .from(expenses)
    .where(and(eq(expenses.userId, userId), gte(expenses.date, startOfMonth())));

  const today = startOfDay();
  const totalMonth = rows.reduce((s, r) => s + r.amount, 0);
  const totalToday = rows
    .filter((r) => r.date >= today)
    .reduce((s, r) => s + r.amount, 0);

  const [budget] = await db
    .select()
    .from(budgets)
    .where(eq(budgets.userId, userId))
    .limit(1);

  return { totalToday, totalMonth, budget: budget ?? null };
}
