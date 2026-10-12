import { asNumber, asRecord, asString, toRecords } from '../../shared/utils/admin-data-utils.js';

// Admin → Instructor detail in Naji's design (InstructorDetailModule), on the
// /admin/instructor/overview payload: the same cohorts, live sessions and
// assignments the instructor sees in their own faculty portal. Pure.

export type CohortPhase = 'Upcoming' | 'Ongoing' | 'Completed' | 'Undated';
export type SessionPhase = 'Upcoming' | 'Today' | 'Past';

export interface InstructorProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  qualification: string;
  biography: string;
  image: string;
  status: number;
  disabled: boolean;
  createdAt: string;
}

export interface CohortItem {
  id: number;
  title: string;
  code: string;
  course: string;
  startDate: string;
  endDate: string;
  learners: number;
  upcomingSessions: number;
}

export interface SessionItem {
  id: number;
  title: string;
  date: string;
  fromTime: string;
  toTime: string;
  cohortTitle: string;
  hasRecording: boolean;
}

export interface AssignmentItem {
  id: number;
  title: string;
  cohortTitle: string;
  dueDate: string;
  totalMarks: number | null;
  submissions: number;
  graded: number;
  pending: number;
}

/** Server totals over EVERY row; the cohort / assignment lists are capped (latest first). */
export interface OverviewTotals {
  cohorts: number;
  assignments: number;
  learners: number;
  pendingEval: number;
}

export interface InstructorOverviewModel {
  profile: InstructorProfile;
  cohorts: CohortItem[];
  sessions: SessionItem[];
  assignments: AssignmentItem[];
  totals: OverviewTotals;
}

/** "Showing latest 100 of 130" when a list was capped by the server, else ''. */
export function cappedNote(shown: number, total: number, noun: string): string {
  return total > shown ? `Showing latest ${shown} of ${total} ${noun}.` : '';
}

const ymdOf = (v: unknown) => /^\d{4}-\d{2}-\d{2}/.exec(asString(v))?.[0] ?? '';

export function toInstructorOverview(raw: Record<string, unknown>): InstructorOverviewModel {
  const p = asRecord(raw.profile) ?? {};
  const cohorts = toRecords(raw.cohorts);
  const assignments = toRecords(raw.assignments);
  const t = asRecord(raw.totals);
  // An older API without totals: fall back to what the lists hold.
  const totals: OverviewTotals = t
    ? {
      cohorts: asNumber(t.cohorts),
      assignments: asNumber(t.assignments),
      learners: asNumber(t.learners),
      pendingEval: asNumber(t.pendingEval),
    }
    : {
      cohorts: cohorts.length,
      assignments: assignments.length,
      learners: cohorts.reduce((s, c) => s + asNumber(c.learnerCount), 0),
      pendingEval: assignments.reduce((s, a) => s + asNumber(a.pendingCount), 0),
    };
  return {
    totals,
    profile: {
      id: asString(p.id),
      name: asString(p.name),
      email: asString(p.email),
      phone: asString(p.phone),
      whatsapp: asString(p.whatsapp),
      qualification: asString(p.qualification),
      biography: asString(p.biography),
      image: asString(p.image),
      status: asNumber(p.status),
      disabled: p.disabled === true,
      createdAt: asString(p.createdAt),
    },
    cohorts: cohorts.map((c) => ({
      id: asNumber(c.id),
      title: asString(c.title),
      code: asString(c.cohortCode),
      course: asString(c.courseTitle),
      startDate: ymdOf(c.startDate),
      endDate: ymdOf(c.endDate),
      learners: asNumber(c.learnerCount),
      upcomingSessions: asNumber(c.upcomingSessionCount),
    })),
    sessions: toRecords(raw.liveClasses).map((s) => ({
      id: asNumber(s.id),
      title: asString(s.title),
      date: ymdOf(s.date),
      fromTime: asString(s.fromTime),
      toTime: asString(s.toTime),
      cohortTitle: asString(s.cohortTitle),
      hasRecording: s.hasRecording === true,
    })),
    assignments: assignments.map((a) => ({
      id: asNumber(a.id),
      title: asString(a.title),
      cohortTitle: asString(a.cohortTitle),
      dueDate: ymdOf(a.dueDate),
      totalMarks: a.totalMarks === null || a.totalMarks === undefined ? null : asNumber(a.totalMarks),
      submissions: asNumber(a.submissionCount),
      graded: asNumber(a.gradedCount),
      pending: asNumber(a.pendingCount),
    })),
  };
}

