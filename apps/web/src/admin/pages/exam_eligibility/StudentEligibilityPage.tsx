import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatDate, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';

// Naji 2026-05-09 — Student Eligibility tabbed table.
//   Eligible        — fee fully paid + every assignment evaluated.
//   Completed       — every allocated exam has an attempt.
//   Not Eligible    — everyone else (with a reasons summary).
// Naji UAT 2026-05-22 — Course / Course Offering / Status filters now apply
// in every tab, a Course Offering column is shown, and the View action
// deep-links to the Enrollment tab of the student profile (not the profile).
type Tab = 'eligible' | 'completed' | 'not_eligible';

const TABS: Array<{ id: Tab; label: string; tone: string }> = [
  { id: 'eligible', label: 'Eligible', tone: 'text-emerald-700' },
  { id: 'completed', label: 'Completed', tone: 'text-purple-700' },
  { id: 'not_eligible', label: 'Not Eligible', tone: 'text-amber-700' },
];

export default function StudentEligibilityPage({ api, session, onNavigate }: AdminPageProps) {
  const [active, setActive] = useState<Tab>('eligible');
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [offeringFilter, setOfferingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // enrolment status (Active / On Hold / etc.)

  const { data, loading, error } = useAdminPageData(
    () => api.listStudentEligibility(session.token),
    [],
  );

  const rows = useMemo(() => toRecords(data), [data]);

  // Build dropdown options from the data we already have. Offering options
  // narrow to the selected course so the list stays manageable.
  const courseOptions = useMemo(() => {
    const titles = [...new Set(rows.map((r) => asString(r.course_title)).filter(Boolean))];
    return titles.sort().map((t) => ({ label: t, value: t }));
  }, [rows]);

  const offeringOptions = useMemo(() => {
    const titles = [...new Set(
      rows
        .filter((r) => !courseFilter || asString(r.course_title) === courseFilter)
        .map((r) => asString(r.course_offering))
        .filter(Boolean),
    )];
    return titles.sort().map((t) => ({ label: t, value: t }));
  }, [rows, courseFilter]);

  const statusOptions = useMemo(() => {
    const statuses = [...new Set(rows.map((r) => asString(r.enrollment_status)).filter(Boolean))];
    return statuses.sort().map((s) => ({ label: s, value: s }));
  }, [rows]);

  // Apply Course / Offering / Status filters first so counts reflect them.
  const filteredByDropdowns = useMemo(() => {
    return rows.filter((r) => {
      if (courseFilter && asString(r.course_title) !== courseFilter) return false;
      if (offeringFilter && asString(r.course_offering) !== offeringFilter) return false;
      if (statusFilter && asString(r.enrollment_status) !== statusFilter) return false;
      return true;
    });
  }, [rows, courseFilter, offeringFilter, statusFilter]);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { eligible: 0, completed: 0, not_eligible: 0 };
    for (const r of filteredByDropdowns) {
      const s = asString(r.status);
      if (s === 'eligible' || s === 'completed' || s === 'not_eligible') c[s] += 1;
    }
    return c;
  }, [filteredByDropdowns]);

  const filtered = useMemo(() => {
    const tabRows = filteredByDropdowns.filter((r) => asString(r.status) === active);
    if (!search) return tabRows;
    const q = search.toLowerCase();
    return tabRows.filter((r) =>
      asString(r.student_name).toLowerCase().includes(q)
      || asString(r.email).toLowerCase().includes(q)
      || asString(r.enrollment_id).toLowerCase().includes(q)
      || asString(r.course_title).toLowerCase().includes(q)
      || asString(r.course_offering).toLowerCase().includes(q),
    );
  }, [filteredByDropdowns, active, search]);

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
    { key: 'course_offering', label: 'Course Offering', sortable: true, render: (v) => asString(v) || '—' },
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

  const filters: FilterField[] = useMemo(
    () => [
      {
        key: 'course',
        label: 'Course',
        type: 'select' as const,
        value: courseFilter,
        placeholder: 'All Courses',
        options: courseOptions,
        onChange: (v: string) => {
          setCourseFilter(v);
          // When course changes, reset the offering filter so the dropdown stays in sync.
          setOfferingFilter('');
        },
      },
      {
        key: 'offering',
        label: 'Course Offering',
        type: 'select' as const,
        value: offeringFilter,
        placeholder: 'All Offerings',
        options: offeringOptions,
        onChange: setOfferingFilter,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        value: statusFilter,
        placeholder: 'All Statuses',
        options: statusOptions,
        onChange: setStatusFilter,
      },
    ],
    [courseFilter, courseOptions, offeringFilter, offeringOptions, statusFilter, statusOptions],
  );

  if (loading) return <PageLoader label="Loading eligibility…" />;
  if (error) return <Card><CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Student Eligibility" />
      <p className="-mt-2 text-sm text-gray-500">
        One row per enrolment. Eligibility checks: all assignments evaluated · fee fully paid. Completed = every allocated exam attempted.
      </p>

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => {
          setCourseFilter('');
          setOfferingFilter('');
          setStatusFilter('');
        }}
      />

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
            placeholder="Search name / email / enrollment id / course / offering…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3 max-w-sm"
          />
          <AdminDataTable
            columns={columns}
            rows={filtered}
            actions={[
              {
                // Naji UAT 2026-05-22 — View now deep-links to the
                // Enrollment tab of the student profile (and selects the
                // specific enrolment), not the personal profile tab.
                label: 'View Enrollment',
                onClick: (row) => {
                  const uid = asString(row.user_id);
                  const enrolId = asString(row.enrol_id);
                  if (!uid) return;
                  const qs = enrolId ? `?tab=enrollments&enrol_id=${encodeURIComponent(enrolId)}` : '?tab=enrollments';
                  onNavigate(`/admin/students/view/${uid}${qs}`);
                },
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
