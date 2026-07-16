# Gelombang A — Pemasukan, Saldo Berjalan & Kantong Tabungan: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan pemasukan, Saldo Utama berjalan, dan kantong tabungan (model transfer) ke PintuTrack di atas ledger terpadu, dengan TDD (Vitest) untuk seluruh logika murni.

**Architecture:** Tabel `expenses` di-rename `transactions` + kolom `type`/`pocket_id`; tabel baru `pockets`. Semua angka dihitung dari fungsi murni `lib/ledger.ts` (unit-tested). Parser `lib/parse.ts` diperluas untuk income/nabung/ambil. Route API baru tipis di atas ledger; web mendapat header Saldo Utama, halaman `/kantong`, dan chip tipe.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM + postgres.js, Better Auth, Vitest (baru), Tailwind v4.

## Global Constraints

- Semua copy UI Bahasa Indonesia; format uang `formatRupiah` (lib/format.ts).
- Amount selalu integer rupiah > 0; tipe transaksi hanya: `expense`, `income`, `saving_deposit`, `saving_withdrawal`.
- Saldo Utama boleh negatif — jangan pernah memblokir pencatatan, KECUALI penarikan kantong melebihi isi (ditolak 400).
- Anggaran (BudgetBar, peringatan Telegram 80%/100%) hanya menghitung `type='expense'`.
- Kantong hanya dibuat via web; chat tidak membuat kantong.
- Dev DB = Supabase (`.env.local`); produksi = Postgres Coolify. Migrasi diterapkan manual (psql/MCP), file SQL di `pintu-track-app/drizzle/` (drizzle meta journal TIDAK diupdate — kita apply manual, drizzle-kit generate interaktif untuk rename).
- Direktori kerja semua perintah: `pintu-track-app/`.
- Setiap commit diakhiri `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Setup Vitest

**Files:**
- Modify: `pintu-track-app/package.json` (script test)
- Create: `pintu-track-app/vitest.config.ts`
- Test: `pintu-track-app/tests/smoke.test.ts`

**Interfaces:**
- Produces: perintah `npm test` (vitest run) dengan alias `@/` berfungsi — dipakai semua task berikutnya.

- [ ] **Step 1: Install**

```bash
npm install -D vitest @vitest/coverage-v8
```

- [ ] **Step 2: Konfigurasi**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});
```

Tambahkan ke `package.json` scripts: `"test": "vitest run", "test:watch": "vitest"`.

- [ ] **Step 3: Smoke test — tulis dan lihat lulus**

`tests/smoke.test.ts`:
```ts
import { expect, test } from "vitest";
import { formatRupiah } from "@/lib/format";

test("alias @ dan vitest berfungsi", () => {
  expect(formatRupiah(15000)).toContain("15.000");
});
```

Run: `npm test` → Expected: 1 passed. (Smoke test config boleh langsung hijau — ini bukan fitur.)

- [ ] **Step 4: Commit**

```bash
git add -A pintu-track-app/package.json pintu-track-app/package-lock.json pintu-track-app/vitest.config.ts pintu-track-app/tests
git commit -m "test: pasang Vitest + smoke test"
```

---

### Task 2: Tipe transaksi & perluasan parser (TDD)

**Files:**
- Modify: `pintu-track-app/lib/types.ts`
- Modify: `pintu-track-app/lib/parse.ts`
- Test: `pintu-track-app/tests/parse.test.ts`

**Interfaces:**
- Produces (dipakai Task 3–10):
```ts
// lib/types.ts
export const TRANSACTION_TYPES = ["expense","income","saving_deposit","saving_withdrawal"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];
export const INCOME_CATEGORIES = ["Gaji","Bonus","Lainnya","Penyesuaian"] as const;
export const ADJUSTMENT_CATEGORY = "Penyesuaian";
export type Transaction = { id: string; type: TransactionType; amount: number; description: string; category: string; pocketId: string | null; date: string };
export type Pocket = { id: string; name: string; emoji: string; targetAmount: number | null; balance: number };
// lib/parse.ts
export type ParsedInput = { type: TransactionType; amount: number | null; description: string; category: string; pocketQuery: string | null };
export function parseQuickInput(raw: string): ParsedInput;
```
- `Expense`/`CATEGORIES`/`CATEGORY_EMOJI`/`guessCategory` lama tetap ada (dipakai UI) — `Expense` di-alias: `export type Expense = Transaction` sementara sampai Task 8 me-rename pemakainya.

