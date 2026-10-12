import { Activity, CheckCircle2, ClipboardList, FileText, GraduationCap, History, ScrollText, User as UserIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { StatBox } from '../../shared/components/ui-kit.js';
import { TONE } from '../../shared/components/ui-tones.js';
import {
  formatIst,
  formatMinutes,
  formatSeconds,
  lastGradedAt,
  marksLabel,
  percentage,
  windowLabel,
  statusDetail,
  submissionTypeLabel,
  timelineEvents,
  type SubmissionDetail,
  type SubmissionRow,
} from './exam-submissions-model.js';
import { EvalBadge, InfoCard, InfoRow, ResultBadge, StatusBadge } from './submission-ui.js';

// The four detail tabs of a submission (Naji's SubmissionProfile).

interface TabProps {
  row: SubmissionRow;
  detail: SubmissionDetail;
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

export function OverviewTab({ row, detail }: TabProps) {
  const now = Date.now();
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <InfoCard icon={UserIcon} title="Student Information">
        <InfoRow label="Name" value={row.studentName} />
        <InfoRow label="Student ID" value={row.studentCode} />
        <InfoRow label="Email" value={<span className="break-all">{detail.studentEmail}</span>} />
        <InfoRow label="Phone" value={detail.studentPhone} />
        <InfoRow label="Course" value={row.courses.join(', ')} />
      </InfoCard>
      <InfoCard icon={GraduationCap} title="Exam Information">
        <InfoRow label="Exam" value={row.examTitle} />
        <InfoRow label="Exam ID" value={row.examCode} />
        <InfoRow label="Subject" value={row.subject} />
        <InfoRow label="Exam Type" value={row.type === 'reexam' ? 'Re-exam' : 'Regular'} />
        <InfoRow label="Attempt Number" value={`#${row.attemptNo}`} />
        <InfoRow label="Window (IST)" value={windowLabel(row)} />
        <InfoRow label="Duration" value={formatMinutes(row.durationMinutes)} />
      </InfoCard>
      <InfoCard icon={Activity} title="Current Status">
        <div className="space-y-3">
          <Labelled label="Submission Status">
            <StatusBadge row={row} />
            <p className="mt-1 text-xs text-muted-foreground">{statusDetail(row, now)}</p>
          </Labelled>
          <Labelled label="Evaluation Status"><EvalBadge row={row} /></Labelled>
          <Labelled label="Result Status"><ResultBadge row={row} /></Labelled>
        </div>
      </InfoCard>
    </div>
  );
}

export function SubmissionTab({ row, detail }: TabProps) {
  const total = row.questionCount ?? 0;
  const answered = row.answered ?? 0;
  const share = total > 0 ? Math.min(100, (answered / total) * 100) : 0;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard icon={FileText} title="Submission Timings (IST)">
          <InfoRow label="Started At" value={formatIst(row.startedAt)} />
          <InfoRow label="Submitted At" value={formatIst(row.submittedAt)} />
          <InfoRow label="Deadline for this paper" value={formatIst(row.deadlineAt)} />
          <InfoRow label="Time Taken" value={formatSeconds(row.timeTakenSeconds)} />
          <InfoRow label="Submission Type" value={submissionTypeLabel(row)} />
          {row.status === 'in_progress' ? <InfoRow label="Last autosave" value={formatIst(row.lastSeenAt)} /> : null}
          {row.status === 'auto_submitted' ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
              Auto-submission is inferred from the paper&apos;s timings (finished at the time limit, or finalised by the server after the deadline). The system does not record who pressed Submit.
            </p>
          ) : null}
        </InfoCard>
        <InfoCard icon={ClipboardList} title="Question Attempt Summary">
          {row.attemptId === null ? (
            <p className="text-sm text-muted-foreground">The student has not opened this paper.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Answered" value={answered} tone="emerald" />
                <StatBox label="Unanswered" value={Math.max(0, total - answered)} tone="rose" />
                {row.correct !== null ? <StatBox label="Correct (MCQ)" value={row.correct} tone="blue" /> : null}
                {row.incorrect !== null ? <StatBox label="Incorrect (MCQ)" value={row.incorrect} tone="amber" /> : null}
              </div>
              <div className="mt-2">
                <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>{row.status === 'in_progress' ? 'Progress (from the last autosave)' : 'Progress'}</span>
                  <span>{answered}/{total}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered}>
                  <div className="h-full bg-primary" style={{ width: `${share}%` }} />
                </div>
              </div>
            </>
          )}
        </InfoCard>
      </div>
      {detail.attempts.length > 0 ? (
        <InfoCard icon={History} title="Attempt history">
          <ul className="divide-y divide-border text-sm">
            {detail.attempts.map((a) => (
              <li key={a.attemptId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-muted-foreground">
                  #{a.attemptId} · {a.type === 'reexam' ? 'Re-exam' : 'Regular'} · started {formatIst(a.startedAt ?? a.createdAt) || '—'}
                </span>
                <span className={cn('font-medium', a.submitted ? 'text-foreground' : 'text-muted-foreground')}>
                  {a.submitted ? `Submitted ${formatIst(a.submittedAt)} · ${a.score ?? 0} marks` : 'Not submitted'}
                </span>
              </li>
            ))}
          </ul>
        </InfoCard>
      ) : null}
    </div>
  );
}

