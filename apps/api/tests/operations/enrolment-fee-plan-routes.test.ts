import Fastify from 'fastify';
import { describe, expect, test } from 'vitest';

import { registerOperationsRoutes } from '../../src/routes/operations.js';
import type { EnrolmentFeePlanService, SaveEnrolmentPlanInput } from '../../src/operations/enrolment-fee-plan-service.js';

// The per-enrolment plan routes write the fee ledger, so they carry the same
// guard as /admin/student-payments/*: Admin (1) and Subadmin (8) only.
// Counsellors (9) can reach most /admin/* data routes, but not these.

const USERS: Record<string, { id: number; role_id: number }> = {
  admin: { id: 1, role_id: 1 },
  subadmin: { id: 8, role_id: 8 },
  counsellor: { id: 10, role_id: 9 },
  student: { id: 228, role_id: 2 },
};

function makeApp() {
  const calls: Array<{ kind: 'get'; enrolId: string } | { kind: 'save'; actor: string; input: SaveEnrolmentPlanInput }> = [];
  const authService = {
    authenticateAuthToken: (token: string) => {
      const user = USERS[token];
      return Promise.resolve(user ? { user: { ...user, name: token } } : null);
    },
    logAuthDenied: () => Promise.resolve(),
    logRbacDenied: () => Promise.resolve(),
  };
  const enrolmentFeePlanService = {
    getPlan: (enrolId: string) => {
      calls.push({ kind: 'get', enrolId });
      return Promise.resolve({ status: 1, message: 'success', data: { enrol_id: Number(enrolId) } });
    },
    savePlan: (actor: string, input: SaveEnrolmentPlanInput) => {
      calls.push({ kind: 'save', actor, input });
      return Promise.resolve({ status: 1, message: 'Payment plan saved.' });
    },
  } as unknown as EnrolmentFeePlanService;
  const app = Fastify({ logger: false });
  registerOperationsRoutes(app, { authService: authService as never, enrolmentFeePlanService });
  return { app, calls };
}

const SAVE_BODY = {
  enrol_id: '253',
  mode: 'installment',
  total_fee: '20000',
  discount: '2000',
  gst_percent: '0',
  installments: [
    { label: 'Installment 1', amount: 9000, due_date: '2026-11-10' },
    { label: 'Installment 2', amount: '9000', due_date: '2026-12-10' },
    'not-an-object',
  ],
};

describe('per-enrolment plan routes', () => {
  test('counsellors and students are refused; nothing reaches the service', async () => {
    const { app, calls } = makeApp();
    for (const token of ['counsellor', 'student']) {
      const get = await app.inject({ method: 'GET', url: `/admin/students/enrolment-fee-plan?enrol_id=253&auth_token=${token}` });
      expect(get.statusCode).toBe(403);
      const save = await app.inject({ method: 'POST', url: '/admin/students/enrolment-fee-plan/save', payload: { ...SAVE_BODY, auth_token: token } });
      expect(save.statusCode).toBe(403);
    }
    const anonymous = await app.inject({ method: 'GET', url: '/admin/students/enrolment-fee-plan?enrol_id=253' });
    expect(anonymous.statusCode).toBe(401);
    expect(calls).toEqual([]);
    await app.close();
  });

  test('admin and subadmin read the plan by enrolment id', async () => {
    const { app, calls } = makeApp();
    for (const token of ['admin', 'subadmin']) {
      const res = await app.inject({ method: 'GET', url: `/admin/students/enrolment-fee-plan?enrol_id=253&auth_token=${token}` });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({ status: 1, data: { enrol_id: 253 } });
    }
    expect(calls).toEqual([{ kind: 'get', enrolId: '253' }, { kind: 'get', enrolId: '253' }]);
    await app.close();
  });

  test('save passes the acting admin and the parsed plan to the service', async () => {
    const { app, calls } = makeApp();
    const res = await app.inject({ method: 'POST', url: '/admin/students/enrolment-fee-plan/save', payload: { ...SAVE_BODY, auth_token: 'subadmin' } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 1, message: 'Payment plan saved.' });
    expect(calls).toEqual([{
      kind: 'save',
      actor: '8',
      input: {
        enrolId: '253',
        plan: {
          mode: 'installment',
          totalFee: 20000,
          discount: 2000,
          gstPercent: 0,
          rows: [
            { label: 'Installment 1', amount: 9000, dueDate: '2026-11-10' },
            { label: 'Installment 2', amount: 9000, dueDate: '2026-12-10' },
          ],
        },
      },
    }]);
    await app.close();
  });

  test('an unknown mode is refused before the service is called', async () => {
    const { app, calls } = makeApp();
    const res = await app.inject({ method: 'POST', url: '/admin/students/enrolment-fee-plan/save', payload: { ...SAVE_BODY, mode: 'weekly', auth_token: 'admin' } });
    expect(res.json()).toEqual({ status: 0, message: 'Choose full payment or instalments.' });
    expect(calls).toEqual([]);
    await app.close();
  });
});
