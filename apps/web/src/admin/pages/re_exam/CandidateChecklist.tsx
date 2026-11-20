import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { TONE } from '../../shared/components/ui-tones.js';
import { filterCandidates } from '../exam_result/re-exam-candidates.js';
import type { ReExamCandidate } from './ScheduleReExamDialog.js';

// The student checklist shared by the single-subject and whole-exam re-exam
// dialogs. Students who need attention come first; everyone else who sat the
// paper (passed) is listed below under their own heading, unticked, with a
// search box once the list is long (a 60-student cohort).

const SEARCH_FROM = 8;

function Row({ c, checked, onToggle }: { c: ReExamCandidate; checked: boolean; onToggle: (userId: number) => void }) {
  return (
    <li>
      <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/40">
        <input type="checkbox" className="size-4 accent-primary" checked={checked} onChange={() => onToggle(c.userId)} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{c.name}</span>
          <span className="block text-[11px] text-muted-foreground">{c.studentCode}</span>
        </span>
        <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold', TONE[c.tone].pill)}>{c.note}</span>
      </label>
    </li>
  );
}

export function CandidateChecklist({
  candidates, selected, onToggle, scrollClass = 'max-h-72',
}: {
  candidates: ReExamCandidate[];
  selected: ReadonlySet<number>;
  onToggle: (userId: number) => void;
  /** Height cap of the scrolling list of other students. */
  scrollClass?: string;
}) {
  const [query, setQuery] = useState('');
  const main = candidates.filter((c) => !c.other);
  const others = candidates.filter((c) => c.other);
  const shown = filterCandidates(others, query);
  const tickedOthers = others.filter((c) => selected.has(c.userId)).length;

  return (
    <div className="space-y-3">
      {main.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {main.map((c) => <Row key={c.userId} c={c} checked={selected.has(c.userId)} onToggle={onToggle} />)}
        </ul>
      ) : null}
      {others.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground">
            Other students who sat this paper ({others.length})
            {tickedOthers > 0 ? <span className="ml-1.5 font-normal text-muted-foreground">{tickedOthers} ticked</span> : null}
          </p>
          {others.length > SEARCH_FROM ? (
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or student code"
              aria-label="Search the other students who sat this paper"
              className="h-8 text-sm"
            />
          ) : null}
          <ul className={cn('divide-y divide-border overflow-y-auto rounded-lg border border-border', scrollClass)}>
            {shown.map((c) => <Row key={c.userId} c={c} checked={selected.has(c.userId)} onToggle={onToggle} />)}
            {shown.length === 0 ? <li className="px-3 py-3 text-center text-xs text-muted-foreground">No student matches.</li> : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
