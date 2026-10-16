import type { Prisma, PrismaClient, exam_subject_components } from '@prisma/client';

import { parseDurationMinutes } from '../assessment/assessment-service.js';
import { getPrismaClient } from '../data/prisma-client.js';
import { nextExamCode } from './exam-code.js';
import { ExamResultsService, type ExamResultsDetail } from './exam-results-service.js';
import {
  buildDraftSubjects,
  candidatesBySitting,
  enteredKey,
  matchSittings,
  parentWindow,
  supplementaryOutcomes,
  supplementaryTitle,
  validateSupplementary,
  type DraftSubject,
  type ScheduleKey,
  type SourceSitting,
  type SubjectInput,
  type SupplementaryExamStatus,
  type SupplementaryOutcome,
} from './supplementary-exam.js';
import { SUPPLEMENTARY_NOT_SET_UP_MESSAGE, linksForExams, linksFromSources, supplementaryReady } from './supplementary-links.js';

// Supplementary exams (Risha, TTII 2026-10-16). Creating one turns a finished
// exam's result sheet into a NEW exam: a normal draft parent, one draft
// sitting per chosen subject, and on each sitting only the students chosen
// for that subject. The admin then finishes it in the Create Exam wizard
// (questions, notifications) and publishes it through the usual review and
// confirm, which keeps those per-subject students (operations-service.ts).

const TX = { timeout: 30000, maxWait: 15000 } as const;

// One create at a time per source exam (in this API process), so a double
// submit runs its duplicate check only after the first create has committed.
const creating = new Map<number, Promise<unknown>>();

async function oneAtATime<T>(sourceExamId: number, fn: () => Promise<T>): Promise<T> {
  const previous = creating.get(sourceExamId) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  const settled = run.then(() => undefined, () => undefined);
  creating.set(sourceExamId, settled);
  try {
    return await run;
  } finally {
    if (creating.get(sourceExamId) === settled) creating.delete(sourceExamId);
  }
}

export interface SupplementaryRef {
  examId: number;
  examCode: string;
  title: string;
  /** 'draft' until the wizard publishes it; then its results' state. */
  status: SupplementaryExamStatus;
  subjects: number;
  students: number;
}

export interface SupplementaryDraft {
  sourceExamId: number;
  sourceExamCode: string;
  sourceTitle: string;
  suggestedTitle: string;
  /** False until the exam_supplementary migration has run. */
  setUp: boolean;
  existing: SupplementaryRef[];
  subjects: DraftSubject[];
}

export interface CreateSupplementaryInput {
  sourceExamId: number;
  title: string;
  subjects: SubjectInput[];
}

export interface ServiceOutcome<T> {
  status: 0 | 1;
  message: string;
  data?: T;
}

export interface SupplementaryWizardInfo {
  isSupplementary: boolean;
  sourceExamId: number | null;
  sourceExamCode: string;
  sourceTitle: string;
  subjects: Array<{
    examSubjectId: number;
    sittingExamId: number | null;
    subjectTitle: string;
    students: Array<{ userId: number; name: string; studentCode: string }>;
  }>;
  /** Questions on the source exam's papers — Step 4 avoids them where it can. */
  sourceQuestionIds: number[];
}

export interface SupplementaryResultLinks {
  /** Set on a supplementary exam's own Result page: the exam it was created from. */
  supplementaryOf: { examId: number; examCode: string; title: string } | null;
  /** On a source exam's Result page: the supplementary exams created from it. */
  supplementaries: SupplementaryRef[];
  outcomes: SupplementaryOutcome[];
}

const sourceSelect = {
  id: true, title: true, exam_code: true, status: true, is_practice: true, course_id: true, description: true,
  shuffle_questions: true, have_minus_mark: true, minus_mark: true, instructions: true, notify_email: true, notify_inapp: true,
} as const;

function hhmm(value: Date | null | undefined): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
}

function csvIds(csv: string): number[] {
  return csv.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
}

function plural(n: number, one: string): string {
  return `${n} ${one}${n === 1 ? '' : 's'}`;
}

interface LoadedSource {
  detail: ExamResultsDetail;
  top: Prisma.examGetPayload<{ select: typeof sourceSelect }>;
  sittings: SourceSitting[];
  /** exam_subjects id → its Step 3 component rows. */
  components: Map<number, exam_subject_components[]>;
}

