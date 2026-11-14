import type { Tone } from '../../../shared/components/ui-kit.js';
import { fmtDate } from '../credential-format.js';
import type { DocTypeKey, EligibilityStatus, ReadyRow } from '../credential-issue-types.js';

export const STAGES: EligibilityStatus[] = ['Ready', 'On Hold', 'Not Eligible', 'In Progress'];
export const STAGE_TONE: Record<EligibilityStatus, Tone> = { Ready: 'emerald', 'On Hold': 'amber', 'Not Eligible': 'rose', 'In Progress': 'blue' };

export interface ReadyFilters {
  query: string;
  course: string;
  batch: string;
  centre: string;
  nameConfirmed: '' | 'yes' | 'no';
  holdReason: string;
  examSession: string;
  from: string;
  to: string;
}
export const EMPTY_READY_FILTERS: ReadyFilters = {
  query: '', course: '', batch: '', centre: '', nameConfirmed: '', holdReason: '', examSession: '', from: '', to: '',
};

export function filterReady(rows: ReadyRow[], stage: EligibilityStatus, f: ReadyFilters): ReadyRow[] {
  const q = f.query.trim().toLowerCase();
  return rows.filter((r) => {
    if (r.status !== stage) return false;
    if (q && !`${r.learner} ${r.enrolmentNo}`.toLowerCase().includes(q)) return false;
    if (f.course && r.course !== f.course) return false;
    if (f.batch && r.batch !== f.batch) return false;
    if (f.centre && r.centre !== f.centre) return false;
    if (f.examSession && r.examSession !== f.examSession) return false;
    if (stage === 'Ready' && f.nameConfirmed && r.nameConfirmed !== (f.nameConfirmed === 'yes')) return false;
    if (stage === 'On Hold' && f.holdReason && r.holdReason !== f.holdReason) return false;
    if (f.from && (!r.completionDate || r.completionDate < f.from)) return false;
    if (f.to && (!r.completionDate || r.completionDate > f.to)) return false;
    return true;
  });
}

export type ReadySortKey = 'learner' | 'course' | 'batch' | 'centre' | 'completionDate' | 'percent' | 'daysWaiting' | 'holdReason' | 'heldSince';
export function sortValue(r: ReadyRow, k: ReadySortKey): string | number {
  switch (k) {
    case 'learner': return r.learner.toLowerCase();
    case 'course': return r.course.toLowerCase();
    case 'batch': return r.batch.toLowerCase();
    case 'centre': return r.centre.toLowerCase();
    case 'completionDate': return r.completionDate;
    case 'percent': return r.percent;
    case 'daysWaiting': return r.daysWaiting;
    case 'holdReason': return r.holdReason.toLowerCase();
    default: return r.heldSince;
  }
}

/** Per-stage counts over the rows that pass every filter except the stage itself. */
export function stageCounts(rows: ReadyRow[], f: ReadyFilters): Record<EligibilityStatus, number> {
  const counts: Record<EligibilityStatus, number> = { Ready: 0, 'On Hold': 0, 'Not Eligible': 0, 'In Progress': 0 };
  for (const s of STAGES) counts[s] = filterReady(rows, s, f).length;
  return counts;
}

export const DOC_OPTIONS: Array<{ value: 'certificate' | 'marksheet' | 'both' | 'provisional'; label: string; types: DocTypeKey[] }> = [
  { value: 'certificate', label: 'Certificate', types: ['certificate'] },
  { value: 'marksheet', label: 'Marksheet', types: ['marksheet'] },
  { value: 'both', label: 'Both', types: ['certificate', 'marksheet'] },
  { value: 'provisional', label: 'Provisional Certificate', types: ['provisional'] },
];
export type DocChoice = (typeof DOC_OPTIONS)[number]['value'];

/** A document type is unavailable when any selected learner already holds one of its types. */
export function choiceDisabled(choice: DocChoice, rows: ReadyRow[]): boolean {
  const types = DOC_OPTIONS.find((o) => o.value === choice)?.types ?? [];
  return rows.some((r) => types.some((t) => r.issuedTypes.includes(t)));
}

export const typesFor = (choice: DocChoice): DocTypeKey[] => DOC_OPTIONS.find((o) => o.value === choice)?.types ?? [];

/** Excel columns (spec 1.2). Written as CSV: no spreadsheet library is installed in the web app. */
export function readyExportRows(rows: ReadyRow[]): Array<Array<string | number>> {
  const head = ['Learner', 'Enrolment no.', 'Course', 'Batch', 'Centre', 'Completion date', 'CGPA', 'Grade', 'Certificate status', 'Marksheet status', 'Name confirmed'];
  const body = rows.map((r) => [
    r.learner, r.enrolmentNo, r.course, r.batch, r.centre, fmtDate(r.completionDate), r.cgpa, r.grade,
    r.issuedTypes.includes('certificate') ? 'Issued' : 'Not issued',
    r.issuedTypes.includes('marksheet') ? 'Issued' : 'Not issued',
    r.nameConfirmed ? 'Y' : 'N',
  ]);
  return [head, ...body];
}
