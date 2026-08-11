import Link from "next/link";
import { AlertTriangle, FileClock } from "lucide-react";
import { WidgetCard } from "./widget-card";
import { JobStatusBadge } from "@/components/ui/status-badge";
import { formatRelative } from "@/lib/format";
import type { JobStatus, InvoiceStatus } from "@/types/database";

// Each kind of thing a contractor might need to follow up on. Adding a new
// state (overdue invoices, jobs completed but not invoiced, quotes nearing
// expiry, ...) means adding a union member here and a case in ItemRow below
// -- the widget itself and its sorting/rendering shell don't change.
export type AttentionItem =
  | {
      kind: "stalled_job";
      jobId: string;
      jobStatus: JobStatus;
      invoiceStatus: InvoiceStatus;
      updatedAt: string;
      propertyAddress: string;
    }
  | {
      kind: "quote_awaiting_approval";
      quoteId: string;
      quoteNumber: string;
      customerName: string | null;
      propertyAddress: string;
      amount: number;
      sentAt: string;
    };

function itemKey(item: AttentionItem) {
  return item.kind === "stalled_job" ? `stalled_job-${item.jobId}` : `quote_awaiting_approval-${item.quoteId}`;
}

function itemHref(item: AttentionItem) {
  return item.kind === "stalled_job" ? `/jobs/${item.jobId}` : `/quotes/${item.quoteId}`;
}

function ItemRow({ item }: { item: AttentionItem }) {
  if (item.kind === "stalled_job") {
    return (
      <>
        <div className="flex min-w-0 items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
              {item.propertyAddress}
            </p>
            <p className="truncate text-xs text-neutral-500">
              No update in {formatRelative(item.updatedAt)}
            </p>
          </div>
        </div>
        <JobStatusBadge status={item.jobStatus} invoiceStatus={item.invoiceStatus} />
      </>
    );
  }

  return (
    <>
      <div className="flex min-w-0 items-start gap-2.5">
        <FileClock className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
            {item.customerName ?? "Unknown customer"} — ${item.amount.toFixed(2)}
          </p>
          <p className="truncate text-xs text-neutral-500">
            {item.quoteNumber} · {item.propertyAddress} · Sent {formatRelative(item.sentAt)}
          </p>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
        Awaiting approval
      </span>
    </>
  );
}

export function NeedsAttentionWidget({ items }: { items: AttentionItem[] }) {
  return (
    <WidgetCard title="Needs Attention">
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-neutral-500">
          Nothing needs attention — nice work.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((item) => (
            <li key={itemKey(item)}>
              <Link
                href={itemHref(item)}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <ItemRow item={item} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
