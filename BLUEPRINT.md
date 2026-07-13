# Blueprint — Landing Page 3D Premium PintuTrack

> Landing page marketing untuk PintuTrack: expense tracker harian via web + bot Telegram + sinkronisasi Google Sheets.
> Pendekatan: **hybrid ringan** — satu scene 3D hero (React Three Fiber) + scroll motion (Framer Motion). Konten Bahasa Indonesia.

---

## 1. Ringkasan Konsep Utama

**Konsep besar:** *"Pintu menuju keuangan yang jelas."* Nama "Pintu" dijadikan metafora visual — scene 3D hero menampilkan sebuah portal/pintu bercahaya yang dilalui koin-koin melayang: uang yang tadinya "hilang tak tercatat" melewati pintu dan menjadi teratur. Satu ide, satu scene, dieksekusi rapi — bukan 3D di mana-mana.

**Positioning:** Expense tracker paling praktis untuk orang Indonesia yang malas buka aplikasi — cukup chat "Makan siang 30rb" ke Telegram, tercatat otomatis, tersinkron ke Google Sheets.

**Pesan utama:** "Catat pengeluaran secepat kirim chat."

**Prinsip desain:** Premium ≠ berat. Kesan mahal datang dari tipografi, spacing, motion yang halus, dan satu momen 3D yang berkesan — sambil menjaga LCP < 2.5s di HP, karena produk ini sendiri menjual "kecepatan & kepraktisan". Landing page yang lemot akan mengkhianati pesan produknya sendiri.

---

## 2. Strategi Website

| Aspek | Keputusan |
|---|---|
| Tujuan utama | Konversi: daftar akun / coba bot Telegram |
| Target audiens | Pekerja & mahasiswa Indonesia 20–35 th, mobile-first, terbiasa Telegram & spreadsheet |
| Pain point | Malas buka app pencatat yang ribet → catatan bolong → tidak tahu uang lari ke mana |
| CTA primer | "Mulai Gratis" (daftar) |
| CTA sekunder | "Lihat Cara Kerjanya" (scroll ke demo chat) |
| Storytelling | Masalah → solusi (demo chat) → bukti (fitur + dasbor) → kepercayaan (testimoni, FAQ) → aksi |
| Diferensiasi visual | Scene 3D "pintu + koin" di hero; sisanya motion 2D premium yang ringan |

## 3. Struktur Halaman (satu halaman, scroll)

1. **Navbar** — glass, logo, anchor links, CTA kecil.
2. **Hero** — scene 3D pintu + koin (kanan/latar), headline + subheadline + 2 CTA (kiri). Badge kepercayaan kecil.
3. **Masalah** — 3 kartu pain point ("Lupa nyatet", "Aplikasi ribet", "Nggak tahu uang ke mana").
4. **Demo Chat (jantung halaman)** — mockup percakapan Telegram yang mengetik sendiri saat masuk viewport: "Beli kopi 25rb" → balasan bot dengan kategori otomatis + sisa anggaran.
5. **Fitur Utama** — grid 6 kartu: Catatan Cepat, Kategori Otomatis, Dasbor Bulanan, Batas Anggaran + notifikasi, Bot Telegram, Sinkron Google Sheets.
6. **Cara Kerja** — 3 langkah: Daftar → Hubungkan Telegram → Catat & pantau.
7. **Preview Dasbor** — mockup dasbor (grafik bulanan + rincian kategori) dengan reveal animasi.
8. **Testimoni** — 3 kartu social proof.
9. **FAQ** — accordion 5–6 pertanyaan (gratis?, aman?, harus Telegram?, format chat?, Google Sheets?).
10. **CTA Penutup** — headline emosional + tombol besar, gradien aksen.
11. **Footer** — tautan, kontak, copyright.

## 4. Storytelling Scroll-Based

| Section | Emosi | Motion |
|---|---|---|
| Hero | Kagum, penasaran | Koin float + parallax mengikuti kursor; teks stagger fade-up |
| Masalah | "Ini gue banget" | Kartu reveal berurutan (stagger 0.1s) |
| Demo chat | "Wah, segampang itu?" | Bubble chat muncul berurutan seperti percakapan nyata |
| Fitur | Yakin | Grid reveal + hover lift |
| Dasbor | Terbayang hasilnya | Mockup slide-up + bar chart tumbuh |
| Testimoni/FAQ | Percaya | Fade halus |
| CTA akhir | Siap bertindak | Glow pulse lembut pada tombol |

Semua reveal pakai `whileInView` (sekali jalan, tidak berulang), durasi 0.5–0.7s, easing `easeOut`. Tidak ada scroll-jacking — scroll tetap milik pengguna.

## 5. Sistem Desain Visual

- **Tema:** gelap premium. Latar `#07090F` (biru-hitam), permukaan kartu glass `rgba(255,255,255,0.04)` + border `rgba(255,255,255,0.08)`.
- **Aksen:** emerald `#10B981` (uang, aman, positif) → gradien ke teal `#2DD4BF`. Aksen sekunder emas `#F5C242` (koin) dipakai hemat.
- **Tipografi:** Geist Sans. Display 44–64px (clamp), bold, tracking ketat; body 16–18px `rgba(255,255,255,0.65)`.
- **Spacing:** section padding-y 96–128px desktop / 64px mobile; container max-w 1152px; radius 16–24px.
- **Komponen:** tombol primer (gradien emerald, radius penuh, glow lembut saat hover), tombol ghost, kartu glass, badge pill, accordion.

