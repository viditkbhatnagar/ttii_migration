import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ClipboardList, Search, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, Pill, type Tone } from '../../shared/components/ui-kit.js';
import { formatClock } from '../../shared/utils/ist-date.js';
import { formatYmd } from '../exam_result/exam-results-model.js';
import { ListPager, PillTab } from '../students/list-chrome.js';
import {
  assignmentState, cohortPhase, filterAssignments, filterCohorts, filterSessions, sessionPhase,
  type AssignmentFilter, type AssignmentItem, type CohortItem, type CohortPhase, type SessionItem, type SessionPhase,
} from './instructor-detail-model.js';

// The Cohorts & Schedule and Assignments & Evaluation tabs of the instructor
// page (Naji's InstructorDetailModule). Read-only views of what the instructor
// handles; scheduling and grading stay in the cohort page / faculty portal.

const PAGE_SIZE = 8;

const COHORT_TONE: Record<CohortPhase, Tone> = { Upcoming: 'blue', Ongoing: 'emerald', Completed: 'slate', Undated: 'slate' };
const SESSION_TONE: Record<SessionPhase, Tone> = { Upcoming: 'primary', Today: 'amber', Past: 'slate' };

function usePaged<T>(rows: T[]) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  return { page, pages, setPage, current: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}

function SectionHead({ title, hint, search, onSearch, placeholder }: {
  title: string; hint: string; search: string; onSearch: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="relative w-full sm:w-64">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label={placeholder} placeholder={placeholder} className="h-9 rounded-full pl-9" value={search} onChange={(e) => onSearch(e.target.value)} />
      </div>
    </div>
  );
}

const rowNo = (page: number, i: number) => String((page - 1) * PAGE_SIZE + i + 1).padStart(2, '0');

