import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../../admin/shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../../admin/shared/components/AdminFilterBar.js';
import { AdminTabBar, type AdminTab } from '../../../admin/shared/components/AdminTabBar.js';
import { AdminStatusBadge } from '../../../admin/shared/components/AdminStatusBadge.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseOnBlur } from '@/lib/text-format';
import { asString, formatDate, responseSuccess } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { CentrePortalApi, type CentreApplicationsSnapshot } from '../../centre-portal-api.js';

interface ApplicationsData {
  snapshot: CentreApplicationsSnapshot;
  courses: Record<string, unknown>[];
  pipelineUsers: Record<string, unknown>[];
}

export default function CentreApplicationsPage({ api, session }: CentrePageProps) {
  const { data, loading, error, reload } = useAdminPageData<ApplicationsData>(
    async () => {
      const [snapshot, courses, pipelineUsers] = await Promise.all([
        api.loadApplications(session.token),
        api.loadCourses(session.token),
        api.loadPipelineUsers(session.token, 9),
      ]);
      return { snapshot, courses, pipelineUsers };
    },
    [session.token],
  );

  // Tab state
  const [activeTab, setActiveTab] = useState('all');

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('');
  const [appliedCourse, setAppliedCourse] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCountryCode, setFormCountryCode] = useState('+91');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCourseId, setFormCourseId] = useState('');
  const [formStatus, setFormStatus] = useState('pending');
  const [submitting, setSubmitting] = useState(false);

  // Derived data
  const items = useMemo(() => data?.snapshot.items ?? [], [data]);
  const courses = data?.courses ?? [];
  const pendingCount = data?.snapshot.pendingCount ?? 0;
  const rejectedCount = data?.snapshot.rejectedCount ?? 0;

  const tabs: AdminTab[] = [
    { id: 'all', label: 'All', count: items.length },
    { id: 'pending', label: 'Pending', count: pendingCount },
    { id: 'rejected', label: 'Rejected', count: rejectedCount },
  ];

  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by active tab
    if (activeTab === 'pending') {
      result = result.filter(
        (r) => asString(r.status).toLowerCase() === 'pending',
      );
    } else if (activeTab === 'rejected') {
      result = result.filter(
        (r) => asString(r.status).toLowerCase() === 'rejected',
      );
    }

    // Filter by applied search
    if (appliedSearch.trim()) {
      const q = appliedSearch.toLowerCase();
      result = result.filter(
        (r) =>
          asString(r.name).toLowerCase().includes(q) ||
          asString(r.phone).toLowerCase().includes(q) ||
          asString(r.email).toLowerCase().includes(q),
      );
    }

    // Filter by applied status
    if (appliedStatus) {
      result = result.filter(
        (r) => asString(r.status).toLowerCase() === appliedStatus.toLowerCase(),
      );
    }

    // Filter by applied course
    if (appliedCourse) {
      result = result.filter(
        (r) => asString(r.course_id) === appliedCourse,
      );
    }

    return result;
  }, [items, activeTab, appliedSearch, appliedStatus, appliedCourse]);

  const filters: FilterField[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      value: searchText,
      placeholder: 'Name, phone or email...',
      onChange: setSearchText,
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      value: filterStatus,
      placeholder: 'All Statuses',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
      onChange: setFilterStatus,
    },
    {
      key: 'course',
      label: 'Course',
      type: 'select',
      value: filterCourse,
      placeholder: 'All Courses',
      options: courses.map((c) => ({
        label: asString(c.title) || asString(c.name) || asString(c.course_name),
        value: CentrePortalApi.getCourseId(c),
      })),
      onChange: setFilterCourse,
    },
  ];

  const columns: DataTableColumn[] = [
    {
      key: 'name',
      label: 'Applicant Name',
      sortable: true,
      render: (_value, row) => (
        <span className="cursor-pointer font-medium text-ttii-primary hover:underline">
          {asString(row.name) || asString(row.student_name)}
        </span>
      ),
    },
    { key: 'phone', label: 'Phone', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    {
      key: 'course_name',
      label: 'Course',
      sortable: true,
      render: (value) => asString(value),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => <AdminStatusBadge status={asString(value) || 'pending'} />,
    },
    {
      key: 'created_at',
      label: 'Applied Date',
      sortable: true,
      render: (value) => formatDate(value),
    },
  ];

  const actions: DataTableAction[] = [
    {
      label: 'View',
      onClick: (row) => {
        toast.info(`View application: ${asString(row.name) || asString(row.student_name)}`);
      },
    },
    {
      label: 'Convert',
      onClick: (row) => {
        const id = CentrePortalApi.getId(row);
        if (!id) return;
        void (async () => {
          try {
            const res = await api.convertApplication(session.token, id);
            if (responseSuccess(res)) {
              reload();
            } else {
              toast.error(asString(res.message) || 'Conversion failed.');
            }
          } catch {
            toast.error('Failed to convert application.');
          }
        })();
      },
    },
    {
      label: 'Delete',
      variant: 'destructive',
      onClick: (row) => {
        const name = asString(row.name) || asString(row.student_name);
        if (window.confirm(`Are you sure you want to delete application for "${name}"?`)) {
          toast.info('Delete API is not available yet.');
        }
      },
    },
  ];

  const handleApplyFilters = () => {
    setAppliedSearch(searchText);
    setAppliedStatus(filterStatus);
    setAppliedCourse(filterCourse);
  };

  const handleClearFilters = () => {
    setSearchText('');
    setFilterStatus('');
    setFilterCourse('');
    setAppliedSearch('');
    setAppliedStatus('');
    setAppliedCourse('');
  };

  const resetForm = () => {
    setFormName('');
    setFormCountryCode('+91');
    setFormPhone('');
    setFormEmail('');
    setFormCourseId('');
    setFormStatus('pending');
  };

  const handleSubmit = async () => {
    if (!formName.trim() || !formPhone.trim() || !formCourseId) return;
    setSubmitting(true);
    try {
      const res = await api.addApplication(session.token, {
        name: formName.trim(),
        countryCode: formCountryCode.trim(),
        phone: formPhone.trim(),
        email: formEmail.trim(),
        courseId: formCourseId,
        status: formStatus,
      });
      if (responseSuccess(res)) {
        setDialogOpen(false);
        resetForm();
        reload();
      } else {
        toast.error(asString(res.message) || 'Failed to add application.');
      }
    } catch {
      toast.error('Failed to add application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <PageLoader label="Loading centre applications..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-10 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AdminPageHeader title="Applications">
          <DialogTrigger asChild>
            <Button className="gap-1.5 bg-ttii-primary hover:bg-ttii-primary/90">
              + Add Application
            </Button>
          </DialogTrigger>
        </AdminPageHeader>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="mb-1 text-xs text-gray-500">Name *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} onBlur={titleCaseOnBlur(setFormName)} placeholder="Applicant name" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="mb-1 text-xs text-gray-500">Code</Label>
                <Input value={formCountryCode} onChange={(e) => setFormCountryCode(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="mb-1 text-xs text-gray-500">Phone *</Label>
                <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="Phone number" />
              </div>
            </div>
            <div>
              <Label className="mb-1 text-xs text-gray-500">Email</Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Email address" />
            </div>
            <div>
              <Label className="mb-1 text-xs text-gray-500">Course *</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                value={formCourseId}
                onChange={(e) => setFormCourseId(e.target.value)}
              >
                <option value="">Select course...</option>
                {courses.map((c) => (
                  <option key={CentrePortalApi.getCourseId(c)} value={CentrePortalApi.getCourseId(c)}>
                    {asString(c.title) || asString(c.name) || asString(c.course_name)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 text-xs text-gray-500">Status</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                Cancel
              </Button>
              <Button
                className="bg-ttii-primary hover:bg-ttii-primary/90"
                onClick={() => { void handleSubmit(); }}
                disabled={submitting || !formName.trim() || !formPhone.trim() || !formCourseId}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AdminTabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <AdminFilterBar filters={filters} onApply={handleApplyFilters} onClear={handleClearFilters} />

      <AdminDataTable columns={columns} rows={filteredItems} actions={actions} />
    </div>
  );
}
