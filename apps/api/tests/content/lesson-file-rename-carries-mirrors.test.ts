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
const APRIL_IMPORT = new Date('2026-04-30T10:00:00Z');
const JUNE = new Date('2026-06-12T11:07:59Z');
const JULY_1 = new Date('2026-07-01T09:00:00Z');
const JULY_16 = new Date('2026-07-16T17:01:31Z');

interface Recorder {
  fileUpdates: Record<string, unknown>[];
  assetFindWhere: Record<string, unknown>[];
  assetUpdates: { where: Record<string, unknown>; data: Record<string, unknown> }[];
}

function makeService(opts: {
  file?: { id: number; lesson_id: number; title: string; created_at?: Date | null; updated_at?: Date | null } | null;
  siblingTitles?: string[];
  candidates?: { id: number; title: string; created_at?: Date | null }[];
} = {}): { service: ContentService; rec: Recorder } {
  const rec: Recorder = { fileUpdates: [], assetFindWhere: [], assetUpdates: [] };
  const file = opts.file === undefined
    ? { id: FILE_ID, lesson_id: LESSON_ID, title: OLD_TITLE, created_at: JUNE, updated_at: JULY_1 }
    : opts.file;

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
          { id: 1, title: 'Assessment Lesson 2', created_at: APRIL_IMPORT },       // the backfill copy, case differs
          { id: 2, title: 'ASSESSMENT LESSON 3', created_at: APRIL_IMPORT },       // a different item
          { id: 3, title: '  assessment   lesson 2 ', created_at: APRIL_IMPORT }, // copy with stray whitespace
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

  test('only follows copies attached to this chapter by id, never by name', async () => {
    // A row attached by NAME is served in every chapter sharing that name, so
    // touching it from one chapter could change what students see in another.
    const { service, rec } = makeService();
    await service.renameLessonFileAdmin('7', String(FILE_ID), NEW_TITLE);

    expect(rec.assetFindWhere[0]).toEqual({ deleted_at: null, lesson_id: LESSON_ID });
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

// Risha 2026-09-24 — "how can we delete the video named Meet Your Trainer that's
// not written as duplicate against it? Because there is no delete button."
// Deleting the original alone would un-hide its Content Library copy (on
// production these are mostly OLDER Vimeo links and quizzes missing a question),
// which would then appear to students in its place. So the copy goes with it.
describe('deleting a Lesson Builder item', () => {
  test('soft-deletes the file and its hidden Content Library copies together', async () => {
    const { service, rec } = makeService();
    const result = await service.deleteLessonFileAdmin('7', String(FILE_ID));

    expect(rec.fileUpdates).toHaveLength(1);
    expect(rec.fileUpdates[0]).toMatchObject({ deleted_by: 7 });
    expect(rec.fileUpdates[0]?.deleted_at).toBeInstanceOf(Date);
    expect(rec.assetUpdates).toHaveLength(1);
    expect(rec.assetUpdates[0]?.where.id).toEqual({ in: [1, 3] });
    expect(rec.assetUpdates[0]?.data).toMatchObject({ deleted_by: 7 });
    expect(rec.assetUpdates[0]?.data).not.toHaveProperty('title');
    expect(result).toMatchObject({ id: FILE_ID, mirrors_deleted: 2, mirrors_kept: 0 });
  });

  test('keeps the copy while another Lesson Builder item in the chapter still has that name', async () => {
    const { service, rec } = makeService({ siblingTitles: ['Assessment Lesson 2'] });
    const result = await service.deleteLessonFileAdmin('7', String(FILE_ID));

    expect(rec.fileUpdates).toHaveLength(1);
    expect(rec.assetUpdates).toHaveLength(0);
    expect(result).toMatchObject({ mirrors_deleted: 0 });
  });

  test('keeps a same-named Content Library item added AFTER the file was last changed', async () => {
    // Foundation To IT: "Chapter 1" PDF re-uploaded to the library on 16 Jul
    // behind a June Lesson Builder original. Deleting the old original is how
    // the new one reaches students, so it must survive.
    const { service, rec } = makeService({
      candidates: [
        { id: 1, title: 'Assessment Lesson 2', created_at: APRIL_IMPORT },
        { id: 353, title: 'ASSESSMENT LESSON 2', created_at: JULY_16 },
      ],
    });
    const result = await service.deleteLessonFileAdmin('7', String(FILE_ID));

    expect(rec.assetUpdates[0]?.where.id).toEqual({ in: [1] });
    expect(result).toMatchObject({ mirrors_deleted: 1, mirrors_kept: 1 });
  });

  test('refuses an item that is already gone, without writing anything', async () => {
    const { service, rec } = makeService({ file: null });
    await expect(service.deleteLessonFileAdmin('7', String(FILE_ID))).rejects.toThrow(/no longer exists/i);
    expect(rec.fileUpdates).toHaveLength(0);
    expect(rec.assetUpdates).toHaveLength(0);
  });
});
