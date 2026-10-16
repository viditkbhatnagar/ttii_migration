import { cn } from '@/lib/utils';
import { Pill, type Tone } from '../../shared/components/ui-kit.js';
import {
  OVERALL_LABEL,
  STATUS_LABEL,
  formatYmd,
  type ExamResultsStatus,
  type OverallResult,
  type StudentSitting,
} from './exam-results-model.js';

// Exam → Result's own pieces (outcome and status badges, a subject's mark).
// Shared tiles/boxes/pills live in the admin design kit.

const OVERALL_TONE: Record<OverallResult, Tone> = {
  passed: 'emerald',
  failed: 'rose',
  incomplete: 'amber',
  absent: 'slate',
  pending: 'blue',
  marks_only: 'slate',
  reexam: 'primary',
};

const STATUS_TONE: Record<ExamResultsStatus, Tone> = {
  in_progress: 'blue',
  ready: 'amber',
  published: 'emerald',
};

export function OverallBadge({ result }: { result: OverallResult }) {
  return <Pill tone={OVERALL_TONE[result] ?? 'slate'}>{OVERALL_LABEL[result] ?? result}</Pill>;
}

export function ExamStatusBadge({ status }: { status: ExamResultsStatus }) {
  return <Pill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Pill>;
}

/** One subject's mark in the student table: the score, coloured by outcome. */
export function SittingMark({ cell }: { cell: StudentSitting }) {
  if (cell.status === 'not_entered') {
    // A supplementary exam's student sits only the subjects they were entered for.
    return <span className="text-[11px] text-slate-400" title="Not entered for this subject">n/a</span>;
  }
  if (cell.status === 'reexam') {
    return (
      <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
        Re-exam {formatYmd(cell.reExam?.date ?? '').slice(0, 5)}
      </span>
    );
  }
  if (cell.status === 'absent') {
    return (
      <span className="text-xs font-medium text-slate-500">
        Absent{cell.reExam?.state === 'missed' ? <span className="block text-[10px] font-normal">re-exam missed</span> : null}
      </span>
    );
  }
  if (cell.status === 'pending' || cell.score === null) return <span className="text-xs text-slate-400">—</span>;
  const tone = cell.status === 'fail' ? 'text-rose-700' : cell.status === 'pass' ? 'text-emerald-700' : 'text-slate-700';
  return (
    <span className={cn('text-sm font-semibold tabular-nums', tone)}>
      {cell.score}
      {cell.status === 'fail' ? <span className="ml-0.5 text-[10px] font-bold">F</span> : null}
      {cell.reExam?.state === 'completed' ? (
        <span
          className="ml-1 rounded bg-primary/10 px-1 text-[10px] font-bold text-primary"
          title={`Re-exam mark. Original paper: ${cell.previousScore ?? '—'}`}
        >
          R
        </span>
      ) : null}
    </span>
  );
}

export { KpiTile, Pill, StatBox, type Tone } from '../../shared/components/ui-kit.js';
