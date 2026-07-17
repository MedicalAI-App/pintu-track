import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { reminders } from "@/lib/db/schema";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const rows = await db
    .select()
    .from(reminders)
    .where(eq(reminders.userId, user.id))
    .orderBy(desc(reminders.createdAt));

  return NextResponse.json({ reminders: rows });
}

/** POST /api/reminders — { description, amount, dayOfMonth } */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const description = String(body?.description ?? "").trim();
  const amount = Number(body?.amount);
  const dayOfMonth = Number(body?.dayOfMonth);

  if (!description) {
    return NextResponse.json({ error: "Keterangan wajib diisi" }, { status: 400 });
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 });
  }
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
    return NextResponse.json({ error: "Tanggal harus 1–31" }, { status: 400 });
  }

  const [row] = await db
    .insert(reminders)
    .values({ userId: user.id, description, amount, dayOfMonth })
    .returning();

  return NextResponse.json({ reminder: row }, { status: 201 });
}
