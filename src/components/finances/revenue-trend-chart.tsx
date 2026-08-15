import type { MonthBucket } from "@/lib/finances";

const GRID_FRACTIONS = [1, 0.75, 0.5, 0.25, 0];

function axisLabel(n: number) {
  return `$${Math.round(n).toLocaleString()}`;
}

function exactLabel(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Hand-rolled bar chart -- no charting library in this project. Bars are
// height-scaled against the highest month in the series; a flat zero series
// just renders empty bars rather than dividing by zero. accentColor comes
// from the business's own brand settings so this matches the rest of the
// app rather than a fixed Tailwind colour.
export function RevenueTrendChart({
  months,
  accentColor = "#f59e0b",
}: {
  months: MonthBucket[];
  accentColor?: string;
}) {
  if (months.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-500">Not enough data yet.</p>;
  }

  const max = Math.max(...months.map((m) => m.revenue), 0);

  return (
    <div className="flex gap-3">
      <div className="flex h-32 shrink-0 flex-col justify-between text-right text-[10px] text-neutral-400">
        {GRID_FRACTIONS.map((f) => (
          <span key={f}>{axisLabel(max * f)}</span>
        ))}
      </div>

      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="relative h-32" style={{ width: `${months.length * 26}px`, minWidth: "100%" }}>
          <div className="absolute inset-0 flex flex-col justify-between">
            {GRID_FRACTIONS.map((f) => (
              <div key={f} className="border-t border-neutral-100 dark:border-neutral-800" />
            ))}
          </div>

          <div className="absolute inset-0 flex items-end gap-1.5 px-1">
            {months.map((m) => {
              const heightPercent =
                max > 0 ? Math.max((m.revenue / max) * 100, m.revenue > 0 ? 4 : 0) : 0;
              return (
                <div key={m.monthKey} className="group relative flex h-full w-5 shrink-0 items-end">
                  <div
                    className="w-5 rounded-t transition-all"
                    style={{ height: `${heightPercent}%`, backgroundColor: accentColor }}
                  />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-neutral-100 dark:text-neutral-900">
                    {m.label}: {exactLabel(m.revenue)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-1.5 flex gap-1.5 px-1" style={{ width: `${months.length * 26}px` }}>
          {months.map((m) => (
            <span key={m.monthKey} className="w-5 shrink-0 text-center text-[10px] text-neutral-500">
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
