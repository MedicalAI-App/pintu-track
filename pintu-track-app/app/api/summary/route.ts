import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { summaryFor } from "@/lib/stats";

/** GET /api/summary — saldo utama, ringkasan bulan, dan semua kantong. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  return NextResponse.json(await summaryFor(user.id));
}
