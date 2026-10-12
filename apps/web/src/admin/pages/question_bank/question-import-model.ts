import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { parseQuestionCsvRow, type CsvQuestion } from './question-csv.js';

// Bulk upload wizard model (TTII 2026-10-12, Naji's BulkUploadDialog):
// Subject → Template → Upload → Validate & Preview → Import. The file is read
// here (question-csv.ts, the tested row parser); the server then checks every
// row with the same rules as a single add and reports ok / invalid / duplicate
// per row — first as a dry run for the preview, then for the real import.

/** The template's columns, in the order parseQuestionCsvRow reads them. */
export const TEMPLATE_HEADER = ['type (MCQ or Descriptive)', 'question_title', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option (A/B/C/D)'];

export function templateRows(): string[][] {
  return [
    TEMPLATE_HEADER,
    ['MCQ', 'Who founded the first Casa dei Bambini?', 'Maria Montessori', 'Friedrich Froebel', 'Jean Piaget', 'John Dewey', 'A'],
    ['MCQ', 'The prepared environment is designed around the child.', 'True', 'False', '', '', 'A'],
    ['Descriptive', 'Explain the sensitive periods with two classroom examples.', '', '', '', '', ''],
  ];
}

export interface ImportRow {
  /** The line in the file (1 = the header), for messages. */
  line: number;
  question: CsvQuestion;
}

export interface FileProblem { line: number; reason: string }

export type RowStatus = 'ok' | 'invalid' | 'duplicate';

export interface RowReport { row: number; status: RowStatus; reason: string }

/** Minimal RFC-4180 CSV: quoted fields with commas, quotes and newlines. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i += 1; } else if (c === '"') inQuotes = false;
      else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ',') { cur.push(field); field = ''; } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i += 1;
      cur.push(field); field = '';
      rows.push(cur); cur = [];
    } else field += c;
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows;
}

/** The questions in an uploaded file, and the lines that could not be read. */
export function readImportFile(text: string): { rows: ImportRow[]; problems: FileProblem[] } {
  const lines = parseCsv(text);
  const rows: ImportRow[] = [];
  const problems: FileProblem[] = [];
  lines.forEach((cells, i) => {
    if (i === 0) return; // header
    const result = parseQuestionCsvRow(cells);
    if (result.ok === 'skip') return;
    if (result.ok) rows.push({ line: i + 1, question: result.row });
    else problems.push({ line: i + 1, reason: result.reason });
  });
  return { rows, problems };
}

export function toBulkPayload(rows: ImportRow[], subjectId: string, courseId: string): Array<Record<string, unknown>> {
  return rows.map(({ question: q }) => ({
    course_id: courseId,
    subject_id: subjectId,
    q_type: q.qType,
    title: q.title,
    options: q.options,
    correct_answers: q.correctAnswers,
    hint: q.hint,
    solution: q.solution,
  }));
}

/** The server's per-row report (1-based `row` = position in what we sent). */
export function toReport(raw: unknown): RowReport[] {
  const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const list = Array.isArray(data.report) ? data.report : [];
  return list.flatMap((item): RowReport[] => {
    const r = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const status = asString(r.status);
    if (status !== 'ok' && status !== 'invalid' && status !== 'duplicate') return [];
    return [{ row: asNumber(r.row), status, reason: asString(r.reason) }];
  });
}

/** Rows the server failed to insert after accepting them (data.failures). */
export function toFailures(raw: unknown): Array<{ row: number; error: string }> {
  const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const list = Array.isArray(data.failures) ? data.failures : [];
  return list.map((f) => {
    const r = f && typeof f === 'object' ? (f as Record<string, unknown>) : {};
    return { row: asNumber(r.row), error: asString(r.error) };
  });
}

export function reportCounts(report: RowReport[]): { ok: number; duplicate: number; invalid: number } {
  return {
    ok: report.filter((r) => r.status === 'ok').length,
    duplicate: report.filter((r) => r.status === 'duplicate').length,
    invalid: report.filter((r) => r.status === 'invalid').length,
  };
}

/**
 * After the real import: the rows that went in are dropped; what stays is
 * every row the server skipped (or failed to insert), with its reason, so the
 * admin can fix the file and try those again.
 */
export function afterImport(
  rows: ImportRow[],
  report: RowReport[],
  failures: Array<{ row: number; error: string }>,
): { imported: number; remaining: ImportRow[]; reasons: Map<number, string> } {
  const status = new Map(report.map((r) => [r.row, r]));
  const failed = new Map(failures.map((f) => [f.row, f.error]));
  const remaining: ImportRow[] = [];
  const reasons = new Map<number, string>();
  let imported = 0;
  rows.forEach((row, i) => {
    const r = status.get(i + 1);
    const failure = failed.get(i + 1);
    if (r?.status === 'ok' && failure === undefined) { imported += 1; return; }
    remaining.push(row);
    reasons.set(row.line, failure ?? r?.reason ?? 'Not imported.');
  });
  return { imported, remaining, reasons };
}

/** "Download error report": every unreadable line and every rejected row. */
export function errorReportRows(rows: ImportRow[], report: RowReport[], problems: FileProblem[]): Array<Array<string | number>> {
  const out: Array<Array<string | number>> = [['Line', 'Question', 'Status', 'Reason']];
  for (const p of problems) out.push([p.line, '', 'Could not be read', p.reason]);
  report.forEach((r) => {
    if (r.status === 'ok') return;
    const row = rows[r.row - 1];
    out.push([row?.line ?? '', row?.question.title ?? '', r.status === 'duplicate' ? 'Duplicate' : 'Error', r.reason]);
  });
  return out;
}
