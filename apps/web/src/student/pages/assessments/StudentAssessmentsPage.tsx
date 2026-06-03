import { useState } from 'react';
import { ClipboardList, FileText, Bookmark, BookmarkCheck, Eye, MessageSquare, Link2, Search } from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminTabBar } from '../../../admin/shared/components/AdminTabBar.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';
import { FormalExamPlayer } from '../../components/FormalExamPlayer.js';

type MainTab = 'assignments' | 'exams';
type AssignmentSubTab = 'current' | 'upcoming' | 'completed';
type ExamSubTab = 'available' | 'upcoming' | 'expired';

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
  try {
    const parts = url.split('/');
    return parts[parts.length - 1] || 'File';
  } catch {
    return 'File';
  }
}

function getStatusBadge(status: string) {
  const lower = status.toLowerCase();
  if (lower === 'passed' || lower === 'completed') return { className: 'bg-green-100 text-green-700 border-green-200', label: status };
  if (lower === 'failed') return { className: 'bg-red-100 text-red-700 border-red-200', label: status };
  if (lower === 'pending' || lower === 'under review') return { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: status };
  if (lower === 'upcoming') return { className: 'bg-blue-100 text-blue-700 border-blue-200', label: status };
  if (lower === 'expired') return { className: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Past' };
  return { className: 'bg-slate-100 text-slate-600 border-slate-200', label: status || 'Unknown' };
}

// Badge for a formal exam's backend-derived `state`.
function getExamStateBadge(state: string): { className: string; label: string } {
  switch (state) {
    case 'available':
      return { className: 'bg-green-100 text-green-700 border-green-200', label: 'Available' };
    case 'upcoming':
      return { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Upcoming' };
    case 'submitted':
      return { className: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Submitted' };
    default:
      return { className: 'bg-slate-100 text-slate-600 border-slate-200', label: 'Closed' };
  }
}

export default function StudentAssessmentsPage({ api, session }: StudentPageProps) {
  const [mainTab, setMainTab] = useState<MainTab>(
    () => (typeof window !== 'undefined' && window.location.pathname.includes('/exams') ? 'exams' : 'assignments'),
  );
  const [assignmentSubTab, setAssignmentSubTab] = useState<AssignmentSubTab>('current');
  const [examSubTab, setExamSubTab] = useState<ExamSubTab>('available');
  const [activeExam, setActiveExam] = useState<{ examId: string; title: string } | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailItem, setDetailItem] = useState<Record<string, unknown> | null>(null);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAssessments(session.token),
    [api, session.token],
  );

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
      count: (data?.assignments.current.length ?? 0) + (data?.assignments.upcoming.length ?? 0) + (data?.assignments.completed.length ?? 0),
    },
    {
      id: 'exams' as const,
      label: 'Exams',
      count: (data?.exams.available.length ?? 0) + (data?.exams.upcoming.length ?? 0) + (data?.exams.expired.length ?? 0),
    },
  ];

  const assignmentSubTabs = [
    { id: 'current' as const, label: 'Current', count: data?.assignments.current.length ?? 0 },
    { id: 'upcoming' as const, label: 'Upcoming', count: data?.assignments.upcoming.length ?? 0 },
    { id: 'completed' as const, label: 'Completed', count: data?.assignments.completed.length ?? 0 },
  ];

  const examSubTabs = [
    { id: 'available' as const, label: 'Available', count: data?.exams.available.length ?? 0 },
    { id: 'upcoming' as const, label: 'Upcoming', count: data?.exams.upcoming.length ?? 0 },
    { id: 'expired' as const, label: 'Past', count: data?.exams.expired.length ?? 0 },
  ];

  const currentAssignments =
    assignmentSubTab === 'current'
      ? data?.assignments.current ?? []
      : assignmentSubTab === 'upcoming'
        ? data?.assignments.upcoming ?? []
        : data?.assignments.completed ?? [];

  const currentExams =
    examSubTab === 'available'
      ? data?.exams.available ?? []
      : examSubTab === 'upcoming'
        ? data?.exams.upcoming ?? []
        : data?.exams.expired ?? [];

  const filteredAssignments = searchQuery
    ? currentAssignments.filter((a) => asString(a.title).toLowerCase().includes(searchQuery.toLowerCase()))
    : currentAssignments;

  const filteredExams = searchQuery
    ? currentExams.filter((e) => asString(e.title).toLowerCase().includes(searchQuery.toLowerCase()))
    : currentExams;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-student-text">{mainTab === 'exams' ? 'Exams' : 'Assignments'}</h1>
          <p className="mt-1 text-sm text-student-muted">{mainTab === 'exams' ? 'Your scheduled, available and past examinations' : 'Submit work, track grades and view feedback'}</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} className="rounded-xl">Refresh</Button>
      </div>

      <AdminTabBar
        tabs={mainTabs}
        activeTab={mainTab}
        onChange={(id) => setMainTab(id as MainTab)}
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder={`Search ${mainTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 rounded-xl"
        />
      </div>

      {mainTab === 'assignments' ? (
        <div className="space-y-4">
          <AdminTabBar
            tabs={assignmentSubTabs}
            activeTab={assignmentSubTab}
            onChange={(id) => setAssignmentSubTab(id as AssignmentSubTab)}
          />

          {filteredAssignments.length === 0 ? (
            <div role="status" aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <ClipboardList aria-hidden="true" className="mx-auto size-12 text-slate-300 mb-4" />
              <p className="text-sm text-slate-500">No {assignmentSubTab} assignments.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Assignment</TableHead>
                    <TableHead className="hidden sm:table-cell">Due Date</TableHead>
                    <TableHead className="hidden md:table-cell">Marks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => {
                    const id = asString(assignment.id);
                    const title = asString(assignment.title) || `Assignment ${id}`;
                    const status = asString(assignment.status) || assignmentSubTab;
                    const dueDate = asString(assignment.date) || asString(assignment.due_date) || asString(assignment.end_date);
                    const totalMarks = asString(assignment.total_marks);
                    const marks = asString(assignment.marks);
                    const isSaved = asNumber(assignment.is_saved) === 1;
                    const isSubmitted = asNumber(assignment.is_submitted) > 0;
                    const isCompleted = assignmentSubTab === 'completed';
                    const badge = getStatusBadge(status);

                    return (
                      <TableRow key={id} className="hover:bg-slate-50/80">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                              <ClipboardList className="size-4 text-orange-600" />
                            </div>
                            <span className="font-medium text-slate-800">{title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-slate-500 text-sm">
                          {dueDate ? formatDate(dueDate) : '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-slate-500 text-sm">
                          {marks && isCompleted ? `${marks}/${totalMarks}` : totalMarks || '—'}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isCompleted && isSubmitted ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`View details for ${title}`}
                                onClick={() => setDetailItem(assignment)}
                                title="View Details"
                                className="max-sm:size-11"
                              >
                                <Eye aria-hidden="true" className="size-4 text-student-primary" />
                              </Button>
                            ) : null}
                            {assignmentSubTab === 'current' ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={isSaved ? `Unsave ${title}` : `Save ${title}`}
                                aria-pressed={isSaved}
                                disabled={actionPending === id}
                                onClick={() => void handleToggleSaved(id)}
                                title={isSaved ? 'Unsave' : 'Save'}
                                className="max-sm:size-11"
                              >
                                {isSaved ? (
                                  <BookmarkCheck aria-hidden="true" className="size-4 text-student-accent" />
                                ) : (
                                  <Bookmark aria-hidden="true" className="size-4 text-slate-400" />
                                )}
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stat cards double as the bucket selector (EduPulse layout). */}
          <div className="grid grid-cols-3 gap-3">
            {examSubTabs.map((t) => {
              const active = examSubTab === t.id;
              const tone = t.id === 'available'
                ? { ring: 'ring-emerald-400', chip: 'bg-emerald-50 text-emerald-600' }
                : t.id === 'upcoming'
                  ? { ring: 'ring-blue-400', chip: 'bg-blue-50 text-blue-600' }
                  : { ring: 'ring-slate-400', chip: 'bg-slate-100 text-slate-500' };
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setExamSubTab(t.id)}
                  className={`rounded-2xl border bg-white p-4 text-left shadow-sm transition-all ${active ? `border-transparent ring-2 ${tone.ring}` : 'border-slate-200 hover:shadow-md'}`}
                >
                  <span className={`mb-2 flex size-9 items-center justify-center rounded-lg ${tone.chip}`}>
                    <FileText aria-hidden="true" className="size-4" />
                  </span>
                  <span className="block text-2xl font-bold text-student-text">{t.count}</span>
                  <span className="block text-xs font-medium text-student-muted">{t.label}</span>
                </button>
              );
            })}
          </div>

          {filteredExams.length === 0 ? (
            <div role="status" aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <FileText aria-hidden="true" className="mx-auto size-12 text-slate-300 mb-4" />
              <p className="text-sm text-slate-500">No {examSubTab} exams.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredExams.map((exam) => {
                const id = asString(exam.id);
                const title = asString(exam.title) || `Exam ${id}`;
                const date = asString(exam.date) || asString(exam.start_date);
                const questionCount = asNumber(exam.questions_count) || asNumber(exam.total_questions);
                const duration = asString(exam.duration) || asString(exam.time_limit);
                const state = asString(exam.state);
                const badge = getExamStateBadge(state);

                return (
                  <div key={id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-student-primary/10">
                          <FileText aria-hidden="true" className="size-5 text-student-primary" />
                        </div>
                        <h3 className="font-bold leading-snug text-student-text">{title}</h3>
                      </div>
                      <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-student-muted">Date</p>
                        <p className="mt-0.5 text-xs font-semibold text-student-text">{date ? formatDate(date) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-student-muted">Duration</p>
                        <p className="mt-0.5 text-xs font-semibold text-student-text">{duration ? `${duration} min` : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-student-muted">Questions</p>
                        <p className="mt-0.5 text-xs font-semibold text-student-text">{questionCount > 0 ? questionCount : '—'}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      {state === 'available' ? (
                        <Button
                          onClick={() => setActiveExam({ examId: id, title })}
                          className="h-10 w-full rounded-xl bg-student-primary text-sm font-semibold text-white hover:bg-student-primary/90"
                        >
                          Start Exam
                        </Button>
                      ) : state === 'upcoming' ? (
                        <p className="rounded-xl bg-blue-50 py-2.5 text-center text-xs font-medium text-blue-700">{date ? `Opens ${formatDate(date)}` : 'Scheduled'}</p>
                      ) : state === 'submitted' ? (
                        <p className="rounded-xl bg-emerald-50 py-2.5 text-center text-xs font-medium text-emerald-700">Submitted — results pending</p>
                      ) : (
                        <p className="rounded-xl bg-slate-50 py-2.5 text-center text-xs text-slate-500">Closed</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailItem !== null} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
          </DialogHeader>
          {detailItem ? (
            <SubmissionDetail item={detailItem} />
          ) : null}
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
      {/* Metadata Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500 mb-1">Score</p>
          <p className="text-lg font-bold text-slate-800">
            {marks ? `${marks}/${totalMarks}` : 'N/A'}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500 mb-1">Status</p>
          <div className="mt-1">
            {isReviewed ? (
              <Badge className="bg-green-100 text-green-700 border-green-200">Reviewed</Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending Review</Badge>
            )}
          </div>
        </div>
        {submittedDate ? (
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500 mb-1">Submitted</p>
            <p className="text-sm font-medium text-slate-800">{formatDate(submittedDate)}</p>
          </div>
        ) : null}
      </div>

      {/* Teacher Feedback */}
      {remarks ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start gap-2">
            <MessageSquare className="mt-0.5 size-4 text-amber-600" />
            <div>
              <p className="text-xs font-semibold text-amber-700">Instructor Feedback</p>
              <p className="mt-1 text-sm text-amber-900">{remarks}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Submitted Files */}
      {submittedFiles.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Submitted Files</p>
          {submittedFiles.map((sf, idx) => (
            <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white p-3">
              <Link2 className="size-4 text-blue-500 shrink-0" />
              <a
                href={sf.file}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate flex-1"
              >
                {getFileName(sf.file)}
              </a>
              {sf.date ? (
                <span className="text-xs text-slate-400 shrink-0">{formatDate(sf.date)}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
