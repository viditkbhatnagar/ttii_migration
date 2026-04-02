import { useState, useMemo, useEffect, useCallback } from 'react';
import { Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

type DialogType = 'edit' | 'username' | 'password' | 'enrollmentId' | null;

export default function StudentsPage({ api, session, onNavigate }: AdminPageProps) {
  /* ── Filter state ────────────────────────────────────────────────────────── */
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [centreFilter, setCentreFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  /* ── Dialog state ────────────────────────────────────────────────────────── */
  const [dialogType, setDialogType] = useState<DialogType>(null);
  const [selectedStudent, setSelectedStudent] = useState<Record<string, unknown> | null>(null);
  const [dialogName, setDialogName] = useState('');
  const [dialogPhone, setDialogPhone] = useState('');
  const [dialogUsername, setDialogUsername] = useState('');
  const [dialogPassword, setDialogPassword] = useState('');
  const [dialogConfirmPassword, setDialogConfirmPassword] = useState('');
  const [dialogEnrollmentId, setDialogEnrollmentId] = useState('');
  const [dialogSubmitting, setDialogSubmitting] = useState(false);

  /* ── Dropdown options ────────────────────────────────────────────────────── */
  const [courseOptions, setCourseOptions] = useState<{ label: string; value: string }[]>([]);
  const [centreOptions, setCentreOptions] = useState<{ label: string; value: string }[]>([]);
  const [batchOptions, setBatchOptions] = useState<{ label: string; value: string }[]>([]);

  useEffect(() => {
    const token = session.token;
    Promise.all([
      api.loadCourses(token),
      api.loadCentres(token),
      api.loadBatches(token),
    ]).then(([courses, centres, batches]) => {
      setCourseOptions(
        courses.map((c) => ({ label: asString(c.title) || asString(c.course_title) || asString(c.name) || 'Untitled', value: asString(c._id) || asString(c.id) })),
      );
      setCentreOptions(
        centres.map((c) => ({ label: asString(c.centre_name) || asString(c.name) || 'Untitled', value: asString(c._id) || asString(c.id) })),
      );
      setBatchOptions(
        batches.map((b) => ({ label: asString(b.title) || asString(b.batch_name) || asString(b.name) || 'Untitled', value: asString(b._id) || asString(b.id) })),
      );
    });
  }, [api, session.token]);

  /* ── Data loading (server-side filtering for course/centre/batch/search) ─ */
  const { data, loading, error, reload } = useAdminPageData(
    () =>
      api.loadStudents(session.token, {
        ...(courseFilter ? { courseId: courseFilter } : {}),
        ...(centreFilter ? { centreId: centreFilter } : {}),
        ...(batchFilter ? { batchId: batchFilter } : {}),
        ...(search ? { search } : {}),
      }),
    [courseFilter, centreFilter, batchFilter, search],
  );

  const allStudents = useMemo(() => toRecords(data), [data]);

  /* ── Client-side tab + status filtering ──────────────────────────────────── */
  const filteredStudents = useMemo(() => {
    let list = allStudents;

    // Status dropdown filter
    if (statusFilter) {
      list = list.filter((r) => asString(r.status_label) === statusFilter);
    }

    // Tab filter (overrides status dropdown when a specific tab is selected)
    if (activeTab !== 'all') {
      list = list.filter((r) => asString(r.status_label) === activeTab);
    }

    return list;
  }, [allStudents, statusFilter, activeTab]);

  /* ── Tabs ────────────────────────────────────────────────────────────────── */
  const tabs: AdminTab[] = useMemo(
    () => [
      { id: 'all', label: 'All', count: allStudents.length },
      { id: 'Active', label: 'Active', count: allStudents.filter((r) => asString(r.status_label) === 'Active').length },
      { id: 'Inactive', label: 'Inactive', count: allStudents.filter((r) => asString(r.status_label) === 'Inactive').length },
      { id: 'Graduated', label: 'Graduated', count: allStudents.filter((r) => asString(r.status_label) === 'Graduated').length },
      { id: 'Dropped', label: 'Dropped', count: allStudents.filter((r) => asString(r.status_label) === 'Dropped').length },
    ],
    [allStudents],
  );

  /* ── Filters ─────────────────────────────────────────────────────────────── */
  const filters: FilterField[] = useMemo(
    () => [
      {
        key: 'search',
        label: 'Search',
        type: 'text' as const,
        value: search,
        placeholder: 'Name / Email / Phone / Enrollment ID',
        onChange: setSearch,
      },
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
        key: 'centre',
        label: 'Centre',
        type: 'select' as const,
        value: centreFilter,
        placeholder: 'All Centres',
        options: centreOptions,
        onChange: setCentreFilter,
      },
      {
        key: 'batch',
        label: 'Batch',
        type: 'select' as const,
        value: batchFilter,
        placeholder: 'All Batches',
        options: batchOptions,
        onChange: setBatchFilter,
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
          { label: 'Graduated', value: 'Graduated' },
          { label: 'Dropped', value: 'Dropped' },
        ],
        onChange: setStatusFilter,
      },
    ],
    [search, courseFilter, centreFilter, batchFilter, statusFilter, courseOptions, centreOptions, batchOptions],
  );

  const handleClearFilters = () => {
    setSearch('');
    setCourseFilter('');
    setCentreFilter('');
    setBatchFilter('');
    setStatusFilter('');
  };

  /* ── Dialog helpers ──────────────────────────────────────────────────────── */
  const openDialog = useCallback((type: DialogType, student: Record<string, unknown>) => {
    setSelectedStudent(student);
    setDialogType(type);
    setDialogSubmitting(false);

    // Reset all fields and pre-fill where appropriate
    setDialogName(asString(student.name) || asString(student.student_name) || '');
    setDialogPhone(asString(student.phone) || '');
    setDialogUsername(asString(student.username) || asString(student.email) || '');
    setDialogPassword('');
    setDialogConfirmPassword('');
    setDialogEnrollmentId(asString(student.enrollment_id) || '');
  }, []);

  const closeDialog = () => {
    setDialogType(null);
    setSelectedStudent(null);
  };

  const handleDialogSubmit = async () => {
    if (!selectedStudent) return;
    const studentId = asString(selectedStudent._id) || asString(selectedStudent.id);
    if (!studentId) return;

    setDialogSubmitting(true);
    try {
      if (dialogType === 'edit') {
        await api.editStudentInfo(session.token, studentId, dialogName, dialogPhone);
      } else if (dialogType === 'username') {
        await api.changeStudentUsername(session.token, studentId, dialogUsername);
      } else if (dialogType === 'password') {
        if (dialogPassword !== dialogConfirmPassword) {
          alert('Passwords do not match');
          setDialogSubmitting(false);
          return;
        }
        if (!dialogPassword) {
          alert('Password is required');
          setDialogSubmitting(false);
          return;
        }
        await api.changeStudentPassword(session.token, studentId, dialogPassword);
      } else if (dialogType === 'enrollmentId') {
        await api.editStudentEnrollmentId(session.token, studentId, dialogEnrollmentId);
      }
      closeDialog();
      reload();
    } catch {
      alert('Operation failed. Please try again.');
    } finally {
      setDialogSubmitting(false);
    }
  };

  /* ── Table columns ───────────────────────────────────────────────────────── */
  const columns: DataTableColumn[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Student Name',
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
      { key: 'enrollment_id', label: 'Enrollment ID', render: (value: unknown) => asString(value) || 'N/A' },
      { key: 'phone', label: 'Phone', render: (value: unknown) => asString(value) || 'N/A' },
      { key: 'email', label: 'Email', render: (value: unknown) => asString(value) || 'N/A' },
      { key: 'course_title', label: 'Course', render: (value: unknown) => asString(value) || 'N/A' },
      { key: 'centre_name', label: 'Centre', render: (value: unknown) => asString(value) || 'N/A' },
      { key: 'batch_name', label: 'Batch', render: (value: unknown) => asString(value) || 'N/A' },
      {
        key: 'status_label',
        label: 'Status',
        render: (value: unknown) => {
          const status = asString(value) || 'Inactive';
          return <AdminStatusBadge status={status} />;
        },
      },
    ],
    [onNavigate],
  );

  /* ── Actions (three-dot menu) ────────────────────────────────────────────── */
  const actions = useMemo(
    () => [
      {
        label: 'View',
        onClick: (row: Record<string, unknown>) => {
          const id = asString(row._id) || asString(row.id);
          onNavigate(`/admin/students/view/${id}`);
        },
      },
      {
        label: 'Edit',
        onClick: (row: Record<string, unknown>) => openDialog('edit', row),
      },
      {
        label: 'Change Username',
        onClick: (row: Record<string, unknown>) => openDialog('username', row),
      },
      {
        label: 'Change Password',
        onClick: (row: Record<string, unknown>) => openDialog('password', row),
      },
      {
        label: 'Edit Enrollment ID',
        onClick: (row: Record<string, unknown>) => openDialog('enrollmentId', row),
      },
    ],
    [onNavigate, openDialog],
  );

  /* ── Export handler ──────────────────────────────────────────────────────── */
  const handleExport = () => {
    const headers = ['Student Name', 'Enrollment ID', 'Phone', 'Email', 'Course', 'Centre', 'Batch', 'Status'];
    const csvRows = filteredStudents.map((row) => [
      asString(row.name) || asString(row.student_name) || '',
      asString(row.enrollment_id) || '',
      asString(row.phone) || '',
      asString(row.email) || '',
      asString(row.course_title) || '',
      asString(row.centre_name) || '',
      asString(row.batch_name) || '',
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
        <CardContent className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <div>
      <AdminPageHeader title="Students">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
          <Download className="size-4" />
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
      <Dialog open={dialogType === 'edit'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1 text-sm">Name</Label>
              <Input
                value={dialogName}
                onChange={(e) => setDialogName(e.target.value)}
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
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              onClick={handleDialogSubmit}
              disabled={dialogSubmitting}
            >
              {dialogSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Username Dialog ───────────────────────────────────────── */}
      <Dialog open={dialogType === 'username'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Username</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1 text-sm text-gray-500">Current Username</Label>
              <p className="text-sm font-medium">{asString(selectedStudent?.username) || asString(selectedStudent?.email) || 'N/A'}</p>
            </div>
            <div>
              <Label className="mb-1 text-sm">New Username</Label>
              <Input
                value={dialogUsername}
                onChange={(e) => setDialogUsername(e.target.value)}
                placeholder="Enter new username"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              onClick={handleDialogSubmit}
              disabled={dialogSubmitting}
            >
              {dialogSubmitting ? 'Saving...' : 'Update Username'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Password Dialog ───────────────────────────────────────── */}
      <Dialog open={dialogType === 'password'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1 text-sm">New Password</Label>
              <Input
                type="password"
                value={dialogPassword}
                onChange={(e) => setDialogPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label className="mb-1 text-sm">Confirm Password</Label>
              <Input
                type="password"
                value={dialogConfirmPassword}
                onChange={(e) => setDialogConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              onClick={handleDialogSubmit}
              disabled={dialogSubmitting}
            >
              {dialogSubmitting ? 'Saving...' : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Enrollment ID Dialog ────────────────────────────────────── */}
      <Dialog open={dialogType === 'enrollmentId'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Enrollment ID</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1 text-sm text-gray-500">Current Enrollment ID</Label>
              <p className="text-sm font-medium">{asString(selectedStudent?.enrollment_id) || 'N/A'}</p>
            </div>
            <div>
              <Label className="mb-1 text-sm">New Enrollment ID</Label>
              <Input
                value={dialogEnrollmentId}
                onChange={(e) => setDialogEnrollmentId(e.target.value)}
                placeholder="Enter new enrollment ID"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              onClick={handleDialogSubmit}
              disabled={dialogSubmitting}
            >
              {dialogSubmitting ? 'Saving...' : 'Update Enrollment ID'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
