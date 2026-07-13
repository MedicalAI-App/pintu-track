import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { budgets } from "@/lib/db/schema";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const [row] = await db
    .select()
    .from(budgets)
    .where(eq(budgets.userId, user.id))
    .limit(1);

  return NextResponse.json({
    budget: {
      dailyLimit: row?.dailyLimit ?? 0,
      monthlyLimit: row?.monthlyLimit ?? 0,
    },
  });
}

/** PUT /api/budget — { dailyLimit, monthlyLimit } (upsert satu profil anggaran per user). */
export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const dailyLimit = Number(body?.dailyLimit);
  const monthlyLimit = Number(body?.monthlyLimit);

  if (
    !Number.isInteger(dailyLimit) ||
    !Number.isInteger(monthlyLimit) ||
    dailyLimit < 0 ||
    monthlyLimit < 0
  ) {
    return NextResponse.json({ error: "Nilai anggaran tidak valid" }, { status: 400 });
  }

  const [row] = await db
    .insert(budgets)
    .values({ userId: user.id, dailyLimit, monthlyLimit })
    .onConflictDoUpdate({
      target: budgets.userId,
      set: { dailyLimit, monthlyLimit },
    })
    .returning();

  return NextResponse.json({
    budget: { dailyLimit: row.dailyLimit, monthlyLimit: row.monthlyLimit },
  });
}
