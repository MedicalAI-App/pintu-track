# Gelombang A — Pemasukan, Saldo Berjalan & Kantong Tabungan

Tanggal: 2026-07-17
Status: disetujui user (brainstorming session)
Konteks: fitur pertama dari 3 gelombang inovasi (A: fondasi uang → B: bot proaktif → C: AI/parser cerdas). Gelombang B & C mendapat spec terpisah setelah A selesai.

## Keputusan produk (dari sesi klarifikasi)

1. Angka utama halaman depan = **saldo total berjalan** (model buku tabungan), bukan ringkasan bulanan.
2. Kantong = **transfer antar-kantong**: "Saldo Utama" + kantong-kantong; nabung memindahkan uang dari Saldo Utama ke kantong; total kekayaan tetap.
3. Arsitektur data = **ledger terpadu**: satu tabel `transactions` bertipe, satu sumber kebenaran untuk semua angka.
4. Prinsip produk yang dipertahankan: setiap aksi bisa dilakukan lewat **satu kalimat chat**; jangan pernah memblokir pencatatan.

## 1. Model data

### Migrasi (drizzle 0001)

- `ALTER TABLE expenses RENAME TO transactions` + rename index.
- Kolom baru:
  - `type text NOT NULL DEFAULT 'expense'` — nilai: `expense` | `income` | `saving_deposit` | `saving_withdrawal`; CHECK constraint.
  - `pocket_id uuid NULL REFERENCES pockets(id) ON DELETE SET NULL` — terisi hanya untuk `saving_*`.
- Tabel baru `pockets`:
  - `id uuid PK default gen_random_uuid()`
  - `user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE`
  - `name text NOT NULL` (unik per user, case-insensitive — constraint `UNIQUE(user_id, lower(name))` via index)
  - `emoji text NOT NULL DEFAULT '🎯'`
  - `target_amount integer NULL` (null = tanpa target)
  - `created_at timestamptz NOT NULL DEFAULT now()`
- Diterapkan ke **dua** database: Postgres Coolify (produksi, via terminal psql — pola yang sama dengan 0000_init) dan Supabase dev.

### Tanpa tipe khusus untuk penyesuaian

Saldo awal dan koreksi saldo dicatat sebagai `income` atau `expense` berkategori **"Penyesuaian"** (kategori baru ditambahkan ke `CATEGORIES` khusus alur ini; tidak muncul di saran kategori pengeluaran normal). Ledger tetap 4 tipe.

### Kategori pemasukan

`INCOME_CATEGORIES = ["Gaji", "Bonus", "Lainnya", "Penyesuaian"]` — disimpan di kolom `category` yang sama.

## 2. Perhitungan (lib/stats.ts diperluas)

- `saldoUtama(userId)` = Σ`income` − Σ`expense` − Σ`saving_deposit` + Σ`saving_withdrawal` (sepanjang masa; satu query `GROUP BY type` memakai index `(user_id, date)`).
- `isiKantong(pocketId)` = Σ`saving_deposit` − Σ`saving_withdrawal` per kantong (query `GROUP BY pocket_id` untuk semua kantong user sekaligus).
- Saldo Utama **boleh negatif** — tampilkan peringatan visual (angka merah + hint "catat pemasukanmu"), tidak pernah memblokir transaksi.
- **Anggaran harian/bulanan hanya menghitung `type='expense'`** — menabung tidak memakan jatah anggaran. Peringatan Telegram 80%/100% tetap berbasis expense saja.
- Penarikan kantong divalidasi: `amount ≤ isiKantong` — kalau lebih, tolak dengan pesan sisa isi (satu-satunya pengecualian prinsip "jangan blokir", karena menarik uang yang tidak ada adalah kesalahan data yang jelas).

## 3. Parser (lib/parse.ts — dipakai form web & webhook bot)

`parseQuickInput` mengembalikan `{ type, amount, description, category, pocketQuery }`:

- **income** bila teks mengandung kata kunci: `gajian, gaji, terima, dapat, masuk, bonus, thr, refund, cashback, dibayar`. Kategori: "Gaji" (gaji/gajian), "Bonus" (bonus/thr/cashback/refund), sisanya "Lainnya".
- **saving_deposit** bila diawali/mengandung `nabung|tabung|menabung`; **saving_withdrawal** bila `ambil|tarik` + konteks kantong. `pocketQuery` = sisa teks setelah kata kunci & nominal (mis. "liburan").
- Selain itu → **expense** (perilaku & regex nominal lama tidak berubah: `25000`, `25.000`, `30rb`, `1,5jt`).
- Resolusi kantong terjadi **server-side** (butuh daftar kantong user): match substring case-insensitive terhadap `pockets.name`; prioritas exact match → satu kandidat dipakai; ≥2 kandidat → minta klarifikasi; 0 kandidat → balas daftar kantong yang ada.
- **Kantong hanya dibuat lewat web** — chat tidak pernah membuat kantong baru (mencegah typo melahirkan kantong sampah).

## 4. API

