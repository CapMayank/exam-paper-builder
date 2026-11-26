/** Exam dates are YYYY-MM-DD strings. "Today" is the school's date in India, whatever timezone the server runs in. */

const IST_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
const DAY_MS = 86_400_000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A YYYY-MM-DD at UTC midnight, so weekday and day arithmetic never depend on the host timezone. */
function utc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayIST(now: Date = new Date()): string {
  return IST_DATE.format(now);
}

/** Whole days from `today` to `date`; negative once the date has passed. */
export function daysUntil(date: string, today: string): number {
  return Math.round((utc(date).getTime() - utc(today).getTime()) / DAY_MS);
}

export function weekdayName(date: string): string {
  return WEEKDAYS[utc(date).getUTCDay()];
}

export function formatDMY(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

/** Monday-first weeks (7 cells, null outside the month) for every month holding one of the dates. */
export function monthGrid(dates: string[]): { month: string; weeks: (string | null)[][] }[] {
  const months = [...new Set(dates.map((d) => d.slice(0, 7)))].sort();
  return months.map((ym) => {
    const [y, m] = ym.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
    const cells: (string | null)[] = Array(lead).fill(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(ymd(new Date(Date.UTC(y, m - 1, day))));
    while (cells.length % 7) cells.push(null);
    const weeks: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return { month: `${MONTHS[m - 1]} ${y}`, weeks };
  });
}
