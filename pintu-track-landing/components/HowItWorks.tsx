import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

const steps = [
  {
    num: "1",
    title: "Daftar dalam semenit",
    desc: "Buat akun dengan email. Atur batas anggaran harian dan bulananmu sekali saja.",
  },
  {
    num: "2",
    title: "Hubungkan Telegram",
    desc: "Klik tautan unik dari halaman profil — bot langsung mengenali akunmu.",
  },
  {
    num: "3",
    title: "Catat & pantau",
    desc: "Catat lewat chat atau web, lalu lihat semuanya rapi di dasbor dan Google Sheets.",
  },
];

export default function HowItWorks() {
  return (
    <section id="cara-kerja" className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <SectionHeading
        eyebrow="Cara kerja"
        title="Mulai dalam tiga langkah"
      />
      <div className="relative grid gap-10 md:grid-cols-3 md:gap-6">
        <div
          className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent md:block"
          aria-hidden
        />
        {steps.map((s, i) => (
          <Reveal key={s.num} delay={i * 0.15} className="relative">
            <div className="flex flex-col items-center text-center">
              <div className="btn-glow z-10 mb-6 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-soft text-xl font-bold text-background">
                {s.num}
              </div>
              <h3 className="mb-3 text-xl font-semibold">{s.title}</h3>
              <p className="max-w-xs leading-relaxed text-muted">{s.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