## 6. Rancangan Scene 3D (Hero)

- **Objek:** kusen pintu rounded (RoundedBox) dengan bidang portal beremisi gradasi emerald; 7–9 koin (cylinder emas metalik) melayang dengan `Float` dari drei; partikel titik halus.
- **Kamera:** statis + parallax halus mengikuti pointer (lerp, maks ±3°). Tidak ada scroll-camera — sesuai keputusan hybrid ringan.
- **Lighting:** ambient rendah + 1 directional + `Environment preset="city"` untuk refleksi metalik koin.
- **Performa:** geometri primitif (tanpa GLB eksternal), `dpr={[1, 1.75]}`, antialias off di mobile, `frameloop` tetap `always` tapi scene < 50k tris. Canvas di-lazy-load (`next/dynamic`, `ssr: false`) dengan fallback gradien statis.
- **Fallback:** `prefers-reduced-motion` atau WebGL gagal → poster gradien statis + konten tetap utuh. Konten hero adalah HTML asli, bukan bagian dari canvas → SEO & aksesibilitas aman.

## 7. Strategi Konversi

- Headline benefit-first, bukan fitur-first.
- CTA "Mulai Gratis" muncul 3×: navbar, hero, penutup.
- Demo chat = *show, don't tell* — bukti kepraktisan dalam 5 detik.
- Risk reversal: "Gratis, tanpa kartu kredit" di bawah CTA.
- FAQ menjawab keberatan (keamanan data, harga, keharusan Telegram).
- Trust element: badge "🔒 Data terenkripsi & privat" + logo Telegram/Google Sheets sebagai asosiasi merek.

## 8. Teknologi

| Teknologi | Fungsi | Alasan |
|---|---|---|
| Next.js 15 (App Router) | Framework + SSG | SEO & LCP bagus (konten server-rendered); konsisten dengan tech stack aplikasi utama di PRD |
| React Three Fiber + drei | Scene 3D hero | Deklaratif, ekosistem matang; drei memberi Float/Environment siap pakai |
| Framer Motion | Scroll reveal & micro-interaction | API `whileInView` sederhana, hormati reduced-motion; lebih ringan diintegrasikan ke React daripada GSAP untuk kebutuhan ini |
| Tailwind CSS v4 | Styling | Cepat, konsisten, purge otomatis |
| TypeScript | Keandalan | Standar production |
| Vercel | Hosting | Zero-config untuk Next.js, CDN global, preview deploy |

Yang sengaja **tidak** dipakai: GSAP ScrollTrigger (berlebihan untuk kebutuhan reveal sederhana), Zustand (tidak ada state global), model GLB eksternal (menambah beban unduh).

## 9. Optimasi Performa

- Canvas 3D lazy-load setelah first paint; konten hero HTML murni → LCP = teks headline.
- `next/font` (Geist) — tanpa layout shift.
- Geometri primitif — payload three.js ± 150KB gzip hanya dimuat di klien setelah hidrasi.
- Gambar mockup = komponen HTML/CSS (bukan PNG besar).
- Target: LCP < 2.5s, CLS < 0.05, INP < 200ms (mobile mid-range).

## 10. Responsivitas & Aksesibilitas

- Mobile-first; scene 3D di mobile pindah ke latar belakang hero dengan opacity lebih rendah, DPR dibatasi.
- `prefers-reduced-motion`: semua animasi Framer Motion otomatis minimal; canvas diganti poster statis.
- Semantic HTML (`header/main/section/footer`), heading berjenjang, kontras teks ≥ 4.5:1, focus ring terlihat, target sentuh ≥ 44px, `lang="id"`.

## 11. Testing & QA (checklist pre-launch)

- [ ] Lighthouse mobile ≥ 90 (Performance, A11y, SEO)
- [ ] Uji Chrome/Firefox/Safari + Android/iOS nyata
- [ ] WebGL gagal → fallback tampil benar
- [ ] Reduced motion → tidak ada animasi besar
- [ ] Semua CTA mengarah ke tujuan benar
- [ ] Meta tags + OG image + favicon
- [ ] Keyboard navigation menyeluruh

## 12. Deployment

1. `npm run build` lolos tanpa error/warning.
2. Push ke GitHub → import ke Vercel.
3. Hubungkan domain + SSL otomatis.
4. Pasang analytics (Vercel Analytics / Umami) + Speed Insights.

## 13. Roadmap Setelah Launch

- **Bulan 1:** pasang heatmap (Microsoft Clarity, gratis), ukur scroll depth & klik CTA.
- **Bulan 2:** A/B test headline & posisi CTA; tambah section pricing bila model bisnis sudah jelas.
- **Bulan 3+:** konten SEO (blog "cara atur keuangan"), OG image dinamis, testimonial asli pengguna.
- **KPI:** conversion rate pendaftaran (target awal 3–5%), bounce rate < 55%, scroll depth ke demo chat > 60%, CWV hijau.

## 14. Urutan Eksekusi

1. ✅ Scaffold Next.js + dependensi
2. Design tokens + layout global (font, warna, metadata)
3. Navbar + Hero (HTML dulu, canvas menyusul)
4. Scene 3D hero + fallback
5. Section: Masalah → Demo Chat → Fitur → Cara Kerja → Dasbor → Testimoni → FAQ → CTA → Footer
6. Polish motion + responsif + aksesibilitas
7. Verifikasi di browser (desktop + mobile viewport) + build production
