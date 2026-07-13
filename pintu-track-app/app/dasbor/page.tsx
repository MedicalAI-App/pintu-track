"use client";

import { useMemo } from "react";
import BudgetBar from "@/components/BudgetBar";
import { formatRupiah, formatShortRupiah, isSameMonth } from "@/lib/format";
import { useAppData } from "@/lib/store";
import { CATEGORY_EMOJI, type Category } from "@/lib/types";

function monthlySeries(expenses: { amount: number; date: string }[], n = 6) {
  const now = new Date();
  const out: { label: string; total: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const total = expenses
      .filter((e) => isSameMonth(e.date, d))
      .reduce((s, e) => s + e.amount, 0);
    out.push({
      label: d.toLocaleDateString("id-ID", { month: "short" }),
      total,
    });
  }
  return out;
}

export default function Dasbor() {
  const { ready, expenses, budget, seedDemo } = useAppData();
  const now = new Date();

  const monthExpenses = useMemo(
    () => expenses.filter((e) => isSameMonth(e.date, new Date())),
    [expenses]
  );
  const totalMonth = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const avgDaily = Math.round(totalMonth / Math.max(now.getDate(), 1));

  const series = useMemo(() => monthlySeries(expenses), [expenses]);
  const maxSeries = Math.max(...series.map((s) => s.total), 1);

  const byCategory = useMemo(() => {
    const map = new Map<Category, number>();
    for (const e of monthExpenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [monthExpenses]);

  if (ready && expenses.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight">Dasbor Keuangan</h1>
        <div className="glass rounded-2xl p-10 text-center">
          <p className="mb-2 text-3xl">📊</p>
          <p className="mb-1 font-semibold">Belum ada data</p>
          <p className="mb-6 text-sm text-muted">
            Mulai catat pengeluaran di halaman Catat, atau muat contoh data
            untuk melihat dasbor beraksi.
          </p>
          <button
            onClick={() => seedDemo().catch(() => {})}
            className="rounded-full bg-gradient-to-r from-accent to-accent-soft px-6 py-2.5 text-sm font-semibold text-background transition-transform hover:scale-105"
          >
            Muat contoh data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dasbor Keuangan</h1>
        <p className="mt-1 text-sm capitalize text-muted">
          {now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Kartu ringkasan */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <p className="text-xs text-muted">Total bulan ini</p>
          <p className="mt-1 text-xl font-bold tabular-nums tracking-tight">
            {formatRupiah(totalMonth)}
          </p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-xs text-muted">Rata-rata per hari</p>
          <p className="mt-1 text-xl font-bold tabular-nums tracking-tight">
            {formatRupiah(avgDaily)}
          </p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-xs text-muted">Sisa anggaran bulanan</p>
          <p
            className={`mt-1 text-xl font-bold tabular-nums tracking-tight ${
              budget.monthlyLimit > 0 && totalMonth > budget.monthlyLimit
                ? "text-danger"
                : "text-accent"
            }`}
          >
            {budget.monthlyLimit > 0
              ? formatRupiah(Math.max(budget.monthlyLimit - totalMonth, 0))
              : "—"}
          </p>
        </div>
      </section>

      {/* Grafik bulanan */}
      <section className="glass rounded-2xl p-5">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted">
          Pengeluaran 6 bulan terakhir
        </h2>
        <div className="flex h-40 items-end gap-3">
          {series.map((s, i) => {
            const isCurrent = i === series.length - 1;
            return (
              <div key={s.label + i} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] tabular-nums text-muted">
                  {s.total > 0 ? formatShortRupiah(s.total) : ""}
                </span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-md transition-[height] duration-500 ${
                      isCurrent
                        ? "bg-gradient-to-t from-accent to-accent-soft"
                        : "bg-white/10"
                    }`}
                    style={{ height: `${(s.total / maxSeries) * 100}%` }}
                  />
                </div>
                <span className={`text-xs ${isCurrent ? "font-semibold text-accent" : "text-muted"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Anggaran bulan berjalan */}
      <section className="glass rounded-2xl p-5">
        <BudgetBar
          spent={totalMonth}
          limit={budget.monthlyLimit}
          label="Anggaran bulan ini"
        />
      </section>

      {/* Rincian kategori */}
      <section className="glass rounded-2xl p-5">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted">
          Rincian kategori bulan ini
        </h2>
        {byCategory.length === 0 ? (
          <p className="text-sm text-muted">Belum ada pengeluaran bulan ini.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {byCategory.map(([cat, total]) => {
              const pct = totalMonth > 0 ? (total / totalMonth) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>
                      {CATEGORY_EMOJI[cat]} {cat}
                    </span>
                    <span className="tabular-nums text-muted">
                      {formatRupiah(total)} · {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
