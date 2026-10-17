import { asNumber, asString } from '../../../shared/utils/admin-data-utils.js';

// Student View (Admin → Students → View), rebuilt in Naji's design
// (StudentCard / ProfileInfoCard / EnrollmentLayout / SubjectProgress) on
// 2026-10-12. This file holds the page's pure logic, lifted VERBATIM from the
// old single-file ViewStudentPage so the reskin cannot drift: account vs course
// status, the course-scoped payment history, subject progress, the offering
// sort and the instalment form helpers. Nothing here talks to the server.

/** Read a `{ status, message }` envelope. */
export function serverResult(res: unknown, okFallback: string, errFallback = 'Operation failed.'): { ok: boolean; message: string } {
  const r = (res ?? {}) as { status?: unknown; message?: unknown };
  const ok = r.status === undefined ? true : Number(r.status) === 1;
  const msg = asString(r.message);
  return { ok, message: msg && msg !== 'success' ? msg : ok ? okFallback : errFallback };
}

// Risha UAT 2026-07-27 — "students who have completed still show Active".
// The two badges measure different things:
//   • users.status / disabled_at  → whether the LOGIN is enabled
//   • enrol.enrollment_status     → whether the COURSE is finished
// Nothing syncs them, and nothing should: auth flips users.status 0→1 on every
// login, so it cannot hold academic state. Presentation only.
export function accountStatusLabel(student: Record<string, unknown> | null): string {
  if (!student) return 'Active';
  if (student.disabled_at) return 'Inactive'; // matches the Students list
  return asString(student.status_label) || asString(student.status) || 'Active';
}

/** Course status rolled up from the student's own enrolments ('' when none). */
export function courseStatusLabel(enrolments: Record<string, unknown>[]): string {
  if (enrolments.length === 0) return '';
  const statuses = enrolments.map((e) => (asString(e.status) || asString(e.enrollment_status) || 'Active').toLowerCase());
  const done = (s: string) => s === 'completed' || s === 'graduated';
  if (statuses.every(done)) return 'Completed';
  if (statuses.every((s) => s === 'dropout')) return 'Dropout';
  if (statuses.some(done)) return 'Partly completed';
  return 'Active';
}

// Naji 2026-07-06 — the Fee Summary is course-scoped (paid is summed per
// course_id), but the raw payment schedule mixes rows from other courses, so
// the visible Payment History is scoped to the student's ENROLLED course(s).
// Falls back to all rows when no enrolment course_id is known.
export function scopePaymentSchedule(
  schedule: Record<string, unknown>[],
  enrolments: Record<string, unknown>[],
): Record<string, unknown>[] {
  const ids = new Set<number>();
  for (const e of enrolments) {
    const c = asNumber(e.course_id);
    if (c) ids.add(c);
  }
  return ids.size === 0 ? schedule : schedule.filter((r) => ids.has(asNumber(r.course_id)));
}

/** How many rows were created (or updated) at or after `sinceMs`. */
export function recentCount(rows: Record<string, unknown>[], sinceMs: number): number {
  return rows.filter((r) => {
    const t = new Date(asString(r.created_at) || asString(r.updated_at)).getTime();
    return Number.isFinite(t) && t >= sinceMs;
  }).length;
}

export type Pace = 'Ahead' | 'On track' | 'Behind';
export interface SubjectProgressRow {
  id: string;
  title: string;
  completedLessons: number;
  totalLessons: number;
  pct: number;
  pace: Pace;
}

const TARGET_PCT = 60;

