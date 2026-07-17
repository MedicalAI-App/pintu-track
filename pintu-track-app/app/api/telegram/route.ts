import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reminders, transactions, user as userTable } from "@/lib/db/schema";
import { formatRupiah } from "@/lib/format";
import { parseQuickInput, parseReminder, type ParsedInput } from "@/lib/parse";
import { appendTransactionToSheet } from "@/lib/sheets";
import { pocketBalance, resolvePocket, summaryFor, totalsFor } from "@/lib/stats";
import {
  answerCallbackQuery,
  editMessageText,
  sendTelegramMessage,
} from "@/lib/telegram";
import { CATEGORY_EMOJI, type Category } from "@/lib/types";

type Owner = { id: string; googleSheetUrl: string | null };

/** Tombol "✅ Bayar & catat" pada pengingat → catat expense Tagihan. */
async function handlePayCallback(cb: {
  id: string;
  data?: string;
  message?: { chat?: { id?: number }; message_id?: number };
}) {
  const data = cb.data ?? "";
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  if (!data.startsWith("pay:") || !chatId) {
    await answerCallbackQuery(cb.id);
    return;
  }

  const reminderId = data.slice(4);
  const [row] = await db
    .select({
      id: reminders.id,
      description: reminders.description,
      amount: reminders.amount,
      userId: reminders.userId,
      googleSheetUrl: userTable.googleSheetUrl,
      telegramId: userTable.telegramId,
    })
    .from(reminders)
    .innerJoin(userTable, eq(userTable.id, reminders.userId))
    .where(eq(reminders.id, reminderId))
    .limit(1);

  if (!row || row.telegramId !== String(chatId)) {
    await answerCallbackQuery(cb.id, "Pengingat tidak ditemukan.");
    return;
  }

  const [trx] = await db
    .insert(transactions)
    .values({
      userId: row.userId,
      type: "expense",
      amount: row.amount,
      description: row.description,
      category: "Tagihan",
    })
    .returning();
  await appendTransactionToSheet(row.googleSheetUrl, trx).catch(() => {});

  await answerCallbackQuery(cb.id, "Tercatat!");
  if (messageId) {
    await editMessageText(
      chatId,
      messageId,
      `✅ ${row.description} ${formatRupiah(row.amount)} sudah dibayar & tercatat (🧾 Tagihan).`
    );
  }
}

function pocketLine(p: { emoji: string; name: string; balance: number; targetAmount: number | null }) {
  const progress = p.targetAmount
    ? ` / ${formatRupiah(p.targetAmount)} (${Math.round((p.balance / p.targetAmount) * 100)}%)`
    : "";
  return `${p.emoji} ${p.name}: ${formatRupiah(p.balance)}${progress}`;
}

async function insertAndSync(owner: Owner, values: typeof transactions.$inferInsert) {
  const [row] = await db.insert(transactions).values(values).returning();
  await appendTransactionToSheet(owner.googleSheetUrl, row).catch(() => {});
  return row;
}

async function handleIncome(owner: Owner, chatId: number, parsed: ParsedInput) {
  await insertAndSync(owner, {
    userId: owner.id,
    type: "income",
    amount: parsed.amount!,
    description: parsed.description,
    category: parsed.category,
  });
  const { saldo } = await totalsFor(owner.id);
  await sendTelegramMessage(
    chatId,
    `💰 Tercatat: +${formatRupiah(parsed.amount!)} (${parsed.category}).\nSaldo Utama: ${formatRupiah(saldo)}`
  );
}

