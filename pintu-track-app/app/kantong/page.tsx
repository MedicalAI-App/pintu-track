"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";
import { useAppData } from "@/lib/store";
import type { Pocket } from "@/lib/types";

const EMOJI_CHOICES = ["🎯", "🛟", "🏖️", "🏠", "🚗", "📱", "🎓", "💍"];

function PocketCard({ pocket }: { pocket: Pocket }) {
  const { addTransaction, deletePocket } = useAppData();
  const [mode, setMode] = useState<"idle" | "deposit" | "withdraw">("idle");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pct = pocket.targetAmount
    ? Math.min((pocket.balance / pocket.targetAmount) * 100, 100)
    : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(amount.replace(/\D/g, ""), 10);
    if (!n) return;
    setBusy(true);
    setError("");
    try {
      await addTransaction({
        type: mode === "deposit" ? "saving_deposit" : "saving_withdrawal",
        amount: n,
        description: `${mode === "deposit" ? "Nabung" : "Ambil"}: ${pocket.name}`,
        category: "Tabungan",
        pocketId: pocket.id,
      });
      setAmount("");
      setMode("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (
      window.confirm(
        `Isi kantong (${formatRupiah(pocket.balance)}) akan dikembalikan ke Saldo Utama. Hapus kantong ${pocket.name}?`
      )
    ) {
      await deletePocket(pocket.id).catch(() => {});
    }
  }

  return (
    <li className="glass rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/5 text-2xl">
          {pocket.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{pocket.name}</p>
          <p className="text-lg font-bold tabular-nums tracking-tight">
            {formatRupiah(pocket.balance)}
          </p>
        </div>
        <button
          onClick={handleDelete}
          aria-label={`Hapus kantong ${pocket.name}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/20 hover:text-danger"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0l-1 13H8L7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {pocket.targetAmount !== null && (
        <div className="mt-3">
          <div className="mb-1.5 flex justify-between text-xs text-muted">
            <span>Target {formatRupiah(pocket.targetAmount)}</span>
            <span>{Math.round(pct!)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-accent transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {mode === "idle" ? (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setMode("deposit")}
            className="flex-1 rounded-full bg-accent/15 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/25"
          >
            🔵 Nabung
          </button>
          <button
            onClick={() => setMode("withdraw")}
            className="flex-1 rounded-full bg-white/8 py-2 text-sm font-semibold transition-colors hover:bg-white/15"
          >
            🟠 Ambil
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              placeholder={mode === "deposit" ? "Nominal nabung" : "Nominal ambil"}
              aria-label="Nominal"
              autoFocus
            />
            <button
              type="submit"
              disabled={busy}
              className="shrink-0 rounded-xl bg-gradient-to-r from-accent to-accent-soft px-4 text-sm font-semibold text-background disabled:opacity-50"
            >
              {mode === "deposit" ? "Nabung" : "Ambil"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("idle");
                setError("");
              }}
              className="shrink-0 rounded-xl px-2 text-sm text-muted hover:text-foreground"
            >
              Batal
            </button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      )}
    </li>
  );
}

export default function Kantong() {
  const { ready, summary, createPocket } = useAppData();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    try {
      await createPocket({
        name: name.trim(),
        emoji,
        targetAmount: target ? parseInt(target.replace(/\D/g, ""), 10) || null : null,
      });
      setName("");
      setEmoji("🎯");
      setTarget("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat kantong.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kantong Tabungan</h1>
          <p className="mt-1 text-sm text-muted">
            Sisihkan uang dari Saldo Utama untuk tujuanmu.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 rounded-full bg-gradient-to-r from-accent to-accent-soft px-4 py-2 text-sm font-semibold text-background transition-transform hover:scale-105"
        >
          + Kantong
        </button>
      </div>

      {summary && (
        <section className="glass rounded-2xl p-5">
          <p className="text-sm text-muted">Saldo Utama</p>
          <p
            className={`mt-1 text-2xl font-bold tabular-nums tracking-tight ${
              summary.saldoUtama < 0 ? "text-danger" : ""
            }`}
          >
            {formatRupiah(summary.saldoUtama)}
          </p>
        </section>
      )}

      {showForm && (
        <form onSubmit={submit} className="glass flex flex-col gap-4 rounded-2xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Kantong baru
          </h2>
          <div>
            <label htmlFor="pname" className="mb-2 block text-sm font-medium">
              Nama
            </label>
            <input
              id="pname"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="mis. Liburan"
              autoComplete="off"
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Emoji</p>
            <div className="flex flex-wrap gap-2">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`grid h-10 w-10 place-items-center rounded-xl text-xl transition-colors ${
                    emoji === e ? "bg-accent/25 ring-1 ring-accent" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="ptarget" className="mb-2 block text-sm font-medium">
              Target (opsional)
            </label>
            <input
              id="ptarget"
              className="input"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              inputMode="numeric"
              placeholder="5000000"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 font-semibold text-background transition-transform hover:scale-[1.02]"
          >
            Buat Kantong
          </button>
        </form>
      )}

      {!ready ? (
        <div className="glass h-32 animate-pulse rounded-2xl" />
      ) : !summary || summary.pockets.length === 0 ? (
        !showForm && (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="mb-2 text-3xl">🐷</p>
            <p className="mb-1 font-semibold">Belum ada kantong</p>
            <p className="mb-6 text-sm text-muted">
              Buat kantong pertamamu — misalnya Dana Darurat atau Liburan — lalu
              isi lewat tombol Nabung atau chat “nabung 100rb liburan”.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-gradient-to-r from-accent to-accent-soft px-6 py-2.5 text-sm font-semibold text-background transition-transform hover:scale-105"
            >
              Buat kantong pertama
            </button>
          </div>
        )
      ) : (
        <ul className="flex flex-col gap-3">
          {summary.pockets.map((p) => (
            <PocketCard key={p.id} pocket={p} />
          ))}
        </ul>
      )}
    </div>
  );
}
