import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Eye, Filter, Info, KeyRound, RefreshCcw, Search, ShieldCheck, ShieldOff, UserCheck, UserCog, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, KpiTile, Pill } from '../../shared/components/ui-kit.js';
import { TONE } from '../../shared/components/ui-tones.js';
import { FilterSelect } from '../students/list-chrome.js';
import { AdminGrantsTable } from './AdminGrantsTable.js';
import { RoleProfileDialog, type RoleProfileTab } from './RoleProfileDialog.js';
import {
  ACCESS_LABEL, ACCESS_TONE, EMPTY_ROLE_FILTERS, GRANTS_NOT_ENFORCED, filterGrantRows, filterRoles, roleCsvRows,
  toGrantRows, toRoleRows, type AccessModel, type GrantRow, type RoleFilters, type RoleRow,
} from './roles-model.js';

// Admin → Roles & Permissions, rebuilt after Naji's RolesModule (TTII
// 2026-10-12) on OUR role model: the built-in roles with who holds them, a
// read-only profile per role, and the per-admin permission grants with the
// existing "Manage Permissions" editor (/admin/roles/manage/:id).
// The grants are NOT enforced by the server yet — the page says so plainly.
// NOT copied: Create / Edit / Duplicate / Activate / Deactivate role, Change
// Role, a role permission matrix and the Activity Timeline — roles are fixed
// role_ids with no role table or audit log, so each needs DDL and sign-off.

