import { describe, expect, test, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

// Payment Approval double-click / two-finance-users race (TTII 2026-10-12).
// approveManualPayment and rejectManualPayment read the ledger from
// applications.payment_plan, check the entry is pending, then write. Two
// requests that both read "pending" used to both write: the registration
// approval fired the payment_received (enrolment) notification twice, and a
// reject racing an approve could overwrite the approval. The write is now a
// guarded updateMany on the exact plan + status that was read (claim-first),
// so the loser writes nothing and returns the existing "not awaiting" message.

const { OperationsService } = await import('../../src/operations/operations-service.js');

const APP_ID = 77;
const NOT_AWAITING = 'This payment is not awaiting approval.';

function pendingPlan(): string {
  return JSON.stringify({
    installments: [{ label: 'Registration Fee', amountMinor: 299900 }],
    instalment_payments: [
      { index: 0, mode: 'UPI', reference: 'UTR1', receipt_url: '', note: '', amount_minor: 299900, paid_date: '2026-10-01', marked_at: '2026-10-01T10:00:00.000Z', marked_by: 9, status: 'pending_approval' },
    ],
  });
}

interface AppRow { id: number; deleted_at: null; stage: string; is_converted: number; payment_status: string | null; payment_plan: string | null }

function makeService() {
  const row: AppRow = { id: APP_ID, deleted_at: null, stage: 'payment_pending', is_converted: 0, payment_status: 'pending_approval', payment_plan: pendingPlan() };
  const writes: Array<Record<string, unknown>> = [];
  const prisma = {
    applications: {
      findFirst: () => Promise.resolve({ ...row }),
      // Atomic compare-and-set, like one UPDATE ... WHERE under the row lock.
      updateMany: ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const matches = Object.entries(where).every(([k, v]) => (row as unknown as Record<string, unknown>)[k] === v);
        if (!matches) return Promise.resolve({ count: 0 });
        Object.assign(row, data);
        writes.push(data);
        return Promise.resolve({ count: 1 });
      },
      update: () => { throw new Error('unguarded update must not be used'); },
    },
  } as unknown as PrismaClient;
  const service = new OperationsService(prisma);
  const recordEvent = vi.spyOn(service, 'recordEvent').mockResolvedValue();
  const notify = vi
    .spyOn(service as unknown as { notifyApplicationEvent: () => Promise<void> }, 'notifyApplicationEvent')
    .mockResolvedValue();
  return { service, row, writes, recordEvent, notify };
}

describe('Payment Approval claim-first', () => {
  test('approve writes once; a second sequential approve is refused without writing', async () => {
    const { service, row, writes, recordEvent, notify } = makeService();
    expect(await service.approveManualPayment('1', String(APP_ID))).toEqual({ status: 1, message: 'Payment approved.' });
    expect(row.payment_status).toBe('paid');
    expect(await service.approveManualPayment('1', String(APP_ID))).toEqual({ status: 0, message: NOT_AWAITING });
    expect(writes).toHaveLength(1);
    expect(recordEvent).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  test('two concurrent approves: exactly one writes and notifies', async () => {
    const { service, writes, recordEvent, notify } = makeService();
    const results = await Promise.all([
      service.approveManualPayment('1', String(APP_ID)),
      service.approveManualPayment('2', String(APP_ID)),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([0, 1]);
    expect(results.find((r) => r.status === 0)?.message).toBe(NOT_AWAITING);
    expect(writes).toHaveLength(1);
    expect(recordEvent).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  test('a reject racing an approve cannot overwrite the decision', async () => {
    const { service, row, writes } = makeService();
    const [approved, rejected] = await Promise.all([
      service.approveManualPayment('1', String(APP_ID)),
      service.rejectManualPayment('2', String(APP_ID), 'late'),
    ]);
    expect(approved.status).toBe(1);
    expect(rejected).toEqual({ status: 0, message: NOT_AWAITING });
    expect(writes).toHaveLength(1);
    expect(row.payment_status).toBe('paid');
  });

  test('reject still works alone and is refused the second time', async () => {
    const { service, row, writes } = makeService();
    expect(await service.rejectManualPayment('1', String(APP_ID), '')).toEqual({ status: 1, message: 'Payment rejected.' });
    expect(row.payment_status).toBe('payment_rejected');
    expect(await service.rejectManualPayment('1', String(APP_ID), '')).toEqual({ status: 0, message: NOT_AWAITING });
    expect(writes).toHaveLength(1);
  });
});
