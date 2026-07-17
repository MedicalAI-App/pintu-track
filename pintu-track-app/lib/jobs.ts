import { and, eq, gte, isNotNull, lt } from "drizzle-orm";
import { lastWeekRangeUtc, reminderMatchesToday } from "./cron";
import { db } from "./db";
import { budgets, reminders, transactions, user as userTable } from "./db/schema";
import { formatRupiah } from "./format";
import { buildWeeklyReport } from "./report";
import { totalsFor } from "./stats";
import {
  sendTelegramMessage,
  sendTelegramMessageWithButton,
} from "./telegram";

/** Kirim laporan mingguan ke semua user ber-Telegram. Return: jumlah terkirim. */
export async function runWeeklyReports(now = new Date()): Promise<number> {
  const range = lastWeekRangeUtc(now);
  const users = await db
    .select({ id: userTable.id, name: userTable.name, telegramId: userTable.telegramId })
    .from(userTable)
    .where(isNotNull(userTable.telegramId));

  let sent = 0;
  for (const u of users) {
    const rows = await db
      .select({
        type: transactions.type,
        amount: transactions.amount,
        category: transactions.category,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, u.id),
          gte(transactions.date, range.start),
          lt(transactions.date, range.end)
        )
      );

    const totalExpense = rows
      .filter((r) => r.type === "expense")
      .reduce((s, r) => s + r.amount, 0);
    const income = rows
      .filter((r) => r.type === "income")
      .reduce((s, r) => s + r.amount, 0);
    const saved = rows.reduce(
      (s, r) =>
        s +
        (r.type === "saving_deposit" ? r.amount : 0) -
        (r.type === "saving_withdrawal" ? r.amount : 0),
      0
    );

    // Tanpa aktivitas minggu lalu → jangan spam
    if (totalExpense === 0 && income === 0 && saved === 0) continue;

    const byCat = new Map<string, number>();
    for (const r of rows) {
      if (r.type !== "expense") continue;
      byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.amount);
    }
    const topCategories = [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, total]) => ({ category, total }));

    const { totalMonth, saldo } = await totalsFor(u.id);
    const [budget] = await db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, u.id))
      .limit(1);

    await sendTelegramMessage(
      u.telegramId!,
      buildWeeklyReport({
        name: u.name,
        rangeLabel: range.label,
        totalExpense,
        topCategories,
        income,
        saved,
        saldo,
        budget: budget?.monthlyLimit
          ? { monthlyLimit: budget.monthlyLimit, spentMonth: totalMonth }
          : null,
      })
    );
    sent++;
  }
  return sent;
}

/** Kirim pengingat tagihan yang jatuh tempo hari ini (WIB). Return: jumlah terkirim. */
export async function runDailyReminders(now = new Date()): Promise<number> {
  const rows = await db
    .select({
      id: reminders.id,
      description: reminders.description,
      amount: reminders.amount,
      dayOfMonth: reminders.dayOfMonth,
      telegramId: userTable.telegramId,
    })
    .from(reminders)
    .innerJoin(userTable, eq(userTable.id, reminders.userId))
    .where(and(eq(reminders.active, true), isNotNull(userTable.telegramId)));

  let sent = 0;
  for (const r of rows) {
    if (!reminderMatchesToday(r.dayOfMonth, now)) continue;
    await sendTelegramMessageWithButton(
      r.telegramId!,
      `⏰ Hari ini jadwal bayar: ${r.description} — ${formatRupiah(r.amount)}.`,
      { text: "✅ Bayar & catat", callbackData: `pay:${r.id}` }
    );
    sent++;
  }
  return sent;
}