- [ ] **Step 1: Tulis tes gagal — income**

Tambah ke `tests/parse.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { parseQuickInput } from "@/lib/parse";

describe("income", () => {
  test("gajian 5jt → income kategori Gaji", () => {
    const p = parseQuickInput("gajian 5jt");
    expect(p.type).toBe("income");
    expect(p.amount).toBe(5_000_000);
    expect(p.category).toBe("Gaji");
  });
  test("dapat bonus thr 2jt → income kategori Bonus", () => {
    const p = parseQuickInput("dapat bonus thr 2jt");
    expect(p.type).toBe("income");
    expect(p.category).toBe("Bonus");
  });
  test("terima transferan 300rb → income Lainnya", () => {
    const p = parseQuickInput("terima transferan 300rb");
    expect(p.type).toBe("income");
    expect(p.category).toBe("Lainnya");
  });
  test("makan siang 30rb tetap expense", () => {
    const p = parseQuickInput("makan siang 30rb");
    expect(p.type).toBe("expense");
    expect(p.category).toBe("Makanan & Minuman");
    expect(p.pocketQuery).toBeNull();
  });
});
```

- [ ] **Step 2: Run — verifikasi GAGAL** (`npm test`) → Expected: FAIL, `p.type` undefined (field belum ada).

- [ ] **Step 3: Implement minimal** — tambah konstanta di `lib/types.ts` (blok Interfaces di atas, verbatim) + di `lib/parse.ts`:

```ts
const INCOME_KEYWORDS = ["gajian","gaji","terima","dapat","masuk","bonus","thr","refund","cashback","dibayar"];

function incomeCategory(text: string): string {
  if (/\b(gaji|gajian)\b/.test(text)) return "Gaji";
  if (/\b(bonus|thr|cashback|refund)\b/.test(text)) return "Bonus";
  return "Lainnya";
}
```

`parseQuickInput` (perluas hasil lama): setelah ekstraksi nominal & description (logika lama utuh), tentukan:
```ts
const lower = text.toLowerCase();
const isIncome = INCOME_KEYWORDS.some((k) => new RegExp(`\\b${k}\\b`).test(lower));
if (isIncome) return { type: "income", amount, description, category: incomeCategory(lower), pocketQuery: null };
return { type: "expense", amount, description, category: guessCategory(description), pocketQuery: null };
```

- [ ] **Step 4: Run — verifikasi LULUS** (`npm test`).

- [ ] **Step 5: Tulis tes gagal — nabung/ambil**

Tambah:
```ts
describe("kantong", () => {
  test("nabung 100rb liburan → saving_deposit + pocketQuery", () => {
    const p = parseQuickInput("nabung 100rb liburan");
    expect(p.type).toBe("saving_deposit");
    expect(p.amount).toBe(100_000);
    expect(p.pocketQuery).toBe("liburan");
  });
  test("ambil 50rb dari liburan → saving_withdrawal", () => {
    const p = parseQuickInput("ambil 50rb dari liburan");
    expect(p.type).toBe("saving_withdrawal");
    expect(p.pocketQuery).toBe("liburan");
  });
  test("tabung 25.000 dana darurat → deposit multi-kata", () => {
    const p = parseQuickInput("tabung 25.000 dana darurat");
    expect(p.pocketQuery).toBe("dana darurat");
  });
});
```

- [ ] **Step 6: Run — verifikasi GAGAL** → type "expense", pocketQuery null.

- [ ] **Step 7: Implement minimal** — di awal penentuan tipe (sebelum cek income):

