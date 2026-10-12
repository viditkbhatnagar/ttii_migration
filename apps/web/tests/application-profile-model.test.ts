import { describe, expect, test } from 'vitest';

import {
  allVerified,
  eventStage,
  formatDateOnly,
  parseSavedPlan,
  planTotals,
  readVerified,
  rowIsPaid,
  rowPaymentInfo,
  stageActions,
  stageSteps,
  toEvents,
} from '../src/admin/pages/applications/application-profile-model';

describe('stage actions (same rules as the old View page)', () => {
  const admin = { isAdmin: true };
  test('lead and payment stages', () => {
    expect(stageActions('lead', 'pending', admin)).toEqual(['generate_plan']);
    expect(stageActions('payment_pending', 'pending', admin)).toEqual(['resend_plan', 'mark_paid']);
    expect(stageActions('paid', 'pending', admin)).toEqual(['resend_plan', 'send_form_link']);
    expect(stageActions('form_pending', 'pending', admin)).toEqual(['resend_plan', 'resend_form_link']);
  });
  test('submitted, enrolled and rejected', () => {
    expect(stageActions('approval_waiting', 'pending', admin)).toEqual(['admin_approve', 'reject', 'download_pdf']);
    expect(stageActions('form_submitted', 'pending', { isAdmin: false })).toEqual(['download_pdf']);
    expect(stageActions('enrolled', 'pending', admin)).toEqual(['mark_approved', 'download_pdf']);
    expect(stageActions('enrolled', 'approved', admin)).toEqual(['download_pdf']);
    expect(stageActions('rejected', 'rejected', admin)).toEqual(['download_pdf']);
  });
});

describe('date-only values', () => {
  test('read from the digits, never shifted by the browser timezone', () => {
    expect(formatDateOnly('2026-09-01')).toBe('01/09/2026');
    expect(formatDateOnly('1988-02-10T00:00:00.000Z')).toBe('10/02/1988');
    expect(formatDateOnly('')).toBe('');
    expect(formatDateOnly(null)).toBe('');
    expect(formatDateOnly('Pending')).toBe('Pending');
  });
});

describe('verification gate', () => {
  test('every section and every document must be verified', () => {
    const v = readVerified({ verification: { verified: ['basic', 'qualification', 'documents', 'doc:0'] } });
    expect(allVerified(v, 1)).toBe(true);
    expect(allVerified(v, 2)).toBe(false);
    expect(allVerified(readVerified({ verification: null }), 0)).toBe(false);
  });
});

describe('saved payment plan', () => {
  const plan = parseSavedPlan(JSON.stringify({
    mode: 'installment',
    installments: [
      { label: 'Registration', amountMinor: 100000, gstPercent: 18 },
      { label: 'Balance', amount_minor: 500000, gst_percent: 0 },
    ],
    instalment_payments: [{ index: 1, status: 'approved', mode: 'upi', reference: 'R1', paid_date: '2026-10-02' }],
  }));

  test('totals come from the rows', () => {
    expect(planTotals(plan)).toEqual({ excl: 6000, gst: 180, total: 6180 });
    expect(parseSavedPlan('not json')).toBeNull();
    expect(parseSavedPlan('')).toBeNull();
  });

  test('a paid registration with no ledger row still shows Paid on row 0', () => {
    expect(rowIsPaid(plan, 'paid', 0)).toBe(true);
    expect(rowIsPaid(plan, 'sent', 0)).toBe(false);
    expect(rowIsPaid(plan, 'sent', 1)).toBe(true);
    expect(rowPaymentInfo(plan, 'sent', 1)).toEqual({ mode: 'upi', reference: 'R1', date: '2026-10-02', receipt: '' });
    expect(rowPaymentInfo(plan, 'paid', 0)).toEqual({ mode: '', reference: '', date: '', receipt: '' });
  });
});

describe('pipeline progress from events', () => {
  const events = toEvents([
    { event_type: 'rejected', description: 'Application rejected', created_at: '2026-10-04T05:00:00.000Z', actor_name: 'Risha', actor_role_label: 'Admin' },
    { event_type: 'payment_link_sent', created_at: '2026-10-02T05:00:00.000Z' },
    { event_type: 'payment_approved', created_at: '2026-10-03T05:00:00.000Z', metadata: '{"instalment_index":1}' },
    { event_type: 'lead_created', created_at: '2026-10-01T05:00:00.000Z' },
  ]);

  test('only registration approval counts as reaching Paid', () => {
    expect(events.map(eventStage)).toEqual(['rejected', 'payment_pending', '', 'lead']);
    expect(eventStage(toEvents([{ event_type: 'reopened', metadata: { stage: 'paid' } }])[0]!)).toBe('paid');
  });

  test('an active application: steps before it are done', () => {
    const steps = stageSteps('paid', events);
    expect(steps.map((s) => s.state)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming']);
    expect(steps[0]?.at).toBe('2026-10-01T05:00:00.000Z');
  });

  test('a rejected application ends at the furthest step reached, then Rejected', () => {
    const steps = stageSteps('rejected', events);
    expect(steps.map((s) => `${s.stage}:${s.state}`)).toEqual(['lead:done', 'payment_pending:done', 'rejected:current']);
    expect(steps[2]?.by).toBe('Risha (Admin)');
    expect(stageSteps('rejected', []).map((s) => s.stage)).toEqual(['lead', 'rejected']);
  });

  test('a legacy form_submitted application sits on the approval step under its own name', () => {
    const steps = stageSteps('form_submitted', []);
    expect(steps[4]).toMatchObject({ stage: 'form_submitted', label: 'Form Submitted', state: 'current' });
  });
});
