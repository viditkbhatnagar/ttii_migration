import { useState, useMemo, useCallback } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { useConfirm } from '@/components/confirm-dialog';

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface PartnerForm {
  partner_code: string;
  name: string;
  short_name: string;
  country: string;
  description: string;
  logo: string;
  status: string;
}

const emptyForm: PartnerForm = {
  partner_code: '',
  name: '',
  short_name: '',
  country: '',
  description: '',
  logo: '',
  status: 'active',
};

export default function CertificationPartnersPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState<PartnerForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.listCertificationPartners(session.token),
    [],
  );
  const rows = useMemo(() => toRecords(data), [data]);

  const handleOpenAdd = useCallback(() => {
    setEditId('');
    setForm(emptyForm);
    setShowForm(true);
  }, []);

  const handleOpenEdit = useCallback((row: Record<string, unknown>) => {
    setEditId(asString(row.id));
    setForm({
      partner_code: asString(row.partner_code),
      name: asString(row.name),
      short_name: asString(row.short_name),
      country: asString(row.country),
      description: asString(row.description),
      logo: asString(row.logo),
      status: asString(row.status) || 'active',
    });
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.partner_code.trim() || !form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        partner_code: form.partner_code.trim(),
        name: form.name.trim(),
        short_name: form.short_name.trim(),
        country: form.country.trim(),
        description: form.description.trim(),
        logo: form.logo.trim(),
        status: form.status,
      };
      if (editId) await api.updateCertificationPartner(session.token, editId, payload);
      else await api.createCertificationPartner(session.token, payload);
      setShowForm(false);
      setEditId('');
      setForm(emptyForm);
      reload();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }, [api, session.token, editId, form, reload]);

  const handleDelete = useCallback(
    async (row: Record<string, unknown>) => {
      if (
        !(await confirm({
          title: `Delete partner "${asString(row.name)}"?`,
          description: 'This action cannot be undone.',
          confirmText: 'Delete',
          variant: 'destructive',
        }))
      )
        return;
      try {
        await api.deleteCertificationPartner(session.token, asString(row.id));
        reload();
      } catch {
        /* ignore */
      }
    },
    [api, session.token, reload, confirm],
  );

  const columns: DataTableColumn[] = [
    {
      key: 'logo',
      label: 'Logo',
      render: (v) => {
        const url = asString(v);
        return url ? (
          <img src={url} alt="" className="h-8 w-8 rounded object-cover" />
        ) : (
          <div className="h-8 w-8 rounded bg-slate-100" />
        );
      },
    },
    { key: 'partner_code', label: 'Code', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'country', label: 'Country' },
    { key: 'description', label: 'Description', render: (v) => asString(v).slice(0, 60) + (asString(v).length > 60 ? '…' : '') },
    {
      key: 'status',
      label: 'Status',
      render: (v) => {
        const s = asString(v) || 'active';
        return (
          <span
            className={
              s === 'active'
                ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700'
                : 'rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-700'
            }
          >
            {s}
          </span>
        );
      },
    },
  ];

  const actions: DataTableAction[] = [
    { label: 'Edit', onClick: (row) => handleOpenEdit(row) },
    { label: 'Delete', onClick: (row) => void handleDelete(row), variant: 'destructive' },
  ];

  if (loading) return <PageLoader label="Loading certification partners..." />;
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
      <AdminPageHeader title="Certification Partners" addLabel="Add Partner" onAdd={handleOpenAdd} />
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
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
          >
            <DialogHeader>
              <DialogTitle>{editId ? 'Edit Partner' : 'New Certification Partner'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Partner Code *</Label>
                  <Input
                    value={form.partner_code}
                    onChange={(e) => setForm((f) => ({ ...f, partner_code: e.target.value }))}
                    placeholder="e.g. AAP-US"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <select
                    className={selectClass}
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Partner Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. American Academy of Pediatrics"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Short Name</Label>
                  <Input
                    value={form.short_name}
                    onChange={(e) => setForm((f) => ({ ...f, short_name: e.target.value }))}
                    placeholder="e.g. AAP"
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    placeholder="e.g. United States"
                  />
                </div>
              </div>
              <div>
                <Label>Logo URL</Label>
                <Input
                  value={form.logo}
                  onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
              <Button type="submit" disabled={saving || !form.partner_code.trim() || !form.name.trim()}>
                {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
