import { CATEGORIES, type Category, type TransactionType } from "./types";

const KEYWORDS: Record<Exclude<Category, "Lainnya">, string[]> = {
  "Makanan & Minuman": [
    "makan", "kopi", "sarapan", "nasi", "ayam", "bakso", "mie", "minum",
    "jajan", "snack", "boba", "gorengan", "cafe", "kafe", "resto", "teh",
    "roti", "sate", "seblak", "martabak", "es ", "warteg", "padang", "geprek",
  ],
  Transportasi: [
    "gojek", "grab", "ojek", "ojol", "bensin", "pertalite", "pertamax",
    "parkir", "tol", "bus", "kereta", "krl", "mrt", "angkot", "taksi",
    "taxi", "transport", "travel", "tiket",
  ],
  Belanja: [
    "belanja", "baju", "celana", "sepatu", "shopee", "tokopedia", "lazada",
    "skincare", "sabun", "shampo", "deterjen", "kado", "aksesoris",
  ],
  Hiburan: [
    "nonton", "bioskop", "game", "spotify", "netflix", "konser", "film",
    "karaoke", "steam", "top up", "topup",
  ],
  Tagihan: [
    "listrik", "pulsa", "kuota", "internet", "wifi", "air", "pdam", "bpjs",
    "cicilan", "sewa", "kos", "kost", "iuran", "asuransi", "pajak",
  ],
  Kesehatan: [
    "obat", "dokter", "apotek", "vitamin", "klinik", "rumah sakit", "gigi",
    "vaksin", "lab",
  ],
};

export function guessCategory(description: string): Category {
  const text = description.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat === "Lainnya") continue;
    if (KEYWORDS[cat].some((k) => text.includes(k))) return cat;
  }
  return "Lainnya";
}

const AMOUNT_RE = /(\d+(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(rb|ribu|k|jt|juta)?/gi;

const INCOME_KEYWORDS = [
  "gajian", "gaji", "terima", "dapat", "masuk", "bonus", "thr",
  "refund", "cashback", "dibayar",
];

function incomeCategory(text: string): string {
  if (/\b(gaji|gajian)\b/.test(text)) return "Gaji";
  if (/\b(bonus|thr|cashback|refund)\b/.test(text)) return "Bonus";
  return "Lainnya";
}

/** Ambil token nominal terakhir dari teks; rest = teks tanpa token itu. */
function extractAmount(text: string): { amount: number | null; rest: string } {
  let last: RegExpExecArray | null = null;
  for (const m of text.matchAll(AMOUNT_RE)) {
    last = m as unknown as RegExpExecArray;
  }
  if (!last?.[1]) return { amount: null, rest: text };

  const numRaw = last[1];
  const suffix = (last[2] ?? "").toLowerCase();

  let value: number;
  if (/^\d{1,3}(?:\.\d{3})+$/.test(numRaw)) {
    // Format ribuan Indonesia: 25.000
    value = parseInt(numRaw.replace(/\./g, ""), 10);
  } else {
    value = parseFloat(numRaw.replace(",", "."));
  }

  if (suffix === "rb" || suffix === "ribu" || suffix === "k") value *= 1_000;
  if (suffix === "jt" || suffix === "juta") value *= 1_000_000;

  const rest = (text.slice(0, last.index) + text.slice(last.index + last[0].length))
    .replace(/\s+/g, " ")
    .trim();

  return { amount: Math.round(value), rest };
}

export type ParsedReminder = {
  description: string;
  amount: number;
  dayOfMonth: number;
};

/**
 * Parse perintah pengingat tagihan:
 * "ingatkan kos 1,5jt tiap tanggal 1" → { description: "kos", amount: 1500000, dayOfMonth: 1 }.
 * Wajib ada nominal dan "tanggal <1-31>"; selain itu null.
 */
export function parseReminder(raw: string): ParsedReminder | null {
  const text = raw.trim().replace(/\s+/g, " ");
  const m = text.match(/^ingatkan\b\s*(.*)$/i);
  if (!m) return null;

  let rest = m[1];
  const tgl = rest.match(/\b(?:setiap|tiap)?\s*(?:tanggal|tgl)\s+(\d{1,2})\b/i);
  if (!tgl) return null;
  const dayOfMonth = parseInt(tgl[1], 10);
  if (dayOfMonth < 1 || dayOfMonth > 31) return null;

  rest = (rest.slice(0, tgl.index) + rest.slice(tgl.index! + tgl[0].length))
    .replace(/\s+/g, " ")
    .trim();

  const { amount, rest: description } = extractAmount(rest);
  if (!amount || amount <= 0 || !description) return null;

  return { description, amount, dayOfMonth };
}

export type ParsedInput = {
  type: TransactionType;
  amount: number | null;
  description: string;
  category: string;
  /** Nama kantong yang dimaksud user (belum divalidasi ke DB) */
  pocketQuery: string | null;
};

/**
 * Parse input gaya chat menjadi transaksi ledger:
 * "Makan siang 30rb" → expense; "gajian 5jt" → income;
 * "nabung 100rb liburan" → saving_deposit + pocketQuery.
 * Nominal mendukung 25000, 25.000, 30rb, 1,5jt (token angka terakhir).
 */
export function parseQuickInput(raw: string): ParsedInput {
  const text = raw.trim().replace(/\s+/g, " ");
  const extracted = extractAmount(text);
  const amount = extracted.amount;
  const description = amount !== null ? extracted.rest || "Pengeluaran" : text;

  const lower = description.toLowerCase();

  // Transaksi kantong: "nabung 100rb liburan" / "ambil 50rb dari liburan".
  // Fallback ambil→expense diputuskan server-side bila kantong tak ditemukan.
  const savingMatch = text
    .toLowerCase()
    .match(/^(nabung|tabung|menabung|ambil|tarik)\b/);
  if (savingMatch) {
    const type: TransactionType = ["ambil", "tarik"].includes(savingMatch[1])
      ? "saving_withdrawal"
      : "saving_deposit";
    const pocketQuery =
      lower
        .replace(/^(nabung|tabung|menabung|ambil|tarik)\b/, "")
        .replace(/\b(dari|ke|buat|untuk)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim() || null;
    return { type, amount, description, category: "Tabungan", pocketQuery };
  }

  if (INCOME_KEYWORDS.some((k) => new RegExp(`\\b${k}\\b`).test(lower))) {
    return {
      type: "income",
      amount,
      description,
      category: incomeCategory(lower),
      pocketQuery: null,
    };
  }

  return {
    type: "expense",
    amount,
    description,
    category: guessCategory(description),
    pocketQuery: null,
  };
}
