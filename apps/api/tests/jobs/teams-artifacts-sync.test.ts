import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import type { StorageProvider } from '../../src/integrations/contracts.js';

// Mutable stub so each test can drive what Graph "returns" without re-mocking.
const teamsStub = vi.hoisted(() => ({
  listRecordings: vi.fn(),
  getAttendanceReports: vi.fn(),
  downloadRecording: vi.fn(),
}));

vi.mock('../../src/integrations/teams-meeting-service.js', () => ({
  createTeamsMeetingService: () => teamsStub,
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

const creds = { clientId: 'id', clientSecret: 'secret', tenantId: 'tenant' };

/** live_class 749: 2026-08-06, 14:30-15:30 IST => 09:00-10:00 UTC. */
function classRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 749,
    external_meeting_id: 'meeting-749',
    host_email: 'naji@teachersindia.in',
    // @db.Date and @db.Time come back from Prisma anchored at UTC.
    date: new Date('2026-08-06T00:00:00Z'),
    fromTime: new Date('1970-01-01T14:30:00Z'),
    toTime: new Date('1970-01-01T15:30:00Z'),
    recording_fetched_at: null,
    attendance_fetched_at: null,
    recording_graph_id: null,
    recording_size_bytes: null,
    ...overrides,
  };
}

function webStreamOf(bytes: number): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    },
  });
}

function makePrisma(rows: Array<Record<string, unknown>>) {
  const updates: Array<Record<string, unknown>> = [];
  const prisma = {
    live_class: {
      findMany: () => Promise.resolve(rows),
      update: (args: { data: Record<string, unknown> }) => {
        updates.push(args.data);
        return Promise.resolve({});
      },
    },
    live_class_attendance: { upsert: () => Promise.resolve({}) },
    users: { findFirst: () => Promise.resolve(null) },
  } as unknown as PrismaClient;
  return { prisma, updates };
}

beforeEach(() => {
  teamsStub.listRecordings.mockReset();
  teamsStub.getAttendanceReports.mockReset();
  teamsStub.downloadRecording.mockReset();
  teamsStub.listRecordings.mockResolvedValue([]);
  teamsStub.getAttendanceReports.mockResolvedValue([]);
});

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
      teamsCreds: creds,
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

describe('syncPendingTeamsArtifacts class-end gate (Risha UAT 2026-08-06)', () => {
  it('does not touch Graph before the class has ended, even though `date` is already past', async () => {
    // The prod failure: at 00:05 UTC on the class date (05:35 IST) the row was
    // already eligible, so the job latched a stray artifact nine hours before
    // the 14:30 IST class ran.
    const { prisma, updates } = makePrisma([classRow()]);

    const result = await syncPendingTeamsArtifacts({
      prisma,
      storage: storageStub,
      teamsCreds: creds,
      logger: noopLogger,
      now: () => new Date('2026-08-06T00:05:00Z'),
    });

    expect(teamsStub.listRecordings).not.toHaveBeenCalled();
    expect(teamsStub.getAttendanceReports).not.toHaveBeenCalled();
    expect(result.notEndedYet).toBe(1);
    expect(updates).toHaveLength(0);
  });

  it('treats IST wall clock correctly: still gated one minute before end + grace', async () => {
    // Class ends 10:00 UTC; grace 15 min. 10:14 UTC must still be gated — a
    // naive local-time reading would have opened the gate 5.5 hours early.
    const { prisma } = makePrisma([classRow()]);

    const result = await syncPendingTeamsArtifacts({
      prisma,
      storage: storageStub,
      teamsCreds: creds,
      logger: noopLogger,
      now: () => new Date('2026-08-06T10:14:00Z'),
    });

    expect(teamsStub.listRecordings).not.toHaveBeenCalled();
    expect(result.notEndedYet).toBe(1);
  });

  it('proceeds once the class end plus grace has passed', async () => {
    const { prisma } = makePrisma([classRow()]);

    await syncPendingTeamsArtifacts({
      prisma,
      storage: storageStub,
      teamsCreds: creds,
      logger: noopLogger,
      now: () => new Date('2026-08-06T10:16:00Z'),
    });

    expect(teamsStub.listRecordings).toHaveBeenCalledWith('meeting-749', 'naji@teachersindia.in');
  });
});

