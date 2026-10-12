// One row of the Question Bank CSV template:
//   type, question, optionA, optionB, optionC, optionD, correctAnswer (A–D), [hint], [solution]
//
// TTII 2026-10-12 — the answer letter is mapped against the ORIGINAL option
// columns. The previous parser dropped every blank option first, so with B
// blank the letter "C" pointed at what had been D — a silently wrong answer
// key. Only trailing blanks are dropped (they shift nothing); a blank in the
// middle is kept so the server refuses the row by name ("Option B is empty").
// Answers are 0-based repo-wide.

export interface CsvQuestion {
  qType: 0 | 1;
  title: string;
  options: string[];
  correctAnswers: number[];
  hint: string;
  solution: string;
}

export type CsvRowResult = { ok: true; row: CsvQuestion } | { ok: false; reason: string } | { ok: 'skip' };

const OPTION_COLUMNS = [2, 3, 4, 5];

export function parseQuestionCsvRow(cells: Array<string | undefined>): CsvRowResult {
  const cell = (i: number): string => (cells[i] ?? '').trim();
  const type = cell(0).toLowerCase();
  const title = cell(1);
  if (!type && !title) return { ok: 'skip' }; // an empty line
  if (!title) return { ok: false, reason: 'The question text is empty.' };
  const extras = { hint: cell(7), solution: cell(8) };

  if (type === 'descriptive') {
    return { ok: true, row: { qType: 1, title, options: [], correctAnswers: [], ...extras } };
  }
  if (type !== 'mcq') return { ok: false, reason: `Unknown type "${cell(0)}" — use MCQ or Descriptive.` };

  const columns = OPTION_COLUMNS.map(cell);
  let last = columns.length;
  while (last > 0 && columns[last - 1] === '') last -= 1;
  const options = columns.slice(0, last);

  const letter = cell(6).toUpperCase();
  if (!/^[A-D]$/.test(letter)) return { ok: false, reason: 'The correct answer must be one letter, A to D.' };
  const index = letter.charCodeAt(0) - 65;
  if (index >= options.length || options[index] === '') {
    return { ok: false, reason: `Answer ${letter} points at an empty option.` };
  }
  return { ok: true, row: { qType: 0, title, options, correctAnswers: [index], ...extras } };
}
