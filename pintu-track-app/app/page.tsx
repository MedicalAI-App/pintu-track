"use client";

import { useMemo, useState } from "react";
import BudgetBar from "@/components/BudgetBar";
import ExpenseItem from "@/components/ExpenseItem";
import { formatDateLong, formatRupiah, isSameDay } from "@/lib/format";
import { parseQuickInput } from "@/lib/parse";
import { useAppData } from "@/lib/store";
import { CATEGORIES, CATEGORY_EMOJI, type Category } from "@/lib/types";

export default function CatatanCepat() {
  const { ready, expenses, addExpense, budget } = useAppData();
  const [text, setText] = useState("");
  const [categoryOverride, setCategoryOverride] = useState<Category | "">("");
  const [error, setError] = useState("");

  const parsed = useMemo(() => parseQuickInput(text), [text]);
  const today = new Date();

  const todayExpenses = useMemo(
    () => expenses.filter((e) => isSameDay(e.date, new Date())),
    [expenses]
  );
  const totalToday = todayExpenses.reduce((s, e) => s + e.amount, 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    if (!parsed.amount) {
      setError("Sertakan nominalnya, contoh: “Makan siang 30rb”");
      return;
    }
    try {
      await addExpense({
        amount: parsed.amount,
        description: parsed.description,
        category: (categoryOverride || parsed.category) as Category,
      });
      setText("");
      setCategoryOverride("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan, coba lagi.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catatan Cepat</h1>
        <p className="mt-1 text-sm capitalize text-muted">{formatDateLong(today)}</p>
      </div>

      {/* Ringkasan hari ini */}
      <section className="glass rounded-2xl p-5">
        <p className="text-sm text-muted">Total pengeluaran hari ini</p>
        <p className="mb-4 mt-1 text-3xl font-bold tabular-nums tracking-tight">
          {formatRupiah(totalToday)}
        </p>
        <BudgetBar spent={totalToday} limit={budget.dailyLimit} label="Anggaran harian" />
      </section>

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
                setError("");
              }}
              placeholder="Contoh: Beli kopi 25rb"
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
              <span className="rounded-full bg-accent/15 px-3 py-1 font-semibold tabular-nums text-accent">
                {formatRupiah(parsed.amount)}
              </span>
              <span className="rounded-full bg-white/8 px-3 py-1">
                {parsed.description}
              </span>
              <select
                value={categoryOverride || parsed.category}
                onChange={(e) => setCategoryOverride(e.target.value as Category)}
                aria-label="Kategori"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-background">
                    {CATEGORY_EMOJI[c]} {c}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-muted">
              Nominal &amp; kategori terdeteksi otomatis — mendukung format 25000,
              25.000, 25rb, 1,5jt.
            </p>
          )}
        </form>
      </section>

      {/* Riwayat hari ini */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
          Riwayat hari ini ({todayExpenses.length})
        </h2>
        {!ready ? (
          <div className="glass h-20 animate-pulse rounded-xl" />
        ) : todayExpenses.length === 0 ? (
          <div className="glass rounded-xl p-8 text-center text-muted">
            <p className="mb-1 text-2xl">🌱</p>
            Belum ada pengeluaran hari ini.
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {todayExpenses.map((e) => (
              <ExpenseItem key={e.id} expense={e} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
