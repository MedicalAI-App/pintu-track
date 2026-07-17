# Gelombang B — Bot Proaktif: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Laporan mingguan Telegram otomatis + pengingat tagihan berulang dengan tombol sekali-tap, dijadwalkan oleh scheduler internal aplikasi.

**Architecture:** Fungsi murni `lib/cron.ts` (due-check WIB, catch-up) + `lib/report.ts` (format laporan) di-TDD; `lib/jobs.ts` menjalankan kiriman; loop 60 detik di `instrumentation.ts`; `job_runs` mencegah kiriman ganda. Pengingat = tabel `reminders`, dibuat via chat (`parseReminder`) atau web (section Anggaran), dieksekusi via tombol inline `pay:<id>` di webhook.

**Tech Stack:** stack Gelombang A + Telegram inline keyboard; tanpa dependensi baru.

## Global Constraints

- WIB = UTC+7 offset manual; jadwal: mingguan Senin 07:00 WIB, harian 07:00 WIB.
- Secret cron = `TELEGRAM_WEBHOOK_SECRET` (header `x-cron-secret`); tanpa env baru.
- Semua konstruk Gelombang A tetap (amount integer > 0, copy ID, dsb.).
- Branch kerja: `gelombang-b`; commit sering; setiap commit ber-Co-Authored-By Claude.

---

### Task B2: parseReminder (TDD)
**Files:** Modify `lib/parse.ts`; Test `tests/parse-reminder.test.ts`
**Produces:** `extractAmount(text): { amount: number|null; rest: string }` (refactor internal, dipakai parseQuickInput juga) dan `parseReminder(raw): { description: string; amount: number; dayOfMonth: number } | null`.
Grammar: harus diawali `ingatkan`; wajib ada `(setiap|tiap)? (tanggal|tgl) <1-31>` dan nominal; description = sisa teks. Tanpa nominal/tanggal → null.
- [ ] Tes gagal: `ingatkan kos 1,5jt tiap tanggal 1` → {kos, 1500000, 1}; `ingatkan bayar wifi 250rb setiap tgl 25` → {bayar wifi, 250000, 25}; `ingatkan listrik tanggal 5` → null (tanpa nominal); `makan siang 30rb` → null. Run: FAIL (fungsi belum ada).
- [ ] Implement minimal (hapus token tanggal dulu, lalu extractAmount, sisa = description). Suite parseQuickInput lama tetap hijau.
- [ ] Commit `feat: parseReminder (TDD)`.

### Task B3: lib/cron.ts (TDD)
**Files:** Create `lib/cron.ts`; Test `tests/cron.test.ts`
**Produces:**
```ts
toWib(d: Date): Date            // instan + 7 jam (baca via getUTC*)
isDailyDue(now: Date, lastRun: Date|null, hourWib?=7): boolean   // now ≥ target hari-ini-WIB && lastRun < target
isWeeklyDue(now: Date, lastRun: Date|null, hourWib?=7): boolean  // target = Senin terakhir 07:00 WIB (catch-up)
reminderMatchesToday(dayOfMonth: number, now: Date): boolean      // clamp ke hari terakhir bulan WIB
lastWeekRangeUtc(now: Date): { start: Date; end: Date; label: string } // [Senin lalu 00:00 WIB, Senin ini 00:00 WIB)
```
- [ ] Tes gagal (pakai instan UTC eksplisit; acuan: 2026-07-17 = Jumat, 2026-07-13 = Senin, 2026-06-30 = akhir Juni):
  daily: due saat 08:00 WIB dgn lastRun kemarin; tidak due saat 06:59 WIB; tidak due bila lastRun ≥ target.
  weekly: due Senin 07:30 WIB lastRun minggu lalu; tidak due Selasa bila lastRun Senin; due Rabu bila lastRun 2 minggu lalu (catch-up).
  clamp: reminder 31 cocok pada 30 Jun; 15 cocok hanya tanggal 15.
  range: dari Jumat 17 Jul → start=Senin 6 Jul 00:00 WIB (=2026-07-05T17:00Z), end=Senin 13 Jul 00:00 WIB (=2026-07-12T17:00Z).
- [ ] Implement minimal → hijau → Commit `feat: cron murni WIB (TDD)`.

### Task B4: lib/report.ts (TDD)
**Files:** Create `lib/report.ts`; Test `tests/report.test.ts`
**Produces:** `buildWeeklyReport(i: { name; rangeLabel; totalExpense; topCategories: {category;total}[]; income; saved; saldo; budget?: {monthlyLimit; spentMonth}|null }): string`.
- [ ] Tes gagal: memuat rangeLabel, nominal berformat id-ID, top kategori berurutan, baris anggaran (persen) hanya bila budget ada.
- [ ] Implement → hijau → Commit.

