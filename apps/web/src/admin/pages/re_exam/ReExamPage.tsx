import { useCallback, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, PlayCircle, Search, Trophy, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { formatHm, formatYmd } from '../exam_result/exam-results-model.js';
import { KpiTile, Pill, type Tone } from '../exam_result/result-ui.js';
import { ScheduleReExamDialog, type ReExamCandidate } from './ScheduleReExamDialog.js';
import { STATE_LABEL, isChangeable, toReExamRows, type ReExamRow, type ReExamState } from './re-exam-model.js';

// Exam → Re-Examination (TTII 2026-10-09), in the style of Naji's exam module.
// Every re-exam — one subject re-opened for one student in a window of its own
// — with the original mark beside the re-exam mark. Re-exams are scheduled
// from Exam → Result (where the failed / absent / flagged papers are); here
// they are followed up, moved or cancelled.
//
// Replaces the page that listed "missed" students per sitting and saved a
// re-exam row no student-facing code ever read.

const STATE_TONE: Record<ReExamState, Tone> = {
  upcoming: 'blue',
  open: 'violet',
  in_progress: 'violet',
  completed: 'emerald',
  missed: 'rose',
  cancelled: 'slate',
  superseded: 'slate',
};

type KpiFilter = 'all' | 'upcoming' | 'live' | 'completed' | 'missed';

function matchesKpi(row: ReExamRow, kpi: KpiFilter): boolean {
  if (kpi === 'all') return true;
  if (kpi === 'live') return row.state === 'open' || row.state === 'in_progress';
  return row.state === kpi;
}

function Mark({ score, total, result }: { score: number | null; total: number; result?: 'pass' | 'fail' | '' }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  const tone = result === 'pass' ? 'text-emerald-700' : result === 'fail' ? 'text-rose-700' : 'text-foreground';
  return (
    <span className={`text-sm font-semibold tabular-nums ${tone}`}>
      {score}{total > 0 ? <span className="font-normal text-muted-foreground">/{total}</span> : null}
      {result ? <span className="ml-1.5 text-[11px] font-semibold">{result === 'pass' ? 'Pass' : 'Fail'}</span> : null}
    </span>
  );
}

export default function ReExamPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();
  const [kpi, setKpi] = useState<KpiFilter>('all');
  const [search, setSearch] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  const [moving, setMoving] = useState<ReExamRow | null>(null);

  const { data, loading, error, reload } = useAdminPageData(
    async () => toReExamRows(await api.listReExams(session.token)),
    [],
    'admin:re-exams:list',
  );
  const rows = useMemo(() => data ?? [], [data]);

  const counts = useMemo(() => ({
    upcoming: rows.filter((r) => matchesKpi(r, 'upcoming')).length,
    live: rows.filter((r) => matchesKpi(r, 'live')).length,
    completed: rows.filter((r) => matchesKpi(r, 'completed')).length,
    missed: rows.filter((r) => matchesKpi(r, 'missed')).length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!matchesKpi(r, kpi)) return false;
      if (!showClosed && (r.state === 'cancelled' || r.state === 'superseded')) return false;
      if (!q) return true;
      return [r.studentName, r.studentCode, r.examTitle, r.examCode, r.subjectTitle].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, kpi, search, showClosed]);

  const cancel = useCallback(async (row: ReExamRow) => {
    const ok = await confirm({
      title: 'Cancel this re-exam?',
      description: `${row.studentName} will no longer be able to sit ${row.subjectTitle} on ${formatYmd(row.date)}. Their original mark stands.`,
      confirmText: 'Cancel re-exam',
      cancelText: 'Keep it',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await api.cancelReExam(session.token, row.id);
      if (asNumber(res.status) === 1) {
        toast.success(asString(res.message) || 'Re-exam cancelled.');
        reload();
      } else {
        toast.error(asString(res.message) || 'Could not cancel the re-exam.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel the re-exam.');
    }
  }, [api, session.token, confirm, reload]);

  const movingCandidates = useCallback((): ReExamCandidate[] => (
    moving
      ? [{ userId: moving.userId, name: moving.studentName, studentCode: moving.studentCode, note: STATE_LABEL[moving.state], tone: 'violet', preselect: true }]
      : []
  ), [moving]);

  if (loading) return <PageLoader label="Loading re-exams…" />;
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

  const toggleKpi = (k: KpiFilter) => setKpi((cur) => (cur === k ? 'all' : k));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Re-Examination</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Students re-sitting one subject in a window of their own. Schedule re-exams from Exam → Result.
          </p>
        </div>
        <Button variant="outline" className="gap-1.5" onClick={() => onNavigate('/admin/Exam_result/index')}>
          <Trophy aria-hidden="true" className="size-4" /> Go to Exam Results
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Upcoming" value={counts.upcoming} icon={Clock} tone="blue" active={kpi === 'upcoming'} onClick={() => toggleKpi('upcoming')} />
        <KpiTile label="Open now" value={counts.live} icon={PlayCircle} tone="violet" active={kpi === 'live'} onClick={() => toggleKpi('live')} />
        <KpiTile label="Completed" value={counts.completed} icon={CheckCircle2} tone="emerald" active={kpi === 'completed'} onClick={() => toggleKpi('completed')} />
        <KpiTile label="Missed" value={counts.missed} icon={XCircle} tone="rose" active={kpi === 'missed'} onClick={() => toggleKpi('missed')} />
      </div>

      <Card className="gap-0 overflow-hidden p-0 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search re-exams" placeholder="Search student, exam or subject…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="size-4 accent-primary" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
            Show cancelled and replaced
          </label>
        </div>

        {filtered.length === 0 ? (
          <div role="status" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CalendarClock aria-hidden="true" className="size-6" />
            </span>
            <p className="text-sm font-medium text-foreground">
              {rows.length === 0 ? 'No re-exams yet.' : 'No re-exams match this filter.'}
            </p>
            {rows.length === 0 ? (
              <p className="max-w-md text-sm text-muted-foreground">
                Open an exam in Exam → Result and use Schedule Re-exam for absent, failed or flagged students.
              </p>
            ) : (
              <Button variant="outline" size="sm" onClick={() => { setKpi('all'); setSearch(''); }}>Clear filters</Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="text-xs">Student</TableHead>
                <TableHead className="text-xs">Exam &amp; subject</TableHead>
                <TableHead className="text-xs">Original mark</TableHead>
                <TableHead className="text-xs">Re-exam window</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Re-exam mark</TableHead>
                <TableHead className="text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="text-sm font-medium text-foreground">{r.studentName || '—'}</div>
                    <div className="text-[11px] text-muted-foreground">{r.studentCode}</div>
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="truncate text-sm text-foreground">{r.subjectTitle}</div>
                    <div className="truncate text-[11px] text-muted-foreground">{r.examTitle}</div>
                  </TableCell>
                  <TableCell>
                    {r.previousScore === null
                      ? <span className="text-xs text-muted-foreground">Absent</span>
                      : <Mark score={r.previousScore} total={r.totalMarks} />}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm text-foreground">{formatYmd(r.date) || '—'}</div>
                    <div className="text-[11px] text-muted-foreground">{formatHm(r.startTime)} – {formatHm(r.endTime)} IST</div>
                  </TableCell>
                  <TableCell>
                    <Pill tone={STATE_TONE[r.state]}>{STATE_LABEL[r.state]}</Pill>
                    {r.notes ? <div className="mt-1 max-w-[200px] truncate text-[11px] text-muted-foreground" title={r.notes}>{r.notes}</div> : null}
                  </TableCell>
                  <TableCell><Mark score={r.newScore} total={r.totalMarks} result={r.result} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {isChangeable(r.state) ? (
                        <>
                          <Button size="sm" variant="outline" className="h-8" onClick={() => setMoving(r)}>Reschedule</Button>
                          <Button size="sm" variant="outline" className="h-8 text-rose-700 hover:text-rose-800" onClick={() => void cancel(r)}>Cancel</Button>
                        </>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => onNavigate(`/admin/Exam_result/index?exam=${r.parentExamId ?? r.examId}`)}
                      >
                        Results
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ScheduleReExamDialog
        open={moving !== null}
        onClose={() => setMoving(null)}
        onScheduled={reload}
        api={api}
        token={session.token}
        examTitle={moving ? `${moving.examTitle} — ${moving.studentName}` : ''}
        subjects={moving ? [{ examId: moving.examId, subjectTitle: moving.subjectTitle, date: '' }] : []}
        initialExamId={moving?.examId ?? null}
        candidatesFor={movingCandidates}
        initialWindow={moving ? { date: moving.date, startTime: moving.startTime, endTime: moving.endTime, notes: moving.notes } : undefined}
        mode="reschedule"
      />
    </div>
  );
}
