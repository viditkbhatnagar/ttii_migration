import { asString } from '../../shared/utils/admin-data-utils.js';
import { compareText, formatDmy, matchesSearch, sortRows, type SortDir } from '../course/catalog-list-model.js';

// Content Library (Naji's ContentLibraryModule) over GET /admin/content-assets.
// This is the `content_asset` store — NOT lesson_files (the Lesson Builder's
// store). The two have colliding ids; this page only ever touches content_asset
// through the /admin/content-assets* endpoints.

export const ASSET_TYPES = ['video', 'audio', 'article', 'document', 'quiz'] as const;

export interface AssetRow {
  id: string;
  contentId: string;
  title: string;
  type: string;
  subjectTag: string;
  lessonTag: string;
  duration: string;
  createdBy: string;
  createdAt: string;
  tags: string;
  raw: Record<string, unknown>;
}

export type AssetSortKey = 'contentId' | 'title' | 'type' | 'subjectTag' | 'lessonTag' | 'duration' | 'createdBy' | 'createdAt';

export interface AssetFilters {
  search: string;
  type: string;
  subjectTag: string;
  lessonTag: string;
  createdBy: string;
}

export const EMPTY_ASSET_FILTERS: AssetFilters = { search: '', type: '', subjectTag: '', lessonTag: '', createdBy: '' };

export function toAssetRows(raw: Record<string, unknown>[]): AssetRow[] {
  return raw.map((r) => {
    const id = asString(r.id);
    return {
      id,
      contentId: asString(r.content_id) || `CA-${id.padStart(5, '0')}`,
      title: asString(r.title),
      type: asString(r.asset_type),
      subjectTag: asString(r.subject_tag),
      lessonTag: asString(r.lesson_tag),
      duration: asString(r.duration),
      createdBy: asString(r.created_by_name),
      createdAt: asString(r.created_at),
      tags: asString(r.tags),
      raw: r,
    };
  });
}

/** The type filter offers the form's types plus any other stored type. */
export function assetTypeOptions(rows: readonly AssetRow[]): string[] {
  const known: readonly string[] = ASSET_TYPES;
  const extra = [...new Set(rows.map((r) => r.type).filter((t) => t && !known.includes(t)))].sort();
  return [...ASSET_TYPES, ...extra];
}

const same = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

export function filterAssets(rows: readonly AssetRow[], f: AssetFilters): AssetRow[] {
  return rows.filter((a) => {
    if (f.type && a.type !== f.type) return false;
    if (f.subjectTag && !same(a.subjectTag, f.subjectTag)) return false;
    if (f.lessonTag && !same(a.lessonTag, f.lessonTag)) return false;
    if (f.createdBy && !same(a.createdBy, f.createdBy)) return false;
    return matchesSearch(f.search, [a.title, a.contentId, a.tags, a.subjectTag, a.lessonTag]);
  });
}

export function sortAssets(rows: readonly AssetRow[], key: AssetSortKey, dir: SortDir): AssetRow[] {
  const cmp = (a: AssetRow, b: AssetRow): number => {
    if (key === 'contentId') return compareText(a.id.padStart(10, '0'), b.id.padStart(10, '0'));
    if (key === 'createdAt') return compareText(a.createdAt, b.createdAt);
    return compareText(a[key], b[key]);
  };
  // Content ID is never blank; for every other column an empty cell sorts last
  // whichever way the column is sorted.
  const isBlank = key === 'contentId' ? undefined : (r: AssetRow): boolean => !r[key].trim();
  return sortRows(rows, cmp, dir, isBlank);
}

export function assetCsvRows(rows: readonly AssetRow[]): Array<Array<string | number>> {
  return [
    ['Content ID', 'Title', 'Type', 'Subject Tag', 'Lesson Tag', 'Duration', 'Created By', 'Created On', 'Tags'],
    ...rows.map((a) => [a.contentId, a.title, a.type, a.subjectTag, a.lessonTag, a.duration, a.createdBy, formatDmy(a.createdAt), a.tags]),
  ];
}

// ── Lesson Tag picker ──────────────────────────────────────────────────────

/**
 * "Subject › Lesson" label for a lesson row from listAllLessonsAdmin. Two
 * lessons can share a title across subjects, so the subject prefix
 * disambiguates; a label that still repeats gets " · #id".
 */
export function lessonLabel(row: Record<string, unknown>): string {
  const subject = asString(row.subject_title).trim();
  const lesson = asString(row.title).trim() || `Lesson ${asString(row.id)}`;
  return subject ? `${subject} › ${lesson}` : lesson;
}

