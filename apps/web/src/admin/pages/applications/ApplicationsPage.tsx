import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Eye, FileText, Inbox, Pencil, Plus, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle } from '../../shared/components/ui-kit.js';
import { StageBadge } from './StageBadge.js';
import {
  EMPTY_LIST_FILTERS,
  STAGE_TABS,
  exportTable,
  filterApplications,
  initials,
  presetFromDate,
  sortApplications,
  stageCounts,
  toApplicationRows,
  type ApplicationFilters,
  type ApplicationRow,
  type ApplicationSortKey,
  type DateRange,
} from './application-list-model.js';

// Learner Management → Applications (TTII 2026-10-12), rebuilt after Naji's
// ApplicationsModule: stage pills with counts, a filter card, a sortable paged
// table with row selection, and CSV export of the selection or the filtered list.
//
// One source of truth: rows AND pill counts both come from
// /admin/applications/index (listAdminApplications), with the stage applied
// client-side. The old page showed listLeads rows on a stage tab while counting
// from this endpoint, so a stage tab ignored the date / pipeline / status
// filters and its count could disagree with its table. The old page passed
// pipelineUserId to loadApplications, but neither the API client nor the
// endpoint used it, so that filter did nothing; it now filters rows by owner.

const PAGE_SIZE = 10;
const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';
const PIPELINE_OPTIONS = [
  { label: 'Senders', value: 'senders' },
  { label: 'Counsellors', value: '9' },
  { label: 'Student Referral', value: 'student_referral' },
  { label: 'Associates', value: '10' },
];
const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

interface ServerFilters { range: DateRange; fromDate: string; toDate: string; courseId: string; pipelineRoleId: string; status: string }
const EMPTY_SERVER: ServerFilters = { range: 'all', fromDate: '', toDate: '', courseId: '', pipelineRoleId: '', status: '' };

function PillTab({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground',
      )}
    >
      {label}
      <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', active ? 'bg-white/20' : 'bg-muted text-muted-foreground')}>{count}</span>
    </button>
  );
}

function SortHead({
  label, k, sortKey, dir, onSort,
}: { label: string; k: ApplicationSortKey; sortKey: ApplicationSortKey; dir: 'asc' | 'desc'; onSort: (k: ApplicationSortKey) => void }) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(k)} className={cn('inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium hover:text-foreground', active ? 'text-foreground' : 'text-muted-foreground')}>
        {label} <Icon aria-hidden="true" className="size-3" />
      </button>
    </TableHead>
  );
}

