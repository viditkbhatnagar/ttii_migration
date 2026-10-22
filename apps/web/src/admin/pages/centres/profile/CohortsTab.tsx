import { useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Pill } from '../../../shared/components/ui-kit.js';
import { STATUS_LABEL, STATUS_TONE, type CohortRow } from '../../cohorts/cohort-list-model.js';
import { nextSort, type SortDir } from '../../cohorts/list-model.js';
import { SortHead } from '../../students/list-chrome.js';
import { filterCohortRows, fmtDay, sortCohortRows, type CohortTabSortKey } from '../centre-profile-model.js';
import { SearchBox } from '../centre-ui.js';
import { TAB_CARD, TabEmpty } from './profile-ui.js';

// Cohorts run by this centre (cohorts.centre_id) — the same feed and status
// rules (Active / Upcoming / Completed by dates) as Centre Cohorts.

export function CohortsTab({ cohorts, onOpen }: { cohorts: CohortRow[]; onOpen: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: CohortTabSortKey; dir: SortDir }>({ key: 'code', dir: 'asc' });
  const rows = useMemo(() => sortCohortRows(filterCohortRows(cohorts, search), sort.key, sort.dir), [cohorts, search, sort]);
  const onSort = (k: CohortTabSortKey) => setSort((s) => nextSort(s, k));

  return (
    <Card className={TAB_CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <h3 className="text-base font-semibold">Cohorts at this centre</h3>
        <SearchBox value={search} onChange={setSearch} placeholder="Search cohorts…" />
      </div>
      {rows.length === 0 ? (
        <TabEmpty icon={Users} text={cohorts.length ? 'No cohorts match your search.' : 'No cohorts have been created for this centre yet.'} />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <SortHead label="Cohort Code" k="code" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Course" k="course" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Subject" k="subject" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Language" k="language" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Instructor" k="instructor" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Students" k="students" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                <SortHead label="Live Classes" k="liveClasses" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                <SortHead label="Start" k="start" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap font-mono text-xs font-medium">
                    <button type="button" onClick={() => onOpen(c.id)} className="underline-offset-4 hover:text-primary hover:underline">{c.code || c.cohortId}</button>
                  </TableCell>
                  <TableCell className="text-sm">{c.courses.join(', ') || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{c.subject || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{c.language || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{c.instructor || '—'}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{c.students}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{c.liveClasses}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDay(c.startYmd)}</TableCell>
                  <TableCell><Pill tone={STATUS_TONE[c.status]} className="px-2 py-0.5 text-[11px]">{STATUS_LABEL[c.status]}</Pill></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
