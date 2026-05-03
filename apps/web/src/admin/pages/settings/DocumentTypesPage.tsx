import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';

export default function DocumentTypesPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState<{ id: string | null; label: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.listDocumentTypes(session.token),
    [],
  );
  const items = useMemo(() => data ?? [], [data]);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    if (!editing.label.trim()) { toast.error('Label is required.'); return; }
    setSaving(true);
    try {
      if (editing.id) {
        await api.updateDocumentType(session.token, editing.id, editing.label.trim());
      } else {
        await api.createDocumentType(session.token, editing.label.trim());
      }
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save document type');
    } finally {
      setSaving(false);
    }
  }, [editing, api, session.token, reload]);

  const handleDelete = useCallback(async (id: string, label: string) => {
    if (!(await confirm({
      title: `Remove "${label}"?`,
      description: 'It will also be removed from any course that currently requires it.',
      confirmText: 'Remove',
      variant: 'destructive',
    }))) return;
    try {
      await api.deleteDocumentType(session.token, id);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove document type');
    }
  }, [api, session.token, reload, confirm]);

  if (loading) return <PageLoader label="Loading document types..." />;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Document Types">
        <Button
          className="bg-ttii-primary hover:bg-ttii-primary/90"
          onClick={() => setEditing({ id: null, label: '' })}
        >
          + Add Document Type
        </Button>
      </AdminPageHeader>

      <p className="text-sm text-gray-600">
        Master list of documents an applicant may be required to upload. Once
        a type lives here, you can attach it to any course under
        <span className="font-medium"> Courses → Edit Course → Required Documents</span>,
        and the Add Application form will show a labelled upload slot for each.
      </p>

      <Card>
        <CardContent className="p-0">
          {error ? (
            <p className="p-6 text-sm text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">No document types yet. Click <strong>+ Add Document Type</strong> to start with Photo, Aadhaar, Senior Secondary, Bachelor's Degree, Signature etc.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium text-gray-600">#</th>
                  <th className="px-4 py-2 font-medium text-gray-600">Label</th>
                  <th className="px-4 py-2 w-32 text-right font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row, idx) => {
                  const id = asString(row.id);
                  const label = asString(row.label);
                  return (
                    <tr key={id} className="border-b last:border-b-0">
                      <td className="px-4 py-2.5 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{label}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setEditing({ id, label })}
                          aria-label={`Edit ${label}`}
                          title="Edit"
                        >
                          <Pencil className="size-4 text-gray-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                          onClick={() => void handleDelete(id, label)}
                          aria-label={`Remove ${label}`}
                          title="Remove"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <form onSubmit={(e) => { e.preventDefault(); void handleSave(); }} className="w-full min-w-0">
            <DialogHeader>
              <DialogTitle>{editing?.id ? 'Edit Document Type' : 'Add Document Type'}</DialogTitle>
            </DialogHeader>
            <div className="py-3">
              <Label className="mb-1 text-xs">Label</Label>
              <Input
                autoFocus
                value={editing?.label ?? ''}
                onChange={(e) => setEditing((prev) => (prev ? { ...prev, label: e.target.value } : prev))}
                placeholder="e.g. Aadhaar, Senior Secondary, Signature"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-ttii-primary hover:bg-ttii-primary/90">
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
