import { and, desc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions, user as userTable } from "@/lib/db/schema";
import { appendTransactionToSheet } from "@/lib/sheets";
import { resolvePocket, totalsFor, visiblePocketBalance } from "@/lib/stats";
import { maybeSendBudgetWarning } from "@/lib/telegram";
import {
  CATEGORIES,
  INCOME_CATEGORIES,
  TRANSACTION_TYPES,
  type TransactionType,
} from "@/lib/types";

/** GET /api/transactions?months=6 — semua transaksi user sejak N bulan terakhir. */
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
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), gte(transactions.date, since)))
    .orderBy(desc(transactions.date));

  return NextResponse.json({ transactions: rows });
}

/**
 * POST /api/transactions
 * body: { type, amount, description, category?, pocketId?, pocketQuery?, date? }
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const type = (body?.type ?? "expense") as TransactionType;
  const amount = Number(body?.amount);
  const description = String(body?.description ?? "").trim();
  let category = String(body?.category ?? "");

  if (!TRANSACTION_TYPES.includes(type)) {
    return NextResponse.json({ error: "Tipe tidak dikenal" }, { status: 400 });
  }
  if (!Number.isInteger(amount) || amount <= 0 || !description) {
    return NextResponse.json(
      { error: "Jumlah dan keterangan tidak valid" },
      { status: 400 }
    );
  }

  let pocketId: string | null = null;

  if (type === "expense") {
    if (!(CATEGORIES as readonly string[]).includes(category) && category !== "Penyesuaian") {
      return NextResponse.json({ error: "Kategori tidak dikenal" }, { status: 400 });
    }
  } else if (type === "income") {
    if (!(INCOME_CATEGORIES as readonly string[]).includes(category)) {
      category = "Lainnya";
    }
  } else {
    // saving_deposit / saving_withdrawal / saving_topup
    category = "Tabungan";
    if (body?.pocketId) {
      pocketId = String(body.pocketId);
    } else {
      const res = await resolvePocket(user.id, String(body?.pocketQuery ?? ""));
      if ("error" in res) {
        const candidates = res.candidates.map((p) => ({
          id: p.id,
          name: p.name,
          emoji: p.emoji,
        }));
        return NextResponse.json(
          {
            error:
              res.error === "ambiguous"
                ? "Nama kantong ambigu"
                : "Kantong tidak ditemukan",
            pockets: candidates,
          },
          { status: res.error === "ambiguous" ? 409 : 404 }
        );
      }
      pocketId = res.pocket.id;
    }
    // Otorisasi + saldo shared-aware dalam satu panggilan
    const balance = await visiblePocketBalance(user.id, pocketId);
    if (balance === null) {
      return NextResponse.json({ error: "Kantong tidak ditemukan" }, { status: 404 });
    }
    if (type === "saving_withdrawal" && amount > balance) {
      return NextResponse.json(
        { error: `Isi kantong hanya Rp ${balance.toLocaleString("id-ID")}` },
        { status: 400 }
      );
    }
  }

  const [row] = await db
    .insert(transactions)
    .values({
      userId: user.id,
      type,
      amount,
      description,
      category,
      pocketId,
      date: body?.date ? new Date(body.date) : new Date(),
    })
    .returning();

  // Sinkronisasi Sheets (semua tipe) + peringatan anggaran (khusus expense)
  await syncAndNotify(user.id, row).catch(() => {});

  return NextResponse.json({ transaction: row }, { status: 201 });
}

/** DELETE /api/transactions — hapus SEMUA transaksi user ("Hapus semua data"). */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  await db.delete(transactions).where(eq(transactions.userId, user.id));
  return NextResponse.json({ ok: true });
}

async function syncAndNotify(
  userId: string,
  row: typeof transactions.$inferSelect
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

  const tasks: Promise<unknown>[] = [
    appendTransactionToSheet(u.googleSheetUrl, row),
  ];

  if (u.telegramId && row.type === "expense") {
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
