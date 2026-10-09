import type { PrismaClient } from '@prisma/client';

import {
  AUTO_SUBMIT_GRACE_MS,
  examWindowCloseInstant,
  parseDurationMinutes,
} from '../assessment/assessment-service.js';
import { NOT_CANCELLED, withReExamWindow, type ActiveReExam } from '../assessment/re-exam-window.js';
import { getPrismaClient } from '../data/prisma-client.js';
import type { EmailProvider } from '../integrations/contracts.js';
import { examQuestionIds, isExamPaper } from './exam-paper.js';

// Re-examination (TTII 2026-10-09). Schedules, moves, cancels and lists
// re-exams: one subject sitting re-opened for one student in a window of its
// own. The exam-time side — the student actually being able to sit it — lives
// in assessment/re-exam-window.ts; this is the admin side.
//
// It replaces two earlier paths: /admin/re_exam/schedule wrote rows nothing
// ever read (and took the date through `new Date('YYYY-MM-DD')`), and
// /admin/re_exam/manage_grant "granted" a re-exam by soft-deleting the
// student's submitted papers.

const STUDENT_ROLE = 2;
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
/** A start this far in the past is still accepted (the form took a minute to fill). */
const START_SLACK_MS = 15 * 60 * 1000;
const LIST_LIMIT = 500;

export type ReExamState = 'upcoming' | 'open' | 'in_progress' | 'completed' | 'missed' | 'cancelled' | 'superseded';

export interface ReExamListRow {
  id: number;
  examId: number;
  parentExamId: number | null;
  examTitle: string;
  examCode: string;
  subjectTitle: string;
  userId: number;
  studentName: string;
  studentCode: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
  state: ReExamState;
  totalMarks: number;
  passMarks: number | null;
  previousScore: number | null;
  newScore: number | null;
  result: 'pass' | 'fail' | '';
  scheduledAt: string | null;
  scheduledBy: string;
}

