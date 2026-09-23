import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { ContentService } from '../../src/content/content-service.js';

// Risha/Majida 2026-09-23 — "The '5 Areas of Practical Work – Montessori
// Records' is actually the practical component of 'Montessori Methodology in
// Modern Education'... students should be able to access both the resources at
// once... without going for sub section / sub component."
//
// PG Diploma learners sit on a Cohort Based offering, so a subject opens only
// when one of their cohorts covers it, and no current cohort covers 5 Areas. A
// subject may now name ONE partner (subject.unlock_with_subject_id): a cohort
// covering the partner covers it too. getCohortIdForSubject is the single
// source for both the subject padlock (getSubjects) and the lesson padlocks
// (getLessons), so pinning it pins both — for web and the Flutter app alike.

const USER_ID = '412';
const METHODOLOGY = 30;
const FIVE_AREAS = 31;
const OTHER_SUBJECT = 45;
const DIPLOMA_COURSE = 16;
const PG_COURSE = 21;

interface SubjectRow {
  id: number;
  course_id: number | null;
  master_subject_id: number | null;
  unlock_with_subject_id: number | null;
}

function makeService(opts: {
  subjects: SubjectRow[];
  cohortSubjectId?: number | null;
  inAnyCohort?: boolean;
}): ContentService {
  const subjects = new Map(opts.subjects.map((s) => [s.id, s]));
  const cohortSubjectId = opts.cohortSubjectId === undefined ? METHODOLOGY : opts.cohortSubjectId;

  const prisma = {
    cohort_students: {
      findMany: () => Promise.resolve(opts.inAnyCohort === false ? [] : [{ cohort_id: '501' }]),
    },
    cohorts: {
      findMany: () => Promise.resolve([
        { id: 501, cohort_id: 'MMSEP26', subject_id: cohortSubjectId, course_id: PG_COURSE },
      ]),
    },
    cohort_courses: { findMany: () => Promise.resolve([]) },
    subject: {
      findFirst: ({ where }: { where: { id: number } }) => Promise.resolve(subjects.get(where.id) ?? null),
      findMany: ({ where }: { where: { id: { in: number[] } } }) => Promise.resolve(
        where.id.in.map((id) => subjects.get(id)).filter(Boolean),
      ),
    },
  } as unknown as PrismaClient;

  return new ContentService(prisma);
}

function cohortFor(service: ContentService, subjectId: number): Promise<string | null> {
  return (service as unknown as {
    getCohortIdForSubject: (u: string, s: Record<string, unknown>) => Promise<string | null>;
  }).getCohortIdForSubject(USER_ID, { id: subjectId });
}

const methodology: SubjectRow = { id: METHODOLOGY, course_id: DIPLOMA_COURSE, master_subject_id: null, unlock_with_subject_id: null };
const fiveAreasLinked: SubjectRow = { id: FIVE_AREAS, course_id: DIPLOMA_COURSE, master_subject_id: null, unlock_with_subject_id: METHODOLOGY };
const fiveAreasUnlinked: SubjectRow = { ...fiveAreasLinked, unlock_with_subject_id: null };

describe('a subject that unlocks together with a partner', () => {
  test('opens for a learner whose cohort covers the partner', async () => {
    // The Methodology cohort (01/09–30/09) now opens 5 Areas as well.
    const service = makeService({ subjects: [methodology, fiveAreasLinked] });
    expect(await cohortFor(service, FIVE_AREAS)).toBe('MMSEP26');
  });

  test('stays locked with no partner — exactly today\'s behaviour', async () => {
    const service = makeService({ subjects: [methodology, fiveAreasUnlinked] });
    expect(await cohortFor(service, FIVE_AREAS)).toBeNull();
  });

  test('stays locked when the learner\'s cohort is for a different subject', async () => {
    const service = makeService({
      subjects: [methodology, fiveAreasLinked, { id: OTHER_SUBJECT, course_id: DIPLOMA_COURSE, master_subject_id: null, unlock_with_subject_id: null }],
      cohortSubjectId: OTHER_SUBJECT,
    });
    expect(await cohortFor(service, FIVE_AREAS)).toBeNull();
  });

  test('stays locked for a learner in no cohort at all', async () => {
    const service = makeService({ subjects: [methodology, fiveAreasLinked], inAnyCohort: false });
    expect(await cohortFor(service, FIVE_AREAS)).toBeNull();
  });

  test('does not grant the partner access in reverse', async () => {
    // A cohort for 5 Areas must not open Methodology: the link is one-way.
    const service = makeService({ subjects: [methodology, fiveAreasLinked], cohortSubjectId: FIVE_AREAS });
    expect(await cohortFor(service, METHODOLOGY)).toBeNull();
    expect(await cohortFor(service, FIVE_AREAS)).toBe('MMSEP26');
  });

  test('follows one hop only, so two subjects naming each other cannot loop', async () => {
    const a: SubjectRow = { id: 60, course_id: DIPLOMA_COURSE, master_subject_id: null, unlock_with_subject_id: 61 };
    const b: SubjectRow = { id: 61, course_id: DIPLOMA_COURSE, master_subject_id: null, unlock_with_subject_id: 60 };
    const service = makeService({ subjects: [a, b], cohortSubjectId: OTHER_SUBJECT });
    expect(await cohortFor(service, 60)).toBeNull();
  });

  test('ignores a partner that has been deleted', async () => {
    // subject.findFirst filters deleted_at: null, so a deleted partner reads as absent.
    const service = makeService({ subjects: [fiveAreasLinked] });
    expect(await cohortFor(service, FIVE_AREAS)).toBeNull();
  });
});

