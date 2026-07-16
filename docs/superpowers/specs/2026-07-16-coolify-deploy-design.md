# Desain Deploy PintuTrack ke Coolify + Domain pintutrack.online

Tanggal: 2026-07-16 (revisi: database pindah ke Postgres Coolify)
Status: disetujui user (brainstorming session)

## Konteks & keputusan

- VPS + Coolify: **sudah terpasang dan berjalan** (milik user).
- Domain: **pintutrack.online**, DNS dikelola di **Hostinger** (tidak beli domain baru).
- Struktur: root untuk landing, `app.` untuk aplikasi.
- Database produksi: **PostgreSQL 17 sebagai resource Coolify di VPS yang sama** (bukan Supabase), mulai dengan skema bersih tanpa migrasi data.
- Supabase (proyek `lmxxuvkstnfapqtuktvk`) **dipertahankan sebagai database development** — dev di laptop tetap memakai `.env.local` yang ada; produksi memakai Postgres Coolify.
- Cakupan: dua aplikasi online ber-SSL **+ bot Telegram aktif + sinkronisasi Google Sheets aktif**.
- Repo: `MedicalAI-App/pintu-track` (monorepo, private).
- Perubahan kode minimal: generate + commit file migrasi SQL drizzle (`drizzle/`). Selebihnya konfigurasi.

## 1. Arsitektur & DNS

```
pintutrack.online          (A @   → IP VPS) → Coolify → kontainer landing
app.pintutrack.online      (A app → IP VPS) → Coolify → kontainer aplikasi
                                                  └→ PostgreSQL 17 (resource Coolify,
                                                     jaringan internal Docker, tanpa port publik)
Telegram ─webhook→ https://app.pintutrack.online/api/telegram
Aplikasi ─append→  Google Sheets user (service account)
```

- Dua record A di hPanel Hostinger (zona DNS pintutrack.online): `@` dan `app`, keduanya → IP VPS, TTL default.
- SSL Let's Encrypt otomatis oleh Coolify saat domain diisi di resource. Prasyarat: port 80/443 terbuka, DNS sudah propagasi.
- Database hanya bisa diakses dari jaringan internal Docker VPS — tidak diekspos ke internet.

## 2. Resource database: PostgreSQL di Coolify

1. Coolify → project yang sama → **Add Resource → Database → PostgreSQL** (versi 17 bila tersedia). Coolify men-generate user/password/nama DB + **internal URL**.
2. Jangan aktifkan "Make it publicly available" (tidak dibutuhkan; skema diterapkan lewat terminal bawaan).
3. **Terapkan skema** (sekali): buka terminal psql resource DB di Coolify → paste isi file migrasi `pintu-track-app/drizzle/0000_init.sql` (di-generate dari `lib/db/schema.ts` dengan `drizzle-kit generate`, di-commit ke repo).
   - Tanpa RLS dan tanpa role `pintu_app` — itu mitigasi khusus Supabase (yang punya API PostgREST publik); tidak relevan di VPS.
4. **Backup**: aktifkan *Scheduled Backup* harian di resource DB (retensi lokal; opsional push ke S3). Ini menggantikan backup otomatis Supabase — kini tanggung jawab sendiri.

## 3. Resource Coolify (2 aplikasi, 1 repo)

Sumber: GitHub App Coolify → `MedicalAI-App/pintu-track` (private), branch `main`, build pack **Dockerfile**.

| | Landing | Aplikasi |
|---|---|---|
| Base directory | `/pintu-track-landing` | `/pintu-track-app` |
| Dockerfile | `/pintu-track-landing/Dockerfile` | `/pintu-track-app/Dockerfile` |
| Domain | `https://pintutrack.online` | `https://app.pintutrack.online` |
| Port expose | 3000 | 3000 |

Aplikasi harus satu jaringan Docker dengan DB — bila tidak otomatis, aktifkan **"Connect to Predefined Network"** pada resource aplikasi.

### Env landing

| Var | Nilai | Catatan |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://app.pintutrack.online` | **Centang "Build Variable"** — dikonsumsi saat build (Dockerfile sudah ber-ARG) |

### Env aplikasi (semua runtime; tidak ada yang perlu build variable)