export class SupplementaryExamService {
  private readonly results: ExamResultsService;
  private readonly now: () => Date;

  constructor(
    private readonly prisma: PrismaClient = getPrismaClient(),
    options: { results?: ExamResultsService; now?: () => Date } = {},
  ) {
    this.now = options.now ?? (() => new Date());
    this.results = options.results ?? new ExamResultsService(prisma, { now: this.now });
  }

  /** What the Create Supplementary Exam dialog shows for one source exam. */
  async draft(examId: number): Promise<ServiceOutcome<SupplementaryDraft>> {
    const loaded = await this.loadSource(examId);
    if ('message' in loaded) return { status: 0, message: loaded.message };
    const { detail, sittings } = loaded;
    const [setUp, linked] = await Promise.all([
      supplementaryReady(this.prisma),
      this.linkedTo(detail.examId, () => Promise.resolve(sittings.map((s) => ({ sittingExamId: s.sittingExamId, subjectId: s.subjectId, subjectTitle: s.subjectTitle })))),
    ]);
    const titleOf = new Map(linked.refs.map((r) => [r.examId, r.title]));
    const alreadyIn = new Map(linked.outcomes.map((o) => [enteredKey(o.userId, o.sourceSittingId), titleOf.get(o.supplementaryExamId) ?? '']));
    return {
      status: 1,
      message: 'success',
      data: {
        sourceExamId: detail.examId,
        sourceExamCode: detail.examCode,
        sourceTitle: detail.title,
        suggestedTitle: supplementaryTitle(detail.title),
        setUp,
        existing: linked.refs,
        subjects: buildDraftSubjects(sittings, candidatesBySitting(detail.sittings, detail.sheet.students), alreadyIn),
      },
    };
  }

  async create(actorUserId: number | null, input: CreateSupplementaryInput): Promise<ServiceOutcome<{ examId: number; examCode: string }>> {
    if (!(await supplementaryReady(this.prisma))) return { status: 0, message: SUPPLEMENTARY_NOT_SET_UP_MESSAGE };
    return oneAtATime(await this.topIdOf(input.sourceExamId), () => this.createOnce(actorUserId, input));
  }

