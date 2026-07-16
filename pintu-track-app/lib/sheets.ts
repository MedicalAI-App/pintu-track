import { google } from "googleapis";
import { TYPE_LABEL, type TransactionType } from "./types";

export function extractSpreadsheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m?.[1] ?? null;
}

export function sheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  );
}

/**
 * Tambahkan satu baris transaksi (semua tipe) ke Google Sheet milik user
 * (service account harus dibagikan akses Editor ke spreadsheet tsb).
 * Senyap bila kredensial server atau URL sheet belum ada.
 */
export async function appendTransactionToSheet(
  sheetUrl: string | null | undefined,
  e: {
    date: Date | string;
    type: TransactionType | string;
    description: string;
    category: string;
    amount: number;
  }
) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n");
  if (!email || !key || !sheetUrl) return;

  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId) return;

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  const d = new Date(e.date);
  const tanggal = d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const tipe =
    TYPE_LABEL[e.type as TransactionType] ?? String(e.type);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "A:E",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[tanggal, tipe, e.description, e.category, e.amount]],
    },
  });
}
