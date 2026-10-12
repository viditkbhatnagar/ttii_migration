import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Download, Eye, History, MoreHorizontal, Pencil, Plus, Search, Target, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, KpiTile, PageTitle, Pill } from '../../shared/components/ui-kit.js';
import { TONE } from '../../shared/components/ui-tones.js';
import { FilterSelect, ListPager, SortHead } from '../students/list-chrome.js';
import { serverResult } from '../students/student-view/student-view-model.js';
import {
  EMPTY_TARGET_FILTERS, PHASE_TONE, TARGET_TYPES, TYPE_TONE, filterTargets, monthLabel, progressTone, sortTargets,
  targetCounts, targetCsvRows, targetMonths, toTargetRows, withoutActiveTarget,
  type TargetFilters, type TargetRow, type TargetSortKey, type TargetTab,
} from './counsellor-target-model.js';
import { initialsOf, todayIstYmd } from './staff-model.js';
import { TargetFormDialog, TargetViewDialog, type TargetDialogState } from './target-dialogs.js';

// Admin → Counsellors → Counsellor Target, rebuilt after Naji's TargetsModule
// (TTII 2026-10-12): KPI tiles that filter (Total / Active / Ended / without a
// current target), a filter card, a sortable paged table with progress bars,
// CSV export, View, and the Assign / Edit dialog. Every action of the old page
// survives with the same payload: Add (now "Assign Target"), Edit, Delete
// (confirm). Its Total Target / Achieved / Overall Progress summary now heads
// the table for the filtered rows. The prototype's Active / Inactive status
// has no column; a target's state comes from its month against today (IST).

const PAGE_SIZE = 10;

