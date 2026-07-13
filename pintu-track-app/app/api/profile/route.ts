import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const [row] = await db
    .select({
      name: userTable.name,
      email: userTable.email,
      telegramId: userTable.telegramId,
      googleSheetUrl: userTable.googleSheetUrl,
    })
    .from(userTable)
    .where(eq(userTable.id, user.id))
    .limit(1);

  return NextResponse.json({
    profile: {
      name: row?.name ?? "",
      email: row?.email ?? "",
      telegramLinked: Boolean(row?.telegramId),
      sheetUrl: row?.googleSheetUrl ?? "",
    },
  });
}

/** PUT /api/profile — { name?, sheetUrl? } */
export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Belum login" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const patch: Partial<{ name: string; googleSheetUrl: string; updatedAt: Date }> = {
    updatedAt: new Date(),
  };

  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
    }
    patch.name = name;
  }
  if (body?.sheetUrl !== undefined) {
    const sheetUrl = String(body.sheetUrl).trim();
    if (sheetUrl && !/^https:\/\/docs\.google\.com\/spreadsheets\//.test(sheetUrl)) {
      return NextResponse.json(
        { error: "Tautan harus berupa URL Google Spreadsheet" },
        { status: 400 }
      );
    }
    patch.googleSheetUrl = sheetUrl;
  }

  await db.update(userTable).set(patch).where(eq(userTable.id, user.id));
  return NextResponse.json({ ok: true });
}
