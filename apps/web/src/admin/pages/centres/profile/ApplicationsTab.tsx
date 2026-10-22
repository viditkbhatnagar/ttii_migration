import { useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pill } from '../../../shared/components/ui-kit.js';
import { nextSort, type SortDir } from '../../cohorts/list-model.js';
import { FilterSelect, PillTab, SortHead } from '../../students/list-chrome.js';
import {
  distinct, filterApps, fmtDay, inr, sortApps, stageLabelOf, stagePills, stageToneOf, type AppRow, type AppSortKey,
} from '../centre-profile-model.js';
import { FILTER_SELECT, TAB_CARD, TabEmpty, TabToolbar } from './profile-ui.js';

// Applications added under this centre (applications.added_under_centre). The
// stage is derived from the real columns: converted → Enrolled, rejected →
// Rejected, else applications.stage. No "Paid" amount column: an
// application row does not record what was paid against it.

export function ApplicationsTab({ applications }: { applications: AppRow[] }) {
  const [stage, setStage] = useState('all');
  const [course, setCourse] = useState('');
  const [combination, setCombination] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: AppSortKey; dir: SortDir }>({ key: 'date', dir: 'asc' });
  const pills = useMemo(() => stagePills(applications), [applications]);
  const courses = useMemo(() => distinct(applications.map((a) => a.course)), [applications]);
  const combinations = useMemo(() => distinct(applications.map((a) => a.combination)), [applications]);
  const rows = useMemo(
    () => sortApps(filterApps(applications, { stage, course, combination, search }), sort.key, sort.dir),
    [applications, stage, course, combination, search, sort],
  );
  const onSort = (k: AppSortKey) => setSort((s) => nextSort(s, k));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <PillTab active={stage === 'all'} label="All" count={applications.length} onClick={() => setStage('all')} />
        {pills.map((p) => <PillTab key={p.stage} active={stage === p.stage} label={p.label} count={p.count} onClick={() => setStage(p.stage)} />)}
      </div>
      <Card className={TAB_CARD}>
        <TabToolbar search={search} onSearch={setSearch} placeholder="Search application ID, student or course…">
          <FilterSelect label="Course" value={course} onChange={setCourse} allLabel="All Courses" options={courses.map((c) => ({ value: c, label: c }))} className={FILTER_SELECT} />
          <FilterSelect label="Combination" value={combination} onChange={setCombination} allLabel="All Combinations" options={combinations.map((c) => ({ value: c, label: c }))} className={FILTER_SELECT} />
        </TabToolbar>
        {rows.length === 0 ? (
          <TabEmpty icon={ClipboardList} text={applications.length ? 'No applications match your filters.' : 'No applications have been added under this centre yet.'} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <SortHead label="Application ID" k="appId" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Date" k="date" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Student" k="student" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Course" k="course" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Combination" k="combination" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Fee" k="fee" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                  <SortHead label="Stage" k="stage" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs font-medium">{r.appId || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDay(r.date)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-medium">{r.student || '—'}</TableCell>
                    <TableCell className="text-sm">{r.course || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-primary">{r.combination || '—'}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{r.fee === null ? '—' : inr(r.fee)}</TableCell>
                    <TableCell><Pill tone={stageToneOf(r.stage)} className="px-2 py-0.5 text-[11px]">{stageLabelOf(r.stage)}</Pill></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
