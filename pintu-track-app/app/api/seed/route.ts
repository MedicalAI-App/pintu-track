import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { generateDemoData } from "@/lib/demo";

/** POST — isi akun dengan ±3 bulan data contoh (untuk mencoba dasbor). */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const rows = generateDemoData().map((d) => ({ ...d, userId: user.id }));
  await db.insert(expenses).values(rows);

  return NextResponse.json({ ok: true, inserted: rows.length });
}
