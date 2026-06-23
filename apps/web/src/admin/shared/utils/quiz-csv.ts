// Quiz question model + CSV helpers shared by the lesson-file editors
// (course_new Lesson Builder and the lesson-wise course Content Manager).
// Extracted so both editors parse the same CSV format (Naji 2026-06-24).

export interface QuizQuestion {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
}

export const emptyQuizQuestion: QuizQuestion = {
  question: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
};

/** Strip HTML tags for a clean inline preview (quiz/option text is stored
 * wrapped in "<p>…</p>"). */
export function stripPreviewHtml(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Minimal CSV row splitter. Handles quoted fields, escaped quotes ("") and
 * commas inside quotes.
 */
export function splitCsvRow(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * Parse a quiz CSV. Header row is required and columns are matched by name
 * (question, option_a..d, correct_answer). Rows without a question are skipped.
 */
export function parseQuizCsv(text: string): QuizQuestion[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];
  const header = splitCsvRow(lines[0]!).map((h) => h.trim().toLowerCase());
  const idx = (name: string): number => header.indexOf(name);
  const qi = idx('question');
  const ai = idx('option_a');
  const bi = idx('option_b');
  const ci = idx('option_c');
  const di = idx('option_d');
  const ki = idx('correct_answer');
  if (qi < 0 || ki < 0) return [];
  const out: QuizQuestion[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvRow(lines[i]!);
    const q = (cells[qi] ?? '').trim();
    if (!q) continue;
    const correctRaw = (cells[ki] ?? 'A').trim().toUpperCase();
    const correct = (['A', 'B', 'C', 'D'].includes(correctRaw) ? correctRaw : 'A') as 'A' | 'B' | 'C' | 'D';
    out.push({
      question: q,
      option_a: ai >= 0 ? (cells[ai] ?? '').trim() : '',
      option_b: bi >= 0 ? (cells[bi] ?? '').trim() : '',
      option_c: ci >= 0 ? (cells[ci] ?? '').trim() : '',
      option_d: di >= 0 ? (cells[di] ?? '').trim() : '',
      correct_answer: correct,
    });
  }
  return out;
}

/** Build + download the sample quiz CSV template (A/B/C/D convention). */
export function downloadQuizCsvTemplate(): void {
  const sample =
    'question,option_a,option_b,option_c,option_d,correct_answer\n' +
    '"What is 2 + 2?",3,4,5,6,B\n' +
    '"Capital of France?",Berlin,Madrid,Paris,Rome,C\n';
  const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'quiz-questions-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
