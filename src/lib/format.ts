// Manual formatting (no Intl/toLocaleString) so output is byte-identical
// between server (Node) and client (browser) — different JS engines format
// the same locale slightly differently (e.g. comma placement), which is
// enough to break hydration for components rendered on both sides.
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatTime(iso: string) {
  const d = new Date(iso);
  const hours24 = d.getHours();
  const hours = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const period = hours24 < 12 ? "am" : "pm";
  return `${hours}:${minutes}${period}`;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(iso);
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// job_visits.scheduled_date/start_time are plain SQL date/time values (no
// timezone attached). Parsing them with `new Date(dateString)` and reading
// local getters would shift the displayed date depending on whichever
// timezone happens to run the code (server vs. browser) — the same class of
// hydration/consistency bug documented for formatDate/formatTime, but for
// values that shouldn't have a timezone at all. These parse the strings
// directly (or via Date.UTC, read back with UTC getters) so the result is
// identical no matter where or when it runs.
export function formatVisitDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utcDate = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[utcDate.getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

export function formatVisitTime(timeStr: string | null) {
  if (!timeStr) return null;
  const [hStr, mStr] = timeStr.split(":");
  const hours24 = Number(hStr);
  const hours = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const period = hours24 < 12 ? "am" : "pm";
  return `${hours}:${mStr}${period}`;
}

export function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Server-only: today's date as a plain YYYY-MM-DD string, for comparing
// against job_visits.scheduled_date. Never call this from a component that
// also renders on the client (see the format.ts module comment above).
export function todayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
