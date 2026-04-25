import { useCallback, useState } from 'react';
import { Calendar, ClipboardCheck, ExternalLink, FileText, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

function AssignmentCard({
  assignment,
  onView,
}: {
  assignment: InstructorAssignmentSummary;
  onView: (a: InstructorAssignmentSummary) => void;
}) {
  const isOverdue = assignment.dueDate ? new Date(assignment.dueDate) < new Date(new Date().toDateString()) : false;
  return (
    <button
      type="button"
      onClick={() => onView(assignment)}
      className="group flex w-full flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-student-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-student-text group-hover:text-student-primary">
            {assignment.title || 'Untitled assignment'}
          </p>
          <p className="mt-0.5 truncate text-xs text-student-muted">
            {assignment.cohortTitle ?? 'No cohort'}
          </p>
        </div>
        <div className="rounded-lg bg-student-primary/10 p-2 text-student-primary">
          <ClipboardCheck className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-student-muted">
        <Calendar className="h-3.5 w-3.5" />
        Due: {assignment.dueDate ? formatDate(assignment.dueDate) : '—'}
        {isOverdue ? (
          <Badge variant="outline" className="ml-1 border-amber-200 text-amber-700">
            Overdue
          </Badge>
        ) : null}
        {assignment.totalMarks !== null ? (
          <span className="ml-auto">
            Total: <span className="font-semibold">{assignment.totalMarks}</span>
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3 text-xs">
        <span className="text-student-muted">
          {assignment.submissionCount} submission{assignment.submissionCount === 1 ? '' : 's'}
        </span>
        {assignment.pendingCount > 0 ? (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
            {assignment.pendingCount} pending
          </Badge>
        ) : assignment.submissionCount > 0 ? (
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">All graded</Badge>
        ) : null}
      </div>
    </button>
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

  const [activeAssignment, setActiveAssignment] = useState<InstructorAssignmentSummary | null>(null);
  const [detail, setDetail] = useState<InstructorAssignmentDetailSnapshot | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [grading, setGrading] = useState<GradeFormState | null>(null);

  const openAssignment = useCallback(
    async (assignment: InstructorAssignmentSummary) => {
      setActiveAssignment(assignment);
      setDetail(null);
      setDetailLoading(true);
      const result = await api.loadAssignmentDetail(session.token, assignment.id);
      setDetail(result);
      setDetailLoading(false);
    },
    [api, session.token],
  );

  const closeAssignment = useCallback(() => {
    setActiveAssignment(null);
    setDetail(null);
    setGrading(null);
  }, []);

  const startGrading = useCallback((submission: InstructorSubmissionRow) => {
    setGrading({
      submissionId: submission.id,
      marks: submission.marks,
      remarks: submission.remarks,
      saving: false,
    });
  }, []);

  const cancelGrading = useCallback(() => setGrading(null), []);

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
    setGrading(null);
    reload();
  }, [api, detail, grading, reload, session.token]);

  const assignments = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-student-text">Assignments</h1>
        <p className="mt-1 text-sm text-student-muted">
          Review and grade student submissions across your cohorts.
        </p>
      </div>

      {loading ? (
        <PageLoader label="Loading assignments..." />
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-600">
          {error}
        </div>
      ) : assignments.length === 0 ? (
        <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-student-muted">
          No assignments yet for your cohorts.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onView={(a) => void openAssignment(a)}
            />
          ))}
        </div>
      )}

      <Dialog open={activeAssignment !== null} onOpenChange={(open) => !open && closeAssignment()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{activeAssignment?.title || 'Assignment'}</DialogTitle>
            <DialogDescription>
              {activeAssignment?.cohortTitle ? `${activeAssignment.cohortTitle} • ` : ''}
              Due: {activeAssignment?.dueDate ? formatDate(activeAssignment.dueDate) : '—'}
              {activeAssignment?.totalMarks !== null && activeAssignment?.totalMarks !== undefined
                ? ` • Total: ${activeAssignment.totalMarks}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center p-8 text-student-muted">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading submissions...
            </div>
          ) : !detail ? (
            <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-student-muted">
              Could not load submissions.
            </div>
          ) : (
            <>
              {detail.assignment.instructions ? (
                <div className="rounded-lg bg-slate-50 p-3 text-sm text-student-text">
                  <p className="font-medium">Instructions</p>
                  <p className="mt-1 whitespace-pre-wrap text-student-muted">{detail.assignment.instructions}</p>
                </div>
              ) : null}

              {detail.submissions.length === 0 ? (
                <div role="status" className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-student-muted">
                  No submissions yet.
                </div>
              ) : (
                <div className="max-h-[28rem] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Files</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.submissions.map((submission) => (
                        <TableRow key={submission.id}>
                          <TableCell>
                            <div className="font-medium text-student-text">
                              {submission.studentName || '—'}
                            </div>
                            {submission.studentEnrollmentId ? (
                              <div className="text-xs text-student-muted">{submission.studentEnrollmentId}</div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-sm text-student-muted">
                            {formatDateTime(submission.submittedAt)}
                          </TableCell>
                          <TableCell>
                            {submission.files.length === 0 ? (
                              <span className="text-xs text-student-muted">—</span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {submission.files.map((file, idx) => (
                                  <a
                                    key={file + idx}
                                    href={file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-student-primary hover:underline"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    File {idx + 1}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-student-text">
                            {submission.marks
                              ? `${submission.marks}${detail.assignment.totalMarks ? ` / ${detail.assignment.totalMarks}` : ''}`
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                submission.graded
                                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                              }
                            >
                              {submission.graded ? 'Graded' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => startGrading(submission)}>
                              {submission.graded ? 'Re-grade' : 'Grade'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={grading !== null} onOpenChange={(open) => !open && cancelGrading()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
            <DialogDescription>
              Marks are stored as text on the legacy schema — enter a number, fraction, or letter grade.
            </DialogDescription>
          </DialogHeader>

          {grading ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="grade-marks">
                  Marks{detail?.assignment.totalMarks ? ` (out of ${detail.assignment.totalMarks})` : ''}
                </Label>
                <Input
                  id="grade-marks"
                  value={grading.marks}
                  maxLength={10}
                  placeholder="e.g. 85"
                  onChange={(e) => setGrading((prev) => (prev ? { ...prev, marks: e.target.value } : null))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grade-remarks">Feedback</Label>
                <textarea
                  id="grade-remarks"
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={grading.remarks}
                  placeholder="Share feedback for the student..."
                  onChange={(e) => setGrading((prev) => (prev ? { ...prev, remarks: e.target.value } : null))}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={cancelGrading} disabled={grading?.saving}>
              Cancel
            </Button>
            <Button
              className="bg-student-primary text-white hover:bg-student-primary/90"
              onClick={() => void submitGrade()}
              disabled={!grading || grading.saving}
            >
              {grading?.saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
