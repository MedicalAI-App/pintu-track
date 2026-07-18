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

export const TRANSACTION_TYPES = [
  "expense",
  "income",
  "saving_deposit",
  "saving_withdrawal",
  "saving_topup",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const INCOME_CATEGORIES = ["Gaji", "Bonus", "Lainnya", "Penyesuaian"] as const;

export const ADJUSTMENT_CATEGORY = "Penyesuaian";

export const TYPE_LABEL: Record<TransactionType, string> = {
  expense: "Pengeluaran",
  income: "Pemasukan",
  saving_deposit: "Nabung",
  saving_withdrawal: "Tarik",
  saving_topup: "Top-up",
};

/** Satu baris ledger — cermin tabel TRANSACTIONS. */
export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  pocketId: string | null;
  /** ISO string */
  date: string;
};

/** @deprecated alias lama — gunakan Transaction. */
export type Expense = Transaction;

export type Pocket = {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number | null;
  balance: number;
};

/** Rumah/keluarga — agregasi lintas akun. */
export type Household = {
  id: string;
  name: string;
  inviteCode: string;
  members: {
    userId: string;
    name: string;
    expenseMonth: number;
    incomeMonth: number;
    savedMonth: number;
  }[];
  total: { expense: number; income: number; saved: number };
};

/** Pengingat tagihan berulang (dikirim bot tiap tanggal N). */
export type Reminder = {
  id: string;
  description: string;
  amount: number;
  dayOfMonth: number;
  active: boolean;
};

/** Cermin tabel BUDGETS pada PRD. */
export type Budget = {
  dailyLimit: number;
  monthlyLimit: number;
};

export type Profile = {
  userId?: string;
  name: string;
  email: string;
  telegramLinked: boolean;
  sheetUrl: string;
  /** Email service account Google (bila server dikonfigurasi) untuk dibagikan akses sheet */
  sheetServiceEmail?: string | null;
};
