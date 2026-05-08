import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableAction, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

// Color chip per role so the table reads at a glance.
const ROLE_CHIP_COLORS: Record<number, string> = {
  1: 'bg-purple-100 text-purple-800',  // Super Admin
  3: 'bg-sky-100 text-sky-800',        // Instructor
  8: 'bg-emerald-100 text-emerald-800', // Admin
  9: 'bg-blue-100 text-blue-800',      // Counsellor
  10: 'bg-amber-100 text-amber-800',   // Associate
};

interface PermissionDef {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
}

interface OverviewRow {
  user_id: number;
  name: string;
  email: string;
  role_id: number;
  role_label: string;
  status: number | null;
  granted_permission_ids: number[];
  granted_count: number;
  permission_managed: boolean;
}

export default function RolesPermissionsPage({ api, session }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadRolesPermissionsOverview(session.token),
    [],
  );
  const { data: catalogData } = useAdminPageData(
    () => api.listAdminPermissionsCatalog(session.token),
    [],
  );

  const rows = useMemo<OverviewRow[]>(() => {
    const list = data?.users ?? [];
    return list.map((r) => ({
      user_id: asNumber(r.user_id),
      name: asString(r.name),
      email: asString(r.email),
      role_id: asNumber(r.role_id),
      role_label: asString(r.role_label),
      status: r.status === null || r.status === undefined ? null : asNumber(r.status),
      granted_permission_ids: Array.isArray(r.granted_permission_ids)
        ? (r.granted_permission_ids as unknown[]).map((v) => Number(v)).filter((n) => Number.isFinite(n))
        : [],
      granted_count: asNumber(r.granted_count),
      permission_managed: Boolean(r.permission_managed),
    }));
  }, [data]);

  const totalPermissions = data?.total_permissions ?? 0;

  const catalog = useMemo<PermissionDef[]>(() => {
    return toRecords(catalogData ?? []).map((p) => ({
      id: asNumber(p.id),
      slug: asString(p.slug),
      title: asString(p.title),
      description: asString(p.description),
      category: asString(p.category) || 'Other',
    }));
  }, [catalogData]);

  const grouped = useMemo(() => {
    const map = new Map<string, PermissionDef[]>();
    for (const p of catalog) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [catalog]);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (roleFilter && String(r.role_id) !== roleFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, roleFilter]);

  // Manage Permissions dialog state
  const [manageOpen, setManageOpen] = useState(false);
  const [manageRow, setManageRow] = useState<OverviewRow | null>(null);
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const openManage = useCallback((row: OverviewRow) => {
    if (!row.permission_managed) {
      toast.info(`${row.role_label} access is managed by role, not by individual permissions.`);
      return;
    }
    setManageRow(row);
    setPending(new Set(row.granted_permission_ids));
    setManageOpen(true);
  }, []);

  const togglePerm = useCallback((id: number) => {
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((perms: PermissionDef[], grant: boolean) => {
    setPending((prev) => {
      const next = new Set(prev);
      for (const p of perms) {
        if (grant) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!manageRow) return;
    setSaving(true);
    try {
      await api.setUserAdminPermissions(session.token, String(manageRow.user_id), [...pending]);
      toast.success('Permissions updated.');
      setManageOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  }, [api, session.token, manageRow, pending, reload]);

  const columns: DataTableColumn[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'User',
        sortable: true,
        render: (_v, r) => {
          const row = r as unknown as OverviewRow;
          const initials = (row.name || row.email || '?')
            .split(/\s+/)
            .map((s) => s[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase();
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{row.name || '—'}</p>
                <p className="truncate text-xs text-gray-500">{row.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        key: 'role_label',
        label: 'Role',
        sortable: true,
        render: (_v, r) => {
          const row = r as unknown as OverviewRow;
          const cls = ROLE_CHIP_COLORS[row.role_id] ?? 'bg-gray-100 text-gray-800';
          return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{row.role_label}</span>;
        },
      },
      {
        key: 'granted_count',
        label: 'Permissions',
        sortable: true,
        render: (_v, r) => {
          const row = r as unknown as OverviewRow;
          if (row.role_id === 1) {
            return <span className="text-sm font-medium text-purple-700">All ({totalPermissions})</span>;
          }
          if (!row.permission_managed) {
            return <span className="text-xs italic text-gray-500">Role-based</span>;
          }
          const pct = totalPermissions > 0 ? Math.round((row.granted_count / totalPermissions) * 100) : 0;
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{row.granted_count} / {totalPermissions}</span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        },
      },
      {
        key: 'status',
        label: 'Status',
        render: (_v, r) => {
          const row = r as unknown as OverviewRow;
          const active = row.status === 1 || row.status === null;
          return (
            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {active ? 'Active' : 'Inactive'}
            </span>
          );
        },
      },
    ],
    [totalPermissions],
  );

  const actions: DataTableAction[] = useMemo(
    () => [
      {
        label: 'Manage Permissions',
        onClick: (row) => openManage(row as unknown as OverviewRow),
      },
    ],
    [openManage],
  );

  if (loading) return <PageLoader label="Loading roles & permissions…" />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent>
      </Card>
    );
  }

  const adminCount = rows.filter((r) => r.role_id === 8).length;
  const counsellorCount = rows.filter((r) => r.role_id === 9).length;
  const assocCount = rows.filter((r) => r.role_id === 10).length;
  const instCount = rows.filter((r) => r.role_id === 3).length;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Roles & Permissions" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryCard label="Total Permissions" value={totalPermissions} />
        <SummaryCard label="Admins" value={adminCount} />
        <SummaryCard label="Counsellors" value={counsellorCount} />
        <SummaryCard label="Associates" value={assocCount} />
        <SummaryCard label="Instructors" value={instCount} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Roles</option>
              <option value="1">Super Admin</option>
              <option value="8">Admin</option>
              <option value="9">Counsellor</option>
              <option value="10">Associate</option>
              <option value="3">Instructor</option>
            </select>
          </div>
          <AdminDataTable columns={columns} rows={filteredRows as unknown as Record<string, unknown>[]} actions={actions} />
        </CardContent>
      </Card>

      {/* Manage Permissions dialog — toggles grouped by category */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="w-[min(720px,calc(100vw-2rem))] max-w-[min(720px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
            <DialogDescription>
              {manageRow ? (
                <>
                  For <strong>{manageRow.name || manageRow.email}</strong> ({manageRow.role_label}). Toggle the permissions this user is allowed to use.
                </>
              ) : 'Select a user to manage permissions.'}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {grouped.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">No permission catalogue loaded.</p>
            ) : grouped.map(([category, perms]) => {
              const grantedHere = perms.filter((p) => pending.has(p.id)).length;
              const allOn = grantedHere === perms.length;
              return (
                <div key={category} className="rounded-lg border border-slate-100 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{category}</p>
                      <p className="text-xs text-gray-500">{grantedHere} of {perms.length} granted</p>
                    </div>
                    <button
                      type="button"
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-ttii-primary hover:text-ttii-primary"
                      onClick={() => toggleCategory(perms, !allOn)}
                    >
                      {allOn ? 'Revoke all' : 'Grant all'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {perms.map((p) => (
                      <label key={p.id} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={pending.has(p.id)}
                          onChange={() => togglePerm(p.id)}
                          className="mt-1 size-4 rounded border-slate-300 text-ttii-primary focus:ring-ttii-primary"
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-medium text-gray-900">{p.title}</span>
                          <span className="block font-mono text-xs text-gray-500">{p.slug}</span>
                          {p.description ? <span className="block text-xs text-gray-500">{p.description}</span> : null}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="border-t border-slate-100 pt-3">
            <span className="mr-auto text-sm text-gray-500">{pending.size} permissions selected</span>
            <Button variant="outline" onClick={() => setManageOpen(false)} disabled={saving}>Cancel</Button>
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              onClick={() => { void handleSave(); }}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  );
}

