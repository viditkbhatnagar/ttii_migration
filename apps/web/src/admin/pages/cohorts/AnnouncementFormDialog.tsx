import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { titleCaseEachWord } from '@/lib/text-format';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import {
  EMPTY_ANNOUNCEMENT_FORM,
  buildAnnouncementPayload,
  formFromRow,
  validateAnnouncement,
  type AnnouncementForm,
  type AnnouncementRow,
  type FormErrors,
} from './announcement-model.js';

// New / Edit Announcement in Naji's dialog layout. Same fields, same body to the
// same endpoints as the old form; the server's message is toasted either way.

const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';
const TEXTAREA_CLASS = 'flex min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const DIALOG_WIDTH = 'min(560px, calc(100vw - 2rem))';

export function AnnouncementFormDialog({
  open, editing, cohorts, api, token, onClose, onSaved,
}: {
  open: boolean;
  editing: AnnouncementRow | null;
  cohorts: Array<{ id: string; label: string }>;
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AnnouncementForm>(EMPTY_ANNOUNCEMENT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? formFromRow(editing) : EMPTY_ANNOUNCEMENT_FORM);
    setErrors({});
  }, [open, editing]);

  const set = <K extends keyof AnnouncementForm>(key: K, value: AnnouncementForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  // A cohort the list no longer returns stays selectable so an edit keeps it.
  const cohortOptions = form.cohort_id && !cohorts.some((c) => c.id === form.cohort_id)
    ? [...cohorts, { id: form.cohort_id, label: editing?.cohortTitle || `Cohort #${form.cohort_id}` }]
    : cohorts;

  const submit = async () => {
    const found = validateAnnouncement(form, editing ? formFromRow(editing) : null);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      const payload = buildAnnouncementPayload(form, editing);
      const res = editing
        ? await api.updateAnnouncement(token, editing.id, payload)
        : await api.createAnnouncement(token, payload);
      toast.success(asString(res.message) || (editing ? 'Announcement updated.' : 'Announcement created.'));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent
        style={{ width: DIALOG_WIDTH, maxWidth: DIALOG_WIDTH }}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle>{editing ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
          <DialogDescription>Broadcast an update to a cohort.</DialogDescription>
        </DialogHeader>
        <form
          id="announcement-form"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4"
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="ann-title"
              placeholder="Announcement title"
              value={form.title}
              aria-invalid={Boolean(errors.title)}
              onChange={(e) => set('title', e.target.value)}
              onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) set('title', next); }}
            />
            {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ann-cohort">Cohort</Label>
            <select id="ann-cohort" className={SELECT_CLASS} value={form.cohort_id} onChange={(e) => set('cohort_id', e.target.value)}>
              <option value="">— No specific cohort —</option>
              {cohortOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ann-message">Message <span className="text-destructive">*</span></Label>
            <textarea
              id="ann-message"
              className={TEXTAREA_CLASS}
              rows={4}
              placeholder="Type the announcement message..."
              value={form.content}
              aria-invalid={Boolean(errors.content)}
              onChange={(e) => set('content', e.target.value)}
            />
            {errors.content ? <p className="text-xs text-destructive">{errors.content}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ann-audience">Audience Type</Label>
              <select
                id="ann-audience"
                className={SELECT_CLASS}
                value={form.audience_type}
                onChange={(e) => set('audience_type', e.target.value === 'selected' ? 'selected' : 'all')}
              >
                <option value="all">All students in cohort</option>
                <option value="selected">Selected students</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-status">Status</Label>
              <select
                id="ann-status"
                className={SELECT_CLASS}
                value={form.status}
                onChange={(e) => set('status', e.target.value === 'sent' ? 'sent' : 'draft')}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
              </select>
            </div>
          </div>
          {form.audience_type === 'selected' ? (
            <p className="text-xs text-amber-700">
              Picking students lands in a follow-up; an existing list is kept, a new one saves as &quot;selected&quot; without names.
            </p>
          ) : null}

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Delivery Channels</legend>
            <div className="flex flex-wrap gap-4 pt-1">
              {([
                ['delivery_in_app', 'In-app notification'],
                ['delivery_email', 'Email'],
                ['delivery_whatsapp', 'WhatsApp'],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={form[key]} onCheckedChange={(v) => set(key, v === true)} /> {label}
                </label>
              ))}
            </div>
            {errors.channels ? <p className="text-xs text-destructive">{errors.channels}</p> : null}
            <p className="text-xs text-muted-foreground">Email / WhatsApp dispatch needs a provider integration; the channel choice is saved.</p>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="ann-attachment">Attachment URL</Label>
            <Input id="ann-attachment" placeholder="https://..." value={form.attachment_url} onChange={(e) => set('attachment_url', e.target.value)} />
            {errors.attachment ? <p className="text-xs text-destructive">{errors.attachment}</p> : null}
          </div>
        </form>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-3">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button type="submit" form="announcement-form" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
