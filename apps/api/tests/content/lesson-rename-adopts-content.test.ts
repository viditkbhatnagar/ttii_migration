import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { ContentService } from '../../src/content/content-service.js';

// Risha 2026-09-09 — "when I tried changing the heading name, the whole content
// is getting rearranged or misplaced."
//
// Literally true. A Content Library row is attached to a chapter either by the
// FK content_asset.lesson_id or, for everything imported before that column
// existed, by MATCHING lesson_tag AGAINST THE CHAPTER TITLE — in the admin tree
// AND in the live student player. Renaming the chapter detached every
// name-matched row at once, while the FK-linked Lesson Builder items stayed put.
// On production 301 of 382 library rows were attached that way.
//
// A rename now ADOPTS those rows onto the FK first, in the same transaction, so
// nothing comes loose. It refuses outright when the new name is already taken,
// because two chapters sharing a name make students see the same content under
// both — the bug behind "the heading is different from the content inside it".

const LESSON_ID = 41;
const SUBJECT_ID = 27;
const OLD_TITLE = 'INTRODUCTION TO CHILD PSYCHOLOGY';
const SUBJECT_TITLE = 'Child Psychology';

interface Recorder {
  adopted: { where: Record<string, unknown>; data: Record<string, unknown> }[];
  lessonUpdates: Record<string, unknown>[];
}

function makeService(opts: {
  clashOnNewTitle?: boolean;
  twinsOnOldTitle?: number;
} = {}): { service: ContentService; rec: Recorder } {
  const rec: Recorder = { adopted: [], lessonUpdates: [] };

  const tx = {
    lesson: {
      findFirst: ({ where }: { where: Record<string, unknown> }) => {
        // The clash probe looks for ANOTHER lesson holding the new title.
        if (where && 'NOT' in where) {
          return Promise.resolve(opts.clashOnNewTitle ? { id: 99 } : null);
        }
        return Promise.resolve({ id: LESSON_ID, title: OLD_TITLE, subject_id: SUBJECT_ID });
      },
      count: () => Promise.resolve(opts.twinsOnOldTitle ?? 1),
      update: ({ data }: { data: Record<string, unknown> }) => {
        rec.lessonUpdates.push(data);
        return Promise.resolve({ id: LESSON_ID });
      },
    },
    subject: { findFirst: () => Promise.resolve({ title: SUBJECT_TITLE }) },
    content_asset: {
      updateMany: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        rec.adopted.push(args);
        return Promise.resolve({ count: 7 });
      },
    },
  };

  const prisma = {
    $transaction: (fn: (t: typeof tx) => Promise<void>) => fn(tx),
  } as unknown as PrismaClient;

  return { service: new ContentService(prisma), rec };
}

describe('renaming a chapter', () => {
  test('adopts its name-filed content onto the FK before the title changes', async () => {
    const { service, rec } = makeService();

    await service.editLessonAdmin('1', String(LESSON_ID), {
      subject_id: String(SUBJECT_ID),
      title: 'INTRODUCTION TO CHILD PSYCHOLOGY & DEVELOPMENT',
      free: false,
    });

    // The load-bearing assertion: the rows are claimed by id, so the rename
    // cannot shake them loose — for the admin OR the student player.
    expect(rec.adopted).toHaveLength(1);
    expect(rec.adopted[0]?.where).toMatchObject({
      lesson_id: null,
      subject_tag: SUBJECT_TITLE,
      lesson_tag: OLD_TITLE,
    });
    expect(rec.adopted[0]?.data).toMatchObject({ lesson_id: LESSON_ID });
    expect(rec.lessonUpdates).toHaveLength(1);
  });

  test('refuses a rename onto a name another chapter already uses', async () => {
    const { service, rec } = makeService({ clashOnNewTitle: true });

    await expect(service.editLessonAdmin('1', String(LESSON_ID), {
      subject_id: String(SUBJECT_ID),
      title: 'ASPECTS OF CHILD DEVELOPMENT',
      free: false,
    })).rejects.toThrow(/already called/i);

    // Nothing may move: adopting under an ambiguous name would take content
    // away from the twin chapter for students.
    expect(rec.adopted).toHaveLength(0);
    expect(rec.lessonUpdates).toHaveLength(0);
  });

  test('does NOT adopt when the OLD name is itself shared by two chapters', async () => {
    // The rows belong to both chapters; a human must separate them first.
    const { service, rec } = makeService({ twinsOnOldTitle: 2 });

    await service.editLessonAdmin('1', String(LESSON_ID), {
      subject_id: String(SUBJECT_ID),
      title: 'A CLEARLY NEW NAME',
      free: false,
    });

    expect(rec.adopted).toHaveLength(0);
    // The rename itself still goes through.
    expect(rec.lessonUpdates).toHaveLength(1);
  });

  test('a non-rename edit touches no content at all', async () => {
    const { service, rec } = makeService();

    await service.editLessonAdmin('1', String(LESSON_ID), {
      subject_id: String(SUBJECT_ID),
      title: OLD_TITLE,
      free: true,
    });

    expect(rec.adopted).toHaveLength(0);
    expect(rec.lessonUpdates).toHaveLength(1);
  });

  test('an absent summary is left alone rather than blanked', async () => {
    // The Subject Detail rename dialog sends no summary; coercing that to ''
    // was wiping the chapter summary on every rename.
    const { service, rec } = makeService();

    await service.editLessonAdmin('1', String(LESSON_ID), {
      subject_id: String(SUBJECT_ID),
      title: 'ANOTHER NEW NAME',
      free: false,
    });

    expect(rec.lessonUpdates[0]).not.toHaveProperty('summary');
  });
});
