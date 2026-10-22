import { istToday, matchesQuery } from '../kit/format.js';

// Centre portal → Cohorts view model (Naji's centre login design, 2026-10-22).
// List rows come from GET /centre/cohorts/index (existing), the Add Cohort pick
// lists from GET /centre/cohorts/options, one cohort from GET /centre/cohorts/view.
// Pure so it is unit-tested; calendar days stay YYYY-MM-DD strings.

export type CohortStatus = 'upcoming' | 'running' | 'completed';

export const COHORT_STATUS_LABEL: Record<CohortStatus, string> = { upcoming: 'Upcoming', running: 'Running', completed: 'Completed' };
export const COHORT_STATUS_STYLE: Record<CohortStatus, string> = {
  upcoming: 'bg-warning-soft text-warning-foreground border-transparent',
  running: 'bg-info-soft text-info border-transparent',
  completed: 'bg-success-soft text-success border-transparent',
};

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(rec) : [];
}
function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}
function int(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

/** Upcoming before the start day, Completed after the end day, else Running (IST calendar days). */
export function cohortStatusOf(startYmd: string, endYmd: string, todayYmd: string): CohortStatus {
  if (startYmd && startYmd > todayYmd) return 'upcoming';
  if (endYmd && endYmd < todayYmd) return 'completed';
  return 'running';
}

/** The YYYY-MM-DD of a stored date ("2026-10-17T00:00:00.000Z" → "2026-10-17"). */
export function ymdOf(value: unknown): string {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(str(value));
  return m ? (m[1] ?? '') : '';
}

// ─── Pick lists ─────────────────────────────────────────────────────────────

export interface PickOption { id: string; title: string }
export interface SubjectOption extends PickOption { courseIds: string[] }
export interface CohortOptions {
  courses: PickOption[];
  subjects: SubjectOption[];
  instructors: PickOption[];
  languages: PickOption[];
}

function pickList(value: unknown): PickOption[] {
  return list(value).map((o) => ({ id: str(o.id), title: str(o.title) })).filter((o) => o.id && o.title);
}

export function toCohortOptions(data: Record<string, unknown>): CohortOptions {
  return {
    courses: pickList(data.courses),
    subjects: list(data.subjects)
      .map((s) => ({
        id: str(s.id),
        title: str(s.title),
        courseIds: Array.isArray(s.courseIds) ? s.courseIds.map(str).filter(Boolean) : [],
      }))
      .filter((s) => s.id && s.title),
    instructors: pickList(data.instructors),
    languages: pickList(data.languages),
  };
}

// ─── List ───────────────────────────────────────────────────────────────────

export interface CohortRow {
  id: string;
  /** "C75", the id the admin Cohorts list shows. */
  cid: string;
  code: string;
  title: string;
  course: string;
  subject: string;
  language: string;
  instructor: string;
  startYmd: string;
  endYmd: string;
  status: CohortStatus;
  students: number;
  liveClasses: number;
}

export function toCohortRows(rows: Record<string, unknown>[], languages: PickOption[], todayYmd: string = istToday()): CohortRow[] {
  const languageTitle = new Map(languages.map((l) => [l.id, l.title]));
  return rows.map((r) => {
    const startYmd = ymdOf(r.start_date);
    const endYmd = ymdOf(r.end_date);
    return {
      id: str(r.id),
      cid: `C${str(r.id)}`,
      code: str(r.cohort_id),
      title: str(r.title),
      course: str(r.course_name),
      subject: str(r.subject_name),
      language: languageTitle.get(str(r.language_id)) ?? '',
      instructor: str(r.instructor_name),
      startYmd,
      endYmd,
      status: cohortStatusOf(startYmd, endYmd, todayYmd),
      students: int(r.students_count),
      liveClasses: int(r.lives_classes_count),
    };
  }).filter((r) => r.id);
}

export type CohortTab = CohortStatus | 'all';
export interface CohortFilters {
  tab: CohortTab;
  search: string;
  course: string;
  subject: string;
  language: string;
  instructor: string;
}
export const EMPTY_COHORT_FILTERS: CohortFilters = { tab: 'all', search: '', course: 'all', subject: 'all', language: 'all', instructor: 'all' };

export function filterCohorts(rows: CohortRow[], f: CohortFilters): CohortRow[] {
  return rows.filter((r) =>
    (f.tab === 'all' || r.status === f.tab)
    && (f.course === 'all' || r.course === f.course)
    && (f.subject === 'all' || r.subject === f.subject)
    && (f.language === 'all' || r.language === f.language)
    && (f.instructor === 'all' || r.instructor === f.instructor)
    && matchesQuery(f.search, [r.cid, r.title, r.code, r.course, r.instructor, r.subject]),
  );
}

export function distinct(rows: CohortRow[], pick: (r: CohortRow) => string): string[] {
  return [...new Set(rows.map(pick).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export type CohortSortKey = 'status' | 'cid' | 'code' | 'startYmd' | 'course' | 'subject' | 'language' | 'instructor' | 'students' | 'liveClasses';

/** Sorted copy; the cohort id sorts numerically ("C9" before "C10"). */
export function sortCohorts(rows: CohortRow[], key: CohortSortKey, dir: 'asc' | 'desc'): CohortRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === 'students' || key === 'liveClasses') return sign * (a[key] - b[key]);
    if (key === 'cid') return sign * (Number(a.id) - Number(b.id));
    return sign * String(a[key]).localeCompare(String(b[key]));
  });
}

