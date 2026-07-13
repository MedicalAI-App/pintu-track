"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import SectionHeading from "./SectionHeading";

const faqs = [
  {
    q: "Apakah PintuTrack gratis?",
    a: "Ya. Semua fitur inti — pencatatan via web dan Telegram, dasbor, batas anggaran, dan sinkronisasi Google Sheets — gratis untuk digunakan.",
  },
  {
    q: "Apakah data keuangan saya aman?",
    a: "Data tersimpan di akunmu sendiri dan hanya bisa diakses setelah login. Akun Telegram ditautkan lewat tautan unik sehingga bot hanya menerima catatan dari kamu. Datamu tidak pernah dijual atau dibagikan.",
  },
  {
    q: "Harus punya Telegram untuk memakai PintuTrack?",
    a: "Tidak. Kamu bisa mencatat sepenuhnya lewat aplikasi web. Telegram hanyalah jalur ekstra yang membuat pencatatan lebih cepat saat sedang di luar.",
  },
  {
    q: "Bagaimana format chat ke bot-nya?",
    a: "Tulis saja seperti bicara biasa: 'Makan siang 30rb', 'Beli kopi 25000', atau 'parkir 2rb'. Bot otomatis memisahkan nominal, keterangan, dan kategorinya.",
  },
  {
    q: "Bagaimana cara kerja sinkronisasi Google Sheets?",
    a: "Hubungkan akun Google-mu sekali, lalu setiap pengeluaran baru — dari web maupun Telegram — otomatis bertambah sebagai baris baru di spreadsheet pribadimu. Tanpa ekspor manual.",
  },
  {
    q: "Bisa dipakai di HP?",
    a: "Tentu. Aplikasi web-nya responsif dan nyaman dibuka di HP, tablet, maupun laptop — ditambah bot Telegram yang memang hidup di HP-mu.",
  },
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-medium transition-colors hover:bg-white/5"
      >
        {q}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`shrink-0 text-accent transition-transform duration-300 ${
            open ? "rotate-45" : ""
          }`}
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <p className="px-6 pb-5 leading-relaxed text-muted">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-24 sm:py-32">
      <SectionHeading eyebrow="FAQ" title="Pertanyaan yang sering muncul" />
      <div className="flex flex-col gap-4">
        {faqs.map((f) => (
          <Item key={f.q} {...f} />
        ))}
      </div>
    </section>
  );
}
