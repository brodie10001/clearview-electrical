import { Send, Eye, CheckCircle2, XCircle } from "lucide-react";
import { formatDate, formatTime } from "@/lib/format";
import type { QuoteActivityType } from "@/types/database";

export interface QuoteActivityItem {
  id: string;
  event_type: QuoteActivityType;
  note: string | null;
  created_at: string;
}

const ICONS: Record<QuoteActivityType, typeof Send> = {
  Sent: Send,
  Viewed: Eye,
  Accepted: CheckCircle2,
  Declined: XCircle,
};

const COLORS: Record<QuoteActivityType, string> = {
  Sent: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
  Viewed: "text-neutral-500 bg-neutral-100 dark:bg-neutral-800",
  Accepted: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
  Declined: "text-red-500 bg-red-50 dark:bg-red-500/10",
};

export function QuoteActivityTimeline({ items }: { items: QuoteActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-neutral-500">No activity yet — share the quote to get started.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const Icon = ICONS[item.event_type];
        return (
          <li key={item.id} className="flex items-start gap-2.5">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${COLORS[item.event_type]}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                {item.event_type}
              </p>
              <p className="text-xs text-neutral-500">
                {formatDate(item.created_at)} at {formatTime(item.created_at)}
                {item.note ? ` — "${item.note}"` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
