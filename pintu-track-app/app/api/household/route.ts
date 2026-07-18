import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { householdMembers, households } from "@/lib/db/schema";
import { generateInviteCode } from "@/lib/household";
import { getHouseholdOf, householdViewFor } from "@/lib/household-server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  return NextResponse.json({ household: await householdViewFor(user.id) });
}

/** POST /api/household — { name } : buat rumah + auto-join pembuat. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Nama rumah wajib diisi" }, { status: 400 });
  }
  if (await getHouseholdOf(user.id)) {
    return NextResponse.json(
      { error: "Kamu sudah tergabung di sebuah rumah" },
      { status: 409 }
    );
  }

  // Retry saat kode undangan tabrakan (unique)
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [h] = await db
        .insert(households)
        .values({ name, inviteCode: generateInviteCode(), createdBy: user.id })
        .returning();
      await db
        .insert(householdMembers)
        .values({ householdId: h.id, userId: user.id });
      return NextResponse.json(
        { household: await householdViewFor(user.id) },
        { status: 201 }
      );
    } catch (e) {
      if (e instanceof Error && /invite_code|duplicate/i.test(e.message)) continue;
      throw e;
    }
  }
  return NextResponse.json({ error: "Gagal membuat kode, coba lagi" }, { status: 500 });
}
