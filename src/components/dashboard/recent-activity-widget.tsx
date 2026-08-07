import Link from "next/link";
import { Briefcase, ImageIcon } from "lucide-react";
import { WidgetCard } from "./widget-card";
import { formatRelative } from "@/lib/format";

export interface ActivityItem {
  id: string;
  type: "job" | "document";
  timestamp: string;
  title: string;
  subtitle: string;
  href: string;
}

export function RecentActivityWidget({ items }: { items: ActivityItem[] }) {
  return (
    <WidgetCard title="Recent Activity">
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-neutral-500">No recent activity.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((item) => {
            const Icon = item.type === "job" ? Briefcase : ImageIcon;
            return (
              <li key={`${item.type}-${item.id}`}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {item.title}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{item.subtitle}</p>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {formatRelative(item.timestamp)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