```ts
const savingMatch = lower.match(/^(nabung|tabung|menabung|ambil|tarik)\b/);
if (savingMatch) {
  const kind = ["ambil","tarik"].includes(savingMatch[1]) ? "saving_withdrawal" : "saving_deposit";
  const pocketQuery = description
    .toLowerCase()
    .replace(/^(nabung|tabung|menabung|ambil|tarik)\b/,"")
    .replace(/\b(dari|ke|buat|untuk)\b/g," ")
    .replace(/\s+/g," ").trim() || null;
  return { type: kind, amount, description, category: "Tabungan", pocketQuery };
}
```
(Catatan: fallback `ambil` → expense diputuskan server-side saat 0 kandidat kantong — Task 5; parser cukup menandai kandidat.)

- [ ] **Step 8: Run — verifikasi LULUS**; seluruh suite hijau.

- [ ] **Step 9: Commit**

```bash
git add pintu-track-app/lib/types.ts pintu-track-app/lib/parse.ts pintu-track-app/tests/parse.test.ts
git commit -m "feat: parser income & transaksi kantong (TDD)"
```

---

### Task 3: lib/ledger.ts — matematika saldo murni (TDD)

**Files:**
- Create: `pintu-track-app/lib/ledger.ts`
- Test: `pintu-track-app/tests/ledger.test.ts`

**Interfaces:**
- Produces (dipakai Task 4–7, 10):
```ts
export type LedgerRow = { type: TransactionType; amount: number; pocketId?: string | null; date: Date | string };
export function saldoUtama(rows: LedgerRow[]): number;
export function pocketBalances(rows: LedgerRow[]): Map<string, number>;
export function monthlySummary(rows: LedgerRow[], now?: Date): { income: number; expense: number; saved: number };
```

- [ ] **Step 1: Tulis tes gagal**

`tests/ledger.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { monthlySummary, pocketBalances, saldoUtama, type LedgerRow } from "@/lib/ledger";

const d = (iso: string) => new Date(iso);
const rows: LedgerRow[] = [
  { type: "income", amount: 5_000_000, date: d("2026-07-01") },
  { type: "expense", amount: 30_000, date: d("2026-07-02") },
  { type: "saving_deposit", amount: 100_000, pocketId: "p1", date: d("2026-07-03") },
  { type: "saving_withdrawal", amount: 25_000, pocketId: "p1", date: d("2026-07-04") },
  { type: "saving_deposit", amount: 50_000, pocketId: "p2", date: d("2026-06-10") },
  { type: "expense", amount: 10_000, date: d("2026-06-15") },
];

describe("ledger", () => {
  test("saldoUtama = income − expense − deposit + withdrawal", () => {
    expect(saldoUtama(rows)).toBe(5_000_000 - 30_000 - 100_000 + 25_000 - 50_000 - 10_000);
  });
  test("pocketBalances per kantong", () => {
    const b = pocketBalances(rows);
    expect(b.get("p1")).toBe(75_000);
    expect(b.get("p2")).toBe(50_000);
  });
  test("monthlySummary hanya bulan berjalan", () => {
    const s = monthlySummary(rows, d("2026-07-20"));
    expect(s).toEqual({ income: 5_000_000, expense: 30_000, saved: 75_000 });
  });
  test("saldo boleh negatif", () => {
    expect(saldoUtama([{ type: "expense", amount: 7_000, date: d("2026-07-01") }])).toBe(-7_000);
  });
});
```

- [ ] **Step 2: Run — verifikasi GAGAL** → module `@/lib/ledger` tidak ada.

- [ ] **Step 3: Implement minimal**

`lib/ledger.ts`:
```ts
import type { TransactionType } from "./types";

export type LedgerRow = { type: TransactionType; amount: number; pocketId?: string | null; date: Date | string };

const SIGN: Record<TransactionType, number> = {
  income: 1, expense: -1, saving_deposit: -1, saving_withdrawal: 1,
};

export function saldoUtama(rows: LedgerRow[]): number {
  return rows.reduce((s, r) => s + SIGN[r.type] * r.amount, 0);
}

export function pocketBalances(rows: LedgerRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (!r.pocketId || (r.type !== "saving_deposit" && r.type !== "saving_withdrawal")) continue;
    const delta = r.type === "saving_deposit" ? r.amount : -r.amount;
    out.set(r.pocketId, (out.get(r.pocketId) ?? 0) + delta);
  }
  return out;
}

export function monthlySummary(rows: LedgerRow[], now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  let income = 0, expense = 0, saved = 0;
  for (const r of rows) {
    if (new Date(r.date) < start || new Date(r.date) > now) continue;
    if (r.type === "income") income += r.amount;
    if (r.type === "expense") expense += r.amount;
    if (r.type === "saving_deposit") saved += r.amount;
    if (r.type === "saving_withdrawal") saved -= r.amount;
  }
  return { income, expense, saved };
}
```

