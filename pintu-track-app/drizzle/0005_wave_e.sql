-- Gelombang E: kantong bersama + tipe saving_topup.
-- Terapkan ke: (1) Supabase dev, (2) Postgres Coolify produksi — sebelum deploy kode.

ALTER TABLE "pockets"
  ADD COLUMN "household_id" uuid REFERENCES "households"("id") ON DELETE SET NULL;

ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_type_check";
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_type_check"
  CHECK ("type" IN ('expense','income','saving_deposit','saving_withdrawal','saving_topup'));
