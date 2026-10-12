import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Info } from 'lucide-react';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { asString, asNumber, toRecords } from '../../shared/utils/admin-data-utils.js';
import { PageTitle, Pill } from '../../shared/components/ui-kit.js';
import { GRANTS_NOT_ENFORCED } from './roles-model.js';

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
  const back = () => onNavigate('/admin/roles/index');
  if (!user) {
    return (
      <Card><CardContent role="alert" className="py-8 text-center text-sm text-red-600">User not found.</CardContent></Card>
    );
  }
  if (!user.permission_managed) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {user.role_label} access is role-based, not per-permission. Manage access under the {user.role_label} section instead.
          <div className="mt-4">
            <Button variant="outline" onClick={back}>Back</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPerms = catalog.length;
  const grantedCount = granted.size;

  return (
    <div className="space-y-5">
      <PageTitle
        title={`Manage Permissions — ${user.name || user.email}`}
        subtitle="Choose what this Admin may do in the admin portal."
        actions={<Button variant="outline" size="sm" onClick={back}>Back to Roles</Button>}
      />

      <div role="note" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>{GRANTS_NOT_ENFORCED}</p>
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-muted-foreground">User</p>
            <p className="text-sm font-medium text-foreground">{user.name || '—'}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Role</p>
            <Pill tone="blue" className="mt-0.5">{user.role_label}</Pill>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Granted</p>
            <p className="text-sm font-medium tabular-nums text-foreground">{grantedCount} of {totalPerms}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={revokeAll}>Revoke all</Button>
            <Button variant="outline" size="sm" onClick={grantAll}>Grant all</Button>
          </div>
        </div>
      </Card>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            aria-label="Search permissions"
            placeholder="Search permission name, slug, or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Module"
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All Modules</option>
            {grouped.map(([cat]) => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-[20%] px-3 py-2 text-left">Module</th>
                <th className="w-[22%] px-3 py-2 text-left">Sub-module</th>
                <th className="w-[44%] px-3 py-2 text-left">Description</th>
                <th className="w-[14%] px-3 py-2 text-center">Granted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredGroups.length === 0 ? (
                <tr><td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">No permissions match your filters.</td></tr>
              ) : filteredGroups.map(([category, perms]) => {
                const categoryAllOn = perms.every((p) => granted.has(p.id));
                return [
                  <tr key={`hdr-${category}`} className="bg-muted/40">
                    <td colSpan={3} className="px-3 py-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">{category}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{perms.filter((p) => granted.has(p.id)).length} of {perms.length} granted</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => toggleCategory(perms, !categoryAllOn)}
                        className="rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        {categoryAllOn ? 'Revoke all' : 'Grant all'}
                      </button>
                    </td>
                  </tr>,
                  ...perms.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground">{category}</td>
                      <td className="px-3 py-2 align-top">
                        <p className="font-medium text-foreground">{p.title}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{p.slug}</p>
                      </td>
                      <td className="px-3 py-2 align-top text-xs text-muted-foreground">{p.description || '—'}</td>
                      <td className="px-3 py-2 text-center align-top">
                        <input
                          type="checkbox"
                          aria-label={`Grant ${p.title}`}
                          checked={granted.has(p.id)}
                          onChange={() => togglePerm(p.id)}
                          className="size-4 rounded border-input accent-primary"
                        />
                      </td>
                    </tr>
                  )),
                ];
              }).flat()}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-border bg-card/95 p-3 backdrop-blur">
        <span className="mr-auto text-sm text-muted-foreground">{grantedCount} permissions selected</span>
        <Button variant="outline" onClick={back} disabled={saving}>Cancel</Button>
        <Button onClick={() => { void handleSave(); }} disabled={saving}>
          {saving ? 'Saving…' : 'Save Permissions'}
        </Button>
      </div>
    </div>
  );
}
