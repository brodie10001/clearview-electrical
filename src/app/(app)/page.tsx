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
import { OnboardingBanner } from "@/components/dashboard/onboarding-banner";
import { todayDateString } from "@/lib/format";
import { isJobOpen } from "@/lib/job-status";
import type { JobStatus, InvoiceStatus } from "@/types/database";

const STALE_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // 3 days with no update

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

export default async function DashboardPage() {
  const supabase = await createClient();
  const user = await getRequestUser();

  const today = todayDateString();

  const [
    profile,
    businessOverview,
    todayVisitsRes,
    openJobsRes,
    recentJobsRes,
    recentDocsRes,
    recentQuotesRes,
    sentQuotesRes,
    notesRes,
  ] = await Promise.all([
    getCurrentProfile(user!.id),
    getCurrentBusinessOverview(),
    supabase
      .from("job_visits")
      .select("id, start_time, jobs!inner(id, job_status, properties(address), contacts(name))")
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
      .from("personal_note_items")
      .select("id, text, is_checked, position")
      .eq("user_id", user!.id)
      .order("is_checked", { ascending: true })
      .order("position", { ascending: true }),
  ]);

  const firstName = (profile?.full_name || profile?.email || "there").split(" ")[0];

  const todayJobs: TodayJob[] = (todayVisitsRes.data ?? [])
    .filter((visit) => visit.jobs)
    .map((visit) => ({
      visitId: visit.id,
      jobId: visit.jobs!.id,
      job_status: visit.jobs!.job_status,
      start_time: visit.start_time,
      property_address: visit.jobs!.properties?.address ?? "Unknown property",
      contact_name: visit.jobs!.contacts?.name ?? null,
    }));

  // Quotes waiting on the customer take priority (a clear, actionable
  // follow-up) over generically stalled jobs, then cap the combined list so
  // the widget stays a quick glance rather than a second task list.
  const attentionItems: AttentionItem[] = [
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

  return (
    <div className="flex flex-col">
      <DashboardHeader firstName={firstName} />

      {!businessOverview.onboardingCompletedAt ? (
        <div className="px-4 pt-4 sm:px-6 sm:pt-6">
          <OnboardingBanner />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-2">
        <TodaysJobsWidget jobs={todayJobs} />
        <NeedsAttentionWidget items={attentionItems} />
        <RecentActivityWidget items={recentActivity} />
        <div className="flex flex-col gap-4">
          <PersonalNotesWidget initialItems={notesRes.data ?? []} />
          <WeatherWidget />
        </div>
      </div>
    </div>
  );
}
