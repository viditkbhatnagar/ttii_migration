import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatCurrency } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';

export default function FeeInstallmentsPage({ api, session, onNavigate }: AdminPageProps) {
  const [studentFilter, setStudentFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    Promise.all([
      api.loadCourses(session.token),
      api.loadStudents(session.token, {}),
    ]).then(([c, s]) => { setCourses(c); setStudents(s); }).catch(() => {});
  }, [api, session.token]);

  const { data, loading, error } = useAdminPageData(
    () => api.loadFeeInstallments(session.token, {
      ...(courseFilter ? { courseId: courseFilter } : {}),
      ...(activeTab !== 'all' ? { status: activeTab } : {}),
      ...(studentFilter ? { studentId: studentFilter } : {}),
      ...(paymentStatusFilter ? { paymentStatus: paymentStatusFilter } : {}),
    }),
    [courseFilter, activeTab, studentFilter, paymentStatusFilter],
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
      key: 'student',
      label: 'Student',
      type: 'select' as const,
      value: studentFilter,
      placeholder: 'Select any student',
      options: students.map((s) => ({
        label: asString(s.name) || asString(s.student_name) || 'Unknown',
        value: asString(s._id) || asString(s.id),
      })),
      onChange: setStudentFilter,
    },
    {
      key: 'course',
      label: 'Course',
      type: 'select' as const,
      value: courseFilter,
      placeholder: 'Select any course',
      options: courses.map((c) => ({ label: asString(c.title), value: asString(c.id) })),
      onChange: setCourseFilter,
    },
    {
      key: 'paymentStatus',
      label: 'Payment Status',
      type: 'select' as const,
      value: paymentStatusFilter,
      placeholder: 'Select Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
      ],
      onChange: setPaymentStatusFilter,
    },
  ], [studentFilter, courseFilter, paymentStatusFilter, courses, students]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'student_id', label: 'Student ID', sortable: true, render: (v) => asString(v) || '-' },
    { key: 'student_name', label: 'Name', sortable: true, render: (v) => asString(v) || '-' },
    { key: 'installment_details', label: 'Installment Details', sortable: true, render: (v) => asString(v) || '-' },
    {
      key: 'course_title',
      label: 'Enrolled Course(s)',
      sortable: true,
      render: (v) => {
        const text = asString(v);
        if (!text) return '-';
        // Display as bullet list if multiple
        const items = text.split(',').map((s) => s.trim()).filter(Boolean);
        if (items.length <= 1) return text;
        return (
          <ul className="list-disc list-inside text-xs">
            {items.map((it, i) => <li key={i}>{it}</li>)}
          </ul>
        );
      },
    },
    { key: 'total_fee', label: 'Total Courses Fee', sortable: true, render: (v) => formatCurrency(v) },
    {
      key: '_action',
      label: 'Action',
      render: (_v, row) => (
        <Button
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => {
            const studentCourseId = asString(row?.student_course_id) || asString(row?.id);
            onNavigate(`/admin/fee_management/manage_installmets/${studentCourseId}`);
          }}
        >
          View Installments
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

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={() => { setCourseFilter(''); setStudentFilter(''); setPaymentStatusFilter(''); }}
      />

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminDataTable columns={columns} rows={allItems} searchable exportable />
    </div>
  );
}
