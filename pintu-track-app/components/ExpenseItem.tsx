"use client";

import { useState } from "react";
import { formatRupiah, formatTime } from "@/lib/format";
import { useAppData } from "@/lib/store";
import { CATEGORIES, CATEGORY_EMOJI, type Category, type Expense } from "@/lib/types";

export default function ExpenseItem({ expense }: { expense: Expense }) {
  const { updateExpense, deleteExpense } = useAppData();
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(expense.description);
  const [amount, setAmount] = useState(String(expense.amount));
  const [category, setCategory] = useState<Category>(expense.category);

  function saveEdit() {
    const n = parseInt(amount.replace(/\D/g, ""), 10);
    if (!desc.trim() || !n) return;
    updateExpense(expense.id, {
      description: desc.trim(),
      amount: n,
      category,
    }).catch(() => {});
    setEditing(false);
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
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              aria-label="Kategori"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-background">
                  {CATEGORY_EMOJI[c]} {c}
                </option>
              ))}
            </select>
          </div>
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
        {CATEGORY_EMOJI[expense.category]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{expense.description}</p>
        <p className="text-xs text-muted">
          {expense.category} · {formatTime(expense.date)}
        </p>
      </div>
      <p className="shrink-0 font-semibold tabular-nums">
        {formatRupiah(expense.amount)}
      </p>
      <div className="flex shrink-0 gap-1 opacity-60 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => setEditing(true)}
          aria-label={`Edit ${expense.description}`}
          className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3l4 4L8 20l-5 1 1-5L17 3z" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => deleteExpense(expense.id).catch(() => {})}
          aria-label={`Hapus ${expense.description}`}
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
