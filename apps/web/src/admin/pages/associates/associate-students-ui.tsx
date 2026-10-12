import { useMemo } from 'react';
import { Eye, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, Pill } from '../../shared/components/ui-kit.js';
import { StageBadge } from '../applications/StageBadge.js';
import { formatYmd } from '../counsellor/staff-model.js';
import { FilterSelect, ListPager, SortHead } from '../students/list-chrome.js';
import {
  dash, feeStatus, formatInr, monthOptions, rowHref,
  type AssociateStudentPage, type AssociateStudentRow, type StudentQuery, type StudentSortKey,
} from './associate-mgmt-model.js';

// The associate-owned leads / students list, shared by Associate Students and
// the Commissions basis table. Paged, filtered and sorted on the server
// (/admin/associates/students_list).

export function StudentFilterCard({ query, page, onChange, onReset, searchPlaceholder }: {
  query: StudentQuery; page: AssociateStudentPage; searchPlaceholder: string;
  onChange: (patch: Partial<StudentQuery>) => void; onReset: () => void;
}) {
  const months = useMemo(() => monthOptions(new Date()), []);
  return (
    <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_200px_220px_160px_auto]">
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search" placeholder={searchPlaceholder} className="pl-9" value={query.search} onChange={(e) => onChange({ search: e.target.value })} />
        </div>
        <FilterSelect label="Associate" value={query.associateId} onChange={(v) => onChange({ associateId: v })} allLabel="All Associates" options={page.associates.map((a) => ({ value: a.id, label: a.name }))} />
        <FilterSelect label="Course" value={query.courseId} onChange={(v) => onChange({ courseId: v })} allLabel="All Courses" options={page.courses.map((c) => ({ value: c.id, label: c.title }))} />
        <FilterSelect
          label={query.monthBy === 'enrolled' ? 'Enrolment month' : 'Lead month'}
          value={query.month}
          onChange={(v) => onChange({ month: v })}
          allLabel={query.monthBy === 'enrolled' ? 'All Enrolment Months' : 'All Lead Months'}
          options={months}
        />
        <div className="flex items-center justify-end">
          <Button variant="ghost" size="sm" onClick={onReset}>Reset filters</Button>
        </div>
      </div>
    </Card>
  );
}

interface StudentTableProps {
  variant: 'students' | 'commissions';
  page: AssociateStudentPage;
  query: StudentQuery;
  loading: boolean;
  onSort: (k: StudentSortKey) => void;
  onPage: (p: number) => void;
  selected: Map<string, AssociateStudentRow>;
  onSelect: (next: Map<string, AssociateStudentRow>) => void;
  onOpen: (href: string) => void;
  onReset: () => void;
  emptyTitle: string;
}

export function AssociateStudentTable(p: StudentTableProps) {
  const { page, query, selected } = p;
  const rows = page.rows;
  const pages = Math.max(1, Math.ceil(page.total / page.pageSize));
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Map(selected);
    if (allOnPage) rows.forEach((r) => next.delete(r.id));
    else rows.forEach((r) => next.set(r.id, r));
    p.onSelect(next);
  };
  const toggleOne = (r: AssociateStudentRow, on: boolean) => {
    const next = new Map(selected);
    if (on) next.set(r.id, r); else next.delete(r.id);
    p.onSelect(next);
  };
  const head = (label: string, k: StudentSortKey, className?: string) => (
    <SortHead label={label} k={k} sortKey={query.sort} dir={query.dir} onSort={p.onSort} {...(className ? { className } : {})} />
  );
  const noun = p.variant === 'commissions' ? 'enrolments' : 'students';
  const filtered = Boolean(query.search || query.associateId || query.courseId || query.month || (p.variant === 'students' && query.tab !== 'all'));

  return (
    <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]" aria-busy={p.loading}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{page.total.toLocaleString('en-IN')} {noun}</p>
        {selected.size > 0 ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-foreground">{selected.size} selected</span>
            <Button size="sm" variant="ghost" className="h-7" onClick={() => p.onSelect(new Map())}>Clear</Button>
          </div>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filtered ? 'Nothing matches your filters.' : p.emptyTitle}
          {...(filtered ? { action: <Button variant="outline" size="sm" onClick={p.onReset}>Reset filters</Button> } : {})}
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10"><Checkbox aria-label="Select all on this page" checked={allOnPage} onCheckedChange={toggleAll} /></TableHead>
                <TableHead className="w-10 text-xs">#</TableHead>
                {p.variant === 'commissions' ? <TableHead className="text-xs">Ref</TableHead> : null}
                {head('Student', 'name')}
                <TableHead className="text-xs">Associate</TableHead>
                <TableHead className="text-xs">Course</TableHead>
                {p.variant === 'students' ? head('Lead Date', 'lead') : null}
                {p.variant === 'students' ? <TableHead className="text-xs">Stage</TableHead> : null}
                {head(p.variant === 'commissions' ? 'Enrolled On' : 'Enrolled', 'enrolled')}
                {p.variant === 'students' ? <TableHead className="text-right text-xs">Fee</TableHead> : <TableHead className="text-xs">Enrolment Status</TableHead>}
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={r.id} className="hover:bg-muted/30">
                  <TableCell><Checkbox aria-label={`Select ${r.name || r.applicationId}`} checked={selected.has(r.id)} onCheckedChange={(v) => toggleOne(r, v === true)} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{(page.page - 1) * page.pageSize + i + 1}</TableCell>
                  {p.variant === 'commissions' ? <TableCell className="font-mono text-xs">{r.applicationId}</TableCell> : null}
                  <TableCell>
                    <p className="font-medium text-foreground">{dash(r.name)}</p>
                    <p className="text-xs text-muted-foreground">{p.variant === 'students' ? `${r.applicationId} · ` : ''}{dash(r.phone)}</p>
                  </TableCell>
                  <TableCell className="text-sm">{dash(r.associateName)}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm" title={r.course}>{dash(r.course)}</TableCell>
                  {p.variant === 'students' ? <TableCell className="whitespace-nowrap text-sm">{dash(formatYmd(r.leadDate))}</TableCell> : null}
                  {p.variant === 'students' ? (
                    <TableCell>{r.enrolled ? <Pill tone="emerald">Enrolled</Pill> : <StageBadge stage={r.stage} />}</TableCell>
                  ) : null}
                  <TableCell className="whitespace-nowrap text-sm">{dash(formatYmd(r.enrolledDate))}</TableCell>
                  {p.variant === 'students' ? <FeeCell row={r} /> : <TableCell className="text-sm">{dash(r.enrollmentStatus)}</TableCell>}
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={r.enrolled && r.studentUserId ? `View student ${r.name}` : `View application ${r.applicationId}`}
                      title={r.enrolled && r.studentUserId ? 'View student' : 'View application'}
                      onClick={() => p.onOpen(rowHref(r))}
                    >
                      <Eye aria-hidden="true" className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <ListPager page={page.page} pages={pages} shown={rows.length} total={page.total} noun={noun} onPage={p.onPage} />
    </Card>
  );
}

function FeeCell({ row }: { row: AssociateStudentRow }) {
  const status = feeStatus(row.paymentStatus);
  return (
    <TableCell className="text-right">
      <p className="text-sm tabular-nums text-foreground">{formatInr(row.fee)}</p>
      {status ? <Pill tone={status.tone} className="mt-1">{status.label}</Pill> : null}
    </TableCell>
  );
}
