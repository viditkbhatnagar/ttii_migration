import { useState } from 'react';
import { ClipboardList, FileText, Calendar, Bookmark, BookmarkCheck, Eye, Award, MessageSquare, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { AdminTabBar } from '../../../admin/shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../../admin/shared/components/AdminStatusBadge.js';
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

export default function StudentAssessmentsPage({ api, session }: StudentPageProps) {
  const [mainTab, setMainTab] = useState<MainTab>('assignments');
  const [assignmentSubTab, setAssignmentSubTab] = useState<AssignmentSubTab>('current');
  const [examSubTab, setExamSubTab] = useState<ExamSubTab>('upcoming');
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);

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
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Assessments</h1>
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
          </CardContent>
        </Card>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Assessments</h1>
        <Button variant="outline" size="sm" onClick={reload}>Refresh</Button>
      </div>

      <AdminTabBar
        tabs={mainTabs}
        activeTab={mainTab}
        onChange={(id) => setMainTab(id as MainTab)}
      />

      {mainTab === 'assignments' ? (
        <div className="space-y-4">
          <AdminTabBar
            tabs={assignmentSubTabs}
            activeTab={assignmentSubTab}
            onChange={(id) => setAssignmentSubTab(id as AssignmentSubTab)}
          />

          {currentAssignments.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <ClipboardList className="size-10 text-gray-300" />
                <p className="text-sm text-gray-500">No {assignmentSubTab} assignments.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {currentAssignments.map((assignment) => {
                const id = asString(assignment.id);
                const title = asString(assignment.title) || `Assignment ${id}`;
                const status = asString(assignment.status) || assignmentSubTab;
                const dueDate = asString(assignment.date) || asString(assignment.due_date) || asString(assignment.end_date);
                const totalMarks = asString(assignment.total_marks);
                const marks = asString(assignment.marks);
                const isSaved = asNumber(assignment.is_saved) === 1;
                const isSubmitted = asNumber(assignment.is_submitted) > 0;
                const isReviewed = asNumber(assignment.is_reviewed) === 1;
                const remarks = asString(assignment.remarks);
                const submittedFiles = parseSubmittedFiles(assignment.submitted_file);
                const isExpanded = expandedSubmission === id;
                const isCompleted = assignmentSubTab === 'completed';

                return (
                  <Card key={id} className="bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-100">
                          <ClipboardList className="size-4 text-orange-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">{title}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                            {dueDate ? (
                              <span className="flex items-center gap-1">
                                <Calendar className="size-3" />
                                {formatDate(dueDate)}
                              </span>
                            ) : null}
                            {totalMarks ? <span>{totalMarks} marks</span> : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <AdminStatusBadge status={status} />
                          {isCompleted && isSubmitted ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setExpandedSubmission(isExpanded ? null : id)}
                              title="View Submission"
                            >
                              <Eye className="size-4 text-ttii-primary" />
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
                                <BookmarkCheck className="size-4 text-ttii-primary" />
                              ) : (
                                <Bookmark className="size-4 text-gray-400" />
                              )}
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {/* Submission Details (expanded for completed assignments) */}
                      {isExpanded && isCompleted ? (
                        <>
                          <Separator className="my-3" />
                          <div className="space-y-3 rounded-lg bg-gray-50 p-3">
                            <h4 className="text-sm font-medium text-gray-700">Submission Details</h4>

                            {/* Score & Review */}
                            {isReviewed ? (
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Award className="size-4 text-amber-500" />
                                  <span className="text-sm font-semibold text-gray-900">Score: {marks}</span>
                                </div>
                                <Badge variant="default">Reviewed</Badge>
                              </div>
                            ) : isSubmitted ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">Pending Review</Badge>
                              </div>
                            ) : null}

                            {/* Remarks */}
                            {remarks ? (
                              <div className="flex items-start gap-2">
                                <MessageSquare className="mt-0.5 size-4 text-gray-400" />
                                <div>
                                  <p className="text-xs font-medium text-gray-500">Instructor Remarks</p>
                                  <p className="text-sm text-gray-700">{remarks}</p>
                                </div>
                              </div>
                            ) : null}

                            {/* Submitted Files */}
                            {submittedFiles.length > 0 ? (
                              <div className="space-y-1.5">
                                <p className="text-xs font-medium text-gray-500">Submitted Files</p>
                                {submittedFiles.map((sf, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <Link2 className="size-3.5 text-blue-500" />
                                    <a
                                      href={sf.file}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-blue-600 hover:underline"
                                    >
                                      {getFileName(sf.file)}
                                    </a>
                                    {sf.date ? (
                                      <span className="text-xs text-gray-400">{formatDate(sf.date)}</span>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
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

          {currentExams.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <FileText className="size-10 text-gray-300" />
                <p className="text-sm text-gray-500">No {examSubTab} exams.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {currentExams.map((exam) => {
                const id = asString(exam.id);
                const title = asString(exam.title) || `Exam ${id}`;
                const date = asString(exam.date) || asString(exam.start_date);
                const questionCount = asNumber(exam.questions_count) || asNumber(exam.total_questions);
                const duration = asString(exam.duration) || asString(exam.time_limit);

                return (
                  <Card key={id} className="bg-white">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-100">
                        <FileText className="size-4 text-red-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{title}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                          {date ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="size-3" />
                              {formatDate(date)}
                            </span>
                          ) : null}
                          {questionCount > 0 ? <span>{questionCount} questions</span> : null}
                          {duration ? <span>{duration}</span> : null}
                        </div>
                      </div>
                      <AdminStatusBadge status={examSubTab === 'upcoming' ? 'upcoming' : 'expired'} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
