import type { Prisma, PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { normaliseQuestionText, toArray } from './question-rules.js';
import { publishedSentence, questionBankCourseScope, questionUsage } from './question-usage.js';

// Question Bank in Naji's design (TTII 2026-10-12, QuestionBankModule).
//
// The old subject listing grouped the QUESTIONS by subject, so a subject with
// no questions yet never appeared — there was nowhere to start adding to it,
// and opening it said "Subject not found or has no questions yet". This lists
// every live subject (or, for a course, every subject linked to it through
// course_subject, plus any subject its questions are filed under), with
// counts, last update, recent additions and the filters of his list.
//
// Bulk move / bulk delete reuse the single-question guard: a question in a
// PUBLISHED exam is never moved or deleted (it is graded against its current
// row at submit), and every skipped question is reported with its reason.

export type QuestionKindFilter = '' | 'mcq' | 'tf' | 'descriptive';

export interface QbOverviewFilters {
  courseId?: number;
  /** Subject name / code, question text, or a question id ("Q-00123" or "123"). */
  q?: string;
  qType?: QuestionKindFilter;
  createdBy?: number;
  /** Only questions added in the last 7 days. */
  recent?: boolean;
}

export interface QbCourseChip { id: number; title: string }

export interface QbSubjectRow {
  id: number;
  code: string;
  title: string;
  status: string;
  courses: QbCourseChip[];
  total: number;
  mcq: number;
  descriptive: number;
  recent: number;
  /** ISO instant of the newest question add/edit, or null for an empty subject. */
  lastUpdated: string | null;
  /** Questions matching the question-level filters; null when none is active. */
  matching: number | null;
}

export interface QbAuthor { id: number; name: string }

export interface QbOverview {
  kpis: { subjects: number; questions: number; mcq: number; descriptive: number; recent: number };
  subjects: QbSubjectRow[];
  authors: QbAuthor[];
}

export interface QbSkipped { id: number; code: string; reason: string }

export const RECENT_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BULK = 500;
/** How a True / False question is stored: an MCQ with exactly these options. */
/**
 * True / False = exactly two options reading "true" then "false", in any case
 * or spacing — the same rule as the page's isTrueFalse, so the filter and the
 * row badges always agree.
 */
export function isTrueFalseOptions(raw: unknown): boolean {
  const options = toArray(raw);
  return options.length === 2
    && String(options[0]).trim().toLowerCase() === 'true'
    && String(options[1]).trim().toLowerCase() === 'false';
}

export function questionCode(id: number): string {
  return `Q-${String(id).padStart(5, '0')}`;
}

/** "Q-00123", "q123", "#123" or "123" → 123; anything else → null. */
export function parseQuestionCode(text: string): number | null {
  const m = /^\s*(?:q\s*-?\s*|#)?0*(\d{1,9})\s*$/i.exec(text);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Positive, unique integer ids, capped — for the bulk endpoints. */
export function toIdList(value: unknown): number[] {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const ids = list
    .map((v) => (typeof v === 'number' ? v : typeof v === 'string' ? Number.parseInt(v.trim(), 10) : Number.NaN))
    .filter((n) => Number.isSafeInteger(n) && n > 0);
  return [...new Set(ids)];
}

function iso(value: Date | null | undefined): string | null {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : null;
}

function later(a: Date | null | undefined, b: Date | null | undefined): Date | null {
  const ta = a instanceof Date ? a.getTime() : Number.NaN;
  const tb = b instanceof Date ? b.getTime() : Number.NaN;
  if (Number.isNaN(ta)) return Number.isNaN(tb) ? null : (b as Date);
  if (Number.isNaN(tb)) return a as Date;
  return ta >= tb ? (a as Date) : (b as Date);
}

interface StatRow {
  id: number;
  subject_id: number | null;
  q_type: number | null;
  created_by: number | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export class QuestionBankService {
  private readonly now: () => Date;

  constructor(private readonly prisma: PrismaClient = getPrismaClient(), options: { now?: () => Date } = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async overview(filters: QbOverviewFilters = {}): Promise<QbOverview> {
    const courseId = filters.courseId && filters.courseId > 0 ? filters.courseId : undefined;
    const scope: Prisma.question_bankWhereInput = courseId
      ? await questionBankCourseScope(this.prisma, [courseId])
      : {};
    const base: Prisma.question_bankWhereInput = { deleted_at: null, ...scope };

    const rows = await this.statRows(base);

    // The subjects listed: every live subject, or for a course its linked
    // subjects plus any subject its questions are filed under.
    let subjectWhere: Prisma.subjectWhereInput = { deleted_at: null };
    if (courseId) {
      const links = await this.prisma.course_subject.findMany({
        where: { course_id: courseId, deleted_at: null },
        select: { subject_id: true },
      });
      const ids = new Set(links.map((l) => l.subject_id));
      for (const r of rows) if (r.subject_id !== null) ids.add(r.subject_id);
      subjectWhere = { deleted_at: null, id: { in: [...ids] } };
    }
    const subjects = await this.prisma.subject.findMany({
      where: subjectWhere,
      select: { id: true, title: true, subject_code: true, status: true },
      orderBy: { title: 'asc' },
    });
    const live = new Set(subjects.map((s) => s.id));
    const inBank = rows.filter((r) => r.subject_id !== null && live.has(r.subject_id));

    const since = new Date(this.now().getTime() - RECENT_DAYS * DAY_MS);
    const matchingIds = await this.matchingIds(base, filters, since, inBank);
    const chips = await this.courseChips(subjects.map((s) => s.id));
    const built = this.buildRows(subjects, inBank, since, matchingIds?.withQ ?? null, chips);

    const q = (filters.q ?? '').trim().toLowerCase();
    const withoutQBySubject = new Map<number, number>();
    if (matchingIds?.withoutQ) {
      for (const r of inBank) {
        if (r.subject_id !== null && matchingIds.withoutQ.has(r.id)) {
          withoutQBySubject.set(r.subject_id, (withoutQBySubject.get(r.subject_id) ?? 0) + 1);
        }
      }
    }
    const listed = built.flatMap((row): QbSubjectRow[] => {
      if (!matchingIds) return [row];
      const subjectHit = q !== '' && (row.title.toLowerCase().includes(q) || row.code.toLowerCase().includes(q));
      if (!subjectHit) return (row.matching ?? 0) > 0 ? [row] : [];
      // The subject's own name / code matched the search: keep it, unless
      // another question filter (type / author / recent) leaves it empty.
      if (!matchingIds.withoutQ) return [{ ...row, matching: null }];
      const n = withoutQBySubject.get(row.id) ?? 0;
      return n > 0 ? [{ ...row, matching: n }] : [];
    });

    const authors = await this.authors(inBank);
    return {
      kpis: {
        subjects: subjects.length,
        questions: inBank.length,
        mcq: inBank.filter((r) => r.q_type !== 1).length,
        descriptive: inBank.filter((r) => r.q_type === 1).length,
        recent: inBank.filter((r) => r.created_at instanceof Date && r.created_at >= since).length,
      },
      subjects: listed,
      authors,
    };
  }

  /** One subject's header, even when it has no questions yet. */
  async subject(subjectId: number): Promise<{ subject: QbSubjectRow; authors: QbAuthor[] } | null> {
    if (!Number.isSafeInteger(subjectId) || subjectId <= 0) return null;
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, deleted_at: null },
      select: { id: true, title: true, subject_code: true, status: true },
    });
    if (!subject) return null;
    const rows = await this.statRows({ deleted_at: null, subject_id: subjectId });
    const since = new Date(this.now().getTime() - RECENT_DAYS * DAY_MS);
    const chips = await this.courseChips([subjectId]);
    const [row] = this.buildRows([subject], rows, since, null, chips);
    return row ? { subject: row, authors: await this.authors(rows) } : null;
  }

  /** Move questions to another subject; questions in a published exam stay put. */
  async bulkMove(actorUserId: number | null, idsInput: number[], targetSubjectId: number): Promise<Record<string, unknown>> {
    const ids = idsInput.slice(0, MAX_BULK);
    if (ids.length === 0) return { status: 0, message: 'Select at least one question.' };
    const target = targetSubjectId > 0
      ? await this.prisma.subject.findFirst({
          where: { id: targetSubjectId, deleted_at: null },
          select: { id: true, title: true, course_id: true },
        })
      : null;
    if (!target) return { status: 0, message: 'Choose the subject to move the questions to.' };

    const rows = await this.prisma.question_bank.findMany({
      where: { id: { in: ids }, deleted_at: null },
      select: { id: true, subject_id: true, course_id: true, lesson_id: true, title: true },
    });
    const skipped: QbSkipped[] = this.missing(ids, rows);
    const usage = await questionUsage(this.prisma, rows.map((r) => r.id));

    // Same duplicate rule as the upload: identical text already in the target.
    const inTarget = await this.prisma.question_bank.findMany({
      where: { subject_id: target.id, deleted_at: null },
      select: { title: true },
    });
    const seen = new Set(inTarget.map((r) => normaliseQuestionText(r.title ?? '')));

    // The question keeps its course when that course has the target subject;
    // otherwise it is filed under the target's first course. A lesson belongs
    // to the old subject, so it is dropped unless it is the target's.
    const links = await this.prisma.course_subject.findMany({
      where: { subject_id: target.id, deleted_at: null },
      select: { course_id: true, position: true },
      orderBy: [{ position: 'asc' }, { course_id: 'asc' }],
    });
    const targetCourses = links.map((l) => l.course_id);
    const fallbackCourse = targetCourses[0] ?? target.course_id ?? null;
    const lessonIds = [...new Set(rows.map((r) => r.lesson_id).filter((v): v is number => v !== null))];
    const lessons = lessonIds.length > 0
      ? await this.prisma.lesson.findMany({ where: { id: { in: lessonIds } }, select: { id: true, subject_id: true } })
      : [];
    const lessonSubject = new Map(lessons.map((l) => [l.id, l.subject_id]));

    const groups = new Map<string, { course: number | null; lesson: number | null; ids: number[] }>();
    for (const r of rows) {
      const published = usage.get(r.id)?.published ?? [];
      if (r.subject_id === target.id) { skipped.push({ id: r.id, code: questionCode(r.id), reason: 'Already in this subject.' }); continue; }
      if (published.length > 0) {
        skipped.push({ id: r.id, code: questionCode(r.id), reason: `${publishedSentence(published)} It cannot move to another subject.` });
        continue;
      }
      const key = normaliseQuestionText(r.title ?? '');
      if (key !== '' && seen.has(key)) {
        skipped.push({ id: r.id, code: questionCode(r.id), reason: `The same question is already in ${target.title ?? 'that subject'}.` });
        continue;
      }
      seen.add(key);
      const course = r.course_id !== null && targetCourses.includes(r.course_id) ? r.course_id : (fallbackCourse ?? r.course_id);
      const lesson = r.lesson_id !== null && lessonSubject.get(r.lesson_id) === target.id ? r.lesson_id : null;
      const g = groups.get(`${course}:${lesson}`) ?? { course, lesson, ids: [] };
      g.ids.push(r.id);
      groups.set(`${course}:${lesson}`, g);
    }

    let moved = 0;
    const now = this.now();
    for (const g of groups.values()) {
      const res = await this.prisma.question_bank.updateMany({
        where: { id: { in: g.ids }, deleted_at: null },
        data: { subject_id: target.id, course_id: g.course, lesson_id: g.lesson, updated_by: actorUserId, updated_at: now },
      });
      moved += res.count;
    }
    const title = target.title ?? 'the subject';
    const head = `${moved} question${moved === 1 ? '' : 's'} moved to ${title}.`;
    return {
      status: moved > 0 ? 1 : 0,
      message: skipped.length > 0 ? `${head} ${skipped.length} skipped.` : head,
      data: { moved, skipped },
    };
  }

  /** Soft-delete questions; questions in a published exam are kept and reported. */
  async bulkDelete(actorUserId: number | null, idsInput: number[]): Promise<Record<string, unknown>> {
    const ids = idsInput.slice(0, MAX_BULK);
    if (ids.length === 0) return { status: 0, message: 'Select at least one question.' };
    const rows = await this.prisma.question_bank.findMany({
      where: { id: { in: ids }, deleted_at: null },
      select: { id: true },
    });
    const skipped: QbSkipped[] = this.missing(ids, rows);
    const usage = await questionUsage(this.prisma, rows.map((r) => r.id));
    const deletable: number[] = [];
    for (const r of rows) {
      const published = usage.get(r.id)?.published ?? [];
      if (published.length > 0) {
        skipped.push({ id: r.id, code: questionCode(r.id), reason: `${publishedSentence(published)} It cannot be deleted.` });
      } else {
        deletable.push(r.id);
      }
    }
    const res = deletable.length > 0
      ? await this.prisma.question_bank.updateMany({
          where: { id: { in: deletable }, deleted_at: null },
          data: { deleted_by: actorUserId, deleted_at: this.now() },
        })
      : { count: 0 };
    const head = `${res.count} question${res.count === 1 ? '' : 's'} deleted.`;
    return {
      status: res.count > 0 ? 1 : 0,
      message: skipped.length > 0 ? `${head} ${skipped.length} kept.` : head,
      data: { deleted: res.count, skipped },
    };
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private statRows(where: Prisma.question_bankWhereInput): Promise<StatRow[]> {
    return this.prisma.question_bank.findMany({
      where,
      select: { id: true, subject_id: true, q_type: true, created_by: true, created_at: true, updated_at: true },
    });
  }

  private missing(ids: number[], rows: Array<{ id: number }>): QbSkipped[] {
    const found = new Set(rows.map((r) => r.id));
    return ids.filter((id) => !found.has(id)).map((id) => ({ id, code: questionCode(id), reason: 'Not found — it may already be deleted.' }));
  }

  /**
   * Ids of the questions matching the question-level filters, or null when
   * none is active. `withoutQ` is the same set ignoring the text search (used
   * when the search matched the subject's own name or code); null when no
   * filter other than the search is active.
   */
  private async matchingIds(
    base: Prisma.question_bankWhereInput,
    filters: QbOverviewFilters,
    since: Date,
    rows: StatRow[],
  ): Promise<{ withQ: Set<number>; withoutQ: Set<number> | null } | null> {
    const q = (filters.q ?? '').trim();
    const kind = filters.qType ?? '';
    const createdBy = filters.createdBy && filters.createdBy > 0 ? filters.createdBy : undefined;
    const otherActive = kind !== '' || createdBy !== undefined || filters.recent === true;
    if (q === '' && !otherActive) return null;

    // Type / author / recent are answered from the rows already loaded; True
    // or False and the text search need the options / title columns.
    let tf: Set<number> | null = null;
    if (kind === 'tf') {
      // Narrowed in SQL by the word (each common spelling, so it does not
      // depend on the column collation), then decided by the exact rule.
      const hits = await this.prisma.question_bank.findMany({
        where: { AND: [base, { q_type: 0, OR: ['true', 'True', 'TRUE'].map((w) => ({ options: { contains: w } })) }] },
        select: { id: true, options: true },
      });
      tf = new Set(hits.filter((h) => isTrueFalseOptions(h.options)).map((h) => h.id));
    }
    const passesOther = (r: StatRow): boolean => {
      if (kind === 'descriptive' && r.q_type !== 1) return false;
      if (kind === 'mcq' && r.q_type === 1) return false;
      if (tf && !tf.has(r.id)) return false;
      if (createdBy !== undefined && r.created_by !== createdBy) return false;
      if (filters.recent === true && !(r.created_at instanceof Date && r.created_at >= since)) return false;
      return true;
    };
    const withoutQ = new Set(rows.filter(passesOther).map((r) => r.id));

    if (q === '') return { withQ: withoutQ, withoutQ };
    const byId = parseQuestionCode(q);
    const textHits = await this.prisma.question_bank.findMany({
      where: { AND: [base, { OR: [{ title: { contains: q } }, ...(byId ? [{ id: byId }] : [])] }] },
      select: { id: true },
    });
    const withQ = new Set(textHits.map((h) => h.id).filter((id) => withoutQ.has(id)));
    return { withQ, withoutQ: otherActive ? withoutQ : null };
  }

  private buildRows(
    subjects: Array<{ id: number; title: string | null; subject_code: string | null; status: string | null }>,
    rows: StatRow[],
    since: Date,
    matching: Set<number> | null,
    chips: Map<number, QbCourseChip[]>,
  ): QbSubjectRow[] {
    const stats = new Map<number, { total: number; mcq: number; descriptive: number; recent: number; last: Date | null; matching: number }>();
    for (const r of rows) {
      if (r.subject_id === null) continue;
      const s = stats.get(r.subject_id) ?? { total: 0, mcq: 0, descriptive: 0, recent: 0, last: null, matching: 0 };
      s.total += 1;
      // q_type is a nullable TinyInt: 1 = Descriptive; 0 / null (legacy) = MCQ.
      if (r.q_type === 1) s.descriptive += 1; else s.mcq += 1;
      if (r.created_at instanceof Date && r.created_at >= since) s.recent += 1;
      s.last = later(s.last, later(r.updated_at, r.created_at));
      if (matching?.has(r.id)) s.matching += 1;
      stats.set(r.subject_id, s);
    }
    return subjects.map((sub) => {
      const s = stats.get(sub.id);
      return {
        id: sub.id,
        code: sub.subject_code ?? '',
        title: sub.title ?? '',
        status: (sub.status ?? '').trim() || 'draft',
        courses: chips.get(sub.id) ?? [],
        total: s?.total ?? 0,
        mcq: s?.mcq ?? 0,
        descriptive: s?.descriptive ?? 0,
        recent: s?.recent ?? 0,
        lastUpdated: iso(s?.last ?? null),
        matching: matching ? (s?.matching ?? 0) : null,
      };
    });
  }

  private async courseChips(subjectIds: number[]): Promise<Map<number, QbCourseChip[]>> {
    const out = new Map<number, QbCourseChip[]>();
    if (subjectIds.length === 0) return out;
    const links = await this.prisma.course_subject.findMany({
      where: { subject_id: { in: subjectIds }, deleted_at: null },
      select: { subject_id: true, course_id: true, position: true },
      orderBy: [{ position: 'asc' }, { course_id: 'asc' }],
    });
    const courseIds = [...new Set(links.map((l) => l.course_id))];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: courseIds }, deleted_at: null }, select: { id: true, title: true } })
      : [];
    const title = new Map(courses.map((c) => [c.id, c.title ?? '']));
    for (const l of links) {
      const t = title.get(l.course_id);
      if (!t) continue;
      const list = out.get(l.subject_id) ?? [];
      if (!list.some((c) => c.id === l.course_id)) list.push({ id: l.course_id, title: t });
      out.set(l.subject_id, list);
    }
    return out;
  }

  private async authors(rows: StatRow[]): Promise<QbAuthor[]> {
    const ids = [...new Set(rows.map((r) => r.created_by).filter((v): v is number => v !== null && v > 0))];
    if (ids.length === 0) return [];
    const users = await this.prisma.users.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    return users
      .map((u) => ({ id: Number(u.id), name: (u.name ?? '').trim() || `User ${u.id}` }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