/** Per-subject completion from video_progress rows (a lesson is done when all its files are). */
export function subjectProgress(videoProgress: Record<string, unknown>[]): SubjectProgressRow[] {
  type Bucket = { id: string; title: string; order: number; files: Record<string, unknown>[] };
  const subjects = new Map<string, Bucket>();
  for (const vp of videoProgress) {
    const sid = asString(vp.subject_id) || 'none';
    let subj = subjects.get(sid);
    if (!subj) {
      subj = { id: sid, title: asString(vp.subject_title) || 'Other', order: asNumber(vp.subject_order), files: [] };
      subjects.set(sid, subj);
    }
    subj.files.push(vp);
  }
  const ordered = [...subjects.values()].sort((a, b) => {
    if (a.id === 'none') return 1;
    if (b.id === 'none') return -1;
    return a.order - b.order;
  });
  return ordered.map((s) => {
    const byLesson = new Map<string, { total: number; done: number }>();
    for (const f of s.files) {
      const lid = asString(f.lesson_id) || `lf-${asString(f.lesson_file_id)}`;
      const cur = byLesson.get(lid) ?? { total: 0, done: 0 };
      cur.total += 1;
      if (asNumber(f.status) === 1) cur.done += 1;
      byLesson.set(lid, cur);
    }
    let completedLessons = 0;
    for (const v of byLesson.values()) if (v.total > 0 && v.done === v.total) completedLessons += 1;
    const completedFiles = s.files.filter((f) => asNumber(f.status) === 1).length;
    const pct = s.files.length > 0 ? Math.round((completedFiles / s.files.length) * 100) : 0;
    const pace: Pace = pct >= TARGET_PCT + 15 ? 'Ahead' : pct >= TARGET_PCT ? 'On track' : 'Behind';
    return { id: s.id, title: s.title, completedLessons, totalLessons: byLesson.size, pct, pace };
  });
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// Naji UAT 2026-05-13 — offerings sort chronologically. The title ends with a
// "Month Year" (e.g. "Diploma ... - May 2026"); start_date / enrollment_start
// win when present. Unknown dates sort to the end.
export function offeringSortKey(o: Record<string, unknown>): number {
  const explicit = asString(o.start_date) || asString(o.enrollment_start);
  if (explicit) { const t = new Date(explicit).getTime(); if (Number.isFinite(t)) return t; }
  const tail = (asString(o.title) || asString(o.offering_code) || '').split('-').pop()?.trim().toLowerCase() ?? '';
  const monthIdx = MONTHS.findIndex((m) => tail.includes(m));
  const yr = tail.match(/(\d{4})/)?.[1];
  if (monthIdx >= 0 && yr) return new Date(Number(yr), monthIdx, 1).getTime();
  return Number.MAX_SAFE_INTEGER;
}

/** Pipeline → the role ids whose users can own it. Admin = Super Admin + Admin. */
export function pipelineRoleIds(pipeline: string): number[] {
  if (pipeline === 'Admin') return [1, 8];
  if (pipeline === 'Counsellor') return [9];
  if (pipeline === 'Associate') return [10];
  return [];
}

/** De-duplicated { label, value } options from user rows. */
export function toUserOptions(rows: Record<string, unknown>[]): Array<{ label: string; value: string }> {
  const seen = new Set<string>();
  const opts: Array<{ label: string; value: string }> = [];
  for (const r of rows) {
    const id = asString(r.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    opts.push({ label: asString(r.name) || asString(r.user_email) || `User ${id}`, value: id });
  }
  return opts;
}

export function progressLabel(pct: number): string {
  if (pct >= 100) return 'Completed';
  if (pct > 0) return 'In progress';
  return 'Not started';
}

export function formatDuration(seconds: number): string {
  if (!seconds) return '-';
  const mins = Math.round(seconds / 60);
  return mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

export function rupees(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

/** Instalment dialog prefill: any stored date → YYYY-MM-DD ('' when unparseable). Unchanged from the old page. */
export function toIsoDate(v: unknown): string {
  const s = asString(v);
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export interface InstalmentForm {
  installment_details: string;
  amount: string;
  due_date: string;
  paid_date: string;
  payment_mode: string;
  status: string;
}

// Naji 2026-07-06 — keep Status and Paid Date consistent: a row that carries a
// Paid Date IS paid, so Status is coerced to 'Paid' (otherwise a Pending badge
// would still count toward Fee Paid). Unchanged from the old page.
export function withPaidDateStatus(form: InstalmentForm): InstalmentForm {
  const out = { ...form };
  if (out.paid_date.trim() && out.status.trim().toLowerCase() !== 'paid') out.status = 'Paid';
  return out;
}

/** TTII 2026-10-17 — the server refuses Add Instalment while the course's
 *  application has a payment link that can still be paid; that refusal's
 *  message (from the thrown API error's payload), else null. */
export function openLinkRefusal(err: unknown): string | null {
  const payload = (err as { payload?: unknown } | null)?.payload;
  if (!payload || typeof payload !== 'object') return null;
  const body = payload as { code?: unknown; message?: unknown };
  if (body.code !== 'payment_link_open') return null;
  return asString(body.message) || 'A payment link on this course can still be paid.';
}

export function initials(name: string): string {
  return (name || 'I').split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export const LEAD_SOURCES = ['Facebook', 'WhatsApp', 'Email', 'Website', 'Walk-in', 'Call-in', 'Reference'];
