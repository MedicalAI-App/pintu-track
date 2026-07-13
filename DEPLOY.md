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
7. Deploy.

Tanpa environment variable apa pun.

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

> Catatan: `Dockerfile` sudah menyediakan placeholder `DATABASE_URL`/`BETTER_AUTH_SECRET` untuk fase build, jadi variabel di atas cukup sebagai **runtime variable** (tidak perlu dicentang sebagai build variable).

## 3. Aktifkan Bot Telegram (setelah aplikasi online)

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://app.pintutrack.com/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Uji: buka Profil di aplikasi → **Hubungkan Telegram** → klik tautan → kirim `Beli kopi 25rb` ke bot.

## 4. Auto-deploy setiap push (opsional)

- Repo **public**: aktifkan *Auto Deploy* di Coolify (polling), atau tambahkan webhook GitHub → `https://<coolify-anda>/webhooks/source/github/events` (lihat menu **Webhooks** pada resource).
- Repo **private** via GitHub App: auto-deploy aktif otomatis setiap push ke branch `main`.

## 5. Checklist pasca-deploy

- [ ] `https://app.pintutrack.com/masuk` bisa daftar + login (cookie aman butuh HTTPS — pastikan `BETTER_AUTH_URL` persis sama dengan domain publik).
- [ ] Catat pengeluaran dari web → muncul di dasbor.
- [ ] Webhook Telegram terdaftar (`getWebhookInfo` menunjukkan URL benar).
- [ ] Landing page mengarah ke `https://app.pintutrack.com/masuk` pada tombol CTA (sesuaikan bila domain sudah final).
- [ ] Supabase: proyek `PintuTrack` (`lmxxuvkstnfapqtuktvk`) tetap ACTIVE; free tier di-pause bila 7 hari tanpa aktivitas — buka dashboard untuk resume.
