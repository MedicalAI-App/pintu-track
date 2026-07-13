import Reveal from "./Reveal";

export default function FinalCTA() {
  return (
    <section id="mulai" className="relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/15 blur-[140px]" />
      <Reveal className="relative mx-auto max-w-3xl px-5 text-center">
        <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
          Mulai hari ini,{" "}
          <span className="text-gradient">tahu ke mana uangmu pergi</span> bulan
          depan.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
          Gratis, tanpa kartu kredit, dan butuh kurang dari satu menit untuk
          mulai. Catatan pertamamu bisa dikirim dari Telegram hari ini juga.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#"
            className="btn-glow rounded-full bg-gradient-to-r from-accent to-accent-soft px-10 py-4 text-lg font-semibold text-background transition-transform hover:scale-105"
          >
            Mulai Gratis Sekarang
          </a>
        </div>
        <p className="mt-6 text-sm text-muted">
          🔒 Data terenkripsi &amp; privat · Batalkan kapan saja
        </p>
      </Reveal>
    </section>
  );
}
