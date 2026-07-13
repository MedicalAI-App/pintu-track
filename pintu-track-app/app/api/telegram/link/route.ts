import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";

/** POST — buat kode penautan unik + tautan t.me untuk bot. */
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const code = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  await db
    .update(userTable)
    .set({ telegramLinkCode: code, updatedAt: new Date() })
    .where(eq(userTable.id, user.id));

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";
  return NextResponse.json({
    code,
    link: botUsername ? `https://t.me/${botUsername}?start=${code}` : null,
  });
}

/** DELETE — putuskan tautan Telegram. */
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  await db
    .update(userTable)
    .set({ telegramId: null, telegramLinkCode: null, updatedAt: new Date() })
    .where(eq(userTable.id, user.id));

  return NextResponse.json({ ok: true });
}
