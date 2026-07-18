import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { householdMembers, households } from "@/lib/db/schema";
import { getHouseholdOf } from "@/lib/household-server";

/** POST /api/household/leave — keluar; anggota terakhir → rumah dihapus. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const info = await getHouseholdOf(user.id);
  if (!info) {
    return NextResponse.json({ error: "Kamu tidak tergabung di rumah mana pun" }, { status: 404 });
  }

  await db
    .delete(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, info.id),
        eq(householdMembers.userId, user.id)
      )
    );

  if (info.memberIds.length <= 1) {
    await db.delete(households).where(eq(households.id, info.id));
  }

  return NextResponse.json({ ok: true, disbanded: info.memberIds.length <= 1 });
}
