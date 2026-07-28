// Helpers for class scheduling times. Kept out of the component file so they
// stay unit-testable and don't trip react-refresh/only-export-components.
// See components/ui/class-time-input.tsx for why this guard exists.

/** Latest hour we treat as a mis-set AM/PM rather than a real class time. */
const IMPLAUSIBLE_BEFORE_HOUR = 7;

function parseHour(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  return Number.isFinite(hour) ? hour : null;
}

/**
 * True when a time looks like an AM/PM slip — i.e. midnight to 06:59. TTII
 * runs no classes in that window; the real schedule sits between 11:00-21:00.
 */
export function isImplausibleClassTime(hhmm: string): boolean {
  const hour = parseHour(hhmm);
  return hour !== null && hour < IMPLAUSIBLE_BEFORE_HOUR;
}

/** "02:00" -> "14:00". Returns the input unchanged when it is not shiftable. */
export function toPmEquivalent(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})(.*)$/.exec(hhmm.trim());
  if (!m) return hhmm;
  const hour = Number(m[1]);
  if (!Number.isFinite(hour) || hour >= 12) return hhmm;
  return `${String(hour + 12).padStart(2, '0')}:${m[2]}${m[3] ?? ''}`;
}

/** "14:00" -> "2:00 PM", for warning copy. */
export function toTimeDisplay(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return hhmm;
  const hour = Number(m[1]);
  if (!Number.isFinite(hour)) return hhmm;
  const suffix = hour < 12 ? 'AM' : 'PM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m[2]} ${suffix}`;
}
