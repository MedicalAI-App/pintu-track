# Gelombang C — Kecerdasan: Parser AI Fallback & Foto Struk (Gemini)

Tanggal: 2026-07-17
Status: disetujui implisit (user memilih Gemini API dan menyerahkan API key untuk dieksekusi)

## Keputusan desain

1. **Provider**: Google Gemini API, model `gemini-flash-latest`, env `GEMINI_API_KEY`. Free tier (≈10 RPM / 1.500 req/hari, vision termasuk) jauh melampaui kebutuhan. Kunci kosong → seluruh fitur AI senyap, bot tetap berfungsi penuh (pola degradasi anggun yang sama dengan Telegram/Sheets).
2. **AI adalah lapisan kedua**: `parseQuickInput` (regex) tetap lapisan pertama. Gemini dipanggil HANYA bila (a) pesan teks bot gagal diparse regex (amount null) dan bukan perintah, atau (b) pesan berisi **foto** (struk). Web tidak memakai AI di gelombang ini (preview manual sudah memadai).
3. **Konfirmasi wajib sebelum tercatat**: hasil AI tidak pernah langsung masuk ledger. Bot membalas tebakan + tombol inline **✅ Catat** / **❌ Batal**. Tebakan disimpan di tabel `ai_suggestions` (callback_data Telegram terbatas 64 byte → hanya membawa id).
4. **Scope tipe**: AI hanya menebak `expense` dan `income` (nabung/kantong tetap eksklusif grammar regex — menghindari AI salah memindahkan uang antar kantong).

## Alur

### Teks bebas (fallback)
`"kemarin traktir temen ngopi habis 85 ribu"` → regex gagal → Gemini (prompt JSON ketat) → `{type, amount, description, category}` → validasi & normalisasi (kategori dipetakan ke CATEGORIES/INCOME_CATEGORIES; amount integer > 0; gagal → balasan bantuan biasa) → simpan `ai_suggestions` → balas `🤖 Maksudmu: <desc> — <Rp> (<emoji> <kategori>)?` + tombol `aiok:<id>` / `aino:<id>`.

### Foto struk
Pesan `photo` → ambil file_id terbesar → Telegram `getFile` → unduh (≤ 4MB) → base64 inline ke Gemini vision → `{amount (total akhir), description (nama merchant), category}` → alur konfirmasi yang sama.

### Callback
- `aiok:<id>`: baca suggestion (validasi milik chat) → insert transaksi (+Sheets, + peringatan anggaran utk expense) → hapus suggestion → edit pesan jadi konfirmasi tercatat.
- `aino:<id>`: hapus suggestion → edit pesan "Dibatalkan".
- Suggestion kedaluwarsa (>24 jam, dibersihkan saat dipakai/dibuat) → jawab "kedaluwarsa, kirim ulang".

## Skema (migrasi 0003)

```sql
CREATE TABLE "ai_suggestions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "type" text NOT NULL CHECK ("type" IN ('expense','income')),
  "amount" integer NOT NULL CHECK ("amount" > 0),
  "description" text NOT NULL,
  "category" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "ai_suggestions_user_idx" ON "ai_suggestions"("user_id");
```

## Modul

| File | Isi |
|---|---|
| `lib/ai.ts` | `aiConfigured()`, `buildParsePrompt(text)` & `buildReceiptPrompt()` (murni), `parseAiJson(raw)` → validasi+normalisasi (murni, TDD), `aiParseText(text)`, `aiParseReceipt(imageBase64, mime)` (fetch Gemini, `responseMimeType: application/json`, error → null) |
| Webhook | Cabang foto; fallback teks; handler callback `aiok:`/`aino:` |
| `.env.example` | `GEMINI_API_KEY` + petunjuk AI Studio |

Prompt (inti): sistem pencatat keuangan Indonesia; balas HANYA JSON `{"type":"expense|income","amount":int_rupiah,"description":string_singkat,"category":salah satu dari daftar}`; contoh format nominal Indonesia (rb/jt/ribu); bila bukan transaksi → `{"type":null}`.

## Verifikasi (definisi selesai)

- Unit: parseAiJson (JSON valid/invalid/kategori asing/nominal 0/type null), buildParsePrompt memuat daftar kategori — gagal dulu.
- E2E lokal (key asli di `.env.local`): webhook-sim teks bebas → suggestion tercipta + balasan konfirmasi; `aiok` → transaksi tercatat; `aino` → batal; teks non-transaksi ("halo bot") → balasan bantuan tanpa suggestion.
- E2E prod: env key dipasang user → kirim kalimat bebas & foto struk asli ke @PintutrackBot → konfirmasi → tercatat.

## Di luar scope

AI di web quick-input, voice note, multi-item struk (hanya total), model selain Flash, batching/cache.
