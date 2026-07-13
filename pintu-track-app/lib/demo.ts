import { guessCategory } from "./parse";
import type { Category } from "./types";

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

export function generateDemoData(): {
  amount: number;
  description: string;
  category: Category;
  date: Date;
}[] {
  const out: { amount: number; description: string; category: Category; date: Date }[] = [];
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
        amount,
        description: item.desc,
        category: guessCategory(item.desc),
        date: dt,
      });
    }
  }
  return out;
}
