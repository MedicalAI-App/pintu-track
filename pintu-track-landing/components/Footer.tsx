export default function Footer() {
  return (
    <footer className="border-t border-white/8">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row">
        <a href="#" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-soft text-xs font-bold text-background">
            P
          </span>
          PintuTrack
        </a>
        <ul className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted">
          <li>
            <a href="#fitur" className="transition-colors hover:text-foreground">
              Fitur
            </a>
          </li>
          <li>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </li>
          <li>
            <a href="#" className="transition-colors hover:text-foreground">
              Kebijakan Privasi
            </a>
          </li>
          <li>
            <a href="#" className="transition-colors hover:text-foreground">
              Kontak
            </a>
          </li>
        </ul>
        <p className="text-sm text-muted">
          © {new Date().getFullYear()} PintuTrack
        </p>
      </div>
    </footer>
  );
}
