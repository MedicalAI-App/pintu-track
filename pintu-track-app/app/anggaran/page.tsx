"use client";

import { useEffect, useMemo, useState } from "react";
import BudgetBar from "@/components/BudgetBar";
import { formatRupiah, isSameDay, isSameMonth } from "@/lib/format";
import { useAppData } from "@/lib/store";

export default function Anggaran() {
  const {
    ready,
    budget,
    setBudget,
    transactions,
    reminders,
    createReminder,
    updateReminder,
    deleteReminder,
  } = useAppData();
  const [daily, setDaily] = useState("");
  const [monthly, setMonthly] = useState("");
  const [saved, setSaved] = useState(false);
  const [remDesc, setRemDesc] = useState("");
  const [remAmount, setRemAmount] = useState("");
  const [remDay, setRemDay] = useState("1");
  const [remError, setRemError] = useState("");

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

      {/* Pengingat tagihan */}
      <section className="glass flex flex-col gap-4 rounded-2xl p-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Pengingat Tagihan
          </h2>
          <p className="mt-1 text-xs text-muted">
            Dikirim via bot Telegram jam 07:00 WIB dengan tombol catat sekali
            tap. Bisa juga lewat chat: “ingatkan kos 1,5jt tiap tanggal 1”.
          </p>
        </div>

        {reminders.length > 0 && (
          <ul className="flex flex-col gap-2">
            {reminders.map((r) => (
              <li
                key={r.id}
                className={`flex items-center gap-3 rounded-xl bg-white/5 p-3 ${
                  r.active ? "" : "opacity-50"
                }`}
              >
                <span className="text-lg">⏰</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.description}</p>
                  <p className="text-xs text-muted">
                    {formatRupiah(r.amount)} · tiap tanggal {r.dayOfMonth}
                  </p>
                </div>
                <button
                  onClick={() =>
                    updateReminder(r.id, { active: !r.active }).catch(() => {})
                  }
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    r.active
                      ? "bg-accent/15 text-accent"
                      : "bg-white/8 text-muted"
                  }`}
                >
                  {r.active ? "Aktif" : "Nonaktif"}
                </button>
                <button
                  onClick={() => deleteReminder(r.id).catch(() => {})}
                  aria-label={`Hapus pengingat ${r.description}`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/20 hover:text-danger"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0l-1 13H8L7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const amount = parseInt(remAmount.replace(/\D/g, ""), 10);
            if (!remDesc.trim() || !amount) return;
            setRemError("");
            try {
              await createReminder({
                description: remDesc.trim(),
                amount,
                dayOfMonth: parseInt(remDay, 10),
              });
              setRemDesc("");
              setRemAmount("");
              setRemDay("1");
            } catch (err) {
              setRemError(err instanceof Error ? err.message : "Gagal menyimpan.");
            }
          }}
          className="flex flex-col gap-2"
        >
          <div className="flex gap-2">
            <input
              className="input"
              value={remDesc}
              onChange={(e) => setRemDesc(e.target.value)}
              placeholder="mis. Kos"
              aria-label="Keterangan pengingat"
            />
            <input
              className="input max-w-[130px]"
              value={remAmount}
              onChange={(e) => setRemAmount(e.target.value)}
              inputMode="numeric"
              placeholder="1500000"
              aria-label="Nominal"
            />
            <select
              className="input max-w-[110px]"
              value={remDay}
              onChange={(e) => setRemDay(e.target.value)}
              aria-label="Tanggal"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d} className="bg-background">
                  tgl {d}
                </option>
              ))}
            </select>
          </div>
          {remError && <p className="text-sm text-danger">{remError}</p>}
          <button
            type="submit"
            className="self-start rounded-full bg-white/8 px-5 py-2 text-sm font-semibold transition-colors hover:bg-white/15"
          >
            + Tambah pengingat
          </button>
        </form>
      </section>

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
