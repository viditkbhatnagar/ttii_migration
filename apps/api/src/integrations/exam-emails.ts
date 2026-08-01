// Lovable-designed exam notification emails (Naji 2026-08-01), from the
// "TTII New LMS Details (Communication)" sheet — Exams module:
//   1. Exam Published        — when an exam is published, to every allocated student
//   2. Reminder — 24 hours   — the day before
//   3. Reminder — 1 hour     — final call
//   4. Exam Submitted        — receipt for the student who submitted
//
// Ported from the Lovable templates (public/emails/exam-*.html) onto the shared
// navy shell in lovable-email-shell.ts. The sheet's "Template Status" column
// labels all four rows "Ready in Lovable (Full Payment)" — that is a copy-paste
// slip in their spreadsheet; the exam-*.html files are the real source.

import {
  BORDER, FONT, INK, LABEL_ORANGE, MUTED, NAVY, ORANGE, PARA, SOFT,
  ctaButton, detailsCard, esc, orDash, shell,
} from './lovable-email-shell.js';

const EXAM_PORTAL_URL = 'https://learn.teachersindia.in/student/exams';

/** One scheduled paper inside the "published" email's schedule table. */
export interface ExamScheduleRow {
  subject: string;
  /** Human date, e.g. "12 Aug 2026 (Tuesday)". */
  dateLabel: string;
  /** Human time, e.g. "10:00 AM". */
  timeLabel: string;
}

export interface ExamPublishedEmailData {
  studentFirstName: string;
  examName: string;
  courseName: string;
  schedule: ExamScheduleRow[];
  examPortalLink?: string;
}

export interface ExamReminderEmailData {
  studentFirstName: string;
  examName: string;
  subjectName: string;
  examDateLabel: string;
  examTimeLabel: string;
  /** Only used by the 1-hour variant. */
  examDurationLabel?: string;
  examPortalLink?: string;
}

export interface ExamSubmittedEmailData {
  studentFirstName: string;
  examName: string;
  subjectName: string;
  examDateLabel: string;
  startTimeLabel: string;
  submissionTimeLabel: string;
  timeTakenLabel: string;
}

function greeting(firstName: string): string {
  return `<p style="margin:0 0 22px;${PARA}">Dear ${orDash(firstName)},</p>`;
}

function supportNote(): string {
  return `<p style="margin:24px 0 0;font-family:${FONT};font-size:13px;line-height:21px;color:${MUTED};">
    Need assistance? Write to
    <a href="mailto:support@teachersindia.in" style="color:${NAVY};font-weight:600;">support@teachersindia.in</a>
    and our team will help you.
  </p>`;
}

/** Schedule table for the published email — one row per paper. */
function scheduleTable(rows: ExamScheduleRow[]): string {
  if (rows.length === 0) return '';
  const head = `<tr>
    <th align="left" style="padding:12px;font-family:${FONT};font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#ffffff;background:${NAVY};">Subject</th>
    <th align="left" style="padding:12px;font-family:${FONT};font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#ffffff;background:${NAVY};">Date</th>
    <th align="left" style="padding:12px;font-family:${FONT};font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#ffffff;background:${NAVY};">Time</th>
  </tr>`;
  const body = rows
    .map((r, i) => {
      const bg = i % 2 === 0 ? '#FFFFFF' : SOFT;
      return `<tr>
        <td style="padding:13px 12px;font-family:${FONT};font-size:14px;font-weight:600;color:${INK};border:1px solid ${BORDER};background:${bg};">${orDash(r.subject)}</td>
        <td style="padding:13px 12px;font-family:${FONT};font-size:14px;color:${INK};border:1px solid ${BORDER};background:${bg};">${orDash(r.dateLabel)}</td>
        <td style="padding:13px 12px;font-family:${FONT};font-size:14px;color:${INK};border:1px solid ${BORDER};background:${bg};">${orDash(r.timeLabel)}</td>
      </tr>`;
    })
    .join('');
  return `<p style="margin:0 0 12px;${LABEL_ORANGE}">Examination Schedule</p>
  <div class="table-wrap" style="display:block;margin-bottom:24px;">
    <table class="details-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
      ${head}${body}
    </table>
  </div>`;
}

