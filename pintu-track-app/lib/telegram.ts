import { formatRupiah } from "./format";

/** Kirim pesan ke chat Telegram; senyap bila token belum dikonfigurasi. */
export async function sendTelegramMessage(chatId: number | string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {});
}

type WarningInput = {
  chatId: string;
  amount: number; // nominal yang baru dicatat
  totalToday: number; // total SETELAH pencatatan
  totalMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
};

/**
 * Kirim peringatan Telegram saat pencatatan baru membuat pengeluaran
 * MELINTASI ambang 80% atau 100% anggaran (tidak berulang untuk setiap catatan).
 */
export async function maybeSendBudgetWarning(w: WarningInput) {
  const lines: string[] = [];

  const crossed = (limit: number, after: number) => {
    if (limit <= 0) return null;
    const before = after - w.amount;
    if (before < limit && after >= limit) return "over" as const;
    if (before < limit * 0.8 && after >= limit * 0.8) return "near" as const;
    return null;
  };

  const daily = crossed(w.dailyLimit, w.totalToday);
  if (daily === "over") {
    lines.push(
      `🚨 Anggaran harian terlampaui! Hari ini ${formatRupiah(w.totalToday)} dari batas ${formatRupiah(w.dailyLimit)}.`
    );
  } else if (daily === "near") {
    lines.push(
      `⚠️ Hati-hati, pengeluaran hari ini sudah ${formatRupiah(w.totalToday)} — 80% dari batas harian ${formatRupiah(w.dailyLimit)}.`
    );
  }

  const monthly = crossed(w.monthlyLimit, w.totalMonth);
  if (monthly === "over") {
    lines.push(
      `🚨 Anggaran bulanan terlampaui! Bulan ini ${formatRupiah(w.totalMonth)} dari batas ${formatRupiah(w.monthlyLimit)}.`
    );
  } else if (monthly === "near") {
    lines.push(
      `⚠️ Pengeluaran bulan ini sudah ${formatRupiah(w.totalMonth)} — 80% dari batas bulanan ${formatRupiah(w.monthlyLimit)}.`
    );
  }

  if (lines.length > 0) {
    await sendTelegramMessage(w.chatId, lines.join("\n"));
  }
}
