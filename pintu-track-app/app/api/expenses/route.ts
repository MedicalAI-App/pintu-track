import { and, desc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses, user as userTable } from "@/lib/db/schema";
import { appendExpenseToSheet } from "@/lib/sheets";
import { totalsFor } from "@/lib/stats";
import { maybeSendBudgetWarning } from "@/lib/telegram";
import { CATEGORIES } from "@/lib/types";

/** GET /api/expenses?months=6 — pengeluaran user sejak N bulan terakhir. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const months = Math.min(
    parseInt(new URL(req.url).searchParams.get("months") ?? "6", 10) || 6,
    24
  );
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1), 1);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.userId, user.id), gte(expenses.date, since)))
    .orderBy(desc(expenses.date));

  return NextResponse.json({ expenses: rows });
}

/** POST /api/expenses — { amount, description, category, date? } */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  const description = String(body?.description ?? "").trim();
  const category = String(body?.category ?? "");

  if (!Number.isInteger(amount) || amount <= 0 || !description) {
    return NextResponse.json(
      { error: "Jumlah dan keterangan tidak valid" },
      { status: 400 }
    );
  }
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "Kategori tidak dikenal" }, { status: 400 });
  }

  const [row] = await db
    .insert(expenses)
    .values({
      userId: user.id,
      amount,
      description,
      category,
      date: body?.date ? new Date(body.date) : new Date(),
    })
    .returning();

  // Sinkronisasi Google Sheet + peringatan anggaran via Telegram —
  // kegagalan keduanya tidak boleh menggagalkan pencatatan.
  await syncAndNotify(user.id, row).catch(() => {});

  return NextResponse.json({ expense: row }, { status: 201 });
}

async function syncAndNotify(
  userId: string,
  row: typeof expenses.$inferSelect
) {
  const [u] = await db
    .select({
      telegramId: userTable.telegramId,
      googleSheetUrl: userTable.googleSheetUrl,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);
  if (!u) return;

  const tasks: Promise<unknown>[] = [appendExpenseToSheet(u.googleSheetUrl, row)];

  if (u.telegramId) {
    tasks.push(
      totalsFor(userId).then(({ totalToday, totalMonth, budget }) => {
        if (!budget) return;
        return maybeSendBudgetWarning({
          chatId: u.telegramId!,
          amount: row.amount,
          totalToday,
          totalMonth,
          dailyLimit: budget.dailyLimit,
          monthlyLimit: budget.monthlyLimit,
        });
      })
    );
  }

  await Promise.allSettled(tasks);
}

/** DELETE /api/expenses — hapus SEMUA pengeluaran user (dipakai "Hapus semua data"). */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  await db.delete(expenses).where(eq(expenses.userId, user.id));
  return NextResponse.json({ ok: true });
}
