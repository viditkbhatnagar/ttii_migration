import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../../admin/shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../../admin/shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../../admin/shared/components/AdminFilterBar.js';
import { AdminStatusBadge } from '../../../admin/shared/components/AdminStatusBadge.js';

export default function CentreStudentsPage({ api, session }: CentrePageProps) {
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, loading, error } = useAdminPageData(
    () => api.loadStudents(session.token),
    [],
  );

  const allStudents = useMemo(() => toRecords(data), [data]);

  const courseOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const s of allStudents) {
      const name = asString(s.course_title) || asString(s.course_name);
      if (name) {
        unique.set(name, name);
      }
    }
    return Array.from(unique.values()).sort().map((c) => ({ label: c, value: c }));
  }, [allStudents]);

  const filteredStudents = useMemo(() => {
    let list = allStudents;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) => {
        const name = asString(r.name) || asString(r.student_name);
        const email = asString(r.user_email) || asString(r.email);
        const phone = asString(r.phone);
        const enrollId = asString(r.enrollment_id) || asString(r.student_id);
        return (
          name.toLowerCase().includes(q) ||
          email.toLowerCase().includes(q) ||
          phone.toLowerCase().includes(q) ||
          enrollId.toLowerCase().includes(q)
        );
      });
    }

    if (courseFilter) {
      list = list.filter((r) => {
        const course = asString(r.course_title) || asString(r.course_name);
        return course === courseFilter;
      });
    }

    if (statusFilter) {
      list = list.filter((r) => asString(r.status) === statusFilter);
    }

    return list;
  }, [allStudents, search, courseFilter, statusFilter]);

  const filters: FilterField[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      value: search,
      placeholder: 'Search by name, email, phone...',
      onChange: setSearch,
    },
    {
      key: 'course',
      label: 'Course',
      type: 'select',
      value: courseFilter,
      placeholder: 'All Courses',
      options: courseOptions,
      onChange: setCourseFilter,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      value: statusFilter,
      placeholder: 'All Statuses',
      options: [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
      ],
      onChange: setStatusFilter,
    },
  ];

  const columns: DataTableColumn[] = [
    { key: 'name', label: 'Student Name', sortable: true, render: (_, row) => asString(row.name) || asString(row.student_name) || '-' },
    { key: 'enrollment_id', label: 'Enrollment ID', sortable: true, render: (_, row) => asString(row.enrollment_id) || asString(row.student_id) || '-' },
    { key: 'phone', label: 'Phone', render: (_, row) => asString(row.phone) || '-' },
    { key: 'email', label: 'Email', render: (_, row) => asString(row.user_email) || asString(row.email) || '-' },
    { key: 'course_title', label: 'Course', sortable: true, render: (_, row) => asString(row.course_title) || asString(row.course_name) || '-' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => {
        const status = asString(val);
        return status ? <AdminStatusBadge status={status} /> : '-';
      },
    },
  ];

  const actions: DataTableAction[] = [
    {
      label: 'View',
      onClick: () => {
        alert('View student details - coming soon');
      },
    },
  ];

  const handleClearFilters = () => {
    setSearch('');
    setCourseFilter('');
    setStatusFilter('');
  };

  if (loading) {
    return <PageLoader label="Loading centre students..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-red-600">
          Failed to load students: {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <AdminPageHeader title="Students" />
      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={handleClearFilters}
      />
      <AdminDataTable
        columns={columns}
        rows={filteredStudents}
        actions={actions}
        exportable
      />
    </div>
  );
}
