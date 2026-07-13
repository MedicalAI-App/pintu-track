"use client";

import { motion, useReducedMotion } from "framer-motion";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

const bars = [42, 65, 50, 80, 58, 90, 70, 62, 76, 55, 84, 68];
const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const categories = [
  { name: "🍔 Makanan & Minuman", pct: 42, amount: "Rp840.000" },
  { name: "🚌 Transportasi", pct: 26, amount: "Rp520.000" },
  { name: "🎬 Hiburan", pct: 18, amount: "Rp360.000" },
  { name: "🛒 Belanja", pct: 14, amount: "Rp280.000" },
];

export default function DashboardPreview() {
  const reduce = useReducedMotion();

  return (
    <section className="relative py-24 sm:py-32">
      <div className="pointer-events-none absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-accent-soft/10 blur-[140px]" />
      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Dasbor keuangan"
          title="Akhir bulan, semuanya jadi jelas"
          subtitle="Grafik bulanan dan rincian kategori menunjukkan persis ke mana uangmu pergi."
        />
        <Reveal>
          <div className="glass mx-auto max-w-4xl rounded-3xl p-6 sm:p-10">
            <div className="grid gap-8 md:grid-cols-5">
              {/* Grafik bulanan */}
              <div className="md:col-span-3">
                <div className="mb-6 flex items-end justify-between">
                  <div>
                    <p className="text-sm text-muted">Pengeluaran bulan ini</p>
                    <p className="text-3xl font-bold tracking-tight">Rp2.000.000</p>
                  </div>
                  <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                    ↓ 12% vs bulan lalu
                  </span>
                </div>
                <div className="flex h-40 items-end gap-2">
                  {bars.map((h, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-2">
                      <motion.div
                        initial={reduce ? { opacity: 0 } : { height: 0 }}
                        whileInView={
                          reduce ? { opacity: 1 } : { height: `${h}%` }
                        }
                        viewport={{ once: true }}
                        transition={{
                          duration: 0.7,
                          delay: i * 0.05,
                          ease: "easeOut",
                        }}
                        style={reduce ? { height: `${h}%` } : undefined}
                        className={`w-full rounded-t-md ${
                          i === 5
                            ? "bg-gradient-to-t from-accent to-accent-soft"
                            : "bg-white/10"
                        }`}
                      />
                      <span className="text-[10px] text-muted">{months[i]}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Rincian kategori */}
              <div className="md:col-span-2">
                <p className="mb-5 text-sm text-muted">Rincian kategori</p>
                <div className="flex flex-col gap-4">
                  {categories.map((c, i) => (
                    <div key={c.name}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span>{c.name}</span>
                        <span className="text-muted">{c.amount}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/8">
                        <motion.div
                          initial={reduce ? { opacity: 0 } : { width: 0 }}
                          whileInView={
                            reduce ? { opacity: 1 } : { width: `${c.pct}%` }
                          }
                          viewport={{ once: true }}
                          transition={{
                            duration: 0.8,
                            delay: 0.2 + i * 0.1,
                            ease: "easeOut",
                          }}
                          style={reduce ? { width: `${c.pct}%` } : undefined}
                          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-soft"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl bg-accent/10 p-4 text-sm">
                  <p className="font-semibold text-accent">Sisa anggaran: Rp1.000.000</p>
                  <p className="mt-1 text-muted">Masih aman sampai akhir bulan 👍</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
