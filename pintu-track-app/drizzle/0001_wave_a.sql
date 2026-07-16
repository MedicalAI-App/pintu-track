-- Gelombang A: ledger terpadu + kantong tabungan.
-- Ditulis manual (drizzle-kit generate interaktif untuk rename tabel).
-- Terapkan ke: (1) Supabase dev, (2) Postgres Coolify produksi — sebelum deploy kode.

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
-- Nama FK berbeda antara dev (auto-name Postgres) dan prod (nama drizzle) — rename kondisional
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_user_id_user_id_fk') THEN
    ALTER TABLE "transactions" RENAME CONSTRAINT "expenses_user_id_user_id_fk" TO "transactions_user_id_user_id_fk";
  ELSIF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expenses_user_id_fkey') THEN
    ALTER TABLE "transactions" RENAME CONSTRAINT "expenses_user_id_fkey" TO "transactions_user_id_user_id_fk";
  END IF;
END $$;
ALTER TABLE "transactions"
  ADD COLUMN "type" text NOT NULL DEFAULT 'expense'
    CHECK ("type" IN ('expense','income','saving_deposit','saving_withdrawal')),
  ADD COLUMN "pocket_id" uuid REFERENCES "pockets"("id") ON DELETE SET NULL;
