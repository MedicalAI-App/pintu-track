import { and, eq, lt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { aiConfigured, aiParseReceipt, aiParseText, type AiParsed } from "@/lib/ai";
import { db } from "@/lib/db";
import {
  aiSuggestions,
  reminders,
  transactions,
  user as userTable,
} from "@/lib/db/schema";
import { formatRupiah } from "@/lib/format";
import { buildFamilyReport } from "@/lib/household";
import { householdViewFor } from "@/lib/household-server";
import {
  parseQuickInput,
  parseReminder,
  parseTransfer,
  type ParsedInput,
  type ParsedTransfer,
} from "@/lib/parse";
import { appendTransactionToSheet } from "@/lib/sheets";
import {
  resolvePocket,
  summaryFor,
  totalsFor,
  visiblePocketBalance,
} from "@/lib/stats";
import {
  answerCallbackQuery,
  editMessageText,
  getTelegramFile,
  maybeSendBudgetWarning,
  sendTelegramMessage,
  sendTelegramMessageWithButtons,
} from "@/lib/telegram";
import { CATEGORY_EMOJI, type Category } from "@/lib/types";

type Owner = { id: string; googleSheetUrl: string | null };

/** Simpan tebakan AI + kirim pesan konfirmasi bertombol. */
async function offerAiSuggestion(
  owner: Owner,
  chatId: number,
  ai: AiParsed,
  prefix: string
) {
  // Bersihkan tebakan kedaluwarsa (>24 jam) milik user
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  await db
    .delete(aiSuggestions)
    .where(
      and(eq(aiSuggestions.userId, owner.id), lt(aiSuggestions.createdAt, dayAgo))
    );

  const [row] = await db
    .insert(aiSuggestions)
    .values({ userId: owner.id, ...ai })
    .returning();

  const emoji =
    ai.type === "income"
      ? "💰"
      : (CATEGORY_EMOJI[ai.category as Category] ?? "📦");
  await sendTelegramMessageWithButtons(
    chatId,
    `${prefix}: ${ai.description} — ${ai.type === "income" ? "+" : ""}${formatRupiah(ai.amount)} (${emoji} ${ai.category})?`,
    [
      { text: "✅ Catat", callbackData: `aiok:${row.id}` },
      { text: "❌ Batal", callbackData: `aino:${row.id}` },
    ]
  );
}

/** Tombol konfirmasi tebakan AI → catat atau batalkan. */
async function handleAiCallback(cb: {
  id: string;
  data?: string;
  message?: { chat?: { id?: number }; message_id?: number };
}) {
  const data = cb.data ?? "";
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;
  const suggestionId = data.slice(5);
  if (!chatId) {
    await answerCallbackQuery(cb.id);
    return;
  }

  const [row] = await db
    .select({
      id: aiSuggestions.id,
      type: aiSuggestions.type,
      amount: aiSuggestions.amount,
      description: aiSuggestions.description,
      category: aiSuggestions.category,
      userId: aiSuggestions.userId,
      telegramId: userTable.telegramId,
      googleSheetUrl: userTable.googleSheetUrl,
    })
    .from(aiSuggestions)
    .innerJoin(userTable, eq(userTable.id, aiSuggestions.userId))
    .where(eq(aiSuggestions.id, suggestionId))
    .limit(1);

  if (!row || row.telegramId !== String(chatId)) {
    await answerCallbackQuery(cb.id, "Kedaluwarsa — kirim ulang pesannya ya.");
    return;
  }

  await db.delete(aiSuggestions).where(eq(aiSuggestions.id, row.id));

  if (data.startsWith("aino:")) {
    await answerCallbackQuery(cb.id, "Dibatalkan.");
    if (messageId) {
      await editMessageText(chatId, messageId, "❌ Dibatalkan — tidak dicatat.");
    }
    return;
  }

  const [trx] = await db
    .insert(transactions)
    .values({
      userId: row.userId,
      type: row.type as "expense" | "income",
      amount: row.amount,
      description: row.description,
      category: row.category,
    })
    .returning();
  await appendTransactionToSheet(row.googleSheetUrl, trx).catch(() => {});

  await answerCallbackQuery(cb.id, "Tercatat!");
  const { totalToday, totalMonth, budget, saldo } = await totalsFor(row.userId);
  if (messageId) {
    const emoji =
      row.type === "income"
        ? "💰"
        : (CATEGORY_EMOJI[row.category as Category] ?? "📦");
    await editMessageText(
      chatId,
      messageId,
      `✅ Tercatat: ${row.type === "income" ? "+" : ""}${formatRupiah(row.amount)} — ${row.description} (${emoji} ${row.category}).\n${
        row.type === "income"
          ? `Saldo Utama: ${formatRupiah(saldo)}`
          : `Total hari ini: ${formatRupiah(totalToday)}`
      }`
    );
  }
  if (row.type === "expense" && budget) {
    await maybeSendBudgetWarning({
      chatId: String(chatId),
      amount: row.amount,
      totalToday,
      totalMonth,
      dailyLimit: budget.dailyLimit,
      monthlyLimit: budget.monthlyLimit,
    }).catch(() => {});
  }
}

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

function pocketLine(p: {
  emoji: string;
  name: string;
  balance: number;
  targetAmount: number | null;
  shared?: boolean;
}) {
  const progress = p.targetAmount
    ? ` / ${formatRupiah(p.targetAmount)} (${Math.round((p.balance / p.targetAmount) * 100)}%)`
    : "";
  const badge = p.shared ? " 👨‍👩‍👧" : "";
  return `${p.emoji} ${p.name}${badge}: ${formatRupiah(p.balance)}${progress}`;
}

/** Transfer antar kantong via chat: "transfer 50rb dari liburan ke darurat". */
async function handleTransfer(
  owner: Owner,
  chatId: number,
  t: ParsedTransfer
) {
  const fromRes = await resolvePocket(owner.id, t.fromQuery);
  const toRes = await resolvePocket(owner.id, t.toQuery);
  if ("error" in fromRes || "error" in toRes) {
    const list = ("error" in fromRes ? fromRes : (toRes as { candidates: { emoji: string; name: string }[] })).candidates;
    await sendTelegramMessage(
      chatId,
      `Kantongnya belum ketemu. Kantong yang ada:\n${list.map((p) => `${p.emoji} ${p.name}`).join("\n") || "(belum ada)"}`
    );
    return;
  }
  const from = fromRes.pocket;
  const to = toRes.pocket;
  if (from.id === to.id) {
    await sendTelegramMessage(chatId, "Kantong asal dan tujuan sama 😅");
    return;
  }
  const balance = (await visiblePocketBalance(owner.id, from.id)) ?? 0;
  if (t.amount > balance) {
    await sendTelegramMessage(
      chatId,
      `⚠️ Isi ${from.emoji} ${from.name} hanya ${formatRupiah(balance)} — tidak bisa transfer ${formatRupiah(t.amount)}.`
    );
    return;
  }

  const description = `Transfer: ${from.name} → ${to.name}`;
  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      userId: owner.id,
      type: "saving_withdrawal",
      amount: t.amount,
      description,
      category: "Tabungan",
      pocketId: from.id,
    });
    await tx.insert(transactions).values({
      userId: owner.id,
      type: "saving_deposit",
      amount: t.amount,
      description,
      category: "Tabungan",
      pocketId: to.id,
    });
  });

  const summary = await summaryFor(owner.id);
  const fromNow = summary.pockets.find((p) => p.id === from.id);
  const toNow = summary.pockets.find((p) => p.id === to.id);
  const lines = [`↔️ ${description}: ${formatRupiah(t.amount)}`];
  if (fromNow) lines.push(pocketLine(fromNow));
  if (toNow) lines.push(pocketLine(toNow));
  await sendTelegramMessage(chatId, lines.join("\n"));
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
    const balance = (await visiblePocketBalance(owner.id, pocket.id)) ?? 0;
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
  const icon =
    parsed.type === "saving_deposit"
      ? "🔵 Ditabung ke"
      : parsed.type === "saving_topup"
        ? "💵 Top-up ke"
        : "🟠 Diambil dari";
  const lines = [
    `${icon} ${pocket.emoji} ${pocket.name}: ${formatRupiah(parsed.amount!)}.`,
  ];
  if (updated) lines.push(pocketLine(updated));
  // Top-up dari luar tidak mengubah Saldo Utama — tetap ditampilkan sebagai info
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

  // ── Tombol inline (callback_query): pay:/aiok:/aino: ─────────
  const cb = update?.callback_query;
  if (cb) {
    const data: string = cb.data ?? "";
    if (data.startsWith("pay:")) await handlePayCallback(cb).catch(() => {});
    else if (data.startsWith("aiok:") || data.startsWith("aino:"))
      await handleAiCallback(cb).catch(() => {});
    else await answerCallbackQuery(cb.id).catch(() => {});
    return NextResponse.json({ ok: true });
  }

  const message = update?.message;
  const chatId: number | undefined = message?.chat?.id;
  const text: string = (message?.text ?? "").trim();
  const photos: { file_id: string }[] | undefined = message?.photo;

  // Selalu balas 200 agar Telegram tidak mengulang kiriman
  if (!chatId || (!text && !photos?.length)) {
    return NextResponse.json({ ok: true });
  }

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

  // ── Foto struk → Gemini vision → konfirmasi ──────────────────
  if (photos?.length) {
    if (!aiConfigured()) {
      await sendTelegramMessage(
        chatId,
        "Fitur baca struk belum aktif di server. Catat manual dulu ya, mis. “belanja indomaret 54rb”."
      );
      return NextResponse.json({ ok: true });
    }
    const file = await getTelegramFile(photos[photos.length - 1].file_id);
    const parsed = file
      ? await aiParseReceipt(file.base64, file.mimeType)
      : null;
    if (!parsed) {
      await sendTelegramMessage(
        chatId,
        "Struknya belum terbaca 😅 Coba foto ulang yang lebih jelas (total harus terlihat), atau catat manual."
      );
      return NextResponse.json({ ok: true });
    }
    await offerAiSuggestion(owner, chatId, parsed, "🧾 Dari struk");
    return NextResponse.json({ ok: true });
  }

  // ── Perintah: ringkasan keluarga ─────────────────────────────
  if (/^keluarga$/i.test(text)) {
    const view = await householdViewFor(owner.id);
    await sendTelegramMessage(
      chatId,
      view
        ? buildFamilyReport(view.name, {
            perMember: view.members.map((m) => ({
              name: m.name,
              expense: m.expenseMonth,
              income: m.incomeMonth,
              saved: m.savedMonth,
            })),
            total: view.total,
          })
        : "Kamu belum tergabung di rumah mana pun. Buat atau gabung rumah lewat halaman Profil di aplikasi web."
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

  // ── Transfer antar kantong: "transfer 50rb dari X ke Y" ──────
  const transfer = parseTransfer(text);
  if (transfer) {
    await handleTransfer(owner, chatId, transfer);
    return NextResponse.json({ ok: true });
  }

  // ── Transaksi dari teks bebas ─────────────────────────────────
  const parsed = parseQuickInput(text);
  if (!parsed.amount) {
    // Regex gagal → coba AI (bila dikonfigurasi), dengan konfirmasi
    if (aiConfigured()) {
      const ai = await aiParseText(text);
      if (ai) {
        await offerAiSuggestion(owner, chatId, ai, "🤖 Maksudmu");
        return NextResponse.json({ ok: true });
      }
    }
    await sendTelegramMessage(
      chatId,
      "Aku belum menangkap nominalnya. Contoh:\n“Makan siang 30rb”, “gajian 5jt”, “nabung 100rb liburan”."
    );
    return NextResponse.json({ ok: true });
  }

  if (parsed.type === "income") await handleIncome(owner, chatId, parsed);
  else if (
    parsed.type === "saving_deposit" ||
    parsed.type === "saving_withdrawal" ||
    parsed.type === "saving_topup"
  )
    await handleSaving(owner, chatId, parsed);
  else await handleExpense(owner, chatId, parsed);

  return NextResponse.json({ ok: true });
}