describe('saving the "Unlocks together with" field', () => {
  function makeAdminService(
    existingIds: number[],
    storedPartner: number | null = null,
  ): { service: ContentService; updates: Record<string, unknown>[] } {
    const updates: Record<string, unknown>[] = [];
    const prisma = {
      subject: {
        // Title-collision probe → no clash; live-partner lookup (deleted_at
        // filter) → exists?; own-row lookup (no deleted_at) → stored partner.
        findFirst: ({ where }: { where: Record<string, unknown> }) => {
          if ('title' in where) return Promise.resolve(null);
          const id = where.id as number;
          if (!('deleted_at' in where)) return Promise.resolve({ unlock_with_subject_id: storedPartner });
          return Promise.resolve(existingIds.includes(id) ? { id } : null);
        },
        update: ({ data }: { data: Record<string, unknown> }) => {
          updates.push(data);
          return Promise.resolve({ id: FIVE_AREAS });
        },
      },
    } as unknown as PrismaClient;
    return { service: new ContentService(prisma), updates };
  }

  const base = { course_id: String(DIPLOMA_COURSE), title: '5 Areas of Practical Work - Montessori Records' };

  test('stores the chosen partner', async () => {
    const { service, updates } = makeAdminService([METHODOLOGY]);
    await service.editSubjectAdmin('1', String(FIVE_AREAS), { ...base, unlock_with_subject_id: String(METHODOLOGY) });
    expect(updates[0]).toMatchObject({ unlock_with_subject_id: METHODOLOGY });
  });

  test('leaves the stored partner alone when the caller does not send the field', async () => {
    // Other subject forms that don't show the field must not wipe it on save.
    const { service, updates } = makeAdminService([METHODOLOGY]);
    await service.editSubjectAdmin('1', String(FIVE_AREAS), { ...base });
    expect(updates[0]).not.toHaveProperty('unlock_with_subject_id');
  });

  test('clears it when sent empty', async () => {
    const { service, updates } = makeAdminService([METHODOLOGY]);
    await service.editSubjectAdmin('1', String(FIVE_AREAS), { ...base, unlock_with_subject_id: '' });
    expect(updates[0]).toMatchObject({ unlock_with_subject_id: null });
  });

  test('refuses the subject itself as its own partner', async () => {
    const { service, updates } = makeAdminService([FIVE_AREAS]);
    await expect(service.editSubjectAdmin('1', String(FIVE_AREAS), { ...base, unlock_with_subject_id: String(FIVE_AREAS) }))
      .rejects.toThrow(/itself/i);
    expect(updates).toHaveLength(0);
  });

  test('drops the link instead of blocking the save once the stored partner is deleted', async () => {
    // Methodology deleted after being chosen: the form echoes its id back on an
    // unrelated edit (marks, status). Refusing would lock the subject's form.
    const { service, updates } = makeAdminService([], METHODOLOGY);
    await service.editSubjectAdmin('1', String(FIVE_AREAS), { ...base, unlock_with_subject_id: String(METHODOLOGY) });
    expect(updates[0]).toMatchObject({ unlock_with_subject_id: null });
  });

  test('refuses a partner that does not exist', async () => {
    const { service, updates } = makeAdminService([]);
    await expect(service.editSubjectAdmin('1', String(FIVE_AREAS), { ...base, unlock_with_subject_id: '9999' }))
      .rejects.toThrow(/no longer exists/i);
    expect(updates).toHaveLength(0);
  });
});
