import { useCallback, useState } from 'react';
import { Bell, BookOpen, CalendarDays, Clock, FileText, GraduationCap, Pencil, Trash2, Trophy, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { Pill } from '../../shared/components/ui-kit.js';
import { formatHm, formatYmd } from '../exam_result/exam-results-model.js';
import { EXAM_TYPE_LABEL, PHASE_LABEL, PHASE_TONE, examType, instructionLines, toExamOverview, type ExamOverview } from './exam-list-model.js';

// View Exam (TTII 2026-10-12, Naji's ViewExamDialog) — there was no read-only
// view before: the admin could only open the edit wizard. Everything here is
// real: the subject timetable, questions planned vs assigned, allocation and
// submissions, instructions and notification channels. Delete sits in the
// footer behind a confirmation and the server's own guard (an exam students
// have submitted cannot be deleted).

function InfoTile({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/70 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <Icon aria-hidden="true" className="size-3.5" /> {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{value || '—'}</p>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof CalendarDays; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon aria-hidden="true" className="size-4 text-primary" /> {title}
      </h3>
      {children}
    </section>
  );
}

function KeyRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium text-foreground">{v}</dd>
    </div>
  );
}

function sessionLabel(o: ExamOverview): string {
  const times = [...new Set(o.schedule.map((s) => (s.startTime && s.endTime ? `${formatHm(s.startTime)} – ${formatHm(s.endTime)}` : '')))].filter(Boolean);
  if (times.length === 1) return times[0] ?? '';
  return times.length > 1 ? 'Varies by subject' : '';
}

