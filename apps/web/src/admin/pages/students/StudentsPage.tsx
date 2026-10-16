import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarRange, Download, Eye, MoreHorizontal, Pencil, Search, Users } from 'lucide-react';
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
import { useConfirm } from '@/components/confirm-dialog';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle, Pill } from '../../shared/components/ui-kit.js';
import { startAdminCall } from '../../shared/call-actions.js';
import { formatYmd } from '../exam_result/exam-results-model.js';
import { EditStudentDialog } from './EditStudentDialog.js';
import { FilterSelect, ListPager, PillTab, SortHead } from './list-chrome.js';
import { serverResult } from './student-view/student-view-model.js';
import {
  EMPTY_STUDENT_FILTERS, FEE_STATUS_TONE, distinctValues, filterStudents, initialsOf, sortStudents,
  statusTone, studentCsvRows, tabCounts, toStudentRows,
  type RangeFilter, type StudentFilters, type StudentRow, type StudentSortKey, type StudentTab,
} from './students-list-model.js';

// Admin → Students, rebuilt after Naji's StudentsModule (TTII 2026-10-12):
// status pills, a filter card (search / course / offering / status / joined
// range, then gender / city / owner), a sortable, selectable, paged table and
// CSV export of the selection or the filtered list. Every action of the old
// page survives: View, quick Edit (name + phone), Call, Enable / Disable login
// (confirm before disabling), and Course as a server-side filter. Gender, City,
// Offering, Owner and Joined come from the read-only directory_extras call; if
// it fails the list still works and those cells read "—".

const PAGE_SIZE = 10;
const TABS: Array<{ id: StudentTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'Active', label: 'Active' },
  { id: 'Inactive', label: 'Inactive' },
];
const RANGES: Array<{ value: RangeFilter; label: string }> = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

const dash = (v: string) => v || '—';

