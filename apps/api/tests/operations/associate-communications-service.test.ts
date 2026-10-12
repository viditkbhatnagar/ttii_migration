import { describe, expect, test, vi } from 'vitest';

import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import {
  AssociateCommunicationsService, COMM_EXPORT_CAP, COMM_MESSAGE_MAX, COMM_PAGE_SIZE, COMM_PAGE_SIZE_MAX, COMM_SUBJECT_MAX, CommunicationTableMissingError,
  CommunicationValidationError, isTableMissingError, validateCommunicationInput,
} from '../../src/operations/associate-communications-service.js';

// Associate Management → Communications: a manual log; nothing is ever sent.

const tableMissing = (): Prisma.PrismaClientKnownRequestError =>
  new Prisma.PrismaClientKnownRequestError('The table `associate_communications` does not exist.', { code: 'P2021', clientVersion: 'test' });

const VALID = { associate_id: '21', channel: 'Call', direction: 'Incoming', subject: ' Follow-up ', message: ' Asked about the PG batch. ' };

describe('validateCommunicationInput', () => {
  test('accepts a complete entry and trims text', () => {
    expect(validateCommunicationInput(VALID)).toEqual({
      ok: true,
      value: { associateId: 21, channel: 'Call', direction: 'Incoming', subject: 'Follow-up', message: 'Asked about the PG batch.' },
    });
  });

  test('rejects missing / unknown fields with one message per field', () => {
    const out = validateCommunicationInput({ associate_id: 'x', channel: 'SMS', direction: 'Sideways', subject: ' ', message: '' });
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(Object.keys(out.errors).sort()).toEqual(['associate_id', 'channel', 'direction', 'message', 'subject']);
  });

  test('enforces the length limits', () => {
    const long = validateCommunicationInput({ ...VALID, subject: 'a'.repeat(COMM_SUBJECT_MAX + 1), message: 'b'.repeat(COMM_MESSAGE_MAX + 1) });
    expect(long.ok).toBe(false);
    if (long.ok) return;
    expect(long.errors.subject).toMatch(/at most/);
    expect(long.errors.message).toMatch(/at most/);
  });

  test('accepts a numeric associate id from a JSON body', () => {
    expect(validateCommunicationInput({ ...VALID, associate_id: 21 }).ok).toBe(true);
  });
});

describe('isTableMissingError', () => {
  test('only Prisma P2021', () => {
    expect(isTableMissingError(tableMissing())).toBe(true);
    expect(isTableMissingError(new Error('P2021'))).toBe(false);
  });
});

function commPrisma(overrides: Record<string, unknown> = {}) {
  const findMany = vi.fn().mockResolvedValue([
    { id: 2, associate_id: 21, channel: 'Email', direction: 'Outgoing', subject: 'Docs', message: 'Sent list', created_by: 5, created_at: new Date('2026-10-11T05:00:00Z'), deleted_at: null },
    { id: 1, associate_id: 30, channel: 'Note', direction: 'Outgoing', subject: 'x', message: 'y', created_by: null, created_at: new Date('2026-10-10T05:00:00Z'), deleted_at: null },
  ]);
  const count = vi.fn().mockResolvedValue(27);
  const groupBy = vi.fn()
    .mockResolvedValueOnce([{ channel: 'Email', _count: { id: 20 } }, { channel: 'Note', _count: { id: 7 } }])
    .mockResolvedValueOnce([{ created_by: 5, _count: { id: 26 } }, { created_by: null, _count: { id: 1 } }]);
  const usersFind = vi.fn().mockImplementation((args: { where: { role_id?: number } }) =>
    Promise.resolve(args.where.role_id === 10 ? [{ id: 21 }] : [{ id: 21, name: 'Asha' }, { id: 5, name: 'Majida' }]));
  const prisma = { associate_communications: { findMany, count, groupBy, ...overrides }, users: { findMany: usersFind } } as unknown as PrismaClient;
  return { prisma, findMany, count, groupBy };
}

