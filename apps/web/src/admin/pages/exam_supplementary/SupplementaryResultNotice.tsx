import { ArrowRight, FilePlus2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE } from '../../shared/components/ui-tones.js';
import {
  SUPPLEMENTARY_STATUS_LABEL,
  outcomeChip,
  outcomeLabel,
  type SupplementaryLinks,
  type SupplementaryOutcome,
} from './supplementary-model.js';

// Exam → Result's supplementary pieces (TTII 2026-10-16): a notice linking an
// exam to the supplementary exams created from it (or a supplementary exam to
// its regular exam), and the supplementary outcome under a subject's mark.
// Read-only: a supplementary pass does not change the regular exam's result.

function LinkButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 hover:no-underline">
      {children} <ArrowRight aria-hidden="true" className="size-3" />
    </button>
  );
}

export function SupplementaryNotice({ links, onOpenResult, onOpenWizard }: {
  links: SupplementaryLinks;
  onOpenResult: (examId: number) => void;
  onOpenWizard: (examId: number) => void;
}) {
  if (!links.supplementaryOf && links.supplementaries.length === 0) return null;
  return (
    <div role="status" className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
      <FilePlus2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0 space-y-1">
        {links.supplementaryOf ? (
          <p>
            Supplementary exam of <strong>{links.supplementaryOf.title}</strong>
            {links.supplementaryOf.examCode ? ` (${links.supplementaryOf.examCode})` : ''}. Its students sit only the subjects they were entered for.{' '}
            <LinkButton onClick={() => onOpenResult(links.supplementaryOf?.examId ?? 0)}>Regular exam results</LinkButton>
          </p>
        ) : null}
        {links.supplementaries.length > 0 ? (
          <>
            <p>
              {links.supplementaries.length === 1 ? 'A supplementary exam was' : `${links.supplementaries.length} supplementary exams were`} created from this exam.
              Each student's supplementary outcome is shown under their subject mark. It does not change this exam's own result.
            </p>
            <ul className="space-y-0.5 text-xs">
              {links.supplementaries.map((s) => (
                <li key={s.examId} className="flex flex-wrap items-center gap-x-2">
                  <span className="font-medium">{s.title}</span>
                  <span className="text-muted-foreground">{[s.examCode, SUPPLEMENTARY_STATUS_LABEL[s.status], `${s.subjects} subject${s.subjects === 1 ? '' : 's'}`, `${s.students} student${s.students === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}</span>
                  {s.status === 'draft'
                    ? <LinkButton onClick={() => onOpenWizard(s.examId)}>Finish in the wizard</LinkButton>
                    : <LinkButton onClick={() => onOpenResult(s.examId)}>Results</LinkButton>}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}

/** The supplementary outcome under a subject mark in the result grid. */
export function SupplementaryChip({ outcome }: { outcome: SupplementaryOutcome }) {
  const chip = outcomeChip(outcome);
  return (
    <span className={cn('mt-0.5 block w-fit whitespace-nowrap rounded border px-1 text-[10px] font-semibold', TONE[chip.tone].pill)} title={outcomeLabel(outcome)}>
      {chip.text}
    </span>
  );
}
