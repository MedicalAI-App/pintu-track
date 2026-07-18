# Gelombang D — Mode Keluarga

Tanggal: 2026-07-18
Status: disetujui user (privasi: detail penuh; scope: dasbor gabungan + bot; penempatan: Profil + section Dasbor)

## Prinsip

Keluarga = **lapisan agregasi aditif** di atas ledger yang ada. Tabel `transactions`, `pockets`, `budgets`, `reminders` TIDAK berubah — transaksi tetap milik akun masing-masing. Menghapus rumah tidak menghapus data siapa pun.

## Keputusan

1. **Privasi: detail penuh** — sesama anggota rumah dapat melihat daftar transaksi lengkap anggota lain (bukan hanya ringkasan).
2. **Satu rumah per akun** (v1) — ditegakkan unique index di `household_members.user_id`.
3. **Kode undangan** 6 karakter (A–Z, 2–9, tanpa karakter ambigu O/0/I/1), bisa dilihat semua anggota, tanpa rotasi (v1).
4. **Keluar rumah** = hapus keanggotaan; anggota terakhir keluar → rumah terhapus. Tidak ada peran khusus selain pencatat `created_by` (v1 tanpa kick/transfer).
5. Anggaran keluarga & kantong bersama: di luar scope (v2).

## Skema (migrasi 0004)

```sql
CREATE TABLE "households" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "invite_code" text NOT NULL UNIQUE,
  "created_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE "household_members" (
  "household_id" uuid NOT NULL REFERENCES "households"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "joined_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("household_id","user_id")
);
CREATE UNIQUE INDEX "household_members_user_idx" ON "household_members"("user_id");
```

## Modul murni (TDD)

- `lib/household.ts`: `generateInviteCode(rand?)` (6 char dari alfabet aman, RNG bisa diinjeksi untuk tes); `familySummary(members: {name: string; rows: LedgerRow[]}[], now?) → { perMember: {name, expense, income, saved}[], total: {expense, income, saved} }` (pakai `monthlySummary` per anggota, urut expense desc); `buildFamilyReport(name, summary) → string` untuk bot (format rupiah id-ID).

## API

| Rute | Perilaku |
|---|---|
| `GET /api/household` | `{ household: null }` bila belum tergabung; selain itu `{ household: { id, name, inviteCode, members: [{ userId, name, expenseMonth, incomeMonth, savedMonth }], total } }` |
| `POST /api/household` `{name}` | Buat rumah + auto-join pembuat. 409 bila sudah tergabung di rumah lain. Kode di-generate dengan retry saat tabrakan unique. |
| `POST /api/household/join` `{code}` | Gabung via kode (case-insensitive). 404 kode salah; 409 sudah tergabung. |
| `POST /api/household/leave` | Keluar; anggota terakhir → rumah dihapus. |
| `GET /api/household/members/[id]/transactions?months=1` | Detail transaksi anggota lain — **hanya bila requester dan target satu rumah** (403 selain itu). Respons sama bentuk dengan `/api/transactions`. |

## Web

- **Profil — section "Keluarga"**: belum tergabung → dua kartu (form "Buat rumah" nama; form "Gabung" kode). Tergabung → nama rumah, kode undangan besar (mudah disalin) + daftar anggota + tombol "Keluar dari rumah" (confirm; jelaskan data pribadi tidak terhapus).
- **Dasbor — section "Keluarga: <nama>"** (hanya bila tergabung): baris total keluarga bulan ini (pengeluaran/pemasukan/ditabung), kartu per anggota (nama + 3 angka) yang bisa **diperluas** untuk memuat daftar transaksi bulan berjalan anggota tsb (fetch saat expand, tampilan baca-saja).
- Store: `household` ikut `refresh()`; `createHousehold`, `joinHousehold`, `leaveHousehold`, `fetchMemberTransactions(userId)`.

## Bot

Perintah `keluarga` → bila belum tergabung: ajakan + cara gabung di web. Bila tergabung: `buildFamilyReport` — total keluarga bulan ini + baris per anggota (pengeluaran, pemasukan), diurutkan pengeluaran terbesar.

## Verifikasi (definisi selesai)

- Unit: generateInviteCode (panjang, alfabet aman, deterministik dgn RNG injeksi), familySummary (agregasi + urutan), buildFamilyReport (format) — gagal dulu.
- E2E lokal dua akun: buat rumah (akun A) → gabung via kode (akun B) → GET household menampilkan 2 anggota dgn angka benar → detail transaksi B terbaca oleh A (dan 403 untuk akun luar) → perintah `keluarga` di bot → B keluar → A keluar → rumah lenyap.
- E2E prod: migrasi 0004 → deploy → user membuat rumah nyata dari Profil.

## Di luar scope

Anggaran keluarga, kantong bersama, kick/transfer-kepemilikan, rotasi kode, >1 rumah per akun, laporan mingguan versi keluarga.
