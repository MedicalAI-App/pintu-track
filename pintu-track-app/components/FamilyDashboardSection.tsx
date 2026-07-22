"use client";

import { useState } from "react";
import { formatRupiah, formatTime } from "@/lib/format";
import { useAppData } from "@/lib/store";
import { CATEGORY_EMOJI, type Category, type Transaction } from "@/lib/types";

const TYPE_BADGE: Record<Transaction["type"], string> = {
  expense: "",
  income: "💰 ",
  saving_deposit: "🔵 ",
  saving_withdrawal: "🟠 ",
  saving_topup: "💵 ",
};

function MemberCard({
  member,
  isSelf,
}: {
  member: {
    userId: string;
    name: string;
    expenseMonth: number;
    incomeMonth: number;
    savedMonth: number;
  };
  isSelf: boolean;
}) {
  const { fetchMemberTransactions } = useAppData();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && items === null && !loading) {
      setLoading(true);
      try {
        setItems(await fetchMemberTransactions(member.userId));
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <li className="rounded-xl bg-white/5">
      <button
        onClick={toggle}
        className="flex w-full items-center gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-bold text-accent">
          {member.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {member.name}
            {isSelf && <span className="ml-1 text-xs text-muted">(kamu)</span>}
          </p>
          <p className="text-xs text-muted">
            keluar {formatRupiah(member.expenseMonth)} · masuk{" "}
            {formatRupiah(member.incomeMonth)} · nabung{" "}
            {formatRupiah(member.savedMonth)}
          </p>
        </div>
        <span className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-white/8 px-4 py-3">
          {loading ? (
            <p className="text-xs text-muted">Memuat…</p>
          ) : !items || items.length === 0 ? (
            <p className="text-xs text-muted">Belum ada transaksi bulan ini.</p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto text-sm">
              {items.map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <span className="shrink-0 text-xs">
                    {TYPE_BADGE[t.type] ||
                      (CATEGORY_EMOJI[t.category as Category] ?? "📦")}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {t.description}
                    <span className="ml-1 text-xs text-muted">
                      {formatTime(t.date)}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 tabular-nums ${
                      t.type === "income" || t.type === "saving_withdrawal"
                        ? "text-accent"
                        : ""
                    }`}
                  >
                    {t.type === "income" || t.type === "saving_withdrawal" ? "+" : ""}
                    {formatRupiah(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

/** Section "Keluarga" di Dasbor — hanya tampil bila tergabung di rumah. */
export default function FamilyDashboardSection() {
  const { household, profile } = useAppData();
  if (!household) return null;

  return (
    <section className="glass rounded-2xl p-5">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-muted">
        Keluarga: {household.name}
      </h2>
      <p className="mb-4 text-xs text-muted">
        Bulan ini — keluar{" "}
        <b className="text-foreground">{formatRupiah(household.total.expense)}</b> ·
        masuk <b className="text-accent">{formatRupiah(household.total.income)}</b> ·
        ditabung{" "}
        <b className="text-sky-300">{formatRupiah(household.total.saved)}</b>
      </p>
      <ul className="flex flex-col gap-2">
        {household.members.map((m) => (
          <MemberCard
            key={m.userId}
            member={m}
            isSelf={m.userId === profile.userId}
          />
        ))}
      </ul>
    </section>
  );
}