export interface LessonPicker {
  options: string[];
  labelToId: Map<string, string>;
  idToLabel: Map<string, string>;
  idToTitle: Map<string, string>;
  idToSubject: Map<string, string>;
}

export function buildLessonPicker(lessons: Record<string, unknown>[]): LessonPicker {
  const picker: LessonPicker = { options: [], labelToId: new Map(), idToLabel: new Map(), idToTitle: new Map(), idToSubject: new Map() };
  const seen = new Map<string, number>();
  for (const row of lessons) {
    const id = asString(row.id);
    if (!id) continue;
    picker.idToTitle.set(id, asString(row.title));
    picker.idToSubject.set(id, asString(row.subject_title));
    let label = lessonLabel(row);
    const count = seen.get(label) ?? 0;
    seen.set(label, count + 1);
    if (count > 0) label = `${label} · #${id}`;
    picker.options.push(label);
    picker.labelToId.set(label, id);
    picker.idToLabel.set(id, label);
  }
  return picker;
}

/** Distinct subject titles (case-insensitive) for the Subject Tag picker. */
export function subjectTagChoices(subjects: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of subjects) {
    const title = asString(row.title).trim();
    if (title && !seen.has(title.toLowerCase())) {
      seen.add(title.toLowerCase());
      out.push(title);
    }
  }
  return out;
}

// ── Quiz questions ─────────────────────────────────────────────────────────

export type CorrectAnswer = 'A' | 'B' | 'C' | 'D';
export const ANSWER_LETTERS: CorrectAnswer[] = ['A', 'B', 'C', 'D'];

export interface QuestionForm {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: CorrectAnswer;
}

