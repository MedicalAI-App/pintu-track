# PintuTrack

Expense tracker harian yang praktis: catat lewat web atau chat bot Telegram, kategori otomatis, anggaran terpantau, data di PostgreSQL (Supabase).

> **Catat pengeluaran secepat kirim chat.**

## Struktur monorepo

| Folder | Deskripsi | Stack |
|---|---|---|
| [`pintu-track-landing/`](pintu-track-landing) | Landing page marketing 3D | Next.js 16, React Three Fiber, Framer Motion, Tailwind v4 |
| [`pintu-track-app/`](pintu-track-app) | Aplikasi tracker (web + API + webhook Telegram) | Next.js 16, Drizzle ORM, PostgreSQL (Supabase), Better Auth |
| [`BLUEPRINT.md`](BLUEPRINT.md) | Rancangan strategi & desain landing page | — |
| [`DEPLOY.md`](DEPLOY.md) | Panduan deploy ke Coolify (VPS) | — |

## Menjalankan secara lokal

```bash
# Landing page → http://localhost:3000
cd pintu-track-landing && npm install && npm run dev

# Aplikasi → http://localhost:3001
cd pintu-track-app && npm install
cp .env.example .env.local   # isi DATABASE_URL & BETTER_AUTH_SECRET
npm run dev -- -p 3001
```

## Fitur aplikasi

- **Catatan Cepat** — ketik `Makan siang 30rb`, nominal & kategori terdeteksi otomatis (mendukung `25000`, `25.000`, `25rb`, `1,5jt`).
- **Dasbor** — total & rata-rata bulan berjalan, grafik 6 bulan, rincian kategori.
- **Anggaran** — batas harian/bulanan dengan indikator 80% dan lewat batas.
- **Bot Telegram** — tautkan akun sekali, lalu catat dan cek sisa anggaran dari chat.
- **Akun** — email/password (Better Auth), data privat per user.