/** Where a cohort stands today, from its own start / end dates. */
export function cohortPhase(c: Pick<CohortItem, 'startDate' | 'endDate'>, today: string): CohortPhase {
  if (!c.startDate && !c.endDate) return 'Undated';
  if (c.startDate && c.startDate > today) return 'Upcoming';
  if (c.endDate && c.endDate < today) return 'Completed';
  return 'Ongoing';
}

export function sessionPhase(s: Pick<SessionItem, 'date'>, today: string): SessionPhase {
  if (!s.date || s.date < today) return 'Past';
  return s.date === today ? 'Today' : 'Upcoming';
}

export interface InstructorStats {
  cohorts: number;
  /** Seats across the instructor's cohorts (a learner in two cohorts counts twice). */
  learners: number;
  sessionsDone: number;
  pendingEval: number;
}

/** Cohort / learner / evaluation figures come from the server totals, which cover the capped-off rows too. */
export function instructorStats(m: InstructorOverviewModel, today: string): InstructorStats {
  return {
    cohorts: m.totals.cohorts,
    learners: m.totals.learners,
    sessionsDone: m.sessions.filter((s) => sessionPhase(s, today) === 'Past').length,
    pendingEval: m.totals.pendingEval,
  };
}

const has = (q: string, ...fields: string[]) => fields.some((f) => f.toLowerCase().includes(q));

export function filterCohorts(rows: CohortItem[], search: string, phase: '' | CohortPhase, today: string): CohortItem[] {
  const q = search.trim().toLowerCase();
  return rows.filter((c) => (!phase || cohortPhase(c, today) === phase) && (!q || has(q, c.title, c.code, c.course)));
}

/** Upcoming soonest-first, then past most-recent-first (the order a schedule is read in). */
export function filterSessions(rows: SessionItem[], search: string, phase: '' | SessionPhase, today: string): SessionItem[] {
  const q = search.trim().toLowerCase();
  const kept = rows.filter((s) => (!phase || sessionPhase(s, today) === phase) && (!q || has(q, s.title, s.cohortTitle)));
  const key = (s: SessionItem) => `${s.date}T${s.fromTime}`;
  const ahead = kept.filter((s) => sessionPhase(s, today) !== 'Past').sort((a, b) => key(a).localeCompare(key(b)));
  const behind = kept.filter((s) => sessionPhase(s, today) === 'Past').sort((a, b) => key(b).localeCompare(key(a)));
  return [...ahead, ...behind];
}

export type AssignmentFilter = '' | 'pending' | 'done' | 'none';

/** pending = ungraded submissions; done = all submissions graded; none = no submissions yet. */
export function assignmentState(a: AssignmentItem): Exclude<AssignmentFilter, ''> {
  if (a.submissions === 0) return 'none';
  return a.pending > 0 ? 'pending' : 'done';
}

export function filterAssignments(rows: AssignmentItem[], search: string, state: AssignmentFilter): AssignmentItem[] {
  const q = search.trim().toLowerCase();
  return rows.filter((a) => (!state || assignmentState(a) === state) && (!q || has(q, a.title, a.cohortTitle)));
}

/** The stored biography as plain text: it may hold legacy HTML, which is never rendered as markup. */
export function biographyText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/li)\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
