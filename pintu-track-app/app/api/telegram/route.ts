import { and, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgets, expenses, user as userTable } from "@/lib/db/schema";
import { formatRupiah } from "@/lib/format";
import { parseQuickInput } from "@/lib/parse";
import { CATEGORY_EMOJI } from "@/lib/types";

async function reply(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {});
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function totals(userId: string) {
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

  return { totalToday, totalMonth, budget };
}

/** Webhook Telegram — daftarkan via setWebhook dengan secret_token yang sama. */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const message = update?.message;
  const chatId: number | undefined = message?.chat?.id;
  const text: string = (message?.text ?? "").trim();

  // Selalu balas 200 agar Telegram tidak mengulang kiriman
  if (!chatId || !text) return NextResponse.json({ ok: true });

  // ── /start <kode> : tautkan akun ──────────────────────────────
  if (text.startsWith("/start")) {
    const code = text.split(/\s+/)[1];
    if (!code) {
      await reply(
        chatId,
        "Halo! 👋 Untuk menautkan akun, buka halaman Profil di aplikasi PintuTrack lalu klik “Hubungkan Telegram”."
      );
      return NextResponse.json({ ok: true });
    }
    const [linked] = await db
      .update(userTable)
      .set({
        telegramId: String(chatId),
        telegramLinkCode: null,
        updatedAt: new Date(),
      })
      .where(eq(userTable.telegramLinkCode, code))
      .returning({ name: userTable.name });

    await reply(
      chatId,
      linked
        ? `Berhasil terhubung, ${linked.name}! 🎉\nKirim pesan seperti “Makan siang 30rb” untuk mencatat, atau “sisa budget” untuk cek anggaran.`
        : "Kode tidak valid atau sudah dipakai. Buat kode baru dari halaman Profil aplikasi."
    );
    return NextResponse.json({ ok: true });
  }

  // ── Identifikasi user dari chat id ────────────────────────────
  const [owner] = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.telegramId, String(chatId)))
    .limit(1);

  if (!owner) {
    await reply(
      chatId,
      "Akunmu belum tertaut. Buka halaman Profil di aplikasi PintuTrack lalu klik “Hubungkan Telegram”."
    );
    return NextResponse.json({ ok: true });
  }

  // ── Cek saldo / anggaran ──────────────────────────────────────
  if (/^(sisa|saldo|budget|anggaran|total|cek)\b/i.test(text)) {
    const { totalToday, totalMonth, budget } = await totals(owner.id);
    const lines = [
      `📊 Hari ini: ${formatRupiah(totalToday)}`,
      `🗓️ Bulan ini: ${formatRupiah(totalMonth)}`,
    ];
    if (budget?.dailyLimit) {
      lines.push(`Sisa anggaran harian: ${formatRupiah(Math.max(budget.dailyLimit - totalToday, 0))}`);
    }
    if (budget?.monthlyLimit) {
      lines.push(`Sisa anggaran bulanan: ${formatRupiah(Math.max(budget.monthlyLimit - totalMonth, 0))}`);
    }
    await reply(chatId, lines.join("\n"));
    return NextResponse.json({ ok: true });
  }

  // ── Catat pengeluaran dari teks bebas ─────────────────────────
  const parsed = parseQuickInput(text);
  if (!parsed.amount) {
    await reply(
      chatId,
      "Aku belum menangkap nominalnya. Coba format seperti:\n“Makan siang 30rb” atau “Beli kopi 25000”."
    );
    return NextResponse.json({ ok: true });
  }

  await db.insert(expenses).values({
    userId: owner.id,
    amount: parsed.amount,
    description: parsed.description,
    category: parsed.category,
  });

  const { totalToday, budget } = await totals(owner.id);
  const lines = [
    `✅ Tercatat: ${formatRupiah(parsed.amount)} — ${parsed.description}`,
    `Kategori: ${CATEGORY_EMOJI[parsed.category]} ${parsed.category}`,
    `Total hari ini: ${formatRupiah(totalToday)}`,
  ];
  if (budget?.dailyLimit) {
    const sisa = budget.dailyLimit - totalToday;
    lines.push(
      sisa >= 0
        ? `Anggaran harian tersisa: ${formatRupiah(sisa)}`
        : `⚠️ Anggaran harian terlewati ${formatRupiah(-sisa)}!`
    );
  }
  await reply(chatId, lines.join("\n"));
  return NextResponse.json({ ok: true });
}