function Body({ o }: { o: ExamOverview }) {
  const planned = o.schedule.reduce((n, s) => n + s.questionsPlanned, 0);
  const assigned = o.schedule.reduce((n, s) => n + s.questionsAssigned, 0);
  const marks = o.schedule.reduce((n, s) => n + s.totalMarks, 0);
  const lines = instructionLines(o.instructions);
  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
      <Section icon={CalendarDays} title="Subject Timetable">
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 text-xs">#</TableHead>
                <TableHead className="text-xs">Subject</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Time (IST)</TableHead>
                <TableHead className="text-xs">Duration</TableHead>
                <TableHead className="text-right text-xs">Marks</TableHead>
                <TableHead className="text-right text-xs">Pass</TableHead>
                <TableHead className="text-right text-xs">Questions</TableHead>
                <TableHead className="text-right text-xs">Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {o.schedule.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">No subjects scheduled yet.</TableCell></TableRow>
              ) : o.schedule.map((s, i) => {
                const short = s.questionsPlanned > 0 && s.questionsAssigned < s.questionsPlanned;
                return (
                  <TableRow key={`${s.sittingId ?? 'd'}-${i}`}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="text-sm font-medium">{s.subjectTitle || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatYmd(s.date) || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{s.startTime ? `${formatHm(s.startTime)} – ${formatHm(s.endTime)}` : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.durationMin > 0 ? `${s.durationMin} min` : '—'}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{s.totalMarks || '—'}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{s.passMarks ?? '—'}</TableCell>
                    <TableCell className={`text-right text-sm tabular-nums ${short ? 'font-semibold text-amber-700' : ''}`} title={short ? 'Fewer questions assigned than planned' : undefined}>
                      {s.questionsPlanned > 0 ? `${s.questionsAssigned}/${s.questionsPlanned}` : s.questionsAssigned || '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{s.submitted}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Section>

      <div className="grid gap-5 md:grid-cols-2">
        <Section icon={BookOpen} title="Question Setup">
          <dl>
            <KeyRow k="Questions planned" v={String(planned)} />
            <KeyRow k="Questions assigned" v={String(assigned)} />
            <KeyRow k="Total marks" v={String(marks)} />
          </dl>
        </Section>
        <Section icon={Users} title="Student Allocation">
          <dl>
            <KeyRow k="Allocated" v={String(o.allocated)} />
            <KeyRow k="Papers submitted" v={String(o.submitted)} />
            <KeyRow k="Offerings" v={o.offerings.join(', ') || '—'} />
          </dl>
        </Section>
      </div>

      <Section icon={FileText} title="Instructions">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No instructions added.</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {lines.map((l, i) => <li key={i}>{l}</li>)}
          </ol>
        )}
      </Section>

      <Section icon={Bell} title="Notifications">
        <div className="flex flex-wrap gap-2">
          <Pill tone={o.notifyEmail ? 'emerald' : 'slate'}>Email {o.notifyEmail ? 'on' : 'off'}</Pill>
          <Pill tone={o.notifyInapp ? 'emerald' : 'slate'}>In-app {o.notifyInapp ? 'on' : 'off'}</Pill>
        </div>
      </Section>
    </div>
  );
}

export function ViewExamDialog({
  examId, api, token, onClose, onNavigate, onDeleted,
}: {
  examId: number | null;
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onNavigate: (href: string) => void;
  onDeleted: () => void;
}) {
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);
  const { data, loading, error } = useAdminPageData<ExamOverview | null>(
    async () => {
      if (examId === null) return null;
      const raw = await api.getExamOverview(token, String(examId));
      return raw ? toExamOverview(raw) : null;
    },
    [examId],
  );
  const o = examId !== null && data?.examId === examId ? data : null;

  const remove = useCallback(async () => {
    if (!o) return;
    const ok = await confirm({
      title: 'Delete this exam?',
      description: `"${o.title}"${o.subjects > 1 ? ` and its ${o.subjects} subject sittings` : ''} will be removed. This cannot be undone from here.`,
      confirmText: 'Delete exam',
      variant: 'destructive',
    });
    if (!ok) return;
    setDeleting(true);
    try {
      const res = await api.deleteExam(token, String(o.examId));
      const message = asString(res.message);
      if (asNumber(res.status) === 1) {
        toast.success(message || 'Exam deleted.');
        onDeleted();
        onClose();
      } else {
        // The server refuses an exam students have submitted — say so.
        toast.error(message || 'Could not delete the exam.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the exam.');
    } finally {
      setDeleting(false);
    }
  }, [o, api, token, confirm, onDeleted, onClose]);

  return (
    <Dialog open={examId !== null} onOpenChange={(open) => { if (!open && !deleting) onClose(); }}>
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
        style={{ width: 'min(1024px, calc(100vw - 2rem))', maxWidth: 'min(1024px, calc(100vw - 2rem))' }}
      >
        {!o ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground" role="status">
            <DialogTitle className="sr-only">Exam</DialogTitle>
            {loading ? 'Loading exam…' : error ?? 'This exam could not be found.'}
          </div>
        ) : (
          <>
            <DialogHeader className="shrink-0 border-b border-border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pb-5 pt-6 text-left">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-md border border-border bg-background/60 px-2 py-0.5 font-medium text-muted-foreground">{o.examCode || `ID ${o.examId}`}</span>
                <Pill tone={PHASE_TONE[o.phase]}>{PHASE_LABEL[o.phase]}</Pill>
                <Pill tone={o.isPractice ? 'slate' : o.isSupplementary ? 'primary' : 'blue'}>{EXAM_TYPE_LABEL[examType(o)]}</Pill>
                {o.resultsPublished ? <Pill tone="emerald">Results published</Pill> : null}
              </div>
              <DialogTitle className="mt-2 text-2xl font-bold tracking-tight">{o.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 text-sm">
                <GraduationCap aria-hidden="true" className="size-4" /> {o.courses.join(', ') || 'No course linked'}
              </DialogDescription>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                <InfoTile icon={CalendarDays} label="From" value={formatYmd(o.fromDate)} />
                <InfoTile icon={CalendarDays} label="To" value={formatYmd(o.toDate)} />
                <InfoTile icon={Clock} label="Session" value={sessionLabel(o)} />
                <InfoTile icon={BookOpen} label="Subjects" value={String(o.subjects)} />
              </div>
            </DialogHeader>

            <Body o={o} />

            <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-muted/30 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">{o.deletable.ok ? '' : o.deletable.reason}</p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 text-rose-700 hover:text-rose-800" disabled={!o.deletable.ok || deleting} onClick={() => void remove()}>
                  <Trash2 aria-hidden="true" className="size-4" /> {deleting ? 'Deleting…' : 'Delete'}
                </Button>
                {o.status === 'published' ? (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onNavigate(`/admin/Exam_result/index?exam=${o.examId}`)}>
                    <Trophy aria-hidden="true" className="size-4" /> Results
                  </Button>
                ) : null}
                {o.phase !== 'completed' ? (
                  <Button size="sm" className="gap-1.5" onClick={() => onNavigate(`/admin/exam/edit/${o.examId}`)}>
                    <Pencil aria-hidden="true" className="size-4" /> Edit
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