export function EvaluationTab({ row, detail }: TabProps) {
  const pct = percentage(row);
  const grades = detail.grades.filter((g) => g.attemptId === row.attemptId);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <InfoCard icon={ScrollText} title="Marks Breakdown" className="lg:col-span-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="Score" value={marksLabel(row)} tone="emerald" />
          <StatBox label="Percentage" value={pct !== null ? `${pct}%` : '—'} tone="amber" />
          <StatBox label="Pass mark" value={row.passMarks ?? '—'} tone="slate" />
          <StatBox label="Written marks" value={row.descriptiveGraded > 0 ? row.descriptiveMarks : '—'} tone="primary" />
        </div>
        {row.descriptiveAnswered > 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
            {row.descriptiveGraded} of {row.descriptiveAnswered} written answer{row.descriptiveAnswered === 1 ? '' : 's'} graded. Written-answer marks are recorded separately and are not yet added to the score above.
          </p>
        ) : null}
        <div className="grid gap-3 pt-1 sm:grid-cols-2">
          <Labelled label="Evaluation Status"><EvalBadge row={row} /></Labelled>
          <Labelled label="Result">
            <ResultBadge row={row} />
            {!row.resultsPublished ? <p className="mt-1 text-xs text-muted-foreground">Pass / fail is shown once the exam&apos;s results are published.</p> : null}
          </Labelled>
        </div>
      </InfoCard>
      <InfoCard icon={FileText} title="Grader Remarks">
        {grades.length === 0 ? (
          <p className="min-h-[80px] text-sm text-muted-foreground">No written answers graded yet.</p>
        ) : (
          <ul className="space-y-3">
            {grades.map((g) => (
              <li key={`${g.attemptId}:${g.questionId}`} className="rounded-lg border border-border p-3 text-sm">
                <p className="line-clamp-2 font-medium text-foreground" title={g.question}>{g.question || `Question ${g.questionId}`}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {g.score ?? '—'} marks{g.gradedBy ? ` · ${g.gradedBy}` : ''}{g.gradedAt ? ` · ${formatIst(g.gradedAt)}` : ''}
                </p>
                {g.remarks ? <p className="mt-1 whitespace-pre-wrap text-xs text-foreground">{g.remarks}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </InfoCard>
    </div>
  );
}

export function TimelineTab({ row, detail }: TabProps) {
  const events = timelineEvents(row, lastGradedAt(detail.grades, row.attemptId), Date.now());
  return (
    <Card className="gap-0 p-6 shadow-sm">
      <h3 className="mb-6 text-sm font-semibold text-foreground">Activity Timeline <span className="font-normal text-muted-foreground">(IST)</span></h3>
      <ol className="relative ml-3 space-y-6 border-l-2 border-dashed border-border">
        {events.map((ev) => (
          <li key={ev.label} className="relative pl-6">
            <span
              aria-hidden="true"
              className={cn(
                'absolute -left-[9px] top-1 flex size-4 items-center justify-center rounded-full ring-4 ring-background',
                ev.done ? TONE[ev.tone].tile : 'bg-muted',
              )}
            >
              {ev.done ? <CheckCircle2 className="size-3" /> : null}
            </span>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className={cn('text-sm font-medium', ev.done ? 'text-foreground' : 'text-muted-foreground')}>{ev.label}</p>
              <span className="text-xs text-muted-foreground">{formatIst(ev.at) || (ev.done ? 'Done' : 'Pending')}</span>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
