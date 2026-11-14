import {
  BINARY_COMPONENTS, DOC_TYPE_LABEL, ISSUABLE_DOC_TYPES, gradeFor,
  type ComponentType, type DocType, type EligibilityStatus, type GradeBand, type GradingData, type RuleComponent, type RuleData,
} from './credential-types.js';

// Credential Manager — eligibility rules (spec §3), pure and tested. No I/O: the
// LMS adapter (credential-lms-adapter.ts) supplies the facts, the service binds
// the rule and calls evaluateEligibility.

/** TTII 10-point scale, used when no grading scheme is linked to the offering. */
export const DEFAULT_GRADING: GradingData = {
  scaleMax: 10,
  passMinimum: 40,
  passRule: 'overall',
  cgpaMethod: 'credit_weighted',
  offeringIds: [],
  bands: [
    { min: 90, max: 100, grade: 'O', points: 10 },
    { min: 80, max: 89.99, grade: 'A+', points: 9 },
    { min: 70, max: 79.99, grade: 'A', points: 8 },
    { min: 60, max: 69.99, grade: 'B+', points: 7 },
    { min: 50, max: 59.99, grade: 'B', points: 6 },
    { min: 40, max: 49.99, grade: 'C', points: 5 },
    { min: 0, max: 39.99, grade: 'F', points: 0 },
  ],
};
export const DEFAULT_GRADING_NAME = 'TTII 10-point scale';

// ── Rule binding ─────────────────────────────────────────────────────────────
export interface RuleRow {
  id: number;
  offeringId: number | null;
  version: number;
  /** YYYY-MM-DD */
  effectiveFrom: string;
  active: boolean;
  name: string;
  data: RuleData;
}

/** Latest active rule of the offering with effective_from <= batch start, by version (spec §3). */
export function bindBatchRule(rules: readonly RuleRow[], offeringId: number, batchStart: string): RuleRow | undefined {
  return rules
    .filter((r) => r.offeringId === offeringId && r.active && r.effectiveFrom !== '' && r.effectiveFrom <= batchStart)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || b.version - a.version)[0];
}

// ── Criteria ─────────────────────────────────────────────────────────────────
export type ValueMap = Record<string, number | boolean>;

export interface Criterion {
  id: string;
  label: string;
  required: string;
  actual: string;
  met: boolean;
  mandatory: boolean;
  /** "Academic record", "Awaiting result" or "Not tracked in the LMS yet". */
  source: string;
}

/** Components with no LMS data behind them (brief → Real-data decisions). */
export const UNTRACKED_COMPONENTS: readonly ComponentType[] = ['Internal assessment', 'Feedback submitted', 'Project/practicum approved'];

export function criterionKey(c: Pick<RuleComponent, 'componentType' | 'subject'>): string {
  return c.subject ? `${c.componentType}:${c.subject}` : c.componentType;
}

export function evaluateCriteria(components: readonly RuleComponent[], values: ValueMap): Criterion[] {
  return components.map((c, index) => {
    const key = criterionKey(c);
    const actual = values[key] ?? (c.subject ? values[`${c.componentType}:${c.subject.toLowerCase()}`] : undefined);
    const binary = BINARY_COMPONENTS.includes(c.componentType);
    const untracked = UNTRACKED_COMPONENTS.includes(c.componentType);
    return {
      id: `${index}:${key}`,
      label: c.subject ? `${c.componentType} · ${c.subject}` : c.componentType,
      required: binary ? 'Yes' : `${c.minimum}%`,
      actual: actual === undefined ? 'Unavailable' : typeof actual === 'boolean' ? (actual ? 'Yes' : 'No') : `${actual}%`,
      met: actual !== undefined && (binary ? actual === true : typeof actual === 'number' && actual >= c.minimum),
      mandatory: c.mandatory,
      source: actual !== undefined ? 'Academic record' : untracked ? 'Not tracked in the LMS yet' : 'Awaiting result',
    };
  });
}

export interface EligibilityInput {
  /** A valid certificate or provisional certificate already exists for the enrolment. */
  issued: boolean;
  /** Active (unreleased) holds. */
  activeHolds: number;
  hasOverride: boolean;
  /** YYYY-MM-DD, '' when unknown. */
  completionDate: string;
  values: ValueMap;
}

export interface EligibilityResult {
  status: EligibilityStatus;
  criteria: Criterion[];
  percent: number;
  failure: string;
}

