// Assign / Edit course plan dialog: validation mirrors the server
// (apps/api centre-course-plan-model.ts) so errors show before the request.

export interface PlanForm { courseId: string; fee: string; start: string; end: string }
export type PlanFormErrors = Partial<Record<keyof PlanForm, string>>;

export const EMPTY_PLAN_FORM: PlanForm = { courseId: '', fee: '', start: '', end: '' };

/** "10,000" -> "10000"; null when not a number >= 0 with at most 2 decimals. */
export function parseFee(value: string): string | null {
  const raw = value.replace(/,/g, '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n <= 100_000_000 ? String(n) : null;
}

function isRealYmd(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export function validatePlanForm(form: PlanForm, mode: 'add' | 'edit'): PlanFormErrors {
  const errors: PlanFormErrors = {};
  if (mode === 'add' && !form.courseId) errors.courseId = 'Choose a course.';
  if (parseFee(form.fee) === null) errors.fee = 'Enter the centre fee as a number (0 or more).';
  if (!isRealYmd(form.start)) errors.start = 'Enter a valid start date.';
  if (!isRealYmd(form.end)) errors.end = 'Enter a valid end date.';
  else if (!errors.start && form.end < form.start) errors.end = 'The end date cannot be before the start date.';
  return errors;
}
