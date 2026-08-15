import Link from "next/link";
import { AlertTriangle, FileClock, Receipt, PartyPopper } from "lucide-react";
import { WidgetCard } from "./widget-card";
import { JobStatusBadge } from "@/components/ui/status-badge";
import { formatRelative } from "@/lib/format";
import type { JobStatus, InvoiceStatus } from "@/types/database";

// Each kind of thing a contractor might need to follow up on. Adding a new
// state (jobs completed but not invoiced, quotes nearing expiry, ...) means
// adding a union member here and a case in ItemRow below -- the widget
// itself and its sorting/rendering shell don't change.
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
    }
  | {
      kind: "overdue_invoice";
      invoiceId: string;
      invoiceNumber: string;
      customerName: string | null;
      amount: number;
      daysOverdue: number;
    };

function itemKey(item: AttentionItem) {
  if (item.kind === "stalled_job") return `stalled_job-${item.jobId}`;
  if (item.kind === "quote_awaiting_approval") return `quote_awaiting_approval-${item.quoteId}`;
  return `overdue_invoice-${item.invoiceId}`;
}

function itemHref(item: AttentionItem) {
  if (item.kind === "stalled_job") return `/jobs/${item.jobId}`;
  if (item.kind === "quote_awaiting_approval") return `/quotes/${item.quoteId}`;
  return `/invoices/${item.invoiceId}`;
}

function ItemRow({ item }: { item: AttentionItem }) {
  if (item.kind === "overdue_invoice") {
    return (
      <>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400">
          <Receipt className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
            {item.customerName ?? "Unknown customer"} — ${item.amount.toFixed(2)}
          </p>
          <p className="truncate text-xs text-neutral-500">{item.invoiceNumber}</p>
        </div>
        <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {item.daysOverdue} day{item.daysOverdue === 1 ? "" : "s"} overdue
        </span>
      </>
    );
  }

  if (item.kind === "stalled_job") {
    return (
      <>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
            {item.propertyAddress}
          </p>
          <p className="truncate text-xs text-neutral-500">
            No update in {formatRelative(item.updatedAt)}
          </p>
        </div>
        <JobStatusBadge status={item.jobStatus} invoiceStatus={item.invoiceStatus} />
      </>
    );
  }

  return (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
        <FileClock className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
          {item.customerName ?? "Unknown customer"} — ${item.amount.toFixed(2)}
        </p>
        <p className="truncate text-xs text-neutral-500">
          {item.quoteNumber} · {item.propertyAddress} · Sent {formatRelative(item.sentAt)}
        </p>
      </div>
      <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
        Awaiting approval
      </span>
    </>
  );
}

export function NeedsAttentionWidget({ items }: { items: AttentionItem[] }) {
  return (
    <WidgetCard
      title="Needs Attention"
      icon={<AlertTriangle className="h-4 w-4 text-neutral-400" />}
      action={
        items.length > 0 ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            {items.length}
          </span>
        ) : null
      }
    >
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-6 text-center">
          <PartyPopper className="h-6 w-6 text-emerald-500" />
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
            You&apos;re all caught up 🎉
          </p>
          <p className="text-xs text-neutral-500">Nothing needs your attention right now.</p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((item) => (
            <li key={itemKey(item)}>
              <Link
                href={itemHref(item)}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
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
