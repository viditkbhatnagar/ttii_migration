import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';

import { SittingMark } from '../src/admin/pages/exam_result/result-ui';
import { SupplementaryChip, SupplementaryNotice } from '../src/admin/pages/exam_supplementary/SupplementaryResultNotice';
import { SupplementarySubjectCard } from '../src/admin/pages/exam_supplementary/SupplementarySubjectCard';
import { initialChoice, toSupplementaryDraft } from '../src/admin/pages/exam_supplementary/supplementary-model';

/** Server-rendered HTML without React's text-node separators. */
const render = (node: React.ReactElement): string => renderToString(node).replace(/<!-- -->/g, '');

// TTII 2026-10-16 — the supplementary pieces render (server-side, like the app
// shell test): the dialog's subject card, the Result page notice and chips.

const subject = toSupplementaryDraft({
  subjects: [{
    sittingExamId: 25, subjectTitle: 'Child Development', date: '2026-08-12', startTime: '19:30', endTime: '20:45',
    durationMinutes: 75, totalMarks: 70, passMarks: 25, mcqQuestions: 70, descriptiveQuestions: 0, marksEach: 1, failed: 1, preselect: true,
    candidates: [
      { userId: 101, name: 'ARCHANA RAJ C', studentCode: 'TTS0041', group: 'failed', score: 17, totalMarks: 70, alreadyIn: '', preselect: true },
      { userId: 103, name: 'SHEBA MARY SAMUEL', studentCode: 'TTS0022', group: 'flagged', score: 0, totalMarks: 70, flag: 'Only 0 of 70 answers saved', alreadyIn: 'Supplementary, Sept 2026', preselect: false },
    ],
  }],
}).subjects[0];

describe('the dialog\'s subject card', () => {
  test('a ticked subject shows its window, marks, plan and the students in their groups', () => {
    if (!subject) throw new Error('fixture');
    const html = render(
      <SupplementarySubjectCard subject={subject} choice={initialChoice(subject)} onChange={() => undefined} problem="Pick the date." thisYear={2026} />,
    );
    expect(html).toContain('Child Development');
    expect(html).toContain('Regular sitting 12/08/2026');
    expect(html).toContain('70 MCQ × 1 mark');
    expect(html).toContain('Failed (1)');
    expect(html).toContain('Flagged paper (1)');
    expect(html).toContain('ARCHANA RAJ C');
    expect(html).toContain('already in &quot;Supplementary, Sept 2026&quot;');
    expect(html).toContain('Pick the date.');
  });

  test('an unticked subject is collapsed to its heading', () => {
    if (!subject) throw new Error('fixture');
    const html = render(
      <SupplementarySubjectCard subject={subject} choice={{ ...initialChoice(subject), selected: false }} onChange={() => undefined} problem="" thisYear={2026} />,
    );
    expect(html).toContain('Child Development');
    expect(html).not.toContain('ARCHANA RAJ C');
  });
});

describe('the Result page', () => {
  test('a regular exam lists its supplementary exams; a supplementary links back', () => {
    const html = render(
      <SupplementaryNotice
        links={{
          supplementaryOf: null,
          supplementaries: [{ examId: 40, examCode: 'TTIIEXM2600008', title: 'Diploma, Supplementary Examination, October 2026', status: 'draft', subjects: 2, students: 3 }],
          outcomes: [],
        }}
        onOpenResult={() => undefined}
        onOpenWizard={() => undefined}
      />,
    );
    expect(html).toContain('A supplementary exam was created from this exam');
    expect(html).toContain('Finish in the wizard');
    const back = render(
      <SupplementaryNotice links={{ supplementaryOf: { examId: 22, examCode: 'TTIIEXM2600007', title: 'Diploma, Regular Examination' }, supplementaries: [], outcomes: [] }} onOpenResult={() => undefined} onOpenWizard={() => undefined} />,
    );
    expect(back).toContain('Supplementary exam of <strong>Diploma, Regular Examination</strong>');
    expect(render(<SupplementaryNotice links={{ supplementaryOf: null, supplementaries: [], outcomes: [] }} onOpenResult={() => undefined} onOpenWizard={() => undefined} />)).toBe('');
  });

  test('the outcome chip under a mark, and a subject the student was not entered for', () => {
    const chip = render(<SupplementaryChip outcome={{ userId: 101, sourceSittingId: 25, supplementaryExamId: 40, status: 'pass', score: 40, totalMarks: 70, passMarks: 25, date: '2026-10-28', examStatus: 'ready' }} />);
    expect(chip).toContain('Supp. 40 P');
    expect(chip).toContain('Supplementary: 40/70 Passed');
    const cell = render(
      <SittingMark cell={{ examId: 41, status: 'not_entered', score: null, totalMarks: 70, passMarks: 25, answered: null, questionCount: null, minutesTaken: null, flag: null, reExam: null, previousScore: null }} />,
    );
    expect(cell).toContain('n/a');
  });
});
