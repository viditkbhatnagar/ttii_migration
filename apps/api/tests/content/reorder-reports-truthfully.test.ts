import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { ContentAssetService } from '../../src/content/content-asset-service.js';

// Risha 2026-09-09 — "why not able to sort / I mean re order?"
//
// reorderLessonAssets scopes its UPDATE on { id, lesson_id } — correct, so a row
// owned by another chapter can never be renumbered from here. But a Content
// Library row attached to its chapter by NAME has lesson_id NULL, so the WHERE
// matched nothing and the row was silently skipped. On production that was 63 of
// the 72 rows in her subject: the drag saved nothing while the UI reported
// success and the row snapped back with no explanation.
//
// The count is now returned so the page can say what really happened. The
// lesson_id backfill is what makes those rows sortable; this is what stops the
// UI lying about it in the meantime.

function makeService(updatedPerId: Record<number, number>): ContentAssetService {
  const prisma = {
    $transaction: (ops: Promise<{ count: number }>[]) => Promise.all(ops),
    content_asset: {
      updateMany: ({ where }: { where: { id: number } }) =>
        Promise.resolve({ count: updatedPerId[where.id] ?? 0 }),
    },
  } as unknown as PrismaClient;

  return new ContentAssetService(prisma);
}

describe('reordering Content Library items in a chapter', () => {
  test('reports every row written when all are FK-linked', async () => {
    const service = makeService({ 10: 1, 11: 1, 12: 1 });

    expect(await service.reorderLessonAssets('41', ['10', '11', '12']))
      .toEqual({ requested: 3, updated: 3 });
  });

  test('reports the shortfall when name-filed rows cannot be saved', async () => {
    // 11 and 12 have lesson_id NULL, so their updates match nothing.
    const service = makeService({ 10: 1, 11: 0, 12: 0 });

    // The load-bearing assertion: the caller can now tell that two rows did NOT
    // move. Previously this returned void and the page always said "reordered".
    expect(await service.reorderLessonAssets('41', ['10', '11', '12']))
      .toEqual({ requested: 3, updated: 1 });
  });

  test('reports zero when nothing could be saved at all', async () => {
    const service = makeService({});

    expect(await service.reorderLessonAssets('41', ['10', '11']))
      .toEqual({ requested: 2, updated: 0 });
  });

  test('ignores unusable ids rather than counting them as requested', async () => {
    const service = makeService({ 10: 1 });

    expect(await service.reorderLessonAssets('41', ['10', '', 'abc', '0']))
      .toEqual({ requested: 1, updated: 1 });
  });

  test('refuses an invalid chapter id', async () => {
    const service = makeService({});

    await expect(service.reorderLessonAssets('', ['10'])).rejects.toThrow(/lesson id/i);
  });
});
