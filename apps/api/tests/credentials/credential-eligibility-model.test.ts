import { describe, expect, test } from 'vitest';

import {
  DEFAULT_GRADING, ISSUE_ERRORS, bindBatchRule, buildAcademic, daysSince, evaluateEligibility, isIssuedByDocs, issueGateError, pickCells,
  type EligibilityInput, type ExamCell, type GateEnrolment, type RawLearnerFacts, type RuleRow,
} from '../../src/operations/credential-eligibility-model.js';
import type { RuleComponent, RuleData } from '../../src/operations/credential-types.js';

const comp = (over: Partial<RuleComponent>): RuleComponent => ({
  componentType: 'Course progress', subject: '', minimum: 100, mandatory: true, coverage: 'All', count: 1, thresholdMode: 'Each', examRequirement: 'All', theory: 40, practical: 40, ...over,
});
const selfPaced: RuleData = {
  ruleType: 'Self-paced auto-issue', reattempt: 'Latest', autoIssue: false,
  components: [comp({}), comp({ componentType: 'Fees cleared' }), comp({ componentType: 'Admission documents verified' })],
};
const rule: RuleRow = { id: 1, offeringId: 10, version: 1, effectiveFrom: '2026-01-01', active: true, name: 'r', data: selfPaced };
const base: EligibilityInput = {
  issued: false, activeHolds: 0, hasOverride: false, completionDate: '2026-11-01',
  values: { 'Course progress': 100, 'Fees cleared': true, 'Admission documents verified': true },
};
const TODAY = '2026-11-12';

describe('Ready to Issue eligibility', () => {
  test('criteria met with no hold is Ready', () => expect(evaluateEligibility(base, rule, TODAY).status).toBe('Ready'));
  test('a running course is In Progress with the percentage met', () => {
    const r = evaluateEligibility({ ...base, completionDate: '2027-01-01', values: { ...base.values, 'Course progress': 20 } }, rule, TODAY);
    expect(r.status).toBe('In Progress');
    expect(r.percent).toBe(67);
  });
  test('an ended course with a failed mandatory criterion is Not Eligible', () => {
    const r = evaluateEligibility({ ...base, values: { ...base.values, 'Fees cleared': false } }, rule, TODAY);
    expect(r.status).toBe('Not Eligible');
    expect(r.criteria.find((c) => c.label === 'Fees cleared')?.met).toBe(false);
    expect(r.failure).toBe('Fees cleared');
  });
  test('met criteria with an active hold is On Hold', () => expect(evaluateEligibility({ ...base, activeHolds: 1 }, rule, TODAY).status).toBe('On Hold'));
  test('a released hold no longer blocks readiness', () => expect(evaluateEligibility({ ...base, activeHolds: 0 }, rule, TODAY).status).toBe('Ready'));
  test('an issued certificate leaves the readiness statuses', () => expect(evaluateEligibility({ ...base, issued: true }, rule, TODAY).status).toBe('Issued'));
  test('a missing rule never silently qualifies', () => {
    const r = evaluateEligibility(base, undefined, TODAY);
    expect(r.status).toBe('Not Eligible');
    expect(r.failure).toBe('No rule effective for this batch');
  });
  test('an override forces Ready, but a hold still beats it, and it skips the date check', () => {
    const failing = { ...base, values: {}, completionDate: '2027-01-01' };
    expect(evaluateEligibility({ ...failing, hasOverride: true }, rule, TODAY).status).toBe('Ready');
    expect(evaluateEligibility({ ...failing, hasOverride: true, activeHolds: 1 }, rule, TODAY).status).toBe('On Hold');
  });
  test('a missing value is Unavailable and counts as not met; untracked components say so', () => {
    const r = evaluateEligibility(base, { ...rule, data: { ...selfPaced, components: [comp({ componentType: 'Internal assessment', minimum: 40 })] } }, TODAY);
    expect(r.criteria[0]).toMatchObject({ actual: 'Unavailable', met: false, source: 'Not tracked in the LMS yet', required: '40%' });
    expect(r.status).toBe('Not Eligible');
  });
  test('optional criteria do not block, numeric criteria compare against the minimum', () => {
    const data: RuleData = { ...selfPaced, components: [comp({ componentType: 'Attendance', minimum: 75 }), comp({ componentType: 'Assignments', minimum: 40, mandatory: false })] };
    const r = evaluateEligibility({ ...base, values: { Attendance: 80 } }, { ...rule, data }, TODAY);
    expect(r.status).toBe('Ready');
    expect(evaluateEligibility({ ...base, values: { Attendance: 74.9 } }, { ...rule, data }, TODAY).status).toBe('Not Eligible');
  });
});

describe('rule binding', () => {
  const v2: RuleRow = { ...rule, id: 2, version: 2, effectiveFrom: '2026-06-01' };
  test('a batch starting before version 2 keeps version 1', () => expect(bindBatchRule([rule, v2], 10, '2026-03-01')?.id).toBe(1));
  test('a later batch takes the latest effective version', () => expect(bindBatchRule([rule, v2], 10, '2026-07-01')?.id).toBe(2));
  test('inactive rules and other offerings are ignored', () => {
    expect(bindBatchRule([{ ...rule, active: false }], 10, '2026-03-01')).toBeUndefined();
    expect(bindBatchRule([rule], 11, '2026-03-01')).toBeUndefined();
  });
});

