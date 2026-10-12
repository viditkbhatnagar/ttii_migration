import { Eye, Mail, MoreHorizontal, Pencil, Search, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { EmptyState, Pill } from '../../shared/components/ui-kit.js';
import { TONE } from '../../shared/components/ui-tones.js';
import { FilterSelect, ListPager, SortHead } from '../students/list-chrome.js';
import { progressTone, type TargetRow } from './counsellor-target-model.js';
import {
  formatYmd, initialsOf, statusTone,
  type StaffFilters, type StaffRow, type StaffSortKey,
} from './staff-model.js';
import type { StaffActions } from './use-staff-actions.js';

// Filter card + table shared by the Counsellors and Associates directories
// (Naji's CounsellorsModule / AssociatesModule, in the wave-2 list style).

const dash = (v: string) => v || '—';

export function StaffFilterCard({
  noun, filters, centres, showJoined = false, onChange, onReset,
}: {
  noun: string; filters: StaffFilters; centres: string[]; showJoined?: boolean;
  onChange: (patch: Partial<StaffFilters>) => void; onReset: () => void;
}) {
  return (
    <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
      <div className={cn('grid gap-3 md:grid-cols-2', showJoined ? 'xl:grid-cols-[1fr_180px_150px_180px_180px_auto]' : 'xl:grid-cols-[1fr_220px_180px_auto]')}>
        <div className="relative">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label={`Search ${noun}s`} placeholder="Search by name, ID, email or phone…" className="pl-9" value={filters.search} onChange={(e) => onChange({ search: e.target.value })} />
        </div>
        <FilterSelect label="Centre" value={filters.centre} onChange={(v) => onChange({ centre: v })} allLabel="All Centres" options={centres.map((c) => ({ value: c, label: c }))} />
        <FilterSelect
          label="Status"
          value={filters.tab === 'all' ? '' : filters.tab}
          onChange={(v) => onChange({ tab: (v || 'all') as StaffFilters['tab'] })}
          allLabel="All Status"
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
            { value: 'Disabled', label: 'Login disabled' },
          ]}
        />
        {showJoined ? (
          <>
            <JoinedInput id={`${noun}-joined-from`} label="Joined from" value={filters.from} onChange={(v) => onChange({ from: v })} />
            <JoinedInput id={`${noun}-joined-to`} label="Joined to" value={filters.to} onChange={(v) => onChange({ to: v })} />
          </>
        ) : null}
        <div className="flex items-center justify-end">
          <Button variant="ghost" size="sm" onClick={onReset}>Reset filters</Button>
        </div>
      </div>
    </Card>
  );
}

/** A joined-date bound: dd/mm/yyyy typed or picked; clearing the box clears it. */
function JoinedInput({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div title={label}>
      <label htmlFor={id} className="sr-only">{label}</label>
      <DmyDateInput id={id} value={value} onChange={onChange} placeholder={label} maxYear={new Date().getFullYear() + 1} />
    </div>
  );
}

