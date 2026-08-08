// Pure "YYYY-MM-DD" string date math, deliberately not using local Date
// getters — see the note in format.ts. Every function here is safe to call
// from Server or Client Components, or both, with identical output.
const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_LONG = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parts(dateStr: string): [number, number, number] {
  const [y, m, d] = dateStr.split("-").map(Number);
  return [y, m, d];
}

function toUtcMs(dateStr: string): number {
  const [y, m, d] = parts(dateStr);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  return fromUtcMs(toUtcMs(dateStr) + days * 86400000);
}

// 0 = Monday .. 6 = Sunday
export function weekdayIndex(dateStr: string): number {
  const jsDay = new Date(toUtcMs(dateStr)).getUTCDay(); // 0 = Sunday
  return (jsDay + 6) % 7;
}

export function getWeekStart(dateStr: string): string {
  return addDays(dateStr, -weekdayIndex(dateStr));
}

export function getWeekDays(dateStr: string): string[] {
  const start = getWeekStart(dateStr);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getMonthGridDays(dateStr: string): string[] {
  const [y, m] = parts(dateStr);
  const firstOfMonth = `${y}-${String(m).padStart(2, "0")}-01`;
  const gridStart = getWeekStart(firstOfMonth);
  // 6 rows x 7 days covers every possible month layout.
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function isSameMonth(dateStr: string, referenceDateStr: string): boolean {
  const [y1, m1] = parts(dateStr);
  const [y2, m2] = parts(referenceDateStr);
  return y1 === y2 && m1 === m2;
}

export function isToday(dateStr: string, todayStr: string): boolean {
  return dateStr === todayStr;
}

export function dayOfMonth(dateStr: string): number {
  return parts(dateStr)[2];
}

export function formatDayLabel(dateStr: string, style: "short" | "long" = "short") {
  const [, m, d] = parts(dateStr);
  const weekday = style === "long" ? WEEKDAYS_LONG[weekdayIndex(dateStr)] : WEEKDAYS_SHORT[weekdayIndex(dateStr)];
  const month = style === "long" ? MONTHS_LONG[m - 1] : MONTHS[m - 1];
  return `${weekday} ${d} ${month}`;
}

export function formatMonthYearLabel(dateStr: string) {
  const [y, m] = parts(dateStr);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

export function formatWeekRangeLabel(dateStr: string) {
  const days = getWeekDays(dateStr);
  const [y1, m1, d1] = parts(days[0]);
  const [y2, m2, d2] = parts(days[6]);
  if (y1 !== y2) return `${d1} ${MONTHS[m1 - 1]} ${y1} – ${d2} ${MONTHS[m2 - 1]} ${y2}`;
  if (m1 !== m2) return `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]} ${y1}`;
  return `${d1} – ${d2} ${MONTHS[m2 - 1]} ${y1}`;
}
