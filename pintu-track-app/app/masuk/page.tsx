"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn, signUp, useSession } from "@/lib/auth-client";

export default function Masuk() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [mode, setMode] = useState<"masuk" | "daftar">("masuk");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPending && session) router.replace("/");
  }, [isPending, session, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res =
        mode === "masuk"
          ? await signIn.email({ email, password })
          : await signUp.email({ name: name.trim() || email.split("@")[0], email, password });
      if (res.error) {
        setError(
          res.error.message === "Invalid email or password"
            ? "Email atau kata sandi salah."
            : (res.error.message ?? "Terjadi kesalahan, coba lagi.")
        );
      } else {
        router.replace("/");
      }
    } catch {
      setError("Tidak bisa terhubung ke server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[80svh] items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-accent to-accent-soft text-2xl font-bold text-background">
            P
          </span>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "masuk" ? "Masuk ke PintuTrack" : "Buat akun PintuTrack"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Catat pengeluaran secepat kirim chat.
          </p>
        </div>

        <div className="glass mb-5 grid grid-cols-2 rounded-full p-1 text-sm font-medium">
          {(["masuk", "daftar"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              className={`rounded-full py-2 capitalize transition-colors ${
                mode === m ? "bg-accent/20 text-accent" : "text-muted"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="glass flex flex-col gap-4 rounded-2xl p-6">
          {mode === "daftar" && (
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                Nama
              </label>
              <input
                id="name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama kamu"
                autoComplete="name"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kamu@email.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">
              Kata sandi
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              autoComplete={mode === "masuk" ? "current-password" : "new-password"}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 font-semibold text-background transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {busy ? "Memproses..." : mode === "masuk" ? "Masuk" : "Daftar"}
          </button>
        </form>
      </div>
    </div>
  );
}
