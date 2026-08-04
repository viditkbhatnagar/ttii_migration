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
