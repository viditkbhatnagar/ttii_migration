import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Eye, Filter, Lock, MoreHorizontal, Pencil, Plus, Power, RefreshCcw, Search, UserCheck, Users2, UserX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, KpiTile, Pill, type Tone } from '../../shared/components/ui-kit.js';
import { istDateTime } from '../../shared/utils/ist-date.js';
import { formatYmd } from '../exam_result/exam-results-model.js';
import { FilterSelect, ListPager, SortHead } from '../students/list-chrome.js';
import { initialsOf } from '../students/students-list-model.js';
import { AdminUserFormDialog } from './AdminUserFormDialog.js';
import { AdminUserViewDialog } from './AdminUserViewDialog.js';
import {
  EMPTY_ADMIN_FILTERS, adminStatusCounts, adminUserCsvRows, filterAdminUsers, sortAdminUsers, toAdminUserRows,
  type AccountStatus, type AccountTab, type AdminRoleFilter, type AdminSortKey, type AdminUserFilters, type AdminUserRow,
} from './admin-users-model.js';

// Admin → Admin Users, rebuilt after Naji's UserManagementModule (TTII
// 2026-10-12): KPI tiles that filter, a filter card (search / role / status /
// created between), a sortable, selectable, paged table and CSV export.
// Super Admins (/admin/admin/index) and Admins (/admin/sub_admin/index) as
// before. Every action of the old page survives with its confirm and toast:
// Create Admin, Edit (with permissions), Enable / Disable, Resend Login Email,
// Delete. "View" now opens a read-only summary with an Edit button.
// NOT copied: Employee ID and Designation (no such columns), Locked accounts
// (we have Disabled instead), Save View, bulk Activate / Deactivate / Unlock
// (new bulk writes — need sign-off).

const PAGE_SIZE = 10;
const STATUS_TONE: Record<AccountStatus, Tone> = { Active: 'emerald', Inactive: 'slate', Disabled: 'rose' };
const ROLE_TONE: Record<number, Tone> = { 1: 'primary', 8: 'blue' };

