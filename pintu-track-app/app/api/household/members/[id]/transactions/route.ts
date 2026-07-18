import { and, desc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getHouseholdOf } from "@/lib/household-server";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/household/members/:id/transactions?months=1
 * Detail transaksi anggota lain — hanya bila requester & target satu rumah.
 */
export async function GET(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const { id: targetId } = await params;
  const info = await getHouseholdOf(user.id);
  if (!info || !info.memberIds.includes(targetId)) {
    return NextResponse.json(
      { error: "Bukan anggota rumahmu" },
      { status: 403 }
    );
  }

  const months = Math.min(
    parseInt(new URL(req.url).searchParams.get("months") ?? "1", 10) || 1,
    12
  );
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1), 1);
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, targetId), gte(transactions.date, since)))
    .orderBy(desc(transactions.date));

  return NextResponse.json({ transactions: rows });
}