describe('AssociateCommunicationsService.list', () => {
  test('one page newest first, with total, channel counts, staff options and names', async () => {
    const { prisma, findMany } = commPrisma();
    const out = await new AssociateCommunicationsService(prisma).list({ page: 2 });
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { AND: [{ deleted_at: null }] }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], skip: COMM_PAGE_SIZE, take: COMM_PAGE_SIZE,
    });
    expect(out).toMatchObject({ total: 27, page: 2, pageSize: COMM_PAGE_SIZE, tableMissing: false });
    expect(out.counts).toEqual({ all: 27, Call: 0, WhatsApp: 0, Email: 20, Note: 7 });
    expect(out.staff).toEqual([{ id: 5, name: 'Majida' }]);
    expect(out.rows[0]).toMatchObject({ associateName: 'Asha', createdByName: 'Majida', createdAt: '2026-10-11T05:00:00.000Z' });
    expect(out.rows[1]).toMatchObject({ associateName: 'Associate #30', createdByName: '' });
  });

  test('filters run in the database; channel narrows the list but not the counts; page size capped', async () => {
    const { prisma, findMany, groupBy } = commPrisma();
    await new AssociateCommunicationsService(prisma).list({
      channel: 'Email', associateId: 21, direction: 'Incoming', createdBy: 5, month: '2026-10', search: 'asha', pageSize: 500,
    });
    const args = findMany.mock.calls[0]?.[0] as { where: { AND: unknown[] }; take: number };
    expect(args.take).toBe(COMM_PAGE_SIZE_MAX);
    expect(args.where.AND).toContainEqual({ channel: 'Email' });
    expect(args.where.AND).toContainEqual({ associate_id: 21 });
    expect(args.where.AND).toContainEqual({ direction: 'Incoming' });
    expect(args.where.AND).toContainEqual({ created_by: 5 });
    expect(args.where.AND).toContainEqual({ created_at: { gte: new Date('2026-09-30T18:30:00.000Z'), lt: new Date('2026-10-31T18:30:00.000Z') } });
    expect(args.where.AND).toContainEqual({ OR: [{ subject: { contains: 'asha' } }, { message: { contains: 'asha' } }, { associate_id: { in: [21] } }] });
    const countsWhere = (groupBy.mock.calls[0]?.[0] as { where: { AND: unknown[] } }).where.AND;
    expect(countsWhere).not.toContainEqual({ channel: 'Email' });
  });

  test('export takes every match up to the cap; unknown channel / direction are ignored', async () => {
    const { prisma, findMany } = commPrisma();
    await new AssociateCommunicationsService(prisma).list({ all: true, channel: 'SMS', direction: 'Up' });
    const args = findMany.mock.calls[0]?.[0] as { where: { AND: unknown[] }; take: number; skip: number };
    expect(args.take).toBe(COMM_EXPORT_CAP);
    expect(args.skip).toBe(0);
    expect(args.where.AND).toEqual([{ deleted_at: null }]);
  });

  test('table not created yet → empty list flagged tableMissing (no throw)', async () => {
    const { prisma } = commPrisma({ findMany: vi.fn().mockRejectedValue(tableMissing()) });
    const out = await new AssociateCommunicationsService(prisma).list();
    expect(out).toMatchObject({ rows: [], total: 0, tableMissing: true });
  });

  test('other errors still surface', async () => {
    const { prisma } = commPrisma({ findMany: vi.fn().mockRejectedValue(new Error('boom')) });
    await expect(new AssociateCommunicationsService(prisma).list()).rejects.toThrow('boom');
  });
});

describe('AssociateCommunicationsService.log', () => {
  test('records the entry for a live associate and stamps the actor', async () => {
    const create = vi.fn().mockResolvedValue({ id: 9 });
    const findFirst = vi.fn().mockResolvedValue({ id: 21 });
    const prisma = { users: { findFirst }, associate_communications: { create } } as unknown as PrismaClient;
    await expect(new AssociateCommunicationsService(prisma).log(5, VALID)).resolves.toEqual({ id: 9 });
    expect(findFirst.mock.calls[0]?.[0]).toMatchObject({ where: { id: 21, role_id: 10, deleted_at: null } });
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      data: { associate_id: 21, channel: 'Call', direction: 'Incoming', subject: 'Follow-up', message: 'Asked about the PG batch.', created_by: 5 },
    });
  });

  test('invalid input is refused before any read', async () => {
    const findFirst = vi.fn();
    const prisma = { users: { findFirst } } as unknown as PrismaClient;
    await expect(new AssociateCommunicationsService(prisma).log(5, { ...VALID, channel: 'SMS' })).rejects.toBeInstanceOf(CommunicationValidationError);
    expect(findFirst).not.toHaveBeenCalled();
  });

  test('a non-associate id is refused', async () => {
    const create = vi.fn();
    const prisma = { users: { findFirst: vi.fn().mockResolvedValue(null) }, associate_communications: { create } } as unknown as PrismaClient;
    await expect(new AssociateCommunicationsService(prisma).log(5, VALID)).rejects.toThrow('Associate not found.');
    expect(create).not.toHaveBeenCalled();
  });

  test('table not created yet → a clear refusal, not a 500', async () => {
    const prisma = {
      users: { findFirst: vi.fn().mockResolvedValue({ id: 21 }) },
      associate_communications: { create: vi.fn().mockRejectedValue(tableMissing()) },
    } as unknown as PrismaClient;
    await expect(new AssociateCommunicationsService(prisma).log(5, VALID)).rejects.toBeInstanceOf(CommunicationTableMissingError);
  });
});
