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

type MainTab = 'assignments' | 'exams';
type AssignmentSubTab = 'current' | 'upcoming' | 'completed';
type ExamSubTab = 'upcoming' | 'expired';

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

export default function StudentAssessmentsPage({ api, session }: StudentPageProps) {
  const [mainTab, setMainTab] = useState<MainTab>('assignments');
  const [assignmentSubTab, setAssignmentSubTab] = useState<AssignmentSubTab>('current');
  const [examSubTab, setExamSubTab] = useState<ExamSubTab>('upcoming');
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
        <h1 className="text-2xl font-bold text-student-text">Grades</h1>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
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
      count: (data?.exams.upcoming.length ?? 0) + (data?.exams.expired.length ?? 0),
    },
  ];

  const assignmentSubTabs = [
    { id: 'current' as const, label: 'Current', count: data?.assignments.current.length ?? 0 },
    { id: 'upcoming' as const, label: 'Upcoming', count: data?.assignments.upcoming.length ?? 0 },
    { id: 'completed' as const, label: 'Completed', count: data?.assignments.completed.length ?? 0 },
  ];

  const examSubTabs = [
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
    examSubTab === 'upcoming'
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
          <h1 className="text-2xl font-bold text-student-text">Grades</h1>
          <p className="mt-1 text-sm text-student-muted">Track your assignments and examinations</p>
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
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <ClipboardList className="mx-auto size-12 text-slate-300 mb-4" />
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
                                onClick={() => setDetailItem(assignment)}
                                title="View Details"
                              >
                                <Eye className="size-4 text-student-primary" />
                              </Button>
                            ) : null}
                            {assignmentSubTab === 'current' ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={actionPending === id}
                                onClick={() => void handleToggleSaved(id)}
                                title={isSaved ? 'Unsave' : 'Save'}
                              >
                                {isSaved ? (
                                  <BookmarkCheck className="size-4 text-student-accent" />
                                ) : (
                                  <Bookmark className="size-4 text-slate-400" />
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
          <AdminTabBar
            tabs={examSubTabs}
            activeTab={examSubTab}
            onChange={(id) => setExamSubTab(id as ExamSubTab)}
          />

          {filteredExams.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <FileText className="mx-auto size-12 text-slate-300 mb-4" />
              <p className="text-sm text-slate-500">No {examSubTab} exams.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Exam</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="hidden md:table-cell">Questions</TableHead>
                    <TableHead className="hidden md:table-cell">Duration</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.map((exam) => {
                    const id = asString(exam.id);
                    const title = asString(exam.title) || `Exam ${id}`;
                    const date = asString(exam.date) || asString(exam.start_date);
                    const questionCount = asNumber(exam.questions_count) || asNumber(exam.total_questions);
                    const duration = asString(exam.duration) || asString(exam.time_limit);
                    const badge = getStatusBadge(examSubTab === 'upcoming' ? 'upcoming' : 'expired');

                    return (
                      <TableRow key={id} className="hover:bg-slate-50/80">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-100">
                              <FileText className="size-4 text-red-600" />
                            </div>
                            <span className="font-medium text-slate-800">{title}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-slate-500 text-sm">
                          {date ? formatDate(date) : '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-slate-500 text-sm">
                          {questionCount > 0 ? `${questionCount} questions` : '—'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-slate-500 text-sm">
                          {duration || '—'}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
