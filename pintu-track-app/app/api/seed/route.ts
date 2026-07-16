import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { pockets, transactions } from "@/lib/db/schema";
import { generateDemoData, generateDemoDeposits } from "@/lib/demo";

const DEMO_POCKETS = [
  { name: "Dana Darurat", emoji: "🛟", targetAmount: 10_000_000 },
  { name: "Liburan", emoji: "🏖️", targetAmount: 5_000_000 },
];

/** POST — isi akun dengan ±3 bulan data contoh (pengeluaran, gaji, kantong). */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const rows = generateDemoData().map((d) => ({ ...d, userId: user.id }));
  await db.insert(transactions).values(rows);

  const created = await db
    .insert(pockets)
    .values(DEMO_POCKETS.map((p) => ({ ...p, userId: user.id })))
    .onConflictDoNothing()
    .returning();

  const byName = new Map(created.map((p) => [p.name, p.id]));
  const deposits = generateDemoDeposits([...byName.keys()])
    .map(({ pocketName, ...d }) => ({
      ...d,
      userId: user.id,
      pocketId: byName.get(pocketName)!,
    }));
  if (deposits.length) {
    await db.insert(transactions).values(deposits);
  }

  return NextResponse.json({
    ok: true,
    inserted: rows.length + deposits.length,
    pockets: created.length,
  });
}
