"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "./auth-client";
import type { Budget, Category, Expense, Profile } from "./types";

const DEFAULT_BUDGET: Budget = { dailyLimit: 0, monthlyLimit: 0 };
const DEFAULT_PROFILE: Profile = {
  name: "",
  email: "",
  telegramLinked: false,
  sheetUrl: "",
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error ?? `Permintaan gagal (${res.status})`
    );
  }
  return data as T;
}

type Store = {
  /** true setelah sesi terverifikasi dan data awal termuat */
  ready: boolean;
  /** null = masih memeriksa sesi */
  authed: boolean | null;
  expenses: Expense[];
  addExpense: (e: {
    amount: number;
    description: string;
    category: Category;
  }) => Promise<void>;
  updateExpense: (
    id: string,
    patch: Partial<Pick<Expense, "amount" | "description" | "category">>
  ) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  budget: Budget;
  setBudget: (b: Budget) => Promise<void>;
  profile: Profile;
  saveProfile: (patch: { name?: string; sheetUrl?: string }) => Promise<void>;
  linkTelegram: () => Promise<{ code: string; link: string | null }>;
  unlinkTelegram: () => Promise<void>;
  seedDemo: () => Promise<void>;
  clearAll: () => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudgetState] = useState<Budget>(DEFAULT_BUDGET);
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);

  const authed = isPending ? null : Boolean(session);

  const refresh = useCallback(async () => {
    const [e, b, p] = await Promise.all([
      api<{ expenses: Expense[] }>("/api/expenses?months=6"),
      api<{ budget: Budget }>("/api/budget"),
      api<{ profile: Profile }>("/api/profile"),
    ]);
    setExpenses(e.expenses);
    setBudgetState(b.budget);
    setProfileState(p.profile);
  }, []);

  // Redirect ke /masuk bila belum login (kecuali sedang di /masuk)
  useEffect(() => {
    if (authed === false && pathname !== "/masuk") {
      router.replace("/masuk");
    }
  }, [authed, pathname, router]);

  // Muat data awal setelah login
  useEffect(() => {
    if (!authed) {
      setReady(false);
      return;
    }
    let cancelled = false;
    refresh()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authed, refresh]);

  const addExpense: Store["addExpense"] = useCallback(async (e) => {
    const { expense } = await api<{ expense: Expense }>("/api/expenses", {
      method: "POST",
      body: JSON.stringify(e),
    });
    setExpenses((prev) => [expense, ...prev]);
  }, []);

  const updateExpense: Store["updateExpense"] = useCallback(async (id, patch) => {
    const { expense } = await api<{ expense: Expense }>(`/api/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setExpenses((prev) => prev.map((x) => (x.id === id ? expense : x)));
  }, []);

  const deleteExpense: Store["deleteExpense"] = useCallback(async (id) => {
    await api(`/api/expenses/${id}`, { method: "DELETE" });
    setExpenses((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const setBudget: Store["setBudget"] = useCallback(async (b) => {
    const { budget } = await api<{ budget: Budget }>("/api/budget", {
      method: "PUT",
      body: JSON.stringify(b),
    });
    setBudgetState(budget);
  }, []);

  const saveProfile: Store["saveProfile"] = useCallback(
    async (patch) => {
      await api("/api/profile", { method: "PUT", body: JSON.stringify(patch) });
      setProfileState((prev) => ({
        ...prev,
        name: patch.name ?? prev.name,
        sheetUrl: patch.sheetUrl ?? prev.sheetUrl,
      }));
    },
    []
  );

  const linkTelegram: Store["linkTelegram"] = useCallback(async () => {
    return api<{ code: string; link: string | null }>("/api/telegram/link", {
      method: "POST",
    });
  }, []);

  const unlinkTelegram: Store["unlinkTelegram"] = useCallback(async () => {
    await api("/api/telegram/link", { method: "DELETE" });
    setProfileState((prev) => ({ ...prev, telegramLinked: false }));
  }, []);

  const seedDemo: Store["seedDemo"] = useCallback(async () => {
    await api("/api/seed", { method: "POST" });
    await refresh();
  }, [refresh]);

  const clearAll: Store["clearAll"] = useCallback(async () => {
    await api("/api/expenses", { method: "DELETE" });
    setExpenses([]);
  }, []);

  return (
    <StoreContext.Provider
      value={{
        ready,
        authed,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        budget,
        setBudget,
        profile,
        saveProfile,
        linkTelegram,
        unlinkTelegram,
        seedDemo,
        clearAll,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useAppData(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAppData harus dipakai di dalam AppDataProvider");
  return ctx;
}
