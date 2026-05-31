import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { placeCall } from '../../shared/ainvox-dialer.js';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseOnBlur } from '@/lib/text-format';

export default function StudentsPage({ api, session, onNavigate }: AdminPageProps) {
  /* ── Filter state ────────────────────────────────────────────────────────── */
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  /* ── Dialog state (Edit only) ───────────────────────────────────────────── */
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Record<string, unknown> | null>(null);
  const [dialogName, setDialogName] = useState('');
  const [dialogPhone, setDialogPhone] = useState('');
  const [dialogSubmitting, setDialogSubmitting] = useState(false);

  /* ── Dropdown options ────────────────────────────────────────────────────── */
  const [courseOptions, setCourseOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    void api.loadCourses(session.token).then((courses) => {
      setCourseOptions(
        courses.map((c) => ({ label: asString(c.title) || asString(c.course_title) || asString(c.name) || 'Untitled', value: asString(c._id) || asString(c.id) })),
      );
    });
  }, [api, session.token]);

  /* ── Data loading ───────────────────────────────────────────────────────── */
  const { data, loading, error, reload } = useAdminPageData(
    () =>
      api.loadStudents(session.token, {
        ...(courseFilter ? { courseId: courseFilter } : {}),
      }),
    [courseFilter],
  );

  const allStudents = useMemo(() => toRecords(data), [data]);

  // Naji UAT 2026-05-13 — Inactive status is driven by the universal
  // disabled_at toggle, not the legacy users.status field. Graduated /
  // Dropped tabs were removed from the Students page (they belong on
  // Enrolments).
  const isInactive = (row: Record<string, unknown>): boolean => Boolean(row.disabled_at);

  /* ── Client-side tab + status filtering ──────────────────────────────────── */
  const filteredStudents = useMemo(() => {
    let list = allStudents;

    if (statusFilter === 'Active') list = list.filter((r) => !isInactive(r));
    else if (statusFilter === 'Inactive') list = list.filter(isInactive);

    if (activeTab === 'Active') list = list.filter((r) => !isInactive(r));
    else if (activeTab === 'Inactive') list = list.filter(isInactive);

    return list;
  }, [allStudents, statusFilter, activeTab]);

  /* ── Tabs ────────────────────────────────────────────────────────────────── */
  const tabs: AdminTab[] = useMemo(
    () => [
      { id: 'all', label: 'All', count: allStudents.length },
      { id: 'Active', label: 'Active', count: allStudents.filter((r) => !isInactive(r)).length },
      { id: 'Inactive', label: 'Inactive', count: allStudents.filter(isInactive).length },
    ],
    [allStudents],
  );

  /* ── Filters (Course + Status only) ─────────────────────────────────────── */
  const filters: FilterField[] = useMemo(
    () => [
      {
        key: 'course',
        label: 'Course',
        type: 'select' as const,
        value: courseFilter,
        placeholder: 'All Courses',
        options: courseOptions,
        onChange: setCourseFilter,
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select' as const,
        value: statusFilter,
        placeholder: 'All Statuses',
        options: [
          { label: 'Active', value: 'Active' },
          { label: 'Inactive', value: 'Inactive' },
        ],
        onChange: setStatusFilter,
      },
    ],
    [courseFilter, statusFilter, courseOptions],
  );

  const handleClearFilters = () => {
    setCourseFilter('');
    setStatusFilter('');
  };

  /* ── Dialog helpers (Edit only) ─────────────────────────────────────────── */
  const openEditDialog = useCallback((student: Record<string, unknown>) => {
    setSelectedStudent(student);
    setDialogName(asString(student.name) || asString(student.student_name) || '');
    setDialogPhone(asString(student.phone) || '');
    setDialogSubmitting(false);
    setEditDialogOpen(true);
  }, []);

  const closeDialog = () => {
    setEditDialogOpen(false);
    setSelectedStudent(null);
  };

  const handleEditSubmit = async () => {
    if (!selectedStudent) return;
    const studentId = asString(selectedStudent._id) || asString(selectedStudent.id);
    if (!studentId) return;

    setDialogSubmitting(true);
    try {
      await api.editStudentInfo(session.token, studentId, dialogName, dialogPhone);
      closeDialog();
      reload();
    } catch {
      toast.error('Operation failed. Please try again.');
    } finally {
      setDialogSubmitting(false);
    }
  };

  /* ── Table columns ───────────────────────────────────────────────────────── */
  const columns: DataTableColumn[] = useMemo(
    () => [
      {
        key: 'student_id',
        label: 'Student ID',
        sortable: true,
        render: (value: unknown, row: Record<string, unknown>) => asString(value) || asString(row.unique_student_id) || '-',
      },
      {
        key: 'image',
        label: 'Profile',
        render: (value: unknown) => {
          const src = asString(value);
          return src ? (
            <img loading="lazy" decoding="async" src={src} alt="" className="size-8 rounded-full object-cover" />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500">—</div>
          );
        },
      },
      {
        key: 'name',
        label: 'Name',
        sortable: true,
        render: (_value: unknown, row: Record<string, unknown>) => {
          const name = asString(row.name) || asString(row.student_name) || 'N/A';
          const id = asString(row._id) || asString(row.id);
          return (
            <span
              className="cursor-pointer text-blue-600 hover:underline"
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onNavigate(`/admin/students/view/${id}`); }}
              onKeyDown={(e) => { if (e.key === 'Enter') onNavigate(`/admin/students/view/${id}`); }}
            >
              {name}
            </span>
          );
        },
      },
      { key: 'phone', label: 'Phone', sortable: true, render: (value: unknown) => asString(value) || 'N/A' },
      {
        key: 'user_email',
        label: 'E-mail',
        sortable: true,
        // Naji 2026-05-12 — legacy `users.email` column was repurposed to
        // store phone-with-country-code in the old PHP LMS. Actual email
        // lives in `user_email`. Render that with `email` as a last-resort
        // fallback only if it looks like an email (contains @).
        render: (_value, row) => {
          const userEmail = asString(row.user_email);
          if (userEmail) return userEmail;
          const legacyEmail = asString(row.email);
          return legacyEmail.includes('@') ? legacyEmail : 'N/A';
        },
      },
      { key: 'course_title', label: 'Courses', sortable: true, render: (value: unknown) => asString(value) || 'N/A' },
      {
        key: 'enrollment_count',
        label: 'Enrollments',
        sortable: true,
        render: (value: unknown, row: Record<string, unknown>) => {
          const count = Number(value) || Number(row.enrolment_count) || 1;
          return <span>{count}</span>;
        },
      },
      {
        key: 'status_label',
        label: 'Status',
        sortable: true,
        render: (value: unknown, row: Record<string, unknown>) => {
          // disabled_at takes precedence over status_label so a disabled
          // student always reads as Inactive in the badge + the Inactive
          // tab. Naji UAT 2026-05-13.
          if (row.disabled_at) return <AdminStatusBadge status="Inactive" />;
          const status = asString(value) || 'Active';
          return <AdminStatusBadge status={status} />;
        },
      },
    ],
    [onNavigate],
  );

  const confirm = useConfirm();
  const handleToggleStatus = useCallback(
    async (row: Record<string, unknown>) => {
      const id = asString(row._id) || asString(row.id);
      if (!id) return;
      const isDisabled = !!row.disabled_at;
      const name = asString(row.name) || 'this student';
      if (!isDisabled && !(await confirm({
        title: `Disable ${name}?`,
        description: 'They will be blocked from logging in until you re-enable them.',
        confirmText: 'Disable',
        variant: 'destructive',
      }))) return;
      try {
        await api.toggleUserStatus(session.token, id, isDisabled);
        toast.success(isDisabled ? 'Student enabled.' : 'Student disabled.');
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Toggle failed');
      }
    },
    [api, session.token, confirm, reload],
  );

  /* ── Actions (View + Edit + Enable/Disable) ─────────────────────────────── */
  const actions: DataTableAction[] = useMemo(
    () => [
      {
        label: 'View',
        onClick: (row) => {
          const id = asString(row._id) || asString(row.id);
          onNavigate(`/admin/students/view/${id}`);
        },
      },
      {
        label: 'Edit',
        onClick: (row) => openEditDialog(row),
      },
      {
        label: 'Call',
        onClick: (row) => {
          void placeCall(asString(row.phone)).catch((err: unknown) =>
            toast.error(err instanceof Error ? err.message : 'Could not start the call'),
          );
        },
      },
      {
        label: (row) => (row.disabled_at ? 'Enable' : 'Disable'),
        onClick: (row) => { void handleToggleStatus(row); },
      },
    ],
    [onNavigate, openEditDialog, handleToggleStatus],
  );

  /* ── Export handler ──────────────────────────────────────────────────────── */
  const handleExport = () => {
    const headers = ['Student Name', 'Phone', 'Email', 'Course', 'Status'];
    const csvRows = filteredStudents.map((row) => [
      asString(row.name) || asString(row.student_name) || '',
      asString(row.phone) || '',
      asString(row.email) || '',
      asString(row.course_title) || '',
      asString(row.status_label) || '',
    ]);
    const csv = [headers, ...csvRows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'students_export.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  /* ── Loading state ───────────────────────────────────────────────────────── */
  if (loading) {
    return <PageLoader label="Loading students..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div>
      <AdminPageHeader title="Students" addLabel="Add Students" onAdd={() => onNavigate('/admin/students/add')}>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
          <Download className="size-4" aria-hidden="true" />
          Export
        </Button>
      </AdminPageHeader>

      <AdminFilterBar
        filters={filters}
        onApply={() => {}}
        onClear={handleClearFilters}
      />

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminDataTable
        columns={columns}
        rows={filteredStudents}
        actions={actions}
      />

      {/* ── Edit Student Dialog ──────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleEditSubmit();
            }}
          >
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="mb-1 text-sm">Name</Label>
                <Input
                  value={dialogName}
                  onChange={(e) => setDialogName(e.target.value)}
                  onBlur={titleCaseOnBlur(setDialogName)}
                  placeholder="Student name"
                />
              </div>
              <div>
                <Label className="mb-1 text-sm">Phone</Label>
                <Input
                  value={dialogPhone}
                  onChange={(e) => setDialogPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button
                type="submit"
                className="bg-ttii-primary hover:bg-ttii-primary/90"
                disabled={dialogSubmitting}
              >
                {dialogSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
