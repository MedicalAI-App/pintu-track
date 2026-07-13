import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

const problems = [
  {
    emoji: "🫠",
    title: "Lupa nyatet",
    desc: "Niat mencatat selalu ada, tapi buka aplikasi yang ribet setiap habis jajan itu melelahkan. Akhirnya bolong di hari ketiga.",
  },
  {
    emoji: "🌀",
    title: "Aplikasi terlalu rumit",
    desc: "Pilih akun, pilih dompet, pilih kategori, isi lima kolom... padahal cuma mau nyatet kopi 25 ribu.",
  },
  {
    emoji: "🕳️",
    title: "Uang lenyap entah ke mana",
    desc: "Akhir bulan saldo menipis tapi tidak ada catatan. Tidak tahu bocornya di makanan, transport, atau jajan impulsif.",
  },
];

export default function Problem() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <SectionHeading
        eyebrow="Masalahnya"
        title="Mencatat keuangan itu gampang. Konsistennya yang susah."
        subtitle="PintuTrack dibuat untuk satu hal: menghilangkan semua alasan untuk berhenti mencatat."
      />
      <div className="grid gap-6 md:grid-cols-3">
        {problems.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.1}>
            <div className="glass h-full rounded-2xl p-8 transition-transform duration-300 hover:-translate-y-1">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-white/5 text-2xl">
                {p.emoji}
              </div>
              <h3 className="mb-3 text-xl font-semibold">{p.title}</h3>
              <p className="leading-relaxed text-muted">{p.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
