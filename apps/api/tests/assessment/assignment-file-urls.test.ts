import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { AssessmentService } from '../../src/assessment/assessment-service.js';

// TTII 2026-10-03 — "Students are unable to view or download assignment
// question." ASG-65 (due 10 Oct) stores its question as the relative legacy
// path uploads/assignment/202605/1779416158_….pdf, which lives on the PHP host
// lms.teachersindia.in. The student mapper prefixed it with APP_BASE_URL, and
// in production that is https://api.teachersindia.in — a host with no DNS
// record — so View and Download both ended on DNS_PROBE_FINISHED_NXDOMAIN, on
// the web portal and in the app alike (both read toAssignmentData).

function makeService(): AssessmentService {
  const prisma = {
    saved_assignments: { count: () => Promise.resolve(0) },
    assignment_submissions: {
      count: () => Promise.resolve(1),
      findFirst: () => Promise.resolve({
        assignment_files: JSON.stringify([
          'uploads/assignment_submissions/202605/answer.pdf',
          'https://ttii-lms-recordings.sgp1.cdn.digitaloceanspaces.com/public/assignment-submissions/7-65-1.pdf',
        ]),
        marks: null,
        remarks: null,
        created_at: new Date('2026-10-03T05:00:00Z'),
        verified_at: null,
      }),
    },
  } as unknown as PrismaClient;
  return new AssessmentService({ prisma, integrations: { email: { sendEmail: () => Promise.resolve() } } as never });
}

function toAssignmentData(service: AssessmentService, file: string): Promise<Record<string, unknown>> {
  return (service as unknown as {
    toAssignmentData: (a: Record<string, unknown>, u: string) => Promise<Record<string, unknown>>;
  }).toAssignmentData({ id: 65, title: 'Communicative English in Teaching', description: '', total_marks: 30, file, due_date: new Date('2026-10-10') }, '412');
}

describe('assignment question and submission links', () => {
  test('a legacy relative upload resolves on lms.teachersindia.in, never the dead api host', async () => {
    const data = await toAssignmentData(makeService(), 'uploads/assignment/202605/1779416158_8e96ea8efe09e32e29ed.pdf');
    expect(data.file).toBe('https://lms.teachersindia.in/uploads/assignment/202605/1779416158_8e96ea8efe09e32e29ed.pdf');
  });

  test('a stale absolute api.teachersindia.in URL is rewritten', async () => {
    const data = await toAssignmentData(makeService(), 'https://api.teachersindia.in/uploads/assignment/x.pdf');
    expect(data.file).toBe('https://lms.teachersindia.in/uploads/assignment/x.pdf');
  });

  test('a Spaces upload from the new admin is left exactly as stored', async () => {
    const url = 'https://ttii-lms-recordings.sgp1.cdn.digitaloceanspaces.com/public/uploads/1790913652345-svuuxhdhvun.pdf';
    const data = await toAssignmentData(makeService(), url);
    expect(data.file).toBe(url);
  });

  test('submitted answer files resolve the same way', async () => {
    const data = await toAssignmentData(makeService(), '');
    const files = (data.submitted_file as Array<{ file: string }>).map((f) => f.file);
    expect(files).toEqual([
      'https://lms.teachersindia.in/uploads/assignment_submissions/202605/answer.pdf',
      'https://ttii-lms-recordings.sgp1.cdn.digitaloceanspaces.com/public/assignment-submissions/7-65-1.pdf',
    ]);
    expect(data.file).toBe(''); // no question file -> empty, not a bare host
  });
});
