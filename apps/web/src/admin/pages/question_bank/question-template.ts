import { downloadCsv, toCsv } from '@/lib/csv';
import { templateRows } from './question-import-model.js';

/** The CSV import template (the columns question-csv.ts reads). */
export function downloadQuestionTemplate(): void {
  downloadCsv('question-bank-template.csv', toCsv(templateRows()));
}
