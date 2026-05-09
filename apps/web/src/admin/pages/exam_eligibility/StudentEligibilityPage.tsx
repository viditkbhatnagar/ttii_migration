import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatDate, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

// Naji 2026-05-09 — Student Eligibility tabbed table.
//   Eligible        — fee fully paid + every assignment evaluated.
//   Completed       — every allocated exam has an attempt.
//   Not Eligible    — everyone else (with a reasons summary).
type Tab = 'eligible' | 'completed' | 'not_eligible';

const TABS: Array<{ id: Tab; label: string; tone: string }> = [
  { id: 'eligible', label: 'Eligible', tone: 'text-emerald-700' },
  { id: 'completed', label: 'Completed', tone: 'text-purple-700' },
  { id: 'not_eligible', label: 'Not Eligible', tone: 'text-amber-700' },
];

export default function StudentEligibilityPage({ api, session, onNavigate }: AdminPageProps) {
  const [active, setActive] = useState<Tab>('eligible');
  const [search, setSearch] = useState('');

  const { data, loading, error } = useAdminPageData(
    () => api.listStudentEligibility(session.token),
    [],
  );

  const rows = useMemo(() => toRecords(data), [data]);
  const counts = useMemo(() => {
    const c: Record<Tab, number> = { eligible: 0, completed: 0, not_eligible: 0 };
    for (const r of rows) {
      const s = asString(r.status);
      if (s === 'eligible' || s === 'completed' || s === 'not_eligible') c[s] += 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const tabRows = rows.filter((r) => asString(r.status) === active);
    if (!search) return tabRows;
    const q = search.toLowerCase();
    return tabRows.filter((r) =>
      asString(r.student_name).toLowerCase().includes(q)
      || asString(r.email).toLowerCase().includes(q)
      || asString(r.enrollment_id).toLowerCase().includes(q)
      || asString(r.course_title).toLowerCase().includes(q),
    );
  }, [rows, active, search]);

  const baseColumns: DataTableColumn[] = [
    {
      key: 'enrollment_id',
      label: 'Enrollment ID',
      sortable: true,
      render: (v) => <span className="font-mono text-xs text-slate-700">{asString(v) || '—'}</span>,
    },
    {
      key: 'student_name',
      label: 'Student',
      sortable: true,
      render: (_v, r) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{asString(r.student_name) || '—'}</p>
          <p className="truncate text-xs text-gray-500">{asString(r.email)}</p>
        </div>
      ),
    },
    { key: 'course_title', label: 'Course', sortable: true, render: (v) => asString(v) || '—' },
  ];

  // Per-tab extra columns make each tab feel purposeful.
  const tabExtraColumns: Record<Tab, DataTableColumn[]> = {
    eligible: [
      {
        key: 'assignments_evaluated',
        label: 'Assignments',
        render: (_v, r) => (
          <span className="text-xs text-gray-700">{asNumber(r.assignments_evaluated)} / {asNumber(r.assignments_total)} evaluated</span>
        ),
      },
      {
        key: 'fee_paid',
        label: 'Fee',
        render: (_v, r) => {
          const paid = asNumber(r.fee_paid);
          const total = asNumber(r.fee_total);
          return <span className="text-xs text-emerald-700">₹{paid.toLocaleString('en-IN')} / ₹{total.toLocaleString('en-IN')}</span>;
        },
      },
    ],
    completed: [
      {
        key: 'exams_attempted',
        label: 'Exams Completed',
        render: (_v, r) => (
          <span className="text-xs text-gray-700">{asNumber(r.exams_attempted)} / {asNumber(r.exams_allocated)}</span>
        ),
      },
      { key: 'enrollment_date', label: 'Enrolled', render: (v) => formatDate(v) || asString(v) || '—' },
    ],
    not_eligible: [
      {
        key: 'reasons',
        label: 'Pending',
        render: (v) => <span className="text-xs text-amber-700">{asString(v) || 'Multiple conditions pending'}</span>,
      },
    ],
  };

  const columns = [...baseColumns, ...tabExtraColumns[active]];

  if (loading) return <PageLoader label="Loading eligibility…" />;
  if (error) return <Card><CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Student Eligibility" />
      <p className="-mt-2 text-sm text-gray-500">
        One row per enrolment. Eligibility checks: all assignments evaluated · fee fully paid. Completed = every allocated exam attempted.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`relative px-4 py-2 text-sm font-medium transition-colors ${active === t.id ? `${t.tone}` : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label} <span className="ml-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-600">{counts[t.id]}</span>
            {active === t.id ? <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ttii-primary" /> : null}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search name / email / enrollment id / course…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3 max-w-sm"
          />
          <AdminDataTable
            columns={columns}
            rows={filtered}
            actions={[
              {
                label: 'View Student',
                onClick: (row) => {
                  const uid = asString(row.user_id);
                  if (uid) onNavigate(`/admin/students/view/${uid}`);
                },
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