export const EMPTY_QUESTION: QuestionForm = { question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A' };

export const QUIZ_CSV_TEMPLATE =
  'question,option_a,option_b,option_c,option_d,correct_answer\n'
  + '"What is 2 + 2?",3,4,5,6,B\n'
  + '"Capital of France?",Berlin,Madrid,Paris,Rome,C\n';

/**
 * Tiny CSV parser: quoted fields with embedded commas and escaped quotes
 * ("" → "). Blank lines are dropped. No header detection — the caller decides.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const endRow = () => {
    current.push(field);
    if (current.some((c) => c.trim() !== '')) rows.push(current);
    current = [];
    field = '';
  };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      current.push(field);
      field = '';
    } else if (ch === '\n') {
      endRow();
    } else {
      field += ch;
    }
  }
  if (field !== '' || current.length > 0) endRow();
  return rows;
}

/** Bulk-upload format: question, option_a..d, correct_answer (A-D). Header optional. */
export function parseQuestionCsv(text: string): { questions: QuestionForm[]; errors: string[] } {
  const rows = parseCsv(text);
  const first = rows[0];
  const isHeader = !!first && first.length >= 6
    && (first[0] ?? '').toLowerCase().includes('question')
    && (first[5] ?? '').toLowerCase().startsWith('correct');
  const data = isHeader ? rows.slice(1) : rows;
  const questions: QuestionForm[] = [];
  const errors: string[] = [];
  data.forEach((row, idx) => {
    const lineNum = idx + (isHeader ? 2 : 1);
    if (row.length < 6) {
      errors.push(`Line ${lineNum}: expected 6 columns (question, A, B, C, D, correct), got ${row.length}.`);
      return;
    }
    const [question, a, b, c, d, correctRaw] = row;
    const correct = (correctRaw ?? '').trim().toUpperCase();
    if (!question?.trim()) {
      errors.push(`Line ${lineNum}: empty question.`);
      return;
    }
    if (!(ANSWER_LETTERS as string[]).includes(correct)) {
      errors.push(`Line ${lineNum}: correct_answer must be A/B/C/D, got "${correctRaw}".`);
      return;
    }
    questions.push({
      question: question.trim(),
      option_a: (a ?? '').trim(),
      option_b: (b ?? '').trim(),
      option_c: (c ?? '').trim(),
      option_d: (d ?? '').trim(),
      correct_answer: correct as CorrectAnswer,
    });
  });
  return { questions, errors };
}

/** Swap a question with its neighbour; out-of-range moves return the list unchanged. */
export function moveQuestion(list: readonly QuestionForm[], index: number, dir: -1 | 1): QuestionForm[] {
  const target = index + dir;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return [...list];
  const next = [...list];
  const a = next[index]!;
  next[index] = next[target]!;
  next[target] = a;
  return next;
}

// ── Asset form ─────────────────────────────────────────────────────────────

export interface AssetForm {
  title: string;
  summary: string;
  asset_type: string;
  subject_tag: string;
  lesson_tag: string;
  lesson_id: string;
  language: string;
  duration: string;
  video_url: string;
  attachment: string;
  audio_file: string;
  thumbnail: string;
  tags: string;
  time_limit_minutes: string;
  attempts_allowed: string;
  pass_marks: string;
  shuffle_questions: boolean;
  questions: QuestionForm[];
}

export const EMPTY_ASSET_FORM: AssetForm = {
  title: '', summary: '', asset_type: 'video', subject_tag: '', lesson_tag: '', lesson_id: '', language: '',
  duration: '', video_url: '', attachment: '', audio_file: '', thumbnail: '', tags: '',
  time_limit_minutes: '', attempts_allowed: '', pass_marks: '', shuffle_questions: false, questions: [],
};

export function formFromAsset(asset: Record<string, unknown>): AssetForm {
  const timeLimit = Number(asset.time_limit_seconds ?? 0);
  const questionsRaw = Array.isArray(asset.questions) ? (asset.questions as Record<string, unknown>[]) : [];
  return {
    title: asString(asset.title),
    summary: asString(asset.summary),
    asset_type: asString(asset.asset_type) || 'video',
    subject_tag: asString(asset.subject_tag),
    lesson_tag: asString(asset.lesson_tag),
    lesson_id: asString(asset.lesson_id),
    language: asString(asset.language),
    duration: asString(asset.duration),
    video_url: asString(asset.video_url),
    attachment: asString(asset.attachment),
    audio_file: asString(asset.audio_file),
    thumbnail: asString(asset.thumbnail),
    tags: asString(asset.tags),
    time_limit_minutes: timeLimit > 0 ? String(Math.floor(timeLimit / 60)) : '',
    attempts_allowed: asString(asset.attempts_allowed),
    pass_marks: asString(asset.pass_marks),
    shuffle_questions: Boolean(asset.shuffle_questions),
    questions: questionsRaw.map((q) => ({
      question: asString(q.question),
      option_a: asString(q.option_a),
      option_b: asString(q.option_b),
      option_c: asString(q.option_c),
      option_d: asString(q.option_d),
      correct_answer: (asString(q.correct_answer).toUpperCase() as CorrectAnswer) || 'A',
    })),
  };
}

/** The add / edit payload — exactly what this page has always sent. */
export function assetPayload(form: AssetForm): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    title: form.title.trim(),
    summary: form.summary.trim() || undefined,
    asset_type: form.asset_type,
    subject_tag: form.subject_tag.trim() || undefined,
    lesson_tag: form.lesson_tag.trim() || undefined,
    lesson_id: form.lesson_id ? Number(form.lesson_id) : null,
    language: form.language || undefined,
    duration: form.duration.trim() || undefined,
    video_url: form.video_url.trim() || undefined,
    attachment: form.attachment.trim() || undefined,
    audio_file: form.audio_file.trim() || undefined,
    thumbnail: form.thumbnail.trim() || undefined,
    tags: form.tags.trim() || undefined,
  };
  if (form.asset_type === 'quiz') {
    payload.time_limit_seconds = form.time_limit_minutes ? Number(form.time_limit_minutes) * 60 : undefined;
    payload.attempts_allowed = form.attempts_allowed ? Number(form.attempts_allowed) : undefined;
    payload.pass_marks = form.pass_marks ? Number(form.pass_marks) : undefined;
    payload.shuffle_questions = form.shuffle_questions;
    payload.questions = form.questions
      .filter((q) => q.question.trim())
      .map((q, idx) => ({
        question: q.question.trim(),
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        sort_order: idx,
      }));
  }
  return payload;
}

// ── Preview ────────────────────────────────────────────────────────────────

export type VideoEmbed = { kind: 'file' | 'iframe'; src: string } | null;

/** How the preview plays a video URL: direct file, Vimeo / YouTube embed, or a plain iframe. */
export function videoEmbed(url: string): VideoEmbed {
  if (!url) return null;
  if (/\.(mp4|webm|mov)($|\?)/i.test(url)) return { kind: 'file', src: url };
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(url);
  if (vimeo) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` };
  const yt = /youtu\.be\/([\w-]+)/.exec(url) || /youtube\.com\/watch\?v=([\w-]+)/.exec(url) || /youtube\.com\/embed\/([\w-]+)/.exec(url);
  if (yt) return { kind: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
  return { kind: 'iframe', src: url };
}

/** Office formats cannot be iframed; PDFs and anything else are tried inline. */
export function documentInline(url: string): boolean {
  return /\.pdf($|\?)/i.test(url) || !/\.(docx?|pptx?|xlsx?)($|\?)/i.test(url);
}
