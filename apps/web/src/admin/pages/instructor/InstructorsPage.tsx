import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Download, Eye, GraduationCap, Mail, MoreHorizontal, Pencil, Plus, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { toRecords } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle, Pill } from '../../shared/components/ui-kit.js';
import { formatYmd } from '../exam_result/exam-results-model.js';
import { FilterSelect, ListPager, PillTab, SortHead } from '../students/list-chrome.js';
import { initialsOf } from '../students/students-list-model.js';
import { InstructorFormDialog } from './InstructorFormDialog.js';
import {
  EMPTY_INSTRUCTOR_FILTERS, INSTRUCTOR_STATUS_TONE, filterInstructors, instructorCsvRows, instructorTabCounts,
  qualificationOptions, sortInstructors, toInstructorRows,
  type CohortFilter, type InstructorFilters, type InstructorRow, type InstructorSortKey,
  type InstructorTab, type JoinedRange,
} from './instructor-list-model.js';
import { useInstructorActions } from './useInstructorActions.js';

// Admin → Instructors Directory, rebuilt after Naji's InstructorsModule
// (TTII 2026-10-12): status pills, a filter card (search / qualification /
// cohorts / status / joined), a sortable, selectable, paged table, CSV export
// of the selection or the filtered list, and a detail page per instructor.
// Every action of the old page survives with its confirm and toast: Add, Edit,
// Resend Login Email, Enable / Disable, Delete and Change Device. "View" now
// opens the instructor's page (it used to open the edit form).
// NOT copied: bulk Activate / Deactivate (a new bulk write — needs sign-off).

const PAGE_SIZE = 10;
const TABS: Array<{ id: InstructorTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'Active', label: 'Active' },
  { id: 'Inactive', label: 'Inactive' },
  { id: 'Disabled', label: 'Disabled' },
];
const RANGES: Array<{ value: JoinedRange; label: string }> = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];
const dash = (v: string) => v || '—';

