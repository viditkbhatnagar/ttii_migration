import { useMemo, useRef, useState } from 'react';
import {
  ClipboardList,
  FileText,
  Eye,
  MessageSquare,
  Link2,
  Search,
  CheckCircle2,
  Clock3,
  CalendarDays,
  Hourglass,
  ShieldCheck,
  Wifi,
  AlertCircle,
  Award,
  PlayCircle,
  Download,
  Upload,
  GraduationCap,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StudentLoader as PageLoader } from '@/student/components/StudentLoader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminTabBar } from '../../../admin/shared/components/AdminTabBar.js';
import { SegmentedTabs } from '../../components/SegmentedTabs.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';
import { FormalExamPlayer, type FormalExamMeta } from '../../components/FormalExamPlayer.js';
import { useStudentLayout } from '../../layout/StudentLayoutContext.js';

type MainTab = 'assignments' | 'exams';
type AssignmentSubTab = 'pending' | 'submitted' | 'graded';
type ExamSubTab = 'available' | 'upcoming' | 'completed' | 'missed';

// A single assignment row, normalised from the legacy `/assignment/index`
// shape (see assessment-service.toAssignmentData).
interface AssignmentView {
  id: string;
  title: string;
  subject: string;
  dueLabel: string;
  briefUrl: string;
  isSaved: boolean;
  isSubmitted: boolean;
  isReviewed: boolean;
  score: string;
  totalMarks: string;
  raw: Record<string, unknown>;
}

// A single exam row, normalised from `/exams/index` (assessment-service maps
// each exam to a derived `state` plus window timestamps).
interface ExamView {
  id: string;
  title: string;
  code: string;
  course: string;
  subject: string;
  state: string;
  dateLabel: string;
  windowLabel: string;
  durationLabel: string;
  marksLabel: string;
  questionCount: number;
  raw: Record<string, unknown>;
}

function parseSubmittedFiles(value: unknown): Array<{ file: string; date: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'object' && entry !== null) {
        const record = entry as Record<string, unknown>;
        return {
          file: typeof record.file === 'string' ? record.file : '',
          date: typeof record.date === 'string' ? record.date : '',
        };
      }
      return { file: '', date: '' };
    })
    .filter((entry) => entry.file !== '');
}

function getFileName(url: string): string {
  const parts = url.split('/');
  return parts[parts.length - 1] || 'File';
}

// "12-06-2025" / "12/06/2025" reparse cleanly enough through formatDate, but
// the backend also ships a pre-formatted "12 Jun 2025" string — prefer that.
function assignmentDueLabel(raw: Record<string, unknown>): string {
  const formatted = asString(raw.formatted_date);
  if (formatted) return formatted;
  const date = asString(raw.date) || asString(raw.due_date) || asString(raw.end_date);
  return date ? formatDate(date) : '';
}

function toAssignmentView(raw: Record<string, unknown>): AssignmentView {
  const id = asString(raw.id);
  // marks ships as "X/Y"; split so we can show an EduPulse-style "X / Y".
  const marksRaw = asString(raw.marks);
  const marksParts = marksRaw.includes('/') ? marksRaw.split('/') : [];
  const score = (marksParts[0] ?? '').trim();
  const totalMarks = (marksParts[1] ?? '').trim() || asString(raw.total_marks);
  return {
    id,
    title: asString(raw.title) || `Assignment ${id}`,
    subject: asString(raw.subject_title) || asString(raw.subject),
    dueLabel: assignmentDueLabel(raw),
    briefUrl: asString(raw.file),
    isSaved: asNumber(raw.is_saved) > 0,
    isSubmitted: asNumber(raw.is_submitted) > 0,
    isReviewed: asNumber(raw.is_reviewed) === 1,
    score,
    totalMarks,
    raw,
  };
}

