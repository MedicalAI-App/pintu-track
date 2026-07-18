import { eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { householdMembers, households, transactions, user as userTable } from "./db/schema";
import type { FamilySummary } from "./household";
import { monthlySummary, type LedgerRow } from "./ledger";
import type { TransactionType } from "./types";

export type HouseholdInfo = {
  id: string;
  name: string;
  inviteCode: string;
  memberIds: string[];
};

/** Rumah tempat user tergabung (null bila belum). */
export async function getHouseholdOf(userId: string): Promise<HouseholdInfo | null> {
  const [mine] = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1);
  if (!mine) return null;

  const [h] = await db
    .select()
    .from(households)
    .where(eq(households.id, mine.householdId))
    .limit(1);
  if (!h) return null;

  const members = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, h.id));

  return {
    id: h.id,
    name: h.name,
    inviteCode: h.inviteCode,
    memberIds: members.map((m) => m.userId),
  };
}

export type HouseholdView = {
  id: string;
  name: string;
  inviteCode: string;
  members: {
    userId: string;
    name: string;
    expenseMonth: number;
    incomeMonth: number;
    savedMonth: number;
  }[];
  total: FamilySummary["total"];
};

/** Tampilan lengkap rumah + ringkasan bulan berjalan per anggota. */
export async function householdViewFor(userId: string): Promise<HouseholdView | null> {
  const info = await getHouseholdOf(userId);
  if (!info) return null;

  const users = await db
    .select({ id: userTable.id, name: userTable.name })
    .from(userTable)
    .where(inArray(userTable.id, info.memberIds));

  const rows = await db
    .select({
      userId: transactions.userId,
      type: transactions.type,
      amount: transactions.amount,
      date: transactions.date,
    })
    .from(transactions)
    .where(inArray(transactions.userId, info.memberIds));

  const byUser = new Map<string, LedgerRow[]>();
  for (const r of rows) {
    const list = byUser.get(r.userId) ?? [];
    list.push({ type: r.type as TransactionType, amount: r.amount, date: r.date });
    byUser.set(r.userId, list);
  }

  const members = users
    .map((u) => {
      const s = monthlySummary(byUser.get(u.id) ?? []);
      return {
        userId: u.id,
        name: u.name,
        expenseMonth: s.expense,
        incomeMonth: s.income,
        savedMonth: s.saved,
      };
    })
    .sort((a, b) => b.expenseMonth - a.expenseMonth);

  const total = members.reduce(
    (t, m) => ({
      expense: t.expense + m.expenseMonth,
      income: t.income + m.incomeMonth,
      saved: t.saved + m.savedMonth,
    }),
    { expense: 0, income: 0, saved: 0 }
  );

  return {
    id: info.id,
    name: info.name,
    inviteCode: info.inviteCode,
    members,
    total,
  };
}
