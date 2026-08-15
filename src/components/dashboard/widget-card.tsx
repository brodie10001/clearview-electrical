import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { clsx } from "clsx";

export function WidgetCard({
  id,
  title,
  icon,
  action,
  footerHref,
  footerLabel,
  children,
  className,
}: {
  id?: string;
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  // Optional "View X →" link rendered as a footer row -- kept separate from
  // `action` (which sits top-right, e.g. a count pill) so a widget can have
  // both without cramming them together.
  footerHref?: string;
  footerLabel?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={clsx(
        "flex flex-col rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm shadow-neutral-900/[0.02] sm:p-5 dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      <div className="flex-1">{children}</div>
      {footerHref && footerLabel ? (
        <Link
          href={footerHref}
          className="mt-3.5 flex items-center justify-center gap-1 border-t border-neutral-100 pt-3 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:border-neutral-800 dark:text-amber-400"
        >
          {footerLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </section>
  );
}
