import { describe, expect, test } from 'vitest';

import {
  EMPTY_ASSET_FORM,
  EMPTY_QUESTION,
  assetPayload,
  assetTypeOptions,
  buildLessonPicker,
  documentInline,
  filterAssets,
  formFromAsset,
  moveQuestion,
  parseCsv,
  parseQuestionCsv,
  sortAssets,
  subjectTagChoices,
  toAssetRows,
  videoEmbed,
} from '../src/admin/pages/content_library/content-library-model';

const rows = toAssetRows([
  { id: '334', content_id: 'CA-00334', title: 'Multimedia Tools', asset_type: 'document', subject_tag: '', lesson_tag: '', created_by_name: 'Alex', created_at: '2026-06-01T05:00:00.000Z', tags: 'montessori' },
  { id: '9', title: 'Assessment 1', asset_type: 'quiz', subject_tag: 'Parents Teacher Relationship', lesson_tag: 'Heredity', created_by_name: 'System' },
  { id: '40', title: 'Intro Video', asset_type: 'image', subject_tag: 'AI for Creativity', created_by_name: 'alex' },
]);

describe('content library list', () => {
  test('content id falls back to CA-padded id', () => {
    expect(rows[1]!.contentId).toBe('CA-00009');
  });

  test('filters are case-insensitive on tags and creator; search reaches tags', () => {
    expect(filterAssets(rows, { search: '', type: '', subjectTag: '', lessonTag: '', createdBy: 'ALEX' }).map((a) => a.id)).toEqual(['334', '40']);
    expect(filterAssets(rows, { search: 'montes', type: '', subjectTag: '', lessonTag: '', createdBy: '' }).map((a) => a.id)).toEqual(['334']);
    expect(filterAssets(rows, { search: '', type: 'quiz', subjectTag: 'parents teacher relationship', lessonTag: '', createdBy: '' })).toHaveLength(1);
  });

  test('content id sorts numerically', () => {
    expect(sortAssets(rows, 'contentId', 'desc').map((a) => a.id)).toEqual(['334', '40', '9']);
  });

  test('type options add stored extras after the form types', () => {
    expect(assetTypeOptions(rows)).toEqual(['video', 'audio', 'article', 'document', 'quiz', 'image']);
  });
});

describe('lesson tag picker', () => {
  test('labels as Subject › Lesson and disambiguates repeats by id', () => {
    const p = buildLessonPicker([
      { id: 1, title: 'Intro', subject_title: 'IT' },
      { id: 2, title: 'Intro', subject_title: 'IT' },
      { id: 3, title: '', subject_title: '' },
    ]);
    expect(p.options).toEqual(['IT › Intro', 'IT › Intro · #2', 'Lesson 3']);
    expect(p.labelToId.get('IT › Intro · #2')).toBe('2');
    expect(p.idToSubject.get('1')).toBe('IT');
  });

  test('subject choices dedupe case-insensitively', () => {
    expect(subjectTagChoices([{ title: 'IT ' }, { title: 'it' }, { title: 'Math' }])).toEqual(['IT', 'Math']);
  });
});

describe('quiz CSV', () => {
  test('parses quoted fields, escaped quotes and CRLF', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\n\r\nd,e,f')).toEqual([['a', 'b, c', 'say "hi"'], ['d', 'e', 'f']]);
  });

  test('skips a header, imports valid rows and reports bad ones by line', () => {
    const { questions, errors } = parseQuestionCsv(
      'question,option_a,option_b,option_c,option_d,correct_answer\n"2+2?",3,4,5,6,b\n,1,2,3,4,A\nQ,1,2,3,4,E\nshort,1\n',
    );
    expect(questions).toEqual([{ question: '2+2?', option_a: '3', option_b: '4', option_c: '5', option_d: '6', correct_answer: 'B' }]);
    expect(errors).toEqual([
      'Line 3: empty question.',
      'Line 4: correct_answer must be A/B/C/D, got "E".',
      'Line 5: expected 6 columns (question, A, B, C, D, correct), got 2.',
    ]);
  });

  test('moveQuestion swaps neighbours and ignores out-of-range moves', () => {
    const q = (s: string) => ({ ...EMPTY_QUESTION, question: s });
    const list = [q('1'), q('2')];
    expect(moveQuestion(list, 1, -1).map((x) => x.question)).toEqual(['2', '1']);
    expect(moveQuestion(list, 0, -1).map((x) => x.question)).toEqual(['1', '2']);
  });
});

describe('asset form', () => {
  test('payload keeps the lesson link and blanks as undefined; quiz fields only for quizzes', () => {
    const video = assetPayload({ ...EMPTY_ASSET_FORM, title: ' Intro ', lesson_id: '12', time_limit_minutes: '5' });
    expect(video).toMatchObject({ title: 'Intro', asset_type: 'video', lesson_id: 12, summary: undefined });
    expect('time_limit_seconds' in video).toBe(false);
    expect(assetPayload({ ...EMPTY_ASSET_FORM, title: 'x' }).lesson_id).toBeNull();

    const quiz = assetPayload({
      ...EMPTY_ASSET_FORM,
      title: 'Quiz',
      asset_type: 'quiz',
      time_limit_minutes: '5',
      shuffle_questions: true,
      questions: [
        { question: ' Q1 ', option_a: 'a', option_b: 'b', option_c: '', option_d: '', correct_answer: 'B' },
        { question: '  ', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' },
      ],
    });
    expect(quiz).toMatchObject({ time_limit_seconds: 300, shuffle_questions: true });
    expect(quiz.questions).toEqual([{ question: 'Q1', option_a: 'a', option_b: 'b', option_c: '', option_d: '', correct_answer: 'B', sort_order: 0 }]);
  });

  test('form round-trips a stored quiz', () => {
    const f = formFromAsset({ title: 'Q', asset_type: 'quiz', time_limit_seconds: 600, shuffle_questions: true, lesson_id: 4, questions: [{ question: 'x', correct_answer: 'c' }] });
    expect(f).toMatchObject({ time_limit_minutes: '10', shuffle_questions: true, lesson_id: '4' });
    expect(f.questions[0]!.correct_answer).toBe('C');
  });
});

describe('preview helpers', () => {
  test('video embeds', () => {
    expect(videoEmbed('')).toBeNull();
    expect(videoEmbed('https://x/a.mp4?t=1')).toEqual({ kind: 'file', src: 'https://x/a.mp4?t=1' });
    expect(videoEmbed('https://vimeo.com/123456')).toEqual({ kind: 'iframe', src: 'https://player.vimeo.com/video/123456' });
    expect(videoEmbed('https://youtu.be/abc-1')).toEqual({ kind: 'iframe', src: 'https://www.youtube.com/embed/abc-1' });
  });

  test('office documents are not iframed', () => {
    expect(documentInline('https://x/file.pdf')).toBe(true);
    expect(documentInline('https://x/upload/abc')).toBe(true);
    expect(documentInline('https://x/file.docx')).toBe(false);
  });
});