- [ ] **Step 4: Run — verifikasi LULUS** (`npm test`).

- [ ] **Step 5: Commit** — `git add ... && git commit -m "feat: ledger murni saldo/kantong/ringkasan bulanan (TDD)"`

---

### Task 4: Skema DB + migrasi 0001 (kedua database)

**Files:**
- Modify: `pintu-track-app/lib/db/schema.ts`
- Create: `pintu-track-app/drizzle/0001_wave_a.sql` (ditulis manual — drizzle-kit generate interaktif untuk rename, tidak dipakai)

**Interfaces:**
- Produces: tabel drizzle `transactions` (ex-`expenses`, + `type`, `pocketId`) dan `pockets` — dipakai semua route.

- [ ] **Step 1: Edit schema.ts** — rename export `expenses` → `transactions`, tabel `"transactions"`, tambah:

```ts
export const pockets = pgTable("pockets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("🎯"),
  targetAmount: integer("target_amount"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("pockets_user_name_idx").on(t.userId, sql`lower(${t.name})`)]);

export const transactions = pgTable("transactions", {
  // kolom lama expenses tetap +
  type: text("type").notNull().default("expense"),
  pocketId: uuid("pocket_id").references(() => pockets.id, { onDelete: "set null" }),
}, (t) => [index("transactions_user_date_idx").on(t.userId, t.date)]);
```
Import `sql` dari `drizzle-orm` dan `uniqueIndex` dari `drizzle-orm/pg-core`.

- [ ] **Step 2: Tulis migrasi manual** `drizzle/0001_wave_a.sql`:

```sql
CREATE TABLE "pockets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "emoji" text NOT NULL DEFAULT '🎯',
  "target_amount" integer,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "pockets_user_name_idx" ON "pockets"("user_id", lower("name"));

ALTER TABLE "expenses" RENAME TO "transactions";
ALTER INDEX "expenses_user_date_idx" RENAME TO "transactions_user_date_idx";
ALTER TABLE "transactions" RENAME CONSTRAINT "expenses_user_id_user_id_fk" TO "transactions_user_id_user_id_fk";
ALTER TABLE "transactions"
  ADD COLUMN "type" text NOT NULL DEFAULT 'expense'
    CHECK ("type" IN ('expense','income','saving_deposit','saving_withdrawal')),
  ADD COLUMN "pocket_id" uuid REFERENCES "pockets"("id") ON DELETE SET NULL;
```

- [ ] **Step 3: Terapkan ke Supabase dev** (MCP `apply_migration` project `lmxxuvkstnfapqtuktvk`, name `wave_a_ledger`) — lalu verifikasi: `select type, count(*) from transactions group by type;` → baris lama `expense`.

- [ ] **Step 4: `npm run build`** → Expected: GAGAL TypeScript (kode masih memakai `expenses`) — ini red yang diharapkan; Task 5–7 menghijaukan. JANGAN perbaiki asal-asalan di sini.

- [ ] **Step 5: Commit** — `git commit -m "feat: skema ledger transactions + pockets (migrasi 0001)"`

---

### Task 5: API transactions + stats server (mengganti /api/expenses)

**Files:**
- Create: `pintu-track-app/app/api/transactions/route.ts`, `.../transactions/[id]/route.ts`
- Delete: `pintu-track-app/app/api/expenses/` (kedua route)
- Modify: `pintu-track-app/lib/stats.ts`