/** Callout strip used by the reminder emails. */
function callout(text: string, tone: 'info' | 'urgent'): string {
  const bg = tone === 'urgent' ? '#FFF7ED' : SOFT;
  const bar = tone === 'urgent' ? ORANGE : NAVY;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
    <tr>
      <td style="background:${bg};border-left:4px solid ${bar};border-radius:8px;padding:16px 18px;">
        <p style="margin:0;font-family:${FONT};font-size:14px;line-height:22px;color:${INK};">${text}</p>
      </td>
    </tr>
  </table>`;
}

export function renderExamPublishedEmail(data: ExamPublishedEmailData): string {
  const bodyInner = `
    ${greeting(data.studentFirstName)}
    <p style="margin:0 0 22px;${PARA}">
      The examination schedule for <strong>${orDash(data.examName)}</strong>${
        data.courseName.trim() ? ` (${orDash(data.courseName)})` : ''
      } has been published. Please review the details below and prepare accordingly.
    </p>
    ${scheduleTable(data.schedule)}
    ${callout('Log in to the exam portal a few minutes before the start time and make sure your internet connection and device are working.', 'info')}
    ${ctaButton('View My Exams', data.examPortalLink ?? EXAM_PORTAL_URL)}
    ${supportNote()}
  `;
  return shell({
    title: `Your Examination Schedule Has Been Published — ${data.examName}`,
    preheader: `Schedule published for ${data.examName}.`,
    bodyInner,
  });
}

/** 24-hour reminder — "scheduled for tomorrow". */
export function renderExamReminder24hEmail(data: ExamReminderEmailData): string {
  const bodyInner = `
    ${greeting(data.studentFirstName)}
    <p style="margin:0 0 22px;${PARA}">
      This is a reminder that your <strong>${orDash(data.subjectName)}</strong> examination is scheduled for
      <strong>tomorrow</strong>. Please make sure you are ready.
    </p>
    ${detailsCard('Exam Details', [
      { label: 'Examination', value: data.examName },
      { label: 'Subject', value: data.subjectName },
      { label: 'Date', value: data.examDateLabel },
      { label: 'Start Time', value: data.examTimeLabel },
    ])}
    ${callout('Check your device, browser and internet connection today so nothing delays you tomorrow.', 'info')}
    ${ctaButton('Open Exam Portal', data.examPortalLink ?? EXAM_PORTAL_URL)}
    ${supportNote()}
  `;
  return shell({
    title: `Reminder: Your ${data.subjectName} Exam Is Scheduled for Tomorrow`,
    preheader: `${data.subjectName} exam tomorrow at ${data.examTimeLabel}.`,
    bodyInner,
  });
}

/** 1-hour reminder — final call. */
export function renderExamReminder1hEmail(data: ExamReminderEmailData): string {
  const bodyInner = `
    ${greeting(data.studentFirstName)}
    <p style="margin:0 0 22px;${PARA}">
      Your <strong>${orDash(data.subjectName)}</strong> examination begins in approximately
      <strong>one hour</strong>. Please log in and be ready before the start time.
    </p>
    ${detailsCard('Exam Details', [
      { label: 'Examination', value: data.examName },
      { label: 'Subject', value: data.subjectName },
      { label: 'Date', value: data.examDateLabel },
      { label: 'Start Time', value: data.examTimeLabel },
      { label: 'Duration', value: data.examDurationLabel ?? '' },
    ])}
    ${callout('Once you begin, the timer runs continuously. Find a quiet place with a stable internet connection before you start.', 'urgent')}
    ${ctaButton('Start My Exam', data.examPortalLink ?? EXAM_PORTAL_URL)}
    ${supportNote()}
  `;
  return shell({
    title: `Your Exam Begins in 1 Hour — ${data.subjectName}`,
    preheader: `${data.subjectName} starts at ${data.examTimeLabel}.`,
    bodyInner,
  });
}

export function renderExamSubmittedEmail(data: ExamSubmittedEmailData): string {
  const bodyInner = `
    ${greeting(data.studentFirstName)}
    <p style="margin:0 0 22px;${PARA}">
      Your <strong>${orDash(data.subjectName)}</strong> examination has been submitted successfully.
      This email is your confirmation — no further action is needed.
    </p>
    ${detailsCard('Submission Summary', [
      { label: 'Examination', value: data.examName },
      { label: 'Subject', value: data.subjectName },
      { label: 'Date', value: data.examDateLabel },
      { label: 'Started At', value: data.startTimeLabel },
      { label: 'Submitted At', value: data.submissionTimeLabel },
      { label: 'Time Taken', value: data.timeTakenLabel },
    ])}
    ${callout('Your results will be published by the institute. You will be able to see them in your portal once they are released.', 'info')}
    ${ctaButton('Go to My Exams', EXAM_PORTAL_URL)}
    ${supportNote()}
  `;
  return shell({
    title: `Exam Submitted Successfully — ${data.subjectName}`,
    preheader: `We received your ${data.subjectName} submission.`,
    bodyInner,
  });
}

/** Subject lines, kept beside the renderers so triggers stay consistent. */
export const EXAM_EMAIL_SUBJECTS = {
  published: (examName: string): string => `Your Examination Schedule Has Been Published — ${examName}`,
  reminder24h: (subjectName: string): string => `Reminder: Your ${subjectName} Exam Is Scheduled for Tomorrow`,
  reminder1h: (subjectName: string): string => `Your Exam Begins in 1 Hour — ${subjectName}`,
  submitted: (subjectName: string): string => `Exam Submitted Successfully — ${subjectName}`,
};

/** Re-exported so callers can escape values for any ad-hoc HTML they add. */
export { esc };
