// Add / Edit Cohort form rules (pure). Extracted from AddCohortPage when the
// form moved into Naji's Add Cohort dialog (TTII 2026-10-12); the behaviour is
// the page's, except that dates are read from their Y-M-D parts instead of
// `new Date('YYYY-MM-DD')` (UTC midnight, which is the previous day west of UTC).

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function ymdParts(ymd: string): { y: string; m: number } | null {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(ymd);
  if (!match) return null;
  const m = Number(match[2]);
  return m >= 1 && m <= 12 ? { y: match[1] ?? '', m } : null;
}

/** "2026-07-15" → "July 2026". */
export function cohortMonthLabel(ymd: string): string {
  const p = ymdParts(ymd);
  return p ? `${MONTH_NAMES[p.m - 1]} ${p.y}` : '';
}

/** Subject (or course) short name + MMM + YY, e.g. "MM" + 2026-01-05 → "MMJAN26". */
export function buildCohortCode(shortName: string, ymd: string): string {
  const p = ymdParts(ymd);
  if (!p) return '';
  return `${shortName.toUpperCase()}${MONTH_ABBR[p.m - 1]}${p.y.slice(-2)}`;
}

/** The short name a code is built from: the stored short_name, else the first two letters. */
export function shortNameOf(record: { short_name?: unknown; title?: unknown }): string {
  const short = typeof record.short_name === 'string' ? record.short_name.trim() : '';
  if (short) return short;
  const title = typeof record.title === 'string' ? record.title : '';
  return title.replace(/[^A-Za-z]/g, '').slice(0, 2);
}

/** Auto name + code once both the subject/course and the start date are set. */
export function autoNameAndCode(source: { title?: unknown; short_name?: unknown } | null, startYmd: string): { title: string; code: string } | null {
  if (!source || !startYmd) return null;
  const title = typeof source.title === 'string' ? source.title : '';
  const month = cohortMonthLabel(startYmd);
  if (!title || !month) return null;
  return { title: `${title} - ${month}`, code: buildCohortCode(shortNameOf(source), startYmd) };
}

export interface CohortFormCheck {
  title: string;
  courseCount: number;
  startDate: string;
  endDate: string;
}

/** First blocking problem with the form, or null when it can be saved. */
export function cohortFormError(f: CohortFormCheck): string | null {
  if (!f.title.trim()) return 'Cohort name is required.';
  if (f.courseCount === 0) return 'Pick at least one course.';
  if (f.startDate && f.endDate && f.endDate < f.startDate) return 'End date must be on or after the start date.';
  return null;
}

/** Days from start to end (exclusive), or null when either date is missing or the range is empty. */
export function cohortDurationDays(startYmd: string, endYmd: string): number | null {
  const a = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startYmd);
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(endYmd);
  if (!a || !b) return null;
  const days = Math.round(
    (Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3])) - Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]))) / 86_400_000,
  );
  return days > 0 ? days : null;
}

/** Active / Completed / Upcoming from the cohort dates (same rule as the list endpoint). */
export function cohortStatusOn(startYmd: string, endYmd: string, todayYmd: string): 'active' | 'completed' | 'upcoming' {
  if (endYmd && endYmd < todayYmd) return 'completed';
  if (startYmd && startYmd > todayYmd) return 'upcoming';
  return 'active';
}
