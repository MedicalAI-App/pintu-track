"use client";

import { useState } from "react";
import { formatRupiah, formatTime } from "@/lib/format";
import { useAppData } from "@/lib/store";
import {
  CATEGORIES,
  CATEGORY_EMOJI,
  INCOME_CATEGORIES,
  type Category,
  type Transaction,
} from "@/lib/types";

const TYPE_ICON: Record<Transaction["type"], string> = {
  expense: "",
  income: "💰",
  saving_deposit: "🔵",
  saving_withdrawal: "🟠",
};

export default function TransactionItem({ transaction }: { transaction: Transaction }) {
  const { updateTransaction, deleteTransaction, summary } = useAppData();
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(transaction.description);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [category, setCategory] = useState(transaction.category);
  const [error, setError] = useState("");

  const isSaving =
    transaction.type === "saving_deposit" ||
    transaction.type === "saving_withdrawal";
  const isIncome = transaction.type === "income";

  const pocketName = isSaving
    ? (summary?.pockets.find((p) => p.id === transaction.pocketId)?.name ??
      (transaction.pocketId ? "Kantong" : "(kantong terhapus)"))
    : null;

  const categoryOptions = isIncome ? INCOME_CATEGORIES : CATEGORIES;

  function saveEdit() {
    const n = parseInt(amount.replace(/\D/g, ""), 10);
    if (!desc.trim() || !n) return;
    updateTransaction(transaction.id, {
      description: desc.trim(),
      amount: n,
      ...(isSaving ? {} : { category }),
    })
      .then(() => setEditing(false))
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal menyimpan"));
  }

  if (editing) {
    return (
      <li className="glass rounded-xl p-4">
        <div className="flex flex-col gap-3">
          <input
            className="input"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Keterangan"
            aria-label="Keterangan"
          />
          <div className="flex gap-3">
            <input
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              placeholder="Jumlah (Rp)"
              aria-label="Jumlah"
            />
            {!isSaving && (
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Kategori"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c} className="bg-background">
                    {isIncome ? "💰" : CATEGORY_EMOJI[c as Category] ?? "📦"} {c}
                  </option>
                ))}
              </select>
            )}
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="rounded-full px-4 py-2 text-sm text-muted hover:text-foreground"
            >
              Batal
            </button>
            <button
              onClick={saveEdit}
              className="rounded-full bg-gradient-to-r from-accent to-accent-soft px-5 py-2 text-sm font-semibold text-background"
            >
              Simpan
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="glass group flex items-center gap-3 rounded-xl p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/5 text-lg">
        {isSaving || isIncome
          ? TYPE_ICON[transaction.type]
          : CATEGORY_EMOJI[transaction.category as Category] ?? "📦"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{transaction.description}</p>
        <p className="text-xs text-muted">
          {isSaving ? pocketName : transaction.category} ·{" "}
          {formatTime(transaction.date)}
        </p>
      </div>
      <p
        className={`shrink-0 font-semibold tabular-nums ${
          isIncome || transaction.type === "saving_withdrawal"
            ? "text-accent"
            : ""
        }`}
      >
        {isIncome || transaction.type === "saving_withdrawal" ? "+" : ""}
        {formatRupiah(transaction.amount)}
      </p>
      <div className="flex shrink-0 gap-1 opacity-60 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          aria-label={`Edit ${transaction.description}`}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3l4 4L8 20l-5 1 1-5L17 3z" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => deleteTransaction(transaction.id).catch(() => {})}
          aria-label={`Hapus ${transaction.description}`}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/20 hover:text-danger"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0l-1 13H8L7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </li>
  );
}
