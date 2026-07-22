# Gelombang E — Kantong 2.0: Bersama, Top-up Luar, Transfer

Tanggal: 2026-07-18
Status: diperintahkan user ("buat agar mode keluarga juga bisa saling share kantong tabungan, setiap kantong bisa ditambah nominal bukan hanya dari saldo utama, dan transfer antar kantong"); detail desain = keputusan asisten mengikuti pola ledger.

## 1. Top-up dari luar (`saving_topup`)

- Tipe ledger ke-5. Efek: kantong **+X**, Saldo Utama **tidak berubah** (SIGN 0), "Ditabung bulan ini" **+X**. Makna: uang masuk ke tabungan dari luar sistem (hadiah, cash).
- Chat: `topup <kantong> 100rb` atau `isi <kantong> 100rb` (juga urutan nominal dulu). Web: tombol **Top-up** di kartu kantong.
- Tanpa validasi saldo (bukan dari Saldo Utama). Label: "Top-up".

## 2. Transfer antar kantong

- **Bukan tipe baru**: pasangan atomik `saving_withdrawal`(asal) + `saving_deposit`(tujuan) dalam satu `db.transaction`. Saldo Utama net 0; kantong asal −X; tujuan +X; "Ditabung bulan ini" net 0.
- Deskripsi baris: `Transfer: <Asal> → <Tujuan>` (kedua baris).
- Validasi: saldo kantong asal ≥ X; asal ≠ tujuan; kedua kantong terlihat oleh user.
- API: `POST /api/pockets/transfer { fromPocketId, toPocketId, amount }`.
- Chat: `transfer 50rb dari <asal> ke <tujuan>` / `pindah ...` — parser terpisah `parseTransfer()` (TDD); resolusi nama kantong asal & tujuan server-side (ambigu/tak ketemu → balasan daftar).
- Web: tombol **Transfer** di kartu kantong (pilih tujuan + nominal inline).

## 3. Kantong bersama keluarga

- Migrasi 0005: `pockets.household_id uuid NULL REFERENCES households(id) ON DELETE SET NULL` + perluas CHECK `transactions.type` (+`saving_topup`).
- Buat: toggle "Kantong bersama keluarga" di form (hanya tampil bila tergabung rumah) → `householdId` terisi; pembuat tetap tercatat di `user_id`.
- **Visibilitas**: kantong terlihat = milik sendiri ∪ kantong ber-`household_id` = rumahku. Berlaku untuk /kantong, dropdown Catat, resolusi chat, dan summary.
- **Saldo kantong bersama** = Σ transaksi SEMUA kontributor pada pocket itu (query by pocketId, bukan by userId). Validasi tarik memakai saldo gabungan ini.
- Nabung ke kantong bersama tetap memotong Saldo Utama penyetor (transaksi milik penyetor) — adil dan tanpa perubahan ledger.
- **Hapus**: kantong bersama hanya oleh pembuat DAN hanya saat saldo 0 (anggota tarik dulu bagiannya) → 409 selain itu. Kantong pribadi: perilaku lama (isi dikembalikan otomatis).
- **Rumah bubar** → `household_id` menjadi NULL (kantong jadi pribadi pembuat; kontribusi anggota lain tetap di dalamnya — didokumentasikan di dialog keluar rumah). Anggota keluar (rumah masih ada) → kehilangan akses; transaksinya tetap tercatat atas dirinya.
- Otorisasi POST transaksi ber-`pocketId` kini divalidasi visibilitas (lubang lama: pocketId asing diterima — ditutup di gelombang ini).

## Perubahan teknis

| Area | Perubahan |
|---|---|
| `lib/types.ts` | `TRANSACTION_TYPES` + `saving_topup`; `TYPE_LABEL` "Top-up"; `Pocket.shared`, `Pocket.ownerName` |
| `lib/ledger.ts` | SIGN topup=0; pocketBalances topup +; monthlySummary saved += topup (TDD) |
| `lib/parse.ts` | grammar topup/isi (type saving_topup); `parseTransfer()` baru (TDD) |
| Migrasi | `drizzle/0005_wave_e.sql` |
| `lib/stats.ts` | `visiblePockets(userId)`, saldo shared-aware (query by pocketId), resolvePocket pakai visible set, `pocketBalance` shared-aware |
| Routes | transactions POST (topup + validasi visibilitas pocket), `pockets/transfer`, pockets POST {shared} / DELETE aturan baru, summary menyertakan shared/ownerName |
| Webhook | handler topup (tanpa cek saldo) + transfer (parseTransfer, sebelum parseQuickInput) |
| UI /kantong | toggle bersama di form, badge 👨‍👩‍👧, tombol Top-up & Transfer, teks pemilik |
| Catat page | chip tipe + dropdown menyertakan topup; kantong bersama muncul di dropdown |

## Verifikasi (definisi selesai)

- Unit (gagal dulu): ledger topup (saldo tetap, kantong naik, saved naik), parser topup/isi & transfer (dari/ke, alias pindah, tanpa "dari").
- E2E lokal 2 akun: buat kantong bersama (A) → B melihat & nabung → saldo gabungan benar & Saldo Utama B berkurang → topup oleh B (saldo utama B TETAP, kantong naik) → transfer kantong bersama → pribadi (validasi + atomik) → tarik melebihi gabungan ditolak → hapus kantong bersama saat saldo>0 → 409; saldo 0 → sukses; akun luar tak melihat kantong bersama (resolusi & API) → bot: `topup ...`, `transfer ... dari ... ke ...`.
- E2E prod: migrasi 0005 → deploy → alur singkat di akun uji.

## Di luar scope

Rincian kontribusi per anggota di kantong bersama (v2), transfer lintas rumah, notifikasi anggota saat kantong bersama berubah.
