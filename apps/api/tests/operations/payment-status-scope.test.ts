import { describe, expect, test, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { OperationsService } from '../../src/operations/operations-service.js';

// listPaymentStatus's optional scope (Centres v2 Application Payments): only
// the given students' student_payments and the given applications' plans are
// read. Without a scope the query is exactly the old whole-ledger read.

interface SqlLike { strings?: readonly string[]; values?: unknown[] }

function fakePrisma(rows: unknown[] = []) {
  const $queryRaw = vi.fn().mockResolvedValue(rows);
  const appsFindMany = vi.fn().mockResolvedValue([]);
  const prisma = {
    $queryRaw,
    users: { findMany: vi.fn().mockResolvedValue([]) },
    course: { findMany: vi.fn().mockResolvedValue([]) },
    enrol: { findMany: vi.fn().mockResolvedValue([]) },
    applications: { findMany: appsFindMany },
  } as unknown as PrismaClient;
  return { prisma, $queryRaw, appsFindMany };
}

/** Every bound value of a tagged-template $queryRaw call, nested Prisma.sql / Prisma.join included. */
function boundValues(call: unknown[]): unknown[] {
  const flat = (v: unknown): unknown[] => {
    const sql = v as SqlLike;
    return v && typeof v === 'object' && Array.isArray(sql.values) && sql.strings ? sql.values.flatMap(flat) : [v];
  };
  return call.slice(1).flatMap(flat);
}

describe('listPaymentStatus scope', () => {
  test('a scope narrows student_payments to the users and the plans to the applications', async () => {
    const { prisma, $queryRaw, appsFindMany } = fakePrisma();
    await new OperationsService(prisma).listPaymentStatus({ scope: { userIds: [501, 502, 501, 0], applicationIds: [101] } });
    expect($queryRaw).toHaveBeenCalledTimes(1);
    const call = $queryRaw.mock.calls[0] as unknown[];
    expect((call[0] as string[]).join('?')).toContain('user_id IN (');
    expect(boundValues(call)).toEqual([501, 502]);
    expect(appsFindMany.mock.calls[0]?.[0]).toMatchObject({ where: { is_converted: 0, deleted_at: null, id: { in: [101] } } });
  });

  test('an empty scope reads nothing', async () => {
    const { prisma, $queryRaw, appsFindMany } = fakePrisma();
    const out = await new OperationsService(prisma).listPaymentStatus({ scope: { userIds: [], applicationIds: [] } });
    expect($queryRaw).not.toHaveBeenCalled();
    expect(appsFindMany).not.toHaveBeenCalled();
    expect(out).toMatchObject({ installments: [] });
  });

  test('without a scope the read is the whole ledger, as before', async () => {
    const { prisma, $queryRaw, appsFindMany } = fakePrisma();
    await new OperationsService(prisma).listPaymentStatus({});
    const call = $queryRaw.mock.calls[0] as unknown[];
    expect((call[0] as string[]).join('?')).not.toContain('user_id IN');
    expect(boundValues(call)).toEqual([]);
    expect(appsFindMany.mock.calls[0]?.[0]).not.toHaveProperty('where.id');
  });
});
