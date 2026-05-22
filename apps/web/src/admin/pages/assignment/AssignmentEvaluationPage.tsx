import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import { CheckCircle2, FileText, ExternalLink } from 'lucide-react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';

const STATUS_TABS = [
  { id: 'pending_evaluation', label: 'Pending Evaluation' },
  { id: 'pending_verification', label: 'Pending Verification' },
  { id: 'result_published', label: 'Result Published' },
  { id: 'returned', label: 'Returned' },
] as const;

type StatusId = (typeof STATUS_TABS)[number]['id'];

export default function AssignmentEvaluationPage({ api, session, onNavigate }: AdminPageProps) {
  const [active, setActive] = useState<StatusId>('pending_evaluation');
  // Naji UAT 2026-05-22 — verification-preview modal. Opens from
  // Pending Verification, shows the grades, offers Verify or Re-Evaluate.
  const [verifyRow, setVerifyRow] = useState<Record<string, unknown> | null>(null);
  const [verifying, setVerifying] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAssignmentEvaluations(session.token),
    [],
  );

  const allRows = useMemo(() => toRecords(data), [data]);
  const counts = useMemo(() => {
    const c: Record<StatusId, number> = {
      pending_evaluation: 0,
      pending_verification: 0,
      result_published: 0,
      returned: 0,
    };
    for (const r of allRows) {
      const s = asString(r.status) as StatusId;
      if (s in c) c[s] += 1;
    }
    return c;
  }, [allRows]);

  const filtered = useMemo(
    () => allRows.filter((r) => asString(r.status) === active),
    [allRows, active],
  );

  const baseColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'student_name', label: 'Student', render: (_v, row) => (
        <div>
          <div className="font-medium">{asString(row.student_name) || '-'}</div>
          <div className="text-xs text-gray-500">{asString(row.student_id)}</div>
        </div>
      ) },
      { key: 'course_title', label: 'Course', render: (v) => asString(v) || '-' },
      { key: 'offering_title', label: 'Offering', render: (v) => asString(v) || '-' },
      { key: 'subject_title', label: 'Subject', render: (v) => asString(v) || '-' },
      { key: 'cohort_title', label: 'Cohort', render: (_v, row) => asString(row.cohort_title) || asString(row.cohort_code) || '-' },
      { key: 'instructor_name', label: 'Instructor', render: (v) => asString(v) || '-' },
      { key: 'submitted_at', label: 'Submitted On', render: (v) => formatDate(v) || '-' },
    ],
    [],
  );

  const columns: DataTableColumn[] = useMemo(() => {
    if (active === 'pending_verification' || active === 'result_published') {
      return [
        ...baseColumns,
        { key: 'marks', label: 'Marks', render: (_v, row) => `${asString(row.marks) || '-'} / ${asString(row.total_marks) || '-'}` },
        { key: 'evaluated_at', label: 'Evaluated On', render: (v) => formatDate(v) || '-' },
      ];
    }
    if (active === 'returned') {
      return [
        ...baseColumns,
        { key: 'evaluated_at', label: 'Returned On', render: (v) => formatDate(v) || '-' },
      ];
    }
    return baseColumns;
  }, [baseColumns, active]);

  // Navigation helper — opens just one student's submission in the
  // existing ViewSubmissionsPage focus mode.
  const openSubmissionEditor = (row: Record<string, unknown>) => {
    const assignmentId = asString(row.assignment_id);
    const submissionId = asString(row.id);
    if (!assignmentId) return;
    const qs = submissionId ? `?submission_id=${encodeURIComponent(submissionId)}` : '';
    onNavigate(`/admin/assignment/submissions/${assignmentId}${qs}`);
  };

  const handleVerify = async () => {
    if (!verifyRow) return;
    const submissionId = asString(verifyRow.id);
    if (!submissionId) return;
    setVerifying(true);
    try {
      const res = await api.verifySubmission(session.token, submissionId);
      const status = (res as { status?: number }).status;
      const message = (res as { message?: string }).message;
      if (status === 1) {
        toast.success(message || 'Submission verified.');
        setVerifyRow(null);
        reload();
      } else {
        toast.error(message || 'Failed to verify submission.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify submission.');
    } finally {
      setVerifying(false);
    }
  };

  const actions: DataTableAction[] = useMemo(() => {
    const download = {
      label: 'Download File',
      onClick: (row: Record<string, unknown>) => {
        const url = asString(row.submission_file);
        if (url) window.open(url, '_blank');
      },
    };
    // Naji UAT 2026-05-22 — three-state flow:
    //   Pending Evaluation → Evaluate (instructor inputs marks)
    //   Pending Verification → Review (modal shows grades + Verify / Re-Evaluate)
    //   Result Published → Re-Evaluate (admin can re-open)
    const evaluate: DataTableAction = {
      label: 'Evaluate',
      onClick: openSubmissionEditor,
    };
    const reEvaluate: DataTableAction = { ...evaluate, label: 'Re-Evaluate' };
    const review: DataTableAction = {
      label: 'Review',
      onClick: (row) => setVerifyRow(row),
    };
    if (active === 'pending_evaluation') return [evaluate, download];
    if (active === 'pending_verification') return [review, reEvaluate, download];
    if (active === 'result_published') return [reEvaluate, download];
    if (active === 'returned') return [reEvaluate, download];
    return [download];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, onNavigate]);

  if (loading) return <PageLoader label="Loading assignment evaluations..." />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Assignment Evaluation" />

      <Card>
        <CardContent className="p-2">
          <div className="flex flex-wrap gap-1 border-b border-gray-200">
            {STATUS_TABS.map((t) => (
              <Button
                key={t.id}
                type="button"
                variant="ghost"
                size="sm"
                className={`relative rounded-none px-4 py-2 text-sm font-medium ${active === t.id ? 'text-ttii-primary' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActive(t.id)}
              >
                {t.label}
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs text-gray-600">
                  {counts[t.id]}
                </span>
                {active === t.id ? (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ttii-primary" />
                ) : null}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-gray-400">No submissions in this tab.</p>
          ) : (
            <AdminDataTable
              columns={columns}
              rows={filtered}
              actions={actions}
              // Naji UAT 2026-05-22 — single-click row open for verification
              // preview when on Pending Verification.
              onRowClick={active === 'pending_verification' ? (row) => setVerifyRow(row) : undefined}
            />
          )}
        </CardContent>
      </Card>

      {active === 'returned' && (
        <Card>
          <CardContent className="py-3 text-center text-xs text-gray-500">
            Returned workflow is tracked separately; rows surface here once an instructor returns an evaluation to the student.
          </CardContent>
        </Card>
      )}

      {/* Verification preview modal — opens from Pending Verification rows.
          Shows the submission + grade + remarks, then offers Verify (publish)
          or Re-Evaluate (re-open the marks editor). */}
      <Dialog open={verifyRow !== null} onOpenChange={(o) => !o && setVerifyRow(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Verify Evaluation</DialogTitle>
          </DialogHeader>
          {verifyRow ? (
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2">
                <span className="text-gray-500">Student</span>
                <span className="col-span-2 font-medium text-gray-900">
                  {asString(verifyRow.student_name) || '-'}
                  {asString(verifyRow.student_id) ? <span className="ml-2 text-xs text-gray-500">({asString(verifyRow.student_id)})</span> : null}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2">
                <span className="text-gray-500">Assignment</span>
                <span className="col-span-2 text-gray-900">{asString(verifyRow.assignment_title) || '-'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2">
                <span className="text-gray-500">Course / Cohort</span>
                <span className="col-span-2 text-gray-900">
                  {asString(verifyRow.course_title) || '-'}
                  {asString(verifyRow.cohort_title) || asString(verifyRow.cohort_code) ? (
                    <span className="ml-2 text-xs text-gray-500">· {asString(verifyRow.cohort_title) || asString(verifyRow.cohort_code)}</span>
                  ) : null}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2">
                <span className="text-gray-500">Submitted On</span>
                <span className="col-span-2 text-gray-900">{formatDate(verifyRow.submitted_at) || '-'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2">
                <span className="text-gray-500">Marks</span>
                <span className="col-span-2 font-semibold text-ttii-primary">
                  {asString(verifyRow.marks) || '-'} / {asString(verifyRow.total_marks) || '-'}
                </span>
              </div>
              {asString(verifyRow.remarks) ? (
                <div className="grid grid-cols-3 gap-2 border-b border-gray-100 py-2">
                  <span className="text-gray-500">Remarks</span>
                  <span className="col-span-2 text-gray-900">{asString(verifyRow.remarks)}</span>
                </div>
              ) : null}
              {asString(verifyRow.submission_file) ? (
                <div className="grid grid-cols-3 gap-2 py-2">
                  <span className="text-gray-500">Submission</span>
                  <a
                    href={asString(verifyRow.submission_file)}
                    target="_blank"
                    rel="noreferrer"
                    className="col-span-2 inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    <FileText className="size-4" /> Open submitted file <ExternalLink className="size-3" />
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (verifyRow) {
                  const row = verifyRow;
                  setVerifyRow(null);
                  openSubmissionEditor(row);
                }
              }}
              disabled={verifying}
            >
              Re-Evaluate
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setVerifyRow(null)} disabled={verifying}>Cancel</Button>
              <Button
                type="button"
                className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => void handleVerify()}
                disabled={verifying}
              >
                <CheckCircle2 className="size-4" /> {verifying ? 'Verifying…' : 'Verify & Publish'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
