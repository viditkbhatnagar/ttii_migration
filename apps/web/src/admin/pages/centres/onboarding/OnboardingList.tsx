import { useEffect, useMemo, useState } from 'react';
import {
  Award, Building2, CheckCircle2, ClipboardCheck, Eye, FileSignature, Hourglass, MoreVertical, Pencil, RotateCcw,
  Search, Send, Upload, UserPlus, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KpiTile, PageTitle } from '../../../shared/components/ui-kit.js';
import { FilterSelect, ListPager, PillTab, SortHead } from '../../students/list-chrome.js';
import {
  DEFAULT_ONB_FILTERS, SOURCE_OPTIONS, STAGE_TABS, filterOnboarding, fmtDate, locationOf, onboardingKpis, rowStageAction,
  sortOnboarding, stageCounts, stateOptions,
  type OnbFilters, type OnbList, type OnbRow, type OnbSortKey, type RowAction, type SortDir,
} from './onboarding-model.js';
import { AgeingBadge, NotSetUpNotice, StageBadge } from './onboarding-ui.js';

// Centre Onboarding list (Naji's CentreOnboardingModule): KPI tiles, stage
// pills with counts, search + State + Source filters, the sortable table
// (page size 8) and the ⋮ menu: View, Edit, and the stage action.

const PAGE_SIZE = 8;
const ACTION_ICON: Record<RowAction, typeof Send> = { send: Send, resend: RotateCcw, agreement: Upload, certificate: Award, reopen: RotateCcw };

export interface ListHandlers {
  onAdd: () => void;
  onView: (row: OnbRow) => void;
  onEdit: (row: OnbRow) => void;
  onStageAction: (row: OnbRow, action: RowAction) => void;
}

export function OnboardingList({ list, handlers }: { list: OnbList; handlers: ListHandlers }) {
  const [filters, setFilters] = useState<OnbFilters>(DEFAULT_ONB_FILTERS);
  const [sortKey, setSortKey] = useState<OnbSortKey>('created');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  const counts = useMemo(() => stageCounts(list.records), [list]);
  const kpis = useMemo(() => onboardingKpis(list.records, list.today), [list]);
  const states = useMemo(() => stateOptions(list.records), [list]);
  const rows = useMemo(
    () => sortOnboarding(filterOnboarding(list.records, filters), sortKey, sortDir, list.today),
    [list, filters, sortKey, sortDir],
  );
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const set = (patch: Partial<OnbFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const onSort = (k: OnbSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const head = (label: string, k: OnbSortKey) => <SortHead label={label} k={k} sortKey={sortKey} dir={sortDir} onSort={onSort} />;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Centres</p>
        <PageTitle
          title="Centre Onboarding"
          subtitle="Take prospective centres from first contact to affiliation."
          actions={(
            <Button size="sm" className="gap-1.5" disabled={!list.ready} onClick={handlers.onAdd}>
              <UserPlus aria-hidden="true" className="size-4" /> Add Centre Lead
            </Button>
          )}
        />
      </div>

      {!list.ready ? <NotSetUpNotice message={list.message} /> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <KpiTile icon={Users} label="Leads" value={kpis.leads} tone="blue" active={filters.tab === 'lead'} onClick={() => set({ tab: 'lead' })} />
        <KpiTile icon={Hourglass} label="Awaiting Form" value={kpis.awaitingForm} tone="primary" onClick={() => set({ tab: 'lead' })} />
        <KpiTile icon={ClipboardCheck} label="Under Review" value={kpis.underReview} tone="amber" active={filters.tab === 'under_review'} onClick={() => set({ tab: 'under_review' })} />
        <KpiTile icon={FileSignature} label="Awaiting Agreement" value={kpis.awaitingAgreement} tone="primary" active={filters.tab === 'agreement_pending'} onClick={() => set({ tab: 'agreement_pending' })} />
        <KpiTile icon={CheckCircle2} label="Onboarded this month" value={kpis.onboardedThisMonth} tone="emerald" active={filters.tab === 'onboarded'} onClick={() => set({ tab: 'onboarded' })} />
      </div>

      <div role="group" aria-label="Stage" className="flex flex-wrap gap-2">
        {STAGE_TABS.map((t) => (
          <PillTab key={t.id} active={filters.tab === t.id} label={t.label} count={counts[t.id]} onClick={() => set({ tab: t.id })} />
        ))}
      </div>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[minmax(0,1fr)_180px_180px]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search centres" placeholder="Search centre, contact, email…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <FilterSelect label="State" value={filters.state} onChange={(v) => set({ state: v })} allLabel="All States" options={states} />
          <FilterSelect label="Source" value={filters.source} onChange={(v) => set({ source: v })} allLabel="All Sources" options={SOURCE_OPTIONS} />
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 text-xs">#</TableHead>
                {head('ID', 'ref')}
                {head('Centre', 'centre')}
                {head('Contact', 'contact')}
                {head('Location', 'location')}
                {head('Source', 'source')}
                {head('Created', 'created')}
                {head('Stage', 'stage')}
                {head('Ageing', 'age')}
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-12 text-center text-sm text-muted-foreground">
                    <Building2 aria-hidden="true" className="mx-auto mb-2 size-6 text-primary/60" />
                    No centres in this stage.
                  </TableCell>
                </TableRow>
              ) : current.map((r, i) => {
                const stageAction = rowStageAction(r);
                const ActionIcon = stageAction ? ACTION_ICON[stageAction.action] : null;
                return (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs tabular-nums text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs font-semibold text-primary">{r.refNo}</TableCell>
                    <TableCell>
                      <button type="button" onClick={() => handlers.onView(r)} className="max-w-[220px] truncate text-left text-sm font-semibold text-foreground hover:text-primary hover:underline" title={r.centreName}>
                        {r.centreName}
                      </button>
                      {r.centreCode ? <p className="text-[11px] text-muted-foreground">Code {r.centreCode}</p> : null}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{r.contactName}</p>
                      <p className="max-w-[220px] truncate text-[11px] text-muted-foreground">{[r.mobile, r.email].filter(Boolean).join(' · ')}</p>
                    </TableCell>
                    <TableCell className="text-sm">{locationOf(r) || '—'}</TableCell>
                    <TableCell className="text-sm">{r.source || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{fmtDate(r.createdAt)}</TableCell>
                    <TableCell><StageBadge row={r} /></TableCell>
                    <TableCell><AgeingBadge row={r} today={list.today} /></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${r.centreName}`}><MoreVertical aria-hidden="true" className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => handlers.onView(r)}><Eye aria-hidden="true" className="mr-2 size-4" />View</DropdownMenuItem>
                          {r.stage !== 'onboarded' ? <DropdownMenuItem onClick={() => handlers.onEdit(r)}><Pencil aria-hidden="true" className="mr-2 size-4" />Edit</DropdownMenuItem> : null}
                          {stageAction && ActionIcon ? (
                            <DropdownMenuItem onClick={() => handlers.onStageAction(r, stageAction.action)}><ActionIcon aria-hidden="true" className="mr-2 size-4" />{stageAction.label}</DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <ListPager page={page} pages={pages} shown={current.length} total={rows.length} noun="centres" onPage={setPage} />
      </Card>
    </div>
  );
}
