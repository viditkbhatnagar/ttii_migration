import { useMemo, useState, useCallback } from 'react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { toRecords, asString } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';

const textareaClass = 'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export default function FaqPage({ api, session }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadFaqs(session.token),
    [session.token],
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mQuestion, setMQuestion] = useState('');
  const [mAnswer, setMAnswer] = useState('');

  const openAdd = useCallback(() => {
    setEditingId(null);
    setMQuestion('');
    setMAnswer('');
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: Record<string, unknown>) => {
    setEditingId(asString(row.id) || asString(row._id));
    setMQuestion(asString(row.question));
    setMAnswer(asString(row.answer));
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!mQuestion.trim() || !mAnswer.trim()) {
      alert('Question and Answer are required.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.editFaq(session.token, editingId, { question: mQuestion.trim(), answer: mAnswer.trim() });
      } else {
        await api.addFaq(session.token, { question: mQuestion.trim(), answer: mAnswer.trim() });
      }
      setModalOpen(false);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save FAQ');
    } finally {
      setSubmitting(false);
    }
  }, [mQuestion, mAnswer, editingId, api, session.token, reload]);

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      const id = asString(row.id) || asString(row._id);
      if (!window.confirm('Delete this FAQ?')) return;
      try {
        await api.deleteFaq(session.token, id);
        reload();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete FAQ');
      }
    },
    [api, session.token, reload],
  );

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'question', label: 'Question', sortable: true, render: (v) => asString(v) || '-' },
      { key: 'answer', label: 'Answer', sortable: true, render: (v) => asString(v) || '-' },
    ],
    [],
  );

  const rows = useMemo(() => toRecords(data), [data]);

  if (loading) return <PageLoader label="Loading faq..." />;

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="FAQ" addLabel="+ Add FAQ" onAdd={openAdd} />
      <AdminDataTable
        columns={columns}
        rows={rows}
        actions={[
          { label: 'Edit', onClick: (row) => openEdit(row) },
          { label: 'Delete', variant: 'destructive', onClick: (row) => void handleDelete(row) },
        ]}
      />

      {/* Add/Edit FAQ Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Faq' : 'Add Faq'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-2">
              <Label>Question *</Label>
              <textarea
                className={textareaClass}
                value={mQuestion}
                onChange={(e) => setMQuestion(e.target.value)}
                placeholder="Enter question"
              />
            </div>
            <div className="grid gap-2">
              <Label>Answer *</Label>
              <textarea
                className={textareaClass}
                value={mAnswer}
                onChange={(e) => setMAnswer(e.target.value)}
                placeholder="Enter answer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              disabled={submitting}
              onClick={() => void handleSave()}
            >
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