/** The state machine of spec §2.12. */
export function evaluateEligibility(input: EligibilityInput, rule: RuleRow | undefined, today: string): EligibilityResult {
  const criteria = evaluateCriteria(rule?.data.components ?? [], input.values);
  const met = !!rule && criteria.length > 0 && criteria.filter((c) => c.mandatory).every((c) => c.met);
  const status: EligibilityStatus = input.issued
    ? 'Issued'
    : input.activeHolds > 0
      ? 'On Hold'
      : input.hasOverride
        ? 'Ready'
        : input.completionDate !== '' && input.completionDate > today
          ? 'In Progress'
          : met
            ? 'Ready'
            : 'Not Eligible';
  return {
    status,
    criteria,
    percent: criteria.length ? Math.round((criteria.filter((c) => c.met).length / criteria.length) * 100) : 0,
    failure: !rule
      ? 'No rule effective for this batch'
      : criteria.filter((c) => c.mandatory && !c.met).map((c) => c.label).join(', '),
  };
}

// ── Academic facts → values, subjects, CGPA ──────────────────────────────────
export interface ExamCell {
  /** Subject code, else the title. */
  subjectKey: string;
  code: string;
  title: string;
  /** YYYY-MM-DD of the sitting. */
  date: string;
  obtained: number;
  total: number;
  status: 'pass' | 'fail' | 'marks_only';
  /** Order tiebreak between two sittings on the same day (higher = later). */
  order: number;
}

export interface RawLearnerFacts {
  /** Published, scored sittings of the course. */
  examCells: ExamCell[];
  /** The course's real exams that include the learner / how many of them are published. */
  examsIncluded: number;
  examsPublished: number;
  assignmentsPct: number | null;
  attendancePct: number | null;
  progressPct: number | null;
  feesCleared: boolean | null;
  admissionVerified: boolean | null;
}

export interface SubjectRow {
  code: string;
  title: string;
  credits: number | null;
  internal: number | null;
  theory: number | null;
  practical: number | null;
  total: number;
  points: number;
  grade: string;
  result: 'Pass' | 'Fail';
}

export interface Academic {
  values: ValueMap;
  subjects: SubjectRow[];
  cgpa: string;
  grade: string;
  /** Overall result of the marksheet. */
  result: 'Pass' | 'Fail' | '';
  gradingName: string;
}

const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;
const pct = (obtained: number, total: number): number => (total > 0 ? round1((obtained / total) * 100) : 0);

/** One cell per subject: the Latest sitting, or the Best percentage (rule.reattempt). */
export function pickCells(cells: readonly ExamCell[], reattempt: 'Best' | 'Latest'): ExamCell[] {
  const bySubject = new Map<string, ExamCell>();
  for (const cell of cells) {
    const cur = bySubject.get(cell.subjectKey);
    if (!cur) { bySubject.set(cell.subjectKey, cell); continue; }
    const better = reattempt === 'Best'
      ? pct(cell.obtained, cell.total) > pct(cur.obtained, cur.total)
      : cell.date > cur.date || (cell.date === cur.date && cell.order > cur.order);
    if (better) bySubject.set(cell.subjectKey, cell);
  }
  return [...bySubject.values()];
}

export function bandFor(percent: number, bands: readonly GradeBand[]): GradeBand {
  const lowest = [...bands].sort((a, b) => a.min - b.min)[0];
  return gradeFor(percent, bands) ?? lowest ?? { min: 0, max: 100, grade: 'F', points: 0 };
}

/** The overall grade: the highest band whose points do not exceed the CGPA. */
export function overallGrade(cgpa: number, bands: readonly GradeBand[]): string {
  const sorted = [...bands].sort((a, b) => b.points - a.points);
  return (sorted.find((b) => b.points <= cgpa) ?? sorted[sorted.length - 1])?.grade ?? '';
}