async function handleSaving(owner: Owner, chatId: number, parsed: ParsedInput) {
  const res = await resolvePocket(owner.id, parsed.pocketQuery ?? "");

  if ("error" in res) {
    // Fallback anti-salah-tangkap: "ambil paket 10rb" adalah pengeluaran biasa
    if (parsed.type === "saving_withdrawal" && res.error === "not_found") {
      return handleExpense(owner, chatId, {
        ...parsed,
        type: "expense",
        category: "Lainnya",
      });
    }
    if (res.error === "ambiguous") {
      await sendTelegramMessage(
        chatId,
        `Kantong mana yang kamu maksud?\n${res.candidates.map((p) => `${p.emoji} ${p.name}`).join("\n")}`
      );
    } else {
      const list = res.candidates.length
        ? `Kantong yang ada:\n${res.candidates.map((p) => `${p.emoji} ${p.name}`).join("\n")}`
        : "Kamu belum punya kantong.";
      await sendTelegramMessage(
        chatId,
        `${list}\nBuat kantong baru lewat aplikasi web ya.`
      );
    }
    return;
  }

  const pocket = res.pocket;

  if (parsed.type === "saving_withdrawal") {
    const balance = await pocketBalance(owner.id, pocket.id);
    if (parsed.amount! > balance) {
      await sendTelegramMessage(
        chatId,
        `⚠️ Isi ${pocket.emoji} ${pocket.name} hanya ${formatRupiah(balance)} — tidak bisa menarik ${formatRupiah(parsed.amount!)}.`
      );
      return;
    }
  }

  await insertAndSync(owner, {
    userId: owner.id,
    type: parsed.type,
    amount: parsed.amount!,
    description: parsed.description,
    category: "Tabungan",
    pocketId: pocket.id,
  });

  const summary = await summaryFor(owner.id);
  const updated = summary.pockets.find((p) => p.id === pocket.id);
  const icon = parsed.type === "saving_deposit" ? "🔵 Ditabung ke" : "🟠 Diambil dari";
  const lines = [
    `${icon} ${pocket.emoji} ${pocket.name}: ${formatRupiah(parsed.amount!)}.`,
  ];
  if (updated) lines.push(pocketLine(updated));
  lines.push(`Saldo Utama: ${formatRupiah(summary.saldoUtama)}`);
  await sendTelegramMessage(chatId, lines.join("\n"));
}