// Status pill mirroring EduPulse's assignment lifecycle labels, derived from
// the data we actually have (saved draft / submitted / reviewed).
function assignmentStatusBadge(a: AssignmentView): { label: string; className: string } {
  if (a.isReviewed) {
    return { label: 'Graded', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  }
  if (a.isSubmitted) {
    return { label: 'Awaiting review', className: 'bg-sky-50 text-sky-700 border-sky-200' };
  }
  if (a.isSaved) {
    return { label: 'Draft saved', className: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  return { label: 'Not started', className: 'bg-slate-100 text-slate-600 border-slate-200' };
}

function toExamView(raw: Record<string, unknown>): ExamView {
  const id = asString(raw.id);
  const start = asString(raw.start_datetime);
  const end = asString(raw.end_datetime);
  const duration = asString(raw.duration) || asString(raw.time_limit);
  const totalMark = asString(raw.total_mark) || asString(raw.total_marks);
  const questionCount = asNumber(raw.total_questions) || asNumber(raw.questions_count);
  return {
    id,
    title: asString(raw.title) || `Exam ${id}`,
    code: asString(raw.exam_code),
    course: asString(raw.course_title),
    subject: asString(raw.subject_title),
    state: asString(raw.state),
    dateLabel: asString(raw.date) ? asString(raw.date) : start ? formatDate(start) : '',
    windowLabel:
      start && end
        ? `${formatDate(start)} – ${formatDate(end)}`
        : start
          ? `From ${formatDate(start)}`
          : '',
    durationLabel: duration ? `${duration} min` : '',
    marksLabel: totalMark ? `${totalMark} marks` : '',
    questionCount,
    raw,
  };
}

// Pull a clean "HH:MM" start label straight from the ISO/space-separated
// start_datetime string (avoids new Date() timezone shifts on a naive value).
function examStartLabel(raw: Record<string, unknown>): string {
  const m = asString(raw.start_datetime).match(/[T\s](\d{2}:\d{2})/);
  return m?.[1] ?? '';
}

// Build the FormalExamPlayer meta from the list row + the logged-in student,
// so the instructions + attempt screens can show real context (course, subject,
// date, marks, name, enrolment). Only what we actually have.
function buildExamMeta(e: ExamView, currentUser: { name: string; studentId: string } | null): FormalExamMeta {
  // Empty strings are fine — the player truthy-checks each field, so blanks are
  // treated as "absent". Avoids exactOptionalPropertyTypes errors from undefined.
  return {
    code: e.code,
    course: e.course,
    subject: e.subject,
    dateLabel: e.dateLabel,
    startLabel: examStartLabel(e.raw),
    totalMarksLabel: asString(e.raw.total_mark) || asString(e.raw.total_marks),
    studentName: currentUser?.name ?? '',
    enrollmentNo: currentUser?.studentId ?? '',
  };
}

// Exam status pill keyed off the backend-derived `state`.
function examStatusBadge(state: string): { label: string; className: string } {
  switch (state) {
    case 'available':
      return { label: 'Available', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'upcoming':
      return { label: 'Upcoming', className: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 'submitted':
      return { label: 'Completed', className: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' };
    default:
      return { label: 'Closed', className: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
}

interface StatCard {
  id: AssignmentSubTab | ExamSubTab;
  label: string;
  count: number;
  icon: typeof ClipboardList;
  tone: { tile: string; ring: string };
}

function StatCardButton({
  card,
  active,
  onSelect,
}: {
  card: StatCard;
  active: boolean;
  onSelect: () => void;
}) {
  const Icon = card.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex items-center gap-3 rounded-2xl border bg-white p-3.5 text-left shadow-sm transition-all hover:shadow-md ${
        active ? `border-transparent ring-2 ${card.tone.ring}` : 'border-slate-200'
      }`}
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${card.tone.tile}`}>
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xl font-bold leading-none text-student-text">{card.count}</span>
        <span className="mt-1 block truncate text-xs font-medium text-student-muted">{card.label}</span>
      </span>
    </button>
  );
}

export default function StudentAssessmentsPage({ api, session, pathname }: StudentPageProps) {
  // Assignments and Exams share this component but are separate sidebar pages, so
  // the active surface is driven by the route — there is no in-page
  // Assignments/Exams toggle (Naji 2026-06-05: that tab is redundant since Exams
  // has its own page).
  const surface: MainTab = pathname.includes('/exams') ? 'exams' : 'assignments';
  const [assignmentSubTab, setAssignmentSubTab] = useState<AssignmentSubTab>('pending');
  const [examSubTab, setExamSubTab] = useState<ExamSubTab>('available');
  const [activeExam, setActiveExam] = useState<{ examId: string; title: string; meta: FormalExamMeta } | null>(null);
  const { currentUser } = useStudentLayout();
  const [searchQuery, setSearchQuery] = useState('');
  const [examCourseFilter, setExamCourseFilter] = useState('all');
  const [examSubjectFilter, setExamSubjectFilter] = useState('all');
  const [detailItem, setDetailItem] = useState<Record<string, unknown> | null>(null);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAssessments(session.token),
    [api, session.token],
    `student:assessments:${session.userId}`,
  );

  // Normalise once; downstream views read typed shapes only.
  const assignmentBuckets = useMemo(() => {
    const all = [
      ...(data?.assignments.current ?? []),
      ...(data?.assignments.upcoming ?? []),
      ...(data?.assignments.completed ?? []),
    ].map(toAssignmentView);
    return {
      pending: all.filter((a) => !a.isSubmitted),
      submitted: all.filter((a) => a.isSubmitted && !a.isReviewed),
      graded: all.filter((a) => a.isReviewed),
    };
  }, [data]);

  // The API folds "closed" and "submitted" both into `expired`; split them so
  // EduPulse's Completed vs Missed cards stay honest.
  const examBuckets = useMemo(() => {
    const expired = (data?.exams.expired ?? []).map(toExamView);
    return {
      available: (data?.exams.available ?? []).map(toExamView),
      upcoming: (data?.exams.upcoming ?? []).map(toExamView),
      completed: expired.filter((e) => e.state === 'submitted'),
      missed: expired.filter((e) => e.state !== 'submitted'),
    };
  }, [data]);

  if (loading) {
    return <PageLoader label="Loading student assessments..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-student-text">Assessments</h1>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  // Proctored formal-exam player — must stay fully intact (full-screen +
  // tab-switch detection lives inside FormalExamPlayer; proctored defaults true).
  // The player owns its full layout now (instructions + focused attempt screen),
  // so render it directly rather than inside a constrained card.
  if (activeExam) {
    return (
      <FormalExamPlayer
        api={api}
        authToken={session.token}
        examId={activeExam.examId}
        title={activeExam.title}
        meta={activeExam.meta}
        onClose={() => { setActiveExam(null); reload(); }}
      />
    );
  }

  const assignmentStatCards: StatCard[] = [
    { id: 'pending', label: 'Pending', count: assignmentBuckets.pending.length, icon: Clock3, tone: { tile: 'bg-amber-50 text-amber-600', ring: 'ring-amber-400' } },
    { id: 'submitted', label: 'Submitted', count: assignmentBuckets.submitted.length, icon: Hourglass, tone: { tile: 'bg-sky-50 text-sky-600', ring: 'ring-sky-400' } },
    { id: 'graded', label: 'Graded', count: assignmentBuckets.graded.length, icon: CheckCircle2, tone: { tile: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-400' } },
  ];

  const examStatCards: StatCard[] = [
    { id: 'available', label: 'Available Now', count: examBuckets.available.length, icon: PlayCircle, tone: { tile: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-400' } },
    { id: 'upcoming', label: 'Upcoming', count: examBuckets.upcoming.length, icon: CalendarDays, tone: { tile: 'bg-sky-50 text-sky-600', ring: 'ring-sky-400' } },
    { id: 'completed', label: 'Completed', count: examBuckets.completed.length, icon: Award, tone: { tile: 'bg-fuchsia-50 text-fuchsia-600', ring: 'ring-fuchsia-400' } },
    { id: 'missed', label: 'Missed', count: examBuckets.missed.length, icon: AlertCircle, tone: { tile: 'bg-red-50 text-red-600', ring: 'ring-red-400' } },
  ];

  const activeAssignments = assignmentBuckets[assignmentSubTab];
  const activeExams = examBuckets[examSubTab];

  // Exam filter options across ALL buckets — course + question-derived subject
  // (Naji 2026-06-06: add subject/course filters to the Exams page).
  const allExams = [
    ...examBuckets.available,
    ...examBuckets.upcoming,
    ...examBuckets.completed,
    ...examBuckets.missed,
  ];
  const examCourseOptions = [...new Set(allExams.map((e) => e.course).filter(Boolean))].sort();
  const examSubjectOptions = [...new Set(allExams.map((e) => e.subject).filter(Boolean))].sort();

  const query = searchQuery.trim().toLowerCase();
  const filteredAssignments = query
    ? activeAssignments.filter((a) => a.title.toLowerCase().includes(query))
    : activeAssignments;
  const filteredExams = activeExams.filter((e) => {
    if (examCourseFilter !== 'all' && e.course !== examCourseFilter) return false;
    if (examSubjectFilter !== 'all' && e.subject !== examSubjectFilter) return false;
    if (query && !e.title.toLowerCase().includes(query)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-student-text">{surface === 'exams' ? 'Exams' : 'Assignments'}</h1>
        <p className="mt-1 text-sm text-student-muted">
          {surface === 'exams'
            ? 'Your scheduled, available and past examinations'
            : 'Submit work, track grades and view feedback'}
        </p>
      </div>

      {surface === 'assignments' ? (
        <div className="space-y-5">
          {/* Stat cards double as the bucket selector (EduPulse layout). */}
          <div className="grid grid-cols-3 gap-3">
            {assignmentStatCards.map((card) => (
              <StatCardButton
                key={card.id}
                card={card}
                active={assignmentSubTab === card.id}
                onSelect={() => setAssignmentSubTab(card.id as AssignmentSubTab)}
              />
            ))}
          </div>

          {/* Single white card: tab bar + search header, then divided rows
              with row hover (Naji 2026-06-06: one listing card, not a separate
              card per row). */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <AdminTabBar
                tabs={assignmentStatCards.map((c) => ({ id: c.id, label: c.label, count: c.count }))}
                activeTab={assignmentSubTab}
                onChange={(id) => setAssignmentSubTab(id as AssignmentSubTab)}
              />
              <div className="relative w-full sm:max-w-xs">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  aria-label="Search assignments"
                  placeholder="Search assignments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-xl pl-10"
                />
              </div>
            </div>

            {filteredAssignments.length === 0 ? (
              <div role="status" aria-live="polite" className="p-12 text-center">
                <ClipboardList aria-hidden="true" className="mx-auto mb-4 size-12 text-slate-300" />
                <p className="text-sm text-slate-500">No {assignmentSubTab} assignments.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredAssignments.map((a) => {
                  const badge = assignmentStatusBadge(a);
                  const meta = [a.subject, a.dueLabel ? `Due ${a.dueLabel}` : ''].filter(Boolean).join(' · ');
                  return (
                    <li key={a.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setDetailItem(a.raw)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setDetailItem(a.raw);
                          }
                        }}
                        className="flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center"
                      >
                        {/* Doc icon + identity */}
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-student-primary-light text-student-primary">
                            <FileText aria-hidden="true" className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-student-text">{a.title}</p>
                            <p className="mt-0.5 truncate text-xs text-student-muted">{meta || 'No due date'}</p>
                          </div>
                        </div>

                        {/* Status */}
                        <span className={`inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>

                        {/* Score */}
                        <div className="w-16 shrink-0 text-left sm:text-right">
                          <p className="text-sm font-bold text-student-text">
                            {a.isReviewed && a.score !== '' ? a.score : '—'}
                            <span className="text-xs font-normal text-student-muted">/{a.totalMarks || '100'}</span>
                          </p>
                        </div>

                        {/* Action — View opens the assignment detail page. */}
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailItem(a.raw);
                            }}
                          >
                            <Eye aria-hidden="true" className="size-4" />
                            View
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* 4 status stat cards (EduPulse) doubling as bucket selector. */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {examStatCards.map((card) => (
              <StatCardButton
                key={card.id}
                card={card}
                active={examSubTab === card.id}
                onSelect={() => setExamSubTab(card.id as ExamSubTab)}
              />
            ))}
          </div>

          {/* Search + course/subject filters (Naji 2026-06-06). Course is the
              exam's course; subject is derived from the exam's question bank. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full flex-1">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Search exams"
                placeholder="Search exams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl pl-10"
              />
            </div>
            <select
              aria-label="Filter by course"
              value={examCourseFilter}
              onChange={(e) => setExamCourseFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-student-text sm:w-48"
            >
              <option value="all">All courses</option>
              {examCourseOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              aria-label="Filter by subject"
              value={examSubjectFilter}
              onChange={(e) => setExamSubjectFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-student-text sm:w-48"
            >
              <option value="all">All subjects</option>
              {examSubjectOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Status tabs — EduPulse segmented pills. */}
          <SegmentedTabs
            tabs={examStatCards.map((c) => ({ id: c.id, label: c.label, count: c.count }))}
            active={examSubTab}
            onChange={(id) => setExamSubTab(id as ExamSubTab)}
            ariaLabel="Exam status filters"
          />

          {filteredExams.length === 0 ? (
            <div role="status" aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <FileText aria-hidden="true" className="mx-auto mb-4 size-12 text-slate-300" />
              <p className="text-sm text-slate-500">No {examSubTab} exams.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExams.map((e) => {
                const badge = examStatusBadge(e.state);
                return (
                  <div
                    key={e.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      {/* Identity + badges */}
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-student-primary-light text-student-primary">
                          <FileText aria-hidden="true" className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-bold leading-snug text-student-text">{e.title}</h3>
                          {e.code || e.course || e.subject ? (
                            <p className="mt-0.5 truncate text-xs text-student-muted">
                              {[e.code, e.course, e.subject].filter(Boolean).join(' · ')}
                            </p>
                          ) : null}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                              {badge.label}
                            </span>
                            {/* Proctoring badge — formal exams run the proctored player. */}
                            {e.state === 'available' || e.state === 'upcoming' ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-0.5 text-xs font-semibold text-fuchsia-700">
                                <ShieldCheck aria-hidden="true" className="size-3" />
                                Proctored
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                                <Wifi aria-hidden="true" className="size-3" />
                                Online
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Context action */}
                      <div className="shrink-0 sm:pt-0.5">
                        {e.state === 'available' ? (
                          <Button
                            onClick={() => setActiveExam({ examId: e.id, title: e.title, meta: buildExamMeta(e, currentUser) })}
                            className="h-10 w-full rounded-xl bg-student-primary px-5 text-sm font-semibold text-white hover:bg-student-primary/90 sm:w-auto"
                          >
                            Start Exam
                          </Button>
                        ) : e.state === 'upcoming' ? (
                          <span className="inline-flex h-10 items-center rounded-xl bg-sky-50 px-4 text-xs font-medium text-sky-700">
                            Starts Soon
                          </span>
                        ) : e.state === 'submitted' ? (
                          <span className="inline-flex h-10 items-center rounded-xl bg-fuchsia-50 px-4 text-xs font-medium text-fuchsia-700">
                            Awaiting Result
                          </span>
                        ) : (
                          <span className="inline-flex h-10 items-center rounded-xl bg-slate-50 px-4 text-xs font-medium text-slate-500">
                            Missed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata strip: DATE / WINDOW / DURATION / MARKS */}
                    <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
                      <div className="min-w-0">
                        <dt className="text-[10px] uppercase tracking-wide text-student-muted">Date</dt>
                        <dd className="mt-0.5 truncate text-xs font-semibold text-student-text">{e.dateLabel || '—'}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[10px] uppercase tracking-wide text-student-muted">Window</dt>
                        <dd className="mt-0.5 truncate text-xs font-semibold text-student-text">{e.windowLabel || '—'}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[10px] uppercase tracking-wide text-student-muted">Duration</dt>
                        <dd className="mt-0.5 truncate text-xs font-semibold text-student-text">{e.durationLabel || '—'}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[10px] uppercase tracking-wide text-student-muted">Marks</dt>
                        <dd className="mt-0.5 truncate text-xs font-semibold text-student-text">
                          {e.marksLabel || '—'}
                          {e.questionCount > 0 ? (
                            <span className="font-normal text-student-muted"> · {e.questionCount} Q</span>
                          ) : null}
                        </dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Assignment detail / view page — matches the EduPulse view (Naji 2026-06-05). */}
      <Dialog open={detailItem !== null} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-6xl!">
          <DialogHeader className="sr-only">
            <DialogTitle>{detailItem ? asString(detailItem.title) || 'Assignment' : 'Assignment'}</DialogTitle>
          </DialogHeader>
          {detailItem ? (
            <AssignmentDetail
              item={detailItem}
              onClose={() => setDetailItem(null)}
              onSubmitFiles={async (files) => {
                await api.submitAssignmentFiles(session.token, asString(detailItem.id), files);
                reload();
              }}
              onSaveDraft={async () => {
                await api.toggleSavedAssignment(session.token, asString(detailItem.id));
                reload();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Strip HTML tags to plain text for legacy rich-text instruction blobs.
function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

// Instruction lines — the backend pre-splits HTML <li>/<p> into item.instruction[];
// fall back to description / raw instructions as a single block.
function instructionLines(item: Record<string, unknown>): string[] {
  const arr = item.instruction;
  if (Array.isArray(arr)) {
    const lines = arr.map((x) => stripHtml(asString(x))).filter((s) => s !== '');
    if (lines.length > 0) return lines;
  }
  const block = asString(item.description) || stripHtml(asString(item.instructions));
  return block ? [block] : [];
}

function daysRemainingLabel(due: string): string {
  if (!due) return '';
  const ms = new Date(due).getTime();
  if (Number.isNaN(ms)) return '';
  const days = Math.ceil((ms - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'}`;
}

function QuickInfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-student-primary" />
      <div className="min-w-0">
        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
        <dd className="truncate text-sm font-medium text-student-text">{value}</dd>
      </div>
    </div>
  );
}

// The assignment detail "view page" — a rich modal mirroring the EduPulse demo:
// header (code · subject · course, title, status), Assignment Information, the
// Description & Instructions, Attachments, Your Submission (real upload), a Quick
// Info sidebar, and a Close / Save Draft / Submit footer. Submission uploads the
// chosen file to /assignment/submit_assignment (Naji 2026-06-05).
function AssignmentDetail({
  item,
  onClose,
  onSubmitFiles,
  onSaveDraft,
}: {
  item: Record<string, unknown>;
  onClose: () => void;
  onSubmitFiles: (files: File[]) => Promise<void>;
  onSaveDraft: () => Promise<void>;
}) {
  const id = asString(item.id);
  const title = asString(item.title) || 'Assignment';
  const subject = asString(item.subject_title);
  const course = asString(item.course_title);
  const totalMarks = asString(item.total_marks) || '100';
  const marks = asString(item.marks);
  const isReviewed = asNumber(item.is_reviewed) === 1;
  const isSubmitted = asNumber(item.is_submitted) > 0;
  const dueDisplay = asString(item.formatted_date) || asString(item.date) || asString(item.due_date);
  const timeRange = asString(item.time);
  const briefUrl = asString(item.file);
  const faculty = asString(item.instructor_name) || asString(item.faculty);
  const remarks = asString(item.remarks);
  const submittedFiles = parseSubmittedFiles(item.submitted_file);
  const submittedDate = asString(item.submitted_date) || asString(item.updated_at);
  const lines = instructionLines(item);
  const remaining = daysRemainingLabel(dueDisplay);
  const statusLabel = isReviewed ? 'Reviewed' : isSubmitted ? 'Submitted' : 'Not started';
  const canSubmit = !isReviewed;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<'submit' | 'draft' | null>(null);

  const submit = async () => {
    if (!file) {
      toast.error('Choose a file to submit.');
      return;
    }
    setBusy('submit');
    try {
      await onSubmitFiles([file]);
      toast.success('Assignment submitted.');
      setBusy(null);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Submission failed.');
      setBusy(null);
    }
  };

  const saveDraft = async () => {
    setBusy('draft');
    try {
      await onSaveDraft();
      toast.success('Draft saved.');
    } catch {
      toast.error('Could not save draft.');
    }
    setBusy(null);
  };

  const stats: Array<{ label: string; value: string }> = [
    { label: 'Due Date', value: dueDisplay || '—' },
    { label: 'Submitted', value: isSubmitted && submittedDate ? formatDate(submittedDate) : '—' },
    { label: 'Max Marks', value: totalMarks },
    { label: 'Time', value: timeRange || '—' },
  ];

  const gradeScore = isReviewed && marks ? (marks.includes('/') ? (marks.split('/')[0] ?? '').trim() : marks.trim()) : '—';
  const gradePercent = (() => {
    const s = Number(gradeScore);
    const t = Number(totalMarks);
    if (!Number.isFinite(s) || !Number.isFinite(t) || t <= 0) return null;
    return Math.round((s / t) * 100);
  })();
  const scoreValue = `${gradeScore}/${totalMarks}`;

  return (
    <div className="flex max-h-[85vh] flex-col">
      {/* Header */}
      <div className="flex items-start gap-4 border-b border-slate-200 p-5 sm:p-6">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-student-primary-light text-student-primary">
          <FileText aria-hidden="true" className="size-6" />
        </div>
        <div className="min-w-0 flex-1 pr-8">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold tracking-wide text-slate-600">
              ASG-{id}
            </span>
            {subject ? <span>{subject}</span> : null}
            {subject && course ? <span aria-hidden="true">·</span> : null}
            {course ? <span>{course}</span> : null}
          </div>
          <h2 className="mt-1.5 text-xl font-bold text-student-text">{title}</h2>
          <span
            className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isReviewed
                ? 'bg-green-100 text-green-700'
                : isSubmitted
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Body — only the LEFT column scrolls; the Quick Info pane stays static
          (Naji 2026-06-06: right info should not scroll). */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          {/* Grade — shown prominently for reviewed assignments. */}
          {isReviewed ? (
            <section className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Your Grade</p>
                <p className="mt-1 text-2xl font-bold text-emerald-800">
                  {gradeScore}
                  <span className="text-base font-medium text-emerald-600">/{totalMarks}</span>
                </p>
                {gradePercent !== null ? (
                  <p className="mt-0.5 text-xs font-medium text-emerald-700">{gradePercent}% scored</p>
                ) : null}
              </div>
              <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Award aria-hidden="true" className="size-7" />
              </span>
            </section>
          ) : null}

          {/* Assignment information */}
          <section>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assignment Information
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                  <p className="mt-1 text-sm font-bold leading-tight text-student-text">{s.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Description & instructions */}
          {lines.length > 0 ? (
            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Description &amp; Instructions
              </p>
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                {lines.length === 1 ? (
                  <p className="whitespace-pre-line">{lines[0]}</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5">
                    {lines.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          ) : null}

          {/* Attachments */}
          {briefUrl ? (
            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Attachments &amp; Resources
              </p>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500">
                  <FileText aria-hidden="true" className="size-5" />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-student-text">
                  {getFileName(briefUrl) || 'Assignment brief'}
                </p>
                <a
                  href={briefUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-student-primary hover:underline"
                >
                  <Eye aria-hidden="true" className="size-4" />
                  View
                </a>
                <a
                  href={briefUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Download aria-hidden="true" className="size-4" />
                  Download
                </a>
              </div>
            </section>
          ) : null}

          {/* Your submission — real file upload */}
          {canSubmit ? (
            <section>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Your Submission</p>
              <div className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center">
                <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-student-primary-light text-student-primary">
                  <Upload aria-hidden="true" className="size-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-student-text">
                  {file ? file.name : 'Drag & drop your file here'}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">PDF, DOCX, PPTX up to 25MB</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-xl"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {file ? 'Choose another file' : 'Browse Files'}
                </Button>
              </div>
            </section>
          ) : null}

          {/* Instructor feedback */}
          {remarks ? (
            <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <MessageSquare aria-hidden="true" className="mt-0.5 size-4 text-amber-600" />
                <div>
                  <p className="text-xs font-semibold text-amber-700">Instructor Feedback</p>
                  <p className="mt-1 text-sm text-amber-900">{remarks}</p>
                </div>
              </div>
            </section>
          ) : null}

          {/* Submitted files */}
          {submittedFiles.length > 0 ? (
            <section>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Submitted Files</p>
              <div className="space-y-2">
                {submittedFiles.map((sf, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-3">
                    <Link2 aria-hidden="true" className="size-4 shrink-0 text-blue-500" />
                    <a
                      href={sf.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 truncate text-sm text-blue-600 hover:underline"
                    >
                      {getFileName(sf.file)}
                    </a>
                    {sf.date ? <span className="shrink-0 text-xs text-slate-400">{formatDate(sf.date)}</span> : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Quick info — static side panel (does not scroll with the left). */}
        <aside className="shrink-0 border-t border-slate-200 bg-slate-50/60 p-5 sm:p-6 lg:w-80 lg:border-l lg:border-t-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Quick Info</p>
          <dl className="space-y-3">
            {dueDisplay ? <QuickInfoRow icon={CalendarDays} label="Due Date" value={dueDisplay} /> : null}
            {remaining ? <QuickInfoRow icon={Clock3} label="Remaining" value={remaining} /> : null}
            <QuickInfoRow icon={AlertCircle} label="Status" value={statusLabel} />
            <QuickInfoRow icon={Award} label="Marks" value={scoreValue} />
            {faculty ? <QuickInfoRow icon={GraduationCap} label="Faculty" value={faculty} /> : null}
            {briefUrl ? <QuickInfoRow icon={FileText} label="Attachments" value="1 file" /> : null}
          </dl>
        </aside>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
        <Button variant="outline" onClick={onClose} disabled={busy !== null}>
          Close
        </Button>
        {canSubmit ? (
          <>
            <Button variant="outline" onClick={() => void saveDraft()} disabled={busy !== null}>
              {busy === 'draft' ? <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" /> : null}
              Save Draft
            </Button>
            <Button
              className="bg-student-primary text-white hover:bg-student-primary/90"
              onClick={() => void submit()}
              disabled={busy !== null || !file}
            >
              {busy === 'submit' ? <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" /> : null}
              Submit Assignment
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