export function buildAcademic(
  facts: RawLearnerFacts,
  opts: { reattempt: 'Best' | 'Latest'; grading: GradingData; gradingName?: string; lessonWise?: { title: string } | null; credits?: ReadonlyMap<string, number> },
): Academic {
  const { grading } = opts;
  let cells = pickCells(facts.examCells, opts.reattempt);
  if (opts.lessonWise && cells.length > 0) {
    // Lesson-wise courses have one whole-course exam row.
    const obtained = cells.reduce((s, c) => s + c.obtained, 0);
    const total = cells.reduce((s, c) => s + c.total, 0);
    const date = cells.map((c) => c.date).sort().at(-1) ?? '';
    const status = cells.every((c) => c.status === 'pass') ? 'pass' : cells.some((c) => c.status === 'fail') ? 'fail' : 'marks_only';
    cells = [{ subjectKey: opts.lessonWise.title, code: '', title: opts.lessonWise.title, date, obtained, total, status, order: 0 }];
  }

  const values: ValueMap = {};
  if (cells.length > 0) {
    values.Exams = pct(cells.reduce((s, c) => s + c.obtained, 0), cells.reduce((s, c) => s + c.total, 0));
    for (const cell of cells) {
      const p = pct(cell.obtained, cell.total);
      if (cell.code) values[`Exams:${cell.code}`] = p;
      values[`Exams:${cell.title}`] = p;
      values[`Exams:${cell.title.toLowerCase()}`] = p;
      if (cell.code) values[`Exams:${cell.code.toLowerCase()}`] = p;
    }
  }
  values['Result published'] = facts.examsIncluded > 0 && facts.examsPublished === facts.examsIncluded;
  if (facts.assignmentsPct !== null) values.Assignments = facts.assignmentsPct;
  if (facts.attendancePct !== null) values.Attendance = facts.attendancePct;
  if (facts.progressPct !== null) values['Course progress'] = facts.progressPct;
  if (facts.feesCleared !== null) values['Fees cleared'] = facts.feesCleared;
  if (facts.admissionVerified !== null) values['Admission documents verified'] = facts.admissionVerified;

  const subjects: SubjectRow[] = cells.map((cell) => {
    const total = pct(cell.obtained, cell.total);
    const band = bandFor(total, grading.bands);
    const passed = cell.status === 'pass' || (cell.status === 'marks_only' && total >= grading.passMinimum);
    return {
      code: cell.code,
      title: cell.title,
      credits: opts.credits?.get(cell.subjectKey) ?? null,
      internal: null,
      theory: total,
      practical: null,
      total,
      points: band.points,
      grade: band.grade,
      result: passed ? 'Pass' : 'Fail',
    };
  });

  let cgpaNum = 0;
  if (subjects.length > 0) {
    const weighted = grading.cgpaMethod === 'credit_weighted' && subjects.every((s) => s.credits !== null && s.credits > 0);
    cgpaNum = weighted
      ? subjects.reduce((s, r) => s + r.points * (r.credits ?? 0), 0) / subjects.reduce((s, r) => s + (r.credits ?? 0), 0)
      : subjects.reduce((s, r) => s + r.points, 0) / subjects.length;
  }
  const failedSubject = subjects.some((s) => s.result === 'Fail');
  const overallPct = typeof values.Exams === 'number' ? values.Exams : 0;
  const result: Academic['result'] = subjects.length === 0
    ? ''
    : grading.passRule === 'overall'
      ? (overallPct >= grading.passMinimum ? 'Pass' : 'Fail')
      : (failedSubject ? 'Fail' : 'Pass');
  return {
    values,
    subjects,
    cgpa: subjects.length > 0 ? round2(cgpaNum).toFixed(2) : '',
    grade: subjects.length > 0 ? overallGrade(round2(cgpaNum), grading.bands) : '',
    result,
    gradingName: opts.gradingName ?? DEFAULT_GRADING_NAME,
  };
}

// ── Issue gate (spec §3 "Issue gate") ────────────────────────────────────────
export interface GateEnrolment {
  enrolId: number;
  status: EligibilityStatus | 'Out of scope' | 'Missing';
  /** Document types already issued for the enrolment (any version, any status). */
  existingTypes: readonly string[];
}

export const ISSUE_ERRORS = {
  none: 'Select at least one learner.',
  duplicate: 'Each learner can be selected once.',
  types: 'Choose at least one document type to issue.',
  type: 'Only Certificate, Marksheet and Provisional Certificate can be issued.',
  scope: 'Credentials for this offering are not issued by TTII.',
  notReady: 'Every learner must be Ready and free of holds.',
} as const;

/** The refusal for an issue call, or null when it may proceed. */
export function issueGateError(enrolIds: readonly number[], types: readonly string[], found: ReadonlyMap<number, GateEnrolment>): string | null {
  if (enrolIds.length === 0) return ISSUE_ERRORS.none;
  if (new Set(enrolIds).size !== enrolIds.length) return ISSUE_ERRORS.duplicate;
  if (types.length === 0) return ISSUE_ERRORS.types;
  if (new Set(types).size !== types.length || types.some((t) => !(ISSUABLE_DOC_TYPES as readonly string[]).includes(t))) return ISSUE_ERRORS.type;
  for (const id of enrolIds) {
    const e = found.get(id);
    if (!e || e.status === 'Missing') return 'Learner not found.';
    if (e.status === 'Out of scope') return ISSUE_ERRORS.scope;
    if (e.status !== 'Ready') return ISSUE_ERRORS.notReady;
    const clash = types.find((t) => e.existingTypes.includes(t));
    if (clash) return `A ${DOC_TYPE_LABEL[clash as DocType].toLowerCase()} already exists. Use Correction for a new version.`;
  }
  return null;
}

/** Issued = a valid certificate or provisional certificate exists (a marksheet alone leaves the learner Ready — spec quirk 9). */
export function isIssuedByDocs(docs: ReadonlyArray<{ docType: string; status: string }>): boolean {
  return docs.some((d) => d.status === 'valid' && (d.docType === 'certificate' || d.docType === 'provisional'));
}

/** Whole days from a YYYY-MM-DD date to today (>= 0). */
export function daysSince(ymdDate: string, today: string): number {
  if (!ymdDate) return 0;
  const [y1, m1, d1] = ymdDate.split('-').map(Number);
  const [y2, m2, d2] = today.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
  return Math.max(0, Math.floor((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000));
}