**Interfaces:**
- Consumes: `transactions`, `pockets` (Task 4); `parseQuickInput` TIDAK dipakai di server transaksi web (web mengirim hasil parse), tapi resolusi kantong ya.
- Produces:
  - `GET /api/transactions?months=6` → `{ transactions: Transaction[] }` (kolom `pocketId` camelCase dari drizzle).
  - `POST /api/transactions` body `{ type, amount, description, category, pocketId?, pocketQuery?, date? }` → 201 `{ transaction }`; error 400 `{ error }`; khusus kantong tak ketemu/ambigu: 404/409 `{ error, pockets: {id,name,emoji}[] }`.
  - `resolvePocket(userId, q)` di `lib/stats.ts` → `{ pocket } | { error: "not_found" | "ambiguous", candidates }`.
  - `totalsFor(userId)` (stats) kini `{ totalToday, totalMonth, budget, saldo }` — totalToday/totalMonth tetap expense-only; `saldo` = saldoUtama all-time.
  - `pocketWithBalance(userId)` → `Pocket[]`.

- [ ] **Step 1: Rewrite lib/stats.ts** (thin di atas ledger):

```ts
import { and, eq, gte } from "drizzle-orm";
import { db } from "./db";
import { budgets, pockets, transactions } from "./db/schema";
import { monthlySummary, pocketBalances, saldoUtama } from "./ledger";
import type { Pocket } from "./types";

export function startOfDay(d = new Date()) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
export function startOfMonth(d = new Date()) { return new Date(d.getFullYear(), d.getMonth(), 1); }

async function allRows(userId: string) {
  return db.select({ type: transactions.type, amount: transactions.amount, pocketId: transactions.pocketId, date: transactions.date })
    .from(transactions).where(eq(transactions.userId, userId));
}

export async function totalsFor(userId: string) {
  const rows = await allRows(userId);
  const today = startOfDay();
  const month = startOfMonth();
  const totalToday = rows.filter(r => r.type === "expense" && new Date(r.date) >= today).reduce((s, r) => s + r.amount, 0);
  const totalMonth = rows.filter(r => r.type === "expense" && new Date(r.date) >= month).reduce((s, r) => s + r.amount, 0);
  const [budget] = await db.select().from(budgets).where(eq(budgets.userId, userId)).limit(1);
  return { totalToday, totalMonth, budget: budget ?? null, saldo: saldoUtama(rows as never) };
}

export async function summaryFor(userId: string) {
  const rows = await allRows(userId);
  const list = await db.select().from(pockets).where(eq(pockets.userId, userId));
  const balances = pocketBalances(rows as never);
  const m = monthlySummary(rows as never);
  const out: Pocket[] = list.map(p => ({ id: p.id, name: p.name, emoji: p.emoji, targetAmount: p.targetAmount, balance: balances.get(p.id) ?? 0 }));
  return { saldoUtama: saldoUtama(rows as never), incomeMonth: m.income, expenseMonth: m.expense, savedMonth: m.saved, pockets: out };
}

export async function resolvePocket(userId: string, q: string) {
  const list = await db.select().from(pockets).where(eq(pockets.userId, userId));
  const ql = q.trim().toLowerCase();
  const exact = list.filter(p => p.name.toLowerCase() === ql);
  if (exact.length === 1) return { pocket: exact[0] };
  const partial = list.filter(p => p.name.toLowerCase().includes(ql) || ql.includes(p.name.toLowerCase()));
  if (partial.length === 1) return { pocket: partial[0] };
  return { error: partial.length ? ("ambiguous" as const) : ("not_found" as const), candidates: partial.length ? partial : list };
}

export async function pocketBalance(userId: string, pocketId: string) {
  const rows = await allRows(userId);
  return pocketBalances(rows as never).get(pocketId) ?? 0;
}
```
(`gte` boleh dibuang bila tak terpakai. `as never` = cast LedgerRow; rapikan dengan tipe eksplisit bila sempat — bukan blocker.)

