import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { ContentService } from '../../src/content/content-service.js';

// Risha UAT 2026-08-14 — "check whether they are the same assessments".
//
// Her lesson showed 28 items for 12 pieces of content. Cause: two one-shot
// backfills on 2026-04-30 copied every lesson_files row into content_asset,
// tagged by lesson NAME (content_asset.lesson_id did not exist until
// 2026-05-30, which is why those rows still have it NULL and are matched by
// lesson_tag + subject_tag).
//
// That was invisible to students until 2026-07-31, when /lesson_file/index
// started appending Content Library rows so that library-ONLY content would
// reach the player (Majida: "PPTs uploaded against each subject are not visible
// to student"). Both needs are real, so the gate must drop MIRRORS while
// leaving library-only content alone — that tension is what these tests pin.
//
// Worst case on production: ASSESSMENT LESSON 1-4 reached the learner twice —
// once as the real scoring quiz (lesson_files) and once as a dead "article"
// with no questions (the backfilled copy).

const LESSON_ID = 307;
const SUBJECT_ID = 30;
const LESSON_TITLE = 'Philosophical Foundations of Montessori';
const SUBJECT_TITLE = 'Montessori Methodology in Modern Education';

interface StubRow {
  id: number;
  title: string;
  [key: string]: unknown;
}

/**
 * Permissive Prisma stub: every model answers findMany -> [], findFirst /
 * findUnique -> null, count -> 0, unless explicitly overridden. Keeps the test
 * from breaking when an unrelated lookup is added to the builder.
 */
function makePrisma(overrides: Record<string, Record<string, unknown>>): PrismaClient {
  const defaults = {
    findMany: () => Promise.resolve([]),
    findFirst: () => Promise.resolve(null),
    findUnique: () => Promise.resolve(null),
    count: () => Promise.resolve(0),
    groupBy: () => Promise.resolve([]),
    aggregate: () => Promise.resolve({}),
  };
  return new Proxy({} as Record<string, unknown>, {
    get: (_t, model: string) => ({ ...defaults, ...(overrides[model] ?? {}) }),
  }) as unknown as PrismaClient;
}

function lessonFile(id: number, title: string, lessonType: string): StubRow {
  return {
    id,
    title,
    lesson_type: lessonType,
    attachment_type: lessonType === 'video' ? 'video' : '',
    parent_file_id: null,
    order: id,
    lesson_id: LESSON_ID,
    video_url: lessonType === 'video' ? 'https://vimeo.com/1' : null,
    attachment: null,
    audio_file: null,
    summary: '',
    deleted_at: null,
  };
}

function libraryAsset(id: number, title: string, assetType: string): StubRow {
  return {
    id,
    title,
    asset_type: assetType,
    // The backfilled rows: tagged by NAME, never FK-linked.
    lesson_id: null,
    lesson_tag: LESSON_TITLE,
    subject_tag: SUBJECT_TITLE,
    sort_order: 0,
    summary: 'body text',
    video_url: assetType === 'video' ? 'https://vimeo.com/1' : null,
    attachment: null,
    audio_file: null,
    download_url: null,
    thumbnail: null,
    duration: null,
    provider: null,
    language: null,
    deleted_at: null,
  };
}

/** Titles the student player would render for the lesson, in order. */
async function studentTitles(files: StubRow[], assets: StubRow[]): Promise<string[]> {
  const prisma = makePrisma({
    lesson: {
      findFirst: () =>
        Promise.resolve({ id: LESSON_ID, course_id: 16, title: LESSON_TITLE, subject_id: SUBJECT_ID }),
    },
    lesson_files: { findMany: () => Promise.resolve(files) },
    subject: { findUnique: () => Promise.resolve({ title: SUBJECT_TITLE }) },
    content_asset: { findMany: () => Promise.resolve(assets) },
  });

  const rows = await new ContentService(prisma).getLessonFileGroupedIndex('137', String(LESSON_ID));
  return rows.map((r) => String(r.title));
}

