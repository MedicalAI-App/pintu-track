import { CATEGORIES, type Category } from "./types";

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

/**
 * Parse input gaya chat: "Makan siang 30rb" → { amount: 30000, description: "Makan siang" }.
 * Mengambil token angka terakhir; mendukung 25000, 25.000, 30rb, 1,5jt.
 */
export function parseQuickInput(raw: string): {
  amount: number | null;
  description: string;
  category: Category;
} {
  const text = raw.trim().replace(/\s+/g, " ");
  let last: RegExpExecArray | null = null;
  for (const m of text.matchAll(AMOUNT_RE)) {
    last = m as unknown as RegExpExecArray;
  }

  if (!last || !last[1]) {
    return { amount: null, description: text, category: guessCategory(text) };
  }

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

  const description =
    (text.slice(0, last.index) + text.slice(last.index + last[0].length))
      .replace(/\s+/g, " ")
      .trim() || "Pengeluaran";

  return {
    amount: Math.round(value),
    description,
    category: guessCategory(description),
  };
}
