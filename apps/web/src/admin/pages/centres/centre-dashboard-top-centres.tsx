import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pill } from '../../shared/components/ui-kit.js';
import { FilterSelect, SortHead } from '../students/list-chrome.js';
import {
  AFFILIATION_LABEL, AFFILIATION_TONE, DEFAULT_TOP_SORT, EMPTY_TOP_FILTERS, HREF, filterTopCentres, inr, nextTopSort,
  sortTopCentres, stateOptions,
  type DashboardRow, type TopCentreFilters, type TopSortKey,
} from './centre-dashboard-model.js';
import { DashCard } from './centre-dashboard-ui.js';

// "Top centres" (Naji's CentreDashboardModule): search / state / status
// filters, every column but # sortable (Enrollments, most first, by default),
// no pagination. Figures are all-time; Revenue is wallet top-ups credited
// (centres pay TTII nothing per application today).

const COLUMNS: Array<{ key: TopSortKey; label: string; right?: boolean }> = [
  { key: 'name', label: 'Centre' },
  { key: 'state', label: 'State' },
  { key: 'enrollments', label: 'Enrollments', right: true },
  { key: 'applications', label: 'Applications', right: true },
  { key: 'approved', label: 'Approved', right: true },
  { key: 'conversion', label: 'Conversion', right: true },
  { key: 'revenue', label: 'Revenue', right: true },
  { key: 'wallet', label: 'Wallet', right: true },
  { key: 'affiliation', label: 'Affiliation' },
];

export function TopCentresCard({ rows, onNavigate }: { rows: DashboardRow[]; onNavigate: (href: string) => void }) {
  const [filters, setFilters] = useState<TopCentreFilters>(EMPTY_TOP_FILTERS);
  const [sort, setSort] = useState(DEFAULT_TOP_SORT);
  const states = useMemo(() => stateOptions(rows), [rows]);
  const shown = useMemo(() => sortTopCentres(filterTopCentres(rows, filters), sort.key, sort.dir), [rows, filters, sort]);
  const set = (patch: Partial<TopCentreFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const filtered = filters.search.trim() !== '' || filters.state !== '' || filters.status !== '';

  return (
    <DashCard>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <h2 className="text-sm font-semibold text-foreground">Top centres</h2>
          <p className="text-[11px] text-muted-foreground">All time. Approved = enrolled; Revenue = wallet top-ups credited.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search aria-hidden="true" className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search centres"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search centre, code, state"
            className="pl-8 pr-8"
          />
          {filtered ? (
            <button
              type="button"
              aria-label="Clear"
              onClick={() => setFilters(EMPTY_TOP_FILTERS)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
        <FilterSelect
          label="State"
          value={filters.state}
          onChange={(v) => set({ state: v })}
          allLabel="All states"
          options={states.map((s) => ({ value: s, label: s }))}
          className="w-full sm:w-40"
        />
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(v) => set({ status: v as TopCentreFilters['status'] })}
          allLabel="All status"
          options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
          className="w-full sm:w-36"
        />
      </div>

      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 text-xs">#</TableHead>
            {COLUMNS.map((c) => (
              <SortHead
                key={c.key}
                label={c.label}
                k={c.key}
                sortKey={sort.key}
                dir={sort.dir}
                onSort={(k) => setSort((s) => nextTopSort(s, k))}
                {...(c.right ? { className: 'text-right' } : {})}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.length === 0 ? (
            <TableRow>
              <TableCell colSpan={COLUMNS.length + 1} className="py-8 text-center text-sm text-muted-foreground">No centres match</TableCell>
            </TableRow>
          ) : shown.map((r, i) => (
            <TableRow key={r.id}>
              <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
              <TableCell>
                <button
                  type="button"
                  onClick={() => onNavigate(HREF.centre(r.id))}
                  className="whitespace-nowrap font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {r.name || '—'}
                </button>
                <div className="text-xs text-muted-foreground">{r.code}</div>
              </TableCell>
              <TableCell className="text-sm">{r.state || '—'}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{r.enrollments}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{r.applications}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{r.approved}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{r.conversion}%</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{inr(r.revenue)}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{inr(r.wallet)}</TableCell>
              <TableCell><Pill tone={AFFILIATION_TONE[r.affiliation]}>{AFFILIATION_LABEL[r.affiliation]}</Pill></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DashCard>
  );
}
