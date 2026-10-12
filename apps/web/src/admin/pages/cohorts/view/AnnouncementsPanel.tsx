import { useState } from 'react';
import { toast } from 'sonner';
import { Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConfirm } from '@/components/confirm-dialog';
import { titleCaseOnBlur } from '@/lib/text-format';
import type { AdminPageProps } from '../../../routing/admin-routes.js';
import { asString, formatDate } from '../../../shared/utils/admin-data-utils.js';
import { EmptyState } from '../../../shared/components/ui-kit.js';
import { DialogShell } from './DialogShell.js';
import { IconBtn, PanelHeader } from './panel-ui.js';

type Api = AdminPageProps['api'];
const TEXTAREA = 'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40';
const idOf = (r: Record<string, unknown>) => asString(r.id) || asString(r._id);

export function AnnouncementsPanel({
  api, token, cohortId, announcements, onReload,
}: { api: Api; token: string; cohortId: string; announcements: Record<string, unknown>[]; onReload: () => void }) {
  const confirm = useConfirm();
  const [dialog, setDialog] = useState<{ row: Record<string, unknown> | null } | null>(null);

  const remove = async (a: Record<string, unknown>) => {
    const ok = await confirm({ title: `Delete "${asString(a.title)}"?`, description: 'This action cannot be undone.', confirmText: 'Delete', variant: 'destructive' });
    if (!ok) return;
    try {
      const res = await api.deleteCohortAnnouncement(token, idOf(a));
      toast.success(asString(res.message) || 'Announcement deleted');
      onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete announcement');
    }
  };

  return (
    <Card className="gap-0 border-border/70 p-0 shadow-[var(--shadow-soft)]">
      <PanelHeader title={<span className="inline-flex items-center gap-2"><Megaphone aria-hidden="true" className="size-4 text-primary" /> Announcements ({announcements.length})</span>}>
        <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setDialog({ row: null })}>
          <Plus aria-hidden="true" className="size-4" /> Add Announcement
        </Button>
      </PanelHeader>
      {announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements posted." />
      ) : (
        <div className="space-y-2 p-4">
          {announcements.map((a) => (
            <div key={idOf(a)} className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
              <Megaphone aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{asString(a.title)}</p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{asString(a.content)}</p>
                {asString(a.description) ? <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{asString(a.description)}</p> : null}
                {formatDate(a.created_at) ? <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(a.created_at)}</p> : null}
              </div>
              <IconBtn icon={Pencil} tone="info" label={`Edit ${asString(a.title)}`} onClick={() => setDialog({ row: a })} />
              <IconBtn icon={Trash2} tone="danger" label={`Delete ${asString(a.title)}`} onClick={() => void remove(a)} />
            </div>
          ))}
        </div>
      )}
      {dialog ? (
        <AnnouncementDialog
          api={api}
          token={token}
          cohortId={cohortId}
          announcement={dialog.row}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); onReload(); }}
        />
      ) : null}
    </Card>
  );
}

function AnnouncementDialog({
  api, token, cohortId, announcement, onClose, onSaved,
}: { api: Api; token: string; cohortId: string; announcement: Record<string, unknown> | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(asString(announcement?.title));
  const [content, setContent] = useState(asString(announcement?.content));
  const [description, setDescription] = useState(asString(announcement?.description));
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = announcement
        ? await api.editCohortAnnouncement(token, idOf(announcement), { title, content, description })
        : await api.addCohortAnnouncement(token, cohortId, { title, content, description });
      toast.success(asString(res.message) || (announcement ? 'Announcement updated' : 'Announcement posted to cohort'));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save announcement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogShell
      open
      onClose={onClose}
      title={announcement ? 'Edit Announcement' : 'Add Announcement'}
      onSubmit={() => void submit()}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting || !title || !content}>{submitting ? 'Saving…' : announcement ? 'Save' : 'Post Announcement'}</Button>
        </>
      )}
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="ann-title">Title *</Label>
          <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={titleCaseOnBlur(setTitle)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ann-content">Content *</Label>
          <textarea id="ann-content" value={content} onChange={(e) => setContent(e.target.value)} rows={2} className={TEXTAREA} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ann-description">Description</Label>
          <textarea id="ann-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={TEXTAREA} />
        </div>
      </div>
    </DialogShell>
  );
}
