import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { ContentService } from '../../src/content/content-service.js';

// Risha 2026-09-23 — "why are we not able to change the name of the file that
// shows Lesson Builder under that. need to rename certain files."
//
// The Subject Detail page could not rename a Lesson Builder (lesson_files)
// item, and the full edit route rewrites every column, so it cannot rename
// alone. The new title-only rename has one non-obvious duty: the 2026-04-30
// backfill copied every lesson_files row into content_asset, and the student
// player hides such a copy ONLY while its title matches the Lesson Builder row
// in the same chapter. Renaming the original without the copy would make the
// copy appear to students as an extra item. So the copy is renamed with it.

const FILE_ID = 900;
const LESSON_ID = 41;
const OLD_TITLE = 'ASSESSMENT LESSON 2';
const NEW_TITLE = 'ASSESSMENT LESSON 3';

interface Recorder {
  fileUpdates: Record<string, unknown>[];
  assetFindWhere: Record<string, unknown>[];
  assetUpdates: { where: Record<string, unknown>; data: Record<string, unknown> }[];
}

function makeService(opts: {
  file?: { id: number; lesson_id: number; title: string } | null;
  siblingTitles?: string[];
  candidates?: { id: number; title: string }[];
} = {}): { service: ContentService; rec: Recorder } {
  const rec: Recorder = { fileUpdates: [], assetFindWhere: [], assetUpdates: [] };
  const file = opts.file === undefined ? { id: FILE_ID, lesson_id: LESSON_ID, title: OLD_TITLE } : opts.file;

  const tx = {
    lesson_files: {
      findFirst: () => Promise.resolve(file),
      findMany: () => Promise.resolve((opts.siblingTitles ?? ['DEVELOPMENT STAGES']).map((title) => ({ title }))),
      update: ({ data }: { data: Record<string, unknown> }) => {
        rec.fileUpdates.push(data);
        return Promise.resolve({ id: FILE_ID });
      },
    },
    lesson: { findFirst: () => Promise.resolve({ title: 'STAGES OF CHILD DEVELOPMENT', subject_id: 27 }) },
    subject: { findFirst: () => Promise.resolve({ title: 'Child Psychology' }) },
    content_asset: {
      findMany: ({ where }: { where: Record<string, unknown> }) => {
        rec.assetFindWhere.push(where);
        return Promise.resolve(opts.candidates ?? [
          { id: 1, title: 'Assessment Lesson 2' },       // the backfill copy, case differs
          { id: 2, title: 'ASSESSMENT LESSON 3' },       // a different item
          { id: 3, title: '  assessment   lesson 2 ' }, // copy with stray whitespace
        ]);
      },
      updateMany: (args: { where: { id: { in: number[] } }; data: Record<string, unknown> }) => {
        rec.assetUpdates.push(args);
        return Promise.resolve({ count: args.where.id.in.length });
      },
    },
  };

  const prisma = {
    $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaClient;

  return { service: new ContentService(prisma), rec };
}

describe('renaming a Lesson Builder item', () => {
  test('changes only the title of the file', async () => {
    const { service, rec } = makeService();
    const result = await service.renameLessonFileAdmin('7', String(FILE_ID), `  ${NEW_TITLE}  `);

    expect(rec.fileUpdates).toHaveLength(1);
    // Title-only: nothing that would blank the video, attachment or summary.
    expect(Object.keys(rec.fileUpdates[0] ?? {}).sort()).toEqual(['title', 'updated_at', 'updated_by']);
    expect(rec.fileUpdates[0]).toMatchObject({ title: NEW_TITLE });
    expect(result).toMatchObject({ id: FILE_ID, title: NEW_TITLE, mirrors_renamed: 2 });
  });

  test('renames its Content Library copies so they stay hidden from students', async () => {
    const { service, rec } = makeService();
    await service.renameLessonFileAdmin('7', String(FILE_ID), NEW_TITLE);

    expect(rec.assetUpdates).toHaveLength(1);
    expect(rec.assetUpdates[0]?.where.id).toEqual({ in: [1, 3] });
    expect(rec.assetUpdates[0]?.data).toMatchObject({ title: NEW_TITLE });
  });

  test('finds copies the way the student player does: by chapter id, or unlinked + name tags', async () => {
    const { service, rec } = makeService();
    await service.renameLessonFileAdmin('7', String(FILE_ID), NEW_TITLE);

    expect(rec.assetFindWhere[0]).toMatchObject({
      deleted_at: null,
      OR: [
        { lesson_id: LESSON_ID },
        { lesson_id: null, lesson_tag: 'STAGES OF CHILD DEVELOPMENT', subject_tag: 'Child Psychology' },
      ],
    });
  });

  test('leaves the copy alone while another Lesson Builder item still has the old name', async () => {
    const { service, rec } = makeService({ siblingTitles: ['Assessment Lesson 2'] });
    const result = await service.renameLessonFileAdmin('7', String(FILE_ID), NEW_TITLE);

    expect(rec.fileUpdates).toHaveLength(1);
    expect(rec.assetUpdates).toHaveLength(0);
    expect(result).toMatchObject({ mirrors_renamed: 0 });
  });

  test('refuses an empty name without writing anything', async () => {
    const { service, rec } = makeService();
    await expect(service.renameLessonFileAdmin('7', String(FILE_ID), '   ')).rejects.toThrow(/enter a name/i);
    expect(rec.fileUpdates).toHaveLength(0);
  });

  test('refuses a deleted or missing item', async () => {
    const { service, rec } = makeService({ file: null });
    await expect(service.renameLessonFileAdmin('7', String(FILE_ID), NEW_TITLE)).rejects.toThrow(/no longer exists/i);
    expect(rec.fileUpdates).toHaveLength(0);
  });
});

describe('editing a Lesson Builder item in the Lesson Builder', () => {
  const input = {
    lesson_id: String(LESSON_ID),
    title: NEW_TITLE,
    summary: '',
    duration: '',
    lesson_type: 'quiz',
    video_url: '',
    attachment: '',
    audio_file: '',
    thumbnail: '',
    language: '',
    free: false,
  };

  test('carries the copies along when the title changes (same exposure as a rename)', async () => {
    const { service, rec } = makeService();
    await service.editLessonFileAdmin('7', String(FILE_ID), input);

    expect(rec.fileUpdates).toHaveLength(1);
    expect(rec.assetUpdates[0]?.where.id).toEqual({ in: [1, 3] });
  });

  test('does not touch the library when the title is unchanged', async () => {
    const { service, rec } = makeService();
    await service.editLessonFileAdmin('7', String(FILE_ID), { ...input, title: OLD_TITLE });

    expect(rec.fileUpdates).toHaveLength(1);
    expect(rec.assetUpdates).toHaveLength(0);
  });
});
