import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { ContentService } from '../../src/content/content-service.js';

// Naji/Risha 2026-08-29 — "Students are unable to open the videos, as they are
// showing as locked... we tried to see if it is subject based or lesson based,
// such an option is not been shown anywhere."
//
// Only the first lesson of a subject was open and the rest padlocked. With no
// cohort covering that subject the code fell through to sequential gating
// (finish lesson 1 to open lesson 2). Every offering HAS a Content Release
// Strategy dropdown — Full / Cohort Based / Subject Based — and it was written
// to `offerings` and read by nothing. Production had the live July and
// September 2026 Montessori intakes set to "Full (all at once)" while their
// students were still gated.
//
// A learner reaches their offering only via users.application_id ->
// applications.offering_id: `enrol` has no offering_id and
// offerings.legacy_batch_id is unused. These lock that chain down, because if
// it breaks the strategy silently reverts to gating everyone again.

const USER_ID = 137;
const APPLICATION_ID = 241;
const OFFERING_ID = 22;
const COURSE_ID = 16;

interface Stub {
  strategy?: string | null;
  applicationId?: number | null;
  offeringId?: number | null;
  applicationCourseId?: number | null;
}

function makeService(stub: Stub = {}): ContentService {
  const prisma = {
    users: {
      findFirst: () => Promise.resolve({
        application_id: stub.applicationId === undefined ? APPLICATION_ID : stub.applicationId,
      }),
    },
    applications: {
      findFirst: () => Promise.resolve({
        offering_id: stub.offeringId === undefined ? OFFERING_ID : stub.offeringId,
        course_id: stub.applicationCourseId === undefined ? COURSE_ID : stub.applicationCourseId,
      }),
    },
    offerings: {
      findFirst: () => Promise.resolve({
        content_release_strategy: stub.strategy === undefined ? 'full' : stub.strategy,
      }),
    },
  } as unknown as PrismaClient;

  return new ContentService(prisma);
}

/** The resolver is private; exercise it the way the gates do. */
function resolve(service: ContentService, courseId = String(COURSE_ID)): Promise<string> {
  return (service as unknown as {
    resolveContentReleaseStrategy: (u: string, c: string) => Promise<string>;
  }).resolveContentReleaseStrategy(String(USER_ID), courseId);
}

describe('content release strategy', () => {
  test('reads "full" from the offering the learner belongs to', async () => {
    // The July / September 2026 intakes. This is the case that was being
    // ignored while students stared at padlocks.
    expect(await resolve(makeService({ strategy: 'full' }))).toBe('full');
  });

  test('reads "subject" and "cohort" as set', async () => {
    expect(await resolve(makeService({ strategy: 'subject' }))).toBe('subject');
    expect(await resolve(makeService({ strategy: 'cohort' }))).toBe('cohort');
  });

  test('defaults to cohort gating when the learner has no application', async () => {
    // Must never accidentally GRANT access — an unresolvable learner keeps
    // exactly the behaviour they have today.
    expect(await resolve(makeService({ applicationId: null }))).toBe('cohort');
  });

  test('defaults to cohort gating when the application has no offering', async () => {
    expect(await resolve(makeService({ offeringId: null }))).toBe('cohort');
  });

  test('defaults to cohort gating on an unrecognised or empty strategy value', async () => {
    expect(await resolve(makeService({ strategy: null }))).toBe('cohort');
    expect(await resolve(makeService({ strategy: '' }))).toBe('cohort');
    expect(await resolve(makeService({ strategy: 'drip' }))).toBe('cohort');
  });

  test('ignores the offering when it belongs to a DIFFERENT course', async () => {
    // A learner has one application row. If they are studying another course,
    // that application's offering says nothing about this one.
    expect(await resolve(makeService({ strategy: 'full', applicationCourseId: 99 }))).toBe('cohort');
  });

  test('is case and whitespace tolerant, since the value is free text in the DB', async () => {
    expect(await resolve(makeService({ strategy: '  Full  ' }))).toBe('full');
  });
});
