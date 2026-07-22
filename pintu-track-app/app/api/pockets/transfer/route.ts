import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { visiblePocketBalance, visiblePockets } from "@/lib/stats";

/**
 * POST /api/pockets/transfer — { fromPocketId, toPocketId, amount }
 * Pasangan atomik: tarik dari asal + setor ke tujuan (Saldo Utama net 0).
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const fromPocketId = String(body?.fromPocketId ?? "");
  const toPocketId = String(body?.toPocketId ?? "");
  const amount = Number(body?.amount);

  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
  }
  if (!fromPocketId || !toPocketId || fromPocketId === toPocketId) {
    return NextResponse.json(
      { error: "Kantong asal dan tujuan harus berbeda" },
      { status: 400 }
    );
  }

  const list = await visiblePockets(user.id);
  const from = list.find((p) => p.id === fromPocketId);
  const to = list.find((p) => p.id === toPocketId);
  if (!from || !to) {
    return NextResponse.json({ error: "Kantong tidak ditemukan" }, { status: 404 });
  }

  const fromBalance = (await visiblePocketBalance(user.id, fromPocketId)) ?? 0;
  if (amount > fromBalance) {
    return NextResponse.json(
      { error: `Isi ${from.name} hanya Rp ${fromBalance.toLocaleString("id-ID")}` },
      { status: 400 }
    );
  }

  const description = `Transfer: ${from.name} → ${to.name}`;
  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      userId: user.id,
      type: "saving_withdrawal",
      amount,
      description,
      category: "Tabungan",
      pocketId: fromPocketId,
    });
    await tx.insert(transactions).values({
      userId: user.id,
      type: "saving_deposit",
      amount,
      description,
      category: "Tabungan",
      pocketId: toPocketId,
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
