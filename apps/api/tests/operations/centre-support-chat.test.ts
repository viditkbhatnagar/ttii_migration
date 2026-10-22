import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { OperationsService } from '../../src/operations/operations-service.js';

// TTII 2026-10-22 — centre support messages were filed under the first Super
// Admin (chat_id = 1), so all centres shared one admin-owned thread and the
// admin's replies (chat_id = that thread) never reached the centre. A centre's
// conversation is now keyed by its own user id, like a student's.

interface Row { id: number; chat_id: number | null; sender_id: number | null; message: string; deleted_at: null }

function makeService(rows: Row[]) {
  const prisma = {
    support_chat: {
      create: ({ data }: { data: { chat_id: number | null; sender_id: number | null; message: string } }) => {
        const row: Row = { id: rows.length + 1, chat_id: data.chat_id, sender_id: data.sender_id, message: data.message, deleted_at: null };
        rows.push(row);
        return Promise.resolve(row);
      },
      findMany: ({ where }: { where: { OR: Array<{ chat_id?: number; sender_id?: number }> } }) => Promise.resolve(
        rows.filter((r) => where.OR.some((c) => (c.chat_id !== undefined && r.chat_id === c.chat_id) || (c.sender_id !== undefined && r.sender_id === c.sender_id))),
      ),
    },
    users: { findFirst: () => Promise.resolve({ id: 1 }) },
  } as unknown as PrismaClient;
  return new OperationsService(prisma);
}

describe('centre support chat', () => {
  test("a centre's message opens a thread owned by the centre, not by the first Super Admin", async () => {
    const rows: Row[] = [];
    const service = makeService(rows);
    const res = await service.submitCentreSupportMessage('168', 'Wallet top-up not credited');
    expect(res.status).toBe(1);
    expect(rows[0]).toMatchObject({ chat_id: 168, sender_id: 168 });
  });

  test("the admin's reply in that thread reaches the centre", async () => {
    const rows: Row[] = [];
    const service = makeService(rows);
    await service.submitCentreSupportMessage('168', 'Hello');
    rows.push({ id: 2, chat_id: 168, sender_id: 1, message: 'We have credited it', deleted_at: null });
    rows.push({ id: 3, chat_id: 182, sender_id: 1, message: 'Another centre', deleted_at: null });
    const seen = await service.getCentreSupportMessages('168');
    expect(seen.map((m) => (m as unknown as Row).message)).toEqual(['Hello', 'We have credited it']);
  });

  test('an empty message is refused', async () => {
    const rows: Row[] = [];
    expect((await makeService(rows).submitCentreSupportMessage('168', '   ')).status).toBe(0);
    expect(rows).toHaveLength(0);
  });
});
