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

export default function EnrollmentsPage({ api, session, onNavigate }: AdminPageProps) {
  const [courseFilter, setCourseFilter] = useState('');
  const [offeringFilter, setOfferingFilter] = useState('');
  const [combinationFilter, setCombinationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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

  // Apply filters client-side (keeps single-round-trip load + fast UX)
  const filteredEnrollments = useMemo(() => {
    return allEnrollments.filter((r) => {
      if (courseFilter && asString(r.course_title) !== courseFilter) return false;
      if (offeringFilter && asString(r.course_offering) !== offeringFilter) return false;
      if (combinationFilter && asString(r.combination_title) !== combinationFilter) return false;
      if (statusFilter && asString(r.enrollment_status).toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (fromDate || toDate) {
        const dateStr = asString(r.enrollment_date) || asString(r.created_at);
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (fromDate && d < new Date(fromDate)) return false;
        if (toDate && d > new Date(`${toDate}T23:59:59`)) return false;
      }
      return true;
    });
  }, [allEnrollments, courseFilter, offeringFilter, combinationFilter, statusFilter, fromDate, toDate]);

  const activeCount = useMemo(
    () => allEnrollments.filter((r) => asString(r.enrollment_status).toLowerCase() === 'active').length,
    [allEnrollments],
  );

  const pendingCount = useMemo(
    () => allEnrollments.filter((r) => asString(r.enrollment_status).toLowerCase() === 'pending').length,
    [allEnrollments],
  );

  const uniqueCourses = useMemo(
    () => new Set(allEnrollments.map((r) => asString(r.course_title)).filter(Boolean)).size,
    [allEnrollments],
  );

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
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        value: statusFilter,
        placeholder: 'All',
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Pending', value: 'pending' },
          { label: 'Completed', value: 'completed' },
          { label: 'Dropped', value: 'dropped' },
        ],
        onChange: setStatusFilter,
      },
      { key: 'from_date', label: 'From Date', type: 'date' as const, value: fromDate, onChange: setFromDate },
      { key: 'to_date', label: 'To Date', type: 'date' as const, value: toDate, onChange: setToDate },
    ],
    [courseOptions, courseFilter, offeringOptions, offeringFilter, combinationOptions, combinationFilter, statusFilter, fromDate, toDate],
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Enrollments', value: allEnrollments.length },
          { label: 'Active', value: activeCount },
          { label: 'Pending', value: pendingCount },
          { label: 'Unique Courses', value: uniqueCourses },
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
          setStatusFilter('');
          setFromDate('');
          setToDate('');
        }}
      />

      <AdminDataTable columns={columns} rows={filteredEnrollments} actions={actions} />
    </div>
  );
}