function ApplicationTableRow({
  row, index, selected, showStage, onSelect, onView, onEdit,
}: {
  row: ApplicationRow; index: number; selected: boolean; showStage: boolean;
  onSelect: (v: boolean) => void; onView: () => void; onEdit: () => void;
}) {
  return (
    <TableRow className="group cursor-pointer hover:bg-muted/30" onClick={onView}>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={(v) => onSelect(v === true)} aria-label={`Select ${row.name || row.applicationId}`} />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{String(index).padStart(2, '0')}</TableCell>
      <TableCell>
        <button type="button" onClick={(e) => { e.stopPropagation(); onView(); }} className="whitespace-nowrap font-mono text-xs font-medium text-primary hover:underline">
          {row.applicationId || '—'}
        </button>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{row.dateLabel || '—'}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {row.image ? <img src={row.image} alt="" className="size-full object-cover" loading="lazy" /> : initials(row.name)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{row.name || '—'}</p>
            {row.location ? <p className="text-[11px] text-muted-foreground">{row.location}</p> : null}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm font-medium">{row.course || '—'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.offering || '—'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.combination || '—'}</TableCell>
      <TableCell>
        <p className="whitespace-nowrap text-xs font-medium">{row.phone || '—'}</p>
        <p className="text-[11px] text-muted-foreground">{row.email}</p>
      </TableCell>
      <TableCell className="text-sm">{row.pipeline || '—'}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.owner || '—'}</TableCell>
      {showStage ? <TableCell><StageBadge stage={row.stage} /></TableCell> : null}
      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
        <div className="inline-flex items-center gap-1">
          <Button size="icon" variant="ghost" className="size-8" title="View" aria-label={`View ${row.name || row.applicationId}`} onClick={onView}>
            <Eye aria-hidden="true" className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" className="size-8" title="Edit" aria-label={`Edit ${row.name || row.applicationId}`} onClick={onEdit}>
            <Pencil aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function ApplicationsPage({ api, session, onNavigate }: AdminPageProps) {
  const [server, setServer] = useState<ServerFilters>(EMPTY_SERVER);
  // Default to 'lead' — the first stage and the natural starting point.
  const [filters, setFilters] = useState<ApplicationFilters>(EMPTY_LIST_FILTERS);
  const [sortKey, setSortKey] = useState<ApplicationSortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fromDate = server.range === 'custom' ? server.fromDate : presetFromDate(server.range, new Date());
  const toDate = server.range === 'custom' ? server.toDate : '';
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadApplications(session.token, {
      ...(fromDate ? { fromDate } : {}),
      ...(toDate ? { toDate } : {}),
      ...(server.courseId ? { courseId: server.courseId } : {}),
      ...(server.pipelineRoleId ? { pipelineRoleId: server.pipelineRoleId } : {}),
      ...(server.status ? { status: server.status } : {}),
    }),
    [fromDate, toDate, server.courseId, server.pipelineRoleId, server.status],
  );
  const { data: pipelineUsersData } = useAdminPageData(() => api.loadPipelineUsers(session.token, 9), []);

  const rows = useMemo(() => toApplicationRows(data?.items ?? []), [data]);
  const courses = useMemo(() => (data?.courses ?? []).filter((c) => c.id && c.title), [data]);
  const offerings = useMemo(() => [...new Set(rows.map((r) => r.offering).filter(Boolean))].sort(), [rows]);
  const pipelineUsers = useMemo(
    () => (Array.isArray(pipelineUsersData) ? pipelineUsersData : []).map((u) => ({ id: asString(u.id), name: asString(u.name) })).filter((u) => u.id),
    [pipelineUsersData],
  );
  const counts = useMemo(() => stageCounts(filterApplications(rows, { ...filters, stage: 'all' })), [rows, filters]);
  const filtered = useMemo(() => sortApplications(filterApplications(rows, filters), sortKey, sortDir), [rows, filters, sortKey, sortDir]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const showStage = filters.stage === 'all';

  const setList = (patch: Partial<ApplicationFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const setSrv = (patch: Partial<ServerFilters>) => { setServer((s) => ({ ...s, ...patch })); setPage(1); };
  const clearFilters = () => { setServer(EMPTY_SERVER); setFilters((f) => ({ ...EMPTY_LIST_FILTERS, stage: f.stage })); setPage(1); };
  const onSort = (k: ApplicationSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const view = (r: ApplicationRow) => onNavigate(`/admin/applications/view/${r.id}`);
  const edit = (r: ApplicationRow) => onNavigate(`/admin/applications/edit/${r.id}`);
  const toggle = (id: string, on: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    if (on) next.add(id); else next.delete(id);
    return next;
  });
  const allOnPage = current.length > 0 && current.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    for (const r of current) { if (allOnPage) next.delete(r.id); else next.add(r.id); }
    return next;
  });
  const selectedRows = filtered.filter((r) => selected.has(r.id));
  const exportCsv = () => downloadCsv('applications.csv', toCsv(exportTable(selectedRows.length > 0 ? selectedRows : filtered)));

  if (loading && !data) return <PageLoader label="Loading applications..." />;
  if (error && !data) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  const thisYear = new Date().getFullYear();
  const stageCount = STAGE_TABS.length - 1;
  return (
    <div className="space-y-6">
      <PageTitle
        title="Applications"
        subtitle={`${filtered.length} application${filtered.length === 1 ? '' : 's'} across ${stageCount} pipeline stages`}
        actions={(
          <>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={exportCsv}>
              <FileText aria-hidden="true" className="size-4" /> {selectedRows.length > 0 ? `Export (${selectedRows.length})` : 'Export'}
            </Button>
            {/* Naji 2026-05-07 — the longer multi-tab form stays one click away. */}
            <Button variant="outline" size="sm" onClick={() => onNavigate('/admin/applications/add')}>
              Add Application (full form)
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => onNavigate('/admin/leads/add')}>
              <Plus aria-hidden="true" className="size-4" /> Add Lead
            </Button>
          </>
        )}
      />

      <div role="group" aria-label="Pipeline stage" className="flex flex-wrap gap-2">
        {STAGE_TABS.map((t) => (
          <PillTab key={t.id} active={filters.stage === t.id} label={t.label} count={counts[t.id]} onClick={() => setList({ stage: t.id })} />
        ))}
      </div>

      <Card className="gap-0 p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search applications" placeholder="Search by name, ID, email or phone…" className="pl-9" value={filters.search} onChange={(e) => setList({ search: e.target.value })} />
          </div>
          <select aria-label="Course" value={server.courseId} onChange={(e) => setSrv({ courseId: e.target.value })} className={SELECT_CLASS}>
            <option value="">All Courses</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select aria-label="Offering" value={filters.offering} onChange={(e) => setList({ offering: e.target.value })} className={SELECT_CLASS}>
            <option value="">All Offerings</option>
            {offerings.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select aria-label="Stage" value={filters.stage} onChange={(e) => setList({ stage: e.target.value as ApplicationFilters['stage'] })} className={SELECT_CLASS}>
            {STAGE_TABS.map((t) => <option key={t.id} value={t.id}>{t.id === 'all' ? 'All Stages' : t.label}</option>)}
          </select>
          <select aria-label="Pipeline" value={server.pipelineRoleId} onChange={(e) => setSrv({ pipelineRoleId: e.target.value })} className={SELECT_CLASS}>
            <option value="">All Pipelines</option>
            {PIPELINE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select aria-label="Pipeline user" value={filters.pipelineUserId} onChange={(e) => setList({ pipelineUserId: e.target.value })} className={SELECT_CLASS}>
            <option value="">All Pipeline Users</option>
            {pipelineUsers.map((u) => <option key={u.id} value={u.id}>{u.name || `User ${u.id}`}</option>)}
          </select>
          <select aria-label="Status" value={server.status} onChange={(e) => setSrv({ status: e.target.value })} className={SELECT_CLASS}>
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select aria-label="Application date" value={server.range} onChange={(e) => setSrv({ range: e.target.value as DateRange })} className={SELECT_CLASS}>
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="custom">Custom range…</option>
          </select>
          {server.range === 'custom' ? (
            <>
              <DmyDateInput value={server.fromDate} onChange={(v) => setSrv({ fromDate: v })} placeholder="From dd/mm/yyyy" minYear={thisYear - 6} maxYear={thisYear} />
              <DmyDateInput value={server.toDate} onChange={(v) => setSrv({ toDate: v })} placeholder="To dd/mm/yyyy" minYear={thisYear - 6} maxYear={thisYear} />
            </>
          ) : null}
          <Button variant="outline" size="sm" className="h-9" onClick={clearFilters}>Clear filters</Button>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden p-0 shadow-sm" aria-busy={loading}>
        {current.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={rows.length === 0 ? 'No applications yet.' : 'No applications match your filters.'}
            action={rows.length === 0
              ? <Button size="sm" onClick={() => onNavigate('/admin/leads/add')}>Add the first lead</Button>
              : <Button variant="outline" size="sm" onClick={() => { clearFilters(); setList({ stage: 'all' }); }}>Clear filters</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10">
                    <Checkbox checked={allOnPage} onCheckedChange={toggleAll} aria-label="Select all on this page" />
                  </TableHead>
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <SortHead label="Application ID" k="applicationId" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Date" k="date" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Student" k="name" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Course" k="course" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Offering" k="offering" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Certificate Combination" k="combination" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Contact" k="phone" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Pipeline" k="pipeline" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Owner" k="owner" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  {showStage ? <SortHead label="Stage" k="stage" sortKey={sortKey} dir={sortDir} onSort={onSort} /> : null}
                  <TableHead className="text-right text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((r, i) => (
                  <ApplicationTableRow
                    key={r.id}
                    row={r}
                    index={(page - 1) * PAGE_SIZE + i + 1}
                    selected={selected.has(r.id)}
                    showStage={showStage}
                    onSelect={(v) => toggle(r.id, v)}
                    onView={() => view(r)}
                    onEdit={() => edit(r)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{current.length}</span> of{' '}
            <span className="font-medium text-foreground">{filtered.length}</span> applications
            {selectedRows.length > 0 ? <> · <span className="font-medium text-foreground">{selectedRows.length}</span> selected</> : null}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft aria-hidden="true" className="size-4" /> Prev
            </Button>
            <span className="px-2 text-xs text-muted-foreground">Page {page} of {pages}</span>
            <Button variant="outline" size="sm" className="gap-1" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
              Next <ChevronRight aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
