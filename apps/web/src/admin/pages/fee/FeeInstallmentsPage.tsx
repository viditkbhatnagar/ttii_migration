import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';

export default function FeeInstallmentsPage({ api, session, onNavigate }: AdminPageProps) {
  const [courseFilter, setCourseFilter] = useState('');
  const [centreFilter, setCentreFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [centres, setCentres] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    Promise.all([
      api.loadCourses(session.token),
      api.loadCentres(session.token),
    ]).then(([c, ct]) => { setCourses(c); setCentres(ct); }).catch(() => {});
  }, [api, session.token]);

  const { data, loading, error } = useAdminPageData(
    () => api.loadFeeInstallments(session.token, {
      ...(courseFilter ? { courseId: courseFilter } : {}),
      ...(activeTab !== 'all' ? { status: activeTab } : {}),
      ...(searchText ? { search: searchText } : {}),
      ...(centreFilter ? { centreId: centreFilter } : {}),
    }),
    [courseFilter, activeTab, searchText, centreFilter],
  );

  const counts = useMemo(() => data?.counts ?? { fully_added: 0, partially_added: 0, not_added: 0 }, [data]);
  const allItems = useMemo(() => data?.items ?? [], [data]);

  const totalCount = useMemo(() =>
    asNumber(counts.fully_added) + asNumber(counts.partially_added) + asNumber(counts.not_added),
    [counts],
  );

  const tabs: AdminTab[] = useMemo(() => [
    { id: 'all', label: 'All', count: totalCount },
    { id: 'fully_added', label: 'Fully Added', count: asNumber(counts.fully_added) },
    { id: 'partially_added', label: 'Partially Added', count: asNumber(counts.partially_added) },
    { id: 'not_added', label: 'Not Added', count: asNumber(counts.not_added) },
  ], [totalCount, counts]);

  const filters: FilterField[] = useMemo(() => [
    {
      key: 'search',
      label: 'Search',
      type: 'text' as const,
      value: searchText,
      placeholder: 'Student Name / ID...',
      onChange: setSearchText,
    },
    {
      key: 'course',
      label: 'Course',
      type: 'select' as const,
      value: courseFilter,
      placeholder: 'All Courses',
      options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
      onChange: setCourseFilter,
    },
    {
      key: 'centre',
      label: 'Centre',
      type: 'select' as const,
      value: centreFilter,
      placeholder: 'All Centres',
      options: centres.map((c) => ({ label: asString(c.centre_name), value: asString(c.id) })),
      onChange: setCentreFilter,
    },
  ], [searchText, courseFilter, centreFilter, courses, centres]);

  const STATUS_LABEL: Record<string, string> = {
    fully_added: 'Fully Added',
    partially_added: 'Partially Added',
    not_added: 'Not Added',
  };

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'student_name', label: 'Student', sortable: true },
    { key: 'student_id', label: 'Student ID' },
    { key: 'enrollment_id', label: 'Enrollment ID' },
    { key: 'phone', label: 'Phone' },
    { key: 'course_title', label: 'Course' },
    { key: 'total_fee', label: 'Total Fee', render: (v) => formatCurrency(v) },
    { key: 'installments_added', label: 'Installments Added' },
    {
      key: 'fee_plan_status',
      label: 'Status',
      render: (v) => {
        const raw = asString(v);
        const label = STATUS_LABEL[raw] ?? raw;
        const variant = raw === 'fully_added' ? 'active' : raw === 'partially_added' ? 'pending' : 'inactive';
        return <AdminStatusBadge status={variant} className="capitalize" />;
      },
    },
    {
      key: '_action',
      label: 'Action',
      render: (_v, row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const userId = asString(row?.user_id);
            const courseId = asString(row?.course_id);
            onNavigate(`/admin/fee_management/payment_status?course_id=${courseId}&search=${asString(row?.student_name)}`);
          }}
        >
          View Plan
        </Button>
      ),
    },
  ], [onNavigate]);

  if (loading) {
    return <PageLoader label="Loading fee installments..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Fee Installments" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Total Students</p>
            <p className="text-2xl font-semibold">{totalCount}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-green-500">
          <CardContent className="pt-4">
            <p className="text-xs text-green-600">Fully Added</p>
            <p className="text-2xl font-semibold text-green-700">{asNumber(counts.fully_added)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-orange-500">
          <CardContent className="pt-4">
            <p className="text-xs text-orange-600">Partially Added</p>
            <p className="text-2xl font-semibold text-orange-700">{asNumber(counts.partially_added)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-gray-400">
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500">Not Added</p>
            <p className="text-2xl font-semibold text-gray-700">{asNumber(counts.not_added)}</p>
          </CardContent>
        </Card>
      </div>

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => { setCourseFilter(''); setCentreFilter(''); setSearchText(''); }}
      />

      <AdminDataTable columns={columns} rows={allItems} searchable exportable />
    </div>
  );
}