| Var | Nilai |
|---|---|
| `DATABASE_URL` | Internal URL dari resource DB Coolify, format `postgres://<user>:<pass>@<host-internal>:5432/<db>` |
| `BETTER_AUTH_URL` | `https://app.pintutrack.online` |
| `BETTER_AUTH_SECRET` | **Generate baru untuk produksi**: `openssl rand -base64 32` (jangan pakai secret dev) |
| `TELEGRAM_BOT_TOKEN` | Dari @BotFather (langkah §4) |
| `TELEGRAM_WEBHOOK_SECRET` | String acak baru: `openssl rand -hex 16` |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Username bot tanpa `@` (dibaca server-side saja → runtime env cukup) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` dari key JSON service account (langkah §5) |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | `private_key` dari key JSON (boleh `\n` literal satu baris) |

Catatan kode: `lib/db/index.ts` memakai `postgres(url, { prepare: false })` — aman juga untuk koneksi langsung tanpa pooler; tidak perlu diubah.

## 4. Bot Telegram

1. @BotFather → `/newbot` → nama "PintuTrack", username mis. `PintuTrackBot` → simpan token.
2. Isi tiga env Telegram di resource aplikasi → redeploy.
3. Daftarkan webhook (sekali, setelah aplikasi live ber-SSL):
   ```
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://app.pintutrack.online/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```
4. Verifikasi: `getWebhookInfo` menunjukkan URL benar & `last_error_message` kosong.

## 5. Google Sheets (service account)

1. Google Cloud Console → project baru/eksisting → aktifkan **Google Sheets API**.
2. IAM & Admin → Service Accounts → buat (tanpa role) → Keys → Add Key → JSON.
3. Salin `client_email` & `private_key` ke env aplikasi → redeploy.
4. Per user: halaman Profil aplikasi menampilkan email service account; user menempel URL spreadsheet-nya dan membagikan sheet (akses **Editor**) ke email tersebut. Baris yang ditulis: `tanggal | keterangan | kategori | jumlah`.

## 6. Urutan eksekusi

1. (Kode, sekali) Generate file migrasi: `npx drizzle-kit generate` di `pintu-track-app` → commit folder `drizzle/` → push.
2. DNS di Hostinger (`@` dan `app` → IP VPS).
3. Resource **PostgreSQL** di Coolify → terapkan skema via terminal psql → aktifkan backup harian.
4. Resource landing → deploy → `https://pintutrack.online` hijau.
5. Resource aplikasi (env DB + auth dulu saja) → deploy → daftar akun uji, catat pengeluaran via web.
6. BotFather → env Telegram → redeploy → setWebhook → uji tautkan akun + catat via chat.
7. Google service account → env Google → redeploy → uji: tempel URL sheet + share ke SA → catat → baris muncul.
8. (Opsional) Auto-deploy per push: webhook GitHub dari resource Coolify.

## Pembagian kerja

- **User**: semua tindakan di dashboard eksternal — Hostinger DNS, Coolify UI (DB, dua aplikasi, backup), @BotFather, Google Cloud Console. (Alternatif: dipandu Claude langsung via Chrome user.)
- **Claude**: generate + commit migrasi drizzle, menyiapkan nilai env siap salin-tempel, perintah curl webhook jadi, checklist verifikasi, dan pendampingan debug (log Coolify, query psql) selama proses.

## Verifikasi akhir (definisi selesai)

- [ ] `https://pintutrack.online` tampil dengan SSL; tombol "Mulai Gratis" → `https://app.pintutrack.online/masuk`.
- [ ] Daftar akun produksi baru → login → catat "Makan siang 30rb" via web → muncul di riwayat & dasbor (data tersimpan di Postgres Coolify, bukan Supabase).
- [ ] Tautkan Telegram dari Profil → `/start <kode>` → bot balas "Berhasil terhubung".
- [ ] Kirim "Beli kopi 25rb" ke bot → balasan ringkasan + tercatat di web.
- [ ] Lewat 80% batas harian via web → bot mengirim peringatan.
- [ ] URL sheet terpasang + sheet dibagikan ke SA → catatan baru muncul sebagai baris di spreadsheet.
- [ ] Backup harian pertama resource DB sukses (cek menu backup Coolify keesokan hari).
- [ ] Push dummy ke `main` → Coolify auto-redeploy (bila diaktifkan).

## Risiko & mitigasi

- **Let's Encrypt gagal**: biasanya DNS belum propagasi — cek `nslookup pintutrack.online` dulu; ulangi issue cert dari Coolify.
- **Aplikasi tidak bisa mencapai DB** (`ECONNREFUSED`/`getaddrinfo`): resource aplikasi & DB beda jaringan Docker — aktifkan "Connect to Predefined Network" dan pakai hostname internal persis dari halaman resource DB.
- **Cookie login tidak tersimpan**: `BETTER_AUTH_URL` harus persis `https://app.pintutrack.online` (skema + host, tanpa trailing slash).
- **Webhook Telegram 401**: `secret_token` di setWebhook harus sama persis dengan env `TELEGRAM_WEBHOOK_SECRET`.
- **Sheets 403**: sheet belum dibagikan ke email SA, atau Sheets API belum diaktifkan di project Google.
- **Kehilangan data**: backup kini tanggung jawab sendiri — pastikan scheduled backup aktif dan sesekali uji restore.