export default function RolesPermissionsPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    async () => {
      const [overview, summary] = await Promise.all([
        api.loadRolesPermissionsOverview(session.token),
        // Optional: the role counts must not take the grants table down with them.
        api.loadRoleSummary(session.token).catch(() => null),
      ]);
      return { overview, summary };
    },
    [],
  );

  const grants = useMemo(() => toGrantRows(data?.overview.users ?? []), [data]);
  const totalPermissions = data?.overview.total_permissions ?? 0;
  const countsKnown = Boolean(data?.summary);
  const roles = useMemo(() => toRoleRows(data?.summary ?? []), [data]);

  const [roleFilters, setRoleFilters] = useState<RoleFilters>(EMPTY_ROLE_FILTERS);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [profile, setProfile] = useState<{ role: RoleRow; tab: RoleProfileTab } | null>(null);

  const shownRoles = useMemo(() => filterRoles(roles, roleFilters), [roles, roleFilters]);
  const shownGrants = useMemo(() => filterGrantRows(grants, search, roleFilter), [grants, search, roleFilter]);
  const setRoles = (patch: Partial<RoleFilters>) => setRoleFilters((f) => ({ ...f, ...patch }));
  const resetAll = () => { setRoleFilters(EMPTY_ROLE_FILTERS); setSearch(''); setRoleFilter(''); };

  // Naji 2026-05-09 — Manage Permissions is a full page (not a dialog).
  const openManage = useCallback((row: GrantRow) => {
    if (!row.managed) {
      toast.info(`${row.roleLabel} access is managed by role, not by individual permissions.`);
      return;
    }
    onNavigate(`/admin/roles/manage/${row.userId}`);
  }, [onNavigate]);

  if (loading) return <PageLoader label="Loading roles & permissions…" />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  const superAdminCount = grants.filter((r) => r.roleId === 1).length;
  const adminCount = grants.filter((r) => r.roleId === 8).length;
  const assignedUsers = roles.reduce((s, r) => s + r.users, 0);
  const grantRoleKpi = (id: string) => setRoleFilter((v) => (v === id ? '' : id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administration</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Role &amp; Permission Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">The built-in roles, who holds them, and the permissions recorded for each Admin.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={!countsKnown || shownRoles.length === 0}
          onClick={() => downloadCsv('roles.csv', toCsv(roleCsvRows(shownRoles)))}
        >
          <Download aria-hidden="true" className="size-4" /> Export
        </Button>
      </div>

      <div role="note" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>
          Roles are built into the system and cannot be created or edited here. Super Admin and Admin currently have the same
          access. Per-admin permissions: {GRANTS_NOT_ENFORCED}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile label="System Roles" value={roles.length} icon={ShieldCheck} tone="primary" active={!roleFilters.access && !roleFilters.assignedOnly} onClick={() => setRoles({ access: '', assignedOnly: false })} />
        <KpiTile label="Assigned Users" value={countsKnown ? assignedUsers : '—'} icon={Users2} tone="blue" active={roleFilters.assignedOnly} onClick={() => setRoles({ assignedOnly: !roleFilters.assignedOnly })} />
        <KpiTile label="Super Admins" value={superAdminCount} icon={UserCheck} tone="emerald" active={roleFilter === '1'} onClick={() => grantRoleKpi('1')} />
        <KpiTile label="Admins" value={adminCount} icon={UserCog} tone="amber" active={roleFilter === '8'} onClick={() => grantRoleKpi('8')} />
        <KpiTile
          label="Total Permissions"
          value={totalPermissions}
          icon={KeyRound}
          tone="slate"
          onClick={() => { const admin = roles.find((r) => r.roleId === 8); if (admin) setProfile({ role: admin, tab: 'permissions' }); }}
        />
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter aria-hidden="true" className="size-4 text-muted-foreground" /> Filters
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={resetAll}>
            <RefreshCcw aria-hidden="true" className="size-3.5" /> Reset
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_200px]">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search roles" className="h-9 pl-9 text-sm" placeholder="Search role name or code" value={roleFilters.search} onChange={(e) => setRoles({ search: e.target.value })} />
          </div>
          <FilterSelect
            label="Access"
            value={roleFilters.access}
            onChange={(v) => setRoles({ access: v as '' | AccessModel })}
            allLabel="All Access"
            options={(Object.keys(ACCESS_LABEL) as AccessModel[]).map((k) => ({ value: k, label: ACCESS_LABEL[k] }))}
          />
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">{shownRoles.length} roles</div>
        {shownRoles.length === 0 ? (
          <EmptyState icon={ShieldOff} title="No roles found" body="Try adjusting your filters." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-16 text-xs">Sl No</TableHead>
                  <TableHead className="text-xs">Role Code</TableHead>
                  <TableHead className="text-xs">Role Name</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">Access</TableHead>
                  <TableHead className="text-xs">Assigned Users</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shownRoles.map((r, i) => (
                  <TableRow key={r.roleId} className="hover:bg-muted/30">
                    <TableCell className="text-sm tabular-nums text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <button type="button" className="font-mono text-xs font-semibold text-primary hover:underline" onClick={() => setProfile({ role: r, tab: 'overview' })}>{r.code}</button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', TONE[ACCESS_TONE[r.access]].tile)}>
                          <ShieldCheck aria-hidden="true" className="size-4" />
                        </span>
                        <span className="font-semibold text-foreground">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px] text-sm text-muted-foreground"><span className="line-clamp-2" title={r.description || undefined}>{r.description}</span></TableCell>
                    <TableCell><Pill tone={ACCESS_TONE[r.access]}>{ACCESS_LABEL[r.access]}</Pill></TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted/80"
                        onClick={() => setProfile({ role: r, tab: 'users' })}
                      >
                        <Users2 aria-hidden="true" className="size-3.5" /> {countsKnown ? r.users : '—'} Users
                      </button>
                    </TableCell>
                    <TableCell><Pill tone="primary">System Role</Pill></TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="size-8" title="View" aria-label={`View ${r.name}`} onClick={() => setProfile({ role: r, tab: 'overview' })}>
                        <Eye aria-hidden="true" className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="text-base font-semibold">Admin permission grants ({shownGrants.length})</h2>
            <p className="text-xs text-muted-foreground">
              Counsellors, Associates and Instructors are managed under their own sections — their access is role-based, not per-permission.
            </p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-[240px_160px]">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="Search admins" className="h-9 pl-9 text-sm" placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <FilterSelect label="Role" value={roleFilter} onChange={setRoleFilter} allLabel="All Roles" options={[{ value: '1', label: 'Super Admin' }, { value: '8', label: 'Admin' }]} />
          </div>
        </div>
        <AdminGrantsTable
          rows={shownGrants}
          totalPermissions={totalPermissions}
          onManage={openManage}
          emptyTitle={grants.length === 0 ? 'No admin users.' : 'No admins match your filters.'}
        />
      </Card>

      <RoleProfileDialog
        role={profile?.role ?? null}
        initialTab={profile?.tab ?? 'overview'}
        grants={grants}
        totalPermissions={totalPermissions}
        countsKnown={countsKnown}
        api={api}
        token={session.token}
        onClose={() => setProfile(null)}
        onManage={openManage}
        onNavigate={onNavigate}
      />
    </div>
  );
}
