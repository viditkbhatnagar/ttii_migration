import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, Eye, Search, Send, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatPeriod, type ExamResultsRow, type ExamResultsStatus } from './exam-results-model.js';
import { ExamStatusBadge, KpiTile, Pill } from './result-ui.js';

// The exam list of Exam → Result: KPI tiles that double as filters, a search,
// and one row per exam with its outcome counts (Naji's Result Management list).

type KpiFilter = 'all' | ExamResultsStatus;

export function ExamResultsList({ rows, onOpen }: { rows: ExamResultsRow[]; onOpen: (examId: number) => void }) {
  const [kpi, setKpi] = useState<KpiFilter>('all');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => ({
    in_progress: rows.filter((r) => r.status === 'in_progress').length,
    ready: rows.filter((r) => r.status === 'ready').length,
    published: rows.filter((r) => r.status === 'published').length,
  }), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (kpi !== 'all' && r.status !== kpi) return false;
      if (!q) return true;
      return [r.title, r.examCode, String(r.examId), ...r.courses].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, kpi, search]);

  const toggle = (k: ExamResultsStatus) => setKpi((cur) => (cur === k ? 'all' : k));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Exam Results</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review each exam&apos;s results subject by subject, then publish them to students.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiTile label="Exams in progress" value={counts.in_progress} icon={Clock} tone="blue" active={kpi === 'in_progress'} onClick={() => toggle('in_progress')} />
        <KpiTile label="Ready to publish" value={counts.ready} icon={CheckCircle2} tone="amber" active={kpi === 'ready'} onClick={() => toggle('ready')} />
        <KpiTile label="Published" value={counts.published} icon={Send} tone="emerald" active={kpi === 'published'} onClick={() => toggle('published')} />
      </div>

      <Card className="gap-0 overflow-hidden p-0 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search exams"
              placeholder="Search by exam name, code or course…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{filtered.length}</span> exam{filtered.length === 1 ? '' : 's'}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div role="status" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Trophy aria-hidden="true" className="size-6" />
            </span>
            <p className="text-sm font-medium text-foreground">
              {rows.length === 0 ? 'No published exams yet.' : 'No exams match this filter.'}
            </p>
            {rows.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => { setKpi('all'); setSearch(''); }}>Clear filters</Button>
            ) : null}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-12 text-xs">#</TableHead>
                <TableHead className="text-xs">Exam</TableHead>
                <TableHead className="text-xs">Course</TableHead>
                <TableHead className="text-xs">Dates</TableHead>
                <TableHead className="text-xs">Subjects</TableHead>
                <TableHead className="text-xs">Students</TableHead>
                <TableHead className="text-xs">Result summary</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r, i) => (
                <TableRow key={r.examId}>
                  <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="max-w-[280px]">
                    <div className="truncate text-sm font-medium text-foreground">{r.title}</div>
                    <div className="text-[11px] text-muted-foreground">{r.examCode || `ID ${r.examId}`}</div>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs text-foreground">{r.courses.join(', ') || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{formatPeriod(r.fromDate, r.toDate)}</TableCell>
                  <TableCell className="text-sm tabular-nums">{r.subjects}</TableCell>
                  <TableCell className="text-sm tabular-nums">{r.totals.students}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Pill tone="emerald">P {r.totals.passed}</Pill>
                      <Pill tone="rose">F {r.totals.failed}</Pill>
                      <Pill tone="slate">A {r.totals.absent + r.totals.incomplete}</Pill>
                      {r.totals.flagged > 0 ? <Pill tone="amber">Check {r.totals.flagged}</Pill> : null}
                    </div>
                  </TableCell>
                  <TableCell><ExamStatusBadge status={r.status} /></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onOpen(r.examId)}>
                      <Eye aria-hidden="true" className="size-3.5" /> View Results
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
