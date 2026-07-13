import { formatRupiah } from "@/lib/format";

export default function BudgetBar({
  spent,
  limit,
  label,
}: {
  spent: number;
  limit: number;
  label: string;
}) {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const over = limit > 0 && spent > limit;
  const near = !over && limit > 0 && spent >= limit * 0.8;
  const barColor = over
    ? "bg-danger"
    : near
      ? "bg-gold"
      : "bg-gradient-to-r from-accent to-accent-soft";

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className={over ? "font-semibold text-danger" : near ? "font-semibold text-gold" : "text-muted"}>
          {limit > 0
            ? over
              ? `Lewat ${formatRupiah(spent - limit)}`
              : `Sisa ${formatRupiah(limit - spent)}`
            : "Belum diatur"}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
