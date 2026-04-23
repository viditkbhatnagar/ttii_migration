import { useMemo, useState, useCallback } from 'react';
import { toast } from 'sonner';
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
import { useConfirm } from '@/components/confirm-dialog';

export default function LanguagePage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadLanguages(session.token),
    [],
  );

  const allLanguages = useMemo(() => toRecords(data), [data]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mTitle, setMTitle] = useState('');

  const openAdd = useCallback(() => {
    setEditingId(null);
    setMTitle('');
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: Record<string, unknown>) => {
    setEditingId(asString(row.id) || asString(row._id));
    setMTitle(asString(row.title));
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!mTitle.trim()) {
      toast.error('Title is required.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.editLanguage(session.token, editingId, mTitle.trim());
      } else {
        await api.addLanguage(session.token, mTitle.trim());
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save language');
    } finally {
      setSubmitting(false);
    }
  }, [mTitle, editingId, api, session.token, reload]);

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      const id = asString(row.id) || asString(row._id);
      if (!(await confirm({
        title: 'Delete this language?',
        description: 'This action cannot be undone.',
        confirmText: 'Delete',
        variant: 'destructive',
      }))) return;
      try {
        await api.deleteLanguage(session.token, id);
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete language');
      }
    },
    [api, session.token, reload, confirm],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'title', label: 'Title', sortable: true, render: (v) => asString(v) || '-' },
    ],
    [],
  );

  if (loading) return <PageLoader label="Loading language..." />;

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Language" addLabel="+ Add Language" onAdd={openAdd} />
      <AdminDataTable
        columns={columns}
        rows={allLanguages}
        actions={[
          { label: 'Edit', onClick: (row) => openEdit(row) },
          { label: 'Delete', variant: 'destructive', onClick: (row) => void handleDelete(row) },
        ]}
      />

      {/* Add/Edit Language Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Language' : 'Add Language'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid gap-2">
                <Label>Title *</Label>
                <Input value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="e.g. English, Malayalam" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                className="bg-ttii-primary hover:bg-ttii-primary/90"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
