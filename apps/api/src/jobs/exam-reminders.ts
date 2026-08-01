// Exam reminder sweep (Naji 2026-08-01) — the 24-hour and 1-hour emails from
// the "TTII New LMS Details (Communication)" sheet, Exams module.
//
// Runs on the shared cron tick. For every published, non-practice exam that
// starts inside a reminder window, mails each allocated student once and
// records the send in `exam_reminders`.
//
// Why a table rather than an in-memory guard: the tick is every few minutes and
// the process restarts on every deploy, so anything in memory would re-send.
// The unique key (exam_id, user_id, reminder_type) makes a double-send
// impossible even if two instances tick simultaneously — the insert is what
// claims the right to send, and a duplicate-key error means somebody else
// already did.
//
// Practice exams are excluded: they are permanent and unallocated, so a
// "your exam starts in an hour" mail would be nonsense.

import type { PrismaClient } from '@prisma/client';

import type { EmailProvider } from '../integrations/contracts.js';
import {
  EXAM_EMAIL_SUBJECTS,
  renderExamReminder1hEmail,
  renderExamReminder24hEmail,
} from '../integrations/exam-emails.js';

export type ReminderType = '24h' | '1h';

export interface ExamReminderDeps {
  prisma: PrismaClient;
  email: EmailProvider;
  logger: {
    info: (event: string, fields?: Record<string, unknown>) => void;
    warn: (event: string, fields?: Record<string, unknown>) => void;
    error: (event: string, fields?: Record<string, unknown>) => void;
  };
  /** Overridable for tests. Defaults to now. */
  now?: Date;
  /** How wide a window each reminder covers. Must exceed the cron interval. */
  windowMs?: number;
}

export interface ExamReminderResult {
  examsConsidered: number;
  sent: number;
  skipped: number;
  failed: number;
  /** True when `exam_reminders` is absent, so the sweep did nothing. */
  disabled?: boolean;
}

/**
 * The dedupe table is created by DDL the application's DB user is not
 * privileged to run (see apps/api/prisma/exam-reminders.sql). Until it exists this sweep
 * must send NOTHING — without the claim row there is no double-send protection,
 * and mailing every student on every tick would be far worse than not mailing.
 *
 * Checked per sweep rather than latched at boot so the job starts working the
 * moment the table is created, with no restart needed.
 */
async function reminderTableExists(prisma: PrismaClient): Promise<boolean> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ n: bigint | number }>>(
      `SELECT COUNT(*) n FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'exam_reminders'`,
    );
    return Number(rows[0]?.n ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Widened past the 5-minute cron tick so a slow tick can't skip a window. */
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

const IST = 'Asia/Kolkata';

/** "12 Aug 2026 (Tuesday)" in IST — students and staff are all IST. */
function dateLabel(d: Date): string {
  const base = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: IST });
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: IST });
  return `${base} (${weekday})`;
}

/** "10:00 AM" in IST. */
function timeLabel(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST });
}

/**
 * Absolute start instant of an exam. `from_date` is a DATE and `from_time` a
 * TIME that Prisma reads as an epoch-anchored Date, so the two are recombined
 * by hand. The wall-clock values are IST, and the server runs UTC, so IST is
 * subtracted to land on the true instant.
 */
export function examStartInstant(fromDate: Date | null, fromTime: Date | null): Date | null {
  if (!fromDate) return null;
  const y = fromDate.getUTCFullYear();
  const m = fromDate.getUTCMonth();
  const d = fromDate.getUTCDate();
  const hh = fromTime ? fromTime.getUTCHours() : 0;
  const mm = fromTime ? fromTime.getUTCMinutes() : 0;
  // IST is UTC+5:30 — an IST wall clock of 10:00 is 04:30 UTC.
  return new Date(Date.UTC(y, m, d, hh, mm) - (5 * 60 + 30) * 60 * 1000);
}

