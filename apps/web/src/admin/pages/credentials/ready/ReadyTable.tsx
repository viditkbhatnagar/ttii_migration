import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortHead } from '../../students/list-chrome.js';
import { dash, fmtDate, fmtDateTime } from '../credential-format.js';
import type { ReadyRow } from '../credential-issue-types.js';
import type { DocChoice, ReadySortKey } from './ready-model.js';
import type { EligibilityStatus } from '../credential-issue-types.js';

export interface ReadyTableProps {
  rows: ReadyRow[];
  stage: EligibilityStatus;
  selected: Set<number>;
  sortKey: ReadySortKey;
  sortDir: 'asc' | 'desc';
  canOverride: boolean;
  onSort: (k: ReadySortKey) => void;
  onToggle: (id: number, on: boolean) => void;
  onToggleAll: () => void;
  onView: (row: ReadyRow) => void;
  onHold: (row: ReadyRow, kind: 'place' | 'release') => void;
  onOverride: (row: ReadyRow) => void;
  onGenerate: (row: ReadyRow, choice: DocChoice) => void;
}

const GENERATE: Array<{ choice: DocChoice; label: string }> = [
  { choice: 'certificate', label: 'Generate Certificate' },
  { choice: 'marksheet', label: 'Generate Marksheet' },
  { choice: 'both', label: 'Generate Both' },
  { choice: 'provisional', label: 'Generate Provisional Certificate' },
];

function NameConfirmed({ row }: { row: ReadyRow }) {
  if (!row.nameConfirmed) return <span className="text-muted-foreground">N</span>;
  return (
    <div className="min-w-0 max-w-56">
      <p className="text-xs font-medium text-emerald-700">Name confirmed</p>
      <p className="truncate text-xs text-foreground">{row.printedName}</p>
      {row.address ? <p className="truncate text-xs text-muted-foreground">{row.address}</p> : null}
    </div>
  );
}

export function ReadyTable(p: ReadyTableProps) {
  const { stage } = p;
  const allSelected = p.rows.length > 0 && p.rows.every((r) => p.selected.has(r.enrolId));
  const sort = { sortKey: p.sortKey, dir: p.sortDir, onSort: p.onSort };
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10"><Checkbox aria-label="Select all rows" checked={allSelected} onCheckedChange={p.onToggleAll} /></TableHead>
          <SortHead label="Learner / Enrolment no." k="learner" {...sort} />
          <SortHead label="Course" k="course" {...sort} />
          <SortHead label="Batch" k="batch" {...sort} />
          <SortHead label="Centre" k="centre" {...sort} />
          <SortHead label="Completion date" k="completionDate" {...sort} />
          {stage === 'Ready' ? (
            <>
              <TableHead className="whitespace-nowrap text-xs font-medium text-muted-foreground">CGPA / grade</TableHead>
              <SortHead label="Days waiting" k="daysWaiting" {...sort} />
              <TableHead className="whitespace-nowrap text-xs font-medium text-muted-foreground">Name confirmed</TableHead>
            </>
          ) : null}
          {stage === 'On Hold' ? (
            <>
              <SortHead label="Hold reason" k="holdReason" {...sort} />
              <SortHead label="On hold since" k="heldSince" {...sort} />
            </>
          ) : null}
          {stage === 'Not Eligible' ? <TableHead className="whitespace-nowrap text-xs font-medium text-muted-foreground">Missing requirements</TableHead> : null}
          {stage === 'In Progress' ? <SortHead label="Criteria met" k="percent" {...sort} /> : null}
          <TableHead className="w-12 text-xs font-medium text-muted-foreground">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {p.rows.map((r) => (
          <TableRow key={r.enrolId} data-state={p.selected.has(r.enrolId) ? 'selected' : undefined}>
            <TableCell><Checkbox aria-label={`Select ${r.learner}`} checked={p.selected.has(r.enrolId)} onCheckedChange={(v) => p.onToggle(r.enrolId, v === true)} /></TableCell>
            <TableCell>
              <button type="button" onClick={() => p.onView(r)} className="text-left text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                {r.learner}
              </button>
              <p className="text-xs text-muted-foreground">{r.enrolmentNo}</p>
            </TableCell>
            <TableCell className="min-w-40 max-w-64 whitespace-normal text-sm">{dash(r.course)}</TableCell>
            <TableCell className="whitespace-nowrap text-sm">{dash(r.batch)}</TableCell>
            <TableCell className="whitespace-nowrap text-sm">{dash(r.centre)}</TableCell>
            <TableCell className="whitespace-nowrap text-sm tabular-nums">{dash(fmtDate(r.completionDate))}</TableCell>
            {stage === 'Ready' ? (
              <>
                <TableCell className="whitespace-nowrap text-sm">{dash(r.cgpa)}{r.grade ? ` / ${r.grade}` : ''}</TableCell>
                <TableCell className="text-sm tabular-nums">{r.daysWaiting}</TableCell>
                <TableCell><NameConfirmed row={r} /></TableCell>
              </>
            ) : null}
            {stage === 'On Hold' ? (
              <>
                <TableCell className="min-w-32 whitespace-normal text-sm">{dash(r.holdReason)}</TableCell>
                <TableCell className="whitespace-nowrap text-sm tabular-nums">{dash(fmtDateTime(r.heldSince))}</TableCell>
              </>
            ) : null}
            {stage === 'Not Eligible' ? <TableCell className="min-w-48 max-w-72 whitespace-normal text-sm text-rose-700">{dash(r.failure)}</TableCell> : null}
            {stage === 'In Progress' ? <TableCell className="text-sm tabular-nums">{r.percent}%</TableCell> : null}
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Actions for ${r.enrolmentNo}`}><MoreHorizontal aria-hidden="true" className="size-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => p.onView(r)}>View criteria</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => p.onHold(r, r.status === 'On Hold' ? 'release' : 'place')}>
                    {r.status === 'On Hold' ? 'Release hold' : 'Place hold'}
                  </DropdownMenuItem>
                  {p.canOverride && r.status !== 'Ready' ? (
                    <DropdownMenuItem onClick={() => p.onOverride(r)}>Manual override to Ready</DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  {GENERATE.map((g) => (
                    <DropdownMenuItem key={g.choice} disabled={r.status !== 'Ready'} onClick={() => p.onGenerate(r, g.choice)}>{g.label}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