function TargetCell({ target }: { target: TargetRow | null }) {
  if (!target) return <span className="text-xs text-muted-foreground">No target</span>;
  const tone = progressTone(target.pct);
  const bar = tone === 'emerald' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex w-32 flex-col gap-1" title={`${target.type} target`}>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="font-semibold tabular-nums text-foreground">{target.achieved}/{target.value}</span>
        <span className={cn('font-medium tabular-nums', TONE[tone].text)}>{target.pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className={cn('h-full rounded-full', bar)} style={{ width: `${Math.min(100, target.pct)}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{target.type}</span>
    </div>
  );
}

interface StaffTableProps {
  noun: string;
  rows: StaffRow[];
  current: StaffRow[];
  filteredCount: number;
  page: number;
  pages: number;
  pageSize: number;
  sortKey: StaffSortKey;
  sortDir: 'asc' | 'desc';
  onSort: (k: StaffSortKey) => void;
  onPage: (p: number) => void;
  selected: Set<string>;
  onSelect: (next: Set<string>) => void;
  /** Counsellors only: the current-month target per row. */
  activeTarget?: (r: StaffRow) => TargetRow | null;
  onView: (r: StaffRow) => void;
  onEdit: (r: StaffRow) => void;
  actions: StaffActions;
  onReset: () => void;
}

export function StaffTable(p: StaffTableProps) {
  const { noun, current, selected } = p;
  const Noun = noun[0]?.toUpperCase() + noun.slice(1);
  const allOnPage = current.length > 0 && current.every((r) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allOnPage) current.forEach((r) => next.delete(r.id));
    else current.forEach((r) => next.add(r.id));
    p.onSelect(next);
  };
  const toggleOne = (id: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(id); else next.delete(id);
    p.onSelect(next);
  };
  const head = (label: string, k: StaffSortKey, className?: string) => (
    <SortHead label={label} k={k} sortKey={p.sortKey} dir={p.sortDir} onSort={p.onSort} {...(className ? { className } : {})} />
  );

  return (
    <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{p.filteredCount.toLocaleString('en-IN')} {noun}{p.filteredCount === 1 ? '' : 's'}</p>
        {selected.size > 0 ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-foreground">{selected.size} selected</span>
            <Button size="sm" variant="ghost" className="h-7" onClick={() => p.onSelect(new Set())}>Clear</Button>
          </div>
        ) : null}
      </div>
      {current.length === 0 ? (
        <EmptyState
          icon={Users}
          title={p.rows.length === 0 ? `No ${noun}s yet.` : `No ${noun}s match your filters.`}
          {...(p.rows.length === 0 ? {} : { action: <Button variant="outline" size="sm" onClick={p.onReset}>Reset filters</Button> })}
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10"><Checkbox aria-label="Select all on this page" checked={allOnPage} onCheckedChange={toggleAll} /></TableHead>
                <TableHead className="w-10 text-xs">#</TableHead>
                {head(Noun, 'name')}
                {head('Phone', 'phone')}
                {head('Centre', 'centre')}
                {head('Joined', 'joined')}
                {head('Applications', 'applications', 'text-right')}
                {head('Converted', 'converted', 'text-right')}
                {p.activeTarget ? head('Active Target', 'target') : null}
                {head('Status', 'status')}
                <TableHead className="text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((r, i) => (
                <StaffTableRow
                  key={r.id}
                  row={r}
                  index={(p.page - 1) * p.pageSize + i + 1}
                  selected={selected.has(r.id)}
                  onToggle={(on) => toggleOne(r.id, on)}
                  target={p.activeTarget ? p.activeTarget(r) : undefined}
                  onView={() => p.onView(r)}
                  onEdit={() => p.onEdit(r)}
                  actions={p.actions}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <ListPager page={p.page} pages={p.pages} shown={current.length} total={p.filteredCount} noun={`${noun}s`} onPage={p.onPage} />
    </Card>
  );
}

function StaffTableRow({ row: r, index, selected, onToggle, target, onView, onEdit, actions }: {
  row: StaffRow; index: number; selected: boolean; onToggle: (on: boolean) => void;
  /** undefined = no target column; null = column, but no current target. */
  target: TargetRow | null | undefined;
  onView: () => void; onEdit: () => void; actions: StaffActions;
}) {
  return (
    <TableRow className="hover:bg-muted/30" data-state={selected ? 'selected' : undefined}>
      <TableCell><Checkbox aria-label={`Select ${r.name}`} checked={selected} onCheckedChange={(v) => onToggle(v === true)} /></TableCell>
      <TableCell className="text-xs text-muted-foreground">{String(index).padStart(2, '0')}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <Avatar className="size-9 shrink-0">
            {r.photo ? <AvatarImage src={r.photo} alt="" loading="lazy" className="object-cover" /> : null}
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initialsOf(r.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <button type="button" className="block max-w-[220px] truncate text-left text-sm font-semibold leading-tight hover:text-primary hover:underline" onClick={onView}>
              {r.name || 'N/A'}
            </button>
            <p className="max-w-[220px] truncate text-[11px] text-muted-foreground">{r.email || 'No email'}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{dash(r.phone)}</TableCell>
      <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground" title={r.centre}>{dash(r.centre)}</TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatYmd(r.joined) || '—'}</TableCell>
      <TableCell className="text-right text-sm tabular-nums">{r.applications}</TableCell>
      <TableCell className="text-right tabular-nums">
        <span className="text-sm">{r.converted}</span>
        {r.applications > 0 ? <span className="block text-[10px] text-muted-foreground">{r.conversion}%</span> : null}
      </TableCell>
      {target !== undefined ? <TableCell><TargetCell target={target} /></TableCell> : null}
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <Pill tone={statusTone(r)}><span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-70" />{r.statusLabel}</Pill>
          {r.loginDisabled ? <Pill tone="rose" className="text-[10px]">Login disabled</Pill> : null}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="inline-flex items-center gap-0.5">
          <Button size="icon" variant="ghost" className="size-8" title="View profile" aria-label={`View ${r.name}`} onClick={onView}>
            <Eye aria-hidden="true" className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" className="size-8" title="Edit" aria-label={`Edit ${r.name}`} onClick={onEdit}>
            <Pencil aria-hidden="true" className="size-4" />
          </Button>
          {r.email ? (
            <Button size="icon" variant="ghost" className="size-8" title={`Email ${r.email}`} aria-label={`Email ${r.name}`} asChild>
              <a href={`mailto:${r.email}`}><Mail aria-hidden="true" className="size-4" /></a>
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="size-8" title="More" aria-label={`More actions for ${r.name}`}>
                <MoreHorizontal aria-hidden="true" className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => { void actions.resendCredentials(r); }}>Resend Login Email</DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>Change Username/Password</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className={cn(!r.loginDisabled && 'text-destructive focus:text-destructive')} onClick={() => { void actions.toggleLogin(r); }}>
                {r.loginDisabled ? 'Enable' : 'Disable'}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { void actions.remove(r); }}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
}