  private async createOnce(actorUserId: number | null, input: CreateSupplementaryInput): Promise<ServiceOutcome<{ examId: number; examCode: string }>> {
    const loaded = await this.loadSource(input.sourceExamId);
    if ('message' in loaded) return { status: 0, message: loaded.message };
    const { detail, top, sittings, components } = loaded;
    const candidates = candidatesBySitting(detail.sittings, detail.sheet.students);
    const subjectTitles = new Map(sittings.map((s) => [s.sittingExamId, s.subjectTitle]));
    const studentNames = new Map(detail.sheet.students.map((st) => [st.userId, st.name]));
    const validated = validateSupplementary(input, {
      subjectTitles,
      candidates: new Map([...candidates].map(([id, list]) => [id, new Set(list.map((c) => c.userId))])),
      nowMs: this.now().getTime(),
      studentNames,
    });
    if (!validated.ok) return { status: 0, message: validated.message };
    const window = parentWindow(validated.subjects);
    if (!window) return { status: 0, message: 'Select at least one subject.' };

    // A double submit, or a second try at the same thing: a DRAFT
    // supplementary of this exam already holding a chosen student for the
    // same subject is the one to finish.
    const linked = await this.linkedTo(top.id, () => Promise.resolve(sittings.map((s) => ({ sittingExamId: s.sittingExamId, subjectId: s.subjectId, subjectTitle: s.subjectTitle }))));
    const drafts = new Map(linked.refs.filter((r) => r.status === 'draft').map((r) => [r.examId, r]));
    const wanted = new Set(validated.subjects.flatMap((s) => s.userIds.map((u) => enteredKey(u, s.sittingExamId))));
    const taken = linked.outcomes.filter((o) => drafts.has(o.supplementaryExamId) && wanted.has(enteredKey(o.userId, o.sourceSittingId)));
    const first = taken[0];
    if (first) {
      const held = drafts.get(first.supplementaryExamId);
      const pairs = taken.slice(0, 3).map((o) => `${studentNames.get(o.userId) ?? `Student ${o.userId}`} for ${subjectTitles.get(o.sourceSittingId) ?? 'a subject'}`);
      const more = taken.length > 3 ? ` and ${taken.length - 3} more` : '';
      return {
        status: 0,
        message: `A draft supplementary exam already includes ${pairs.join(', ')}${more}: “${held?.title ?? ''}”${held?.examCode ? ` (${held.examCode})` : ''}. Open it instead.`,
      };
    }

    const [courseLinks, offeringLinks] = await Promise.all([
      this.prisma.exam_courses.findMany({ where: { exam_id: top.id }, select: { course_id: true } }),
      this.prisma.exam_offerings.findMany({ where: { exam_id: top.id }, select: { offering_id: true } }),
    ]);
    const parentCourses = [...new Set([...courseLinks.map((c) => c.course_id), ...(top.course_id ? [top.course_id] : [])])];
    const sittingById = new Map(sittings.map((s) => [s.sittingExamId, s]));
    const now = this.now();
    const copied = {
      description: top.description,
      shuffle_questions: top.shuffle_questions,
      have_minus_mark: top.have_minus_mark,
      minus_mark: top.minus_mark,
      is_practice: 0,
      status: 'draft',
      instructions: top.instructions,
      notify_email: top.notify_email ?? 1,
      notify_inapp: top.notify_inapp ?? 1,
      created_at: now,
      created_by: actorUserId,
      updated_at: now,
      updated_by: actorUserId,
    };

    // One transaction: a refusal or failure leaves no half-built exam behind.
    const created = await this.prisma.$transaction(async (tx) => {
      const code = await nextExamCode(tx, now);
      const parent = await tx.exam.create({
        data: {
          ...copied,
          title: validated.title,
          exam_code: code,
          course_id: top.course_id,
          from_date: window.fromDate,
          from_time: window.fromTime,
          to_date: window.toDate,
          to_time: window.toTime,
          duration: window.durationMinutes > 0 ? String(window.durationMinutes) : null,
        },
      });
      if (parentCourses.length > 0) {
        await tx.exam_courses.createMany({ data: parentCourses.map((course_id) => ({ exam_id: parent.id, course_id })), skipDuplicates: true });
      }
      if (offeringLinks.length > 0) {
        await tx.exam_offerings.createMany({ data: offeringLinks.map((o) => ({ exam_id: parent.id, offering_id: o.offering_id })), skipDuplicates: true });
      }
      for (const [position, subject] of validated.subjects.entries()) {
        const source = sittingById.get(subject.sittingExamId);
        if (!source) continue;
        const row = await tx.exam_subjects.create({
          data: {
            exam_id: parent.id,
            subject_id: source.subjectId,
            subject_title: source.subjectTitle.slice(0, 255),
            course_ids: source.courseIds || null,
            exam_date: subject.storedDate,
            start_time: subject.storedStart,
            end_time: subject.storedEnd,
            duration_minutes: subject.durationMinutes,
            total_marks: subject.totalMarks,
            pass_marks: subject.passMarks,
            position,
            created_at: now,
            updated_at: now,
          },
        });
        // The source subject's Step 3 plan, so Step 4 can auto-fill a new paper.
        const plan = source.examSubjectId !== null ? components.get(source.examSubjectId) ?? [] : [];
        if (plan.length > 0) {
          await tx.exam_subject_components.createMany({
            data: plan.map((c) => ({
              exam_subject_id: row.id,
              component_type: c.component_type,
              num_questions: c.num_questions,
              marks_each: c.marks_each,
              negative_marks: c.negative_marks,
              shuffle_questions: c.shuffle_questions,
              shuffle_options: c.shuffle_options,
              word_limit: c.word_limit,
            })),
          });
        }
        // The sitting itself, created now (as a DRAFT) because it is the only
        // place this subject's own students can be kept until publishing.
        const sittingCourses = csvIds(source.courseIds);
        const childCourses = sittingCourses.length > 0 ? sittingCourses : parentCourses.slice(0, 1);
        const child = await tx.exam.create({
          data: {
            ...copied,
            title: `${validated.title} — ${source.subjectTitle}`.trim().slice(0, 200),
            exam_code: `${code}-S${row.id}`.slice(0, 50),
            course_id: childCourses[0] ?? null,
            parent_exam_id: parent.id,
            exam_subject_id: row.id,
            from_date: subject.storedDate,
            to_date: subject.storedDate,
            from_time: subject.storedStart,
            to_time: subject.storedEnd,
            duration: String(subject.durationMinutes),
            mark: subject.totalMarks,
          },
        });
        if (childCourses.length > 0) {
          await tx.exam_courses.createMany({ data: childCourses.map((course_id) => ({ exam_id: child.id, course_id })), skipDuplicates: true });
        }
        await tx.exam_student_allocations.createMany({
          data: subject.userIds.map((user_id) => ({ exam_id: child.id, user_id })),
          skipDuplicates: true,
        });
      }
      const everyone = [...new Set(validated.subjects.flatMap((s) => s.userIds))];
      await tx.exam_student_allocations.createMany({ data: everyone.map((user_id) => ({ exam_id: parent.id, user_id })), skipDuplicates: true });
      await tx.exam_supplementary.create({ data: { exam_id: parent.id, source_exam_id: top.id, created_by: actorUserId, created_at: now } });
      return { examId: parent.id, examCode: code, students: everyone.length };
    }, TX);

    const subjects = validated.subjects.length;
    return {
      status: 1,
      message: `Supplementary exam ${created.examCode} created as a draft: ${plural(subjects, 'subject')}, ${plural(created.students, 'student')}. Assign its questions, then review and publish it.`,
      data: { examId: created.examId, examCode: created.examCode },
    };
  }