export default function StudentsPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [courseId, setCourseId] = useState('');
  const [filters, setFilters] = useState<StudentFilters>(EMPTY_STUDENT_FILTERS);
  const [sortKey, setSortKey] = useState<StudentSortKey>('joined');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [courses, setCourses] = useState<Array<{ value: string; label: string }>>([]);
  const [extras, setExtras] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    api.loadCourses(session.token)
      .then((list) => setCourses(list.map((c) => ({
        label: asString(c.title) || asString(c.course_title) || asString(c.name) || 'Untitled',
        value: asString(c._id) || asString(c.id),
      }))))
      .catch(() => setCourses([]));
    // Optional enrichment: the list must still work if this is refused.
    api.loadStudentDirectoryExtras(session.token).then(setExtras).catch(() => setExtras([]));
  }, [api, session.token]);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadStudents(session.token, courseId ? { courseId } : {}),
    [courseId],
  );

  const rows = useMemo(() => toStudentRows(data ?? [], extras), [data, extras]);
  const counts = useMemo(() => tabCounts(filterStudents(rows, { ...filters, tab: 'all' })), [rows, filters]);
  const filtered = useMemo(() => sortStudents(filterStudents(rows, filters), sortKey, sortDir), [rows, filters, sortKey, sortDir]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const options = useMemo(() => ({
    offering: distinctValues(rows, (r) => r.offering),
    gender: distinctValues(rows, (r) => r.gender),
    city: distinctValues(rows, (r) => r.city),
    owner: distinctValues(rows, (r) => r.owner),
  }), [rows]);
  const asOptions = (list: string[]) => list.map((v) => ({ value: v, label: v }));

  const set = (patch: Partial<StudentFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_STUDENT_FILTERS); setCourseId(''); setPage(1); };
  const onSort = (k: StudentSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const view = (id: string) => onNavigate(`/admin/students/view/${id}`);

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

  const exportCsv = () => {
    const picked = selected.size > 0 ? filtered.filter((r) => selected.has(r.id)) : filtered;
    downloadCsv('students_export.csv', toCsv(studentCsvRows(picked, formatYmd)));
  };

  const toggleLogin = useCallback(async (row: StudentRow) => {
    if (!row.id) return;
    const name = row.name || 'this student';
    if (!row.isInactive && !(await confirm({
      title: `Disable ${name}?`,
      description: 'They will be blocked from logging in until you re-enable them.',
      confirmText: 'Disable',
      variant: 'destructive',
    }))) return;
    try {
      const res = await api.toggleUserStatus(session.token, row.id, row.isInactive);
      const { ok, message } = serverResult(res, row.isInactive ? 'Student enabled.' : 'Student disabled.', 'Toggle failed');
      if (!ok) { toast.error(message); return; }
      toast.success(row.isInactive ? 'Student enabled.' : 'Student disabled.');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Toggle failed');
    }
  }, [api, session.token, confirm, reload]);

  if (loading) return <PageLoader label="Loading students..." />;
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
        title="Students"
        subtitle={`${filtered.length} of ${rows.length} students`}
        actions={(
          <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={exportCsv}>
            <Download aria-hidden="true" className="size-4" /> Export{selected.size ? ` (${selected.size})` : ''}
          </Button>
        )}
      />

      <div role="group" aria-label="Student status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <PillTab key={t.id} active={filters.tab === t.id} label={t.label} count={counts[t.id]} onClick={() => set({ tab: t.id })} />
        ))}
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_200px_200px_150px_160px]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search students" placeholder="Search by name, ID, email or phone…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <FilterSelect label="Course" value={courseId} onChange={(v) => { setCourseId(v); setPage(1); }} allLabel="All Courses" options={courses} />
          <FilterSelect label="Offering" value={filters.offering} onChange={(v) => set({ offering: v })} allLabel="All Offerings" options={asOptions(options.offering)} />
          <FilterSelect
            label="Status"
            value={filters.tab === 'all' ? '' : filters.tab}
            onChange={(v) => set({ tab: (v || 'all') as StudentTab })}
            allLabel="All Status"
            options={[{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]}
          />
          <div className="relative">
            <CalendarRange aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select aria-label="Joined" value={filters.range} onChange={(e) => set({ range: e.target.value as RangeFilter })} className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm">
              {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[150px_180px_200px_1fr]">
          <FilterSelect label="Gender" value={filters.gender} onChange={(v) => set({ gender: v })} allLabel="All Genders" options={asOptions(options.gender)} />
          <FilterSelect label="City" value={filters.city} onChange={(v) => set({ city: v })} allLabel="All Cities" options={asOptions(options.city)} />
          <FilterSelect label="Owner" value={filters.owner} onChange={(v) => set({ owner: v })} allLabel="All Owners" options={asOptions(options.owner)} />
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>Reset filters</Button>
          </div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState
            icon={Users}
            title={rows.length === 0 ? 'No students yet.' : 'No students match your filters.'}
            {...(rows.length === 0
              ? { body: 'Students appear here once a lead is converted to an enrolment.' }
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
                  <SortHead label="Student ID" k="studentId" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Student" k="name" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Course" k="course" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Offering" k="offering" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="City" k="city" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Gender" k="gender" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Contact" k="phone" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Owner" k="owner" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Joined" k="joined" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Fee" k="feeStatus" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Status" k="status" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <TableHead className="text-right text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((r, i) => (
                  <TableRow key={r.id} className="hover:bg-muted/30" data-state={selected.has(r.id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox aria-label={`Select ${r.name}`} checked={selected.has(r.id)} onCheckedChange={(v) => toggleOne(r.id, v === true)} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{String((page - 1) * PAGE_SIZE + i + 1).padStart(2, '0')}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs font-medium text-primary">{dash(r.studentId)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8 shrink-0">
                          {r.photo ? <AvatarImage src={r.photo} alt="" loading="lazy" /> : null}
                          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initialsOf(r.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <button type="button" title={r.name || undefined} className="block max-w-[220px] truncate text-left text-sm font-medium leading-tight hover:text-primary hover:underline" onClick={() => view(r.id)}>
                            {r.name || 'N/A'}
                          </button>
                          <p className="max-w-[220px] truncate text-[11px] text-muted-foreground" title={r.email || undefined}>{r.email || 'No email'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] text-sm font-medium">
                      <span className="line-clamp-2" title={r.course || undefined}>{r.course || 'N/A'}</span>
                      {r.enrolments > 1 ? <span className="text-[11px] font-normal text-muted-foreground">{r.enrolments} enrolments</span> : null}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground" title={r.offering}>{dash(r.offering)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{dash(r.city)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{dash(r.gender)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <p className="text-xs font-medium">{r.phone || 'N/A'}</p>
                      <p className="max-w-[180px] truncate text-[11px] text-muted-foreground" title={r.email || undefined}>{r.email}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{dash(r.owner)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatYmd(r.joined) || '—'}</TableCell>
                    <TableCell>{r.feeStatus ? <Pill tone={FEE_STATUS_TONE[r.feeStatus] ?? 'slate'}>{r.feeStatus}</Pill> : '—'}</TableCell>
                    <TableCell><Pill tone={statusTone(r.statusLabel)}>{r.statusLabel}</Pill></TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="size-8" title="View" aria-label={`View ${r.name}`} onClick={() => view(r.id)}>
                          <Eye aria-hidden="true" className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-8" title="Edit" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)}>
                          <Pencil aria-hidden="true" className="size-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-8" title="More" aria-label={`More actions for ${r.name}`}>
                              <MoreHorizontal aria-hidden="true" className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => { void startAdminCall(api, session.token, r.phone); }}>Call</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onNavigate(`/admin/students/edit/${r.id}`)}>Edit full profile</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className={cn(!r.isInactive && 'text-destructive focus:text-destructive')}
                              onClick={() => { void toggleLogin(r); }}
                            >
                              {r.isInactive ? 'Enable' : 'Disable'}
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
        <ListPager page={page} pages={pages} shown={current.length} total={filtered.length} noun="students" onPage={setPage} />
      </Card>

      <EditStudentDialog
        student={editing}
        api={api}
        token={session.token}
        onClose={() => setEditing(null)}
        onSaved={reload}
        onOpenFullEdit={(id) => onNavigate(`/admin/students/edit/${id}`)}
      />
    </div>
  );
}
