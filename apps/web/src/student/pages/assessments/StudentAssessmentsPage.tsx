import { useMemo, useState } from 'react';
import {
  ClipboardList,
  FileText,
  Bookmark,
  BookmarkCheck,
  Eye,
  MessageSquare,
  Link2,
  Search,
  Download,
  CheckCircle2,
  Clock3,
  CalendarDays,
  Hourglass,
  ShieldCheck,
  Wifi,
  AlertCircle,
  Award,
  PlayCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminTabBar } from '../../../admin/shared/components/AdminTabBar.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';
import { FormalExamPlayer } from '../../components/FormalExamPlayer.js';

type MainTab = 'assignments' | 'exams';
type AssignmentSubTab = 'pending' | 'submitted' | 'graded';
type ExamSubTab = 'available' | 'upcoming' | 'completed' | 'missed';

// A single assignment row, normalised from the legacy `/assignment/index`
// shape (see assessment-service.toAssignmentData).
interface AssignmentView {
  id: string;
  title: string;
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
      className={`flex flex-col rounded-2xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md ${
        active ? `border-transparent ring-2 ${card.tone.ring}` : 'border-slate-200'
      }`}
    >
      <span className={`mb-3 flex size-9 items-center justify-center rounded-xl ${card.tone.tile}`}>
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <span className="text-2xl font-bold leading-none text-student-text">{card.count}</span>
      <span className="mt-1 text-xs font-medium text-student-muted">{card.label}</span>
    </button>
  );
}