export async function sendDueExamReminders(deps: ExamReminderDeps): Promise<ExamReminderResult> {
  const now = deps.now ?? new Date();
  const windowMs = deps.windowMs ?? DEFAULT_WINDOW_MS;
  const result: ExamReminderResult = { examsConsidered: 0, sent: 0, skipped: 0, failed: 0 };

  if (!(await reminderTableExists(deps.prisma))) {
    deps.logger.warn('exam_reminders_table_missing', {
      detail: 'Exam reminder emails are OFF until the exam_reminders table is created. Run apps/api/prisma/exam-reminders.sql against the production database.',
    });
    result.disabled = true;
    return result;
  }

  // Only exams starting in the next ~25h can possibly be due for either
  // reminder — keeps the scan small however many exams exist.
  const horizonEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const exams = await deps.prisma.exam.findMany({
    where: {
      deleted_at: null,
      status: 'published',
      is_practice: 0,
      from_date: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), lte: horizonEnd },
    },
    select: {
      id: true, title: true, exam_code: true, duration: true, notify_email: true,
      from_date: true, from_time: true, course_id: true,
    },
  });

  for (const exam of exams) {
    if (exam.notify_email === 0) { result.skipped += 1; continue; }
    const start = examStartInstant(exam.from_date, exam.from_time);
    if (!start) { result.skipped += 1; continue; }

    const msUntil = start.getTime() - now.getTime();
    let reminder: ReminderType | null = null;
    if (msUntil > 24 * 60 * 60 * 1000 - windowMs && msUntil <= 24 * 60 * 60 * 1000) reminder = '24h';
    else if (msUntil > 60 * 60 * 1000 - windowMs && msUntil <= 60 * 60 * 1000) reminder = '1h';
    if (!reminder) continue;

    result.examsConsidered += 1;

    const allocations = await deps.prisma.exam_student_allocations.findMany({
      where: { exam_id: exam.id },
      select: { user_id: true },
    });
    if (allocations.length === 0) continue;

    const students = await deps.prisma.users.findMany({
      where: { id: { in: allocations.map((a) => a.user_id) }, deleted_at: null },
      select: { id: true, name: true, user_email: true, email: true },
    });

    // Subject name: exams carry no subject_id, so derive it via the question
    // bank (the documented route). Falls back to the exam title.
    const subjectName = await resolveExamSubject(deps.prisma, exam.id) || (exam.title ?? 'your exam');

    for (const student of students) {
      const to = (student.user_email ?? student.email ?? '').trim();
      if (!to || !to.includes('@')) { result.skipped += 1; continue; }

      // Claim the send FIRST. The unique key means a concurrent instance (or a
      // re-tick) loses the race here and never mails twice.
      try {
        await deps.prisma.exam_reminders.create({
          data: { exam_id: exam.id, user_id: student.id, reminder_type: reminder, sent_at: now },
        });
      } catch {
        result.skipped += 1; // already sent
        continue;
      }

      const payload = {
        studentFirstName: (student.name ?? '').trim().split(/\s+/)[0] ?? '',
        examName: exam.title ?? '',
        subjectName,
        examDateLabel: dateLabel(start),
        examTimeLabel: timeLabel(start),
        ...(exam.duration ? { examDurationLabel: `${exam.duration} minutes` } : {}),
      };

      try {
        await deps.email.sendEmail({
          to,
          subject: reminder === '24h'
            ? EXAM_EMAIL_SUBJECTS.reminder24h(subjectName)
            : EXAM_EMAIL_SUBJECTS.reminder1h(subjectName),
          html: reminder === '24h'
            ? renderExamReminder24hEmail(payload)
            : renderExamReminder1hEmail(payload),
        });
        result.sent += 1;
      } catch (err) {
        result.failed += 1;
        // Roll the claim back so the next tick retries this student rather than
        // silently swallowing a failed reminder.
        await deps.prisma.exam_reminders
          .deleteMany({ where: { exam_id: exam.id, user_id: student.id, reminder_type: reminder } })
          .catch(() => undefined);
        deps.logger.warn('exam_reminder_send_failed', {
          examId: exam.id, userId: student.id, reminder,
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return result;
}

/** exam has no subject_id — derive it through exam_questions -> question_bank. */
async function resolveExamSubject(prisma: PrismaClient, examId: number): Promise<string> {
  const link = await prisma.exam_questions.findFirst({
    where: { exam_id: examId, deleted_at: null },
    select: { question_id: true },
    orderBy: { question_no: 'asc' },
  });
  if (!link?.question_id) return '';
  const qb = await prisma.question_bank.findFirst({
    where: { id: link.question_id },
    select: { subject_id: true },
  });
  if (!qb?.subject_id) return '';
  const subject = await prisma.subject.findFirst({
    where: { id: qb.subject_id },
    select: { title: true },
  });
  return (subject?.title ?? '').trim();
}
