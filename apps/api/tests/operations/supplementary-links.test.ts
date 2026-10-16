import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { linksForExams, supplementaryState } from '../../src/operations/supplementary-links.js';

// TTII 2026-10-16 (review) — reads of the supplementary link fail OPEN (lists
// and results load before the migration), but the WRITE decision fails
// CLOSED: publishing or saving Step 5 must never treat an unreadable link as
// "regular", or a supplementary exam's per-subject students get overwritten.

const missingTable = Object.assign(new Error('The table `exam_supplementary` does not exist in the current database.'), { code: 'P2021' });

function db(findMany: () => Promise<unknown[]>): PrismaClient {
  return { exam_supplementary: { findMany } } as unknown as PrismaClient;
}

describe('supplementaryState — for publish and Step 5', () => {
  test('a link row → supplementary; none → regular', async () => {
    expect(await supplementaryState(db(() => Promise.resolve([{ exam_id: 40, source_exam_id: 22, created_by: 1, created_at: null }])), 40)).toBe('supplementary');
    expect(await supplementaryState(db(() => Promise.resolve([])), 40)).toBe('regular');
  });

  test('a missing table or a client without the model is NOT SET UP, never regular', async () => {
    expect(await supplementaryState(db(() => Promise.reject(missingTable)), 40)).toBe('not_set_up');
    expect(await supplementaryState({} as unknown as PrismaClient, 40)).toBe('not_set_up');
  });

  test('any other read error is thrown, not swallowed', async () => {
    await expect(supplementaryState(db(() => Promise.reject(new Error('connection lost'))), 40)).rejects.toThrow('connection lost');
  });

  test('reads stay fail-open: no links before the migration', async () => {
    expect(await linksForExams(db(() => Promise.reject(missingTable)), [40])).toEqual([]);
    expect(await linksForExams({} as unknown as PrismaClient, [40])).toEqual([]);
  });
});
