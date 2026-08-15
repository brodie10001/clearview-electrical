import { createClient } from "@/lib/supabase/server";
import { getRequestUser } from "@/lib/supabase/request-user";
import { getCurrentProfile, getCurrentBusinessOverview } from "@/lib/data/current-business";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { TodaysJobsWidget, type TodayJob } from "@/components/dashboard/todays-jobs-widget";
import {
  NeedsAttentionWidget,
  type AttentionItem,
} from "@/components/dashboard/needs-attention-widget";
import {
  RecentActivityWidget,
  type ActivityItem,
} from "@/components/dashboard/recent-activity-widget";
import { PersonalNotesWidget } from "@/components/dashboard/personal-notes-widget";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { CalendarOverviewWidget, type UpcomingVisit } from "@/components/dashboard/calendar-overview-widget";
import { OnboardingBanner } from "@/components/dashboard/onboarding-banner";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CalendarClock, HardHat, FileClock, Wallet, CalendarRange } from "lucide-react";
import { todayDateString } from "@/lib/format";
import { isJobOpen } from "@/lib/job-status";
import { addDays, getWeekStart } from "@/lib/calendar-dates";
import type { JobStatus, InvoiceStatus, InvoiceRecordStatus } from "@/types/database";

const STALE_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // 3 days with no update

// Same rule the daily digest email uses (supabase/functions/daily-digest) --
// due_date has passed and the invoice isn't in a state where "overdue"
// stops meaning anything. Keep these in sync: the whole point of surfacing
// this in-app is that it must never disagree with what the email reports.
const NOT_OVERDUE_STATUSES = new Set<InvoiceRecordStatus>(["Paid", "Void", "Written Off"]);
const OUTSTANDING_STATUSES = new Set<InvoiceRecordStatus>(["Sent", "Partially Paid", "Overdue"]);

interface JobRow {
  id: string;
  job_status: TodayJob["job_status"];
  invoice_status: InvoiceStatus;
  updated_at: string;
  properties: { address: string } | null;
  contacts: { name: string } | null;
}

interface TodayVisitRow {
  id: string;
  start_time: string | null;
  assigned_worker: string | null;
  jobs: {
    id: string;
    job_status: JobStatus;
    properties: { address: string } | null;
    contacts: { name: string } | null;
  } | null;
}

function selectStalledJobs(
  jobs: Pick<JobRow, "id" | "job_status" | "invoice_status" | "updated_at" | "properties">[],
): Extract<AttentionItem, { kind: "stalled_job" }>[] {
  const now = Date.now();
  return jobs
    .filter((job) => isJobOpen(job.job_status, job.invoice_status))
    .filter((job) => now - new Date(job.updated_at).getTime() > STALE_AFTER_MS)
    .slice(0, 5)
    .map((job) => ({
      kind: "stalled_job" as const,
      jobId: job.id,
      jobStatus: job.job_status,
      invoiceStatus: job.invoice_status,
      updatedAt: job.updated_at,
      propertyAddress: job.properties?.address ?? "Unknown property",
    }));
}

// due_date/today are plain date strings (no timezone) -- parsed via UTC
// arithmetic only, same convention as formatVisitDate/daysBetween in the
// digest function, so this can't drift a day off depending on server tz.
function daysOverdue(dueDate: string, today: string) {
  const [fy, fm, fd] = dueDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const dueMs = Date.UTC(fy, fm - 1, fd);
  const todayMs = Date.UTC(ty, tm - 1, td);
  return Math.round((todayMs - dueMs) / 86_400_000);
}

interface OverdueInvoiceRow {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: InvoiceRecordStatus;
  jobs: { properties: { customers: { name: string } | null } | null } | null;
}