export interface ScheduleReExamInput {
  /** The subject sitting (a child exam, or a single-sitting exam). */
  examId: number;
  userIds: number[];
  /** YYYY-MM-DD, HH:MM, HH:MM — an IST wall clock, like the exam's own columns. */
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface ReExamOutcome {
  status: 0 | 1;
  message: string;
  scheduled?: number;
  rescheduled?: number;
  emailed?: number;
}

const sittingSelect = {
  id: true,
  title: true,
  exam_code: true,
  parent_exam_id: true,
  exam_subject_id: true,
  status: true,
  is_practice: true,
  mark: true,
  duration: true,
  from_date: true,
  from_time: true,
  to_date: true,
  to_time: true,
} as const;

interface ParsedWindow {
  date: Date;
  start: Date;
  end: Date;
  startMs: number;
  endMs: number;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Parse the IST wall-clock window into the stored shapes and real instants. */
export function parseReExamWindow(date: string, startTime: string, endTime: string): ParsedWindow | null {
  const d = DATE_RE.exec(date.trim());
  const s = TIME_RE.exec(startTime.trim());
  const e = TIME_RE.exec(endTime.trim());
  if (!d || !s || !e) return null;
  const [y, mo, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const dateUtc = new Date(Date.UTC(y, mo - 1, day));
  // Reject 31/02 and friends rather than letting Date roll them over.
  if (dateUtc.getUTCMonth() !== mo - 1 || dateUtc.getUTCDate() !== day) return null;
  const at = (m: RegExpExecArray): number => Date.UTC(y, mo - 1, day, Number(m[1]), Number(m[2])) - IST_OFFSET_MS;
  return {
    date: dateUtc,
    start: new Date(Date.UTC(1970, 0, 1, Number(s[1]), Number(s[2]))),
    end: new Date(Date.UTC(1970, 0, 1, Number(e[1]), Number(e[2]))),
    startMs: at(s),
    endMs: at(e),
  };
}

function ymd(value: Date | null | undefined): string {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : '';
}

function hhmm(value: Date | null | undefined): string {
  if (!(value instanceof Date)) return '';
  return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
}

function time12(value: string): string {
  const m = TIME_RE.exec(value);
  if (!m) return value;
  const h = Number(m[1]);
  return `${((h + 11) % 12) + 1}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

function dateLabel(date: Date): string {
  const opts = { timeZone: 'UTC' } as const;
  const day = date.toLocaleDateString('en-GB', { ...opts, day: 'numeric', month: 'short', year: 'numeric' });
  return `${day} (${date.toLocaleDateString('en-GB', { ...opts, weekday: 'long' })})`;
}

function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? '';
}

export class ReExamService {
  private emailProvider: EmailProvider | null;
  private readonly now: () => Date;

  constructor(
    private readonly prisma: PrismaClient = getPrismaClient(),
    options: { email?: EmailProvider; now?: () => Date } = {},
  ) {
    this.emailProvider = options.email ?? null;
    this.now = options.now ?? (() => new Date());
  }

  async schedule(actorUserId: number | null, input: ScheduleReExamInput): Promise<ReExamOutcome> {
    const userIds = [...new Set(input.userIds.filter((id) => Number.isInteger(id) && id > 0))];
    if (userIds.length === 0) return { status: 0, message: 'Select at least one student.' };

    const sitting = await this.prisma.exam.findFirst({ where: { id: input.examId, deleted_at: null }, select: sittingSelect });
    if (!sitting || sitting.status !== 'published' || sitting.is_practice === 1) {
      return { status: 0, message: 'Exam sitting not found.' };
    }
    const children = await this.prisma.exam.count({ where: { parent_exam_id: sitting.id, deleted_at: null } });
    if (children > 0) {
      return { status: 0, message: 'Choose the subject to re-examine, not the whole exam.' };
    }

    const nowMs = this.now().getTime();
    const originalClose = examWindowCloseInstant(sitting);
    if (originalClose && originalClose.getTime() + AUTO_SUBMIT_GRACE_MS >= nowMs) {
      return { status: 0, message: 'A re-exam can be scheduled once the original sitting has finished.' };
    }

    const window = parseReExamWindow(input.date, input.startTime, input.endTime);
    if (!window) return { status: 0, message: 'Enter a valid date, start time and end time.' };
    if (window.endMs <= window.startMs) return { status: 0, message: 'The end time must be after the start time.' };
    if (window.startMs < nowMs - START_SLACK_MS) return { status: 0, message: 'The start time has already passed.' };
    const durationMin = parseDurationMinutes(sitting.duration);
    const windowMin = Math.round((window.endMs - window.startMs) / 60000);
    if (durationMin > 0 && windowMin < durationMin) {
      return {
        status: 0,
        message: `The window (${windowMin} min) is shorter than the paper (${durationMin} min). Allow at least ${durationMin} minutes.`,
      };
    }

    // Only students allocated THIS sitting — the same check the student's own
    // gate makes, so nobody is emailed a re-exam they cannot open.
    const allocated = await this.prisma.exam_student_allocations.findMany({
      where: { exam_id: sitting.id, user_id: { in: userIds } },
      select: { user_id: true },
    });
    const allocatedIds = new Set(allocated.map((a) => a.user_id));
    const students = await this.prisma.users.findMany({
      where: { id: { in: [...allocatedIds] }, deleted_at: null, role_id: STUDENT_ROLE },
      select: { id: true, name: true, user_email: true, email: true },
    });
    if (students.length !== userIds.length) {
      const missing = userIds.length - students.length;
      return { status: 0, message: `${missing} selected student${missing === 1 ? ' is' : 's are'} not allocated to this exam.` };
    }

    // Their papers on this sitting (lesson-quiz rows sharing the id space excluded).
    const paperQuestions = await examQuestionIds(this.prisma, [sitting.id]);
    const papers = (await this.prisma.exam_attempt.findMany({
      where: { exam_id: sitting.id, user_id: { in: userIds }, deleted_at: null },
      select: { user_id: true, submit_status: true, created_at: true, question_id: true },
    })).filter((a) => isExamPaper(a.question_id, paperQuestions.get(sitting.id)));

    // Plan every student before writing anything, so a refusal leaves no half-done batch.
    type Plan = { student: (typeof students)[number]; existingId: number | null };
    const plans: Plan[] = [];
    const busy: string[] = [];
    for (const student of students) {
      const existing = await this.prisma.exam_re_examinations.findFirst({
        where: { exam_id: sitting.id, user_id: student.id, ...NOT_CANCELLED },
        orderBy: { id: 'desc' },
        select: { id: true, created_at: true, new_date: true, new_start_time: true, new_end_time: true },
      });
      if (!existing?.created_at) {
        plans.push({ student, existingId: null });
        continue;
      }
      const floor = existing.created_at.getTime();
      const since = papers.filter((a) => a.user_id === student.id && (a.created_at?.getTime() ?? -Infinity) >= floor);
      if (since.length === 0) {
        // Not started: move this re-exam rather than stacking a second one.
        plans.push({ student, existingId: existing.id });
        continue;
      }
      // Started. A fresh re-exam would move the attempt floor past a paper the
      // student may still be writing, and that paper would then be judged by
      // the original (closed) window and finalised mid-way. Wait until it is
      // over: submitted, or its window (plus the auto-submit grace) has passed.
      const active: ActiveReExam | null = existing.new_date && existing.new_start_time && existing.new_end_time
        ? { id: existing.id, examId: sitting.id, userId: student.id, date: existing.new_date, startTime: existing.new_start_time, endTime: existing.new_end_time, scheduledAt: existing.created_at }
        : null;
      const closeAt = active ? examWindowCloseInstant(withReExamWindow(sitting, active)) : null;
      const windowOver = closeAt === null || closeAt.getTime() + AUTO_SUBMIT_GRACE_MS < nowMs;
      if (since.some((a) => a.submit_status !== true) && !windowOver) {
        busy.push((student.name ?? '').trim() || `Student ${student.id}`);
        continue;
      }
      plans.push({ student, existingId: null });
    }
    if (busy.length > 0) {
      return {
        status: 0,
        message: `${busy.join(', ')} ${busy.length === 1 ? 'is' : 'are'} still writing the current re-exam. Schedule again once that paper is finished.`,
      };
    }

    const notes = (input.notes ?? '').trim().slice(0, 500);
    const windowData = { new_date: window.date, new_start_time: window.start, new_end_time: window.end };
    let scheduled = 0;
    let rescheduled = 0;
    const toEmail: Array<{ student: (typeof students)[number]; rescheduled: boolean }> = [];
    for (const { student, existingId } of plans) {
      if (existingId !== null) {
        await this.prisma.exam_re_examinations.update({
          where: { id: existingId },
          // An empty note on a move keeps the note already there.
          data: { ...windowData, ...(notes ? { notes } : {}) },
        });
        rescheduled += 1;
        toEmail.push({ student, rescheduled: true });
      } else {
        await this.prisma.exam_re_examinations.create({
          data: {
            ...windowData,
            notes: notes || null,
            exam_id: sitting.id,
            exam_subject_id: sitting.exam_subject_id,
            user_id: student.id,
            status: 'scheduled',
            // Written here, not left to the column default: this instant is
            // the attempt floor, and the database clock is not the app's.
            created_at: this.now(),
            created_by: actorUserId,
          },
        });
        scheduled += 1;
        toEmail.push({ student, rescheduled: false });
      }
    }

    const emailed = await this.notify(sitting, window, durationMin, toEmail);
    const parts = [
      scheduled > 0 ? `${scheduled} re-exam${scheduled === 1 ? '' : 's'} scheduled` : '',
      rescheduled > 0 ? `${rescheduled} rescheduled` : '',
    ].filter(Boolean);
    return {
      status: 1,
      message: `${parts.join(', ')}. ${emailed} student${emailed === 1 ? '' : 's'} notified by email.`,
      scheduled,
      rescheduled,
      emailed,
    };
  }

  async cancel(reExamId: number): Promise<ReExamOutcome> {
    const row = await this.prisma.exam_re_examinations.findFirst({
      where: { id: reExamId },
      select: { id: true, exam_id: true, user_id: true, status: true, created_at: true },
    });
    if (!row) return { status: 0, message: 'Re-exam not found.' };
    if (row.status === 'cancelled') return { status: 0, message: 'This re-exam is already cancelled.' };
    const paperQuestions = await examQuestionIds(this.prisma, [row.exam_id]);
    const started = row.created_at
      ? (await this.prisma.exam_attempt.findMany({
          where: { exam_id: row.exam_id, user_id: row.user_id, deleted_at: null, created_at: { gte: row.created_at } },
          select: { question_id: true },
        })).filter((a) => isExamPaper(a.question_id, paperQuestions.get(row.exam_id))).length
      : 0;
    if (started > 0) return { status: 0, message: 'The student has already started this re-exam, so it cannot be cancelled.' };
    await this.prisma.exam_re_examinations.update({ where: { id: row.id }, data: { status: 'cancelled' } });
    return { status: 1, message: 'Re-exam cancelled.' };
  }

  async list(): Promise<ReExamListRow[]> {
    const rows = await this.prisma.exam_re_examinations.findMany({ orderBy: { id: 'desc' }, take: LIST_LIMIT });
    if (rows.length === 0) return [];

    const sittingIds = [...new Set(rows.map((r) => r.exam_id))];
    const userIds = [...new Set(rows.map((r) => r.user_id))];
    const [sittings, users, attempts] = await Promise.all([
      this.prisma.exam.findMany({ where: { id: { in: sittingIds } }, select: sittingSelect }),
      this.prisma.users.findMany({
        where: { id: { in: [...userIds, ...rows.map((r) => r.created_by).filter((v): v is number => v !== null)] } },
        select: { id: true, name: true, student_id: true },
      }),
      this.prisma.exam_attempt.findMany({
        where: { exam_id: { in: sittingIds }, user_id: { in: userIds }, deleted_at: null },
        select: { id: true, exam_id: true, user_id: true, score: true, submit_status: true, created_at: true, start_time: true, question_id: true },
      }),
    ]);
    const paperQuestions = await examQuestionIds(this.prisma, sittingIds);
    const papers = attempts.filter((a) => a.exam_id !== null && isExamPaper(a.question_id, paperQuestions.get(a.exam_id)));
    const parentIds = [...new Set(sittings.map((s) => s.parent_exam_id).filter((v): v is number => v !== null))];
    const scheduleIds = [...new Set(sittings.map((s) => s.exam_subject_id).filter((v): v is number => v !== null))];
    const [parents, schedules] = await Promise.all([
      parentIds.length > 0
        ? this.prisma.exam.findMany({ where: { id: { in: parentIds } }, select: { id: true, title: true, exam_code: true } })
        : Promise.resolve([]),
      scheduleIds.length > 0
        ? this.prisma.exam_subjects.findMany({ where: { id: { in: scheduleIds } }, select: { id: true, subject_title: true, pass_marks: true, total_marks: true } })
        : Promise.resolve([]),
    ]);
    const sittingById = new Map(sittings.map((s) => [s.id, s]));
    const parentById = new Map(parents.map((p) => [p.id, p]));
    const scheduleById = new Map(schedules.map((s) => [s.id, s]));
    const userById = new Map(users.map((u) => [u.id, u]));
    const nowMs = this.now().getTime();

    // Each row owns the attempts started between it and the next (newer) live
    // re-exam on the same paper; an older row with a newer one is superseded.
    const nextFloor = new Map<number, number>();
    const newestSeen = new Map<string, number>();
    for (const r of rows) {
      const key = `${r.user_id}:${r.exam_id}`;
      const newer = newestSeen.get(key);
      if (newer !== undefined) nextFloor.set(r.id, newer);
      if (r.status !== 'cancelled' && r.created_at) newestSeen.set(key, r.created_at.getTime());
    }

    return rows.map((r) => {
      const sitting = sittingById.get(r.exam_id);
      const parent = sitting?.parent_exam_id ? parentById.get(sitting.parent_exam_id) : undefined;
      const schedule = sitting?.exam_subject_id ? scheduleById.get(sitting.exam_subject_id) : undefined;
      const student = userById.get(r.user_id);
      const floor = r.created_at?.getTime() ?? 0;
      const ceiling = nextFloor.get(r.id) ?? Infinity;
      const mine = papers.filter((a) => a.exam_id === r.exam_id && a.user_id === r.user_id);
      const created = (a: (typeof mine)[number]): number => a.created_at?.getTime() ?? -Infinity;
      const newestSubmitted = (list: typeof mine) => list.filter((a) => a.submit_status === true).sort((a, b) => b.id - a.id)[0];
      const previous = newestSubmitted(mine.filter((a) => created(a) < floor));
      const own = mine.filter((a) => created(a) >= floor && created(a) < ceiling);
      const done = newestSubmitted(own);
      const passMarks = schedule?.pass_marks && schedule.pass_marks > 0 ? schedule.pass_marks : null;

      let state: ReExamState;
      if (r.status === 'cancelled') state = 'cancelled';
      else if (done) state = 'completed';
      else if (ceiling !== Infinity) state = 'superseded';
      else {
        const active: ActiveReExam | null = sitting && r.new_date && r.new_start_time && r.new_end_time && r.created_at
          ? { id: r.id, examId: r.exam_id, userId: r.user_id, date: r.new_date, startTime: r.new_start_time, endTime: r.new_end_time, scheduledAt: r.created_at }
          : null;
        const win = active && sitting ? withReExamWindow(sitting, active) : null;
        const closeMs = win ? examWindowCloseInstant(win)?.getTime() ?? null : null;
        const startMs = r.new_date && r.new_start_time
          ? Date.UTC(r.new_date.getUTCFullYear(), r.new_date.getUTCMonth(), r.new_date.getUTCDate(), r.new_start_time.getUTCHours(), r.new_start_time.getUTCMinutes()) - IST_OFFSET_MS
          : null;
        if (own.length > 0 && (closeMs === null || nowMs <= closeMs + AUTO_SUBMIT_GRACE_MS)) state = 'in_progress';
        else if (startMs !== null && nowMs < startMs) state = 'upcoming';
        else if (closeMs === null || nowMs <= closeMs + AUTO_SUBMIT_GRACE_MS) state = 'open';
        else state = 'missed';
      }

      const newScore = done ? done.score ?? 0 : null;
      return {
        id: r.id,
        examId: r.exam_id,
        parentExamId: sitting?.parent_exam_id ?? null,
        examTitle: ((parent?.title ?? sitting?.title) ?? '').trim(),
        examCode: (parent?.exam_code ?? sitting?.exam_code) ?? '',
        subjectTitle: (schedule?.subject_title ?? '').trim() || (sitting?.title ?? '').trim(),
        userId: r.user_id,
        studentName: (student?.name ?? '').trim(),
        studentCode: student?.student_id ?? '',
        date: ymd(r.new_date),
        startTime: hhmm(r.new_start_time),
        endTime: hhmm(r.new_end_time),
        notes: r.notes ?? '',
        state,
        totalMarks: sitting?.mark && sitting.mark > 0 ? sitting.mark : schedule?.total_marks ?? 0,
        passMarks,
        previousScore: previous ? previous.score ?? 0 : null,
        newScore,
        result: newScore === null || passMarks === null ? '' : newScore >= passMarks ? 'pass' : 'fail',
        scheduledAt: r.created_at ? r.created_at.toISOString() : null,
        scheduledBy: (r.created_by ? userById.get(r.created_by)?.name ?? '' : '').trim(),
      };
    });
  }

  private async email(): Promise<EmailProvider> {
    if (!this.emailProvider) {
      const { createIntegrationRegistry } = await import('../integrations/registry.js');
      this.emailProvider = createIntegrationRegistry().email;
    }
    return this.emailProvider;
  }

  /** Best-effort: a failed email never undoes a scheduled re-exam. */
  private async notify(
    sitting: { title: string | null; parent_exam_id: number | null; exam_subject_id: number | null },
    window: ParsedWindow,
    durationMin: number,
    recipients: Array<{ student: { name: string | null; user_email: string | null; email: string | null }; rescheduled: boolean }>,
  ): Promise<number> {
    if (recipients.length === 0) return 0;
    const [parent, schedule] = await Promise.all([
      sitting.parent_exam_id
        ? this.prisma.exam.findFirst({ where: { id: sitting.parent_exam_id }, select: { title: true } })
        : Promise.resolve(null),
      sitting.exam_subject_id
        ? this.prisma.exam_subjects.findFirst({ where: { id: sitting.exam_subject_id }, select: { subject_title: true } })
        : Promise.resolve(null),
    ]);
    const examName = (parent?.title ?? sitting.title ?? '').trim() || 'your examination';
    const subjectName = (schedule?.subject_title ?? '').trim() || examName;
    const { renderReExamScheduledEmail, EXAM_EMAIL_SUBJECTS } = await import('../integrations/exam-emails.js');
    const provider = await this.email();
    let sent = 0;
    for (const { student, rescheduled } of recipients) {
      const to = (student.user_email ?? '').trim() || (student.email ?? '').trim();
      // users.email often holds a phone number on legacy rows — never mail it.
      if (!to.includes('@')) continue;
      try {
        await provider.sendEmail({
          to,
          subject: EXAM_EMAIL_SUBJECTS.reExamScheduled(subjectName, rescheduled),
          html: renderReExamScheduledEmail({
            studentFirstName: firstName(student.name),
            examName,
            subjectName,
            dateLabel: dateLabel(window.date),
            timeLabel: `${time12(hhmm(window.start))} – ${time12(hhmm(window.end))}`,
            durationLabel: durationMin > 0 ? `${durationMin} minutes` : '',
            rescheduled,
          }),
        });
        sent += 1;
      } catch {
        /* best-effort */
      }
    }
    return sent;
  }
}
