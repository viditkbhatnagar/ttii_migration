import { AlertTriangle, Bell, BookOpen, CalendarDays, FileText, Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Pill } from '../../../shared/components/ui-kit.js';
import { formatHm, formatYmd } from '../../exam_result/exam-results-model.js';
import { instructionLines } from '../exam-list-model.js';
import type { ReviewSummary } from './review-model.js';
import { formatMinutes } from './wizard-model.js';

function Section({ icon: Icon, title, children, className }: { icon: typeof CalendarDays; title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border border-border p-4', className)}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon aria-hidden="true" className="size-4 text-primary" /> {title}
      </h3>
      {children}
    </section>
  );
}

function KeyRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 text-sm last:border-b-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium text-foreground">{v}</dd>
    </div>
  );
}

export interface ReviewExtras {
  offerings: string[];
  instructions: string;
  notifyEmail: boolean;
  notifyInapp: boolean;
  isPublished: boolean;
  resendNotification: boolean;
}

/** The scrolling body of the Review Exam dialog: timetable, questions, allocation, notifications, instructions. */
export function ReviewBody({ summary, x }: { summary: ReviewSummary; x: ReviewExtras }) {
  const lines = instructionLines(x.instructions);
  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
      {summary.issues.length > 0 ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-semibold"><AlertTriangle aria-hidden="true" className="size-4" /> Check before publishing</p>
          <ul className="ml-6 mt-1.5 list-disc space-y-0.5 text-xs">
            {summary.issues.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </div>
      ) : null}

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
                <TableHead className="text-right text-xs">Total</TableHead>
                <TableHead className="text-right text-xs">Pass</TableHead>
                <TableHead className="text-right text-xs">Questions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.subjects.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No per-subject schedule — the exam goes live as a single sitting using the Step 1 dates.</TableCell></TableRow>
              ) : summary.subjects.map((s, i) => {
                const short = s.planned !== null && s.planned > 0 && s.assigned < s.planned;
                return (
                  <TableRow key={s.key}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="text-sm font-medium">{s.title}</TableCell>
                    <TableCell className={cn('whitespace-nowrap text-sm', !s.date && 'font-medium text-rose-700')}>{formatYmd(s.date) || 'Not set'}</TableCell>
                    <TableCell className={cn('whitespace-nowrap text-sm', (!s.startTime || !s.endTime) && 'font-medium text-rose-700')}>
                      {s.startTime && s.endTime ? `${formatHm(s.startTime)} – ${formatHm(s.endTime)}` : 'Not set'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatMinutes(s.durationMinutes) || '—'}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{s.totalMarks || '—'}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{s.passMarks}</TableCell>
                    <TableCell className={cn('text-right text-sm tabular-nums', short && 'font-semibold text-amber-700')}>
                      {s.planned !== null && s.planned > 0 ? `${s.assigned}/${s.planned}` : s.assigned || '—'}
                    </TableCell>
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
            <KeyRow k="Questions planned" v={summary.plannedQuestions} />
            <KeyRow k="Questions assigned" v={summary.assignedQuestions} />
            <KeyRow k="Total marks" v={summary.totalMarks} />
          </dl>
        </Section>
        <Section icon={Users} title="Student Allocation">
          <dl>
            <KeyRow k="Total allocated" v={summary.allocatedCount} />
            <KeyRow k="Will be emailed on publish" v={summary.emailRecipients} />
            <KeyRow k="Offerings" v={x.offerings.join(', ') || '—'} />
          </dl>
        </Section>
      </div>

      <Section icon={Bell} title="Notification Channels">
        <div className="flex flex-wrap gap-2">
          <Pill tone={x.notifyEmail ? 'primary' : 'slate'}>Email {x.notifyEmail ? 'on' : 'off'}</Pill>
          <Pill tone={x.notifyInapp ? 'primary' : 'slate'}>In-app {x.notifyInapp ? 'on' : 'off'}</Pill>
          {x.isPublished ? <Pill tone={x.resendNotification ? 'amber' : 'slate'}>Re-send {x.resendNotification ? 'on' : 'off'}</Pill> : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">The Email setting also controls the 24-hour and 1-hour exam reminders.</p>
      </Section>

      <Section icon={FileText} title="Instructions">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No instructions added.</p>
        ) : (
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {lines.map((l, i) => <li key={i}>{l}</li>)}
          </ol>
        )}
      </Section>
    </div>
  );
}