function selectOverdueInvoices(
  invoices: OverdueInvoiceRow[],
  today: string,
): Extract<AttentionItem, { kind: "overdue_invoice" }>[] {
  return invoices
    .filter((invoice) => !NOT_OVERDUE_STATUSES.has(invoice.status))
    .map((invoice) => ({
      kind: "overdue_invoice" as const,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.jobs?.properties?.customers?.name ?? null,
      amount: invoice.amount,
      daysOverdue: daysOverdue(invoice.due_date, today),
    }));
}

interface SentQuoteRow {
  id: string;
  quote_number: string;
  total: number;
  updated_at: string;
  jobs: { properties: { address: string; customers: { name: string } | null } | null } | null;
}

// Sent (not Draft) and not yet Accepted/Rejected -- genuinely waiting on the
// customer, which is what "Needs Attention" should actually mean.
function selectQuotesAwaitingApproval(
  quotes: SentQuoteRow[],
): Extract<AttentionItem, { kind: "quote_awaiting_approval" }>[] {
  return quotes.map((quote) => ({
    kind: "quote_awaiting_approval" as const,
    quoteId: quote.id,
    quoteNumber: quote.quote_number,
    customerName: quote.jobs?.properties?.customers?.name ?? null,
    propertyAddress: quote.jobs?.properties?.address ?? "Unknown property",
    amount: quote.total,
    sentAt: quote.updated_at,
  }));
}

interface UnpaidInvoiceRow {
  amount: number;
  status: InvoiceRecordStatus;
  payments: { amount: number }[];
}

function computeUnpaidTotal(invoices: UnpaidInvoiceRow[]) {
  const unpaid = invoices.filter((inv) => OUTSTANDING_STATUSES.has(inv.status));
  const total = unpaid.reduce((sum, inv) => {
    const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
    return sum + Math.max(0, inv.amount - paid);
  }, 0);
  return { total, count: unpaid.length };
}

interface UpcomingVisitRow {
  id: string;
  scheduled_date: string;
  start_time: string | null;
  jobs: { id: string; properties: { address: string } | null } | null;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getRequestUser();

  const today = todayDateString();
  const weekStart = getWeekStart(today);
  const weekEnd = addDays(weekStart, 6);
  const upcomingEnd = addDays(today, 6);

  const profile = await getCurrentProfile(user!.id);
  const canManageFinances = profile?.role === "owner" || profile?.role === "admin";

