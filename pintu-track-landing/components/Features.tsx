import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";

const features = [
  {
    icon: (
      <path d="M13 2L4.5 12.5H11L10 22l8.5-10.5H13L13 2z" strokeLinejoin="round" />
    ),
    title: "Catatan Cepat",
    desc: "Buka web, ketik jumlah dan keterangan, simpan. Total harian langsung terbarui di layar utama.",
  },
  {
    icon: (
      <>
        <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.4 7.2 16.9l.9-5.4L4.2 7.7l5.4-.8L12 2z" strokeLinejoin="round" />
      </>
    ),
    title: "Kategori Otomatis",
    desc: "Ketik 'Beli kopi 25rb' — sistem paham itu Makanan & Minuman. Tanpa pilih-pilih dropdown.",
  },
  {
    icon: (
      <>
        <path d="M4 20V10" strokeLinecap="round" />
        <path d="M10 20V4" strokeLinecap="round" />
        <path d="M16 20v-8" strokeLinecap="round" />
        <path d="M22 20H2" strokeLinecap="round" />
      </>
    ),
    title: "Dasbor Bulanan",
    desc: "Grafik naik-turun pengeluaran tiap bulan plus rincian kategori — kelihatan jelas bocornya di mana.",
  },
  {
    icon: (
      <>
        <path d="M12 3a6 6 0 00-6 6v3.5L4 16h16l-2-3.5V9a6 6 0 00-6-6z" strokeLinejoin="round" />
        <path d="M10 20a2 2 0 004 0" strokeLinecap="round" />
      </>
    ),
    title: "Batas Anggaran",
    desc: "Tetapkan batas harian & bulanan. Diingatkan lewat web atau Telegram saat mendekati batas.",
  },
  {
    icon: (
      <path d="M21.4 4.1L2.9 11.3c-.9.4-.9 1.6.1 1.9l4.6 1.4 1.8 5.6c.3.9 1.4 1 2 .3l2.6-2.9 4.8 3.5c.7.5 1.8.1 2-.8l3-14.6c.2-1-.8-1.9-1.4-1.6z" strokeLinejoin="round" />
    ),
    title: "Bot Telegram",
    desc: "Catat dan cek saldo dari chat, di mana saja — bahkan sambil antre di kasir.",
  },
  {
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 3v18" />
      </>
    ),
    title: "Sinkron Google Sheets",
    desc: "Setiap catatan baru otomatis jadi baris baru di spreadsheet pribadimu. Datamu, milikmu.",
  },
];

export default function Features() {
  return (
    <section id="fitur" className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
      <SectionHeading
        eyebrow="Fitur utama"
        title="Semua yang kamu butuhkan. Tidak lebih."
        subtitle="Dirancang agar mencatat terasa seringan mengirim chat — dan datanya tetap milikmu."
      />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.1}>
            <div className="glass group h-full rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 hover:border-accent/30">
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/20">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  {f.icon}
                </svg>
              </div>
              <h3 className="mb-3 text-lg font-semibold">{f.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted">{f.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
