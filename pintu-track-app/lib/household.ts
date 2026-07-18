import { formatRupiah } from "./format";
import { monthlySummary, type LedgerRow } from "./ledger";

/** Alfabet aman: tanpa O/0/I/1 yang mudah tertukar saat dibacakan. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Kode undangan 6 karakter. RNG bisa diinjeksi untuk pengujian. */
export function generateInviteCode(rand: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  }
  return out;
}

export type MemberSummary = {
  name: string;
  expense: number;
  income: number;
  saved: number;
};

export type FamilySummary = {
  perMember: MemberSummary[];
  total: { expense: number; income: number; saved: number };
};

/** Ringkasan bulan berjalan per anggota + total rumah, urut pengeluaran terbesar. */
export function familySummary(
  members: { name: string; rows: LedgerRow[] }[],
  now = new Date()
): FamilySummary {
  const perMember = members
    .map((m) => {
      const s = monthlySummary(m.rows, now);
      return { name: m.name, expense: s.expense, income: s.income, saved: s.saved };
    })
    .sort((a, b) => b.expense - a.expense);

  const total = perMember.reduce(
    (t, m) => ({
      expense: t.expense + m.expense,
      income: t.income + m.income,
      saved: t.saved + m.saved,
    }),
    { expense: 0, income: 0, saved: 0 }
  );

  return { perMember, total };
}

/** Teks ringkasan keluarga untuk bot Telegram (murni). */
export function buildFamilyReport(name: string, s: FamilySummary): string {
  const lines = [
    `👨‍👩‍👧 ${name} — bulan ini`,
    `💸 Total keluar: ${formatRupiah(s.total.expense)}`,
    `💰 Total masuk: ${formatRupiah(s.total.income)}`,
    `🔵 Total ditabung: ${formatRupiah(s.total.saved)}`,
    "",
  ];
  for (const m of s.perMember) {
    lines.push(
      `• ${m.name}: keluar ${formatRupiah(m.expense)} · masuk ${formatRupiah(m.income)}`
    );
  }
  return lines.join("\n");
}
