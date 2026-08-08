import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { TodaysJobsWidget, type TodayJob } from "@/components/dashboard/todays-jobs-widget";
import {
  NeedsAttentionWidget,
  type StalledJob,
} from "@/components/dashboard/needs-attention-widget";
import {
  RecentActivityWidget,
  type ActivityItem,
} from "@/components/dashboard/recent-activity-widget";
import { PersonalNotesWidget } from "@/components/dashboard/personal-notes-widget";
import { WeatherWidget } from "@/components/dashboard/weather-widget";
import { todayDateString } from "@/lib/format";
import type { JobStatus } from "@/types/database";

const STALLED_STATUSES = new Set(["On Hold", "Waiting"]);
const OPEN_STATUSES: JobStatus[] = [
  "New",
  "Quoting",
  "Awaiting Approval",
  "Ready to Schedule",
  "Scheduled",
  "Travelling",
  "On Site",
  "On Hold",
  "Waiting",
];
const STALE_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // 3 days with no update

interface JobRow {
  id: string;
  job_status: TodayJob["job_status"];
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
  jobs: Pick<JobRow, "id" | "job_status" | "updated_at" | "properties">[],
): StalledJob[] {
  const now = Date.now();
  return jobs
    .filter(
      (job) =>
        STALLED_STATUSES.has(job.job_status) ||
        now - new Date(job.updated_at).getTime() > STALE_AFTER_MS,
    )
    .slice(0, 5)
    .map((job) => ({
      id: job.id,
      job_status: job.job_status,
      updated_at: job.updated_at,
      property_address: job.properties?.address ?? "Unknown property",
    }));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user!.id)
    .single();

  const firstName = (profile?.full_name || profile?.email || "there").split(" ")[0];

  const today = todayDateString();

  const [todayVisitsRes, openJobsRes, recentJobsRes, recentDocsRes, recentQuotesRes, notesRes] = await Promise.all([
    supabase
      .from("job_visits")
      .select("id, start_time, jobs(id, job_status, properties(address), contacts(name))")
      .eq("scheduled_date", today)
      .order("start_time", { ascending: true, nullsFirst: false })
      .returns<TodayVisitRow[]>(),
    supabase
      .from("jobs")
      .select("id, job_status, updated_at, properties(address)")
      .in("job_status", OPEN_STATUSES)
      .order("updated_at", { ascending: true })
      .limit(20)
      .returns<Pick<JobRow, "id" | "job_status" | "updated_at" | "properties">[]>(),
    supabase
      .from("jobs")
      .select("id, job_status, updated_at, properties(address)")
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
      .from("personal_note_items")
      .select("id, text, is_checked, position")
      .eq("user_id", user!.id)
      .order("is_checked", { ascending: true })
      .order("position", { ascending: true }),
  ]);

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

  const stalledJobs = selectStalledJobs(openJobsRes.data ?? []);

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

  const recentActivity = [...jobActivity, ...docActivity, ...quoteActivity]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  return (
    <div className="flex flex-col">
      <DashboardHeader firstName={firstName} />

      <div className="grid grid-cols-1 gap-4 p-4 sm:p-6 lg:grid-cols-2">
        <TodaysJobsWidget jobs={todayJobs} />
        <NeedsAttentionWidget jobs={stalledJobs} />
        <RecentActivityWidget items={recentActivity} />
        <div className="flex flex-col gap-4">
          <PersonalNotesWidget initialItems={notesRes.data ?? []} />
          <WeatherWidget />
        </div>
      </div>
    </div>
  );
}
