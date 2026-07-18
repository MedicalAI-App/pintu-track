"use client";

import { useState } from "react";
import { useAppData } from "@/lib/store";

/** Section "Keluarga" di halaman Profil: buat/gabung/kode/keluar. */
export default function FamilyProfileSection() {
  const { household, createHousehold, joinHousehold, leaveHousehold } =
    useAppData();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function run(fn: () => Promise<void>) {
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses.");
    }
  }

  if (household) {
    return (
      <section className="glass flex flex-col gap-4 rounded-2xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Keluarga
        </h2>
        <div>
          <p className="font-semibold">👨‍👩‍👧 {household.name}</p>
          <p className="mt-1 text-xs text-muted">
            {household.members.length} anggota — semua anggota dapat melihat
            transaksi satu sama lain.
          </p>
        </div>
        <div className="rounded-xl bg-white/5 p-4">
          <p className="mb-1 text-xs text-muted">
            Kode undangan (bagikan ke anggota keluarga):
          </p>
          <div className="flex items-center gap-3">
            <code className="text-xl font-bold tracking-[0.3em] text-accent">
              {household.inviteCode}
            </code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(household.inviteCode).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold hover:bg-white/15"
            >
              {copied ? "✓ Tersalin" : "Salin"}
            </button>
          </div>
        </div>
        <ul className="flex flex-col gap-1 text-sm">
          {household.members.map((m) => (
            <li key={m.userId} className="text-muted">
              • {m.name}
            </li>
          ))}
        </ul>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          onClick={() => {
            if (
              window.confirm(
                "Keluar dari rumah? Data transaksimu TIDAK terhapus — hanya tidak lagi terlihat oleh anggota lain."
              )
            ) {
              void run(leaveHousehold);
            }
          }}
          className="self-start rounded-full border border-danger/40 px-5 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
        >
          Keluar dari rumah
        </button>
      </section>
    );
  }

  return (
    <section className="glass flex flex-col gap-4 rounded-2xl p-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Keluarga
        </h2>
        <p className="mt-1 text-xs text-muted">
          Gabungkan beberapa akun dalam satu rumah untuk melihat keuangan
          keluarga bersama-sama.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) void run(() => createHousehold(name.trim()));
        }}
        className="flex gap-2"
      >
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Keluarga Dwiki"
          aria-label="Nama rumah"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-gradient-to-r from-accent to-accent-soft px-4 text-sm font-semibold text-background"
        >
          Buat rumah
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-white/10" />
        atau
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) void run(() => joinHousehold(code.trim()));
        }}
        className="flex gap-2"
      >
        <input
          className="input uppercase tracking-widest"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="KODE UNDANGAN"
          maxLength={6}
          aria-label="Kode undangan"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-white/8 px-4 text-sm font-semibold transition-colors hover:bg-white/15"
        >
          Gabung
        </button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
