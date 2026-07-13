import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { CATEGORIES } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/expenses/:id — { amount?, description?, category? } */
export async function PATCH(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const patch: Partial<{
    amount: number;
    description: string;
    category: string;
  }> = {};

  if (body?.amount !== undefined) {
    const amount = Number(body.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json({ error: "Jumlah tidak valid" }, { status: 400 });
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
  if (body?.category !== undefined) {
    if (!(CATEGORIES as readonly string[]).includes(body.category)) {
      return NextResponse.json({ error: "Kategori tidak dikenal" }, { status: 400 });
    }
    patch.category = body.category;
  }

  const [row] = await db
    .update(expenses)
    .set(patch)
    .where(and(eq(expenses.id, id), eq(expenses.userId, user.id)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ expense: row });
}

/** DELETE /api/expenses/:id */
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { id } = await params;
  const [row] = await db
    .delete(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.userId, user.id)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Catatan tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
