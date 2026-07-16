# Desain Deploy PintuTrack ke Coolify + Domain pintutrack.online

Tanggal: 2026-07-16
Status: disetujui user (brainstorming session)

## Konteks & keputusan

- VPS + Coolify: **sudah terpasang dan berjalan** (milik user).
- Domain: **pintutrack.online**, DNS dikelola di **Hostinger** (tidak beli domain baru).
- Struktur: root untuk landing, `app.` untuk aplikasi.
- Cakupan: dua aplikasi online ber-SSL **+ bot Telegram aktif + sinkronisasi Google Sheets aktif**.
- Repo: `MedicalAI-App/pintu-track` (monorepo, private) — commit `8320822`.
- Database: Supabase Postgres proyek "PintuTrack" (`lmxxuvkstnfapqtuktvk`, ap-southeast-1) — sudah bermigrasi & teruji; koneksi via role `pintu_app` lewat pooler `aws-0-ap-southeast-1.pooler.supabase.com:6543`.
- Tidak ada perubahan kode; seluruh pekerjaan adalah konfigurasi.

## 1. Arsitektur & DNS

```
pintutrack.online          (A @   → IP VPS) → Coolify → kontainer landing
app.pintutrack.online      (A app → IP VPS) → Coolify → kontainer aplikasi
                                                   └→ Supabase Postgres (ap-southeast-1)
Telegram ─webhook→ https://app.pintutrack.online/api/telegram
Aplikasi ─append→  Google Sheets user (service account)
```

- Dua record A di hPanel Hostinger (zona DNS pintutrack.online): `@` dan `app`, keduanya → IP VPS, TTL default.
- SSL Let's Encrypt otomatis oleh Coolify saat domain diisi di resource. Prasyarat: port 80/443 terbuka, DNS sudah propagasi.

## 2. Resource Coolify (2 aplikasi, 1 repo)

Sumber: GitHub App Coolify → `MedicalAI-App/pintu-track` (private), branch `main`, build pack **Dockerfile**.

| | Landing | Aplikasi |
|---|---|---|
| Base directory | `/pintu-track-landing` | `/pintu-track-app` |
| Dockerfile | `/pintu-track-landing/Dockerfile` | `/pintu-track-app/Dockerfile` |
| Domain | `https://pintutrack.online` | `https://app.pintutrack.online` |
| Port expose | 3000 | 3000 |

### Env landing

| Var | Nilai | Catatan |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://app.pintutrack.online` | **Centang "Build Variable"** — dikonsumsi saat build (Dockerfile sudah ber-ARG) |

### Env aplikasi (semua runtime; tidak ada yang perlu build variable)

| Var | Nilai |
|---|---|
| `DATABASE_URL` | `postgresql://pintu_app.lmxxuvkstnfapqtuktvk:<password pintu_app>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` (sama dengan `.env.local` dev) |
| `BETTER_AUTH_URL` | `https://app.pintutrack.online` |
| `BETTER_AUTH_SECRET` | **Generate baru untuk produksi**: `openssl rand -base64 32` (jangan pakai secret dev) |
| `TELEGRAM_BOT_TOKEN` | Dari @BotFather (langkah §3) |
| `TELEGRAM_WEBHOOK_SECRET` | String acak baru: `openssl rand -hex 16` |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Username bot tanpa `@` (dibaca server-side saja → runtime env cukup) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `client_email` dari key JSON service account (langkah §4) |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | `private_key` dari key JSON (boleh `\n` literal satu baris) |

## 3. Bot Telegram

1. @BotFather → `/newbot` → nama "PintuTrack", username mis. `PintuTrackBot` → simpan token.
2. Isi tiga env Telegram di resource aplikasi → redeploy.
3. Daftarkan webhook (sekali, setelah aplikasi live ber-SSL):
   ```
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://app.pintutrack.online/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
   ```
4. Verifikasi: `getWebhookInfo` menunjukkan URL benar & `last_error_message` kosong.

## 4. Google Sheets (service account)

1. Google Cloud Console → project baru/eksisting → aktifkan **Google Sheets API**.
2. IAM & Admin → Service Accounts → buat (tanpa role) → Keys → Add Key → JSON.
3. Salin `client_email` & `private_key` ke env aplikasi → redeploy.
4. Per user: halaman Profil aplikasi menampilkan email service account; user menempel URL spreadsheet-nya dan membagikan sheet (akses **Editor**) ke email tersebut. Baris yang ditulis: `tanggal | keterangan | kategori | jumlah`.

## 5. Urutan eksekusi

1. DNS di Hostinger (`@` dan `app` → IP VPS).
2. Resource landing di Coolify → deploy → `https://pintutrack.online` hijau.
3. Resource aplikasi di Coolify (env DB + auth dulu saja) → deploy → daftar akun uji, catat pengeluaran via web.
4. BotFather → env Telegram → redeploy → setWebhook → uji tautkan akun + catat via chat.
5. Google service account → env Google → redeploy → uji: tempel URL sheet + share ke SA → catat → baris muncul.
6. (Opsional) Aktifkan auto-deploy per push: webhook GitHub dari resource Coolify.

## Pembagian kerja

- **User**: semua tindakan di dashboard eksternal — Hostinger DNS, Coolify UI, @BotFather, Google Cloud Console. (Alternatif: dipandu Claude langsung via Chrome user.)
- **Claude**: menyiapkan nilai env siap salin-tempel, perintah curl webhook jadi, checklist verifikasi, dan pendampingan debug (log Coolify/preview, query Supabase) selama proses.

## Verifikasi akhir (definisi selesai)

- [ ] `https://pintutrack.online` tampil dengan SSL; tombol "Mulai Gratis" → `https://app.pintutrack.online/masuk`.
- [ ] Daftar akun produksi baru → login → catat "Makan siang 30rb" via web → muncul di riwayat & dasbor.
- [ ] Tautkan Telegram dari Profil → `/start <kode>` → bot balas "Berhasil terhubung".
- [ ] Kirim "Beli kopi 25rb" ke bot → balasan ringkasan + tercatat di web.
- [ ] Lewat 80% batas harian via web → bot mengirim peringatan.
- [ ] URL sheet terpasang + sheet dibagikan ke SA → catatan baru muncul sebagai baris di spreadsheet.
- [ ] Push dummy ke `main` → Coolify auto-redeploy (bila diaktifkan).

## Risiko & mitigasi

- **Let's Encrypt gagal**: biasanya DNS belum propagasi — cek `nslookup pintutrack.online` dulu; ulangi issue cert dari Coolify.
- **Supavisor "tenant/user not found"**: pastikan hostname pooler `aws-0` (bukan `aws-1`) — sudah terdokumentasi di `.env.example`.
- **Cookie login tidak tersimpan**: `BETTER_AUTH_URL` harus persis `https://app.pintutrack.online` (skema + host, tanpa trailing slash).
- **Webhook Telegram 401**: `secret_token` di setWebhook harus sama persis dengan env `TELEGRAM_WEBHOOK_SECRET`.
- **Sheets 403**: sheet belum dibagikan ke email SA, atau Sheets API belum diaktifkan di project Google.