  /** What the wizard needs to know about a supplementary exam (isSupplementary false otherwise). */
  async info(examId: number): Promise<SupplementaryWizardInfo> {
    const none: SupplementaryWizardInfo = { isSupplementary: false, sourceExamId: null, sourceExamCode: '', sourceTitle: '', subjects: [], sourceQuestionIds: [] };
    const [link] = await linksForExams(this.prisma, [examId]);
    if (!link) return none;
    const [source, schedule, children, sourceSittings] = await Promise.all([
      this.prisma.exam.findFirst({ where: { id: link.sourceExamId }, select: { title: true, exam_code: true } }),
      this.prisma.exam_subjects.findMany({ where: { exam_id: examId }, orderBy: [{ position: 'asc' }, { id: 'asc' }], select: { id: true, subject_title: true } }),
      this.prisma.exam.findMany({ where: { parent_exam_id: examId, deleted_at: null }, select: { id: true, exam_subject_id: true } }),
      this.prisma.exam.findMany({ where: { parent_exam_id: link.sourceExamId, deleted_at: null }, select: { id: true } }),
    ]);
    const childIds = children.map((c) => c.id);
    const [allocations, papers] = await Promise.all([
      childIds.length > 0
        ? this.prisma.exam_student_allocations.findMany({ where: { exam_id: { in: childIds } }, select: { exam_id: true, user_id: true } })
        : Promise.resolve([]),
      this.prisma.exam_questions.findMany({
        where: { exam_id: { in: [link.sourceExamId, ...sourceSittings.map((s) => s.id)] }, deleted_at: null },
        select: { question_id: true },
      }),
    ]);
    const users = allocations.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: [...new Set(allocations.map((a) => a.user_id))] } }, select: { id: true, name: true, student_id: true } })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const childOfRow = new Map(children.filter((c) => c.exam_subject_id !== null).map((c) => [c.exam_subject_id as number, c.id]));
    return {
      isSupplementary: true,
      sourceExamId: link.sourceExamId,
      sourceExamCode: source?.exam_code ?? '',
      sourceTitle: (source?.title ?? '').trim(),
      subjects: schedule.map((r) => {
        const sittingExamId = childOfRow.get(r.id) ?? null;
        const students = allocations
          .filter((a) => a.exam_id === sittingExamId)
          .map((a) => ({ userId: a.user_id, name: (userById.get(a.user_id)?.name ?? '').trim() || `Student #${a.user_id}`, studentCode: userById.get(a.user_id)?.student_id ?? '' }))
          .sort((a, b) => a.name.localeCompare(b.name));
        return { examSubjectId: r.id, sittingExamId, subjectTitle: r.subject_title, students };
      }),
      sourceQuestionIds: [...new Set(papers.map((p) => p.question_id).filter((v): v is number => v !== null))],
    };
  }

  /** A sitting id resolves to its exam (0 when unknown). */
  private async topIdOf(examId: number): Promise<number> {
    if (!Number.isInteger(examId) || examId <= 0) return 0;
    const row = await this.prisma.exam.findFirst({ where: { id: examId }, select: { id: true, parent_exam_id: true } });
    return row ? row.parent_exam_id ?? row.id : 0;
  }

  /** The supplementary links shown on an exam's Result page. */
  async forResultPage(examId: number): Promise<SupplementaryResultLinks> {
    const self = Number.isInteger(examId) && examId > 0
      ? await this.prisma.exam.findFirst({ where: { id: examId, deleted_at: null }, select: { id: true, parent_exam_id: true } })
      : null;
    if (!self) return { supplementaryOf: null, supplementaries: [], outcomes: [] };
    const topId = self.parent_exam_id ?? self.id;
    const [link] = await linksForExams(this.prisma, [topId]);
    const source = link
      ? await this.prisma.exam.findFirst({ where: { id: link.sourceExamId, deleted_at: null }, select: { id: true, exam_code: true, title: true } })
      : null;
    const linked = await this.linkedTo(topId, () => this.sittingKeys(topId));
    return {
      supplementaryOf: source ? { examId: source.id, examCode: source.exam_code ?? '', title: (source.title ?? '').trim() } : null,
      supplementaries: linked.refs,
      outcomes: linked.outcomes,
    };
  }

  /**
   * The supplementary exams created from `sourceId`, and their result cells
   * keyed to its sittings (read only when there are any: most exams have none).
   */
  private async linkedTo(
    sourceId: number,
    sourceKeysOf: () => Promise<ScheduleKey[]>,
  ): Promise<{ refs: SupplementaryRef[]; outcomes: SupplementaryOutcome[] }> {
    const links = await linksFromSources(this.prisma, [sourceId]);
    if (links.length === 0) return { refs: [], outcomes: [] };
    const sourceKeys = await sourceKeysOf();
    const sheets = (await this.results.resultSheets(links.map((l) => l.examId))).sort((a, b) => a.examId - b.examId);
    const rowIds = sheets.flatMap((s) => s.sittingRows.map((r) => r.examSubjectId)).filter((v): v is number => v !== null);
    const schedules = rowIds.length > 0
      ? await this.prisma.exam_subjects.findMany({ where: { id: { in: rowIds } }, select: { id: true, exam_id: true, subject_id: true, subject_title: true } })
      : [];
    const scheduleById = new Map(schedules.map((s) => [s.id, s]));
    const refs: SupplementaryRef[] = [];
    const outcomes: SupplementaryOutcome[] = [];
    for (const s of sheets) {
      const examStatus: SupplementaryExamStatus = s.examStatus === 'published' ? s.resultStatus : 'draft';
      // A draft's sitting whose subject was since removed in Step 2 is retired
      // when it is published, so it no longer counts (subjects, students, outcomes).
      const live = s.sittingRows.filter((r) => {
        const row = r.examSubjectId !== null ? scheduleById.get(r.examSubjectId) : undefined;
        return examStatus !== 'draft' || row?.exam_id === s.examId;
      });
      const liveIds = new Set(live.map((r) => r.examId));
      const keys = live.flatMap((r): ScheduleKey[] => {
        const row = r.examSubjectId !== null ? scheduleById.get(r.examSubjectId) : undefined;
        return row ? [{ sittingExamId: r.examId, subjectId: row.subject_id, subjectTitle: row.subject_title }] : [];
      });
      const students = s.sheet.students.filter((st) => st.sittings.some((c) => liveIds.has(c.examId) && c.status !== 'not_entered')).length;
      refs.push({ examId: s.examId, examCode: s.examCode, title: s.title, status: examStatus, subjects: live.length, students });
      outcomes.push(...supplementaryOutcomes(
        { examId: s.examId, examStatus, sittings: s.sittings, students: s.sheet.students },
        matchSittings(sourceKeys, keys),
      ));
    }
    return { refs, outcomes };
  }

  /** An exam's sittings as schedule keys (its children; a child-less exam is its own sitting). */
  private async sittingKeys(topId: number): Promise<ScheduleKey[]> {
    const children = await this.prisma.exam.findMany({ where: { parent_exam_id: topId, deleted_at: null }, select: { id: true, exam_subject_id: true } });
    const own = children.length === 0
      ? await this.prisma.exam_subjects.findMany({ where: { exam_id: topId }, select: { id: true, subject_id: true, subject_title: true } })
      : [];
    if (children.length === 0) {
      const top = await this.prisma.exam.findFirst({ where: { id: topId }, select: { title: true } });
      const sole = own.length === 1 ? own[0] : undefined;
      return [{ sittingExamId: topId, subjectId: sole?.subject_id ?? null, subjectTitle: sole?.subject_title ?? (top?.title ?? '').trim() }];
    }
    const rowIds = children.map((c) => c.exam_subject_id).filter((v): v is number => v !== null);
    const rows = rowIds.length > 0
      ? await this.prisma.exam_subjects.findMany({ where: { id: { in: rowIds } }, select: { id: true, subject_id: true, subject_title: true } })
      : [];
    const rowById = new Map(rows.map((r) => [r.id, r]));
    return children.flatMap((c): ScheduleKey[] => {
      const row = c.exam_subject_id !== null ? rowById.get(c.exam_subject_id) : undefined;
      return row ? [{ sittingExamId: c.id, subjectId: row.subject_id, subjectTitle: row.subject_title }] : [];
    });
  }

  /** The source exam, its result sheet (computeExamResults) and what each sitting copies. */
  private async loadSource(examId: number): Promise<LoadedSource | { message: string }> {
    const detail = Number.isInteger(examId) && examId > 0 ? await this.results.getExamResults(examId) : null;
    if (!detail) return { message: 'Exam not found.' };
    const top = await this.prisma.exam.findFirst({ where: { id: detail.examId, deleted_at: null }, select: sourceSelect });
    if (!top || top.status !== 'published' || top.is_practice === 1) {
      return { message: 'A supplementary exam can only be created from a published exam.' };
    }
    if (detail.status === 'in_progress') {
      return { message: 'A supplementary exam can be created once this exam\'s results are ready, after its last sitting has closed.' };
    }
    const rows = await this.prisma.exam.findMany({
      where: { id: { in: detail.sittings.map((s) => s.examId) } },
      select: { id: true, exam_subject_id: true, from_time: true, to_time: true, duration: true },
    });
    const childLess = rows.length === 1 && rows[0]?.id === top.id;
    const scheduleRows = await this.prisma.exam_subjects.findMany({
      where: childLess
        ? { exam_id: top.id }
        : { id: { in: rows.map((r) => r.exam_subject_id).filter((v): v is number => v !== null) } },
    });
    const components = new Map<number, exam_subject_components[]>();
    if (scheduleRows.length > 0) {
      const comps = await this.prisma.exam_subject_components.findMany({
        where: { exam_subject_id: { in: scheduleRows.map((s) => s.id) } },
        orderBy: { id: 'asc' },
      });
      for (const c of comps) components.set(c.exam_subject_id, [...(components.get(c.exam_subject_id) ?? []), c]);
    }
    const rowById = new Map(rows.map((r) => [r.id, r]));
    const scheduleById = new Map(scheduleRows.map((s) => [s.id, s]));
    const sole = childLess && scheduleRows.length === 1 ? scheduleRows[0] : undefined;
    const sittings = detail.sittings.map((s): SourceSitting => {
      const row = rowById.get(s.examId);
      const schedule = childLess ? sole : row?.exam_subject_id != null ? scheduleById.get(row.exam_subject_id) : undefined;
      const plan = schedule ? components.get(schedule.id) ?? [] : [];
      const count = (type: string): number => plan.filter((c) => c.component_type === type).reduce((n, c) => n + (c.num_questions ?? 0), 0);
      const firstMcq = plan.find((c) => c.component_type === 'mcq');
      // What the sitting itself ran for; the schedule row is the fallback.
      const sat = parseDurationMinutes(row?.duration);
      return {
        sittingExamId: s.examId,
        examSubjectId: schedule?.id ?? null,
        subjectId: schedule?.subject_id ?? null,
        subjectTitle: s.subjectTitle,
        courseIds: schedule?.course_ids ?? (top.course_id ? String(top.course_id) : ''),
        date: s.date,
        startTime: hhmm(row?.from_time),
        endTime: hhmm(row?.to_time),
        durationMinutes: sat > 0 ? sat : schedule?.duration_minutes ?? 0,
        totalMarks: s.totalMarks,
        passMarks: s.passMarks,
        mcqQuestions: count('mcq'),
        descriptiveQuestions: count('descriptive'),
        marksEach: firstMcq?.marks_each ? Number(firstMcq.marks_each) : 0,
      };
    });
    return { detail, top, sittings, components };
  }
}
