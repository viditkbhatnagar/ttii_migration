import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableAction, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

// Color chip per role so the table reads at a glance.
const ROLE_CHIP_COLORS: Record<number, string> = {
  1: 'bg-purple-100 text-purple-800',  // Super Admin
  8: 'bg-emerald-100 text-emerald-800', // Admin
};

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

export default function RolesPermissionsPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error } = useAdminPageData(
    () => api.loadRolesPermissionsOverview(session.token),
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

  // Naji 2026-05-09 — Manage Permissions is now a full page (not a
  // dialog) so the matrix has room to breathe and grow as the
  // permission catalogue is expanded per sub-module.
  const openManage = useCallback((row: OverviewRow) => {
    if (!row.permission_managed) {
      toast.info(`${row.role_label} access is managed by role, not by individual permissions.`);
      return;
    }
    onNavigate(`/admin/roles/manage/${row.user_id}`);
  }, [onNavigate]);

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

  const superAdminCount = rows.filter((r) => r.role_id === 1).length;
  const adminCount = rows.filter((r) => r.role_id === 8).length;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Roles & Permissions" />
      <p className="-mt-1 text-sm text-gray-500">
        Manage permissions for Admin users. Counsellors, Associates and Instructors are managed under their own sections — their access is role-based, not per-permission.
      </p>

      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Total Permissions" value={totalPermissions} />
        <SummaryCard label="Super Admins" value={superAdminCount} />
        <SummaryCard label="Admins" value={adminCount} />
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
            </select>
          </div>
          <AdminDataTable columns={columns} rows={filteredRows as unknown as Record<string, unknown>[]} actions={actions} />
        </CardContent>
      </Card>
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

