"use client";

import { useEffect, useState } from "react";
import { SIGNUP_URL } from "@/lib/config";

const links = [
  { href: "#demo", label: "Demo" },
  { href: "#fitur", label: "Fitur" },
  { href: "#cara-kerja", label: "Cara Kerja" },
  { href: "#faq", label: "FAQ" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "glass" : "bg-transparent border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
        <a href="#" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-soft text-sm font-bold text-background">
            P
          </span>
          PintuTrack
        </a>
        <ul className="hidden items-center gap-8 text-sm text-muted md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href={SIGNUP_URL}
          className="rounded-full bg-gradient-to-r from-accent to-accent-soft px-5 py-2 text-sm font-semibold text-background transition-transform hover:scale-105"
        >
          Mulai Gratis
        </a>
      </nav>
    </header>
  );
}
