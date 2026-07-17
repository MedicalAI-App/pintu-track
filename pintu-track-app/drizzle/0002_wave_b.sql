-- Gelombang B: pengingat tagihan + pencatat job penjadwal.
-- Terapkan ke: (1) Supabase dev, (2) Postgres Coolify produksi — sebelum deploy kode.

CREATE TABLE "reminders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "description" text NOT NULL,
  "amount" integer NOT NULL CHECK ("amount" > 0),
  "day_of_month" integer NOT NULL CHECK ("day_of_month" BETWEEN 1 AND 31),
  "active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "reminders_user_idx" ON "reminders"("user_id");

CREATE TABLE "job_runs" (
  "job" text PRIMARY KEY,
  "last_run_at" timestamptz NOT NULL
);