### Task B5: Migrasi 0002
**Files:** Modify `lib/db/schema.ts`; Create `drizzle/0002_wave_b.sql`
```sql
CREATE TABLE "reminders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "description" text NOT NULL,
  "amount" integer NOT NULL CHECK ("amount" > 0),
  "day_of_month" integer NOT NULL CHECK ("day_of_month" BETWEEN 1 AND 31),
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "reminders_user_idx" ON "reminders"("user_id");
CREATE TABLE "job_runs" ("job" text PRIMARY KEY, "last_run_at" timestamptz NOT NULL);
```
- [ ] schema.ts: `reminders`, `jobRuns` (mapping camelCase serupa tabel lain).
- [ ] Apply ke Supabase dev via MCP (plus RLS pintu_app + revoke anon/authenticated pada kedua tabel — konsisten kebijakan dev).
- [ ] Commit.

### Task B6: Telegram helpers + API reminders + webhook
**Files:** Modify `lib/telegram.ts`, `app/api/telegram/route.ts`; Create `app/api/reminders/route.ts`, `app/api/reminders/[id]/route.ts`
**Produces:** `sendTelegramMessageWithButton(chatId, text, {text, callbackData})`, `answerCallbackQuery(id, text?)`, `editMessageText(chatId, messageId, text)`.
API: GET → `{reminders: Reminder[]}`; POST `{description, amount, dayOfMonth}` → 201; PATCH `{description?, amount?, dayOfMonth?, active?}`; DELETE. `Reminder = {id, description, amount, dayOfMonth, active}`.
Webhook: (1) `update.callback_query` dengan data `pay:<id>` → cari reminder milik user ber-chatId → insert expense kategori Tagihan (+sheets) → `editMessageText` konfirmasi + `answerCallbackQuery`; (2) perintah `pengingat` → daftar aktif; (3) `parseReminder` cocok → insert + balas konfirmasi; teks diawali `ingatkan` tapi parse gagal → balas contoh format. Urutan cek: callback → /start → pengingat cmd → ingatkan → kantong cmd → saldo cmd → parseQuickInput.
- [ ] Implement semua + Commit.

### Task B7: Jobs + scheduler + cron endpoint
**Files:** Create `lib/jobs.ts`, `lib/scheduler.ts`, `instrumentation.ts`, `app/api/cron/run/route.ts`
- `runWeeklyReports(now?)`: user ber-telegramId → transaksi rentang `lastWeekRangeUtc` → skip user tanpa aktivitas minggu itu → `buildWeeklyReport` → kirim; return jumlah terkirim.
- `runDailyReminders(now?)`: reminders active join user ber-telegramId, filter `reminderMatchesToday` → kirim dengan tombol `pay:<id>`; return jumlah.
- `scheduler.ts`: `startScheduler()` idempotent; tick 60s: baca `job_runs`, `isWeeklyDue`→run+upsert `weekly_report`, `isDailyDue`→run+upsert `daily_reminders`; error di-log, tidak melempar.
- `instrumentation.ts` (root app): register() → hanya `NEXT_RUNTIME==='nodejs'` → startScheduler().
- `/api/cron/run?job=weekly|reminders` POST: header `x-cron-secret` === `TELEGRAM_WEBHOOK_SECRET` (bila env kosong → hanya izinkan di NODE_ENV!=='production') → paksa run → `{sent}` (tanpa update job_runs — pemicu manual tidak menggeser jadwal).
- [ ] Implement + `npm run build` hijau + Commit.

### Task B8: UI pengingat + store
**Files:** Modify `lib/store.tsx`, `lib/types.ts`, `app/anggaran/page.tsx`
- Store: `reminders: Reminder[]` (ikut `refresh()`), `createReminder`, `updateReminder` (toggle active), `deleteReminder`.
- Anggaran page, section baru "Pengingat Tagihan": daftar (desc — Rp — "tiap tanggal N" — toggle aktif — hapus), form tambah (keterangan, nominal, tanggal 1–31), catatan kecil "dikirim via bot Telegram jam 07:00 WIB".
- [ ] Implement + build + Commit.

### Task B9: Gerbang gelombang (lokal)
- [ ] `npm test` + `npm run build` hijau.
- [ ] Dev server: buat pengingat via web & via webhook-sim (`ingatkan kos 15rb tiap tanggal <hari ini>`); `POST /api/cron/run?job=reminders` → `{sent:≥1}`; simulasi callback `pay:<id>` → expense Tagihan muncul di riwayat; `POST /api/cron/run?job=weekly` → `{sent:≥1}` (akun dev punya aktivitas minggu lalu — bila tidak, seed); perintah `pengingat` → 200.
- [ ] Bug → tulis tes gagal dulu (fungsi murni) atau perbaiki route; ulangi sampai bersih.

### Task B10: Rollout produksi
- [ ] Merge `gelombang-b` → main, push.
- [ ] User paste `drizzle/0002_wave_b.sql` (tanpa bagian RLS — khusus dev) di terminal psql Coolify; verifikasi `\dt` memuat `reminders` & `job_runs`.
- [ ] Deploy → tunggu 200 → E2E prod: `ingatkan tes 10rb tiap tanggal <hari ini>` via bot asli → `/api/cron/run?job=reminders` (secret prod) → pesan + tombol muncul di Telegram user → tap → tercatat; hapus pengingat tes via web.
- [ ] Update DEPLOY.md (migrasi 0002 + catatan scheduler) + commit.
