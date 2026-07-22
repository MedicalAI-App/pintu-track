import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { householdMembers, pockets } from "@/lib/db/schema";
import { summaryFor } from "@/lib/stats";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { pockets: list } = await summaryFor(user.id);
  return NextResponse.json({ pockets: list });
}

/** POST /api/pockets — { name, emoji?, targetAmount? } */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const emoji = String(body?.emoji ?? "🎯").trim() || "🎯";
  const targetRaw = body?.targetAmount;
  const targetAmount =
    targetRaw === null || targetRaw === undefined || targetRaw === ""
      ? null
      : Number(targetRaw);

  if (!name) {
    return NextResponse.json({ error: "Nama kantong wajib diisi" }, { status: 400 });
  }
  if (targetAmount !== null && (!Number.isInteger(targetAmount) || targetAmount <= 0)) {
    return NextResponse.json({ error: "Target tidak valid" }, { status: 400 });
  }

  // Kantong bersama: butuh keanggotaan rumah
  let householdId: string | null = null;
  if (body?.shared) {
    const [m] = await db
      .select({ householdId: householdMembers.householdId })
      .from(householdMembers)
      .where(eq(householdMembers.userId, user.id))
      .limit(1);
    if (!m) {
      return NextResponse.json(
        { error: "Gabung rumah dulu untuk membuat kantong bersama" },
        { status: 400 }
      );
    }
    householdId = m.householdId;
  }

  try {
    const [row] = await db
      .insert(pockets)
      .values({ userId: user.id, name, emoji, targetAmount, householdId })
      .returning();
    return NextResponse.json(
      { pocket: { ...row, balance: 0 } },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Error && /pockets_user_name_idx|duplicate/i.test(e.message)) {
      return NextResponse.json(
        { error: "Nama kantong sudah dipakai" },
        { status: 409 }
      );
    }
    throw e;
  }
}
