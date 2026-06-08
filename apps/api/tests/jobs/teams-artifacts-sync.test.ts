import { describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import type { StorageProvider } from '../../src/integrations/contracts.js';

// The real Teams service makes no network calls until listRecordings is
// invoked; with zero candidates the loop never runs, so this stays offline.
vi.mock('../../src/integrations/teams-meeting-service.js', () => ({
  createTeamsMeetingService: () => ({
    listRecordings: () => Promise.resolve([]),
    getAttendanceReports: () => Promise.resolve([]),
    downloadRecording: () => Promise.resolve({ body: null, contentLength: 0, contentType: '' }),
  }),
}));

import { syncPendingTeamsArtifacts } from '../../src/jobs/teams-artifacts-sync.js';

const noopLogger = { info: () => {}, warn: () => {}, error: () => {} };

const storageStub = {
  name: 'stub',
  uploadObject: () => Promise.reject(new Error('unused')),
  uploadFromFile: () => Promise.reject(new Error('unused')),
  deleteObject: () => Promise.resolve(),
  createSignedDownloadUrl: () => Promise.resolve('stub'),
} as unknown as StorageProvider;

describe('syncPendingTeamsArtifacts candidate selection', () => {
  it('filters Teams classes by the populated `date` column, not the nullable `toDate`', async () => {
    // Regression guard: the admin flow only sets `date`; `toDate` is NULL for
    // single-day classes. Filtering on `toDate` silently skipped every real
    // Teams recording. The candidate query must key off `date`.
    let capturedWhere: Record<string, unknown> | undefined;
    const fakePrisma = {
      live_class: {
        findMany: (args: { where: Record<string, unknown> }) => {
          capturedWhere = args.where;
          return Promise.resolve([]);
        },
        update: () => Promise.resolve({}),
      },
    } as unknown as PrismaClient;

    const result = await syncPendingTeamsArtifacts({
      prisma: fakePrisma,
      storage: storageStub,
      teamsCreds: { clientId: 'id', clientSecret: 'secret', tenantId: 'tenant' },
      logger: noopLogger,
      now: () => new Date('2026-06-08T12:00:00Z'),
    });

    expect(capturedWhere).toBeDefined();
    expect(capturedWhere?.date).toBeDefined();
    expect(capturedWhere?.toDate).toBeUndefined();
    expect(capturedWhere?.platform).toBe('teams');
    expect(result.candidateCount).toBe(0);
  });
});
