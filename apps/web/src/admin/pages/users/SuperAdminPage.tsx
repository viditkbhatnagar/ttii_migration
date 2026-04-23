import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';

export default function SuperAdminPage({ api, session }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAdminUsers(session.token, 1),
    [],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleId, setRoleId] = useState(1);

  const allUsers = useMemo(() => toRecords(data), [data]);

  function resetForm() {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setRoleId(1);
    setEditingUser(null);
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(row: Record<string, unknown>) {
    setEditingUser(row);
    setName(asString(row.name));
    setPhone(asString(row.phone));
    setDialogOpen(true);
  }

  async function handleDelete(row: Record<string, unknown>) {
    const id = asString(row._id || row.id);
    if (!id) return;
    if (!window.confirm(`Are you sure you want to delete "${asString(row.name)}"?`)) return;
    try {
      await api.deleteUserAccount(session.token, id);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleSubmit() {
    if (editingUser) {
      const id = asString(editingUser._id || editingUser.id);
      if (!id || !name.trim()) return;
      setSubmitting(true);
      try {
        await api.editUser(session.token, id, { name: name.trim(), phone: phone.trim() || undefined });
        setDialogOpen(false);
        resetForm();
        reload();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Update failed');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!name.trim() || !email.trim() || !password) return;
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }
      setSubmitting(true);
      try {
        await api.addUser(session.token, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
          role_id: roleId,
        });
        setDialogOpen(false);
        resetForm();
        reload();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Create failed');
      } finally {
        setSubmitting(false);
      }
    }
  }

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'name', label: 'Name', sortable: true },
      { key: 'phone', label: 'Phone' },
      { key: 'user_email', label: 'Email' },
    ],
    [],
  );

  const actions: DataTableAction[] = useMemo(
    () => [
      { label: 'View', onClick: (row) => openEditDialog(row) },
      { label: 'Edit', onClick: (row) => openEditDialog(row) },
      { label: 'Delete', onClick: (row) => handleDelete(row), variant: 'destructive' },
    ],
    [],
  );

  if (loading) {
    return <PageLoader label="Loading super admin..." />;
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
      <AdminPageHeader title="Super Admin" addLabel="+ Create Super Admin" onAdd={openCreateDialog} />
      <AdminDataTable columns={columns} rows={allUsers} actions={actions} />

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Create Super Admin'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sa-name">Full Name</Label>
              <Input id="sa-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" />
            </div>
            {!editingUser && (
              <div className="space-y-1.5">
                <Label htmlFor="sa-email">Email</Label>
                <Input id="sa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="sa-phone">Phone</Label>
              <Input id="sa-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
            </div>
            {!editingUser && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="sa-password">Password</Label>
                  <Input id="sa-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sa-confirm">Confirm Password</Label>
                  <Input id="sa-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm Password" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sa-role">Role</Label>
                  <select
                    id="sa-role"
                    value={roleId}
                    onChange={(e) => setRoleId(Number(e.target.value))}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value={1}>Super Admin</option>
                    <option value={8}>Admin</option>
                  </select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={() => { void handleSubmit(); }} disabled={submitting}>
              {submitting ? 'Saving...' : editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