export function CohortsScheduleTab({ cohorts, sessions, today, onOpenCohort }: {
  cohorts: CohortItem[]; sessions: SessionItem[]; today: string; onOpenCohort: (id: number) => void;
}) {
  const [cSearch, setCSearch] = useState('');
  const [cPhase, setCPhase] = useState<'' | CohortPhase>('');
  const [sSearch, setSSearch] = useState('');
  const [sPhase, setSPhase] = useState<'' | SessionPhase>('');

  const shownCohorts = useMemo(() => filterCohorts(cohorts, cSearch, cPhase, today), [cohorts, cSearch, cPhase, today]);
  const shownSessions = useMemo(() => filterSessions(sessions, sSearch, sPhase, today), [sessions, sSearch, sPhase, today]);
  const cp = usePaged(shownCohorts);
  const sp = usePaged(shownSessions);
  const cohortCount = (p: CohortPhase) => cohorts.filter((c) => cohortPhase(c, today) === p).length;
  const sessionCount = (p: SessionPhase) => sessions.filter((s) => sessionPhase(s, today) === p).length;

  return (
    <div className="space-y-4">
      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <SectionHead
          title={`Cohorts (${shownCohorts.length})`}
          hint="Cohorts this instructor is assigned to."
          search={cSearch}
          onSearch={(v) => { setCSearch(v); cp.setPage(1); }}
          placeholder="Search cohorts"
        />
        <div role="group" aria-label="Cohort status" className="flex flex-wrap gap-2 px-4 pt-3">
          <PillTab active={cPhase === ''} label="All" count={cohorts.length} onClick={() => { setCPhase(''); cp.setPage(1); }} />
          {(['Ongoing', 'Upcoming', 'Completed'] as const).map((p) => (
            <PillTab key={p} active={cPhase === p} label={p} count={cohortCount(p)} onClick={() => { setCPhase(p); cp.setPage(1); }} />
          ))}
        </div>
        {cp.current.length === 0 ? (
          <EmptyState icon={Users} title={cohorts.length === 0 ? 'No cohorts assigned to this instructor.' : 'No cohorts match your filters.'} />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">Cohort</TableHead>
                  <TableHead className="text-xs">Course</TableHead>
                  <TableHead className="text-xs">Dates</TableHead>
                  <TableHead className="text-right text-xs">Learners</TableHead>
                  <TableHead className="text-right text-xs">Upcoming Sessions</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cp.current.map((c, i) => {
                  const phase = cohortPhase(c, today);
                  return (
                    <TableRow key={c.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground">{rowNo(cp.page, i)}</TableCell>
                      <TableCell>
                        <button type="button" className="text-left text-sm font-medium hover:text-primary hover:underline" onClick={() => onOpenCohort(c.id)}>
                          {c.title || 'Untitled cohort'}
                        </button>
                        {c.code ? <p className="font-mono text-[11px] text-primary">{c.code}</p> : null}
                      </TableCell>
                      <TableCell className="text-sm">{c.course || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatYmd(c.startDate) || '—'} – {formatYmd(c.endDate) || '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">{c.learners}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{c.upcomingSessions}</TableCell>
                      <TableCell><Pill tone={COHORT_TONE[phase]}>{phase === 'Undated' ? 'No dates' : phase}</Pill></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {shownCohorts.length > PAGE_SIZE ? (
          <ListPager page={cp.page} pages={cp.pages} shown={cp.current.length} total={shownCohorts.length} noun="cohorts" onPage={cp.setPage} />
        ) : null}
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <SectionHead
          title={`Live Sessions Schedule (${shownSessions.length})`}
          hint="Live classes in this instructor's cohorts. Times are India time."
          search={sSearch}
          onSearch={(v) => { setSSearch(v); sp.setPage(1); }}
          placeholder="Search sessions"
        />
        <div role="group" aria-label="Session status" className="flex flex-wrap gap-2 px-4 pt-3">
          <PillTab active={sPhase === ''} label="All" count={sessions.length} onClick={() => { setSPhase(''); sp.setPage(1); }} />
          {(['Upcoming', 'Today', 'Past'] as const).map((p) => (
            <PillTab key={p} active={sPhase === p} label={p} count={sessionCount(p)} onClick={() => { setSPhase(p); sp.setPage(1); }} />
          ))}
        </div>
        {sp.current.length === 0 ? (
          <EmptyState icon={CalendarClock} title={sessions.length === 0 ? 'No live sessions scheduled yet.' : 'No sessions match your filters.'} />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">Session</TableHead>
                  <TableHead className="text-xs">Cohort</TableHead>
                  <TableHead className="text-xs">Date &amp; Time</TableHead>
                  <TableHead className="text-xs">Recording</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sp.current.map((s, i) => {
                  const phase = sessionPhase(s, today);
                  const from = formatClock(s.fromTime);
                  const to = formatClock(s.toTime);
                  return (
                    <TableRow key={s.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground">{rowNo(sp.page, i)}</TableCell>
                      <TableCell className="text-sm font-medium">{s.title || 'Live session'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.cohortTitle || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatYmd(s.date) || '—'}
                        {from ? <span className="block text-[11px] text-muted-foreground">{from}{to ? ` – ${to}` : ''}</span> : null}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{s.hasRecording ? 'Available' : '—'}</TableCell>
                      <TableCell><Pill tone={SESSION_TONE[phase]}>{phase}</Pill></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {shownSessions.length > PAGE_SIZE ? (
          <ListPager page={sp.page} pages={sp.pages} shown={sp.current.length} total={shownSessions.length} noun="sessions" onPage={sp.setPage} />
        ) : null}
      </Card>
    </div>
  );
}

const ASSIGNMENT_TABS: Array<{ id: AssignmentFilter; label: string }> = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Pending evaluation' },
  { id: 'done', label: 'Evaluated' },
  { id: 'none', label: 'No submissions' },
];

export function AssignmentsTab({ assignments }: { assignments: AssignmentItem[] }) {
  const [search, setSearch] = useState('');
  const [state, setState] = useState<AssignmentFilter>('');
  const shown = useMemo(() => filterAssignments(assignments, search, state), [assignments, search, state]);
  const p = usePaged(shown);
  const countOf = (s: AssignmentFilter) => (s ? assignments.filter((a) => assignmentState(a) === s).length : assignments.length);

  return (
    <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
      <SectionHead
        title={`Assignments (${shown.length})`}
        hint="Assignments in this instructor's cohorts and how many submissions still need marks."
        search={search}
        onSearch={(v) => { setSearch(v); p.setPage(1); }}
        placeholder="Search assignments"
      />
      <div role="group" aria-label="Evaluation status" className="flex flex-wrap gap-2 px-4 pt-3">
        {ASSIGNMENT_TABS.map((t) => (
          <PillTab key={t.id || 'all'} active={state === t.id} label={t.label} count={countOf(t.id)} onClick={() => { setState(t.id); p.setPage(1); }} />
        ))}
      </div>
      {p.current.length === 0 ? (
        <EmptyState icon={ClipboardList} title={assignments.length === 0 ? 'No assignments in this instructor’s cohorts.' : 'No assignments match your filters.'} />
      ) : (
        <div className="mt-3 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 text-xs">#</TableHead>
                <TableHead className="text-xs">Assignment</TableHead>
                <TableHead className="text-xs">Cohort</TableHead>
                <TableHead className="text-xs">Due Date</TableHead>
                <TableHead className="text-right text-xs">Total Marks</TableHead>
                <TableHead className="text-right text-xs">Submissions</TableHead>
                <TableHead className="text-right text-xs">Pending Eval</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {p.current.map((a, i) => (
                <TableRow key={a.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs text-muted-foreground">{rowNo(p.page, i)}</TableCell>
                  <TableCell className="text-sm font-medium">{a.title || 'Untitled'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.cohortTitle || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{formatYmd(a.dueDate) || '—'}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{a.totalMarks ?? '—'}</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">{a.submissions}</TableCell>
                  <TableCell className="text-right">
                    {a.pending > 0
                      ? <Pill tone="rose">{a.pending}</Pill>
                      : a.submissions > 0 ? <Pill tone="emerald">Done</Pill> : <span className="text-sm text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {shown.length > PAGE_SIZE ? (
        <ListPager page={p.page} pages={p.pages} shown={p.current.length} total={shown.length} noun="assignments" onPage={p.setPage} />
      ) : null}
    </Card>
  );
}
