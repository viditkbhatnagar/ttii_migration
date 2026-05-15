import { useState, useMemo, useCallback } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { useConfirm } from '@/components/confirm-dialog';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseEachWord } from '@/lib/text-format';

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const textareaClass =
  'flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface AnnouncementForm {
  cohort_id: string;
  title: string;
  content: string;
  audience_type: 'all' | 'selected';
  delivery_in_app: boolean;
  delivery_email: boolean;
  delivery_whatsapp: boolean;
  attachment_url: string;
  status: 'draft' | 'sent';
}

const emptyForm: AnnouncementForm = {
  cohort_id: '',
  title: '',
  content: '',
  audience_type: 'all',
  delivery_in_app: true,
  delivery_email: false,
  delivery_whatsapp: false,
  attachment_url: '',
  status: 'draft',
};

export default function AnnouncementsPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState<AnnouncementForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.listAnnouncements(session.token),
    [],
  );
  const { data: cohortsData } = useAdminPageData(
    () => api.loadAdminCohorts(session.token),
    [],
  );

  const rows = useMemo(() => toRecords(data), [data]);
  const cohorts = useMemo(() => toRecords(cohortsData), [cohortsData]);

  const handleOpenAdd = useCallback(() => {
    setEditId('');
    setForm(emptyForm);
    setShowForm(true);
  }, []);

  const handleOpenEdit = useCallback((row: Record<string, unknown>) => {
    setEditId(asString(row.id));
    const channels = Array.isArray(row.delivery_channels) ? (row.delivery_channels as string[]) : [];
    setForm({
      cohort_id: asString(row.cohort_id),
      title: asString(row.title),
      content: asString(row.content),
      audience_type: asString(row.audience_type) === 'selected' ? 'selected' : 'all',
      delivery_in_app: channels.includes('in_app'),
      delivery_email: channels.includes('email'),
      delivery_whatsapp: channels.includes('whatsapp'),
      attachment_url: asString(row.attachment_url),
      status: asString(row.status) === 'sent' ? 'sent' : 'draft',
    });
    setShowForm(true);
  }, []);

  const buildPayload = useCallback(() => {
    const channels: string[] = [];
    if (form.delivery_in_app) channels.push('in_app');
    if (form.delivery_email) channels.push('email');
    if (form.delivery_whatsapp) channels.push('whatsapp');
    return {
      cohort_id: form.cohort_id,
      title: form.title.trim(),
      content: form.content.trim(),
      audience_type: form.audience_type,
      delivery_channels: channels,
      attachment_url: form.attachment_url.trim(),
      status: form.status,
    };
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editId) await api.updateAnnouncement(session.token, editId, payload);
      else await api.createAnnouncement(session.token, payload);
      setShowForm(false);
      setEditId('');
      setForm(emptyForm);
      reload();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }, [api, session.token, editId, form, buildPayload, reload]);

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      if (
        !(await confirm({
          title: `Delete announcement "${asString(row.title)}"?`,
          description: 'This action cannot be undone.',
          confirmText: 'Delete',
          variant: 'destructive',
        }))
      )
        return;
      try {
        await api.deleteAnnouncement(session.token, asString(row.id));
        reload();
      } catch {
        /* ignore */
      }
    },
    [api, session.token, reload, confirm],
  );

  const columns: DataTableColumn[] = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'cohort_title', label: 'Cohort', render: (v) => asString(v) || 'All' },
    { key: 'audience_type', label: 'Audience', render: (v) => (asString(v) === 'selected' ? 'Selected students' : 'All in cohort') },
    {
      key: 'delivery_channels',
      label: 'Delivery',
      render: (v) => {
        const list = Array.isArray(v) ? (v as string[]) : [];
        if (list.length === 0) return '—';
        return list
          .map((c) => (c === 'in_app' ? 'In-app' : c.charAt(0).toUpperCase() + c.slice(1)))
          .join(', ');
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => {
        const s = asString(v) || 'draft';
        const cls =
          s === 'sent'
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-slate-200 text-slate-700';
        return <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{s}</span>;
      },
    },
    { key: 'created_at', label: 'Created', render: (v) => formatDate(v) },
  ];

  const actions: DataTableAction[] = [
    { label: 'Edit', onClick: (row) => handleOpenEdit(row) },
    { label: 'Delete', onClick: (row) => void handleDelete(row), variant: 'destructive' },
  ];

  if (loading) return <PageLoader label="Loading announcements..." />;
  if (error)
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Announcements" addLabel="Add Announcement" onAdd={handleOpenAdd} />
      <AdminDataTable columns={columns} rows={rows} actions={actions} />

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditId('');
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) setForm((f) => ({ ...f, title: next })); }}
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <Label>Cohort</Label>
                <select
                  className={selectClass}
                  value={form.cohort_id}
                  onChange={(e) => setForm((f) => ({ ...f, cohort_id: e.target.value }))}
                >
                  <option value="">— No specific cohort —</option>
                  {cohorts.map((c) => (
                    <option key={asString(c.id)} value={asString(c.id)}>
                      {asString(c.title) || `Cohort #${asString(c.id)}`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Message *</Label>
                <textarea
                  className={textareaClass}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Type the announcement message..."
                />
                <p className="mt-1 text-xs text-slate-400">Plain text for now — rich text editor lands in a follow-up.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Audience Type</Label>
                  <select
                    className={selectClass}
                    value={form.audience_type}
                    onChange={(e) => setForm((f) => ({ ...f, audience_type: e.target.value as 'all' | 'selected' }))}
                  >
                    <option value="all">All students in cohort</option>
                    <option value="selected">Selected students</option>
                  </select>
                  {form.audience_type === 'selected' ? (
                    <p className="mt-1 text-xs text-amber-600">
                      Selected-students UI lands in a follow-up; for now this saves as &quot;selected&quot; without a list.
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    className={selectClass}
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'draft' | 'sent' }))}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Delivery Channels</Label>
                <div className="flex flex-wrap gap-3 pt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.delivery_in_app}
                      onChange={(e) => setForm((f) => ({ ...f, delivery_in_app: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">In-app notification</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.delivery_email}
                      onChange={(e) => setForm((f) => ({ ...f, delivery_email: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">Email</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.delivery_whatsapp}
                      onChange={(e) => setForm((f) => ({ ...f, delivery_whatsapp: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">WhatsApp</span>
                  </label>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Email/WhatsApp dispatch needs a provider integration; saving the channel selection is fine for now.
                </p>
              </div>
              <div>
                <Label>Attachment URL</Label>
                <Input
                  value={form.attachment_url}
                  onChange={(e) => setForm((f) => ({ ...f, attachment_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditId('');
                  setForm(emptyForm);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !form.title.trim() || !form.content.trim()}>
                {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
