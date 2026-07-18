-- Gelombang D: mode keluarga (aditif — tidak menyentuh tabel yang ada).
-- Terapkan ke: (1) Supabase dev, (2) Postgres Coolify produksi — sebelum deploy kode.

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
