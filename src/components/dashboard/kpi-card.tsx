import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";

export type KpiTone = "blue" | "green" | "orange" | "red" | "neutral";

const TONE_STYLES: Record<KpiTone, { icon: string; ring: string }> = {
  blue: { icon: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400", ring: "" },
  green: {
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    ring: "",
  },
  orange: {
    icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    ring: "",
  },
  red: { icon: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400", ring: "" },
  neutral: {
    icon: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    ring: "",
  },
};

export function KpiCard({
  icon: Icon,
  label,
  value,
  support,
  tone = "neutral",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  support?: string;
  tone?: KpiTone;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm shadow-neutral-900/[0.02] dark:border-neutral-800 dark:bg-neutral-900">
      <span
        className={clsx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          styles.icon,
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div>
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          {value}
        </p>
        {support ? <p className="mt-0.5 text-xs text-neutral-400">{support}</p> : null}
      </div>
    </div>
  );
}