- [ ] **Step 2: Route transactions** — `app/api/transactions/route.ts` menyalin pola auth/validasi `expenses/route.ts` lama dengan tambahan: validasi `type` ∈ TRANSACTION_TYPES; kategori: expense → CATEGORIES, income → INCOME_CATEGORIES, saving → "Tabungan"; untuk `saving_*`: resolusi `pocketId` langsung ATAU `resolvePocket(pocketQuery)` (404/409 + candidates); untuk `saving_withdrawal`: `amount ≤ pocketBalance` else 400 `Isi kantong hanya <rupiah>`. GET memfilter `gte(transactions.date, since)` seperti lama dan mengembalikan semua tipe. `[id]/route.ts`: PATCH (amount/description/category; bila transaksi `saving_withdrawal` dan amount berubah → revalidasi isi kantong ditambah nominal lama), DELETE by id, DELETE-all pindah ke route utama (`DELETE /api/transactions`) — semuanya `where userId`. Sinkronisasi Sheets + peringatan anggaran (syncAndNotify lama) dipertahankan HANYA untuk `type='expense'`; income/saving tetap dicatat ke Sheets (Task 7) tanpa warning anggaran.

- [ ] **Step 3: Hapus folder `app/api/expenses`.**

- [ ] **Step 4: `npm run build`** → Expected: masih FAIL di store/UI (belum di-rename) — lanjut; tapi TIDAK boleh ada error di file yang baru dibuat.

- [ ] **Step 5: Commit** — `git commit -m "feat: API transactions + resolusi kantong menggantikan expenses"`

---

### Task 6: API pockets + summary

**Files:**
- Create: `pintu-track-app/app/api/pockets/route.ts`, `.../pockets/[id]/route.ts`, `app/api/summary/route.ts`

**Interfaces:**
- Consumes: `summaryFor`, `pocketBalance` (Task 5), tabel `pockets`.
- Produces:
  - `GET /api/pockets` → `{ pockets: Pocket[] }` (pakai `summaryFor(...).pockets`).
  - `POST /api/pockets` `{ name, emoji?, targetAmount? }` → 201 `{ pocket }`; nama kosong 400; duplikat (error unique index) → 409 `Nama kantong sudah dipakai`.
  - `PATCH /api/pockets/:id` `{ name?, emoji?, targetAmount? }`; `DELETE /api/pockets/:id` → bila balance > 0, insert `saving_withdrawal` (description `Kantong <name> dihapus — dikembalikan ke Saldo Utama`, category "Tabungan", pocketId) lalu `delete pockets` → `{ ok: true, returned: balance }`.
  - `GET /api/summary` → hasil `summaryFor` verbatim.

- [ ] **Step 1: Tulis ketiga route** (pola auth 401 sama seperti route lain; semua query `where eq(pockets.userId, user.id)`).
- [ ] **Step 2: `npm run build`** → area API bersih.
- [ ] **Step 3: Commit** — `git commit -m "feat: API pockets (CRUD + pengembalian saldo) dan summary"`

---

### Task 7: Bot Telegram + Sheets + seed

**Files:**
- Modify: `pintu-track-app/app/api/telegram/route.ts`, `pintu-track-app/lib/sheets.ts`, `pintu-track-app/lib/demo.ts`, `app/api/seed/route.ts`

**Interfaces:**
- Consumes: `parseQuickInput` (ParsedInput), `resolvePocket`, `totalsFor` (dengan `saldo`), `summaryFor`, `pocketBalance`.

- [ ] **Step 1: Perluas webhook** setelah parse:
  - `income` → insert; balas `💰 Tercatat: +<rp> (<kategori>). Saldo Utama: <rp>`.
  - `saving_deposit`/`saving_withdrawal` → `resolvePocket(pocketQuery ?? "")`; `not_found`: deposit → balas daftar kantong (`Kantong yang ada:\n<emoji> <name> — <rp>` per baris; buat di web); withdrawal → **fallback proses sebagai expense** (aturan anti-salah-tangkap). `ambiguous` → balas kandidat. Withdrawal valid → cek `pocketBalance`; lebih → `⚠️ Isi <emoji> <name> hanya <rp>...`. Sukses → balasan sesuai spec §6 (progress `x / target (n%)` bila target ada) + `Saldo Utama`.
  - Perintah `kantong` → daftar semua kantong + isi.
  - `saldo|sisa|...` regex lama → tambah baris pertama `Saldo Utama: <rp>`.
  - Expense → perilaku lama utuh.
