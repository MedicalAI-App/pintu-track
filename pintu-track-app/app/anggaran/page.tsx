"use client";

import { useEffect, useMemo, useState } from "react";
import BudgetBar from "@/components/BudgetBar";
import { formatRupiah, isSameDay, isSameMonth } from "@/lib/format";
import { useAppData } from "@/lib/store";

export default function Anggaran() {
  const { ready, budget, setBudget, transactions } = useAppData();
  const [daily, setDaily] = useState("");
  const [monthly, setMonthly] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (ready) {
      setDaily(budget.dailyLimit ? String(budget.dailyLimit) : "");
      setMonthly(budget.monthlyLimit ? String(budget.monthlyLimit) : "");
    }
  }, [ready, budget.dailyLimit, budget.monthlyLimit]);

  const totalToday = useMemo(
    () =>
      transactions
        .filter((e) => e.type === "expense" && isSameDay(e.date, new Date()))
        .reduce((s, e) => s + e.amount, 0),
    [transactions]
  );
  const totalMonth = useMemo(
    () =>
      transactions
        .filter((e) => e.type === "expense" && isSameMonth(e.date, new Date()))
        .reduce((s, e) => s + e.amount, 0),
    [transactions]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await setBudget({
        dailyLimit: parseInt(daily.replace(/\D/g, ""), 10) || 0,
        monthlyLimit: parseInt(monthly.replace(/\D/g, ""), 10) || 0,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // gagal simpan — nilai lama tetap tampil
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Atur Anggaran</h1>
        <p className="mt-1 text-sm text-muted">
          Tetapkan batas agar pengeluaran tetap terkendali.
        </p>
      </div>

      <form onSubmit={submit} className="glass flex flex-col gap-5 rounded-2xl p-5">
        <div>
          <label htmlFor="daily" className="mb-2 block text-sm font-medium">
            Batas harian (Rp)
          </label>
          <input
            id="daily"
            className="input"
            value={daily}
            onChange={(e) => setDaily(e.target.value)}
            inputMode="numeric"
            placeholder="150000"
          />
          {daily && (
            <p className="mt-1.5 text-xs text-muted">
              = {formatRupiah(parseInt(daily.replace(/\D/g, ""), 10) || 0)} per hari
            </p>
          )}
        </div>
        <div>
          <label htmlFor="monthly" className="mb-2 block text-sm font-medium">
            Batas bulanan (Rp)
          </label>
          <input
            id="monthly"
            className="input"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            inputMode="numeric"
            placeholder="2000000"
          />
          {monthly && (
            <p className="mt-1.5 text-xs text-muted">
              = {formatRupiah(parseInt(monthly.replace(/\D/g, ""), 10) || 0)} per bulan
            </p>
          )}
        </div>
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 font-semibold text-background transition-transform hover:scale-[1.02]"
        >
          {saved ? "✓ Tersimpan" : "Simpan Anggaran"}
        </button>
      </form>

      <section className="glass flex flex-col gap-5 rounded-2xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Pemakaian saat ini
        </h2>
        <BudgetBar spent={totalToday} limit={budget.dailyLimit} label="Hari ini" />
        <BudgetBar spent={totalMonth} limit={budget.monthlyLimit} label="Bulan ini" />
        <p className="rounded-xl bg-white/5 p-4 text-xs leading-relaxed text-muted">
          💡 Saat pengeluaran mencapai 80% batas, indikator berubah kuning; lewat
          batas berubah merah. Notifikasi via web &amp; bot Telegram menyusul saat
          backend terhubung.
        </p>
      </section>
    </div>
  );
}
