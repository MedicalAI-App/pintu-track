"use client";

import { useMemo, useState } from "react";
import BudgetBar from "@/components/BudgetBar";
import TransactionItem from "@/components/TransactionItem";
import { formatDateLong, formatRupiah, isSameDay } from "@/lib/format";
import { parseQuickInput } from "@/lib/parse";
import { useAppData } from "@/lib/store";
import {
  ADJUSTMENT_CATEGORY,
  CATEGORIES,
  CATEGORY_EMOJI,
  INCOME_CATEGORIES,
  TYPE_LABEL,
  type Category,
  type TransactionType,
} from "@/lib/types";

const TYPE_CHIP: Record<TransactionType, { icon: string; cls: string }> = {
  expense: { icon: "🔴", cls: "bg-danger/15 text-danger" },
  income: { icon: "🟢", cls: "bg-accent/15 text-accent" },
  saving_deposit: { icon: "🔵", cls: "bg-sky-400/15 text-sky-300" },
  saving_withdrawal: { icon: "🟠", cls: "bg-gold/15 text-gold" },
  saving_topup: { icon: "💵", cls: "bg-sky-400/15 text-sky-300" },
};

export default function CatatanCepat() {
  const { ready, transactions, addTransaction, budget, summary } = useAppData();
  const [text, setText] = useState("");
  const [typeOverride, setTypeOverride] = useState<TransactionType | "">("");
  const [categoryOverride, setCategoryOverride] = useState("");
  const [pocketOverride, setPocketOverride] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [error, setError] = useState("");

  const parsed = useMemo(() => parseQuickInput(text), [text]);
  const activeType = (typeOverride || parsed.type) as TransactionType;
  const isSaving =
    activeType === "saving_deposit" ||
    activeType === "saving_withdrawal" ||
    activeType === "saving_topup";
  const today = new Date();

  const todayTransactions = useMemo(
    () => transactions.filter((t) => isSameDay(t.date, new Date())),
    [transactions]
  );
  const totalToday = todayTransactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  const showOnboarding =
    ready &&
    summary !== null &&
    summary.saldoUtama === 0 &&
    !transactions.some((t) => t.type === "income");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    if (!parsed.amount) {
      setError("Sertakan nominalnya, contoh: “Makan siang 30rb”");
      return;
    }
    try {
      const category =
        categoryOverride ||
        (activeType === parsed.type ? parsed.category : activeType === "income" ? "Lainnya" : "Lainnya");
      await addTransaction({
        type: activeType,
        amount: parsed.amount,
        description: parsed.description,
        category: isSaving ? "Tabungan" : category,
        ...(isSaving
          ? {
              pocketId:
                pocketOverride ||
                summary?.pockets.find((p) =>
                  parsed.pocketQuery
                    ? p.name.toLowerCase().includes(parsed.pocketQuery)
                    : false
                )?.id,
            }
          : {}),
      });
      setText("");
      setTypeOverride("");
      setCategoryOverride("");
      setPocketOverride("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan, coba lagi.");
    }
  }

  async function submitInitialBalance(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(initialBalance.replace(/\D/g, ""), 10);
    if (!n) return;
    await addTransaction({
      type: "income",
      amount: n,
      description: "Saldo awal",
      category: ADJUSTMENT_CATEGORY,
    }).catch(() => {});
    setInitialBalance("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catatan Cepat</h1>
        <p className="mt-1 text-sm capitalize text-muted">{formatDateLong(today)}</p>
      </div>

      {/* Saldo utama + ringkasan hari ini */}
      <section className="glass rounded-2xl p-5">
        <p className="text-sm text-muted">Saldo Utama</p>
        <p
          className={`mt-1 text-3xl font-bold tabular-nums tracking-tight ${
            (summary?.saldoUtama ?? 0) < 0 ? "text-danger" : ""
          }`}
        >
          {summary ? formatRupiah(summary.saldoUtama) : "—"}
        </p>
        {(summary?.saldoUtama ?? 0) < 0 && (
          <p className="mt-1 text-xs text-danger">
            Saldo minus — catat pemasukanmu agar saldo akurat.
          </p>
        )}
        <div className="mt-4 flex items-baseline justify-between text-sm">
          <span className="text-muted">Pengeluaran hari ini</span>
          <span className="font-semibold tabular-nums">{formatRupiah(totalToday)}</span>
        </div>
        <div className="mt-2">
          <BudgetBar spent={totalToday} limit={budget.dailyLimit} label="Anggaran harian" />
        </div>
      </section>

      {/* Onboarding saldo awal */}
      {showOnboarding && (
        <section className="rounded-2xl border border-accent/30 bg-accent/10 p-5">
          <p className="mb-1 font-semibold">💡 Mulai dengan saldo awal</p>
          <p className="mb-3 text-xs text-muted">
            Berapa uang yang kamu pegang sekarang? Sekali isi, saldo langsung akurat.
          </p>
          <form onSubmit={submitInitialBalance} className="flex gap-2">
            <input
              className="input"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              inputMode="numeric"
              placeholder="500000"
              aria-label="Saldo awal"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-gradient-to-r from-accent to-accent-soft px-5 font-semibold text-background"
            >
              Simpan
            </button>
          </form>
        </section>
      )}

      {/* Form catat cepat */}
      <section className="glass rounded-2xl p-5">
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label htmlFor="quick" className="text-sm font-medium">
            Tulis seperti chat biasa
          </label>
          <div className="flex gap-2">
            <input
              id="quick"
              className="input"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setTypeOverride("");
                setCategoryOverride("");
                setPocketOverride("");
                setError("");
              }}
              placeholder="Contoh: Beli kopi 25rb · gajian 5jt · nabung 100rb liburan"
              autoComplete="off"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-gradient-to-r from-accent to-accent-soft px-5 font-semibold text-background transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
              disabled={!text.trim()}
            >
              Simpan
            </button>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          {text.trim() && parsed.amount ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <select
                value={activeType}
                onChange={(e) => setTypeOverride(e.target.value as TransactionType)}
                aria-label="Tipe"
                className={`rounded-full border border-white/10 px-3 py-1 font-semibold outline-none ${TYPE_CHIP[activeType].cls}`}
              >
                {(Object.keys(TYPE_LABEL) as TransactionType[]).map((t) => (
                  <option key={t} value={t} className="bg-background text-foreground">
                    {TYPE_CHIP[t].icon} {TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
              <span className="rounded-full bg-accent/15 px-3 py-1 font-semibold tabular-nums text-accent">
                {formatRupiah(parsed.amount)}
              </span>
              <span className="rounded-full bg-white/8 px-3 py-1">{parsed.description}</span>
              {isSaving ? (
                <select
                  value={
                    pocketOverride ||
                    summary?.pockets.find((p) =>
                      parsed.pocketQuery
                        ? p.name.toLowerCase().includes(parsed.pocketQuery)
                        : false
                    )?.id ||
                    ""
                  }
                  onChange={(e) => setPocketOverride(e.target.value)}
                  aria-label="Kantong"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 outline-none"
                >
                  <option value="" className="bg-background">
                    Pilih kantong…
                  </option>
                  {summary?.pockets.map((p) => (
                    <option key={p.id} value={p.id} className="bg-background">
                      {p.emoji} {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={categoryOverride || (activeType === parsed.type ? parsed.category : "Lainnya")}
                  onChange={(e) => setCategoryOverride(e.target.value)}
                  aria-label="Kategori"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 outline-none"
                >
                  {(activeType === "income" ? INCOME_CATEGORIES : CATEGORIES).map((c) => (
                    <option key={c} value={c} className="bg-background">
                      {activeType === "income" ? "💰" : CATEGORY_EMOJI[c as Category]} {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted">
              Nominal, tipe &amp; kategori terdeteksi otomatis — coba “gajian 5jt”
              atau “nabung 100rb liburan”.
            </p>
          )}
        </form>
      </section>

      {/* Riwayat hari ini */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Riwayat hari ini ({todayTransactions.length})
        </h2>
        {!ready ? (
          <div className="glass h-20 animate-pulse rounded-xl" />
        ) : todayTransactions.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-muted">
            <p className="mb-1 text-2xl">🌱</p>
            Belum ada transaksi hari ini.
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {todayTransactions.map((t) => (
              <TransactionItem key={t.id} transaction={t} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
