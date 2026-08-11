// Pure Finances-dashboard math: date range resolution and the Direct Job
// Cost / Gross Profit / Net Operating Result calculations. Kept framework-
// free (no Supabase calls) so the numbers a section shows can be reasoned
// about and checked independently of how the rows were fetched -- data
// fetching/aggregation lives in finances/data.ts.

export type DateFilterKey = "this-month" | "last-month" | "fy" | "all-time" | "custom";

export interface DateRange {
  // Inclusive "YYYY-MM-DD" bounds, or null for an open (all-time) end.
  start: string | null;
  end: string | null;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function lastDayOfMonth(year: number, month: number) {
  // Day 0 of the *next* month is the last day of this one.
  return new Date(year, month, 0).getDate();
}

// Australian financial year: 1 July -> 30 June. `today` is a "YYYY-MM-DD"
// string (from todayDateString()), never a live Date read here, so this
// stays deterministic and hydration-safe like the rest of the date helpers.
export function getFinancialYearRange(today: string): DateRange {
  const [y, m] = today.split("-").map(Number);
  const startYear = m >= 7 ? y : y - 1;
  return { start: ymd(startYear, 7, 1), end: ymd(startYear + 1, 6, 30) };
}

export function resolveDateRange(
  filter: DateFilterKey,
  today: string,
  custom?: { from: string | null; to: string | null },
): DateRange {
  const [y, m] = today.split("-").map(Number);

  if (filter === "this-month") {
    return { start: ymd(y, m, 1), end: ymd(y, m, lastDayOfMonth(y, m)) };
  }
  if (filter === "last-month") {
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    return { start: ymd(py, pm, 1), end: ymd(py, pm, lastDayOfMonth(py, pm)) };
  }
  if (filter === "fy") {
    return getFinancialYearRange(today);
  }
  if (filter === "custom") {
    return { start: custom?.from ?? null, end: custom?.to ?? null };
  }
  return { start: null, end: null };
}

// Rounds to the nearest cent and normalizes -0 to 0 -- same convention as
// billing.ts's toCents, so float dust never surfaces as "-$0.00".
export function round2(n: number): number {
  const rounded = Math.round(n * 100) / 100;
  return rounded === 0 ? 0 : rounded;
}

export interface InvoiceForCalc {
  id: string;
  job_id: string;
  amount: number;
  issue_date: string;
  due_date: string;
  status: string;
  gst_applied: boolean;
  paid_amount: number;
}

export interface ExpenseForCalc {
  amount: number;
  gst_amount: number;
  gst_included: boolean;
  job_id: string | null;
  date: string;
}

export interface FinancesSummary {
  paymentsReceived: number;
  revenueInvoiced: number;
  outstandingInvoices: number;
  overdueInvoices: number;
  businessExpenses: number;
  gstCollected: number;
  gstPaid: number;
  directJobCosts: number;
  grossProfit: number | null;
  netOperatingResult: number | null;
}

const NOT_INVOICED_STATUSES = new Set(["Draft", "Void"]);
const OUTSTANDING_STATUSES = new Set(["Sent", "Partially Paid", "Overdue"]);

// GST component of a GST-inclusive figure: amount = exGst * 1.1, so
// GST = exGst * 0.1 = amount / 11. Same ÷11 convention used for expenses
// and already established for quotes (subtotal * GST_RATE, GST_RATE = 0.1).
function gstComponent(amount: number) {
  return amount / 11;
}

export function computeFinancesSummary({
  invoicesInRange,
  paymentsInRangeTotal,
  expensesInRange,
  jobDirectCosts,
}: {
  invoicesInRange: InvoiceForCalc[];
  paymentsInRangeTotal: number;
  expensesInRange: ExpenseForCalc[];
  // Total Direct Job Cost per job (quote line items + service items +
  // ALL of that job's expenses, regardless of expense date) -- costs are a
  // per-job total, matched against this period's revenue slice for that
  // job, per the spec ("Direct Job Costs for those same jobs").
  jobDirectCosts: Map<string, number>;
}): FinancesSummary {
  const invoiced = invoicesInRange.filter((inv) => !NOT_INVOICED_STATUSES.has(inv.status));

  const revenueInvoiced = round2(invoiced.reduce((sum, inv) => sum + inv.amount, 0));

  const outstandingInvoices = round2(
    invoicesInRange
      .filter((inv) => OUTSTANDING_STATUSES.has(inv.status))
      .reduce((sum, inv) => sum + (inv.amount - inv.paid_amount), 0),
  );

  const overdueInvoices = round2(
    invoicesInRange
      .filter((inv) => inv.status === "Overdue")
      .reduce((sum, inv) => sum + (inv.amount - inv.paid_amount), 0),
  );

  const gstCollected = round2(
    invoiced.reduce((sum, inv) => sum + (inv.gst_applied ? gstComponent(inv.amount) : 0), 0),
  );

  const overheadExpenses = expensesInRange.filter((e) => e.job_id === null);
  const businessExpenses = round2(overheadExpenses.reduce((sum, e) => sum + e.amount, 0));

  const gstPaid = round2(
    expensesInRange.reduce((sum, e) => sum + (e.gst_included ? e.gst_amount : 0), 0),
  );

  // Revenue + costs for exactly the jobs invoiced in this period -- the set
  // Gross Profit is scoped to.
  const jobsInPeriod = new Set(invoiced.map((inv) => inv.job_id));
  const jobRevenue = round2(invoiced.reduce((sum, inv) => sum + inv.amount, 0));
  const directJobCosts = round2(
    Array.from(jobsInPeriod).reduce((sum, jobId) => sum + (jobDirectCosts.get(jobId) ?? 0), 0),
  );

  // "Real cost data, not fabricated zeros": trust the number when there IS
  // cost data behind it, or when there's honestly nothing to be wrong about
  // (no job revenue this period at all).
  const hasReliableCostData = directJobCosts > 0 || jobRevenue === 0;
  const grossProfit = hasReliableCostData ? round2(jobRevenue - directJobCosts) : null;

  const hasOverheadData = overheadExpenses.length > 0;
  const netOperatingResult =
    grossProfit !== null && hasOverheadData
      ? round2(jobRevenue - directJobCosts - businessExpenses)
      : null;

  return {
    paymentsReceived: round2(paymentsInRangeTotal),
    revenueInvoiced,
    outstandingInvoices,
    overdueInvoices,
    businessExpenses,
    gstCollected,
    gstPaid,
    directJobCosts,
    grossProfit,
    netOperatingResult,
  };
}

export interface MonthBucket {
  label: string;
  monthKey: string; // "YYYY-MM"
  revenue: number;
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Buckets invoice amounts by issue-date month across [start, end] inclusive
// -- every month in range gets a bar even if $0, so the chart's x-axis is
// continuous rather than skipping quiet months.
export function bucketRevenueByMonth(
  invoices: { amount: number; issue_date: string; status: string }[],
  range: DateRange,
): MonthBucket[] {
  if (!range.start || !range.end) return [];

  const [startY, startM] = range.start.split("-").map(Number);
  const [endY, endM] = range.end.split("-").map(Number);

  const buckets = new Map<string, MonthBucket>();
  let y = startY;
  let m = startM;
  while (y < endY || (y === endY && m <= endM)) {
    const key = `${y}-${pad(m)}`;
    buckets.set(key, { label: MONTHS_SHORT[m - 1], monthKey: key, revenue: 0 });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  for (const inv of invoices) {
    if (NOT_INVOICED_STATUSES.has(inv.status)) continue;
    const key = inv.issue_date.slice(0, 7);
    const bucket = buckets.get(key);
    if (bucket) bucket.revenue = round2(bucket.revenue + inv.amount);
  }

  return Array.from(buckets.values());
}
