const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(n: number): string {
  return idr.format(n);
}

/** Format ringkas untuk label grafik: 850rb, 1,4jt */
export function formatShortRupiah(n: number): string {
  if (n >= 1_000_000) {
    const v = (n / 1_000_000).toFixed(1).replace(".", ",").replace(",0", "");
    return `${v}jt`;
  }
  return `${Math.round(n / 1000)}rb`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateLong(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isSameDay(iso: string, d: Date): boolean {
  const a = new Date(iso);
  return (
    a.getFullYear() === d.getFullYear() &&
    a.getMonth() === d.getMonth() &&
    a.getDate() === d.getDate()
  );
}

export function isSameMonth(iso: string, d: Date): boolean {
  const a = new Date(iso);
  return a.getFullYear() === d.getFullYear() && a.getMonth() === d.getMonth();
}
