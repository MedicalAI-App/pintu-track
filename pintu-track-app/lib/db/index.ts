import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL belum diatur — lihat .env.example");
}

// prepare: false wajib untuk Supabase transaction pooler (port 6543).
// idle_timeout menutup koneksi menganggur secara rapi — tanpa ini, pooler
// memutus paksa dan tick scheduler sesekali kena ECONNRESET.
const client = postgres(url, {
  prepare: false,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
