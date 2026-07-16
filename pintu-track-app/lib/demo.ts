import { guessCategory } from "./parse";
import type { TransactionType } from "./types";

const DEMO_ITEMS: { desc: string; min: number; max: number }[] = [
  { desc: "Sarapan bubur", min: 10_000, max: 20_000 },
  { desc: "Kopi susu", min: 18_000, max: 28_000 },
  { desc: "Makan siang warteg", min: 15_000, max: 35_000 },
  { desc: "Gojek ke kantor", min: 12_000, max: 30_000 },
  { desc: "Parkir motor", min: 2_000, max: 5_000 },
  { desc: "Bensin pertalite", min: 20_000, max: 50_000 },
  { desc: "Jajan boba", min: 15_000, max: 25_000 },
  { desc: "Nonton bioskop", min: 40_000, max: 60_000 },
  { desc: "Pulsa kuota", min: 25_000, max: 100_000 },
  { desc: "Belanja shopee", min: 30_000, max: 150_000 },
  { desc: "Obat apotek", min: 15_000, max: 60_000 },
  { desc: "Makan malam geprek", min: 15_000, max: 30_000 },
];

export type DemoRow = {
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: Date;
};

export function generateDemoData(): DemoRow[] {
  const out: DemoRow[] = [];
  const now = new Date();
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    return seed / 2 ** 31;
  };

  for (let day = 0; day < 90; day++) {
    const d = new Date(now);
    d.setDate(d.getDate() - day);
    const count = 1 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
      const item = DEMO_ITEMS[Math.floor(rand() * DEMO_ITEMS.length)];
      const amount =
        Math.round((item.min + rand() * (item.max - item.min)) / 1000) * 1000;
      const dt = new Date(d);
      dt.setHours(8 + Math.floor(rand() * 12), Math.floor(rand() * 60), 0, 0);
      if (dt > now) continue;
      out.push({
        type: "expense",
        amount,
        description: item.desc,
        category: guessCategory(item.desc),
        date: dt,
      });
    }
  }

  // Gaji bulanan tiap tanggal 1 (3 bulan terakhir)
  for (let m = 0; m < 3; m++) {
    const dt = new Date(now.getFullYear(), now.getMonth() - m, 1, 9, 0, 0, 0);
    if (dt > now) continue;
    const amount = (4_000 + Math.floor(rand() * 2_000)) * 1_000;
    out.push({
      type: "income",
      amount,
      description: "Gaji bulanan",
      category: "Gaji",
      date: dt,
    });
  }

  return out.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Setoran kantong demo: 2 deposit/bulan per kantong (3 bulan terakhir). */
export function generateDemoDeposits(pocketNames: string[]): (DemoRow & { pocketName: string })[] {
  const out: (DemoRow & { pocketName: string })[] = [];
  const now = new Date();
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    return seed / 2 ** 31;
  };

  for (const pocketName of pocketNames) {
    for (let m = 0; m < 3; m++) {
      for (const dayOfMonth of [5, 20]) {
        const dt = new Date(now.getFullYear(), now.getMonth() - m, dayOfMonth, 10, 0, 0, 0);
        if (dt > now) continue;
        const amount = (100 + Math.floor(rand() * 200)) * 1_000;
        out.push({
          type: "saving_deposit",
          amount,
          description: `Nabung: ${pocketName}`,
          category: "Tabungan",
          date: dt,
          pocketName,
        });
      }
    }
  }
  return out;
}
