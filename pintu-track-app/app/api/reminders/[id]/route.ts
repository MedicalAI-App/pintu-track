import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reminders } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/reminders/:id — { description?, amount?, dayOfMonth?, active? } */
export async function PATCH(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const patch: Partial<{
    description: string;
    amount: number;
    dayOfMonth: number;
    active: boolean;
  }> = {};

  if (body?.description !== undefined) {
    const d = String(body.description).trim();
    if (!d) return NextResponse.json({ error: "Keterangan kosong" }, { status: 400 });
    patch.description = d;
  }
  if (body?.amount !== undefined) {
    const a = Number(body.amount);
    if (!Number.isInteger(a) || a <= 0) {
      return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
    }
    patch.amount = a;
  }
  if (body?.dayOfMonth !== undefined) {
    const d = Number(body.dayOfMonth);
    if (!Number.isInteger(d) || d < 1 || d > 31) {
      return NextResponse.json({ error: "Tanggal harus 1–31" }, { status: 400 });
    }
    patch.dayOfMonth = d;
  }
  if (body?.active !== undefined) patch.active = Boolean(body.active);

  const [row] = await db
    .update(reminders)
    .set(patch)
    .where(and(eq(reminders.id, id), eq(reminders.userId, user.id)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Pengingat tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ reminder: row });
}

/** DELETE /api/reminders/:id */
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { id } = await params;
  const [row] = await db
    .delete(reminders)
    .where(and(eq(reminders.id, id), eq(reminders.userId, user.id)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Pengingat tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
