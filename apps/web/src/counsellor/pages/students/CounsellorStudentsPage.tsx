import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../../admin/shared/components/AdminDataTable.js';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

// Naji UAT 2026-05-16 — clicking the Name routes into the View Student
// page which carries the "+ Add Enrolment" CTA, so counsellors can
// open an existing student and add a second course themselves.
export default function CounsellorStudentsPage({ api, session, onNavigate }: CounsellorPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadStudents(session.token),
    [api, session.token],
  );
  const rows = useMemo(() => toRecords(data), [data]);

  const columns: DataTableColumn[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        render: (value, row) => {
          const id = asString(row?._id) || asString(row?.id);
          return (
            <button
              type="button"
              className="cursor-pointer text-blue-600 hover:underline"
              onClick={() => onNavigate(`/counsellor/students/view/${id}`)}
            >
              {asString(value) || '—'}
            </button>
          );
        },
      },
      { key: 'enrollment_id', label: 'Enrollment ID', sortable: true },
      { key: 'email', label: 'Email', sortable: true },
      { key: 'phone', label: 'Phone' },
      { key: 'course_name', label: 'Course', sortable: true },
      { key: 'created_at', label: 'Enrolled On', sortable: true, render: (v: unknown) => formatDate(v) },
    ],
    [onNavigate],
  );

  const actions: DataTableAction[] = useMemo(
    () => [
      {
        label: 'View',
        onClick: (row) => {
          const id = asString(row._id) || asString(row.id);
          onNavigate(`/counsellor/students/view/${id}`);
        },
      },
      {
        label: 'Add Enrolment',
        onClick: (row) => {
          const id = asString(row._id) || asString(row.id);
          onNavigate(`/counsellor/students/view/${id}`);
        },
      },
    ],
    [onNavigate],
  );

  return (
    <div className="space-y-4">
      <AdminPageHeader title="My Students" />
      <p className="-mt-2 text-sm text-gray-500">Students you have enrolled or referred. Click a student to open their record and add a second enrolment.</p>
      {error ? (
        <Card className="bg-white"><CardContent className="py-8 text-center"><p role="alert" className="text-sm text-red-600">{error}</p></CardContent></Card>
      ) : loading ? (
        <Card className="bg-white"><CardContent className="py-8 text-center text-sm text-gray-500">Loading students…</CardContent></Card>
      ) : (
        <AdminDataTable columns={columns} rows={rows} actions={actions} searchable exportable />
      )}
    </div>
  );
}