- [ ] **Step 2: Sheets** — `appendExpenseToSheet` → rename `appendTransactionToSheet(sheetUrl, t)` dengan baris `[tanggal, TIPE_LABEL[t.type], description, category, amount]`; label: Pengeluaran/Pemasukan/Nabung/Tarik. Update kedua pemanggil (transactions POST + webhook) untuk SEMUA tipe.
- [ ] **Step 3: Seed** — `generateDemoData` menambahkan per bulan: 1 income "Gaji bulanan" 4–6jt tanggal 1, dan `POST /api/seed` membuat 2 kantong ("Dana Darurat" 🛟 target 10jt, "Liburan" 🏖️ target 5jt) + 2 deposit/bulan 100–300rb (pocketId nyata hasil insert).
- [ ] **Step 4: `npm run build`** → seluruh sisi server hijau. **Step 5: Commit** `feat: bot telegram, sheets, seed sadar-ledger`.

---

### Task 8: Store + rename Transaction di client

**Files:**
- Modify: `pintu-track-app/lib/store.tsx`, `pintu-track-app/lib/types.ts` (hapus alias `Expense` setelah rename), `components/ExpenseItem.tsx` → rename file `components/TransactionItem.tsx`

**Interfaces:**
- Produces (dipakai Task 9–10):
```ts
type Store = {
  ready: boolean; authed: boolean | null;
  transactions: Transaction[];
  summary: { saldoUtama: number; incomeMonth: number; expenseMonth: number; savedMonth: number; pockets: Pocket[] } | null;
  addTransaction(input: { type: TransactionType; amount: number; description: string; category: string; pocketId?: string }): Promise<void>;
  updateTransaction(id, patch): Promise<void>; deleteTransaction(id): Promise<void>;
  createPocket(p: { name: string; emoji: string; targetAmount: number | null }): Promise<void>;
  deletePocket(id: string): Promise<void>;
  refreshSummary(): Promise<void>;
  // budget/profile/telegram/seed/clearAll tetap seperti sebelumnya
};
```

- [ ] **Step 1:** Ganti fetch `/api/expenses` → `/api/transactions`; tambah state `summary` (fetch `/api/summary` saat refresh + setelah setiap mutasi transaksi/kantong); tambah `createPocket`/`deletePocket` (fetch `/api/pockets`). `addTransaction` menyertakan `type`/`pocketId`.
- [ ] **Step 2:** Rename `ExpenseItem` → `TransactionItem` (tampilkan tanda `+` hijau untuk income, 🔵/🟠 untuk saving; label sekunder saving = nama kantong dari `summary.pockets` by `pocketId`, atau teks `(kantong terhapus)` bila `pocketId` null; edit inline hanya untuk expense/income — transaksi saving cukup bisa dihapus).
- [ ] **Step 3:** `npm run build` → tinggal error halaman (Task 9–10). **Step 4: Commit** `refactor: store transactions + summary + pockets`.

---

### Task 9: UI Catat (saldo, chip tipe, onboarding) + Dasbor

**Files:**
- Modify: `pintu-track-app/app/page.tsx`, `app/dasbor/page.tsx`

- [ ] **Step 1: Catat** — kartu atas: `Saldo Utama` besar (merah + hint "Catat pemasukanmu agar saldo akurat" bila < 0) di atas total-hari-ini + BudgetBar lama. Preview parse: chip tipe berwarna (🔴 Pengeluaran/🟢 Pemasukan/🔵 Nabung/🟠 Tarik) — `select` tipe manual; bila tipe saving → dropdown kantong dari `summary.pockets` (menggantikan dropdown kategori); submit memanggil `addTransaction` dengan `pocketId`. Kartu onboarding "💡 Mulai dengan saldo awal" (input nominal → `addTransaction({type:'income', category:'Penyesuaian', description:'Saldo awal', amount})`) tampil bila `summary && summary.saldoUtama === 0 && !transactions.some(t=>t.type==='income')`. Riwayat memakai `TransactionItem` (semua tipe hari ini).
- [ ] **Step 2: Dasbor** — dua kartu baru dari `summary`: "Pemasukan bulan ini" & "Ditabung bulan ini"; grafik & kategori difilter `type==='expense'`. Anggaran page: filter `type==='expense'` pada perhitungan pemakaian (perubahan 2 baris).
- [ ] **Step 3:** `npm run build` → hijau penuh. **Step 4: Commit** `feat: UI catat multi-tipe + saldo utama + dasbor pemasukan`.

