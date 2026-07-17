import { CATEGORIES, INCOME_CATEGORIES } from "./types";

/**
 * Lapisan AI (Gemini) — hanya dipanggil saat regex gagal atau ada foto struk.
 * Tanpa GEMINI_API_KEY seluruh fungsi jaringan mengembalikan null (senyap).
 */

/** Urutan percobaan: flash dulu; bila 503/429 (overload/kuota) → flash-lite. */
const MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"];

export type AiParsed = {
  type: "expense" | "income";
  amount: number;
  description: string;
  category: string;
};

export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/** Prompt parser teks bebas → JSON ketat (murni, mudah diuji). */
export function buildParsePrompt(text: string): string {
  return [
    "Kamu parser pencatat keuangan pribadi Indonesia. Analisis pesan user dan balas HANYA JSON tanpa penjelasan.",
    'Skema: {"type":"expense"|"income"|null,"amount":<integer rupiah>,"description":"<ringkas, tanpa nominal>","category":"<satu dari daftar>"}',
    `Kategori expense: ${CATEGORIES.join(", ")}.`,
    `Kategori income: ${INCOME_CATEGORIES.join(", ")}.`,
    'Nominal Indonesia: "85 ribu"=85000, "1,5jt"=1500000, "25rb"=25000. Uang keluar=expense, uang masuk=income.',
    'Bila pesan bukan transaksi keuangan, balas {"type":null}.',
    `Pesan user: "${text.replace(/"/g, "'")}"`,
  ].join("\n");
}

/** Prompt pembaca foto struk → JSON ketat. */
export function buildReceiptPrompt(): string {
  return [
    "Kamu pembaca struk belanja Indonesia. Baca foto struk ini dan balas HANYA JSON tanpa penjelasan.",
    'Skema: {"type":"expense","amount":<TOTAL AKHIR yang dibayar, integer rupiah>,"description":"<nama toko/merchant>","category":"<satu dari daftar>"}',
    `Kategori: ${CATEGORIES.join(", ")}.`,
    'Bila gambar bukan struk atau total tidak terbaca, balas {"type":null}.',
  ].join("\n");
}

/** Validasi + normalisasi balasan model (murni, TDD). Gagal → null. */
export function parseAiJson(raw: string): AiParsed | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (typeof obj !== "object" || obj === null) return null;
  const o = obj as Record<string, unknown>;

  if (o.type !== "expense" && o.type !== "income") return null;

  const amount = Math.round(Number(o.amount));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const description = String(o.description ?? "").trim() || "Transaksi";

  const valid: readonly string[] =
    o.type === "income" ? INCOME_CATEGORIES : CATEGORIES;
  const category = valid.includes(String(o.category))
    ? String(o.category)
    : "Lainnya";

  return { type: o.type, amount, description, category };
}

async function callGemini(
  parts: Record<string, unknown>[]
): Promise<AiParsed | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": key,
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
            },
          }),
          signal: AbortSignal.timeout(20_000),
        }
      );
      if (!res.ok) {
        // Overload/kuota → coba model berikutnya; error lain → berhenti
        if (res.status === 503 || res.status === 429) continue;
        return null;
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("");
      if (!text) return null;
      return parseAiJson(text);
    } catch {
      continue;
    }
  }
  return null;
}

/** Tebak transaksi dari teks bebas. */
export async function aiParseText(text: string): Promise<AiParsed | null> {
  return callGemini([{ text: buildParsePrompt(text) }]);
}

/** Baca foto struk (base64). */
export async function aiParseReceipt(
  imageBase64: string,
  mimeType: string
): Promise<AiParsed | null> {
  return callGemini([
    { text: buildReceiptPrompt() },
    { inline_data: { mime_type: mimeType, data: imageBase64 } },
  ]);
}
