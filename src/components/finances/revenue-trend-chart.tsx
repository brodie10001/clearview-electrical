import type { MonthBucket } from "@/lib/finances";

// Hand-rolled bar chart -- no charting library in this project. Bars are
// height-scaled against the highest month in the series; a flat zero series
// just renders empty bars rather than dividing by zero.
export function RevenueTrendChart({ months }: { months: MonthBucket[] }) {
  if (months.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-500">Not enough data yet.</p>;
  }

  const max = Math.max(...months.map((m) => m.revenue), 0);

  return (
    <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
      {months.map((m) => {
        const heightPercent = max > 0 ? Math.max((m.revenue / max) * 100, m.revenue > 0 ? 4 : 0) : 0;
        return (
          <div key={m.monthKey} className="flex w-9 shrink-0 flex-col items-center gap-1">
            <div className="flex h-28 w-full items-end justify-center">
              <div
                title={`${m.label}: $${m.revenue.toFixed(2)}`}
                className="w-5 rounded-t bg-amber-500 transition-all dark:bg-amber-400"
                style={{ height: `${heightPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-neutral-500">{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}
