-- Gelombang C: tebakan AI menunggu konfirmasi (tombol Telegram).
-- Terapkan ke: (1) Supabase dev, (2) Postgres Coolify produksi — sebelum deploy kode.

CREATE TABLE "ai_suggestions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "type" text NOT NULL CHECK ("type" IN ('expense','income')),
  "amount" integer NOT NULL CHECK ("amount" > 0),
  "description" text NOT NULL,
  "category" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "ai_suggestions_user_idx" ON "ai_suggestions"("user_id");