  const [
    businessOverview,
    todayVisitsRes,
    openJobsRes,
    recentJobsRes,
    recentDocsRes,
    recentQuotesRes,
    sentQuotesRes,
    overdueInvoicesRes,
    unpaidInvoicesRes,
    inProgressCountRes,
    weekVisitsRes,
    upcomingVisitsRes,
    notesRes,
  ] = await Promise.all([
    getCurrentBusinessOverview(),
    supabase
      .from("job_visits")
      .select(
        "id, start_time, assigned_worker, jobs!inner(id, job_status, properties(address), contacts(name))",
      )
      .eq("scheduled_date", today)
      .eq("jobs.archived", false)
      .order("start_time", { ascending: true, nullsFirst: false })
      .returns<TodayVisitRow[]>(),
    supabase
      .from("jobs")
      .select("id, job_status, invoice_status, updated_at, properties(address)")
      .eq("archived", false)
      .order("updated_at", { ascending: true })
      .limit(50)
      .returns<Pick<JobRow, "id" | "job_status" | "invoice_status" | "updated_at" | "properties">[]>(),
    supabase
      .from("jobs")
      .select("id, job_status, updated_at, properties(address)")
      .eq("archived", false)
      .order("updated_at", { ascending: false })
      .limit(5)
      .returns<Pick<JobRow, "id" | "job_status" | "updated_at" | "properties">[]>(),
    supabase
      .from("documents")
      .select("id, type, caption, created_at, property_id, properties(address)")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<
        {
          id: string;
          type: string;
          caption: string | null;
          created_at: string;
          property_id: string;
          properties: { address: string } | null;
        }[]
      >(),
    supabase
      .from("quotes")
      .select("id, quote_number, total, updated_at, jobs(properties(address, customers(name)))")
      .eq("status", "Accepted")
      .order("updated_at", { ascending: false })
      .limit(5)
      .returns<
        {
          id: string;
          quote_number: string;
          total: number;
          updated_at: string;
          jobs: { properties: { address: string; customers: { name: string } | null } | null } | null;
        }[]
      >(),
    supabase
      .from("quotes")
      .select("id, quote_number, total, updated_at, jobs(properties(address, customers(name)))")
      .eq("status", "Sent")
      .order("updated_at", { ascending: true })
      .limit(10)
      .returns<SentQuoteRow[]>(),
    supabase
      .from("invoices")
      .select("id, invoice_number, amount, due_date, status, jobs(properties(customers(name)))")
      .lt("due_date", today)
      .not("status", "in", '("Paid","Void","Written Off")')
      .order("due_date", { ascending: true })
      .limit(10)
      .returns<OverdueInvoiceRow[]>(),
    canManageFinances
      ? supabase
          .from("invoices")
          .select("amount, status, payments(amount)")
          .not("status", "in", '("Paid","Void","Written Off")')
          .returns<UnpaidInvoiceRow[]>()
      : Promise.resolve({ data: [] as UnpaidInvoiceRow[] }),
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("archived", false)
      .eq("job_status", "On Site"),
    supabase
      .from("job_visits")
      .select("id, jobs!inner(id)")
      .eq("jobs.archived", false)
      .gte("scheduled_date", weekStart)
      .lte("scheduled_date", weekEnd)
      .returns<{ id: string }[]>(),
    supabase
      .from("job_visits")
      .select("id, scheduled_date, start_time, jobs!inner(id, properties(address))")
      .eq("jobs.archived", false)
      .gt("scheduled_date", today)
      .lte("scheduled_date", upcomingEnd)
      .order("scheduled_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: false })
      .limit(6)
      .returns<UpcomingVisitRow[]>(),
    supabase
      .from("personal_note_items")
      .select("id, text, is_checked, position")
      .eq("user_id", user!.id)
      .order("is_checked", { ascending: true })
      .order("position", { ascending: true }),
  ]);

  const firstName = (profile?.full_name || profile?.email || "there").split(" ")[0];

  const workerIds = Array.from(
    new Set((todayVisitsRes.data ?? []).map((v) => v.assigned_worker).filter((id): id is string => !!id)),
  );
  const workerNamesRes =
    workerIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", workerIds)
      : { data: [] as { id: string; full_name: string | null; email: string | null }[] };
  const workerNameById = new Map(
    (workerNamesRes.data ?? []).map((w) => [w.id, w.full_name || w.email || "Unassigned"]),
  );

  const todayJobs: TodayJob[] = (todayVisitsRes.data ?? [])
    .filter((visit) => visit.jobs)
    .map((visit) => ({
      visitId: visit.id,
      jobId: visit.jobs!.id,
      job_status: visit.jobs!.job_status,
      start_time: visit.start_time,
      property_address: visit.jobs!.properties?.address ?? "Unknown property",
      contact_name: visit.jobs!.contacts?.name ?? null,
      worker_name: visit.assigned_worker ? (workerNameById.get(visit.assigned_worker) ?? null) : null,
    }));

  const scheduledTodayCount = todayJobs.filter((j) => j.job_status === "Scheduled").length;

  // Overdue invoices (money already owed) lead, then quotes waiting on the
  // customer (a clear, actionable follow-up), then generically stalled
  // jobs -- capped so the widget stays a quick glance rather than a second
  // task list.
  const attentionItems: AttentionItem[] = [
    ...selectOverdueInvoices(overdueInvoicesRes.data ?? [], today),
    ...selectQuotesAwaitingApproval(sentQuotesRes.data ?? []),
    ...selectStalledJobs(openJobsRes.data ?? []),
  ].slice(0, 6);

  const jobActivity: ActivityItem[] = (recentJobsRes.data ?? []).map((job) => ({
    id: job.id,
    type: "job",
    timestamp: job.updated_at,
    title: job.properties?.address ?? "Unknown property",
    subtitle: `Job status: ${job.job_status}`,
    href: `/jobs/${job.id}`,
  }));

  const docActivity: ActivityItem[] = (recentDocsRes.data ?? []).map((doc) => ({
    id: doc.id,
    type: "document",
    timestamp: doc.created_at,
    title: doc.caption || `New ${doc.type.replace("_", " ")}`,
    subtitle: doc.properties?.address ?? "Unknown property",
    href: `/properties/${doc.property_id}`,
  }));

  const quoteActivity: ActivityItem[] = (recentQuotesRes.data ?? []).map((quote) => ({
    id: quote.id,
    type: "quote",
    timestamp: quote.updated_at,
    title: `${quote.quote_number} accepted`,
    subtitle: [quote.jobs?.properties?.customers?.name, `$${quote.total.toFixed(2)}`]
      .filter(Boolean)
      .join(" · "),
    href: `/quotes/${quote.id}`,
  }));

  // Display limit only -- doesn't touch any underlying history, just how
  // many of the merged, newest-first events the widget shows.
  const recentActivity = [...jobActivity, ...docActivity, ...quoteActivity]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  const upcomingVisits: UpcomingVisit[] = (upcomingVisitsRes.data ?? [])
    .filter((v) => v.jobs)
    .map((v) => ({
      id: v.id,
      jobId: v.jobs!.id,
      scheduledDate: v.scheduled_date,
      startTime: v.start_time,
      propertyAddress: v.jobs!.properties?.address ?? "Unknown property",
    }));

  const { total: unpaidTotal, count: unpaidCount } = computeUnpaidTotal(unpaidInvoicesRes.data ?? []);
  const sentQuotesTotal = (sentQuotesRes.data ?? []).reduce((sum, q) => sum + q.total, 0);

  return (
    <div className="flex flex-col">
      <DashboardHeader
        firstName={firstName}
        displayName={profile?.full_name || profile?.email || "You"}
        role={profile?.role ?? "owner"}
      />

      {!businessOverview.onboardingCompletedAt ? (
        <div className="px-4 pt-4 sm:px-6 sm:pt-6">
          <OnboardingBanner />
        </div>
      ) : null}

      <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          <KpiCard
            icon={CalendarClock}
            label="Jobs Today"
            value={String(todayJobs.length)}
            support={`${scheduledTodayCount} scheduled`}
            tone="blue"
          />
          <KpiCard
            icon={HardHat}
            label="In Progress"
            value={String(inProgressCountRes.count ?? 0)}
            support="jobs on site"
            tone="green"
          />
          {canManageFinances ? (
            <>
              <KpiCard
                icon={FileClock}
                label="Awaiting Quotes"
                value={String(sentQuotesRes.data?.length ?? 0)}
                support={`$${sentQuotesTotal.toFixed(2)} pending`}
                tone="orange"
              />
              <KpiCard
                icon={Wallet}
                label="Unpaid"
                value={`$${unpaidTotal.toFixed(2)}`}
                support={`${unpaidCount} invoice${unpaidCount === 1 ? "" : "s"}`}
                tone={unpaidCount > 0 ? "red" : "neutral"}
              />
            </>
          ) : null}
          <KpiCard
            icon={CalendarRange}
            label="This Week"
            value={String(weekVisitsRes.data?.length ?? 0)}
            support="visits scheduled"
            tone="neutral"
          />
        </div>

        <TodaysJobsWidget jobs={todayJobs} />

        <NeedsAttentionWidget items={attentionItems} />

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <RecentActivityWidget items={recentActivity} />
          <CalendarOverviewWidget visits={upcomingVisits} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <PersonalNotesWidget initialItems={notesRes.data ?? []} />
          <WeatherWidget />
        </div>
      </div>
    </div>
  );
}
