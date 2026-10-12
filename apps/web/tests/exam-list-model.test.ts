import { describe, expect, test } from 'vitest';

import {
  filterExams,
  instructionLines,
  phaseCounts,
  sortExams,
  toExamListRows,
  type ExamFilters,
} from '../src/admin/pages/exam/exam-list-model';

const rows = toExamListRows([
  { examId: 22, examCode: 'TTIIEXM2600007', title: 'Diploma Regular', courses: ['Diploma in Montessori'], courseIds: [16], isPractice: false, phase: 'completed', fromDate: '2026-08-10', toDate: '2026-08-14', subjects: 5 },
  { examId: 28, examCode: 'TTIIEXM2600008', title: 'PG Diploma Regular', courses: ['PG Diploma in Montessori', 'Diploma in Montessori'], courseIds: [18, 16], isPractice: false, phase: 'in_progress', fromDate: '2026-10-05', toDate: '2026-10-15', subjects: 9 },
  { examId: 8, examCode: 'TTIIPRACTICE01', title: 'Practice Exam', courses: [], courseIds: [], isPractice: true, phase: 'in_progress', fromDate: '', toDate: '', subjects: 0 },
  { examId: 40, examCode: '', title: 'Next batch', courses: ['Diploma in Montessori'], courseIds: [16], isPractice: false, phase: 'bogus', fromDate: '', toDate: '', subjects: 2 },
]);
const none: ExamFilters = { tab: 'all', search: '', courseId: '', type: 'all', from: '', to: '' };

describe('exam list filters', () => {
  test('an unknown phase from the server is treated as a draft', () => {
    expect(rows[3]?.phase).toBe('draft');
  });

  test('a course matches ANY course the exam runs for (multi-course exams were missed)', () => {
    expect(filterExams(rows, { ...none, courseId: '16' }).map((r) => r.examId)).toEqual([22, 28, 40]);
  });

  test('tabs, type, search and date bounds', () => {
    expect(filterExams(rows, { ...none, tab: 'in_progress' }).map((r) => r.examId)).toEqual([28, 8]);
    expect(filterExams(rows, { ...none, type: 'practice' }).map((r) => r.examId)).toEqual([8]);
    expect(filterExams(rows, { ...none, search: 'pg diploma' }).map((r) => r.examId)).toEqual([28]);
    expect(filterExams(rows, { ...none, from: '2026-09-01' }).map((r) => r.examId)).toEqual([28]);
  });

  test('tab counts', () => {
    expect(phaseCounts(rows)).toEqual({ all: 4, in_progress: 2, upcoming: 0, completed: 1, draft: 1 });
  });

  test('sorting by subjects and by from date', () => {
    expect(sortExams(rows, 'subjects', 'desc').map((r) => r.examId)).toEqual([28, 22, 40, 8]);
    expect(sortExams(rows, 'fromDate', 'desc')[0]?.examId).toBe(28);
  });
});

describe('instructionLines — rich text shown as text, never as HTML', () => {
  test('paragraphs, breaks and list items become lines; tags and entities are cleaned', () => {
    expect(instructionLines('<p>Log in 15 minutes early.</p><ul><li>Keep your ID &amp; admit card</li><li><script>x</script>No phones</li></ul>'))
      .toEqual(['Log in 15 minutes early.', 'Keep your ID & admit card', 'xNo phones']);
  });

  test('named and numeric entities decode to text, once', () => {
    expect(instructionLines('<p>Don&#39;t &quot;guess&quot; &apos;x&apos; &#x2014; 5 &lt; 6</p>')).toEqual(['Don\'t "guess" \'x\' — 5 < 6']);
    expect(instructionLines('<p>&amp;lt;b&amp;gt; &#169; &#X41;</p>')).toEqual(['&lt;b&gt; © A']);
    // Decoded markup stays text — it is never turned back into tags.
    expect(instructionLines('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')).toEqual(['<script>alert(1)</script>']);
  });

  test('unknown or invalid entities are left as written', () => {
    expect(instructionLines('<p>&bogus; &#0; &#xD800; &#99999999;</p>')).toEqual(['&bogus; &#0; &#xD800; &#99999999;']);
  });

  test('ordered lists keep their numbering; bullet lists do not', () => {
    expect(instructionLines('<ol><li>Read</li><li>Write</li></ol><ul><li>Pen</li></ul><ol start="1"><li>Again</li></ol>'))
      .toEqual(['1. Read', '2. Write', 'Pen', '1. Again']);
  });
});
