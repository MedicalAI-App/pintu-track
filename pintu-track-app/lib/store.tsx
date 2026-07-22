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
import type {
  Budget,
  Household,
  Pocket,
  Profile,
  Reminder,
  Transaction,
  TransactionType,
} from "./types";

const DEFAULT_BUDGET: Budget = { dailyLimit: 0, monthlyLimit: 0 };
const DEFAULT_PROFILE: Profile = {
  name: "",
  email: "",
  telegramLinked: false,
  sheetUrl: "",
};

export type Summary = {
  saldoUtama: number;
  incomeMonth: number;
  expenseMonth: number;
  savedMonth: number;
  pockets: Pocket[];
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
  transactions: Transaction[];
  summary: Summary | null;
  addTransaction: (t: {
    type: TransactionType;
    amount: number;
    description: string;
    category: string;
    pocketId?: string;
  }) => Promise<void>;
  updateTransaction: (
    id: string,
    patch: Partial<Pick<Transaction, "amount" | "description" | "category">>
  ) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  createPocket: (p: {
    name: string;
    emoji: string;
    targetAmount: number | null;
    shared?: boolean;
  }) => Promise<void>;
  deletePocket: (id: string) => Promise<void>;
  updatePocket: (
    id: string,
    patch: {
      name?: string;
      emoji?: string;
      targetAmount?: number | null;
      shared?: boolean;
    }
  ) => Promise<void>;
  transferPocket: (
    fromPocketId: string,
    toPocketId: string,
    amount: number
  ) => Promise<void>;
  reminders: Reminder[];
  createReminder: (r: {
    description: string;
    amount: number;
    dayOfMonth: number;
  }) => Promise<void>;
  updateReminder: (id: string, patch: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  household: Household | null;
  createHousehold: (name: string) => Promise<void>;
  joinHousehold: (code: string) => Promise<void>;
  leaveHousehold: () => Promise<void>;
  fetchMemberTransactions: (userId: string) => Promise<Transaction[]>;
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [budget, setBudgetState] = useState<Budget>(DEFAULT_BUDGET);
  const [profile, setProfileState] = useState<Profile>(DEFAULT_PROFILE);
  const [remindersState, setReminders] = useState<Reminder[]>([]);
  const [household, setHousehold] = useState<Household | null>(null);

  const authed = isPending ? null : Boolean(session);

  const refreshSummary = useCallback(async () => {
    setSummary(await api<Summary>("/api/summary"));
  }, []);

  const refresh = useCallback(async () => {
    const [t, s, b, p, r, h] = await Promise.all([
      api<{ transactions: Transaction[] }>("/api/transactions?months=6"),
      api<Summary>("/api/summary"),
      api<{ budget: Budget }>("/api/budget"),
      api<{ profile: Profile }>("/api/profile"),
      api<{ reminders: Reminder[] }>("/api/reminders"),
      api<{ household: Household | null }>("/api/household"),
    ]);
    setTransactions(t.transactions);
    setSummary(s);
    setBudgetState(b.budget);
    setProfileState(p.profile);
    setReminders(r.reminders);
    setHousehold(h.household);
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

  const addTransaction: Store["addTransaction"] = useCallback(
    async (t) => {
      const { transaction } = await api<{ transaction: Transaction }>(
        "/api/transactions",
        { method: "POST", body: JSON.stringify(t) }
      );
      setTransactions((prev) => [transaction, ...prev]);
      await refreshSummary().catch(() => {});
    },
    [refreshSummary]
  );

  const updateTransaction: Store["updateTransaction"] = useCallback(
    async (id, patch) => {
      const { transaction } = await api<{ transaction: Transaction }>(
        `/api/transactions/${id}`,
        { method: "PATCH", body: JSON.stringify(patch) }
      );
      setTransactions((prev) => prev.map((x) => (x.id === id ? transaction : x)));
      await refreshSummary().catch(() => {});
    },
    [refreshSummary]
  );

  const deleteTransaction: Store["deleteTransaction"] = useCallback(
    async (id) => {
      await api(`/api/transactions/${id}`, { method: "DELETE" });
      setTransactions((prev) => prev.filter((x) => x.id !== id));
      await refreshSummary().catch(() => {});
    },
    [refreshSummary]
  );

  const createPocket: Store["createPocket"] = useCallback(
    async (p) => {
      await api("/api/pockets", { method: "POST", body: JSON.stringify(p) });
      await refreshSummary();
    },
    [refreshSummary]
  );

  const updatePocket: Store["updatePocket"] = useCallback(
    async (id, patch) => {
      await api(`/api/pockets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await refreshSummary();
    },
    [refreshSummary]
  );

  const transferPocket: Store["transferPocket"] = useCallback(
    async (fromPocketId, toPocketId, amount) => {
      await api("/api/pockets/transfer", {
        method: "POST",
        body: JSON.stringify({ fromPocketId, toPocketId, amount }),
      });
      // Transfer memunculkan 2 transaksi baru — muat ulang keduanya
      const t = await api<{ transactions: Transaction[] }>(
        "/api/transactions?months=6"
      );
      setTransactions(t.transactions);
      await refreshSummary();
    },
    [refreshSummary]
  );

  const deletePocket: Store["deletePocket"] = useCallback(
    async (id) => {
      await api(`/api/pockets/${id}`, { method: "DELETE" });
      // Pengembalian isi kantong menambah transaksi baru — muat ulang keduanya
      const t = await api<{ transactions: Transaction[] }>(
        "/api/transactions?months=6"
      );
      setTransactions(t.transactions);
      await refreshSummary();
    },
    [refreshSummary]
  );

  const createReminder: Store["createReminder"] = useCallback(async (r) => {
    const { reminder } = await api<{ reminder: Reminder }>("/api/reminders", {
      method: "POST",
      body: JSON.stringify(r),
    });
    setReminders((prev) => [reminder, ...prev]);
  }, []);

  const updateReminder: Store["updateReminder"] = useCallback(async (id, patch) => {
    const { reminder } = await api<{ reminder: Reminder }>(`/api/reminders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    setReminders((prev) => prev.map((x) => (x.id === id ? reminder : x)));
  }, []);

  const deleteReminder: Store["deleteReminder"] = useCallback(async (id) => {
    await api(`/api/reminders/${id}`, { method: "DELETE" });
    setReminders((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const createHousehold: Store["createHousehold"] = useCallback(async (name) => {
    const { household } = await api<{ household: Household }>("/api/household", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setHousehold(household);
  }, []);

  const joinHousehold: Store["joinHousehold"] = useCallback(async (code) => {
    const { household } = await api<{ household: Household }>(
      "/api/household/join",
      { method: "POST", body: JSON.stringify({ code }) }
    );
    setHousehold(household);
  }, []);

  const leaveHousehold: Store["leaveHousehold"] = useCallback(async () => {
    await api("/api/household/leave", { method: "POST" });
    setHousehold(null);
  }, []);

  const fetchMemberTransactions: Store["fetchMemberTransactions"] = useCallback(
    async (userId) => {
      const { transactions } = await api<{ transactions: Transaction[] }>(
        `/api/household/members/${userId}/transactions?months=1`
      );
      return transactions;
    },
    []
  );

  const setBudget: Store["setBudget"] = useCallback(async (b) => {
    const { budget } = await api<{ budget: Budget }>("/api/budget", {
      method: "PUT",
      body: JSON.stringify(b),
    });
    setBudgetState(budget);
  }, []);

  const saveProfile: Store["saveProfile"] = useCallback(async (patch) => {
    await api("/api/profile", { method: "PUT", body: JSON.stringify(patch) });
    setProfileState((prev) => ({
      ...prev,
      name: patch.name ?? prev.name,
      sheetUrl: patch.sheetUrl ?? prev.sheetUrl,
    }));
  }, []);

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
    await api("/api/transactions", { method: "DELETE" });
    setTransactions([]);
    await refreshSummary().catch(() => {});
  }, [refreshSummary]);

  return (
    <StoreContext.Provider
      value={{
        ready,
        authed,
        transactions,
        summary,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        createPocket,
        deletePocket,
        updatePocket,
        transferPocket,
        reminders: remindersState,
        createReminder,
        updateReminder,
        deleteReminder,
        household,
        createHousehold,
        joinHousehold,
        leaveHousehold,
        fetchMemberTransactions,
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
