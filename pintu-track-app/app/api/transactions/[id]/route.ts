import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { visiblePocketBalance } from "@/lib/stats";
import { CATEGORIES, INCOME_CATEGORIES } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/transactions/:id — { amount?, description?, category? } */
export async function PATCH(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
  }

  const patch: Partial<{ amount: number; description: string; category: string }> = {};

  if (body?.amount !== undefined) {
    const amount = Number(body.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Jumlah tidak valid" }, { status: 400 });
    }
    // Penarikan yang membesar tidak boleh melebihi isi kantong
    if (
      existing.type === "saving_withdrawal" &&
      existing.pocketId &&
      amount > existing.amount
    ) {
      const balance = (await visiblePocketBalance(user.id, existing.pocketId)) ?? 0;
      if (amount - existing.amount > balance) {
        return NextResponse.json(
          { error: `Isi kantong hanya Rp ${(balance + existing.amount).toLocaleString("id-ID")}` },
          { status: 400 }
        );
      }
    }
    patch.amount = amount;
  }
  if (body?.description !== undefined) {
    const description = String(body.description).trim();
    if (!description) {
      return NextResponse.json({ error: "Keterangan kosong" }, { status: 400 });
    }
    patch.description = description;
  }
  if (body?.category !== undefined && existing.type !== "saving_deposit" && existing.type !== "saving_withdrawal") {
    const valid =
      existing.type === "income"
        ? (INCOME_CATEGORIES as readonly string[])
        : ([...CATEGORIES, "Penyesuaian"] as readonly string[]);
    if (!valid.includes(body.category)) {
      return NextResponse.json({ error: "Kategori tidak dikenal" }, { status: 400 });
    }
    patch.category = body.category;
  }

  const [row] = await db
    .update(transactions)
    .set(patch)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .returning();

  return NextResponse.json({ transaction: row });
}

/** DELETE /api/transactions/:id */
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { id } = await params;
  const [row] = await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