export function cohortStats(rows: CohortRow[]): { total: number; running: number; upcoming: number; students: number } {
  return {
    total: rows.length,
    running: rows.filter((r) => r.status === 'running').length,
    upcoming: rows.filter((r) => r.status === 'upcoming').length,
    students: rows.reduce((sum, r) => sum + r.students, 0),
  };
}

export function tabCounts(rows: CohortRow[]): Record<CohortTab, number> {
  return {
    all: rows.length,
    upcoming: rows.filter((r) => r.status === 'upcoming').length,
    running: rows.filter((r) => r.status === 'running').length,
    completed: rows.filter((r) => r.status === 'completed').length,
  };
}

// ─── Add Cohort form ────────────────────────────────────────────────────────

export type CohortType = 'subject' | 'course';

export interface CohortForm {
  type: CohortType;
  subjectId: string;
  courseId: string;
  name: string;
  code: string;
  instructorId: string;
  languageId: string;
  startDate: string;
  endDate: string;
}

export const EMPTY_COHORT_FORM: CohortForm = {
  type: 'subject', subjectId: '', courseId: '', name: '', code: '', instructorId: '', languageId: '', startDate: '', endDate: '',
};

/** Subjects offered under a course (all subjects when no course is picked yet). */
export function subjectsForCourse(options: CohortOptions, courseId: string): SubjectOption[] {
  return courseId ? options.subjects.filter((s) => s.courseIds.includes(courseId)) : options.subjects;
}

const MONTHS_UPPER = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const;

/** "OCT26" from 2026-10-17 ('' when the day does not parse). */
export function monthTag(startYmd: string): string {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(startYmd);
  const month = m ? Number(m[2]) : 0;
  return m && month >= 1 && month <= 12 ? `${MONTHS_UPPER[month - 1]}${(m[1] ?? '').slice(2)}` : '';
}

/** The design's auto name ("Subject – OCT26") and code ("SUBOCT26"), from the base title and start month. */
export function autoNameAndCode(baseTitle: string, startYmd: string): { name: string; code: string } {
  const tag = monthTag(startYmd);
  if (!baseTitle || !tag) return { name: '', code: '' };
  const initials = baseTitle.split(/\s+/).filter(Boolean).map((w) => w.charAt(0)).join('').slice(0, 3).toUpperCase();
  return { name: `${baseTitle} – ${tag}`, code: `${initials}${tag}` };
}

/** The first problem with the form, or null when it can be created. */
export function cohortFormError(f: CohortForm): string | null {
  if (!f.courseId) return 'Choose the course.';
  if (f.type === 'subject' && !f.subjectId) return 'Choose the subject.';
  if (!f.instructorId) return 'Choose the instructor.';
  if (!f.languageId) return 'Choose the language.';
  if (!f.startDate || !f.endDate) return 'Enter the start and end dates.';
  if (f.endDate < f.startDate) return 'End date must be on or after the start date.';
  return null;
}

// ─── One cohort ─────────────────────────────────────────────────────────────

export interface Learner { id: string; name: string; studentCode: string }
export type SessionState = 'scheduled' | 'completed';
export interface LiveSession {
  id: string;
  title: string;
  dateYmd: string;
  from: string;
  to: string;
  platform: string;
  joinUrl: string;
  hostEmail: string;
  state: SessionState;
  hasRecording: boolean;
}
export interface AssignmentItem { id: string; title: string; description: string; totalMarks: number | null; dueYmd: string; submissions: number }
export interface AnnouncementItem { id: string; title: string; content: string; sentYmd: string }

