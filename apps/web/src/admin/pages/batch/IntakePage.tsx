import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { toRecords, asString, asNumber } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useConfirm } from '@/components/confirm-dialog';

interface BatchForm {
  title: string;
  description: string;
  status: string;
}

const emptyForm: BatchForm = { title: '', description: '', status: 'active' };

export default function IntakePage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadBatches(session.token),
    [session.token],
  );

  const [dialogType, setDialogType] = useState<'add' | 'edit' | 'students' | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<Record<string, unknown> | null>(null);
  const [batchForm, setBatchForm] = useState<BatchForm>(emptyForm);
  const [batchStudents, setBatchStudents] = useState<Record<string, unknown>[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAdd = useCallback(() => {
    setBatchForm(emptyForm);
    setSelectedBatch(null);
    setDialogType('add');
  }, []);

  const handleEdit = useCallback((row: Record<string, unknown>) => {
    setSelectedBatch(row);
    setBatchForm({
      title: asString(row.title),
      description: asString(row.description),
      status: asString(row.status) || 'active',
    });
    setDialogType('edit');
  }, []);

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      const title = asString(row.title) || 'this batch';
      if (!(await confirm({
        title: `Delete "${title}"?`,
        description: 'This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'destructive',
      }))) return;
      try {
        await api.deleteBatch(session.token, asString(row.id));
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete batch');
      }
    },
    [api, session.token, reload, confirm],
  );

  const handleViewStudents = useCallback(
    async (row: Record<string, unknown>) => {
      setSelectedBatch(row);
      setBatchStudents([]);
      setLoadingStudents(true);
      setDialogType('students');
      try {
        const result = await api.loadBatchStudents(session.token, asString(row.id));
        setBatchStudents(toRecords(result));
      } catch {
        setBatchStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    },
    [api, session.token],
  );

  const handleSave = useCallback(async () => {
    if (!batchForm.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      if (dialogType === 'add') {
        await api.addBatch(session.token, {
          title: batchForm.title.trim(),
          ...(batchForm.description.trim() ? { description: batchForm.description.trim() } : {}),
          ...(batchForm.status ? { status: batchForm.status } : {}),
        });
      } else if (dialogType === 'edit' && selectedBatch) {
        await api.editBatch(session.token, {
          id: asString(selectedBatch.id),
          title: batchForm.title.trim(),
          ...(batchForm.description.trim() ? { description: batchForm.description.trim() } : {}),
          ...(batchForm.status ? { status: batchForm.status } : {}),
        });
      }
      setDialogType(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save batch');
    } finally {
      setSaving(false);
    }
  }, [dialogType, batchForm, selectedBatch, api, session.token, reload]);

  const closeDialog = useCallback(() => setDialogType(null), []);

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true },
      { key: 'description', label: 'Description' },
      {
        key: 'status',
        label: 'Status',
        render: (value) => <AdminStatusBadge status={asString(value)} />,
      },
      {
        key: 'student_count',
        label: 'Students',
        render: (value, row) => (
          <button
            type="button"
            className="text-blue-600 hover:underline font-medium"
            onClick={(e) => {
              e.stopPropagation();
              void handleViewStudents(row);
            }}
          >
            {asNumber(value)}
          </button>
        ),
      },
    ],
    [handleViewStudents],
  );

  const rows = useMemo(() => toRecords(data), [data]);

  const actions = useMemo(
    () => [
      { label: 'Edit', onClick: (row: Record<string, unknown>) => { handleEdit(row); } },
      {
        label: 'Delete',
        variant: 'destructive' as const,
        onClick: (row: Record<string, unknown>) => { void handleDelete(row); },
      },
    ],
    [handleEdit, handleDelete],
  );

  const studentColumns: DataTableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'student_id', label: 'Student ID' },
      { key: 'user_email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'enrollment_id', label: 'Enrollment ID' },
      {
        key: 'status_label',
        label: 'Status',
        render: (value) => <AdminStatusBadge status={asString(value)} />,
      },
    ],
    [],
  );

  if (loading) {
    return <PageLoader label="Loading intake..." />;
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

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Intake Management" addLabel="+ Add Batch" onAdd={handleAdd} />
      <AdminDataTable columns={columns} rows={rows} actions={actions} />

      {/* Add / Edit Dialog */}
      <Dialog open={dialogType === 'add' || dialogType === 'edit'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <DialogHeader>
              <DialogTitle>{dialogType === 'add' ? 'Add Batch' : 'Edit Batch'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="batch-title">Title</Label>
                <Input
                  id="batch-title"
                  value={batchForm.title}
                  onChange={(e) => setBatchForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Batch title"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batch-description">Description</Label>
                <Input
                  id="batch-description"
                  value={batchForm.description}
                  onChange={(e) => setBatchForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="batch-status">Status</Label>
                <select
                  id="batch-status"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={batchForm.status}
                  onChange={(e) => setBatchForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-ttii-primary hover:bg-ttii-primary/90"
              >
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Students Dialog */}
      <Dialog open={dialogType === 'students'} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Students — {selectedBatch ? asString(selectedBatch.title) : ''}
            </DialogTitle>
          </DialogHeader>
          {loadingStudents ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : batchStudents.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No students found in this batch.
            </p>
          ) : (
            <AdminDataTable columns={studentColumns} rows={batchStudents} pageSize={10} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