export default function InstructorsPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(() => api.loadInstructors(session.token), []);
  const actions = useInstructorActions(api, session.token, reload);

  const [filters, setFilters] = useState<InstructorFilters>(EMPTY_INSTRUCTOR_FILTERS);
  const [sortKey, setSortKey] = useState<InstructorSortKey>('joined');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  const rows = useMemo(() => toInstructorRows(toRecords(data)), [data]);
  const counts = useMemo(() => instructorTabCounts(rows, filters), [rows, filters]);
  const filtered = useMemo(() => sortInstructors(filterInstructors(rows, filters), sortKey, sortDir), [rows, filters, sortKey, sortDir]);
  const qualifications = useMemo(() => qualificationOptions(rows).map((q) => ({ value: q, label: q })), [rows]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const set = (patch: Partial<InstructorFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_INSTRUCTOR_FILTERS); setPage(1); };
  const onSort = (k: InstructorSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const view = (id: string) => onNavigate(`/admin/instructor/view/${id}`);
  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: InstructorRow) => { setEditing(r.raw); setFormOpen(true); };

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

  const exportCsv = (list: InstructorRow[]) => downloadCsv('instructors.csv', toCsv(instructorCsvRows(list, formatYmd)));
  const selectedRows = filtered.filter((r) => selected.has(r.id));

  if (loading) return <PageLoader label="Loading instructors..." />;
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
      <PageTitle
        title="Instructors"
        subtitle={`${filtered.length} of ${rows.length} instructors`}
        actions={(
          <>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={() => exportCsv(selectedRows.length ? selectedRows : filtered)}>
              <Download aria-hidden="true" className="size-4" /> Export{selectedRows.length ? ` (${selectedRows.length})` : ''}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={openAdd}>
              <Plus aria-hidden="true" className="size-4" /> Add Instructor
            </Button>
          </>
        )}
      />

      <div role="group" aria-label="Instructor status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <PillTab key={t.id} active={filters.tab === t.id} label={t.label} count={counts[t.id]} onClick={() => set({ tab: t.id })} />
        ))}
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_200px_150px_150px_160px]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search instructors" placeholder="Search by name, email, phone or qualification…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <FilterSelect label="Qualification" value={filters.qualification} onChange={(v) => set({ qualification: v })} allLabel="All Qualifications" options={qualifications} />
          <FilterSelect
            label="Cohorts"
            value={filters.cohorts}
            onChange={(v) => set({ cohorts: v as CohortFilter })}
            allLabel="Any cohorts"
            options={[{ value: '0', label: 'No cohorts' }, { value: '1', label: '1 cohort' }, { value: '2+', label: '2 or more' }]}
          />
          <FilterSelect
            label="Status"
            value={filters.tab === 'all' ? '' : filters.tab}
            onChange={(v) => set({ tab: (v || 'all') as InstructorTab })}
            allLabel="All Status"
            options={TABS.filter((t) => t.id !== 'all').map((t) => ({ value: t.id, label: t.label }))}
          />
          <div className="relative">
            <CalendarRange aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select aria-label="Joined" value={filters.range} onChange={(e) => set({ range: e.target.value as JoinedRange })} className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm">
              {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset}>Reset filters</Button>
        </div>
      </Card>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <span className="font-semibold text-foreground">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={selectedRows.length === 0} onClick={() => exportCsv(selectedRows)}>Export selected</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        </div>
      )}

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={rows.length === 0 ? 'No instructors yet.' : 'No instructors match your filters.'}
            {...(rows.length === 0
              ? { action: <Button size="sm" onClick={openAdd}>Add Instructor</Button> }
              : { action: <Button variant="outline" size="sm" onClick={reset}>Reset filters</Button> })}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10">
                    <Checkbox aria-label="Select all on this page" checked={allOnPage} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="w-16 text-xs">Photo</TableHead>
                  <SortHead label="Name" k="name" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Phone" k="phone" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Email" k="email" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Highest Qualification" k="qualification" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="No of Cohorts" k="cohorts" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <SortHead label="Joined" k="joined" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Status" k="status" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((r, i) => (
                  <TableRow key={r.id} className="hover:bg-muted/30" data-state={selected.has(r.id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onCheckedChange={(v) => toggleOne(r.id, v === true)} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{String((page - 1) * PAGE_SIZE + i + 1).padStart(2, '0')}</TableCell>
                    <TableCell>
                      <Avatar className="size-9 shrink-0">
                        {r.photo ? <AvatarImage src={r.photo} alt="" loading="lazy" /> : null}
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initialsOf(r.name)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      <button type="button" title={r.name || undefined} className="max-w-[220px] truncate text-left hover:text-primary hover:underline" onClick={() => view(r.id)}>
                        {r.name || 'N/A'}
                      </button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{dash(r.phone)}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground" title={r.email}>{dash(r.email)}</TableCell>
                    <TableCell className="text-sm">{dash(r.qualification)}</TableCell>
                    <TableCell className="text-right text-sm font-medium tabular-nums">{r.cohorts}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatYmd(r.joined) || '—'}</TableCell>
                    <TableCell><Pill tone={INSTRUCTOR_STATUS_TONE[r.status]}>{r.status}</Pill></TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="size-8" title="View" aria-label={`View ${r.name}`} onClick={() => view(r.id)}>
                          <Eye aria-hidden="true" className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8" title="Edit" aria-label={`Edit ${r.name}`} onClick={() => openEdit(r)}>
                          <Pencil aria-hidden="true" className="size-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-8" title="More" aria-label={`More actions for ${r.name}`}>
                              <MoreHorizontal aria-hidden="true" className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            {r.email ? (
                              <DropdownMenuItem asChild>
                                <a href={`mailto:${r.email}`}><Mail aria-hidden="true" className="mr-2 size-4" />Email</a>
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem onClick={() => { void actions.resendLogin(r); }}>Resend Login Email</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { void actions.changeDevice(r); }}>Change Device</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className={cn(!r.isDisabled && 'text-destructive focus:text-destructive')}
                              onClick={() => { void actions.toggleLogin(r); }}
                            >
                              {r.isDisabled ? 'Enable' : 'Disable'}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { void actions.remove(r); }}>
                              Delete
                            </DropdownMenuItem>
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
        <ListPager page={page} pages={pages} shown={current.length} total={filtered.length} noun="instructors" onPage={setPage} />
      </Card>

      <InstructorFormDialog
        open={formOpen}
        initial={editing}
        api={api}
        token={session.token}
        onClose={() => setFormOpen(false)}
        onSaved={reload}
      />
    </div>
  );
}
