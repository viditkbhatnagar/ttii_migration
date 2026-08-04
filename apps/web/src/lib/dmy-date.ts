// Pure dd/mm/yyyy <-> ISO helpers for the shared DOB field. Kept out of the
// component file so they stay unit-testable and don't trip
// react-refresh/only-export-components. See components/ui/dmy-date-field.tsx.

export function isoToDmy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

export function dmyToIso(dmy: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dmy.trim());
  if (!m) return '';
  return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
}

/**
 * Insert the dd/mm/yyyy slashes as the student types digits.
 *
 * Risha 2026-08-03 — students could not submit the application form from a
 * phone. `inputMode="numeric"` gives a digits-only keypad, which has NO "/"
 * key, so a field that requires the user to type the separators themselves is
 * literally impossible to complete on mobile: they got as far as "21" and
 * stopped, DOB stayed empty, and the required-field check blocked submit.
 *
 * Deliberately never appends a TRAILING slash — separators only ever appear
 * BETWEEN groups. That is what makes backspace work without any special-casing:
 * "21/05" -> backspace -> raw "21/0" -> digits "210" -> "21/0", and again ->
 * raw "21/" -> digits "21" -> "21". A trailing slash would be re-added on every
 * delete and trap the caret.
 */
export function formatDmyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// --- calendar maths for the picker (components/ui/dmy-date-picker.tsx) ---
// All of it works on local parts and never round-trips a date through a UTC
// string, so nothing can shift a day (the documented project gotcha).

/** Split 'yyyy-mm-dd' into parts. Month is 0-based. Null when malformed. */
export function parseIsoParts(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

/** Build 'yyyy-mm-dd' from local parts. Month is 0-based. */
export function partsToIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Day count of a 0-based month, leap years included. */
export function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

/** Weekday index (0=Sunday) of the 1st of a 0-based month. */
export function firstWeekday(y: number, m: number): number {
  return new Date(y, m, 1).getDay();
}