async function handleExpense(owner: Owner, chatId: number, parsed: ParsedInput) {
  await insertAndSync(owner, {
    userId: owner.id,
    type: "expense",
    amount: parsed.amount!,
    description: parsed.description,
    category: parsed.category,
  });

  const { totalToday, budget } = await totalsFor(owner.id);
  const emoji = CATEGORY_EMOJI[parsed.category as Category] ?? "📦";
  const lines = [
    `✅ Tercatat: ${formatRupiah(parsed.amount!)} — ${parsed.description}`,
    `Kategori: ${emoji} ${parsed.category}`,
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
  await sendTelegramMessage(chatId, lines.join("\n"));
}

/** Webhook Telegram — daftarkan via setWebhook dengan secret_token yang sama. */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await req.json().catch(() => null);

  // ── Tombol inline "Bayar & catat" (callback_query) ────────────
  const cb = update?.callback_query;
  if (cb) {
    await handlePayCallback(cb).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  const message = update?.message;
  const chatId: number | undefined = message?.chat?.id;
  const text: string = (message?.text ?? "").trim();

  // Selalu balas 200 agar Telegram tidak mengulang kiriman
  if (!chatId || !text) return NextResponse.json({ ok: true });

  // ── /start <kode> : tautkan akun ──────────────────────────────
  if (text.startsWith("/start")) {
    const code = text.split(/\s+/)[1];
    if (!code) {
      await sendTelegramMessage(
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

    await sendTelegramMessage(
      chatId,
      linked
        ? `Berhasil terhubung, ${linked.name}! 🎉\nContoh: “Makan siang 30rb”, “gajian 5jt”, “nabung 100rb liburan”, atau “saldo”.`
        : "Kode tidak valid atau sudah dipakai. Buat kode baru dari halaman Profil aplikasi."
    );
    return NextResponse.json({ ok: true });
  }

  // ── Identifikasi user dari chat id ────────────────────────────
  const [owner] = await db
    .select({ id: userTable.id, googleSheetUrl: userTable.googleSheetUrl })
    .from(userTable)
    .where(eq(userTable.telegramId, String(chatId)))
    .limit(1);

  if (!owner) {
    await sendTelegramMessage(
      chatId,
      "Akunmu belum tertaut. Buka halaman Profil di aplikasi PintuTrack lalu klik “Hubungkan Telegram”."
    );
    return NextResponse.json({ ok: true });
  }

  // ── Perintah: daftar pengingat ────────────────────────────────
  if (/^pengingat$/i.test(text)) {
    const rows = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.userId, owner.id), eq(reminders.active, true)));
    await sendTelegramMessage(
      chatId,
      rows.length
        ? `Pengingat aktifmu:\n${rows
            .map((r) => `⏰ ${r.description} — ${formatRupiah(r.amount)} (tiap tanggal ${r.dayOfMonth})`)
            .join("\n")}`
        : "Belum ada pengingat. Buat dengan:\n“ingatkan kos 1,5jt tiap tanggal 1”"
    );
    return NextResponse.json({ ok: true });
  }

  // ── Buat pengingat: "ingatkan kos 1,5jt tiap tanggal 1" ──────
  if (/^ingatkan\b/i.test(text)) {
    const parsed = parseReminder(text);
    if (!parsed) {
      await sendTelegramMessage(
        chatId,
        "Formatnya: “ingatkan <nama> <nominal> tiap tanggal <1-31>”.\nContoh: ingatkan kos 1,5jt tiap tanggal 1"
      );
      return NextResponse.json({ ok: true });
    }
    await db.insert(reminders).values({ userId: owner.id, ...parsed });
    await sendTelegramMessage(
      chatId,
      `⏰ Pengingat dibuat: ${parsed.description} — ${formatRupiah(parsed.amount)} tiap tanggal ${parsed.dayOfMonth}.\nAku akan mengingatkanmu jam 07:00 WIB dengan tombol catat sekali tap. Ketik “pengingat” untuk melihat semua.`
    );
    return NextResponse.json({ ok: true });
  }

  // ── Perintah: daftar kantong ──────────────────────────────────
  if (/^kantong$/i.test(text)) {
    const { pockets } = await summaryFor(owner.id);
    await sendTelegramMessage(
      chatId,
      pockets.length
        ? `Kantongmu:\n${pockets.map(pocketLine).join("\n")}`
        : "Kamu belum punya kantong. Buat lewat aplikasi web ya."
    );
    return NextResponse.json({ ok: true });
  }

  // ── Perintah: cek saldo / anggaran ────────────────────────────
  if (/^(sisa|saldo|budget|anggaran|total|cek)\b/i.test(text)) {
    const { totalToday, totalMonth, budget, saldo } = await totalsFor(owner.id);
    const lines = [
      `💼 Saldo Utama: ${formatRupiah(saldo)}`,
      `📊 Hari ini: ${formatRupiah(totalToday)}`,
      `🗓️ Bulan ini: ${formatRupiah(totalMonth)}`,
    ];
    if (budget?.dailyLimit) {
      lines.push(`Sisa anggaran harian: ${formatRupiah(Math.max(budget.dailyLimit - totalToday, 0))}`);
    }
    if (budget?.monthlyLimit) {
      lines.push(`Sisa anggaran bulanan: ${formatRupiah(Math.max(budget.monthlyLimit - totalMonth, 0))}`);
    }
    await sendTelegramMessage(chatId, lines.join("\n"));
    return NextResponse.json({ ok: true });
  }

  // ── Transaksi dari teks bebas ─────────────────────────────────
  const parsed = parseQuickInput(text);
  if (!parsed.amount) {
    await sendTelegramMessage(
      chatId,
      "Aku belum menangkap nominalnya. Contoh:\n“Makan siang 30rb”, “gajian 5jt”, “nabung 100rb liburan”."
    );
    return NextResponse.json({ ok: true });
  }

  if (parsed.type === "income") await handleIncome(owner, chatId, parsed);
  else if (parsed.type === "saving_deposit" || parsed.type === "saving_withdrawal")
    await handleSaving(owner, chatId, parsed);
  else await handleExpense(owner, chatId, parsed);

  return NextResponse.json({ ok: true });
}
