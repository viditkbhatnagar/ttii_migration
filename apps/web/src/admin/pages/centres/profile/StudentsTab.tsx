import { useMemo, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { Pill } from '../../../shared/components/ui-kit.js';
import { nextSort, pageSlice, type SortDir } from '../../cohorts/list-model.js';
import { ListPager, SortHead } from '../../students/list-chrome.js';
import {
  STUDENT_PAGE_SIZE, filterStudents, fmtDay, sortStudents, studentTone, type StudentRow, type StudentSortKey,
} from '../centre-profile-model.js';
import { SearchBox } from '../centre-ui.js';
import { TAB_CARD, TabEmpty } from './profile-ui.js';

// Students added under this centre (role 2, users.added_under_centre). Course
// is the latest enrolment, Cohort every cohort the student sits in. No
// Progress column: there is no per-student progress figure to show here.

export function StudentsTab({ students, onOpen }: { students: StudentRow[]; onOpen: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: StudentSortKey; dir: SortDir }>({ key: 'roll', dir: 'asc' });
  const [page, setPage] = useState(1);
  const rows = useMemo(() => sortStudents(filterStudents(students, search), sort.key, sort.dir), [students, search, sort]);
  const slice = pageSlice(rows, page, STUDENT_PAGE_SIZE);
  const onSort = (k: StudentSortKey) => setSort((s) => nextSort(s, k));

  return (
    <Card className={TAB_CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <h3 className="text-base font-semibold">Students <span className="text-sm font-normal text-muted-foreground">({rows.length})</span></h3>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search students…" />
      </div>
      {slice.current.length === 0 ? (
        <TabEmpty icon={GraduationCap} text={students.length ? 'No students match your search.' : 'No students enrolled at this centre yet.'} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <SortHead label="Roll No" k="roll" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Student Name" k="name" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Cohort" k="cohort" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Course" k="course" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Joined" k="joined" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {slice.current.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{s.roll || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm font-medium">
                      <button type="button" onClick={() => onOpen(s.id)} className="text-left underline-offset-4 hover:text-primary hover:underline">
                        {s.name || '—'}
                      </button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{s.cohort || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.course || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDay(s.joined)}</TableCell>
                    <TableCell><Pill tone={studentTone(s.status)} className="px-2 py-0.5 text-[11px]">{s.status}</Pill></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ListPager page={slice.page} pages={slice.pages} shown={slice.current.length} total={rows.length} noun="students" onPage={setPage} />
        </>
      )}
    </Card>
  );
}
