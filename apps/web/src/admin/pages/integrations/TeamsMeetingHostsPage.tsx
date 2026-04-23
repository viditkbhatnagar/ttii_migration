import { useMemo, useState, useCallback } from 'react';
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
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';

export default function TeamsMeetingHostsPage({ api, session }: AdminPageProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState({ teamsEmail: '', displayName: '', isActive: true });

  const { data, loading, error, reload } = useAdminPageData(
    () => api.listTeamsMeetingHosts(session.token),
    [],
  );
  const rows = useMemo(() => toRecords(data), [data]);

  const resetForm = useCallback(() => {
    setForm({ teamsEmail: '', displayName: '', isActive: true });
    setEditId('');
  }, []);

  const handleAdd = useCallback(() => {
    resetForm();
    setShowDialog(true);
  }, [resetForm]);

  const handleEdit = useCallback((row: Record<string, unknown>) => {
    setEditId(asString(row.id));
    setForm({
      teamsEmail: asString(row.teams_email),
      displayName: asString(row.display_name),
      isActive: row.is_active === 1 || row.is_active === '1' || row.is_active === true,
    });
    setShowDialog(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.teamsEmail.trim()) { alert('Trainer email is required.'); return; }
    setSaving(true);
    try {
      if (editId) {
        await api.editTeamsMeetingHost(session.token, editId, {
          displayName: form.displayName.trim(),
          isActive: form.isActive,
        });
      } else {
        const result = await api.addTeamsMeetingHost(session.token, {
          teamsEmail: form.teamsEmail.trim(),
          displayName: form.displayName.trim(),
          isActive: form.isActive,
        });
        if (result.success === false) {
          alert(asString(result.message));
          return;
        }
      }
      setShowDialog(false);
      resetForm();
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save trainer.');
    } finally {
      setSaving(false);
    }
  }, [api, session.token, editId, form, reload, resetForm]);

  const handleDelete = useCallback(async (row: Record<string, unknown>) => {
    const email = asString(row.teams_email);
    if (!window.confirm(`Remove "${email}" from the Teams meeting hosts allowlist?`)) return;
    try {
      await api.deleteTeamsMeetingHost(session.token, asString(row.id));
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete.');
    }
  }, [api, session.token, reload]);

  const handleTest = useCallback(async (row: Record<string, unknown>) => {
    const email = asString(row.teams_email);
    try {
      const result = await api.testTeamsMeetingHost(session.token, asString(row.id));
      if (result.success) {
        alert(`✓ Teams policy verified for ${email}. A test meeting was created successfully.\n\nJoin URL: ${asString(result.joinUrl)}`);
      } else {
        alert(`✗ Test failed for ${email}:\n\n${asString(result.message)}`);
      }
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Test request failed.');
    }
  }, [api, session.token, reload]);

  const columns: DataTableColumn[] = useMemo(() => [
    { key: 'teams_email', label: 'Trainer Email (M365 UPN)', sortable: true },
    { key: 'display_name', label: 'Display Name', render: (v) => asString(v) || '-' },
    {
      key: 'is_active',
      label: 'Status',
      render: (v) => {
        const active = v === 1 || v === '1' || v === true;
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
            {active ? 'Active' : 'Disabled'}
          </span>
        );
      },
    },
    {
      key: 'policy_verified_at',
      label: 'Azure Policy',
      render: (v, row) => {
        const verified = !!v;
        const lastErr = asString(row.last_error);
        if (verified) {
          return (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700" title={`Verified ${asString(v)}`}>
              Verified
            </span>
          );
        }
        if (lastErr) {
          return (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700" title={lastErr}>
              Error — check tooltip
            </span>
          );
        }
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            Not tested
          </span>
        );
      },
    },
  ], []);

  const actions: DataTableAction[] = useMemo(() => [
    { label: 'Test Policy', onClick: (row) => { void handleTest(row); } },
    { label: 'Edit', onClick: (row) => handleEdit(row) },
    { label: 'Remove', onClick: (row) => { void handleDelete(row); }, variant: 'destructive' },
  ], [handleTest, handleEdit, handleDelete]);

  if (loading) return <PageLoader label="Loading Teams meeting hosts..." />;
  if (error) {
    return <Card><CardContent className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Teams Meeting Hosts" addLabel="Add Host" onAdd={handleAdd} />

      <Card>
        <CardContent className="py-4 text-sm text-gray-700">
          <p className="font-medium">About this page</p>
          <p className="mt-1 text-gray-600">
            Microsoft Teams live classes are created on behalf of the trainers listed here.
            For each trainer, an Azure AD "Cloud Communications Access Policy" must be assigned in PowerShell
            (ask Naji or the M365 admin). Click "Test Policy" after adding a trainer to verify the policy is in place.
            See <code className="rounded bg-gray-100 px-1 text-xs">deploy/teams-admin-setup.md</code> for the full one-time setup guide.
          </p>
        </CardContent>
      </Card>

      <AdminDataTable columns={columns} rows={rows} actions={actions} />

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Teams Meeting Host' : 'Add Teams Meeting Host'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Trainer Email (M365 UPN) *</Label>
              <Input
                type="email"
                value={form.teamsEmail}
                onChange={(e) => setForm((f) => ({ ...f, teamsEmail: e.target.value }))}
                placeholder="trainer.name@teachersindia.in"
                disabled={!!editId}
              />
              {!editId && <p className="mt-1 text-xs text-gray-500">Must match the trainer's Microsoft 365 login exactly. Cannot be changed after creation.</p>}
            </div>
            <div>
              <Label>Display Name</Label>
              <Input
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="e.g. Priya (Montessori Dept)"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Active (eligible for new live class creation)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }} disabled={saving}>Cancel</Button>
            <Button onClick={() => { void handleSave(); }} disabled={saving || !form.teamsEmail.trim()}>
              {saving ? 'Saving...' : editId ? 'Update' : 'Add Host'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
