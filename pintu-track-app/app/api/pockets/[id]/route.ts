import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { householdMembers, pockets, transactions } from "@/lib/db/schema";
import { visiblePocketBalance } from "@/lib/stats";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/pockets/:id — { name?, emoji?, targetAmount?, shared? } — hanya pemilik. */
export async function PATCH(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);

  // Edit hanya oleh pemilik kantong
  const [owned] = await db
    .select()
    .from(pockets)
    .where(and(eq(pockets.id, id), eq(pockets.userId, user.id)))
    .limit(1);
  if (!owned) {
    return NextResponse.json({ error: "Kantong tidak ditemukan" }, { status: 404 });
  }

  const patch: Partial<{
    name: string;
    emoji: string;
    targetAmount: number | null;
    householdId: string | null;
  }> = {};

  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Nama kosong" }, { status: 400 });
    patch.name = name;
  }
  if (body?.emoji !== undefined) patch.emoji = String(body.emoji).trim() || "🎯";
  if (body?.targetAmount !== undefined) {
    const t = body.targetAmount === null || body.targetAmount === "" ? null : Number(body.targetAmount);
    if (t !== null && (!Number.isInteger(t) || t <= 0)) {
      return NextResponse.json({ error: "Target tidak valid" }, { status: 400 });
    }
    patch.targetAmount = t;
  }

  // Ubah status kantong bersama (jadikan bersama / jadikan pribadi)
  if (body?.shared !== undefined) {
    const wantShared = Boolean(body.shared);
    const isShared = Boolean(owned.householdId);
    if (wantShared && !isShared) {
      const [m] = await db
        .select({ householdId: householdMembers.householdId })
        .from(householdMembers)
        .where(eq(householdMembers.userId, user.id))
        .limit(1);
      if (!m) {
        return NextResponse.json(
          { error: "Gabung rumah dulu untuk menjadikan kantong bersama" },
          { status: 400 }
        );
      }
      patch.householdId = m.householdId;
    } else if (!wantShared && isShared) {
      // Aman hanya bila belum ada kontribusi anggota lain
      const [other] = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.pocketId, id), ne(transactions.userId, user.id)))
        .limit(1);
      if (other) {
        return NextResponse.json(
          { error: "Ada kontribusi anggota lain — tidak bisa dijadikan pribadi." },
          { status: 409 }
        );
      }
      patch.householdId = null;
    }
  }

  const [row] = await db
    .update(pockets)
    .set(patch)
    .where(and(eq(pockets.id, id), eq(pockets.userId, user.id)))
    .returning();

  return NextResponse.json({ pocket: row });
}

/**
 * DELETE /api/pockets/:id — isi kantong dikembalikan ke Saldo Utama
 * (dicatat sebagai saving_withdrawal) sebelum kantong dihapus.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { id } = await params;
  const [pocket] = await db
    .select()
    .from(pockets)
    .where(and(eq(pockets.id, id), eq(pockets.userId, user.id)))
    .limit(1);
  if (!pocket) {
    return NextResponse.json({ error: "Kantong tidak ditemukan" }, { status: 404 });
  }

  const balance = (await visiblePocketBalance(user.id, id)) ?? 0;

  // Kantong bersama: hapus hanya saat kosong — anggota tarik dulu bagiannya,
  // agar kontribusi orang lain tidak berpindah ke Saldo Utama penghapus.
  if (pocket.householdId && balance > 0) {
    return NextResponse.json(
      {
        error: `Kantong bersama masih berisi Rp ${balance.toLocaleString("id-ID")} — kosongkan dulu sebelum dihapus.`,
      },
      { status: 409 }
    );
  }

  if (balance > 0) {
    await db.insert(transactions).values({
      userId: user.id,
      type: "saving_withdrawal",
      amount: balance,
      description: `Kantong ${pocket.name} dihapus — dikembalikan ke Saldo Utama`,
      category: "Tabungan",
      pocketId: id,
    });
  }

  await db.delete(pockets).where(and(eq(pockets.id, id), eq(pockets.userId, user.id)));
  return NextResponse.json({ ok: true, returned: balance });
}
