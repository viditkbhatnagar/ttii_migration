// Stored instants (users.created_at, auth_session.created_at, …) shown as India
// time, whatever the browser's own zone is. Date-only YYYY-MM-DD values never
// come through here — format those by splitting the string (formatYmd).

const IST_OFFSET_MS = 330 * 60 * 1000;

/** The IST calendar day (YYYY-MM-DD) an ISO instant fell on; '' when unparseable. */
export function istYmd(iso: string): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Today's IST calendar day. */
export function istToday(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The IST day `days` days before `now`. */
export function istDaysAgo(now: Date, days: number): string {
  return new Date(now.getTime() + IST_OFFSET_MS - days * 86_400_000).toISOString().slice(0, 10);
}

/** "dd/mm/yyyy, h:mm AM" in IST; '' when unparseable. */
export function istDateTime(iso: string): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms + IST_OFFSET_MS);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const h = d.getUTCHours();
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}, ${h % 12 || 12}:${min} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** "HH:MM" (24h wall clock) as "h:mm AM"; '' for anything else. */
export function formatClock(hhmm: string | null | undefined): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? '');
  if (!m) return '';
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
}
