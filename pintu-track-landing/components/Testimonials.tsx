import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

const testimonials = [
  {
    name: "Rina Amelia",
    role: "Content writer, Jakarta",
    initial: "R",
    quote:
      "Baru kali ini konsisten nyatet pengeluaran lebih dari sebulan. Rahasianya ya karena cuma perlu chat bot, nggak perlu buka aplikasi apa pun.",
  },
  {
    name: "Dimas Prakoso",
    role: "Mahasiswa, Yogyakarta",
    initial: "D",
    quote:
      "Fitur batas harian juara. Pas mau jajan boba, bot bilang sisa budget tinggal 15rb — akhirnya nggak jadi, dan itu terjadi berkali-kali.",
  },
  {
    name: "Sari Wulandari",
    role: "Freelance designer, Bandung",
    initial: "S",
    quote:
      "Semua datanya masuk otomatis ke Google Sheets pribadiku. Aku bisa bikin analisis sendiri tanpa terkunci di satu aplikasi.",
  },
];

export default function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <SectionHeading
        eyebrow="Kata mereka"
        title="Dari yang tadinya malas mencatat"
      />
      <div className="grid gap-6 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.1}>
            <figure className="glass flex h-full flex-col rounded-2xl p-8">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="mb-4 text-accent/60"
              >
                <path d="M10 7H6a3 3 0 00-3 3v4a3 3 0 003 3h2a3 3 0 003-3v-7a3 3 0 00-1-2.2zM21 7h-4a3 3 0 00-3 3v4a3 3 0 003 3h2a3 3 0 003-3v-7a3 3 0 00-1-2.2z" opacity="0.9" transform="scale(0.9) translate(1.5 1.5)" />
              </svg>
              <blockquote className="flex-1 leading-relaxed text-muted">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-accent/40 to-accent-soft/40 font-semibold">
                  {t.initial}
                </span>
                <span>
                  <span className="block text-sm font-semibold">{t.name}</span>
                  <span className="block text-xs text-muted">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
