import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { ContentService } from '../../src/content/content-service.js';
import { completionKind } from '../../src/content/lesson-file-kind.js';

// TTII 2026-11-10 — course 24 (lesson-wise): every lesson has one document and
// one quiz, all with attachment_type NULL / lesson_provider ''. A submitted
// quiz never counted and documents could not complete: 0/26, 0%.

describe('completionKind', () => {
  test('falls back to lesson_type when attachment_type is empty, case-insensitively', () => {
    expect(completionKind({ lesson_type: 'quiz', attachment_type: null })).toBe('quiz');
    expect(completionKind({ lesson_type: 'Quiz', attachment_type: '' })).toBe('quiz');
    expect(completionKind({ lesson_type: 'document', attachment_type: null })).toBe('document');
    expect(completionKind({ lesson_type: 'Document', attachment_type: null })).toBe('document');
    expect(completionKind({ lesson_type: 'video', attachment_type: null })).toBe('video');
    expect(completionKind({ lesson_type: 'article', attachment_type: null })).toBe('article');
    expect(completionKind({ lesson_type: '', attachment_type: 'pdf' })).toBe('document');
    expect(completionKind({ lesson_type: 'video', attachment_type: 'audio' })).toBe('audio');
    expect(completionKind({ lesson_type: 'mystery', attachment_type: null })).toBe('other');
  });
});

interface World {
  files: Array<{ id: number; lesson_type: string; attachment_type: string | null }>;
  materialOpened: number[];
  quizSubmitted: string[];
  created: Array<Record<string, unknown>>;
}

function service(world: World): ContentService {
  const prisma = {
    lesson_files: {
      findMany: () => Promise.resolve(world.files),
      findFirst: ({ where }: { where: { id: number } }) =>
        Promise.resolve(world.files.some((f) => f.id === where.id) ? { lesson_id: 7 } : null),
    },
    lesson: { findFirst: () => Promise.resolve({ course_id: 24 }) },
    video_progress_status: { findMany: () => Promise.resolve([]), findFirst: () => Promise.resolve(null) },
    material_progress_status: {
      findMany: ({ where }: { where: { lesson_file_id: { in: number[] } } }) =>
        Promise.resolve(where.lesson_file_id.in.filter((id) => world.materialOpened.includes(id)).map((lesson_file_id) => ({ lesson_file_id }))),
      findFirst: ({ where }: { where: { lesson_file_id: number } }) =>
        Promise.resolve(world.materialOpened.includes(where.lesson_file_id) ? { id: 1 } : null),
      count: ({ where }: { where: { lesson_file_id: number } }) =>
        Promise.resolve(world.materialOpened.includes(where.lesson_file_id) ? 1 : 0),
      create: ({ data }: { data: Record<string, unknown> }) => { world.created.push(data); return Promise.resolve(data); },
    },
    practice_attempt: {
      findMany: ({ where }: { where: { lesson_file_id: { in: string[] } } }) =>
        Promise.resolve(where.lesson_file_id.in.filter((id) => world.quizSubmitted.includes(id)).map((lesson_file_id) => ({ lesson_file_id }))),
      count: ({ where }: { where: { lesson_file_id: string } }) =>
        Promise.resolve(world.quizSubmitted.includes(where.lesson_file_id) ? 1 : 0),
    },
  } as unknown as PrismaClient;
  return new ContentService(prisma);
}

const FILES = [
  { id: 10, lesson_type: 'document', attachment_type: null },
  { id: 11, lesson_type: 'quiz', attachment_type: null },
];

type Internals = {
  getCompletedFilesForLesson: (lessonId: string, userId: string, courseId?: string) => Promise<number>;
  getFileProgress: (userId: string, fileId: string, kind: ReturnType<typeof completionKind>) => Promise<number>;
};

describe('lesson-file completion with attachment_type NULL', () => {
  test('a submitted quiz counts', async () => {
    const svc = service({ files: FILES, materialOpened: [], quizSubmitted: ['11'], created: [] });
    expect(await (svc as unknown as Internals).getCompletedFilesForLesson('7', '354', '24')).toBe(1);
  });

  test('an opened document counts, an unopened one does not', async () => {
    const opened = service({ files: FILES, materialOpened: [10], quizSubmitted: [], created: [] });
    expect(await (opened as unknown as Internals).getCompletedFilesForLesson('7', '354', '24')).toBe(1);
    const fresh = service({ files: FILES, materialOpened: [], quizSubmitted: [], created: [] });
    expect(await (fresh as unknown as Internals).getCompletedFilesForLesson('7', '354', '24')).toBe(0);
  });

  test('both done = 2 of 2', async () => {
    const svc = service({ files: FILES, materialOpened: [10], quizSubmitted: ['11'], created: [] });
    expect(await (svc as unknown as Internals).getCompletedFilesForLesson('7', '354', '24')).toBe(2);
  });

  test('per-file progress is 100 for an opened document and a submitted quiz', async () => {
    const svc = service({ files: FILES, materialOpened: [10], quizSubmitted: ['11'], created: [] }) as unknown as Internals;
    expect(await svc.getFileProgress('354', '10', 'document')).toBe(100);
    expect(await svc.getFileProgress('354', '11', 'quiz')).toBe(100);
    expect(await svc.getFileProgress('354', '12', 'document')).toBe(0);
  });
});

describe('saveMaterialProgress', () => {
  test('records the open once, with the file\'s own course', async () => {
    const world: World = { files: FILES, materialOpened: [], quizSubmitted: [], created: [] };
    const svc = service(world);
    await svc.saveMaterialProgress('354', { courseId: '999', lessonFileId: '10', attachmentType: 'pdf' });
    expect(world.created).toHaveLength(1);
    expect(world.created[0]).toMatchObject({ user_id: 354, course_id: 24, lesson_file_id: 10, attachment_type: 'pdf' });
  });

  test('is idempotent and ignores unknown files', async () => {
    const world: World = { files: FILES, materialOpened: [10], quizSubmitted: [], created: [] };
    const svc = service(world);
    await svc.saveMaterialProgress('354', { courseId: '24', lessonFileId: '10', attachmentType: 'pdf' });
    await svc.saveMaterialProgress('354', { courseId: '24', lessonFileId: '555', attachmentType: 'pdf' });
    expect(world.created).toHaveLength(0);
  });
});
