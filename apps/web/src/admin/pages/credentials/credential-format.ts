// Display helpers for the Credential Manager pages. Dates are shown DD-MM-YYYY; instants
// are shown in IST (the institute's wall clock), never via `new Date('YYYY-MM-DD')`.

const YMD = /^(\d{4})-(\d{2})-(\d{2})/;

/** "2026-11-14" or an ISO instant -> "14-11-2026" (an instant is read in IST). */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return '';
  if (value.length <= 10) {
    const m = YMD.exec(value);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : value;
  }
  return fmtDateTime(value).split(',')[0] ?? value;
}

/** ISO instant -> "14-11-2026, 09:30" in IST. */
export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (t: string): string => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('day')}-${get('month')}-${get('year')}, ${get('hour')}:${get('minute')}`;
}

export function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

/** "docType" / "doc_type" -> "Doc type". */
export function humanKey(key: string): string {
  const spaced = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const dash = (v: string | number | null | undefined): string => (v === null || v === undefined || v === '' ? '—' : String(v));

export function distinct(values: string[]): Array<{ value: string; label: string }> {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v }));
}