export interface CohortDetail {
  today: string;
  id: string;
  cid: string;
  code: string;
  title: string;
  courses: string[];
  subject: string;
  language: string;
  instructor: string;
  hasInstructor: boolean;
  startYmd: string;
  endYmd: string;
  status: CohortStatus;
  learners: Learner[];
  sessions: LiveSession[];
  assignments: AssignmentItem[];
  announcements: AnnouncementItem[];
}

export function toCohortDetail(data: Record<string, unknown>): CohortDetail {
  const c = rec(data.cohort);
  const status = str(c.status);
  return {
    today: str(data.today),
    id: str(c.id),
    cid: str(c.cid),
    code: str(c.code),
    title: str(c.title),
    courses: Array.isArray(c.courses) ? c.courses.map(str).filter(Boolean) : [],
    subject: str(c.subject),
    language: str(c.language),
    instructor: str(c.instructor),
    hasInstructor: c.hasInstructor === true,
    startYmd: str(c.startYmd),
    endYmd: str(c.endYmd),
    status: status === 'upcoming' || status === 'completed' ? status : 'running',
    learners: list(data.learners).map((l) => ({ id: str(l.id), name: str(l.name), studentCode: str(l.studentCode) })).filter((l) => l.id),
    sessions: list(data.liveClasses).map((s) => ({
      id: str(s.id),
      title: str(s.title),
      dateYmd: str(s.dateYmd),
      from: str(s.from),
      to: str(s.to),
      platform: str(s.platform),
      joinUrl: /^https?:\/\//i.test(str(s.joinUrl)) ? str(s.joinUrl) : '',
      hostEmail: str(s.hostEmail),
      state: str(s.state) === 'completed' ? 'completed' : 'scheduled',
      hasRecording: s.hasRecording === true,
    } as LiveSession)).filter((s) => s.id),
    assignments: list(data.assignments).map((a) => ({
      id: str(a.id),
      title: str(a.title),
      description: str(a.description),
      totalMarks: typeof a.totalMarks === 'number' ? a.totalMarks : null,
      dueYmd: str(a.dueYmd),
      submissions: int(a.submissions),
    })).filter((a) => a.id),
    announcements: list(data.announcements).map((a) => ({ id: str(a.id), title: str(a.title), content: str(a.content), sentYmd: str(a.sentYmd) })).filter((a) => a.id),
  };
}

/** Learners not yet in the cohort, from the centre's students (rows of /centre/students/index). */
export function addableStudents(rows: Record<string, unknown>[], inCohort: Learner[]): Learner[] {
  const taken = new Set(inCohort.map((l) => l.id));
  const seen = new Set<string>();
  const out: Learner[] = [];
  for (const r of rows) {
    const id = str(r.id);
    if (!id || taken.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, name: str(r.name) || str(r.student_name) || `Student ${id}`, studentCode: str(r.student_id) || str(r.enrollment_id) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export type SessionPlatformChoice = 'teams' | 'link';

export interface SessionForm {
  title: string;
  platform: SessionPlatformChoice;
  link: string;
  dateYmd: string;
  from: string;
  to: string;
}

export const EMPTY_SESSION_FORM: SessionForm = { title: '', platform: 'link', link: '', dateYmd: '', from: '', to: '' };

export function sessionFormError(f: SessionForm, todayYmd: string): string | null {
  if (!f.title.trim()) return 'Enter the session title.';
  if (!f.dateYmd) return 'Enter the session date.';
  if (f.dateYmd < todayYmd) return 'The session date cannot be in the past.';
  if (!f.from || !f.to) return 'Enter the start and end times.';
  if (f.to <= f.from) return 'The end time must be after the start time.';
  if (f.platform === 'link' && !/^https?:\/\/\S+$/i.test(f.link.trim())) return 'Paste the meeting link (https://...).';
  return null;
}

export function splitSessions(sessions: LiveSession[]): { scheduled: LiveSession[]; completed: LiveSession[] } {
  return {
    scheduled: sessions.filter((s) => s.state === 'scheduled'),
    completed: sessions.filter((s) => s.state === 'completed'),
  };
}
