import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { AuthService } from '../../src/auth/auth-service.js';
import type { ReExamService } from '../../src/operations/re-exam-service.js';
import type { SupplementaryExamService } from '../../src/operations/supplementary-exam-service.js';
import { toIdArray } from '../../src/routes/id-array.js';
import { registerOperationsRoutes } from '../../src/routes/operations.js';

// TTII 2026-10-16 — the admin portal sends user_ids as JSON NUMBERS. The route
// helper toStringArray kept strings only, so /admin/re_exams/schedule turned
// [174, 152] into [] and refused every re-exam from the portal with "Select at
// least one student." These pin both id-list routes at the HTTP layer.

describe('toIdArray', () => {
  test('numbers and digit-only strings, positive, deduped, in order', () => {
    expect(toIdArray([174, '152', 174, ' 9 '])).toEqual([174, 152, 9]);
  });

  test('drops anything that is not a positive whole id', () => {
    expect(toIdArray([0, -1, 2.5, '1.5', '12abc', '', null, undefined, {}, Number.NaN, 2 ** 60])).toEqual([]);
  });

  test('a JSON-encoded array, a comma list or one id from form-encoded callers', () => {
    expect(toIdArray('[3, "4"]')).toEqual([3, 4]);
    expect(toIdArray('5,6')).toEqual([5, 6]);
    expect(toIdArray(7)).toEqual([7]);
    expect(toIdArray('[not json')).toEqual([]);
    expect(toIdArray(undefined)).toEqual([]);
  });
});

const ADMIN = 'admin-token';
const COUNSELLOR = 'counsellor-token';
let app: FastifyInstance | null = null;

afterEach(async () => {
  await app?.close();
  app = null;
});

async function build() {
  const auth = {
    authenticateAuthToken: (token: string) => Promise.resolve(
      token === ADMIN ? { user: { id: 7, role_id: 1 } } : token === COUNSELLOR ? { user: { id: 8, role_id: 9 } } : null,
    ),
    logAuthDenied: () => Promise.resolve(),
    logRbacDenied: () => Promise.resolve(),
  } as unknown as AuthService;
  const schedule = vi.fn((_actor: number | null, _input: { userIds: number[] }) => Promise.resolve({ status: 1 as const, message: 'ok' }));
  const create = vi.fn((_actor: number | null, _input: { subjects: Array<{ userIds: number[] }> }) => Promise.resolve({ status: 1 as const, message: 'ok' }));
  app = Fastify();
  registerOperationsRoutes(app, {
    authService: auth,
    reExamService: { schedule } as unknown as ReExamService,
    supplementaryExamService: { create } as unknown as SupplementaryExamService,
  });
  await app.ready();
  return { app, schedule, create };
}

const reExamBody = (userIds: unknown) => ({ exam_id: 24, user_ids: userIds, date: '2026-10-28', start_time: '19:30', end_time: '20:45' });
const supplementaryBody = (userIds: unknown) => ({
  source_exam_id: 22,
  title: 'Supplementary',
  subjects: [{ sitting_exam_id: 25, date: '2026-10-28', start_time: '19:30', end_time: '20:45', duration_minutes: 75, total_marks: 70, pass_marks: 25, user_ids: userIds }],
});

describe('POST /admin/re_exams/schedule', () => {
  test.each([
    ['numbers, as the portal sends them', [174, 152]],
    ['numeric strings', ['174', '152']],
  ])('reads user_ids given as %s', async (_label, userIds) => {
    const { app: server, schedule } = await build();
    const res = await server.inject({ method: 'POST', url: '/admin/re_exams/schedule', headers: { authorization: `Bearer ${ADMIN}` }, payload: reExamBody(userIds) });
    expect(res.statusCode).toBe(200);
    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule.mock.calls[0]?.[0]).toBe(7);
    expect(schedule.mock.calls[0]?.[1]).toMatchObject({ examId: 24, userIds: [174, 152], date: '2026-10-28', startTime: '19:30', endTime: '20:45' });
  });

  test('stays admin-only', async () => {
    const { app: server, schedule } = await build();
    const res = await server.inject({ method: 'POST', url: '/admin/re_exams/schedule', headers: { authorization: `Bearer ${COUNSELLOR}` }, payload: reExamBody([174]) });
    expect(res.statusCode).toBe(403);
    expect(schedule).not.toHaveBeenCalled();
  });
});

describe('POST /admin/exam_supplementary/create', () => {
  test.each([
    ['numbers, as the portal sends them', [101, 102]],
    ['numeric strings', ['101', '102']],
  ])('reads each subject\'s user_ids given as %s', async (_label, userIds) => {
    const { app: server, create } = await build();
    const res = await server.inject({ method: 'POST', url: '/admin/exam_supplementary/create', headers: { authorization: `Bearer ${ADMIN}` }, payload: supplementaryBody(userIds) });
    expect(res.statusCode).toBe(200);
    expect(create.mock.calls[0]?.[1]).toMatchObject({
      sourceExamId: 22,
      title: 'Supplementary',
      subjects: [{ sittingExamId: 25, date: '2026-10-28', startTime: '19:30', endTime: '20:45', durationMinutes: 75, totalMarks: 70, passMarks: 25, userIds: [101, 102] }],
    });
  });

  test('a fractional paper length is passed through for the service to refuse, never rounded', async () => {
    const { app: server, create } = await build();
    const body = supplementaryBody([101]);
    await server.inject({ method: 'POST', url: '/admin/exam_supplementary/create', headers: { authorization: `Bearer ${ADMIN}` }, payload: { ...body, subjects: [{ ...body.subjects[0], duration_minutes: 74.5 }] } });
    expect(create.mock.calls[0]?.[1].subjects[0]).toMatchObject({ durationMinutes: 74.5 });
  });

  test('stays admin-only', async () => {
    const { app: server, create } = await build();
    const res = await server.inject({ method: 'POST', url: '/admin/exam_supplementary/create', headers: { authorization: `Bearer ${COUNSELLOR}` }, payload: supplementaryBody([101]) });
    expect(res.statusCode).toBe(403);
    expect(create).not.toHaveBeenCalled();
  });
});
