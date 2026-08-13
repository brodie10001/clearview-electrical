// Fired once a day by a pg_cron schedule (see
// supabase/migrations/20260814093100_daily_digest.sql), not by a Database
// Webhook -- there's no single "row" this is reacting to, it has to look
// across every business itself. Sends one digest email per business
// covering tomorrow's scheduled visits and its currently-overdue invoices,
// using the same Gmail SMTP relay already configured for
// feedback-notification (same project secrets, no new email pathway).
//
// Every query below is explicitly scoped with `.eq("business_id", business.id)`
// on its own table, even though a couple of them also flow through a join --
// this function runs with the service role key (RLS does not apply), so
// that explicit filter on every query is the only thing standing between
// "each business gets its own digest" and "every business gets everyone's
// data". Keep it that way: don't refactor this into one global query
// grouped in application code without preserving the same guarantee.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
const APP_URL = Deno.env.get("APP_URL")?.trim();
const SMTP_HOST = Deno.env.get("GMAIL_SMTP_HOST")?.trim() ?? "smtp.gmail.com";
const SMTP_USER = Deno.env.get("GMAIL_SMTP_USER")?.trim();
const SMTP_PASSWORD = Deno.env.get("GMAIL_SMTP_PASSWORD")?.trim();

const NOT_OVERDUE_STATUSES = new Set(["Paid", "Void", "Written Off"]);

interface Business {
  id: string;
  name: string;
}

interface VisitRow {
  id: string;
  start_time: string | null;
  jobs: {
    id: string;
    archived: boolean;
    properties: { address: string } | null;
    contacts: { name: string } | null;
  } | null;
}

interface InvoiceRow {
  id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: string;
  jobs: {
    properties: { address: string; customers: { name: string } | null } | null;
  } | null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// job_visits.scheduled_date / invoices.due_date are plain dates with no
// timezone attached -- parsed and formatted here via UTC-based arithmetic
// only, the same convention src/lib/format.ts uses app-side, so "today" in
// this function always lines up with what the app calls "today".
function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function daysBetween(fromDateStr: string, toDateStr: string) {
  const [fy, fm, fd] = fromDateStr.split("-").map(Number);
  const [ty, tm, td] = toDateStr.split("-").map(Number);
  const fromMs = Date.UTC(fy, fm - 1, fd);
  const toMs = Date.UTC(ty, tm - 1, td);
  return Math.round((toMs - fromMs) / 86_400_000);
}

function formatVisitTime(timeStr: string | null) {
  if (!timeStr) return "No time set";
  const [hStr, mStr] = timeStr.split(":");
  const hours24 = Number(hStr);
  const hours = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const period = hours24 < 12 ? "am" : "pm";
  return `${hours}:${mStr}${period}`;
}

async function fetchTomorrowsVisits(supabase: SupabaseClient, businessId: string, tomorrow: string) {
  const { data, error } = await supabase
    .from("job_visits")
    .select("id, start_time, jobs!inner(id, archived, properties(address), contacts(name))")
    .eq("business_id", businessId)
    .eq("jobs.business_id", businessId)
    .eq("scheduled_date", tomorrow)
    .eq("visit_status", "Scheduled")
    .eq("jobs.archived", false)
    .order("start_time", { ascending: true, nullsFirst: false })
    .returns<VisitRow[]>();

  if (error) throw error;
  return (data ?? []).filter((visit) => visit.jobs);
}

async function fetchOverdueInvoices(supabase: SupabaseClient, businessId: string, today: string) {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, amount, due_date, status, jobs!inner(business_id, properties(address, customers(name)))",
    )
    .eq("business_id", businessId)
    .eq("jobs.business_id", businessId)
    .lt("due_date", today)
    .returns<InvoiceRow[]>();

  if (error) throw error;
  // Filtered client-side rather than with `.not("status", "in", ...)` -- one
  // of the excluded values ("Written Off") contains a space, which needs
  // careful quoting in PostgREST's in-list syntax; plain array filtering
  // has no quoting to get wrong.
  return (data ?? []).filter((invoice) => !NOT_OVERDUE_STATUSES.has(invoice.status));
}

async function fetchRecipients(supabase: SupabaseClient, businessId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("business_id", businessId)
    .eq("active", true);

  if (error) throw error;
  return (data ?? [])
    .map((profile) => profile.email)
    .filter((email): email is string => Boolean(email));
}

