# Panduan Deploy — Coolify (VPS) dari GitHub

Monorepo ini berisi dua aplikasi Next.js yang di-deploy sebagai **dua resource terpisah** di Coolify, keduanya dari repo GitHub yang sama:

| Aplikasi | Base Directory | Peran | Contoh domain |
|---|---|---|---|
| Landing page | `/pintu-track-landing` | Marketing / konversi | `pintutrack.com` |
| Aplikasi tracker | `/pintu-track-app` | Web app + API + webhook Telegram | `app.pintutrack.com` |

Keduanya sudah punya `Dockerfile` (multi-stage, Next.js standalone, port 3000).

---

## 1. Deploy Landing Page

1. Coolify → **+ New Resource** → **Public Repository** (atau *Private Repository (GitHub App)* bila repo private).
2. Tempel URL repo GitHub ini.
3. **Build Pack**: pilih **Dockerfile**.
4. **Base Directory**: `/pintu-track-landing`.
5. **Ports Exposes**: `3000`.
6. Set **Domain** (mis. `https://pintutrack.com`) → Coolify mengurus SSL Let's Encrypt otomatis.
7. **Environment Variable** (centang **Build Variable** karena dipakai saat build):

   | Nama | Nilai |
   |---|---|
   | `NEXT_PUBLIC_APP_URL` | URL aplikasi tracker, mis. `https://app.pintutrack.com` — tujuan tombol "Mulai Gratis" |

8. Deploy.

## 2. Deploy Aplikasi Tracker

Langkah sama (Base Directory `/pintu-track-app`, Build Pack Dockerfile, port 3000, domain mis. `https://app.pintutrack.com`), lalu isi **Environment Variables**:

| Nama | Nilai |
|---|---|
| `DATABASE_URL` | `postgresql://pintu_app.lmxxuvkstnfapqtuktvk:<PASSWORD_ROLE>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` — salin dari `.env.local` lokal |
| `BETTER_AUTH_SECRET` | String acak baru untuk produksi: `openssl rand -base64 32` (jangan pakai yang di `.env.local` dev) |
| `BETTER_AUTH_URL` | URL publik aplikasi, mis. `https://app.pintutrack.com` |
| `TELEGRAM_BOT_TOKEN` | (opsional) token dari @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | (opsional) string acak, mis. `openssl rand -hex 16` |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | (opsional) username bot tanpa `@` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | (opsional) untuk sinkronisasi Google Sheets — lihat §4 |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | (opsional) private key service account (`\n` literal diperbolehkan) |

> Catatan: `Dockerfile` sudah menyediakan placeholder `DATABASE_URL`/`BETTER_AUTH_SECRET` untuk fase build, jadi variabel di atas cukup sebagai **runtime variable** (tidak perlu dicentang sebagai build variable).

## 3. Aktifkan Bot Telegram (setelah aplikasi online)

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://app.pintutrack.com/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Uji: buka Profil di aplikasi → **Hubungkan Telegram** → klik tautan → kirim `Beli kopi 25rb` ke bot.

## 4. Aktifkan sinkronisasi Google Sheets (opsional)

