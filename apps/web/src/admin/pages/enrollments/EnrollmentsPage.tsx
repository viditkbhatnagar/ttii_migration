import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';

// Naji UAT 2026-05-13 — canonical enrolment statuses. Tabs + summary
// cards mirror the Edit Enrolment dialog dropdown.
const ENROLMENT_STATUSES = ['Active', 'On Hold', 'Dropout', 'Completed', 'Graduated'] as const;
type EnrolmentStatus = (typeof ENROLMENT_STATUSES)[number];

function normalizeStatus(raw: string): EnrolmentStatus | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  // Map legacy spellings to the canonical labels.
  if (s === 'active') return 'Active';
  if (s === 'on hold' || s === 'onhold' || s === 'hold' || s === 'pending') return 'On Hold';
  if (s === 'dropout' || s === 'drop out' || s === 'dropped' || s === 'inactive') return 'Dropout';
  if (s === 'completed' || s === 'complete') return 'Completed';
  if (s === 'graduated' || s === 'graduate') return 'Graduated';
  return null;
}

export default function EnrollmentsPage({ api, session, onNavigate }: AdminPageProps) {
  const [courseFilter, setCourseFilter] = useState('');
  const [offeringFilter, setOfferingFilter] = useState('');
  const [combinationFilter, setCombinationFilter] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const { data, loading, error } = useAdminPageData(
    () => api.loadEnrollments(session.token),
    [],
  );

  const allEnrollments = useMemo(() => toRecords(data), [data]);

  const courseOptions = useMemo(() => {
    const titles = [...new Set(allEnrollments.map((r) => asString(r.course_title)).filter(Boolean))];
    return titles.sort().map((t) => ({ label: t, value: t }));
  }, [allEnrollments]);

  // Offering options scoped to the selected course (when set) so the
  // dropdown stays manageable. Naji UAT 2026-05-13.
  const offeringOptions = useMemo(() => {
    const titles = [...new Set(
      allEnrollments
        .filter((r) => !courseFilter || asString(r.course_title) === courseFilter)
        .map((r) => asString(r.course_offering))
        .filter(Boolean),
    )];
    return titles.sort().map((t) => ({ label: t, value: t }));
  }, [allEnrollments, courseFilter]);

  // Combination options scoped to the selected course + offering.
  const combinationOptions = useMemo(() => {
    const titles = [...new Set(
      allEnrollments
        .filter((r) => !courseFilter || asString(r.course_title) === courseFilter)
        .filter((r) => !offeringFilter || asString(r.course_offering) === offeringFilter)
        .map((r) => asString(r.combination_title))
        .filter(Boolean),
    )];
    return titles.sort().map((t) => ({ label: t, value: t }));
  }, [allEnrollments, courseFilter, offeringFilter]);

  // Tab counts (mapped onto the canonical 5 statuses). Run BEFORE the
  // status-tab filter so the badges reflect the full course/offering
  // filtered set, not the currently selected tab.
  const filteredByOthers = useMemo(() => {
    return allEnrollments.filter((r) => {
      if (courseFilter && asString(r.course_title) !== courseFilter) return false;
      if (offeringFilter && asString(r.course_offering) !== offeringFilter) return false;
      if (combinationFilter && asString(r.combination_title) !== combinationFilter) return false;
      if (fromDate || toDate) {
        const dateStr = asString(r.enrollment_date) || asString(r.created_at);
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (fromDate && d < new Date(fromDate)) return false;
        if (toDate && d > new Date(`${toDate}T23:59:59`)) return false;
      }
      return true;
    });
  }, [allEnrollments, courseFilter, offeringFilter, combinationFilter, fromDate, toDate]);

  const statusCounts = useMemo(() => {
    const counts: Record<EnrolmentStatus, number> = {
      Active: 0, 'On Hold': 0, Dropout: 0, Completed: 0, Graduated: 0,
    };
    for (const r of filteredByOthers) {
      // Default unmarked rows to Active so the totals add up cleanly.
      const s = normalizeStatus(asString(r.enrollment_status)) ?? 'Active';
      counts[s] += 1;
    }
    return counts;
  }, [filteredByOthers]);

  // Apply status-tab filter on top of the other filters.
  const filteredEnrollments = useMemo(() => {
    if (activeStatusTab === 'all') return filteredByOthers;
    return filteredByOthers.filter((r) => {
      const s = normalizeStatus(asString(r.enrollment_status)) ?? 'Active';
      return s === activeStatusTab;
    });
  }, [filteredByOthers, activeStatusTab]);

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'enrollment_id', label: 'Enrollment ID', sortable: true },
      { key: 'enrollment_date', label: 'Date of Enrollment', render: (v) => formatDate(v) },
      { key: 'student_name', label: 'Student', sortable: true },
      { key: 'course_title', label: 'Course Name' },
      { key: 'course_offering', label: 'Course Offering', render: (v) => asString(v) || '-' },
      { key: 'combination_title', label: 'Combination', render: (v) => asString(v) || '-' },
      { key: 'course_fee', label: 'Course Fee', render: (v) => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? `₹${n.toLocaleString('en-IN')}` : '-';
      } },
      {
        key: 'progress_percent',
        label: 'Progress',
        render: (v) => {
          const pct = Math.max(0, Math.min(100, Number(v) || 0));
          return (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 rounded-full bg-gray-200">
                <div className="h-1.5 rounded-full bg-ttii-primary" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-600">{pct}%</span>
            </div>
          );
        },
      },
      {
        key: 'enrollment_status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asString(v)} />,
      },
    ],
    [],
  );

  const actions: DataTableAction[] = useMemo(
    () => [
      {
        label: 'View',
        onClick: (row) => {
          const studentId = asString(row.student_id);
          if (studentId) {
            onNavigate(`/admin/students/view/${studentId}`);
          }
        },
      },
    ],
    [onNavigate],
  );

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
          // Reset child filters when course changes so they stay in sync.
          setOfferingFilter('');
          setCombinationFilter('');
        },
      },
      {
        key: 'offering',
        label: 'Offering',
        type: 'select' as const,
        value: offeringFilter,
        placeholder: 'All Offerings',
        options: offeringOptions,
        onChange: (v: string) => {
          setOfferingFilter(v);
          setCombinationFilter('');
        },
      },
      {
        key: 'combination',
        label: 'Combination',
        type: 'select' as const,
        value: combinationFilter,
        placeholder: 'All Combinations',
        options: combinationOptions,
        onChange: setCombinationFilter,
      },
      { key: 'from_date', label: 'From Date', type: 'date' as const, value: fromDate, onChange: setFromDate },
      { key: 'to_date', label: 'To Date', type: 'date' as const, value: toDate, onChange: setToDate },
    ],
    [courseOptions, courseFilter, offeringOptions, offeringFilter, combinationOptions, combinationFilter, fromDate, toDate],
  );

  const statusTabs: AdminTab[] = useMemo(
    () => [
      { id: 'all', label: 'All', count: filteredByOthers.length },
      ...ENROLMENT_STATUSES.map((s) => ({ id: s, label: s, count: statusCounts[s] })),
    ],
    [filteredByOthers.length, statusCounts],
  );

  if (loading) return <PageLoader label="Loading enrollments..." />;

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Enrollments" />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Total Enrolments', value: filteredByOthers.length },
          { label: 'Active', value: statusCounts.Active },
          { label: 'On Hold', value: statusCounts['On Hold'] },
          { label: 'Dropout', value: statusCounts.Dropout },
          { label: 'Completed', value: statusCounts.Completed },
          { label: 'Graduated', value: statusCounts.Graduated },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => {
          setCourseFilter('');
          setOfferingFilter('');
          setCombinationFilter('');
          setActiveStatusTab('all');
          setFromDate('');
          setToDate('');
        }}
      />

      <AdminTabBar tabs={statusTabs} activeTab={activeStatusTab} onChange={setActiveStatusTab} />

      <AdminDataTable columns={columns} rows={filteredEnrollments} actions={actions} />
    </div>
  );
}
