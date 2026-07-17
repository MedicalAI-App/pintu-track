# Gelombang B — Bot Proaktif: Laporan Mingguan & Pengingat Tagihan

Tanggal: 2026-07-17
Status: disetujui implisit (user memerintahkan "jalankan gelombang b" atas desain yang dipresentasikan; jadwal default dipakai)

## Keputusan desain

1. **Penjadwal internal aplikasi** — kontainer berjalan 24/7 di VPS; `instrumentation.ts` menjalankan loop 60 detik yang memanggil fungsi murni `isDue()` (TDD). Tabel `job_runs(job, last_run_at)` mencegah kiriman ganda pasca-restart. Semantik due = "catch-up": job jatuh tempo bila `now ≥ jam target hari itu (WIB)` DAN `last_run < jam target hari itu` — aplikasi yang sempat mati tetap mengirim begitu hidup lagi (tidak dobel).
2. **Zona waktu**: WIB = UTC+7, offset manual (tanpa lib timezone).
3. **Jadwal default**: laporan mingguan Senin 07:00 WIB; pengingat tagihan tiap hari 07:00 WIB.
4. **Endpoint manual** `POST /api/cron/run?job=weekly|reminders` dengan header `x-cron-secret` = `TELEGRAM_WEBHOOK_SECRET` (tidak menambah env baru) — memaksa eksekusi untuk pengujian.

## Laporan mingguan (Senin 07:00 WIB)

Untuk setiap user dengan `telegram_id`: ringkasan **minggu lalu (Senin–Minggu WIB)** —
total pengeluaran, top-3 kategori (emoji + nominal), pemasukan, bersih ditabung, Saldo Utama kini, dan posisi anggaran bulan berjalan (persentase terpakai) bila diatur. Disusun oleh fungsi murni `buildWeeklyReport()` (TDD) agar format teruji.

## Pengingat tagihan

- Tabel `reminders(id, user_id, description, amount, day_of_month 1–31, active, created_at)`.
- **Via chat**: `ingatkan kos 1,5jt tiap tanggal 1` → parser terpisah `parseReminder()` (TDD; tidak mengubah semantik `parseQuickInput`). Balasan konfirmasi.
- **Via web**: section "Pengingat Tagihan" di halaman Anggaran — daftar, form tambah (keterangan, nominal, tanggal), toggle aktif, hapus. API `/api/reminders` (+`/:id`).
- **Perintah bot** `pengingat` → daftar pengingat aktif.
- Tiap hari 07:00 WIB: pengingat `active` yang jatuh tempo hari itu (WIB) dikirim ke Telegram user ber-`telegram_id` dengan **tombol inline** `✅ Bayar & catat` (`callback_data: pay:<id>`).
- **Callback** di webhook: insert `expense` (kategori **Tagihan**, description & amount dari reminder) → `answerCallbackQuery` + `editMessageText` menjadi konfirmasi tercatat (tombol hilang → tap ganda tidak dobel catat; kalaupun race, dua insert dianggap dua pembayaran — risiko diterima).
- **Clamp akhir bulan**: reminder tanggal 29–31 di bulan yang lebih pendek dikirim di hari terakhir bulan (fungsi murni `reminderMatchesToday()`, TDD).
- User tanpa `telegram_id`: pengingat tetap tersimpan, tidak ada kiriman (web-only untuk saat ini).

## Perubahan teknis

| Area | Perubahan |
|---|---|
| DB | Migrasi `drizzle/0002_wave_b.sql`: tabel `reminders` + `job_runs` (dev: + RLS pintu_app seperti tabel lain) |
| lib baru | `lib/cron.ts` (murni: isWeeklyDue, isDailyReminderDue, reminderMatchesToday, lastWeekRange, WIB helpers), `lib/report.ts` (murni: buildWeeklyReport), `lib/jobs.ts` (server: runWeeklyReports, runDailyReminders), `lib/scheduler.ts` (loop runtime) |
| lib diubah | `lib/parse.ts` + `parseReminder()`; `lib/telegram.ts` + `sendTelegramMessageWithButton`, `answerCallbackQuery`, `editMessageText` |
| Routes | `app/api/cron/run/route.ts`, `app/api/reminders/route.ts`, `app/api/reminders/[id]/route.ts`; webhook: perintah `pengingat`, `ingatkan ...`, handler `callback_query` |
| App | `instrumentation.ts` (start scheduler, hanya NEXT_RUNTIME=nodejs); section pengingat di `app/anggaran/page.tsx`; store + tipe `Reminder` |

## Verifikasi (definisi selesai)

- Unit (Vitest): cron due/clamp/rentang-minggu, parseReminder, buildWeeklyReport — gagal dulu sebelum implementasi.
- E2E lokal: buat pengingat via webhook-sim & web; `POST /api/cron/run?job=reminders` → pesan terkirim (atau tercatat terkirim); callback-sim `pay:<id>` → expense Tagihan muncul; `/api/cron/run?job=weekly` → laporan terbentuk.
- E2E produksi: migrasi 0002 → deploy → `pengingat` & `ingatkan ... tiap tanggal N` via bot asli; cron manual-trigger menghasilkan pesan Telegram nyata; scheduler hidup (cek `job_runs` terisi setelah 07:00 WIB berikutnya).

## Di luar scope

Hapus/edit pengingat via chat (kelola di web), notifikasi web push, jam kirim per-user (konstanta global dulu), Gelombang C (AI).
