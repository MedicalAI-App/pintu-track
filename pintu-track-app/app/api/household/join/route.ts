import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { householdMembers, households } from "@/lib/db/schema";
import { getHouseholdOf, householdViewFor } from "@/lib/household-server";

/** POST /api/household/join — { code } : gabung rumah via kode undangan. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const code = String(body?.code ?? "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Kode undangan wajib diisi" }, { status: 400 });
  }
  if (await getHouseholdOf(user.id)) {
    return NextResponse.json(
      { error: "Kamu sudah tergabung di sebuah rumah" },
      { status: 409 }
    );
  }

  const [h] = await db
    .select()
    .from(households)
    .where(eq(households.inviteCode, code))
    .limit(1);
  if (!h) {
    return NextResponse.json(
      { error: "Kode undangan tidak ditemukan" },
      { status: 404 }
    );
  }

  await db.insert(householdMembers).values({ householdId: h.id, userId: user.id });
  return NextResponse.json({ household: await householdViewFor(user.id) }, { status: 201 });
}
