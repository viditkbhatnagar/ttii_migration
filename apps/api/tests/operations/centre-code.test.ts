import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import {
  centreCodeNumber, formatCentreCode, isCentreCodeTaken, nextCentreCode, nextCentreCodeFrom, sameCentreCode,
} from '../../src/operations/centre-code.js';

// Production holds the legacy "TTC0001" and the plain numbers addCentre wrote
// before 2026-10-22 ("28", "30", "31"). New codes are TTC#### one past the
// highest number in any of them.

const PROD_CODES = ['TTC0001', '28', '30', '31'];

describe('centre codes', () => {
  test('reads the number out of every shape in use', () => {
    expect(centreCodeNumber('TTC0001')).toBe(1);
    expect(centreCodeNumber('31')).toBe(31);
    expect(centreCodeNumber(' ttc0032 ')).toBe(32);
    expect(centreCodeNumber('')).toBe(0);
    expect(centreCodeNumber(null)).toBe(0);
    expect(centreCodeNumber('TTC')).toBe(0);
  });

  test('the next code follows the highest number, padded to four digits', () => {
    expect(nextCentreCodeFrom(PROD_CODES)).toBe('TTC0032');
    expect(nextCentreCodeFrom([])).toBe('TTC0001');
    expect(formatCentreCode(12345)).toBe('TTC12345');
  });

  test('codes compare by number, so an old numeric code blocks its TTC twin', () => {
    expect(sameCentreCode('31', 'TTC0031')).toBe(true);
    expect(sameCentreCode('ttc32', 'TTC0032')).toBe(true);
    expect(sameCentreCode('TTC0031', 'TTC0032')).toBe(false);
  });

  function fakeDb(codes: string[], reserved: Array<string | null>, onboardingMigrated = true) {
    return {
      centres: { findMany: () => Promise.resolve(codes.map((centre_id, i) => ({ id: i + 1, centre_id }))) },
      centre_onboarding: {
        findMany: () => (onboardingMigrated
          ? Promise.resolve(reserved.map((centre_code, i) => ({ id: i + 1, centre_code })))
          : Promise.reject(Object.assign(new Error('missing table'), { code: 'P2021' }))),
      },
    } as unknown as PrismaClient;
  }

  test('codes reserved by onboarding count as used', async () => {
    expect(await nextCentreCode(fakeDb(PROD_CODES, ['TTC0032']))).toBe('TTC0033');
    expect(await isCentreCodeTaken(fakeDb(PROD_CODES, ['TTC0032']), 'ttc32')).toBe(true);
    expect(await isCentreCodeTaken(fakeDb(PROD_CODES, ['TTC0032']), 'TTC0031')).toBe(true);
    expect(await isCentreCodeTaken(fakeDb(PROD_CODES, ['TTC0032']), 'TTC0040')).toBe(false);
  });

  test('a record does not clash with its own code', async () => {
    expect(await isCentreCodeTaken(fakeDb(PROD_CODES, ['TTC0032']), 'TTC0032', { onboardingId: 1 })).toBe(false);
    expect(await isCentreCodeTaken(fakeDb(PROD_CODES, []), '31', { centreId: 4 })).toBe(false);
  });

  test('before the onboarding table exists, only centres are consulted', async () => {
    expect(await nextCentreCode(fakeDb(PROD_CODES, [], false))).toBe('TTC0032');
    expect(await isCentreCodeTaken(fakeDb(PROD_CODES, [], false), 'TTC0099')).toBe(false);
  });
});