describe('student lesson timeline — a backfilled Library mirror is not a second item', () => {
  test('the ASSESSMENT quiz and its backfilled "article" copy collapse to ONE item', async () => {
    const titles = await studentTitles(
      [lessonFile(717, 'ASSESSMENT LESSON 1', 'quiz')],
      [libraryAsset(150, 'ASSESSMENT LESSON 1', 'article')],
    );

    // Before the fix this was ['ASSESSMENT LESSON 1', 'ASSESSMENT LESSON 1'] —
    // the second one a dead article carrying no questions.
    expect(titles).toEqual(['ASSESSMENT LESSON 1']);
  });

  test('the surviving copy is the lesson_files row — the one that scores and tracks progress', async () => {
    const prisma = makePrisma({
      lesson: {
        findFirst: () =>
          Promise.resolve({ id: LESSON_ID, course_id: 16, title: LESSON_TITLE, subject_id: SUBJECT_ID }),
      },
      lesson_files: { findMany: () => Promise.resolve([lessonFile(717, 'ASSESSMENT LESSON 1', 'quiz')]) },
      subject: { findUnique: () => Promise.resolve({ title: SUBJECT_TITLE }) },
      content_asset: { findMany: () => Promise.resolve([libraryAsset(150, 'ASSESSMENT LESSON 1', 'article')]) },
    });

    const rows = await new ContentService(prisma).getLessonFileGroupedIndex('137', String(LESSON_ID));

    // Library rows are emitted with an id offset of 1_000_000_000; the real
    // lesson_files id must be what survives.
    expect(rows).toHaveLength(1);
    expect(Number(rows[0]?.id)).toBe(717);
    expect(Number(rows[0]?.id)).toBeLessThan(1_000_000_000);
  });

  test('a whole lesson of mirrors collapses to the real content count', async () => {
    const files = [
      lessonFile(757, 'Foundations of Montessori', 'video'),
      lessonFile(749, 'Inclusive and Respectful', 'article'),
      lessonFile(717, 'ASSESSMENT LESSON 1', 'quiz'),
    ];
    const assets = [
      libraryAsset(107, 'Foundations of Montessori', 'video'),
      libraryAsset(163, 'Inclusive and Respectful', 'article'),
      libraryAsset(150, 'ASSESSMENT LESSON 1', 'article'),
    ];

    const titles = await studentTitles(files, assets);

    expect(titles).toHaveLength(3);
    expect(new Set(titles).size).toBe(3);
  });

  test('matching ignores case and stray whitespace (admins have edited some titles)', async () => {
    const titles = await studentTitles(
      [lessonFile(755, 'The Four Planes of Development', 'article')],
      [libraryAsset(174, '  the four  planes of development ', 'article')],
    );

    expect(titles).toEqual(['The Four Planes of Development']);
  });
});

describe('student lesson timeline — library-only content still reaches the learner', () => {
  test('an asset with NO lesson_files counterpart is still shown (Majida 2026-07-31)', async () => {
    // This is the regression that would silently undo the reason the append
    // exists at all: a PPT/document that lives only in the Content Library.
    const titles = await studentTitles(
      [lessonFile(757, 'Foundations of Montessori', 'video')],
      [libraryAsset(400, 'Chapter 1 Handout', 'article')],
    );

    expect(titles).toContain('Chapter 1 Handout');
    expect(titles).toHaveLength(2);
  });

  test('a lesson with only library content is not emptied', async () => {
    const titles = await studentTitles([], [libraryAsset(400, 'Chapter 1 Handout', 'article')]);

    expect(titles).toEqual(['Chapter 1 Handout']);
  });
});

describe('student lesson timeline — the gate does not paper over real data duplicates', () => {
  test('two lesson_files rows sharing a title BOTH remain (needs data cleanup, not a read filter)', async () => {
    // Production lesson_files 751 and 753 are a genuine duplicate inside the
    // store the player reads. A read-side gate must not hide one and create the
    // illusion it was fixed — the row has to be removed deliberately.
    const titles = await studentTitles(
      [
        lessonFile(751, 'A Quiet Practice of Respect', 'article'),
        lessonFile(753, 'A Quiet Practice of Respect', 'article'),
      ],
      [],
    );

    expect(titles).toEqual(['A Quiet Practice of Respect', 'A Quiet Practice of Respect']);
  });
});
