import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
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
import { asNumber, asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { PhotoUpload } from '../../shared/components/PhotoUpload.js';
import { useConfirm } from '@/components/confirm-dialog';

export default function SuperAdminPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAdminUsers(session.token, 1),
    [],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state — passwords are NOT collected here. The server generates a
  // secure temp password on create and emails it to the new user.
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState(1);
  const [image, setImage] = useState('');
  const [statusValue, setStatusValue] = useState(1);
  const [permCatalog, setPermCatalog] = useState<Array<Record<string, unknown>>>([]);
  const [grantedPermIds, setGrantedPermIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!dialogOpen || permCatalog.length > 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await api.listAdminPermissionsCatalog(session.token);
        if (!cancelled) setPermCatalog(rows);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [dialogOpen, permCatalog.length, api, session.token]);

  const permissionsByCategory = useMemo(() => {
    const map = new Map<string, Array<Record<string, unknown>>>();
    for (const row of permCatalog) {
      const cat = asString(row.category) || 'Other';
      const list = map.get(cat) ?? [];
      list.push(row);
      map.set(cat, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permCatalog]);

  function togglePerm(id: number, checked: boolean) {
    setGrantedPermIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  const allUsers = useMemo(() => toRecords(data), [data]);

  function resetForm() {
    setName('');
    setEmail('');
    setPhone('');
    setRoleId(1);
    setImage('');
    setStatusValue(1);
    setGrantedPermIds(new Set());
    setEditingUser(null);
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  async function openEditDialog(row: Record<string, unknown>) {
    setEditingUser(row);
    setName(asString(row.name));
    setPhone(asString(row.phone));
    setImage(asString(row.image) || asString(row.profile_picture));
    setStatusValue(asNumber(row.status) || 1);
    setDialogOpen(true);
    const userId = asString(row._id || row.id);
    if (userId) {
      try {
        const ids = await api.listUserAdminPermissions(session.token, userId);
        setGrantedPermIds(new Set(ids));
      } catch { /* ignore */ }
    }
  }

  async function handleDelete(row: Record<string, unknown>) {
    const id = asString(row._id || row.id);
    if (!id) return;
    if (!(await confirm({
      title: `Delete "${asString(row.name)}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return;
    try {
      await api.deleteUserAccount(session.token, id);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function handleSubmit() {
    if (editingUser) {
      const id = asString(editingUser._id || editingUser.id);
      if (!id) return;
      if (!name.trim() || !phone.trim()) {
        toast.error('All fields are required.');
        return;
      }
      setSubmitting(true);
      try {
        await api.editUser(session.token, id, {
          name: name.trim(),
          phone: phone.trim(),
          status: statusValue,
          image: image.trim(),
        });
        await api.setUserAdminPermissions(session.token, id, [...grantedPermIds]);
        setDialogOpen(false);
        resetForm();
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Update failed');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!name.trim() || !email.trim() || !phone.trim()) {
        toast.error('Full name, email, and phone are required.');
        return;
      }
      setSubmitting(true);
      try {
        const result = await api.addUser(session.token, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role_id: roleId,
          image: image.trim() || undefined,
        });
        const message = asString(result.message);
        if (message) toast.success(message);
        setDialogOpen(false);
        resetForm();
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Create failed');
      } finally {
        setSubmitting(false);
      }
    }
  }

  const columns: DataTableColumn[] = useMemo(
    () => [
      {
        key: 'image',
        label: '',
        render: (_v, row) => {
          const url = asString(row.image) || asString(row.profile_picture);
          const initials = asString(row.name).split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
          return url ? (
            <img src={url} alt="" className="size-8 rounded-full object-cover" />
          ) : (
            <div className="flex size-8 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">{initials || '—'}</div>
          );
        },
      },
      { key: 'name', label: 'Name', sortable: true },
      { key: 'phone', label: 'Phone' },
      { key: 'user_email', label: 'Email' },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <AdminStatusBadge status={asNumber(v) === 1 ? 'Active' : 'Inactive'} />,
      },
    ],
    [],
  );

  const handleToggleStatus = async (row: Record<string, unknown>) => {
    const id = asString(row._id || row.id);
    if (!id) return;
    const current = asNumber(row.status);
    const next = current === 1 ? 0 : 1;
    try {
      await api.editUser(session.token, id, {
        name: asString(row.name),
        phone: asString(row.phone) || undefined,
        status: next,
      });
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const actions: DataTableAction[] = useMemo(
    () => [
      { label: 'View', onClick: (row) => { void openEditDialog(row); } },
      { label: 'Edit', onClick: (row) => { void openEditDialog(row); } },
      {
        label: 'Toggle Active',
        onClick: (row) => { void handleToggleStatus(row); },
      },
      { label: 'Delete', onClick: (row) => { void handleDelete(row); }, variant: 'destructive' },
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
        <DialogContent className="w-[min(560px,calc(100vw-2rem))] max-w-[min(560px,calc(100vw-2rem))] overflow-hidden">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
            className="w-full min-w-0"
          >
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Create Super Admin'}</DialogTitle>
          </DialogHeader>
          <div className="w-full min-w-0 space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Profile Photo</Label>
              <PhotoUpload
                value={image}
                onChange={setImage}
                onUpload={async (file) => {
                  const r = await api.uploadFile(session.token, file);
                  return r.url;
                }}
                fallbackInitials={name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-name">Full Name *</Label>
              <Input id="sa-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" required />
            </div>
            {!editingUser && (
              <div className="space-y-1.5">
                <Label htmlFor="sa-email">Email *</Label>
                <Input id="sa-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="sa-phone">Phone *</Label>
              <Input id="sa-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" required />
            </div>
            {editingUser && (
              <div className="space-y-1.5">
                <Label htmlFor="sa-status">Status</Label>
                <select
                  id="sa-status"
                  value={statusValue}
                  onChange={(e) => setStatusValue(Number(e.target.value))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value={1}>Active — user can sign in</option>
                  <option value={0}>Inactive — sign-in blocked</option>
                </select>
              </div>
            )}
            {!editingUser && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="sa-role">Role *</Label>
                  <select
                    id="sa-role"
                    value={roleId}
                    onChange={(e) => setRoleId(Number(e.target.value))}
                    required
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value={1}>Super Admin</option>
                    <option value={8}>Admin</option>
                  </select>
                </div>
                <p className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                  A secure temporary password will be auto-generated and emailed to <span className="font-semibold">{email || 'this user'}</span> on save. They&rsquo;ll be prompted to change it on first sign-in. Super Admins automatically receive every permission.
                </p>
              </>
            )}
            {editingUser && (
              <div className="space-y-2">
                <Label>Permissions</Label>
                <p className="text-xs text-slate-500">
                  Super Admins (role 1) hold every permission automatically — toggles below are mostly informational. For role-8 admins these gates are enforced server-side.
                </p>
                <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200 p-3 space-y-3">
                  {permissionsByCategory.length === 0 ? (
                    <p className="text-xs text-slate-400">Loading permissions…</p>
                  ) : (
                    permissionsByCategory.map(([category, items]) => (
                      <div key={category} className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{category}</p>
                        <div className="space-y-1">
                          {items.map((p) => {
                            const id = Number(p.id);
                            const checked = grantedPermIds.has(id);
                            return (
                              <label key={id} className="flex items-start gap-2 cursor-pointer rounded px-2 py-1 hover:bg-slate-50">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => togglePerm(id, e.target.checked)}
                                  className="mt-0.5 size-4 rounded border-slate-300"
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-slate-800">{asString(p.title)}</p>
                                  {p.description ? <p className="text-xs text-slate-500">{asString(p.description)}</p> : null}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingUser ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
