import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
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

  const { data, loading, error } = useAdminPageData(
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

  const actions: DataTableAction[] = useMemo(() => {
    const download = {
      label: 'Download File',
      onClick: (row: Record<string, unknown>) => {
        const url = asString(row.submission_file);
        if (url) window.open(url, '_blank');
      },
    };
    const evaluate = {
      // Naji UAT 2026-05-22 — Evaluate now opens just the row's submission
      // (one student), not every submission for the assignment. The list
      // page still works without ?submission_id for the table-wide flow.
      label: 'Evaluate',
      onClick: (row: Record<string, unknown>) => {
        const assignmentId = asString(row.assignment_id);
        const submissionId = asString(row.id);
        if (!assignmentId) return;
        const qs = submissionId ? `?submission_id=${encodeURIComponent(submissionId)}` : '';
        onNavigate(`/admin/assignment/submissions/${assignmentId}${qs}`);
      },
    };
    const reEvaluate = { ...evaluate, label: 'Re-Evaluate' };
    if (active === 'pending_evaluation') return [evaluate, download];
    if (active === 'pending_verification') return [reEvaluate, download];
    if (active === 'result_published') return [reEvaluate, download];
    if (active === 'returned') return [reEvaluate, download];
    return [download];
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
            <AdminDataTable columns={columns} rows={filtered} actions={actions} />
          )}
        </CardContent>
      </Card>

      {(active === 'pending_verification' || active === 'returned') && (
        <Card>
          <CardContent className="py-3 text-center text-xs text-gray-500">
            Verification and Return workflows are tracked separately; rows surface here once an instructor verifies or returns an evaluation.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
