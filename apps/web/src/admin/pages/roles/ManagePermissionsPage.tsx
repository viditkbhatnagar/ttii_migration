import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { asString, asNumber, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';

interface PermissionDef {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
}

// Naji 2026-05-09 — full-page table editor for a single user's
// permission matrix. Replaces the dialog because the matrix needs
// real horizontal width: Module | Sub-module | Description | Granted.
// Catalogue can be expanded in future without touching this layout.
export default function ManagePermissionsPage({ api, session, onNavigate }: AdminPageProps) {
  const userId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const m = window.location.pathname.match(/^\/admin\/roles\/manage\/(\d+)$/);
    return m?.[1] ?? '';
  }, []);

  const [user, setUser] = useState<{ name: string; email: string; role_label: string; permission_managed: boolean } | null>(null);
  const [catalog, setCatalog] = useState<PermissionDef[]>([]);
  const [granted, setGranted] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      api.loadRolesPermissionsOverview(session.token),
      api.listAdminPermissionsCatalog(session.token),
      api.listUserAdminPermissions(session.token, userId),
    ])
      .then(([overview, catalogRows, userIds]) => {
        if (cancelled) return;
        const row = (overview.users ?? []).find((u) => String(u.user_id) === userId);
        if (row) {
          setUser({
            name: asString(row.name),
            email: asString(row.email),
            role_label: asString(row.role_label),
            permission_managed: Boolean(row.permission_managed),
          });
        }
        setCatalog(toRecords(catalogRows ?? []).map((p) => ({
          id: asNumber(p.id),
          slug: asString(p.slug),
          title: asString(p.title),
          description: asString(p.description),
          category: asString(p.category) || 'Other',
        })));
        setGranted(new Set(userIds));
      })
      .catch(() => { /* PageLoader → empty state below */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, session.token, userId]);

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionDef[]>();
    for (const p of catalog) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [catalog]);

  const filteredGroups = useMemo(() => {
    return grouped.filter(([cat]) => !moduleFilter || cat === moduleFilter)
      .map(([cat, perms]): [string, PermissionDef[]] => [
        cat,
        perms.filter((p) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return p.title.toLowerCase().includes(q)
            || p.slug.toLowerCase().includes(q)
            || p.description.toLowerCase().includes(q);
        }),
      ])
      .filter(([, perms]) => perms.length > 0);
  }, [grouped, search, moduleFilter]);

  const togglePerm = useCallback((id: number) => {
    setGranted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const toggleCategory = useCallback((perms: PermissionDef[], grant: boolean) => {
    setGranted((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (grant) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  }, []);
  const grantAll = useCallback(() => setGranted(new Set(catalog.map((p) => p.id))), [catalog]);
  const revokeAll = useCallback(() => setGranted(new Set()), []);

  const handleSave = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await api.setUserAdminPermissions(session.token, userId, [...granted]);
      toast.success('Permissions saved.');
      onNavigate('/admin/roles/index');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save permissions.');
    } finally { setSaving(false); }
  }, [api, session.token, userId, granted, onNavigate]);

  if (loading) return <PageLoader label="Loading permissions matrix…" />;
  if (!user) {
    return (
      <Card><CardContent role="alert" className="py-8 text-center text-sm text-red-600">User not found.</CardContent></Card>
    );
  }
  if (!user.permission_managed) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-gray-600">
          {user.role_label} access is role-based, not per-permission. Manage access under the {user.role_label} section instead.
          <div className="mt-4">
            <Button variant="outline" onClick={() => onNavigate('/admin/roles/index')}>Back</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPerms = catalog.length;
  const grantedCount = granted.size;

  return (
    <div className="space-y-4">
      <AdminPageHeader title={`Manage Permissions — ${user.name || user.email}`}>
        <Button variant="outline" onClick={() => onNavigate('/admin/roles/index')}>Back to Roles</Button>
      </AdminPageHeader>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-gray-500">User</p>
              <p className="text-sm font-medium text-gray-900">{user.name || '—'}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Role</p>
              <p className="text-sm font-medium text-gray-900">{user.role_label}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Granted</p>
              <p className="text-sm font-medium text-gray-900">{grantedCount} of {totalPerms}</p>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={revokeAll}>Revoke all</Button>
              <Button variant="outline" size="sm" onClick={grantAll}>Grant all</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              placeholder="Search permission name, slug, or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Modules</option>
              {grouped.map(([cat]) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-[20%] px-3 py-2 text-left">Module</th>
                  <th className="w-[22%] px-3 py-2 text-left">Sub-module</th>
                  <th className="w-[44%] px-3 py-2 text-left">Description</th>
                  <th className="w-[14%] px-3 py-2 text-center">Granted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGroups.length === 0 ? (
                  <tr><td colSpan={4} className="py-6 text-center text-sm text-gray-500">No permissions match your filters.</td></tr>
                ) : filteredGroups.map(([category, perms]) => {
                  const categoryAllOn = perms.every((p) => granted.has(p.id));
                  return [
                    <tr key={`hdr-${category}`} className="bg-slate-50/60">
                      <td colSpan={3} className="px-3 py-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{category}</span>
                        <span className="ml-2 text-xs text-slate-500">{perms.filter((p) => granted.has(p.id)).length} of {perms.length} granted</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleCategory(perms, !categoryAllOn)}
                          className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-ttii-primary hover:text-ttii-primary"
                        >
                          {categoryAllOn ? 'Revoke all' : 'Grant all'}
                        </button>
                      </td>
                    </tr>,
                    ...perms.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/40">
                        <td className="px-3 py-2 align-top text-xs text-slate-500">{category}</td>
                        <td className="px-3 py-2 align-top">
                          <p className="font-medium text-gray-900">{p.title}</p>
                          <p className="font-mono text-[11px] text-gray-500">{p.slug}</p>
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-gray-600">{p.description || '—'}</td>
                        <td className="px-3 py-2 text-center align-top">
                          <input
                            type="checkbox"
                            checked={granted.has(p.id)}
                            onChange={() => togglePerm(p.id)}
                            className="size-4 rounded border-slate-300 text-ttii-primary focus:ring-ttii-primary"
                          />
                        </td>
                      </tr>
                    )),
                  ];
                }).flat()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 p-3 backdrop-blur">
        <span className="mr-auto text-sm text-gray-500">{grantedCount} permissions selected</span>
        <Button variant="outline" onClick={() => onNavigate('/admin/roles/index')} disabled={saving}>Cancel</Button>
        <Button
          className="bg-ttii-primary hover:bg-ttii-primary/90"
          onClick={() => { void handleSave(); }}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Permissions'}
        </Button>
      </div>
    </div>
  );
}