describe('syncPendingTeamsArtifacts recording selection', () => {
  it('refuses to store a recording created before the class window', async () => {
    // live_class 749 stored a 239 KB artifact created 2026-08-05T09:07Z — the
    // day before. Nothing in the list belongs to this session, so retry.
    teamsStub.listRecordings.mockResolvedValue([
      { recordingId: 'stray', meetingId: 'meeting-749', contentUrl: 'https://x/stray', createdDateTime: '2026-08-05T09:07:16Z' },
    ]);
    const { prisma, updates } = makePrisma([classRow()]);

    const result = await syncPendingTeamsArtifacts({
      prisma,
      storage: storageStub,
      teamsCreds: creds,
      logger: noopLogger,
      now: () => new Date('2026-08-06T10:20:00Z'),
    });

    expect(teamsStub.downloadRecording).not.toHaveBeenCalled();
    expect(result.recordingsFetched).toBe(0);
    expect(updates).toHaveLength(0);
  });

  it('picks the trainer session over a same-day join-and-leave stray', async () => {
    teamsStub.listRecordings.mockResolvedValue([
      // Stray from someone opening the link the day before.
      { recordingId: 'stray', meetingId: 'meeting-749', contentUrl: 'https://x/stray', createdDateTime: '2026-08-05T09:07:16Z' },
      // The real session, started right on time.
      { recordingId: 'real', meetingId: 'meeting-749', contentUrl: 'https://x/real', createdDateTime: '2026-08-06T09:00:00Z' },
    ]);
    teamsStub.downloadRecording.mockResolvedValue({
      body: webStreamOf(5_000_000),
      contentLength: 5_000_000,
      contentType: 'video/mp4',
    });
    const storage = {
      ...storageStub,
      uploadFromFile: () => Promise.resolve({ location: 'https://cdn/real.mp4', key: 'recordings/real.mp4' }),
    } as unknown as StorageProvider;
    const { prisma, updates } = makePrisma([classRow()]);

    const result = await syncPendingTeamsArtifacts({
      prisma,
      storage,
      teamsCreds: creds,
      logger: noopLogger,
      now: () => new Date('2026-08-06T10:20:00Z'),
    });

    expect(teamsStub.downloadRecording).toHaveBeenCalledWith('https://x/real');
    expect(result.recordingsFetched).toBe(1);
    expect(updates[0]?.recording_graph_id).toBe('real');
  });
});

describe('syncPendingTeamsArtifacts re-check window', () => {
  it('replaces an already-stored stub with the larger real recording', async () => {
    teamsStub.listRecordings.mockResolvedValue([
      { recordingId: 'real', meetingId: 'meeting-749', contentUrl: 'https://x/real', createdDateTime: '2026-08-06T09:00:00Z' },
    ]);
    teamsStub.downloadRecording.mockResolvedValue({
      body: webStreamOf(5_000_000),
      contentLength: 5_000_000,
      contentType: 'video/mp4',
    });
    const storage = {
      ...storageStub,
      uploadFromFile: () => Promise.resolve({ location: 'https://cdn/real.mp4', key: 'recordings/real.mp4' }),
    } as unknown as StorageProvider;
    const { prisma, updates } = makePrisma([
      classRow({
        recording_fetched_at: new Date('2026-08-06T10:20:00Z'),
        recording_graph_id: 'stub',
        recording_size_bytes: 244_960n,
        attendance_fetched_at: new Date('2026-08-06T10:20:00Z'),
      }),
    ]);

    const result = await syncPendingTeamsArtifacts({
      prisma,
      storage,
      teamsCreds: creds,
      logger: noopLogger,
      now: () => new Date('2026-08-06T11:00:00Z'),
    });

    expect(result.recordingsReplaced).toBe(1);
    expect(updates[0]?.recording_graph_id).toBe('real');
  });

  it('never downgrades: a smaller late recording leaves the stored one alone', async () => {
    teamsStub.listRecordings.mockResolvedValue([
      { recordingId: 'fragment', meetingId: 'meeting-749', contentUrl: 'https://x/fragment', createdDateTime: '2026-08-06T09:50:00Z' },
    ]);
    teamsStub.downloadRecording.mockResolvedValue({
      body: webStreamOf(1_000),
      contentLength: 1_000,
      contentType: 'video/mp4',
    });
    const { prisma, updates } = makePrisma([
      classRow({
        recording_fetched_at: new Date('2026-08-06T10:20:00Z'),
        recording_graph_id: 'full-session',
        recording_size_bytes: 500_000_000n,
        attendance_fetched_at: new Date('2026-08-06T10:20:00Z'),
      }),
    ]);

    const result = await syncPendingTeamsArtifacts({
      prisma,
      storage: storageStub,
      teamsCreds: creds,
      logger: noopLogger,
      now: () => new Date('2026-08-06T11:00:00Z'),
    });

    expect(result.recordingsReplaced).toBe(0);
    expect(updates).toHaveLength(0);
  });

  it('stops re-checking once the class is older than the re-check window', async () => {
    const { prisma } = makePrisma([
      classRow({
        recording_fetched_at: new Date('2026-08-06T10:20:00Z'),
        recording_graph_id: 'stub',
        recording_size_bytes: 244_960n,
        attendance_fetched_at: new Date('2026-08-06T10:20:00Z'),
      }),
    ]);

    await syncPendingTeamsArtifacts({
      prisma,
      storage: storageStub,
      teamsCreds: creds,
      logger: noopLogger,
      now: () => new Date('2026-08-08T12:00:00Z'),
    });

    expect(teamsStub.listRecordings).not.toHaveBeenCalled();
  });
});

describe('syncPendingTeamsArtifacts attendance', () => {
  it('does not latch an attendance report that has no usable records', async () => {
    // The stray join-and-leave produced a report with zero email-bearing rows;
    // latching it left the class permanently blank.
    teamsStub.getAttendanceReports.mockResolvedValue([
      { reportId: 'r1', meetingStartDateTime: '2026-08-06T09:00:00Z', meetingEndDateTime: '2026-08-06T10:00:00Z', records: [] },
    ]);
    const { prisma, updates } = makePrisma([classRow()]);

    const result = await syncPendingTeamsArtifacts({
      prisma,
      storage: storageStub,
      teamsCreds: creds,
      logger: noopLogger,
      now: () => new Date('2026-08-06T10:20:00Z'),
    });

    expect(result.attendanceFetched).toBe(0);
    expect(updates.some((u) => 'attendance_fetched_at' in u)).toBe(false);
  });
});