| Rute | Perubahan |
|---|---|
| `/api/transactions` (+`/:id`) | Menggantikan `/api/expenses` (rename bersih — frontend kita satu-satunya konsumen). GET menerima `?months=N`, respons menyertakan `type` & `pocketId`. POST memvalidasi tipe + resolusi kantong + validasi penarikan. |
| `/api/pockets` (+`/:id`) | CRUD kantong. DELETE: isi kantong dikembalikan otomatis ke Saldo Utama (insert `saving_withdrawal` sebesar isi) lalu kantong dihapus (`pocket_id` transaksi lama menjadi NULL, riwayat ledger utuh). |
| `/api/summary` | Baru: `{ saldoUtama, pemasukanBulanIni, pengeluaranBulanIni, ditabungBulanIni, pockets: [{id, name, emoji, balance, target}] }` — satu panggilan untuk header Catat + halaman Kantong + kartu dasbor. |
| `/api/telegram` | Handler baru per tipe (lihat §6). |
| `/api/seed`, Google Sheets | Seed menambah contoh income+kantong. `lib/sheets.ts` menambah kolom `tipe` (baris: `tanggal \| tipe \| keterangan \| kategori \| jumlah`). |

## 5. Web (pintu-track-app)

- **Catat (`/`)**: kartu atas menampilkan **Saldo Utama** (angka besar; merah bila negatif) + total pengeluaran hari ini + bar anggaran harian (tetap). Preview smart-input menampilkan **chip tipe berwarna**: 🔴 Pengeluaran / 🟢 Pemasukan / 🔵 Nabung / 🟠 Tarik — dengan dropdown kategori (expense/income) atau dropdown kantong (saving). Kartu onboarding "Mulai dengan saldo awal" tampil bila saldo 0 dan belum ada `income` — satu input nominal → tercatat sebagai income "Penyesuaian" berketerangan "Saldo awal".
- **Kantong (`/kantong`, tab nav baru — nav jadi 5 tab)**: kartu per kantong (emoji, nama, isi, progress bar ke target bila ada), tombol **Nabung**/**Ambil** per kartu (input nominal inline), form **+ Kantong baru** (nama, emoji picker sederhana, target opsional), aksi hapus (dengan konfirmasi yang menjelaskan pengembalian isi ke Saldo Utama).
- **Dasbor**: dua kartu baru — "Pemasukan bulan ini" & "Ditabung bulan ini". Grafik 6 bulan & rincian kategori tetap khusus `expense`. Riwayat menampilkan ikon tipe.
- **Riwayat hari ini** di Catat menampilkan semua tipe (pemasukan hijau dengan tanda +).

## 6. Bot Telegram

| Pesan user | Balasan |
|---|---|
| `gajian 5jt` | `💰 Tercatat: +Rp5.000.000 (Gaji). Saldo Utama: Rp5.230.000` |
| `nabung 100rb liburan` | `🔵 Ditabung ke 🏖️ Liburan: Rp100.000.\n🏖️ Liburan: Rp1.300.000 / Rp5.000.000 (26%)\nSaldo Utama: Rp4.900.000` |
| `ambil 50rb liburan` | `🟠 Diambil dari 🏖️ Liburan: Rp50.000. Sisa kantong: Rp1.250.000. Saldo Utama: Rp4.950.000` |
| `kantong` | Daftar semua kantong + isi + progress |
| `saldo` / `sisa` | Diperluas: Saldo Utama + pengeluaran hari ini/bulan ini + sisa anggaran (format lama dipertahankan) |
| Penarikan melebihi isi | `⚠️ Isi 🏖️ Liburan hanya Rp1.250.000 — tidak bisa menarik Rp2.000.000.` |
| Nama kantong ambigu/tak ada | Minta klarifikasi / tampilkan daftar kantong |

Pengeluaran biasa: perilaku lama utuh (ringkasan + sisa anggaran + peringatan 80%/100%).

## 7. Edge case

- Nabung melebihi Saldo Utama → **diizinkan** (user mungkin belum catat pemasukan), balasan menyertakan peringatan saldo minus.
- Dua kantong bernama mirip ("Liburan", "Liburan Bali") → exact match menang; selain itu minta klarifikasi.
- Edit transaksi `saving_*` di web: nominal boleh diubah; validasi ulang penarikan terhadap isi kantong.
- `pocket_id` menjadi NULL saat kantong dihapus → transaksi tampil sebagai "(kantong terhapus)" di riwayat.
- Migrasi mengubah nama tabel: kode & tipe `Expense` di-rename `Transaction` menyeluruh (lib/types, store, komponen).

## 8. Rollout & verifikasi

1. Terapkan migrasi 0001 di Supabase dev → uji lokal end-to-end (localhost:3001).
2. Commit + push → terapkan migrasi di psql Coolify → redeploy produksi.
3. Checklist E2E produksi: catat `gajian 5jt` via bot → saldo berubah di web; buat kantong di web → `nabung 100rb <kantong>` via bot → progress benar; `ambil` melebihi isi → ditolak; baris Sheets memuat kolom tipe; anggaran tetap hanya menghitung expense.

## Di luar scope Gelombang A

Laporan mingguan & pengingat tagihan (Gelombang B), parser AI/foto struk + provider gratisan (Gelombang C — catatan awal: "Ollama" bukan API cloud gratis; kandidat realistis adalah free tier Gemini/Groq atau Ollama self-host bila RAM VPS cukup — akan dianalisis di spec C), mode keluarga (diparkir).
