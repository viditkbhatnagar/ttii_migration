import { useCallback, useMemo, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ClipboardCheck,
  Download,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

/* ------------------------------------------------------------------ */
/* List view — Naji's SubmissionTable markup, wired to real summaries. */
/* ------------------------------------------------------------------ */

function AssignmentTable({
  items,
  onView,
}: {
  items: InstructorAssignmentSummary[];
  onView: (a: InstructorAssignmentSummary) => void;
}) {
  return (
    <Card className="soft-shadow overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 text-center">Sl No</TableHead>
              <TableHead>Assignment Title</TableHead>
              <TableHead className="hidden md:table-cell">Cohort</TableHead>
              <TableHead className="hidden md:table-cell">Due</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((a, index) => {
              const allGraded = a.submissionCount > 0 && a.pendingCount === 0;
              return (
                <TableRow key={a.id}>
                  <TableCell className="text-center font-medium text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                        <ClipboardCheck className="h-4 w-4" />
                      </div>
                      <span className="font-medium">{a.title || 'Untitled assignment'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {a.cohortTitle ?? '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {a.dueDate ? formatDate(a.dueDate) : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.submissionCount} submission{a.submissionCount === 1 ? '' : 's'}
                  </TableCell>
                  <TableCell>
                    {a.pendingCount > 0 ? (
                      <Badge variant="secondary">{a.pendingCount} pending</Badge>
                    ) : allGraded ? (
                      <Badge className="bg-success/15 text-success hover:bg-success/20">
                        All graded
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => onView(a)}
                    >
                      Evaluate
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function AssignmentCard({
  assignment,
  status,
  onView,
}: {
  assignment: InstructorAssignmentSummary;
  status: AssignmentFilter;
  onView: (a: InstructorAssignmentSummary) => void;
}) {
  return (
    <Card className="soft-shadow transition hover:-translate-y-0.5 hover:glow-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{assignment.title || 'Untitled assignment'}</p>
              <p className="text-xs text-muted-foreground">{assignment.cohortTitle ?? 'No cohort'}</p>
            </div>
          </div>
          <Badge
            variant={status === 'pending' ? 'secondary' : 'default'}
            className={status === 'graded' ? 'bg-success/15 text-success hover:bg-success/20' : ''}
          >
            {status === 'pending' ? 'Pending Evaluation' : 'Graded'}
          </Badge>
        </div>

        <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 p-3">
          <p className="text-sm font-medium">
            {assignment.submissionCount} submission{assignment.submissionCount === 1 ? '' : 's'}
            {assignment.totalMarks !== null ? ` • Total: ${assignment.totalMarks}` : ''}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" /> Due {assignment.dueDate ? formatDate(assignment.dueDate) : '—'}
          </div>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => onView(assignment)}
          >
            Evaluate
          </Button>
        </div>
      </CardContent>
    </Card>
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

  const activeSubmission = useMemo(
    () => detail?.submissions.find((s) => s.id === activeSubmissionId) ?? null,
    [detail, activeSubmissionId],
  );

  const totalMarks = detail?.assignment.totalMarks ?? null;

  const viewToggle = (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
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
  );

  return (
    <div className="space-y-6">
      {/* PageHeader (reproduced inline — layout already provides navbar + sidebar) */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review and grade learner submissions
        </p>
      </div>

      {loading ? (
        <PageLoader label="Loading assignments..." />
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-center text-sm text-destructive"
        >
          {error}
        </div>
      ) : assignments.length === 0 ? (
        <div
          role="status"
          className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground"
        >
          No assignments yet for your cohorts.
        </div>
      ) : (
        <Tabs value={filter} onValueChange={(v) => setFilter(v as AssignmentFilter)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList className="bg-muted/60">
              <TabsTrigger value="pending">
                Pending Evaluations ({pendingAssignments.length})
              </TabsTrigger>
              <TabsTrigger value="graded">Graded ({gradedAssignments.length})</TabsTrigger>
            </TabsList>
            {viewToggle}
          </div>

          <TabsContent value="pending" className="mt-4">
            {pendingAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No assignments awaiting evaluation.</p>
            ) : view === 'list' ? (
              <AssignmentTable items={pendingAssignments} onView={(a) => void openAssignment(a)} />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {pendingAssignments.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    status="pending"
                    onView={(x) => void openAssignment(x)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="graded" className="mt-4">
            {gradedAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fully graded assignments yet.</p>
            ) : view === 'list' ? (
              <AssignmentTable items={gradedAssignments} onView={(a) => void openAssignment(a)} />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {gradedAssignments.map((a) => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    status="graded"
                    onView={(x) => void openAssignment(x)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Submission review — Naji's two-pane assignments.$id markup inside the dialog */}
      <Dialog open={activeAssignment !== null} onOpenChange={(open) => !open && closeAssignment()}>
        <DialogContent
          className="faculty-portal max-h-[90dvh] gap-0 overflow-hidden p-0 [&>*]:min-w-0"
          style={{ width: '64rem', maxWidth: 'min(64rem, calc(100vw - 2rem))' }}
        >
          <DialogHeader className="shrink-0 space-y-1 border-b border-border/60 p-5">
            <button
              type="button"
              onClick={closeAssignment}
              className="-ml-2 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> All assignments
            </button>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              {activeAssignment?.title || 'Assignment'}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {activeAssignment?.cohortTitle ? `${activeAssignment.cohortTitle} • ` : ''}
              Due: {activeAssignment?.dueDate ? formatDate(activeAssignment.dueDate) : '—'}
              {activeAssignment?.totalMarks !== null && activeAssignment?.totalMarks !== undefined
                ? ` • Total: ${activeAssignment.totalMarks}`
                : ''}
            </p>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center p-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading submissions...
            </div>
          ) : !detail ? (
            <div className="p-6">
              <p className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                Could not load submissions.
              </p>
            </div>
          ) : detail.submissions.length === 0 ? (
            <div className="space-y-4 overflow-y-auto p-5">
              {detail.assignment.instructions ? (
                <div className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-foreground/80">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Instructions
                  </p>
                  <p className="whitespace-pre-wrap">{detail.assignment.instructions}</p>
                </div>
              ) : null}
              <p className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                No submissions yet.
              </p>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 lg:grid-cols-[280px_1fr]">
              {/* Submissions list */}
              <Card className="soft-shadow lg:sticky lg:top-0 lg:self-start">
                <CardHeader>
                  <CardTitle className="text-sm">Submissions ({detail.submissions.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-40 divide-y overflow-y-auto lg:max-h-[60vh]">
                    {detail.submissions.map((submission) => (
                      <button
                        key={submission.id}
                        type="button"
                        onClick={() => selectSubmission(submission)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/60 ${
                          submission.id === activeSubmissionId ? 'bg-primary-soft' : ''
                        }`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {initials(submission.studentName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {submission.studentName || '—'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {submission.graded ? 'Graded' : 'Awaiting review'}
                          </p>
                        </div>
                        {submission.graded ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
                        ) : (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Review pane */}
              <div className="space-y-4">
                {detail.assignment.instructions ? (
                  <div className="rounded-xl border bg-muted/30 p-4 text-sm leading-relaxed text-foreground/80">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Instructions
                    </p>
                    <p className="whitespace-pre-wrap">{detail.assignment.instructions}</p>
                  </div>
                ) : null}

                {!activeSubmission ? (
                  <p className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                    Select a submission to review.
                  </p>
                ) : (
                  <>
                    <Card className="soft-shadow">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                            {initials(activeSubmission.studentName)}
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base">
                              {activeSubmission.studentName || '—'}
                            </CardTitle>
                            <p className="truncate text-xs text-muted-foreground">
                              {activeSubmission.studentEmail ||
                                activeSubmission.studentEnrollmentId ||
                                '—'}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={
                            activeSubmission.graded
                              ? 'bg-success/15 text-success hover:bg-success/20'
                              : 'bg-primary-soft text-primary hover:bg-primary-soft/80'
                          }
                        >
                          {activeSubmission.graded ? 'Graded' : 'Awaiting Review'}
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            Submitted {formatDateTime(activeSubmission.submittedAt)}
                          </span>
                          {activeSubmission.studentEnrollmentId ? (
                            <span>ID: {activeSubmission.studentEnrollmentId}</span>
                          ) : null}
                        </div>

                        <div>
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Attached files
                          </p>
                          {activeSubmission.files.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No files attached.</p>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {activeSubmission.files.map((file, idx) => (
                                <div
                                  key={file + idx}
                                  className="flex items-center gap-3 rounded-lg border p-3"
                                >
                                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">File {idx + 1}</p>
                                    <p className="text-[11px] text-muted-foreground">Open in new tab</p>
                                  </div>
                                  <Button
                                    asChild
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                  >
                                    <a href={file} target="_blank" rel="noopener noreferrer">
                                      <Download className="h-3.5 w-3.5" />
                                    </a>
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="soft-shadow">
                      <CardHeader>
                        <CardTitle className="text-base">Evaluation</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="-mt-2 text-xs text-muted-foreground">
                          Marks are stored as text on the legacy schema — enter a number, fraction,
                          or letter grade.
                        </p>
                        <div className="grid gap-1.5">
                          <Label htmlFor="grade-marks">
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
                          <Label htmlFor="grade-remarks">Feedback</Label>
                          <textarea
                            id="grade-remarks"
                            rows={5}
                            className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={grading?.remarks ?? ''}
                            placeholder="Provide constructive feedback for the learner…"
                            onChange={(e) =>
                              setGrading((prev) =>
                                prev ? { ...prev, remarks: e.target.value } : prev,
                              )
                            }
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                          <Button
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
                            <Badge variant="outline" className="border-success/40 text-success">
                              <RotateCcw className="mr-1 h-3 w-3" /> Re-grading
                            </Badge>
                          ) : null}
                          {activeSubmission.files.length > 0 ? (
                            <Button asChild variant="ghost" className="ml-auto">
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
