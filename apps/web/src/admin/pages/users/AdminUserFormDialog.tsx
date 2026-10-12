import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Mail, Pencil, Phone, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseOnBlur } from '@/lib/text-format';
import { cn } from '@/lib/utils';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { PhotoUpload } from '../../shared/components/PhotoUpload.js';
import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { GRANTS_NOT_ENFORCED } from '../roles/roles-model.js';

// Create Admin / Edit User in Naji's layout (UserFormDialog). Same fields,
// rules and calls as the old page:
//   create — name, email, phone, role (Super Admin / Admin), photo → /admin/user/add;
//            the server emails a temporary password; permissions come after.
//   edit   — name, phone, status, photo → /admin/user/edit, then the permission
//            checklist → /admin/permissions/user/set.
// Passwords are never collected here.

const selectCls = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

function Field({ label, htmlFor, required, className, children }: {
  label: string; htmlFor?: string; required?: boolean; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={cn('min-w-0 space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}{required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}

const initialsOf = (name: string) => name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export function AdminUserFormDialog({
  open, editing, api, token, onClose, onSaved,
}: {
  open: boolean;
  /** null = Create Admin; a list row = Edit. */
  editing: Record<string, unknown> | null;
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState(8);
  const [image, setImage] = useState('');
  const [statusValue, setStatusValue] = useState(1);
  const [permCatalog, setPermCatalog] = useState<Array<Record<string, unknown>>>([]);
  const [grantedPermIds, setGrantedPermIds] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Reset / prefill on every open; an edit also loads the user's grants.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setName(asString(editing?.name));
    setEmail('');
    setPhone(asString(editing?.phone));
    setRoleId(8);
    setImage(editing ? asString(editing.image) || asString(editing.profile_picture) : '');
    // users.status 0 is Inactive; the old `|| 1` re-activated inactive admins on save.
    setStatusValue(editing && editing.status !== null && editing.status !== undefined && asNumber(editing.status) === 0 ? 0 : 1);
    setGrantedPermIds(new Set());
    const userId = editing ? asString(editing._id || editing.id) : '';
    if (userId) {
      api.listUserAdminPermissions(token, userId)
        .then((ids) => { if (!cancelled) setGrantedPermIds(new Set(ids)); })
        .catch(() => { /* ignore — the checklist starts empty */ });
    }
    return () => { cancelled = true; };
  }, [open, editing, api, token]);

  // The catalogue is loaded once, the first time the dialog opens.
  useEffect(() => {
    if (!open || permCatalog.length > 0) return;
    let cancelled = false;
    api.listAdminPermissionsCatalog(token)
      .then((rows) => { if (!cancelled) setPermCatalog(rows); })
      .catch(() => { /* ignore — UI falls back to "Loading permissions…" */ });
    return () => { cancelled = true; };
  }, [open, permCatalog.length, api, token]);

  const permissionsByCategory = useMemo(() => {
    const map = new Map<string, Array<Record<string, unknown>>>();
    for (const row of permCatalog) {
      const cat = asString(row.category) || 'Other';
      map.set(cat, [...(map.get(cat) ?? []), row]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [permCatalog]);

  const togglePerm = (id: number, checked: boolean) => setGrantedPermIds((prev) => {
    const next = new Set(prev);
    if (checked) next.add(id); else next.delete(id);
    return next;
  });

  async function handleSubmit() {
    if (editing) {
      const id = asString(editing._id || editing.id);
      if (!id) return;
      if (!name.trim() || !phone.trim()) {
        toast.error('All fields are required.');
        return;
      }
      setSubmitting(true);
      try {
        await api.editUser(token, id, { name: name.trim(), phone: phone.trim(), status: statusValue, image: image.trim() });
        await api.setUserAdminPermissions(token, id, [...grantedPermIds]);
        onClose();
        onSaved();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Update failed');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    // All fields are mandatory on create.
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error('Full name, email, and phone are required.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.addUser(token, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        role_id: roleId,
        image: image.trim() || undefined,
      });
      const message = asString(result.message);
      if (message) toast.success(message);
      onClose();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        style={{ width: 'min(720px, calc(100vw - 2rem))', maxWidth: 'min(720px, calc(100vw - 2rem))' }}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
      >
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>{editing ? 'Edit User' : 'Create Admin'}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile Photo</Label>
                <PhotoUpload
                  value={image}
                  onChange={setImage}
                  onUpload={async (file) => (await api.uploadFile(token, file)).url}
                  fallbackInitials={initialsOf(name)}
                />
              </div>
              <Field label="Full Name" htmlFor="au-name" required>
                <Input id="au-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={titleCaseOnBlur(setName)} placeholder="Full Name" required />
              </Field>
              <Field label="Mobile Number" htmlFor="au-phone" required>
                <div className="relative">
                  <Phone aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input id="au-phone" className="pl-9" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" required />
                </div>
              </Field>
              {!editing && (
                <>
                  <Field label="Email Address" htmlFor="au-email" required>
                    <div className="relative">
                      <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input id="au-email" type="email" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
                    </div>
                  </Field>
                  <Field label="Role" htmlFor="au-role" required>
                    <select id="au-role" value={roleId} onChange={(e) => setRoleId(Number(e.target.value))} required className={selectCls}>
                      <option value={1}>Super Admin</option>
                      <option value={8}>Admin</option>
                    </select>
                  </Field>
                  <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/80 sm:col-span-2">
                    A secure temporary password will be auto-generated and emailed to{' '}
                    <span className="font-medium text-primary">{email || 'this user'}</span> on save. They&rsquo;ll be prompted to change it on first sign-in. After creation, edit them to assign permissions.
                  </p>
                </>
              )}
              {editing && (
                <Field label="Account Status" className="sm:col-span-2">
                  <div role="group" aria-label="Account status" className="flex flex-wrap gap-2">
                    {[{ v: 1, label: 'Active — user can sign in', dot: 'bg-emerald-500' }, { v: 0, label: 'Inactive — sign-in blocked', dot: 'bg-slate-400' }].map((s) => (
                      <button
                        key={s.v}
                        type="button"
                        aria-pressed={statusValue === s.v}
                        onClick={() => setStatusValue(s.v)}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                          statusValue === s.v ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:bg-muted',
                        )}
                      >
                        <span className={cn('size-1.5 rounded-full', s.dot)} />
                        {s.label}
                      </button>
                    ))}
                  </div>
                </Field>
              )}
            </div>

            {editing && (
              <div className="mt-5 space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissions</Label>
                <p className="text-xs text-muted-foreground">Select what this admin can do. Super Admins have all permissions automatically.</p>
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{GRANTS_NOT_ENFORCED}</p>
                <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-border p-3">
                  {permissionsByCategory.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Loading permissions…</p>
                  ) : permissionsByCategory.map(([category, items]) => (
                    <div key={category} className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{category}</p>
                      <div className="space-y-1">
                        {items.map((p) => {
                          const id = Number(p.id);
                          return (
                            <label key={id} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1 hover:bg-muted/50">
                              <Checkbox className="mt-0.5" checked={grantedPermIds.has(id)} onCheckedChange={(v) => togglePerm(id, v === true)} />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm text-foreground">{asString(p.title)}</span>
                                {p.description ? <span className="block text-xs text-muted-foreground">{asString(p.description)}</span> : null}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="gap-1.5" disabled={submitting}>
              {editing ? <Pencil aria-hidden="true" className="size-4" /> : <Plus aria-hidden="true" className="size-4" />}
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
