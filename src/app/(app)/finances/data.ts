import { createClient } from "@/lib/supabase/server";
import { todayDateString } from "@/lib/format";
import {
  resolveDateRange,
  computeFinancesSummary,
  bucketRevenueByMonth,
  round2,
  type DateFilterKey,
  type DateRange,
  type InvoiceForCalc,
  type ExpenseForCalc,
  type MonthBucket,
  type FinancesSummary,
} from "@/lib/finances";

export interface RecentPayment {
  id: string;
  amount: number;
  paid_date: string;
  invoice_number: string;
  property_address: string;
  customer_name: string | null;
}

export interface HighestValueJob {
  jobId: string;
  propertyAddress: string;
  customerName: string | null;
  revenue: number;
}

export interface FinancesDashboardData {
  range: DateRange;
  summary: FinancesSummary;
  recentPayments: RecentPayment[];
  highestValueJobs: HighestValueJob[];
  revenueTrend: MonthBucket[];
}

const MAX_TREND_MONTHS = 24;

export async function getFinancesDashboardData(
  filter: DateFilterKey,
  custom?: { from: string | null; to: string | null },
): Promise<FinancesDashboardData> {
  const supabase = await createClient();
  const today = todayDateString();
  const range = resolveDateRange(filter, today, custom);

  let invoiceQuery = supabase
    .from("invoices")
    .select(
      "id, job_id, amount, issue_date, due_date, status, payments(amount), jobs(properties(address, customers(name)))",
    )
    .order("issue_date", { ascending: false });
  if (range.start) invoiceQuery = invoiceQuery.gte("issue_date", range.start);
  if (range.end) invoiceQuery = invoiceQuery.lte("issue_date", range.end);

  let expenseQuery = supabase
    .from("expenses")
    .select("amount, gst_amount, gst_included, job_id, date")
    .order("date", { ascending: false });
  if (range.start) expenseQuery = expenseQuery.gte("date", range.start);
  if (range.end) expenseQuery = expenseQuery.lte("date", range.end);

  let paymentsInRangeQuery = supabase
    .from("payments")
    .select(
      "id, amount, paid_date, invoices(invoice_number, jobs(properties(address, customers(name))))",
    )
    .order("paid_date", { ascending: false });
  if (range.start) paymentsInRangeQuery = paymentsInRangeQuery.gte("paid_date", range.start);
  if (range.end) paymentsInRangeQuery = paymentsInRangeQuery.lte("paid_date", range.end);

  const [invoicesRes, expensesRes, paymentsRes] = await Promise.all([
    invoiceQuery.returns<
      {
        id: string;
        job_id: string;
        amount: number;
        issue_date: string;
        due_date: string;
        status: string;
        payments: { amount: number }[];
        jobs: { properties: { address: string; customers: { name: string } | null } | null } | null;
      }[]
    >(),
    expenseQuery.returns<ExpenseForCalc[]>(),
    paymentsInRangeQuery.returns<
      {
        id: string;
        amount: number;
        paid_date: string;
        invoices: {
          invoice_number: string;
          jobs: { properties: { address: string; customers: { name: string } | null } | null } | null;
        } | null;
      }[]
    >(),
  ]);

  const invoiceRows = invoicesRes.data ?? [];
  const expenseRows = expensesRes.data ?? [];
  const paymentRows = paymentsRes.data ?? [];

  const jobIds = Array.from(new Set(invoiceRows.map((inv) => inv.job_id)));

  // Accepted quote per job (at most one, enforced by a unique index) --
  // needed for both gst_applied and this job's direct quote cost.
  const acceptedQuotesRes = jobIds.length
    ? await supabase
        .from("quotes")
        .select("id, job_id, gst_applied")
        .eq("status", "Accepted")
        .in("job_id", jobIds)
        .returns<{ id: string; job_id: string; gst_applied: boolean }[]>()
    : { data: [] };
  const acceptedQuotes = acceptedQuotesRes.data ?? [];
  const quoteIdToJobId = new Map(acceptedQuotes.map((q) => [q.id, q.job_id]));
  const jobIdToGstApplied = new Map(acceptedQuotes.map((q) => [q.job_id, q.gst_applied]));
  const quoteIds = acceptedQuotes.map((q) => q.id);

  const [lineItemsRes, serviceLinesRes, jobExpensesRes] = await Promise.all([
    quoteIds.length
      ? supabase
          .from("quote_line_items")
          .select("quote_id, line_type, cost, quantity, rate_per_hour, hours")
          .in("quote_id", quoteIds)
          .returns<
            {
              quote_id: string;
              line_type: string;
              cost: number | null;
              quantity: number | null;
              rate_per_hour: number | null;
              hours: number | null;
            }[]
          >()
      : Promise.resolve({ data: [] }),
    quoteIds.length
      ? supabase
          .from("quote_service_item_lines")
          .select("quote_id, labour_cost, materials_cost, consumables_cost")
          .in("quote_id", quoteIds)
          .returns<
            { quote_id: string; labour_cost: number; materials_cost: number; consumables_cost: number }[]
          >()
      : Promise.resolve({ data: [] }),
    jobIds.length
      ? supabase
          .from("expenses")
          .select("job_id, amount")
          .in("job_id", jobIds)
          .returns<{ job_id: string; amount: number }[]>()
      : Promise.resolve({ data: [] }),
  ]);

  // Direct Job Cost per job: quote line items + Price Book service lines +
  // every expense tagged to that job (any date -- a job's cost isn't
  // period-scoped, only the revenue it's matched against is).
  const jobDirectCosts = new Map<string, number>();
  const addCost = (jobId: string, amount: number) =>
    jobDirectCosts.set(jobId, (jobDirectCosts.get(jobId) ?? 0) + amount);

  for (const line of lineItemsRes.data ?? []) {
    const jobId = quoteIdToJobId.get(line.quote_id);
    if (!jobId) continue;
    const cost =
      line.line_type === "material"
        ? (line.cost ?? 0) * (line.quantity ?? 1)
        : (line.rate_per_hour ?? 0) * (line.hours ?? 0);
    addCost(jobId, cost);
  }
  for (const line of serviceLinesRes.data ?? []) {
    const jobId = quoteIdToJobId.get(line.quote_id);
    if (!jobId) continue;
    addCost(jobId, line.labour_cost + line.materials_cost + line.consumables_cost);
  }
  for (const exp of jobExpensesRes.data ?? []) {
    addCost(exp.job_id, exp.amount);
  }
  for (const [jobId, total] of jobDirectCosts) {
    jobDirectCosts.set(jobId, round2(total));
  }

  const invoicesForCalc: InvoiceForCalc[] = invoiceRows.map((inv) => ({
    id: inv.id,
    job_id: inv.job_id,
    amount: inv.amount,
    issue_date: inv.issue_date,
    due_date: inv.due_date,
    status: inv.status,
    gst_applied: jobIdToGstApplied.get(inv.job_id) ?? false,
    paid_amount: round2((inv.payments ?? []).reduce((sum, p) => sum + p.amount, 0)),
  }));

  const paymentsInRangeTotal = paymentRows.reduce((sum, p) => sum + p.amount, 0);

  const summary = computeFinancesSummary({
    invoicesInRange: invoicesForCalc,
    paymentsInRangeTotal,
    expensesInRange: expenseRows,
    jobDirectCosts,
  });

  const recentPayments: RecentPayment[] = paymentRows.slice(0, 8).map((p) => ({
    id: p.id,
    amount: p.amount,
    paid_date: p.paid_date,
    invoice_number: p.invoices?.invoice_number ?? "—",
    property_address: p.invoices?.jobs?.properties?.address ?? "Unknown property",
    customer_name: p.invoices?.jobs?.properties?.customers?.name ?? null,
  }));

  const jobRevenue = new Map<string, number>();
  for (const inv of invoicesForCalc) {
    if (inv.status === "Draft" || inv.status === "Void") continue;
    jobRevenue.set(inv.job_id, (jobRevenue.get(inv.job_id) ?? 0) + inv.amount);
  }
  const jobInfoById = new Map(
    invoiceRows.map((inv) => [
      inv.job_id,
      {
        propertyAddress: inv.jobs?.properties?.address ?? "Unknown property",
        customerName: inv.jobs?.properties?.customers?.name ?? null,
      },
    ]),
  );
  const highestValueJobs: HighestValueJob[] = Array.from(jobRevenue.entries())
    .map(([jobId, revenue]) => ({
      jobId,
      revenue: round2(revenue),
      propertyAddress: jobInfoById.get(jobId)?.propertyAddress ?? "Unknown property",
      customerName: jobInfoById.get(jobId)?.customerName ?? null,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // "All time" has no bounded range to bucket by month -- derive one from
  // the actual invoice dates fetched so the chart still has an axis,
  // capped to the most recent months so it stays a chart, not a spreadsheet.
  let chartRange = range;
  if (!range.start || !range.end) {
    const dates = invoiceRows.map((inv) => inv.issue_date).sort();
    if (dates.length) {
      chartRange = { start: dates[0].slice(0, 7) + "-01", end: today };
    }
  }
  let revenueTrend = chartRange.start && chartRange.end
    ? bucketRevenueByMonth(invoiceRows, chartRange)
    : [];
  if (revenueTrend.length > MAX_TREND_MONTHS) {
    revenueTrend = revenueTrend.slice(revenueTrend.length - MAX_TREND_MONTHS);
  }

  return { range, summary, recentPayments, highestValueJobs, revenueTrend };
}
