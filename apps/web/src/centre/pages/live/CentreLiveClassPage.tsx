import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../../admin/shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../../admin/shared/components/AdminStatusBadge.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, formatDate, responseSuccess } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';

const columns: DataTableColumn[] = [
  { key: 'title', label: 'Title', sortable: true },
  { key: 'cohort_id', label: 'Cohort', sortable: true },
  {
    key: 'date',
    label: 'Date',
    sortable: true,
    render: (value) => formatDate(value),
  },
  {
    key: 'time',
    label: 'Time',
    render: (_value, row) => {
      const from = asString(row.from_time);
      const to = asString(row.to_time);
      if (!from && !to) return '-';
      return `${from} - ${to}`;
    },
  },
  {
    key: 'status',
    label: 'Status',
    render: (value) => <AdminStatusBadge status={asString(value) || 'upcoming'} />,
  },
];

const EMPTY_FORM = {
  cohortId: '',
  title: '',
  zoomId: '',
  password: '',
  date: '',
  fromTime: '',
  toTime: '',
};

export default function CentreLiveClassPage({ api, session }: CentrePageProps) {
  const { data, loading, error, reload } = useAdminPageData<Record<string, unknown>[]>(
    () => api.loadLiveClasses(session.token),
    [session.token],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const actions: DataTableAction[] = [
    {
      label: 'View',
      onClick: () => alert('View live class coming soon'),
    },
  ];

  const handleSubmit = async () => {
    if (!form.cohortId.trim() || !form.title.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.addLiveClass(session.token, {
        cohortId: form.cohortId,
        zoomId: form.zoomId,
        password: form.password,
        entries: [
          {
            sessionId: '',
            title: form.title,
            date: form.date,
            fromTime: form.fromTime,
            toTime: form.toTime,
          },
        ],
      });
      if (responseSuccess(res)) {
        setForm(EMPTY_FORM);
        setDialogOpen(false);
        reload();
      } else {
        alert(asString(res.message) || 'Failed to add session');
      }
    } catch {
      alert('Failed to add session');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AdminPageHeader title="Live Classes" addLabel="+ Add Session" onAdd={() => setDialogOpen(true)} />

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Live Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="live-cohort">Cohort ID</Label>
              <Input
                id="live-cohort"
                value={form.cohortId}
                onChange={(e) => setForm({ ...form, cohortId: e.target.value })}
                placeholder="Enter cohort ID"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="live-title">Session Title</Label>
              <Input
                id="live-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Enter session title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="live-zoom">Zoom ID</Label>
              <Input
                id="live-zoom"
                value={form.zoomId}
                onChange={(e) => setForm({ ...form, zoomId: e.target.value })}
                placeholder="Enter Zoom meeting ID"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="live-password">Password</Label>
              <Input
                id="live-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Enter meeting password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="live-date">Date</Label>
              <Input
                id="live-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="live-from">From Time</Label>
                <Input
                  id="live-from"
                  type="time"
                  value={form.fromTime}
                  onChange={(e) => setForm({ ...form, fromTime: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="live-to">To Time</Label>
                <Input
                  id="live-to"
                  type="time"
                  value={form.toTime}
                  onChange={(e) => setForm({ ...form, toTime: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="bg-ttii-primary hover:bg-ttii-primary/90"
                disabled={submitting || !form.cohortId.trim() || !form.title.trim()}
                onClick={handleSubmit}
              >
                {submitting ? 'Adding...' : 'Add Session'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AdminDataTable
        columns={columns}
        rows={rows}
        actions={actions}
      />
    </div>
  );
}