1. [Google Cloud Console](https://console.cloud.google.com) → buat/pilih project → **APIs & Services** → aktifkan **Google Sheets API**.
2. **IAM & Admin → Service Accounts** → *Create Service Account* (tanpa role khusus) → tab **Keys** → *Add Key* → **JSON**.
3. Dari file JSON yang terunduh, salin `client_email` → env `GOOGLE_SERVICE_ACCOUNT_EMAIL`, dan `private_key` → env `GOOGLE_SERVICE_ACCOUNT_KEY` (biarkan `\n` literal apa adanya).
4. Redeploy aplikasi. Setelah itu setiap user cukup: buka **Profil** → tempel URL spreadsheet → bagikan spreadsheet tsb (akses **Editor**) ke email service account yang tampil di halaman Profil.
5. Setiap catatan baru (web maupun Telegram) otomatis ditambahkan sebagai baris: `tanggal | keterangan | kategori | jumlah`.

## 5. Auto-deploy setiap push (opsional)

- Repo **public**: aktifkan *Auto Deploy* di Coolify (polling), atau tambahkan webhook GitHub → `https://<coolify-anda>/webhooks/source/github/events` (lihat menu **Webhooks** pada resource).
- Repo **private** via GitHub App: auto-deploy aktif otomatis setiap push ke branch `main`.

## 6. Migrasi database (riwayat)

| File | Isi | Status |
|---|---|---|
| `pintu-track-app/drizzle/0000_init.sql` | Skema awal (auth + expenses + budgets) | ✅ dev & prod |
| `pintu-track-app/drizzle/0001_wave_a.sql` | Gelombang A: `expenses`→`transactions` (+type, pocket_id), tabel `pockets` | ✅ dev & prod (17 Jul 2026) |
| `pintu-track-app/drizzle/0002_wave_b.sql` | Gelombang B: tabel `reminders` + `job_runs` | ✅ dev & prod (17 Jul 2026) |
| `pintu-track-app/drizzle/0003_wave_c.sql` | Gelombang C: tabel `ai_suggestions` (tebakan AI menunggu konfirmasi) | ✅ dev & prod (18 Jul 2026) |
| `pintu-track-app/drizzle/0004_wave_d.sql` | Gelombang D: tabel `households` + `household_members` (mode keluarga) | ✅ dev & prod (18 Jul 2026) |
| `pintu-track-app/drizzle/0005_wave_e.sql` | Gelombang E: `pockets.household_id` (kantong bersama) + CHECK type `saving_topup` | ✅ dev & prod (18 Jul 2026) |

Cara terapkan di produksi: resource PostgreSQL Coolify → Terminal → Connect → `psql -U $POSTGRES_USER -d $POSTGRES_DB` → paste isi file → verifikasi `\dt`. Bagian RLS di file migrasi hanya untuk Supabase dev — jangan dipaste ke produksi. **Urutan rilis bila ada migrasi: SQL dulu, baru Deploy kode.**

Penjadwal internal (Gelombang B): laporan mingguan Senin 07:00 WIB + pengingat tagihan harian 07:00 WIB, hidup otomatis di kontainer aplikasi via `instrumentation.ts` — tanpa cron OS. Cek kesehatan: tabel `job_runs` terisi, atau log kontainer memuat `[scheduler] aktif`. Pemicu manual: `POST /api/cron/run?job=weekly|reminders` + header `x-cron-secret: <TELEGRAM_WEBHOOK_SECRET>`.

Catatan build: package-lock harus dire-generasi penuh bila `npm ci` gagal `Missing ... from lock file` (bug dedupe npm Windows), dan Dockerfile mem-pin `npm@11` di stage deps agar penanganan optional-deps per-platform konsisten dengan lockfile.

## 7. Checklist pasca-deploy

- [ ] `https://app.pintutrack.com/masuk` bisa daftar + login (cookie aman butuh HTTPS — pastikan `BETTER_AUTH_URL` persis sama dengan domain publik).
- [ ] Catat pengeluaran dari web → muncul di dasbor.
- [ ] Webhook Telegram terdaftar (`getWebhookInfo` menunjukkan URL benar).
- [ ] Tombol CTA landing mengarah ke `<NEXT_PUBLIC_APP_URL>/masuk` (variabel build sudah diisi sebelum build).
- [ ] (Bila Sheets aktif) catat pengeluaran → baris baru muncul di spreadsheet.
- [ ] (Bila Telegram + anggaran aktif) catatan web yang melewati 80%/100% batas memicu pesan peringatan dari bot.
- [ ] Supabase: proyek `PintuTrack` (`lmxxuvkstnfapqtuktvk`) tetap ACTIVE; free tier di-pause bila 7 hari tanpa aktivitas — buka dashboard untuk resume.