export default function CounsellorTargetPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const { data, loading, error, reload } = useAdminPageData(() => api.loadCounsellorTargets(session.token), []);
  const [counsellorRecords, setCounsellorRecords] = useState<Record<string, unknown>[]>([]);
  const [filters, setFilters] = useState<TargetFilters>(EMPTY_TARGET_FILTERS);
  const [sortKey, setSortKey] = useState<TargetSortKey>('month');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<TargetDialogState>(null);
  const [viewing, setViewing] = useState<TargetRow | null>(null);

  useEffect(() => {
    api.loadCounsellors(session.token)
      .then((list) => setCounsellorRecords(Array.isArray(list) ? list : []))
      .catch(() => setCounsellorRecords([]));
  }, [api, session.token]);

  const today = todayIstYmd();
  const rows = useMemo(() => toTargetRows(data ?? [], today), [data, today]);
  const counsellors = useMemo(() => counsellorRecords.map((c) => ({
    id: asString(c.id) || asString(c._id),
    name: asString(c.name) || asString(c.full_name) || asString(c.user_email) || asString(c.email),
    email: asString(c.user_email),
    centre: asString(c.centre_name),
  })), [counsellorRecords]);
  const noTarget = useMemo(() => withoutActiveTarget(counsellors, rows), [counsellors, rows]);

  const counts = useMemo(() => targetCounts(filterTargets(rows, { ...filters, tab: 'all' })), [rows, filters]);
  const filtered = useMemo(() => sortTargets(filterTargets(rows, filters), sortKey, sortDir), [rows, filters, sortKey, sortDir]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const months = useMemo(() => targetMonths(rows), [rows]);
  const totals = useMemo(() => {
    const target = filtered.reduce((s, r) => s + r.value, 0);
    const achieved = filtered.reduce((s, r) => s + r.achieved, 0);
    return { target, achieved, pct: target > 0 ? Math.round((achieved / target) * 100) : 0 };
  }, [filtered]);

  const set = (patch: Partial<TargetFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_TARGET_FILTERS); setPage(1); };
  const toggleTab = (tab: TargetTab) => set({ tab: filters.tab === tab ? 'all' : tab });
  const onSort = (k: TargetSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const [year, month] = today.split('-');
  const assign = (presetUserId?: string) => setDialog({
    mode: 'add', presetMonth: month ?? '', presetYear: year ?? '', ...(presetUserId ? { presetUserId } : {}),
  });

  const handleDelete = useCallback(async (row: TargetRow) => {
    if (!row.id) return;
    if (!(await confirm({
      title: 'Delete this target?',
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return;
    try {
      const res = await api.deleteCounsellorTarget(session.token, row.id);
      const { ok, message } = serverResult(res, 'Target deleted.', 'Failed to delete target');
      if (ok) toast.success(message); else toast.error(message);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete target');
    }
  }, [api, session.token, confirm, reload]);

  if (loading && !data) return <PageLoader label="Loading counsellor target..." />;
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

  const showNoTarget = filters.tab === 'none';

  return (
    <div className="space-y-6">
      <PageTitle
        title="Counsellor Target"
        subtitle="Manage and monitor counsellor targets."
        actions={(
          <>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={() => downloadCsv('counsellor_targets.csv', toCsv(targetCsvRows(filtered)))}>
              <Download aria-hidden="true" className="size-4" /> Export
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => assign()}>
              <Plus aria-hidden="true" className="size-4" /> Assign Target
            </Button>
          </>
        )}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label="Total Targets" value={counts.all} icon={Target} tone="primary" active={filters.tab === 'all'} onClick={() => set({ tab: 'all' })} />
        <KpiTile label="Active Targets (this month)" value={counts.Active} icon={CheckCircle2} tone="emerald" active={filters.tab === 'Active'} onClick={() => toggleTab('Active')} />
        <KpiTile label="Ended Targets" value={counts.Ended} icon={History} tone="slate" active={filters.tab === 'Ended'} onClick={() => toggleTab('Ended')} />
        <KpiTile label="Counsellors w/o Active Target" value={noTarget.length} icon={UserX} tone="amber" active={showNoTarget} onClick={() => toggleTab('none')} />
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_200px_170px_160px_150px_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search targets" placeholder="Search counsellor, type or remarks…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <FilterSelect label="Counsellor" value={filters.counsellor} onChange={(v) => set({ counsellor: v })} allLabel="All Counsellors" options={counsellors.map((c) => ({ value: c.id, label: c.name }))} />
          <FilterSelect label="Month" value={filters.month} onChange={(v) => set({ month: v })} allLabel="All Months" options={months} />
          <FilterSelect label="Type" value={filters.type} onChange={(v) => set({ type: v })} allLabel="All Types" options={TARGET_TYPES.map((t) => ({ value: t, label: t }))} />
          <FilterSelect
            label="State"
            value={filters.tab === 'all' || filters.tab === 'none' ? '' : filters.tab}
            onChange={(v) => set({ tab: (v || 'all') as TargetTab })}
            allLabel="All States"
            options={[{ value: 'Active', label: 'Active' }, { value: 'Upcoming', label: 'Upcoming' }, { value: 'Ended', label: 'Ended' }]}
          />
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>Clear filters</Button>
          </div>
        </div>
      </Card>

      {showNoTarget ? (
        <NoTargetTable counsellors={noTarget} onAssign={assign} onClear={() => set({ tab: 'all' })} />
      ) : (
        <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{filtered.length} target{filtered.length === 1 ? '' : 's'}</p>
            <p className="text-xs text-muted-foreground">
              Total target <span className="font-semibold text-foreground">{totals.target}</span> · Achieved{' '}
              <span className="font-semibold text-foreground">{totals.achieved}</span> · Overall{' '}
              <span className={cn('font-semibold', TONE[progressTone(totals.pct)].text)}>{totals.pct}%</span>
            </p>
          </div>
          {current.length === 0 ? (
            <EmptyState
              icon={Target}
              title={rows.length === 0 ? 'No targets yet.' : 'No targets match your filters.'}
              {...(rows.length === 0
                ? { body: 'Assign a monthly target to a counsellor to track it here.', action: <Button size="sm" onClick={() => assign()}>Assign Target</Button> }
                : { action: <Button variant="outline" size="sm" onClick={reset}>Clear filters</Button> })}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-10 text-xs">#</TableHead>
                    <SortHead label="Target Month" k="month" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                    <SortHead label="Target Type" k="type" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                    <SortHead label="Counsellor" k="counsellor" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                    <SortHead label="Target" k="value" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                    <SortHead label="Achieved" k="achieved" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                    <SortHead label="Progress" k="progress" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                    <SortHead label="State" k="phase" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                    <TableHead className="text-right text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {current.map((t, i) => (
                    <TableRow key={t.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground">{String((page - 1) * PAGE_SIZE + i + 1).padStart(2, '0')}</TableCell>
                      <TableCell>
                        <p className="whitespace-nowrap text-sm font-semibold">{monthLabel(t.monthKey) || '—'}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">#{t.id}</p>
                      </TableCell>
                      <TableCell><Pill tone={TYPE_TONE[t.type] ?? 'slate'}>{t.type || '—'}</Pill></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initialsOf(t.counsellor)}</span>
                          <div className="min-w-0">
                            <p className="max-w-[200px] truncate text-sm font-semibold">{t.counsellor || '—'}</p>
                            <p className="max-w-[200px] truncate text-[11px] text-muted-foreground">{t.counsellorEmail}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">{t.value}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{t.achieved}</TableCell>
                      <TableCell><Progress pct={t.pct} /></TableCell>
                      <TableCell>{t.phase ? <Pill tone={PHASE_TONE[t.phase]}>{t.phase}</Pill> : '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-0.5">
                          <Button size="icon" variant="ghost" className="size-8" title="View target" aria-label={`View target #${t.id}`} onClick={() => setViewing(t)}>
                            <Eye aria-hidden="true" className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-8" title="Edit target" aria-label={`Edit target #${t.id}`} onClick={() => setDialog({ mode: 'edit', row: t })}>
                            <Pencil aria-hidden="true" className="size-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="size-8" title="More" aria-label={`More actions for target #${t.id}`}>
                                <MoreHorizontal aria-hidden="true" className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { void handleDelete(t); }}>Delete</DropdownMenuItem>
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
          <ListPager page={page} pages={pages} shown={current.length} total={filtered.length} noun="targets" onPage={setPage} />
        </Card>
      )}

      <TargetFormDialog state={dialog} counsellors={counsellors} api={api} token={session.token} onClose={() => setDialog(null)} onSaved={reload} />
      <TargetViewDialog row={viewing} onClose={() => setViewing(null)} onEdit={(row) => { setViewing(null); setDialog({ mode: 'edit', row }); }} />
    </div>
  );
}

function Progress({ pct }: { pct: number }) {
  const tone = progressTone(pct);
  const bar = tone === 'emerald' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className={cn('h-full rounded-full', bar)} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
      <span className={cn('w-10 text-xs font-semibold tabular-nums', TONE[tone].text)}>{pct}%</span>
    </div>
  );
}

function NoTargetTable({ counsellors, onAssign, onClear }: {
  counsellors: Array<{ id: string; name: string; email: string; centre: string }>;
  onAssign: (userId: string) => void;
  onClear: () => void;
}) {
  return (
    <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{counsellors.length} counsellor{counsellors.length === 1 ? '' : 's'} without a target this month</p>
        <Button size="sm" variant="ghost" className="h-7" onClick={onClear}>Show all targets</Button>
      </div>
      {counsellors.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Every counsellor has a target this month." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 text-xs">#</TableHead>
                <TableHead className="text-xs">Counsellor</TableHead>
                <TableHead className="text-xs">Centre</TableHead>
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counsellors.map((c, i) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</TableCell>
                  <TableCell>
                    <p className="text-sm font-semibold">{c.name || '—'}</p>
                    <p className="text-[11px] text-muted-foreground">{c.email}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.centre || '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => onAssign(c.id)}>
                      <Plus aria-hidden="true" className="size-3.5" /> Assign
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