function buildDigestEmail(visits: VisitRow[], invoices: InvoiceRow[], today: string) {
  const jobRows = visits.map((visit) => ({
    address: visit.jobs?.properties?.address ?? "Unknown property",
    customer: visit.jobs?.contacts?.name ?? "Unknown customer",
    time: formatVisitTime(visit.start_time),
    link: `${APP_URL}/jobs/${visit.jobs?.id}`,
  }));

  const invoiceRows = invoices.map((invoice) => ({
    customer: invoice.jobs?.properties?.customers?.name ?? "Unknown customer",
    amount: invoice.amount,
    invoiceNumber: invoice.invoice_number,
    daysOverdue: daysBetween(invoice.due_date, today),
    link: `${APP_URL}/invoices/${invoice.id}`,
  }));

  const subjectParts: string[] = [];
  if (jobRows.length) subjectParts.push(`${jobRows.length} job${jobRows.length === 1 ? "" : "s"} tomorrow`);
  if (invoiceRows.length)
    subjectParts.push(`${invoiceRows.length} overdue invoice${invoiceRows.length === 1 ? "" : "s"}`);
  const subject = `Daily digest: ${subjectParts.join(", ")}`;

  const jobsHtml = jobRows.length
    ? `<h2>Tomorrow's Jobs</h2><ul>${jobRows
        .map(
          (job) =>
            `<li><a href="${job.link}">${escapeHtml(job.address)}</a> — ${escapeHtml(job.time)} — ${escapeHtml(job.customer)}</li>`,
        )
        .join("")}</ul>`
    : "";

  const invoicesHtml = invoiceRows.length
    ? `<h2>Overdue Invoices</h2><ul>${invoiceRows
        .map(
          (invoice) =>
            `<li><a href="${invoice.link}">${escapeHtml(invoice.invoiceNumber)}</a> — ${escapeHtml(invoice.customer)} — $${invoice.amount.toFixed(2)} — ${invoice.daysOverdue} day${invoice.daysOverdue === 1 ? "" : "s"} overdue</li>`,
        )
        .join("")}</ul>`
    : "";

  const jobsText = jobRows.length
    ? `Tomorrow's Jobs\n${jobRows
        .map((job) => `- ${job.address} — ${job.time} — ${job.customer} (${job.link})`)
        .join("\n")}`
    : "";

  const invoicesText = invoiceRows.length
    ? `Overdue Invoices\n${invoiceRows
        .map(
          (invoice) =>
            `- ${invoice.invoiceNumber} — ${invoice.customer} — $${invoice.amount.toFixed(2)} — ${invoice.daysOverdue} day(s) overdue (${invoice.link})`,
        )
        .join("\n")}`
    : "";

  return {
    subject,
    html: [jobsHtml, invoicesHtml].filter(Boolean).join("<br/>"),
    content: [jobsText, invoicesText].filter(Boolean).join("\n\n"),
  };
}

// Returns whether an email was actually sent, so the caller can total it up.
async function sendDigestForBusiness(supabase: SupabaseClient, business: Business, today: string, tomorrow: string) {
  const [visits, invoices] = await Promise.all([
    fetchTomorrowsVisits(supabase, business.id, tomorrow),
    fetchOverdueInvoices(supabase, business.id, today),
  ]);

  // Nothing to report -- skip entirely rather than send an empty digest.
  if (visits.length === 0 && invoices.length === 0) return false;

  const recipients = await fetchRecipients(supabase, business.id);
  if (recipients.length === 0) return false;

  const { subject, html, content } = buildDigestEmail(visits, invoices, today);

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: 465,
      tls: true,
      auth: { username: SMTP_USER!, password: SMTP_PASSWORD! },
    },
  });

  try {
    await client.send({ from: SMTP_USER!, to: recipients, subject, content, html });
  } finally {
    try {
      await client.close();
    } catch {
      // ignore -- see feedback-notification for why
    }
  }

  return true;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // This function is deployed with --no-verify-jwt (it's invoked by pg_cron
  // via net.http_post, server-to-server, not on behalf of a signed-in user
  // -- same reasoning as feedback-notification). That alone would leave the
  // URL callable by anyone with no check at all, so it separately requires
  // the caller to present the project's own service role key as a bearer
  // token -- exactly what the cron job's net.http_post call sends -- before
  // it will touch any business's data.
  const receivedAuth = req.headers.get("Authorization");
  // TEMPORARY DEBUG -- lengths only, never the actual secret values -- to
  // diagnose a 401 that persisted even after rotating the Vault secret.
  console.error(
    "daily-digest auth debug:",
    JSON.stringify({
      hasServiceRoleKeyEnv: Boolean(SERVICE_ROLE_KEY),
      serviceRoleKeyEnvLength: SERVICE_ROLE_KEY?.length ?? 0,
      hasAuthHeader: Boolean(receivedAuth),
      authHeaderLength: receivedAuth?.length ?? 0,
      match: receivedAuth === `Bearer ${SERVICE_ROLE_KEY}`,
    }),
  );
  if (!SERVICE_ROLE_KEY || receivedAuth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!SUPABASE_URL || !APP_URL || !SMTP_USER || !SMTP_PASSWORD) {
    console.error(
      "daily-digest is missing required secrets (APP_URL, GMAIL_SMTP_USER, GMAIL_SMTP_PASSWORD).",
    );
    return new Response("Not configured", { status: 200 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: businesses, error: businessesError } = await supabase
    .from("businesses")
    .select("id, name")
    .returns<Business[]>();

  if (businessesError || !businesses) {
    console.error("daily-digest: failed to load businesses", businessesError);
    return new Response("Failed to load businesses", { status: 500 });
  }

  const today = todayDateString();
  const tomorrow = addDays(today, 1);

  let sent = 0;
  let failed = 0;

  for (const business of businesses) {
    try {
      if (await sendDigestForBusiness(supabase, business, today, tomorrow)) sent++;
    } catch (error) {
      failed++;
      console.error(`daily-digest: failed for business ${business.id}`, error);
    }
  }

  return new Response(JSON.stringify({ businesses: businesses.length, sent, failed }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