---

### Task 10: Halaman /kantong + nav 5 tab

**Files:**
- Create: `pintu-track-app/app/kantong/page.tsx`
- Modify: `pintu-track-app/components/AppNav.tsx`

- [ ] **Step 1: Nav** — sisipkan tab `{ href: "/kantong", label: "Kantong", icon: <ikon celengan/kotak SVG stroke 1.8> }` setelah Catat; grid mobile `grid-cols-5`.
- [ ] **Step 2: Halaman** — dari `summary.pockets`: kartu per kantong (emoji besar, nama, `formatRupiah(balance)`, progress bar `balance/targetAmount` bila target) + dua tombol **Nabung**/**Ambil** (buka input nominal inline → `addTransaction({type, pocketId, description: "Nabung: <name>" | "Ambil: <name>", category: "Tabungan"})`; error 400 penarikan ditampilkan). Form "+ Kantong baru": nama, pilihan emoji (baris tombol: 🎯🛟🏖️🏠🚗📱🎓💍), target opsional → `createPocket`. Hapus kantong: `window.confirm("Isi kantong akan dikembalikan ke Saldo Utama. Hapus?")` → `deletePocket`. Empty state ajakan membuat kantong pertama.
- [ ] **Step 3:** `npm run build` + `npm test` → semuanya hijau. **Step 4: Commit** `feat: halaman kantong tabungan + nav`.

---

### Task 11: Verifikasi lokal end-to-end (dev DB Supabase) — gerbang gelombang

- [ ] **Step 1:** `npm test` (suite penuh) + `npm run build` → hijau, output bersih.
- [ ] **Step 2:** Jalankan dev server (preview `pintu-track-app`, port 3001) dan uji di browser dengan akun dev: (a) onboarding saldo awal muncul & bekerja; (b) `gajian 5jt` → saldo naik, chip hijau; (c) buat kantong "Liburan" → `nabung 100rb liburan` via input chat web → progress benar & saldo turun; (d) `ambil 200rb liburan` → DITOLAK dengan pesan sisa; (e) dasbor menampilkan pemasukan/ditabung; (f) anggaran hanya menghitung expense; (g) hapus kantong → isi kembali ke saldo.
- [ ] **Step 3:** Simulasi webhook Telegram lokal (curl POST `/api/telegram` tanpa secret di dev): `gajian 1jt`, `nabung 50rb liburan`, `kantong`, `saldo`, `ambil paket 10rb` (harus jadi expense).
- [ ] **Step 4:** Bug ditemukan → tulis tes gagal yang mereproduksi (parser/ledger) ATAU perbaiki route + ulangi langkah; JANGAN lanjut sebelum semua lulus.
- [ ] **Step 5: Commit** perbaikan (bila ada).

---

### Task 12: Rollout produksi

- [ ] **Step 1:** `git push` (auto-deploy Coolify bila aktif; bila tidak, klik Deploy dari dashboard — perubahan kode dulu TIDAK apa-apa gagal start? TIDAK: terapkan migrasi DULU sebelum deploy karena kode baru butuh tabel baru. Urutan wajib: migrasi → deploy).
- [ ] **Step 2:** Terapkan `drizzle/0001_wave_a.sql` di terminal psql resource PostgreSQL Coolify (paste, verifikasi `\dt` menampilkan `transactions` & `pockets`).
- [ ] **Step 3:** Deploy/Redeploy resource aplikasi; tunggu `https://app.pintutrack.online/masuk` 200.
- [ ] **Step 4:** E2E produksi (checklist spec §8): `gajian 5jt` via bot Telegram asli → saldo di web; buat kantong di web → `nabung 100rb <kantong>` via bot → progress; `ambil` melebihi isi → ditolak; baris Sheets berkolom tipe (bila SA dikonfigurasi); anggaran tetap expense-only.
- [ ] **Step 5:** Update `DEPLOY.md` (catatan migrasi 0001) + commit `chore: rollout gelombang A`.