describe('academic facts', () => {
  const cell = (over: Partial<ExamCell>): ExamCell => ({ subjectKey: 'A', code: 'A1', title: 'Subject A', date: '2026-09-01', obtained: 80, total: 100, status: 'pass', order: 1, ...over });
  const facts = (cells: ExamCell[]): RawLearnerFacts => ({ examCells: cells, examsIncluded: 1, examsPublished: 1, assignmentsPct: null, attendancePct: null, progressPct: null, feesCleared: true, admissionVerified: null });
  test('reattempt Latest vs Best picks the right sitting', () => {
    const cells = [cell({ obtained: 90, date: '2026-09-01' }), cell({ obtained: 50, date: '2026-10-01', order: 2 })];
    expect(pickCells(cells, 'Latest')[0]?.obtained).toBe(50);
    expect(pickCells(cells, 'Best')[0]?.obtained).toBe(90);
  });
  test('values, per-subject keys, CGPA, grade and result', () => {
    const a = buildAcademic(facts([cell({}), cell({ subjectKey: 'B', code: 'B1', title: 'Subject B', obtained: 60 })]), { reattempt: 'Latest', grading: DEFAULT_GRADING });
    expect(a.values.Exams).toBe(70);
    expect(a.values['Exams:A1']).toBe(80);
    expect(a.values['Result published']).toBe(true);
    expect(a.subjects.map((s) => s.grade)).toEqual(['A+', 'B+']);
    expect(a.cgpa).toBe('8.00');
    expect(a.grade).toBe('A');
    expect(a.result).toBe('Pass');
  });
  test('result is not published until every exam of the learner is published; no marks means no Exams value', () => {
    const a = buildAcademic({ ...facts([]), examsPublished: 0 }, { reattempt: 'Latest', grading: DEFAULT_GRADING });
    expect(a.values['Result published']).toBe(false);
    expect(a.values.Exams).toBeUndefined();
    expect(a.cgpa).toBe('');
  });
  test('lesson-wise courses collapse to one whole-course row', () => {
    const a = buildAcademic(facts([cell({}), cell({ subjectKey: 'B', title: 'B', obtained: 60 })]), { reattempt: 'Latest', grading: DEFAULT_GRADING, lessonWise: { title: 'Course X' } });
    expect(a.subjects).toHaveLength(1);
    expect(a.subjects[0]).toMatchObject({ title: 'Course X', total: 70 });
  });
  test('credit-weighted CGPA when every subject has credits', () => {
    const credits = new Map([['A', 3], ['B', 1]]);
    const a = buildAcademic(facts([cell({}), cell({ subjectKey: 'B', title: 'B', obtained: 60 })]), { reattempt: 'Latest', grading: DEFAULT_GRADING, credits });
    expect(a.cgpa).toBe('8.50');
  });
  test('a failed subject fails the marksheet under every_mandatory_subject', () => {
    const a = buildAcademic(facts([cell({ status: 'fail', obtained: 30 })]), { reattempt: 'Latest', grading: { ...DEFAULT_GRADING, passRule: 'every_mandatory_subject' } });
    expect(a.result).toBe('Fail');
  });
});

describe('issue gate', () => {
  const ready = (id: number, types: string[] = []): [number, GateEnrolment] => [id, { enrolId: id, status: 'Ready', existingTypes: types }];
  const found = new Map<number, GateEnrolment>([ready(1), ready(2), [3, { enrolId: 3, status: 'On Hold', existingTypes: [] }], ready(4, ['certificate'])]);
  test('refuses empty, duplicate and bad type selections', () => {
    expect(issueGateError([], ['certificate'], found)).toBe(ISSUE_ERRORS.none);
    expect(issueGateError([1, 1], ['certificate'], found)).toBe(ISSUE_ERRORS.duplicate);
    expect(issueGateError([1], [], found)).toBe(ISSUE_ERRORS.types);
    expect(issueGateError([1], ['transcript'], found)).toBe(ISSUE_ERRORS.type);
  });
  test('a hold blocks the whole call; ready learners with free types pass', () => {
    expect(issueGateError([1, 3], ['certificate'], found)).toBe(ISSUE_ERRORS.notReady);
    expect(issueGateError([1, 2], ['certificate', 'marksheet'], found)).toBeNull();
  });
  test('an existing version of the type needs a Correction', () => {
    expect(issueGateError([4], ['certificate'], found)).toContain('Use Correction');
    expect(issueGateError([4], ['marksheet'], found)).toBeNull();
  });
  test('out-of-scope and unknown enrolments are refused', () => {
    expect(issueGateError([9], ['certificate'], found)).toBe('Learner not found.');
    expect(issueGateError([5], ['certificate'], new Map([[5, { enrolId: 5, status: 'Out of scope', existingTypes: [] }]]))).toBe(ISSUE_ERRORS.scope);
  });
  test('a marksheet alone leaves the learner Ready; a valid certificate or provisional issues them', () => {
    expect(isIssuedByDocs([{ docType: 'marksheet', status: 'valid' }])).toBe(false);
    expect(isIssuedByDocs([{ docType: 'provisional', status: 'valid' }])).toBe(true);
    expect(isIssuedByDocs([{ docType: 'certificate', status: 'revoked' }])).toBe(false);
  });
});

describe('days waiting', () => {
  test('whole days, never negative', () => {
    expect(daysSince('2026-11-01', '2026-11-12')).toBe(11);
    expect(daysSince('2026-12-01', '2026-11-12')).toBe(0);
    expect(daysSince('', '2026-11-12')).toBe(0);
  });
});
