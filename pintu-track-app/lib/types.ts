export const CATEGORIES = [
  "Makanan & Minuman",
  "Transportasi",
  "Belanja",
  "Hiburan",
  "Tagihan",
  "Kesehatan",
  "Lainnya",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_EMOJI: Record<Category, string> = {
  "Makanan & Minuman": "🍔",
  Transportasi: "🚌",
  Belanja: "🛒",
  Hiburan: "🎬",
  Tagihan: "🧾",
  Kesehatan: "💊",
  Lainnya: "📦",
};

/** Cermin tabel EXPENSES pada PRD — siap ditukar ke API backend. */
export type Expense = {
  id: string;
  amount: number;
  description: string;
  category: Category;
  /** ISO string */
  date: string;
};

/** Cermin tabel BUDGETS pada PRD. */
export type Budget = {
  dailyLimit: number;
  monthlyLimit: number;
};

export type Profile = {
  name: string;
  email: string;
  telegramLinked: boolean;
  sheetUrl: string;
  /** Email service account Google (bila server dikonfigurasi) untuk dibagikan akses sheet */
  sheetServiceEmail?: string | null;
};
