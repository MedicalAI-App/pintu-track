"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { SIGNUP_URL } from "@/lib/config";

const HeroScene = dynamic(() => import("./HeroScene"), {
  ssr: false,
  loading: () => null,
});

function ScenePoster() {
  return (
    <div className="absolute inset-0">
      <div className="absolute right-[10%] top-1/2 h-[420px] w-[420px] -translate-y-1/2 rounded-full bg-accent/20 blur-[120px]" />
      <div className="absolute right-[22%] top-1/3 h-[200px] w-[200px] rounded-full bg-gold/10 blur-[80px]" />
    </div>
  );
}

export default function Hero() {
  const reduce = useReducedMotion();
  const [show3d, setShow3d] = useState(false);
  const [inView, setInView] = useState(true);
  const pointer = useRef({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Muat canvas setelah first paint agar LCP tetap milik headline
    if (!reduce) setShow3d(true);
  }, [reduce]);

  useEffect(() => {
    // Hentikan render loop 3D saat hero keluar dari viewport
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting)
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12 } },
  };
  const item = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" as const },
    },
  };

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[100svh] items-center overflow-hidden pt-16"
    >
      <ScenePoster />
      {/* Scene 3D: latar penuh di mobile (redup), setengah kanan di desktop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-35 lg:left-[45%] lg:opacity-100"
        aria-hidden
      >
        {show3d && <HeroScene pointer={pointer} active={inView} />}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-24">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="max-w-xl"
        >
          <motion.p
            variants={item}
            className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm text-muted"
          >
            <span className="h-2 w-2 rounded-full bg-accent" />
            Gratis · Tanpa kartu kredit
          </motion.p>
          <motion.h1
            variants={item}
            className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
          >
            Catat pengeluaran{" "}
            <span className="text-gradient">secepat kirim chat.</span>
          </motion.h1>
          <motion.p variants={item} className="mt-6 text-lg leading-relaxed text-muted">
            Cukup ketik <span className="font-medium text-foreground">&ldquo;Makan siang 30rb&rdquo;</span> ke
            bot Telegram — PintuTrack mencatatnya otomatis lengkap dengan
            kategori, memantau anggaranmu, dan menyinkronkan semuanya ke Google
            Sheets.
          </motion.p>
          <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href={SIGNUP_URL}
              className="btn-glow rounded-full bg-gradient-to-r from-accent to-accent-soft px-8 py-3.5 font-semibold text-background transition-transform hover:scale-105"
            >
              Mulai Gratis
            </a>
            <a
              href="#demo"
              className="glass rounded-full px-8 py-3.5 font-semibold transition-colors hover:bg-white/10"
            >
              Lihat Cara Kerjanya
            </a>
          </motion.div>
          <motion.p variants={item} className="mt-8 flex items-center gap-2 text-sm text-muted">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-accent">
              <path
                d="M12 2L4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            Data keuanganmu terenkripsi &amp; privat
          </motion.p>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background" />
    </section>
  );
}
