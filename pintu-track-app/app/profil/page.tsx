"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import FamilyProfileSection from "@/components/FamilyProfileSection";
import { signOut } from "@/lib/auth-client";
import { useAppData } from "@/lib/store";

export default function Profil() {
  const router = useRouter();
  const {
    ready,
    profile,
    saveProfile,
    linkTelegram,
    unlinkTelegram,
    clearAll,
  } = useAppData();

  const [name, setName] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [tg, setTg] = useState<{ code: string; link: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready) {
      setName(profile.name);
      setSheetUrl(profile.sheetUrl);
    }
  }, [ready, profile.name, profile.sheetUrl]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await saveProfile({ name, sheetUrl });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    }
  }

  async function handleTelegram() {
    setBusy(true);
    setError("");
    try {
      if (profile.telegramLinked) {
        await unlinkTelegram();
        setTg(null);
      } else {
        setTg(await linkTelegram());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses.");
    } finally {
      setBusy(false);
    }
  }

  async function handleClearAll() {
    if (
      window.confirm(
        "Hapus SEMUA catatan pengeluaran dari akunmu? Tindakan ini tidak bisa dibatalkan."
      )
    ) {
      await clearAll().catch(() => {});
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/masuk");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Akun Saya</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola profil dan koneksi ke layanan lain.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Profil */}
      <form onSubmit={handleSave} className="glass flex flex-col gap-4 rounded-2xl p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Profil
        </h2>
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
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            className="input opacity-60"
            value={profile.email}
            readOnly
            disabled
          />
        </div>
        <button
          type="submit"
          className="rounded-xl bg-gradient-to-r from-accent to-accent-soft py-3 font-semibold text-background transition-transform hover:scale-[1.02]"
        >
          {saved ? "✓ Tersimpan" : "Simpan Profil"}
        </button>
      </form>

      {/* Keluarga */}
      <FamilyProfileSection />

      {/* Telegram */}
      <section className="glass flex flex-col gap-4 rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#2AABEE]/15">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#2AABEE">
              <path d="M21.4 4.1L2.9 11.3c-.9.4-.9 1.6.1 1.9l4.6 1.4 1.8 5.6c.3.9 1.4 1 2 .3l2.6-2.9 4.8 3.5c.7.5 1.8.1 2-.8l3-14.6c.2-1-.8-1.9-1.4-1.6z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Bot Telegram</p>
            <p className="text-xs text-muted">
              {profile.telegramLinked
                ? "Terhubung — catat pengeluaran via chat"
                : "Belum terhubung"}
            </p>
          </div>
          <button
            onClick={handleTelegram}
            disabled={busy}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
              profile.telegramLinked
                ? "bg-white/8 text-muted hover:text-foreground"
                : "bg-[#2AABEE] text-white hover:bg-[#229ED9]"
            }`}
          >
            {profile.telegramLinked ? "Putuskan" : "Hubungkan"}
          </button>
        </div>

        {tg && !profile.telegramLinked && (
          <div className="rounded-xl bg-white/5 p-4 text-sm leading-relaxed">
            {tg.link ? (
              <>
                Buka tautan ini di Telegram untuk menautkan akunmu:{" "}
                <a
                  href={tg.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-accent underline"
                >
                  {tg.link}
                </a>
              </>
            ) : (
              <>
                Kirim pesan berikut ke bot PintuTrack di Telegram:{" "}
                <code className="rounded bg-white/10 px-2 py-0.5 font-mono text-accent">
                  /start {tg.code}
                </code>
              </>
            )}
            <p className="mt-2 text-xs text-muted">
              Kode berlaku sekali pakai. Setelah bot membalas “Berhasil
              terhubung”, muat ulang halaman ini.
            </p>
          </div>
        )}
      </section>

      {/* Google Sheets */}
      <section className="glass flex flex-col gap-3 rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/15">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 3v18" />
            </svg>
          </span>
          <div>
            <p className="font-semibold">Google Sheets</p>
            <p className="text-xs text-muted">
              Setiap catatan baru otomatis jadi baris baru di spreadsheet-mu
              (kolom: tanggal, keterangan, kategori, jumlah).
            </p>
          </div>
        </div>
        {profile.sheetServiceEmail ? (
          <p className="rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-muted">
            Agar bisa menulis, bagikan spreadsheet-mu (akses <b>Editor</b>) ke:{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-accent">
              {profile.sheetServiceEmail}
            </code>
          </p>
        ) : (
          <p className="rounded-xl bg-white/5 p-3 text-xs leading-relaxed text-muted">
            Sinkronisasi belum aktif — kredensial Google belum dikonfigurasi di
            server (lihat DEPLOY.md). Tautan tetap bisa disimpan sekarang.
          </p>
        )}
        <input
          className="input"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/d/..."
          aria-label="URL Google Sheet"
        />
        <button
          onClick={handleSave}
          className="self-start rounded-full bg-white/8 px-5 py-2 text-sm font-semibold transition-colors hover:bg-white/15"
        >
          Simpan tautan
        </button>
      </section>

      {/* Keluar & zona berbahaya */}
      <section className="glass rounded-2xl p-5">
        <button
          onClick={handleSignOut}
          className="w-full rounded-xl bg-white/8 py-3 font-semibold transition-colors hover:bg-white/15"
        >
          Keluar
        </button>
      </section>

      <section className="rounded-2xl border border-danger/25 p-5">
        <h2 className="mb-1 text-sm font-semibold text-danger">Zona berbahaya</h2>
        <p className="mb-4 text-xs text-muted">
          Menghapus semua catatan pengeluaran dari akunmu secara permanen.
        </p>
        <button
          onClick={handleClearAll}
          className="rounded-full border border-danger/40 px-5 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
        >
          Hapus semua catatan
        </button>
      </section>
    </div>
  );
}
