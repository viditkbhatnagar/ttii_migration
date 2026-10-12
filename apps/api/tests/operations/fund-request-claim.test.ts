import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { OperationsService } from '../../src/operations/operations-service.js';

// TTII 2026-10-12 — approving a centre fund request credits the wallet. The
// status check sat outside the transaction, so a double click (or two admins)
// credited twice. Approve and reject now CLAIM the pending row first.

interface FundRow { id: number; centre_id: number; amount: string; status: string; deleted_at: Date | null }

function makeWorld(opts: { loseClaim?: boolean; casLosses?: number } = {}) {
  const requests: FundRow[] = [{ id: 7, centre_id: 28, amount: '25000', status: 'pending', deleted_at: null }];
  const centre = { id: 28, wallet_balance: '50000' };
  const credits: Array<Record<string, unknown>> = [];
  let claims = 0;
  let casLossesLeft = opts.casLosses ?? 0;
  let casAttempts = 0;

  const fund = {
    // A snapshot, like a real read: a later write by someone else does not change it.
    findFirst: ({ where }: { where: { id: number } }) => {
      const row = requests.find((r) => r.id === where.id && !r.deleted_at);
      return Promise.resolve(row ? { ...row } : null);
    },
    updateMany: ({ where, data }: { where: { id: number; status: string }; data: { status: string } }) => {
      claims += 1;
      const row = requests.find((r) => r.id === where.id && r.status === where.status && !r.deleted_at);
      // `loseClaim`: a concurrent approval committed between our read and our claim.
      if (opts.loseClaim && row) {
        row.status = 'approved';
        return Promise.resolve({ count: 0 });
      }
      if (!row) return Promise.resolve({ count: 0 });
      row.status = data.status;
      return Promise.resolve({ count: 1 });
    },
  };
  const tx = {
    centre_fund_requests: fund,
    wallet_transactions: { create: ({ data }: { data: Record<string, unknown> }) => { credits.push(data); return Promise.resolve({ id: credits.length }); } },
    centres: {
      findFirst: () => Promise.resolve({ ...centre }),
      updateMany: ({ where, data }: { where: { id: number; wallet_balance?: string | null }; data: { wallet_balance?: string } }) => {
        if (where.id !== centre.id) return Promise.resolve({ count: 0 });
        if (!('wallet_balance' in where)) return Promise.resolve({ count: 1 }); // the row-lock touch
        casAttempts += 1;
        // `casLosses`: another approval credits 1,000 between our read and our swap.
        if (casLossesLeft > 0) {
          casLossesLeft -= 1;
          centre.wallet_balance = String(Number(centre.wallet_balance) + 1000);
          return Promise.resolve({ count: 0 });
        }
        if (centre.wallet_balance !== where.wallet_balance) return Promise.resolve({ count: 0 });
        centre.wallet_balance = data.wallet_balance ?? centre.wallet_balance;
        return Promise.resolve({ count: 1 });
      },
    },
  };
  const prisma = {
    ...tx,
    // Rolls the request and the credits back when the callback throws, like a real transaction.
    $transaction: async <T>(fn: (t: typeof tx) => Promise<T>) => {
      const saved = { requests: requests.map((r) => ({ ...r })), credits: credits.length };
      try {
        return await fn(tx);
      } catch (err) {
        requests.splice(0, requests.length, ...saved.requests);
        credits.length = saved.credits;
        throw err;
      }
    },
  } as unknown as PrismaClient;

  return { service: new OperationsService(prisma), requests, centre, credits, claimCount: () => claims, casAttempts: () => casAttempts };
}

describe('fund request approve / reject are claim-first', () => {
  test('approve credits the wallet once and flips the request', async () => {
    const w = makeWorld();
    const res = await w.service.approveFundRequest('1', '7');
    expect(res).toEqual({ status: 1, message: 'Fund request approved and wallet credited.' });
    expect(w.requests[0]?.status).toBe('approved');
    expect(w.credits).toHaveLength(1);
    expect(w.credits[0]).toMatchObject({ centre_id: 28, transaction_type: 'credit', amount: '25000' });
    expect(w.centre.wallet_balance).toBe('75000');
  });

  test('a sequential duplicate approval is refused without a second credit', async () => {
    const w = makeWorld();
    await w.service.approveFundRequest('1', '7');
    const again = await w.service.approveFundRequest('1', '7');
    expect(again).toEqual({ status: 0, message: 'Fund request is already approved' });
    expect(w.credits).toHaveLength(1);
    expect(w.centre.wallet_balance).toBe('75000');
  });

  test('losing the claim race credits nothing (the concurrent approval already did)', async () => {
    const w = makeWorld({ loseClaim: true });
    const res = await w.service.approveFundRequest('1', '7');
    expect(res).toEqual({ status: 0, message: 'Fund request is already approved' });
    expect(w.claimCount()).toBe(1);
    expect(w.credits).toHaveLength(0);
    expect(w.centre.wallet_balance).toBe('50000');
  });

  test('two concurrent approvals credit exactly once', async () => {
    const w = makeWorld();
    const results = await Promise.all([w.service.approveFundRequest('1', '7'), w.service.approveFundRequest('2', '7')]);
    expect(results.map((r) => r.status).sort()).toEqual([0, 1]);
    expect(w.claimCount()).toBe(2); // both passed the up-front check; the claim decided
    expect(w.credits).toHaveLength(1);
    expect(w.centre.wallet_balance).toBe('75000');
  });

  test('reject after approve is refused and does not flip the status back', async () => {
    const w = makeWorld();
    await w.service.approveFundRequest('1', '7');
    const res = await w.service.rejectFundRequest('1', '7');
    expect(res).toEqual({ status: 0, message: 'Fund request is already approved' });
    expect(w.requests[0]?.status).toBe('approved');
  });

  test('reject losing the claim race reports the winner', async () => {
    const w = makeWorld({ loseClaim: true });
    const res = await w.service.rejectFundRequest('1', '7');
    expect(res).toEqual({ status: 0, message: 'Fund request is already approved' });
  });

  test('a pending request rejects normally', async () => {
    const w = makeWorld();
    expect(await w.service.rejectFundRequest('1', '7')).toEqual({ status: 1, message: 'Fund request rejected.' });
    expect(w.requests[0]?.status).toBe('rejected');
  });

  test('a lost wallet compare-and-swap re-reads and credits on top of the other credit', async () => {
    const w = makeWorld({ casLosses: 1 });
    const res = await w.service.approveFundRequest('1', '7');
    expect(res).toEqual({ status: 1, message: 'Fund request approved and wallet credited.' });
    expect(w.casAttempts()).toBe(2);
    // 50,000 + the concurrent 1,000 + this request's 25,000 — nothing lost.
    expect(w.centre.wallet_balance).toBe('76000');
    expect(w.credits).toHaveLength(1);
  });

  test('gives up after five lost swaps and rolls the whole approval back', async () => {
    const w = makeWorld({ casLosses: 5 });
    await expect(w.service.approveFundRequest('1', '7')).rejects.toThrow('Please try again.');
    expect(w.casAttempts()).toBe(5);
    expect(w.requests[0]?.status).toBe('pending');
    expect(w.credits).toHaveLength(0);
    expect(w.centre.wallet_balance).toBe('55000'); // only the other approvals' credits
  });
});
