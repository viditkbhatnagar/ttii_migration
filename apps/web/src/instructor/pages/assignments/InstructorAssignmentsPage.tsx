import { useCallback, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  RotateCcw,
  Send,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type {
  InstructorAssignmentDetailSnapshot,
  InstructorAssignmentSummary,
  InstructorSubmissionRow,
} from '../../instructor-portal-api.js';
import type { InstructorPageProps } from '../../routing/instructor-routes.js';
import { toast } from 'sonner';

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

function initials(name: string | null): string {
  if (!name) return '—';
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type AssignmentFilter = 'pending' | 'graded';

function AssignmentCard({
  assignment,
  onView,
}: {
  assignment: InstructorAssignmentSummary;
  onView: (a: InstructorAssignmentSummary) => void;
}) {
  const isOverdue = assignment.dueDate
    ? new Date(assignment.dueDate) < new Date(new Date().toDateString())
    : false;
  const allGraded = assignment.submissionCount > 0 && assignment.pendingCount === 0;

  return (
    <Card className="group overflow-hidden border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-violet-500/20">
      <button
        type="button"
        onClick={() => onView(assignment)}
        className="flex w-full flex-col p-5 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-slate-900 group-hover:text-violet-600">
              {assignment.title || 'Untitled assignment'}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {assignment.cohortTitle ?? 'No cohort'}
            </p>
          </div>
          <div className="rounded-lg bg-violet-600/10 p-2 text-violet-600">
            <ClipboardCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Calendar className="h-3.5 w-3.5" />
          Due: {assignment.dueDate ? formatDate(assignment.dueDate) : '—'}
          {isOverdue ? (
            <Badge variant="outline" className="ml-1 border-amber-300 text-amber-600">
              Overdue
            </Badge>
          ) : null}
          {assignment.totalMarks !== null ? (
            <span className="ml-auto">
              Total: <span className="font-semibold text-slate-900">{assignment.totalMarks}</span>
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-3 border-t border-slate-200 pt-3 text-xs">
          <span className="text-slate-500">
            {assignment.submissionCount} submission{assignment.submissionCount === 1 ? '' : 's'}
          </span>
          {assignment.pendingCount > 0 ? (
            <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10">
              {assignment.pendingCount} pending
            </Badge>
          ) : allGraded ? (
            <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
              All graded
            </Badge>
          ) : null}
        </div>
      </button>
    </Card>
  );
}

function AssignmentRow({
  assignment,
  index,
  onView,
}: {
  assignment: InstructorAssignmentSummary;
  index: number;
  onView: (a: InstructorAssignmentSummary) => void;
}) {
  const allGraded = assignment.submissionCount > 0 && assignment.pendingCount === 0;
  return (
    <TableRow>
      <TableCell className="text-center font-medium text-slate-500">{index + 1}</TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-600">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <span className="font-medium text-slate-900">
            {assignment.title || 'Untitled assignment'}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden text-slate-500 md:table-cell">
        {assignment.cohortTitle ?? '—'}
      </TableCell>
      <TableCell className="hidden text-slate-500 md:table-cell">
        {assignment.dueDate ? formatDate(assignment.dueDate) : '—'}
      </TableCell>
      <TableCell className="text-slate-500">
        {assignment.submissionCount} submission{assignment.submissionCount === 1 ? '' : 's'}
      </TableCell>
      <TableCell>
        {assignment.pendingCount > 0 ? (
          <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/10">
            {assignment.pendingCount} pending
          </Badge>
        ) : allGraded ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
            All graded
          </Badge>
        ) : (
          <span className="text-xs text-slate-500">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          size="sm"
          className="bg-violet-600 text-white hover:bg-violet-600/90"
          onClick={() => onView(assignment)}
        >
          Evaluate
        </Button>
      </TableCell>
    </TableRow>
  );
}

interface GradeFormState {
  submissionId: number;
  marks: string;
  remarks: string;
  saving: boolean;
}

export default function InstructorAssignmentsPage({ api, session }: InstructorPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAssignments(session.token),
    [api, session.token],
  );

  const [view, setView] = useState<'list' | 'grid'>('list');
  const [filter, setFilter] = useState<AssignmentFilter>('pending');
  const [activeAssignment, setActiveAssignment] = useState<InstructorAssignmentSummary | null>(null);
  const [detail, setDetail] = useState<InstructorAssignmentDetailSnapshot | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<number | null>(null);
  const [grading, setGrading] = useState<GradeFormState | null>(null);

  const openAssignment = useCallback(
    async (assignment: InstructorAssignmentSummary) => {
      setActiveAssignment(assignment);
      setDetail(null);
      setActiveSubmissionId(null);
      setGrading(null);
      setDetailLoading(true);
      const result = await api.loadAssignmentDetail(session.token, assignment.id);
      setDetail(result);
      const first = result?.submissions[0];
      setActiveSubmissionId(first ? first.id : null);
      if (first) {
        setGrading({
          submissionId: first.id,
          marks: first.marks,
          remarks: first.remarks,
          saving: false,
        });
      }
      setDetailLoading(false);
    },
    [api, session.token],
  );

  const closeAssignment = useCallback(() => {
    setActiveAssignment(null);
    setDetail(null);
    setActiveSubmissionId(null);
    setGrading(null);
  }, []);

  const selectSubmission = useCallback((submission: InstructorSubmissionRow) => {
    setActiveSubmissionId(submission.id);
    setGrading({
      submissionId: submission.id,
      marks: submission.marks,
      remarks: submission.remarks,
      saving: false,
    });
  }, []);

  const submitGrade = useCallback(async () => {
    if (!grading || !detail) return;
    setGrading((prev) => (prev ? { ...prev, saving: true } : null));
    const updated = await api.gradeSubmission(session.token, grading.submissionId, {
      marks: grading.marks,
      remarks: grading.remarks,
    });
    if (!updated) {
      toast.error('Could not save the grade. Please try again.');
      setGrading((prev) => (prev ? { ...prev, saving: false } : null));
      return;
    }
    toast.success(updated.graded ? 'Submission graded.' : 'Grade cleared.');
    setDetail({
      ...detail,
      submissions: detail.submissions.map((s) => (s.id === updated.id ? updated : s)),
    });
    setGrading({
      submissionId: updated.id,
      marks: updated.marks,
      remarks: updated.remarks,
      saving: false,
    });
    reload();
  }, [api, detail, grading, reload, session.token]);

  const assignments = useMemo(() => data ?? [], [data]);

  const pendingAssignments = useMemo(
    () => assignments.filter((a) => a.pendingCount > 0 || a.submissionCount === 0),
    [assignments],
  );
  const gradedAssignments = useMemo(
    () => assignments.filter((a) => a.submissionCount > 0 && a.pendingCount === 0),
    [assignments],
  );

  const visible = filter === 'pending' ? pendingAssignments : gradedAssignments;

  const activeSubmission = useMemo(
    () => detail?.submissions.find((s) => s.id === activeSubmissionId) ?? null,
    [detail, activeSubmissionId],
  );

  const totalMarks = detail?.assignment.totalMarks ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review and grade learner submissions across your cohorts.
        </p>
      </div>

      {loading ? (
        <PageLoader label="Loading assignments..." />
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600"
        >
          {error}
        </div>
      ) : assignments.length === 0 ? (
        <div
          role="status"
          className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500"
        >
          No assignments yet for your cohorts.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as AssignmentFilter)}>
              <TabsList className="bg-slate-100">
                <TabsTrigger value="pending">
                  Pending Evaluations ({pendingAssignments.length})
                </TabsTrigger>
                <TabsTrigger value="graded">Graded ({gradedAssignments.length})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
              <Button
                size="sm"
                variant={view === 'list' ? 'secondary' : 'ghost'}
                onClick={() => setView('list')}
                aria-label="List view"
                className="h-8 px-2.5"
              >
                <List className="mr-1.5 h-4 w-4" /> List
              </Button>
              <Button
                size="sm"
                variant={view === 'grid' ? 'secondary' : 'ghost'}
                onClick={() => setView('grid')}
                aria-label="Grid view"
                className="h-8 px-2.5"
              >
                <LayoutGrid className="mr-1.5 h-4 w-4" /> Grid
              </Button>
            </div>
          </div>

          {visible.length === 0 ? (
            <div
              role="status"
              className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500"
            >
              {filter === 'pending'
                ? 'No assignments awaiting evaluation.'
                : 'No fully graded assignments yet.'}
            </div>
          ) : view === 'list' ? (
            <Card className="overflow-hidden border-slate-200 shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-center">Sl No</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead className="hidden md:table-cell">Cohort</TableHead>
                      <TableHead className="hidden md:table-cell">Due</TableHead>
                      <TableHead>Submissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((assignment, index) => (
                      <AssignmentRow
                        key={assignment.id}
                        assignment={assignment}
                        index={index}
                        onView={(a) => void openAssignment(a)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visible.map((assignment) => (
                <AssignmentCard
                  key={assignment.id}
                  assignment={assignment}
                  onView={(a) => void openAssignment(a)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Dialog
        open={activeAssignment !== null}
        onOpenChange={(open) => !open && closeAssignment()}
      >
        <DialogContent
          className="max-h-[90dvh] gap-0 overflow-hidden p-0 [&>*]:min-w-0"
          style={{ width: '64rem', maxWidth: 'min(64rem, calc(100vw - 2rem))' }}
        >
          <DialogHeader className="shrink-0 space-y-1 border-b border-slate-200 p-5">
            <button
              type="button"
              onClick={closeAssignment}
              className="-ml-1 mb-1 inline-flex w-fit items-center gap-1 text-xs text-slate-500 hover:text-violet-600"
            >
              <ChevronLeft className="h-4 w-4" /> All assignments
            </button>
            <DialogTitle className="text-slate-900">
              {activeAssignment?.title || 'Assignment'}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {activeAssignment?.cohortTitle ? `${activeAssignment.cohortTitle} • ` : ''}
              Due: {activeAssignment?.dueDate ? formatDate(activeAssignment.dueDate) : '—'}
              {activeAssignment?.totalMarks !== null && activeAssignment?.totalMarks !== undefined
                ? ` • Total: ${activeAssignment.totalMarks}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center p-10 text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading submissions...
            </div>
          ) : !detail ? (
            <div className="p-6">
              <div
                role="status"
                className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"
              >
                Could not load submissions.
              </div>
            </div>
          ) : detail.submissions.length === 0 ? (
            <div className="space-y-4 overflow-y-auto p-5">
              {detail.assignment.instructions ? (
                <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-900">
                  <p className="font-medium">Instructions</p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-500">
                    {detail.assignment.instructions}
                  </p>
                </div>
              ) : null}
              <div
                role="status"
                className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"
              >
                No submissions yet.
              </div>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[280px_1fr]">
              {/* Submissions list */}
              <div className="flex min-h-0 flex-col border-b border-slate-200 lg:border-b-0 lg:border-r">
                <div className="shrink-0 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Submissions ({detail.submissions.length})
                </div>
                <div className="max-h-40 min-h-0 flex-1 divide-y divide-slate-200 overflow-y-auto lg:max-h-none">
                  {detail.submissions.map((submission) => {
                    const isActive = submission.id === activeSubmissionId;
                    return (
                      <button
                        key={submission.id}
                        type="button"
                        onClick={() => selectSubmission(submission)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-violet-50 ${
                          isActive ? 'bg-violet-100' : ''
                        }`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-semibold text-white">
                          {initials(submission.studentName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {submission.studentName || '—'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {submission.graded ? 'Graded' : 'Awaiting review'}
                          </p>
                        </div>
                        {submission.graded ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                        ) : (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Review pane */}
              <div className="min-h-0 space-y-4 overflow-y-auto p-5">
                {detail.assignment.instructions ? (
                  <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-900">
                    <p className="font-medium">Instructions</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-500">
                      {detail.assignment.instructions}
                    </p>
                  </div>
                ) : null}

                {!activeSubmission ? (
                  <div
                    role="status"
                    className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500"
                  >
                    Select a submission to review.
                  </div>
                ) : (
                  <>
                    <Card className="border-slate-200 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white">
                              {initials(activeSubmission.studentName)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-base font-semibold text-slate-900">
                                {activeSubmission.studentName || '—'}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {activeSubmission.studentEmail ||
                                  activeSubmission.studentEnrollmentId ||
                                  '—'}
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={
                              activeSubmission.graded
                                ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10'
                                : 'bg-violet-100 text-violet-600 hover:bg-violet-100'
                            }
                          >
                            {activeSubmission.graded ? 'Graded' : 'Awaiting Review'}
                          </Badge>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Submitted {formatDateTime(activeSubmission.submittedAt)}
                          </span>
                          {activeSubmission.studentEnrollmentId ? (
                            <span>ID: {activeSubmission.studentEnrollmentId}</span>
                          ) : null}
                        </div>

                        <div className="mt-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Attached files
                          </p>
                          {activeSubmission.files.length === 0 ? (
                            <p className="text-sm text-slate-500">No files attached.</p>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {activeSubmission.files.map((file, idx) => (
                                <a
                                  key={file + idx}
                                  href={file}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-violet-300 hover:bg-violet-50"
                                >
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-900">
                                      File {idx + 1}
                                    </p>
                                    <p className="text-[11px] text-slate-500">Open in new tab</p>
                                  </div>
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                      <CardContent className="space-y-4 p-4">
                        <p className="text-base font-semibold text-slate-900">Evaluation</p>
                        <p className="-mt-2 text-xs text-slate-500">
                          Marks are stored as text on the legacy schema — enter a number, fraction,
                          or letter grade.
                        </p>
                        <div className="grid gap-1.5">
                          <Label htmlFor="grade-marks" className="text-slate-900">
                            Marks{totalMarks ? ` (out of ${totalMarks})` : ''}
                          </Label>
                          <Input
                            id="grade-marks"
                            value={grading?.marks ?? ''}
                            maxLength={10}
                            placeholder="e.g. 85"
                            className="max-w-xs"
                            onChange={(e) =>
                              setGrading((prev) => (prev ? { ...prev, marks: e.target.value } : prev))
                            }
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="grade-remarks" className="text-slate-900">
                            Feedback
                          </Label>
                          <textarea
                            id="grade-remarks"
                            rows={5}
                            className="flex min-h-[96px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 ring-offset-background placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={grading?.remarks ?? ''}
                            placeholder="Provide constructive feedback for the learner…"
                            onChange={(e) =>
                              setGrading((prev) =>
                                prev ? { ...prev, remarks: e.target.value } : prev,
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
                          <Button
                            className="bg-violet-600 text-white hover:bg-violet-600/90"
                            onClick={() => void submitGrade()}
                            disabled={!grading || grading.saving}
                          >
                            {grading?.saving ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {activeSubmission.graded ? 'Update Grade' : 'Grade'}
                          </Button>
                          {activeSubmission.graded ? (
                            <Badge
                              variant="outline"
                              className="border-emerald-300 text-emerald-600"
                            >
                              <RotateCcw className="mr-1 h-3 w-3" /> Re-grading
                            </Badge>
                          ) : null}
                          {activeSubmission.files.length > 0 ? (
                            <Button
                              asChild
                              variant="ghost"
                              className="ml-auto text-slate-500 hover:text-violet-600"
                            >
                              <a
                                href={activeSubmission.files[0]}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="mr-1.5 h-3.5 w-3.5" /> Download Submission
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