export default function StudentAssessmentsPage({ api, session }: StudentPageProps) {
  const [mainTab, setMainTab] = useState<MainTab>(
    () => (typeof window !== 'undefined' && window.location.pathname.includes('/exams') ? 'exams' : 'assignments'),
  );
  const [assignmentSubTab, setAssignmentSubTab] = useState<AssignmentSubTab>('pending');
  const [examSubTab, setExamSubTab] = useState<ExamSubTab>('available');
  const [activeExam, setActiveExam] = useState<{ examId: string; title: string } | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailItem, setDetailItem] = useState<Record<string, unknown> | null>(null);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAssessments(session.token),
    [api, session.token],
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

  const handleToggleSaved = async (assignmentId: string) => {
    setActionPending(assignmentId);
    try {
      await api.toggleSavedAssignment(session.token, assignmentId);
      reload();
    } finally {
      setActionPending(null);
    }
  };

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
  if (activeExam) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <FormalExamPlayer
            api={api}
            authToken={session.token}
            examId={activeExam.examId}
            title={activeExam.title}
            onClose={() => { setActiveExam(null); reload(); }}
          />
        </div>
      </div>
    );
  }

  const mainTabs = [
    {
      id: 'assignments' as const,
      label: 'Assignments',
      count: assignmentBuckets.pending.length + assignmentBuckets.submitted.length + assignmentBuckets.graded.length,
    },
    {
      id: 'exams' as const,
      label: 'Exams',
      count: examBuckets.available.length + examBuckets.upcoming.length + examBuckets.completed.length + examBuckets.missed.length,
    },
  ];

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

  const query = searchQuery.trim().toLowerCase();
  const filteredAssignments = query
    ? activeAssignments.filter((a) => a.title.toLowerCase().includes(query))
    : activeAssignments;
  const filteredExams = query
    ? activeExams.filter((e) => e.title.toLowerCase().includes(query))
    : activeExams;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-student-text">{mainTab === 'exams' ? 'Exams' : 'Assignments'}</h1>
          <p className="mt-1 text-sm text-student-muted">
            {mainTab === 'exams'
              ? 'Your scheduled, available and past examinations'
              : 'Submit work, track grades and view feedback'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} className="rounded-xl">Refresh</Button>
      </div>

      <AdminTabBar
        tabs={mainTabs}
        activeTab={mainTab}
        onChange={(id) => setMainTab(id as MainTab)}
      />

      {mainTab === 'assignments' ? (
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

          {/* Status tabs + inline search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <div role="status" aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <ClipboardList aria-hidden="true" className="mx-auto mb-4 size-12 text-slate-300" />
              <p className="text-sm text-slate-500">No {assignmentSubTab} assignments.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssignments.map((a) => {
                const badge = assignmentStatusBadge(a);
                return (
                  <div
                    key={a.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-center"
                  >
                    {/* Doc icon + identity */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-student-primary-light text-student-primary">
                        <FileText aria-hidden="true" className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-student-text">{a.title}</p>
                        <p className="mt-0.5 truncate text-xs text-student-muted">
                          {a.dueLabel ? `Due ${a.dueLabel}` : 'No due date'}
                        </p>
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

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1.5">
                      {a.isReviewed ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => setDetailItem(a.raw)}
                        >
                          <MessageSquare aria-hidden="true" className="size-4" />
                          View Feedback
                        </Button>
                      ) : a.isSubmitted ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl"
                          onClick={() => setDetailItem(a.raw)}
                        >
                          <Eye aria-hidden="true" className="size-4" />
                          View Submission
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="rounded-xl bg-student-primary text-white hover:bg-student-primary/90"
                          aria-pressed={a.isSaved}
                          disabled={actionPending === a.id}
                          onClick={() => void handleToggleSaved(a.id)}
                        >
                          {a.isSaved ? (
                            <BookmarkCheck aria-hidden="true" className="size-4" />
                          ) : (
                            <Bookmark aria-hidden="true" className="size-4" />
                          )}
                          {a.isSaved ? 'Saved' : 'Save'}
                        </Button>
                      )}
                      {a.briefUrl ? (
                        <a
                          href={a.briefUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Download brief for ${a.title}`}
                          title="Download brief"
                          className="flex size-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-student-primary max-sm:size-11"
                        >
                          <Download aria-hidden="true" className="size-4" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

          {/* Filter bar: search + status tabs */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <AdminTabBar
              tabs={examStatCards.map((c) => ({ id: c.id, label: c.label, count: c.count }))}
              activeTab={examSubTab}
              onChange={(id) => setExamSubTab(id as ExamSubTab)}
            />
            <div className="relative w-full sm:max-w-xs">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                aria-label="Search exams"
                placeholder="Search exams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-xl pl-10"
              />
            </div>
          </div>

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
                            onClick={() => setActiveExam({ examId: e.id, title: e.title })}
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
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-student-muted">Date</dt>
                        <dd className="mt-0.5 text-xs font-semibold text-student-text">{e.dateLabel || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-student-muted">Window</dt>
                        <dd className="mt-0.5 text-xs font-semibold text-student-text">{e.windowLabel || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-student-muted">Duration</dt>
                        <dd className="mt-0.5 text-xs font-semibold text-student-text">{e.durationLabel || '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-student-muted">Marks</dt>
                        <dd className="mt-0.5 text-xs font-semibold text-student-text">
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

      {/* Submission / feedback dialog */}
      <Dialog open={detailItem !== null} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          {detailItem ? <SubmissionDetail item={detailItem} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubmissionDetail({ item }: { item: Record<string, unknown> }) {
  const marks = asString(item.marks);
  const totalMarks = asString(item.total_marks);
  const isReviewed = asNumber(item.is_reviewed) === 1;
  const remarks = asString(item.remarks);
  const submittedFiles = parseSubmittedFiles(item.submitted_file);
  const submittedDate = asString(item.submitted_date) || asString(item.updated_at);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="mb-1 text-xs text-slate-500">Score</p>
          <p className="text-lg font-bold text-slate-800">
            {marks ? (marks.includes('/') ? marks : `${marks}/${totalMarks}`) : 'N/A'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="mb-1 text-xs text-slate-500">Status</p>
          <div className="mt-1">
            {isReviewed ? (
              <Badge className="border-green-200 bg-green-100 text-green-700">Reviewed</Badge>
            ) : (
              <Badge className="border-yellow-200 bg-yellow-100 text-yellow-700">Pending Review</Badge>
            )}
          </div>
        </div>
        {submittedDate ? (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="mb-1 text-xs text-slate-500">Submitted</p>
            <p className="text-sm font-medium text-slate-800">{formatDate(submittedDate)}</p>
          </div>
        ) : null}
      </div>

      {remarks ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <MessageSquare aria-hidden="true" className="mt-0.5 size-4 text-amber-600" />
            <div>
              <p className="text-xs font-semibold text-amber-700">Instructor Feedback</p>
              <p className="mt-1 text-sm text-amber-900">{remarks}</p>
            </div>
          </div>
        </div>
      ) : null}

      {submittedFiles.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Submitted Files</p>
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
      ) : null}
    </div>
  );
}
