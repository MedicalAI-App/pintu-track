"use client";

import { motion, useReducedMotion } from "framer-motion";
import SectionHeading from "./SectionHeading";

type Bubble = {
  from: "user" | "bot";
  lines: string[];
};

const conversation: Bubble[] = [
  { from: "user", lines: ["Beli kopi 25rb"] },
  {
    from: "bot",
    lines: [
      "✅ Tercatat: Rp25.000 — Beli kopi",
      "Kategori: 🍔 Makanan & Minuman",
      "Total hari ini: Rp100.000",
      "Sisa anggaran harian: Rp50.000",
    ],
  },
  { from: "user", lines: ["sisa budget bulan ini?"] },
  {
    from: "bot",
    lines: [
      "💰 Sisa anggaran bulan ini: Rp1.250.000",
      "dari Rp2.000.000 (62% aman) 👍",
    ],
  },
];

export default function ChatDemo() {
  const reduce = useReducedMotion();

  return (
    <section id="demo" className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[140px]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Lihat sendiri"
          title="Ngobrol biasa, tercatat otomatis"
          subtitle="Tanpa form, tanpa dropdown. Bot memahami nominal, keterangan, dan kategorinya dari satu kalimat."
        />
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.5 } } }}
          className="glass mx-auto max-w-md rounded-3xl p-4 sm:p-6"
        >
          <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-soft font-bold text-background">
              P
            </div>
            <div>
              <p className="font-semibold leading-tight">PintuTrack Bot</p>
              <p className="text-xs text-accent">online</p>
            </div>
            <svg
              className="ml-auto text-muted"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M21.4 4.1L2.9 11.3c-.9.4-.9 1.6.1 1.9l4.6 1.4 1.8 5.6c.3.9 1.4 1 2 .3l2.6-2.9 4.8 3.5c.7.5 1.8.1 2-.8l3-14.6c.2-1-.8-1.9-1.4-1.6z" />
            </svg>
          </div>
          <div className="flex flex-col gap-3">
            {conversation.map((b, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 },
                  show: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: { duration: 0.4, ease: "easeOut" },
                  },
                }}
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  b.from === "user"
                    ? "self-end rounded-br-md bg-gradient-to-r from-accent to-accent-soft text-background"
                    : "self-start rounded-bl-md bg-white/8 text-foreground"
                }`}
              >
                {b.lines.map((line, j) => (
                  <p key={j} className={j > 0 ? "mt-1 text-[13px] opacity-90" : ""}>
                    {line}
                  </p>
                ))}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
