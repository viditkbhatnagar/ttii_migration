// Review Exam dialog (Naji's design) — the pure summary of everything the six
// steps saved, plus what Publish is about to do. Publishing emails every
// allocated student on the first publish, so the admin sees this and confirms
// before anything is sent.

import { buildSections, type QuestionOption, type SubjectPlan } from './question-assign-model.js';
import type { ScheduleRow } from './wizard-model.js';

export interface AssignedQuestion {
  question_id: number;
  /** Deleted from the Question Bank since it was saved — students won't see it. */
  deleted: boolean;
}

export interface ReviewInput {
  schedule: ScheduleRow[];
  plans: SubjectPlan[];
  options: QuestionOption[];
  assigned: AssignedQuestion[];
  allocatedCount: number;
  notifyEmail: boolean;
  notifyInapp: boolean;
  isPublished: boolean;
  resendNotification: boolean;
}

export interface ReviewSubjectRow {
  key: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalMarks: number;
  passMarks: number;
  /** Step 3 plan; null when the subject has no plan row. */
  planned: number | null;
  assigned: number;
}

export interface ReviewSummary {
  subjects: ReviewSubjectRow[];
  totalMarks: number;
  plannedQuestions: number;
  assignedQuestions: number;
  deletedQuestions: number;
  allocatedCount: number;
  /** Students the publish will email (0 when email is off or it's a re-publish without re-send). */
  emailRecipients: number;
  issues: string[];
}

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

export function buildReviewSummary(input: ReviewInput): ReviewSummary {
  const live = new Set(input.assigned.filter((a) => !a.deleted && a.question_id > 0).map((a) => a.question_id));
  const deletedQuestions = input.assigned.filter((a) => a.deleted).length;
  const planBySubject = new Map(input.plans.map((p) => [p.exam_subject_id, p]));
  const assignedBySubject = new Map<number, number>();
  for (const s of buildSections(input.options, input.plans)) {
    if (!s.plan) continue;
    assignedBySubject.set(s.plan.exam_subject_id, s.items.filter((o) => live.has(o.id)).length);
  }

  const subjects: ReviewSubjectRow[] = input.schedule.map((r, i) => {
    const sid = r.id ?? 0;
    const plan = sid ? planBySubject.get(sid) : undefined;
    return {
      key: `${sid || r.subject_title}-${i}`,
      title: r.subject_title,
      date: r.exam_date,
      startTime: r.start_time,
      endTime: r.end_time,
      durationMinutes: r.duration_minutes,
      totalMarks: r.total_marks,
      passMarks: r.pass_marks,
      planned: plan ? plan.total_target : null,
      assigned: sid ? (assignedBySubject.get(sid) ?? 0) : 0,
    };
  });

  const issues: string[] = [];
  const undated = subjects.filter((s) => !s.date || !s.startTime || !s.endTime).map((s) => s.title);
  if (undated.length > 0) issues.push(`Missing date or time for ${undated.join(', ')} — publishing will be refused until Step 2 is complete.`);
  for (const s of subjects) {
    if (s.planned !== null && s.planned > 0 && s.assigned < s.planned) {
      issues.push(`${s.title}: ${s.assigned} of ${s.planned} planned questions assigned.`);
    }
  }
  if (live.size === 0) issues.push('No questions are assigned — students will not be able to take this exam.');
  if (deletedQuestions > 0) issues.push(`${plural(deletedQuestions, 'saved question')} ${deletedQuestions === 1 ? 'was' : 'were'} deleted from the Question Bank — re-run Auto-fill in Step 4.`);
  if (input.allocatedCount === 0) issues.push('No students are allocated to this exam.');

  const sendsEmail = input.notifyEmail && (!input.isPublished || input.resendNotification);
  return {
    subjects,
    totalMarks: subjects.reduce((n, s) => n + s.totalMarks, 0),
    plannedQuestions: subjects.reduce((n, s) => n + (s.planned ?? 0), 0),
    assignedQuestions: live.size,
    deletedQuestions,
    allocatedCount: input.allocatedCount,
    emailRecipients: sendsEmail ? input.allocatedCount : 0,
    issues,
  };
}

/** The body of the "Publish this exam?" confirmation — says exactly who gets emailed. */
export function publishConfirmMessage(summary: Pick<ReviewSummary, 'emailRecipients' | 'allocatedCount' | 'subjects'>, isPublished: boolean, notifyEmail: boolean): string {
  const sittings = summary.subjects.length;
  const what = isPublished
    ? `This updates the live exam${sittings > 0 ? ` and its ${plural(sittings, 'subject sitting')}` : ''}.`
    : `This makes the exam live${sittings > 0 ? ` as ${plural(sittings, 'subject sitting')}` : ''} for ${plural(summary.allocatedCount, 'allocated student')}.`;
  const mail = summary.emailRecipients > 0
    ? `${plural(summary.emailRecipients, 'student')} will be emailed the exam schedule now. This cannot be undone.`
    : !notifyEmail
      ? 'Email notification is off, so no emails will be sent.'
      : summary.allocatedCount === 0
        ? 'No students are allocated, so no emails will be sent.'
        : 'No emails will be sent — allocated students were already notified. Tick "Re-send notification" to email them again.';
  return `${what} ${mail}`;
}
