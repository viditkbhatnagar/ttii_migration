import { describe, expect, test } from 'vitest';

import {
  afterImport,
  errorReportRows,
  parseCsv,
  readImportFile,
  reportCounts,
  templateRows,
  toBulkPayload,
  toFailures,
  toReport,
} from '../src/admin/pages/question_bank/question-import-model';
import { parseQuestionCsvRow } from '../src/admin/pages/question_bank/question-csv';

const FILE = [
  'type,question,a,b,c,d,answer',
  'MCQ,"What is 2 + 2, exactly?",3,4,5,6,B',
  '',
  'MCQ,Broken,A,,C,,C',
  'Descriptive,"Explain ""free choice"".",,,,,',
  'Essay,Unknown type,,,,,',
].join('\r\n');

describe('reading the upload', () => {
  test('quoted commas, doubled quotes, CRLF and a BOM', () => {
    expect(parseCsv(`${String.fromCharCode(0xfeff)}a,"b,c","say ""hi"""\r\nd`)).toEqual([['a', 'b,c', 'say "hi"'], ['d']]);
  });

  test('rows keep their file line; unreadable lines are reported, blank lines skipped', () => {
    const { rows, problems } = readImportFile(FILE);
    // A blank option in the MIDDLE is kept, not shifted: the server refuses
    // that row by name ("Option B is empty") in the preview.
    expect(rows.map((r) => [r.line, r.question.title])).toEqual([
      [2, 'What is 2 + 2, exactly?'],
      [4, 'Broken'],
      [5, 'Explain "free choice".'],
    ]);
    expect(rows[0]?.question.correctAnswers).toEqual([1]);
    expect(rows[1]?.question.options).toEqual(['A', '', 'C']);
    expect(problems).toEqual([{ line: 6, reason: 'Unknown type "Essay" — use MCQ or Descriptive.' }]);
  });

  test('every template example row parses (MCQ, True / False, Descriptive)', () => {
    const [, ...examples] = templateRows();
    const parsed = examples.map((r) => parseQuestionCsvRow(r));
    expect(parsed.every((p) => p.ok === true)).toBe(true);
    expect(parsed[1]).toMatchObject({ ok: true, row: { options: ['True', 'False'], correctAnswers: [0] } });
  });

  test('the payload names the chosen subject and course on every row', () => {
    const { rows } = readImportFile(FILE);
    expect(toBulkPayload(rows, '36', '16')[0]).toEqual({
      course_id: '16', subject_id: '36', q_type: 0, title: 'What is 2 + 2, exactly?', options: ['3', '4', '5', '6'], correct_answers: [1], hint: '', solution: '',
    });
  });
});

describe('the server report', () => {
  const { rows, problems } = readImportFile(FILE);
  const report = toReport({ report: [
    { row: 1, status: 'ok', reason: '' },
    { row: 2, status: 'invalid', reason: 'Option B is empty.' },
    { row: 3, status: 'duplicate', reason: 'Already in the Question Bank for this subject.' },
    { row: 4, status: 'weird' },
  ] });

  test('parses statuses and counts them', () => {
    expect(report).toHaveLength(3);
    expect(reportCounts(report)).toEqual({ ok: 1, duplicate: 1, invalid: 1 });
    expect(toReport(null)).toEqual([]);
  });

  test('after the import, imported rows are dropped and the rest keep a reason', () => {
    const res = afterImport(rows, report, []);
    expect(res.imported).toBe(1);
    expect(res.remaining.map((r) => r.line)).toEqual([4, 5]);
    expect(res.reasons.get(4)).toBe('Option B is empty.');
    expect(res.reasons.get(5)).toBe('Already in the Question Bank for this subject.');
  });

  test('a row the server accepted but failed to insert stays, with the error', () => {
    const res = afterImport(rows, report, toFailures({ failures: [{ row: 1, title: 'x', error: 'Deadlock' }] }));
    expect(res.imported).toBe(0);
    expect(res.reasons.get(2)).toBe('Deadlock');
  });

  test('the error report lists unreadable lines and rejected rows', () => {
    const out = errorReportRows(rows, report, problems);
    expect(out.map((r) => r[0])).toEqual(['Line', 6, 4, 5]);
    expect(out[3]).toEqual([5, 'Explain "free choice".', 'Duplicate', 'Already in the Question Bank for this subject.']);
  });
});