export default function AdminUsersPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  // Naji asked us to combine the previous "Super Admin" (role 1) and
  // "Admin" (role 8) lists into one unified Admin Users page (2026-04-30).
  const { data, loading, error, reload } = useAdminPageData(
    async () => {
      const [supers, admins] = await Promise.all([
        api.loadAdminUsers(session.token, 1),
        api.loadAdminUsers(session.token, 8),
      ]);
      return { supers, admins };
    },
    [],
  );
  const [lastSignIns, setLastSignIns] = useState<Record<string, string>>({});
  useEffect(() => {
    // Optional enrichment: the list must still work if this is refused.
    api.loadAdminLastSignIns(session.token).then(setLastSignIns).catch(() => setLastSignIns({}));
  }, [api, session.token, data]);

  const [filters, setFilters] = useState<AdminUserFilters>(EMPTY_ADMIN_FILTERS);
  const [sortKey, setSortKey] = useState<AdminSortKey>('created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [viewing, setViewing] = useState<AdminUserRow | null>(null);

  const rows = useMemo(
    () => (data ? toAdminUserRows(data.supers, data.admins, lastSignIns) : []),
    [data, lastSignIns],
  );
  const counts = useMemo(() => adminStatusCounts(rows, filters), [rows, filters]);
  const filtered = useMemo(() => sortAdminUsers(filterAdminUsers(rows, filters), sortKey, sortDir), [rows, filters, sortKey, sortDir]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedRows = filtered.filter((r) => selected.has(r.id));

  const set = (patch: Partial<AdminUserFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_ADMIN_FILTERS); setPage(1); };
  const kpi = (tab: AccountTab) => set({ tab: filters.tab === tab && tab !== 'all' ? 'all' : tab });
  const onSort = (k: AdminSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: AdminUserRow) => { setViewing(null); setEditing(r.raw); setFormOpen(true); };

  const allOnPage = current.length > 0 && current.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allOnPage) current.forEach((r) => next.delete(r.id));
    else current.forEach((r) => next.add(r.id));
    return next;
  });
  const toggleOne = (id: string, on: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    if (on) next.add(id); else next.delete(id);
    return next;
  });
  const exportCsv = (list: AdminUserRow[]) => downloadCsv('admin_users.csv', toCsv(adminUserCsvRows(list, formatYmd, istDateTime)));

  const handleResendCredentials = useCallback(async (row: AdminUserRow) => {
    if (!(await confirm({
      title: `Resend login email to "${row.name}"?`,
      description: 'A new temporary password will be generated and emailed. The user’s previous password will stop working.',
      confirmText: 'Resend',
      variant: 'default',
    }))) return;
    try {
      const res = await api.resendLoginCredentials(session.token, row.id);
      const message = typeof res.message === 'string' ? res.message : 'Login email sent.';
      if (res.status === 1) toast.success(message);
      else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send login email');
    }
  }, [api, session.token, confirm]);

  const handleToggleStatus = useCallback(async (row: AdminUserRow) => {
    if (!row.id) return;
    const name = row.name || 'this user';
    if (!row.isDisabled && !(await confirm({
      title: `Disable ${name}?`,
      description: 'They will be blocked from logging in until you re-enable them.',
      confirmText: 'Disable',
      variant: 'destructive',
    }))) return;
    try {
      await api.toggleUserStatus(session.token, row.id, row.isDisabled);
      toast.success(row.isDisabled ? 'User enabled.' : 'User disabled.');
      setViewing(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  }, [api, session.token, confirm, reload]);

  const handleDelete = useCallback(async (row: AdminUserRow) => {
    if (!row.id) return;
    if (!(await confirm({
      title: `Delete "${row.name}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return;
    try {
      await api.deleteUserAccount(session.token, row.id);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  }, [api, session.token, confirm, reload]);

  if (loading) return <PageLoader label="Loading admin users..." />;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administration</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Admin Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage Super Admin and Admin accounts and their sign-in access.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={() => exportCsv(selectedRows.length ? selectedRows : filtered)}>
            <Download aria-hidden="true" className="size-4" /> Export{selectedRows.length ? ` (${selectedRows.length})` : ''}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus aria-hidden="true" className="size-4" /> Create Admin
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Total Users" value={counts.all} icon={Users2} tone="primary" active={filters.tab === 'all'} onClick={() => kpi('all')} />
        <KpiTile label="Active Users" value={counts.Active} icon={UserCheck} tone="emerald" active={filters.tab === 'Active'} onClick={() => kpi('Active')} />
        <KpiTile label="Inactive Users" value={counts.Inactive} icon={UserX} tone="slate" active={filters.tab === 'Inactive'} onClick={() => kpi('Inactive')} />
        <KpiTile label="Disabled Accounts" value={counts.Disabled} icon={Lock} tone="rose" active={filters.tab === 'Disabled'} onClick={() => kpi('Disabled')} />
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter aria-hidden="true" className="size-4 text-muted-foreground" /> Filters
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={reset}>
            <RefreshCcw aria-hidden="true" className="size-3.5" /> Reset Filters
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_170px_170px]">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search users" className="h-9 pl-9 text-sm" placeholder="Search by name, email or phone" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <FilterSelect
            label="Role"
            value={filters.role}
            onChange={(v) => set({ role: v as AdminRoleFilter })}
            allLabel="All Roles"
            options={[{ value: '1', label: 'Super Admin' }, { value: '8', label: 'Admin' }]}
          />
          <FilterSelect
            label="Account status"
            value={filters.tab === 'all' ? '' : filters.tab}
            onChange={(v) => set({ tab: (v || 'all') as AccountTab })}
            allLabel="All Status"
            options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }, { value: 'Disabled', label: 'Disabled' }]}
          />
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:max-w-xl">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Created from</span>
            <DmyDateInput value={filters.from} onChange={(v) => set({ from: v })} />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">Created to</span>
            <DmyDateInput value={filters.to} onChange={(v) => set({ to: v })} />
          </div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
          {filtered.length} user{filtered.length === 1 ? '' : 's'}
          {selected.size > 0 ? (
            <>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{selected.size} selected</span>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>Clear</Button>
            </>
          ) : null}
        </div>
        {current.length === 0 ? (
          <EmptyState
            icon={Users2}
            title={rows.length === 0 ? 'No admin users yet.' : 'No users found.'}
            {...(rows.length === 0
              ? { action: <Button size="sm" onClick={openCreate}>Create Admin</Button> }
              : { body: 'Try adjusting your filters or clearing them.', action: <Button variant="outline" size="sm" onClick={reset}>Reset filters</Button> })}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10">
                    <Checkbox aria-label="Select all on this page" checked={allOnPage} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="w-12 text-xs">Sl No</TableHead>
                  <SortHead label="User" k="name" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Mobile" k="phone" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Role" k="role" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Created" k="created" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Last Sign-in" k="lastSignIn" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Status" k="status" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((r, i) => (
                  <TableRow key={`${r.roleId}-${r.id}`} className="hover:bg-muted/30" data-state={selected.has(r.id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onCheckedChange={(v) => toggleOne(r.id, v === true)} />
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 shrink-0">
                          {r.photo ? <AvatarImage src={r.photo} alt="" loading="lazy" /> : null}
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initialsOf(r.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <button type="button" className="block max-w-[220px] truncate text-left text-sm font-semibold text-foreground hover:text-primary hover:underline" onClick={() => setViewing(r)}>
                            {r.name || '—'}
                          </button>
                          <p className="max-w-[220px] truncate text-xs text-muted-foreground">{r.email || 'No email'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{r.phone || '—'}</TableCell>
                    <TableCell><Pill tone={ROLE_TONE[r.roleId] ?? 'slate'}>{r.roleLabel}</Pill></TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatYmd(r.created) || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{istDateTime(r.lastSignIn) || 'Never'}</TableCell>
                    <TableCell><Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill></TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="size-8" title="View" aria-label={`View ${r.name}`} onClick={() => setViewing(r)}>
                          <Eye aria-hidden="true" className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8" title="Edit" aria-label={`Edit ${r.name}`} onClick={() => openEdit(r)}>
                          <Pencil aria-hidden="true" className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={cn('size-8', r.isDisabled ? 'text-emerald-600 hover:text-emerald-700' : 'text-rose-600 hover:text-rose-700')}
                          title={r.isDisabled ? 'Enable' : 'Disable'}
                          aria-label={`${r.isDisabled ? 'Enable' : 'Disable'} ${r.name}`}
                          onClick={() => { void handleToggleStatus(r); }}
                        >
                          <Power aria-hidden="true" className="size-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-8" title="More" aria-label={`More actions for ${r.name}`}>
                              <MoreHorizontal aria-hidden="true" className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => { void handleResendCredentials(r); }}>Resend Login Email</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { void handleDelete(r); }}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <ListPager page={page} pages={pages} shown={current.length} total={filtered.length} noun="users" onPage={setPage} />
      </Card>

      <AdminUserViewDialog
        user={viewing}
        onClose={() => setViewing(null)}
        onEdit={openEdit}
        onToggle={(u) => { void handleToggleStatus(u); }}
      />
      <AdminUserFormDialog
        open={formOpen}
        editing={editing}
        api={api}
        token={session.token}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
      />
    </div>
  );
}
