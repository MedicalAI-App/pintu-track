"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/",
    label: "Catat",
    icon: (
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    ),
  },
  {
    href: "/dasbor",
    label: "Dasbor",
    icon: (
      <>
        <path d="M5 20V12" strokeLinecap="round" />
        <path d="M12 20V4" strokeLinecap="round" />
        <path d="M19 20v-6" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/anggaran",
    label: "Anggaran",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/profil",
    label: "Profil",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" strokeLinecap="round" />
      </>
    ),
  },
];

export default function AppNav() {
  const pathname = usePathname();

  if (pathname === "/masuk") return null;

  return (
    <>
      {/* Top bar (desktop) */}
      <header className="fixed inset-x-0 top-0 z-40 hidden border-b border-white/8 bg-background/80 backdrop-blur md:block">
        <nav className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-soft text-sm font-bold text-background">
              P
            </span>
            PintuTrack
          </Link>
          <div className="flex items-center gap-1">
            {tabs.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent/15 text-accent"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Bottom tab bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-background/90 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex flex-col items-center gap-1 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] text-[11px] font-medium transition-colors ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  {t.icon}
                </svg>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
