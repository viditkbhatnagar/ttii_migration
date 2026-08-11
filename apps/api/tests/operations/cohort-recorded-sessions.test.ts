// Naji UAT 2026-08-11 — "Link Existing Recorded Session": a new cohort reuses
// the recordings of an earlier cohort that taught the same subject.
//
// The three failures worth guarding are all silent:
//   1. Looking only at `recording_url` and reporting ZERO importable sessions
//      for a subject whose recordings all live on Vimeo in `video_url`. That is
//      subject 26 (Communicative English) — 59 recorded sessions, every one of
//      them video_url — i.e. the subject most likely to be used first.
//   2. Grouping by month off the session's UTC start instant, which files a
//      00:30 IST class on the 1st in the PREVIOUS month.
//   3. Importing the same month twice and silently doubling the cohort's
//      timetable, because an admin pressed the button twice.

import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  IMPORTED_SESSION_PLATFORM,
  IMPORTED_SESSION_STATUS,
  OperationsService,
  hasRecordedMedia,
  importedSourceLiveClassId,
  isImportContentionError,
  istCalendarDateString,
  istCalendarParts,
} from '../../src/operations/operations-service.js';
import { describeWithDatabase, prisma, resetParityTables } from '../data/test-db.js';

type RecordedSession = {
  id: number;
  title: string;
  date: string;
  from_time: string;
  to_time: string;
  cohort_title: string;
  source: 'teams' | 'video';
  already_imported: boolean;
};

type RecordedMonth = {
  year: number;
  month: number;
  label: string;
  session_count: number;
  already_imported: number;
  sessions: RecordedSession[];
};

type RecordedSessionsData = {
  subject_id: number | null;
  subject_title: string;
  months: RecordedMonth[];
};

type ImportData = { imported: number; skipped: number; message: string };

function recordedData(result: Record<string, unknown>): RecordedSessionsData {
  return result.data as RecordedSessionsData;
}

function importData(result: Record<string, unknown>): ImportData {
  return result.data as ImportData;
}

function allSessions(data: RecordedSessionsData): RecordedSession[] {
  return data.months.flatMap((month) => month.sessions);
}

// ---------------------------------------------------------------------------
// Pure helpers — no database, so these run everywhere including CI.
// ---------------------------------------------------------------------------

describe('recorded-session media detection', () => {
  const none = { recording_url: null, recording_storage_key: null, video_url: null };

  it('counts a legacy Vimeo video_url as a recording', () => {
    // The Communicative English shape: zero recording_url, all video_url.
    expect(hasRecordedMedia({ ...none, video_url: 'https://vimeo.com/123456' })).toBe(true);
  });

  it('counts a synced Teams recording as a recording', () => {
    expect(hasRecordedMedia({ ...none, recording_url: 'https://spaces/rec.mp4' })).toBe(true);
    expect(hasRecordedMedia({ ...none, recording_storage_key: 'recordings/2026/rec.mp4' })).toBe(true);
  });

  it('excludes a session with no media on either source', () => {
    expect(hasRecordedMedia(none)).toBe(false);
  });

  it('treats a legacy empty string as no media', () => {
    // Legacy rows store '' rather than NULL, so a `not: null` filter alone
    // would offer an unplayable session for import.
    expect(hasRecordedMedia({ recording_url: '', recording_storage_key: '', video_url: '   ' })).toBe(false);
  });
});

describe('IST month grouping', () => {
  it('reads the IST calendar day off a @db.Date with the UTC getters', () => {
    // Prisma hands a DATE back as UTC midnight of the stored day, and the
    // stored day IS the IST calendar day.
    expect(istCalendarParts(new Date(Date.UTC(2026, 4, 20)))).toEqual({ year: 2026, month: 5, day: 20 });
    expect(istCalendarDateString(new Date(Date.UTC(2026, 4, 20)))).toBe('2026-05-20');
  });

  it('keeps a 00:30 IST class on the 1st inside its own month', () => {
    // The trap: 1 Jun 2026 00:30 IST is 2026-05-31T19:00Z. Grouping off the UTC
    // start instant would file this session under May.
    const dateColumn = new Date(Date.UTC(2026, 5, 1));
    const startInstant = new Date(Date.UTC(2026, 5, 1, 0, 30) - (5 * 60 + 30) * 60 * 1000);
    expect(startInstant.toISOString()).toBe('2026-05-31T19:00:00.000Z');
    expect(startInstant.getUTCMonth() + 1).toBe(5);

    expect(istCalendarParts(dateColumn)?.month).toBe(6);
    expect(istCalendarDateString(dateColumn)).toBe('2026-06-01');
  });

  it('returns null for a row with no date instead of guessing a month', () => {
    expect(istCalendarParts(null)).toBeNull();
    expect(istCalendarParts(new Date('nonsense'))).toBeNull();
    expect(istCalendarDateString(null)).toBe('');
  });
});

describe('imported-row provenance marker', () => {
  it('reads the source session id back out of session_id', () => {
    expect(importedSourceLiveClassId('IMP-4021')).toBe(4021);
  });

  it('ignores a scheduled session id', () => {
    expect(importedSourceLiveClassId('LS-1754899200000')).toBeNull();
    expect(importedSourceLiveClassId(null)).toBeNull();
    expect(importedSourceLiveClassId('')).toBeNull();
  });

  it('refuses a malformed marker rather than parsing a prefix out of it', () => {
    // parseInt('42x') is 42 — a loose parse would dedupe against the wrong row.
    expect(importedSourceLiveClassId('IMP-')).toBeNull();
    expect(importedSourceLiveClassId('IMP-42x')).toBeNull();
    expect(importedSourceLiveClassId('IMP-0')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// End-to-end against the real schema.
// ---------------------------------------------------------------------------

const TARGET_COURSE_ID = 9101;
const PAST_COURSE_ID = 9102;

const ENGLISH_SUBJECT_ID = 9201;
const OTHER_SUBJECT_ID = 9203;

const TARGET_COHORT_ID = 9301;
const PAST_COHORT_ID = 9302;
const OTHER_SUBJECT_COHORT_ID = 9303;
const NO_SUBJECT_COHORT_ID = 9304;

const MAY_VIDEO_SESSION_ID = 9401;
const JUNE_MIDNIGHT_SESSION_ID = 9402;
const NO_MEDIA_SESSION_ID = 9403;
const UNDATED_SESSION_ID = 9404;
const OTHER_SUBJECT_SESSION_ID = 9405;
const JUNE_TEAMS_SESSION_ID = 9406;

const ADMIN_USER_ID = '9501';

function dateColumn(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function timeColumn(hour: number, minute: number): Date {
  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
}

// ---------------------------------------------------------------------------
// Stub-backed suites.
//
// These carry the four defects found in adversarial review on 2026-08-11. They
// use a stub Prisma client rather than the fixtures below deliberately: the
// database suites are SKIPPED wherever there is no mysql:// DATABASE_URL, which
// is every CI run, and a regression guard that does not run is not a guard. The
// stub also makes visible the one thing a live database hides — WHICH client
// handle each query ran on.
// ---------------------------------------------------------------------------

type StubLiveClassRow = {
  id: number;
  title: string;
  session_id: string | null;
  cohort_id: number | null;
  date: Date | null;
  fromTime: Date;
  toTime: Date;
  recording_url: string | null;
  recording_storage_key: string | null;
  recording_duration_seconds: number | null;
  video_url: string | null;
};

type StubCall = {
  /** Which handle the query actually ran on. The whole of the D2 guard. */
  client: 'base' | 'tx';
  op: 'findMany' | 'create';
  where: Record<string, unknown>;
  data: Record<string, unknown> | null;
};

type StubSeed = {
  cohort?: { id: number; title: string; subject_id: number | null; course_id: number | null } | null;
  sourceCohorts?: Array<{ id: number; title: string }>;
  /** Past sessions of the OTHER cohorts — the picker's candidates and the
   *  import's re-resolve of the posted ids both read these. */
  sourceRows?: StubLiveClassRow[];
  /** What the TARGET cohort already holds — i.e. the IMP- marker set. */
  ownRows?: Array<{ session_id: string | null }>;
  subject?: { id: number; title: string } | null;
  /** When set, $transaction rejects with this instead of running the callback. */
  transactionError?: Error;
};

function stubRow(overrides: Partial<StubLiveClassRow> & { id: number }): StubLiveClassRow {
  return {
    title: `CE Session ${overrides.id}`,
    session_id: `LS-${overrides.id}`,
    cohort_id: PAST_COHORT_ID,
    date: dateColumn(2026, 5, 20),
    fromTime: timeColumn(14, 30),
    toTime: timeColumn(16, 0),
    recording_url: null,
    recording_storage_key: null,
    recording_duration_seconds: null,
    video_url: 'https://vimeo.com/700000012',
    ...overrides,
  };
}

function makeStubPrisma(seed: StubSeed) {
  const calls: StubCall[] = [];
  const created: Array<Record<string, unknown>> = [];
  const transactionOptions: Array<Record<string, unknown>> = [];

  const cohort = seed.cohort === undefined
    ? { id: TARGET_COHORT_ID, title: 'CE Batch 3', subject_id: ENGLISH_SUBJECT_ID, course_id: TARGET_COURSE_ID }
    : seed.cohort;
  const sourceCohorts = seed.sourceCohorts ?? [{ id: PAST_COHORT_ID, title: 'CE Batch 2' }];
  const sourceRows = seed.sourceRows ?? [];
  const ownRows = seed.ownRows ?? [];
  const subject = seed.subject === undefined ? { id: ENGLISH_SUBJECT_ID, title: 'Communicative English' } : seed.subject;

  // `where.id` => the import re-resolving the posted ids; an object-valued
  // `where.cohort_id` (`{ in: [...] }`) => the picker scanning the OTHER
  // cohorts; a plain number => this cohort's own IMP- markers.
  const rowsFor = (where: Record<string, unknown>): unknown[] => {
    if ('id' in where) return sourceRows;
    const cohortId = where.cohort_id;
    if (cohortId !== null && typeof cohortId === 'object') return sourceRows;
    return ownRows;
  };

  const liveClassOn = (client: 'base' | 'tx') => ({
    findMany: (args?: { where?: Record<string, unknown> }) => {
      const where = args?.where ?? {};
      calls.push({ client, op: 'findMany', where, data: null });
      return Promise.resolve(rowsFor(where));
    },
    create: (args: { data: Record<string, unknown> }) => {
      calls.push({ client, op: 'create', where: {}, data: args.data });
      created.push(args.data);
      return Promise.resolve({ id: 10_000 + created.length });
    },
  });

  const stub = {
    cohorts: {
      findFirst: () => Promise.resolve(cohort),
      findMany: () => Promise.resolve(sourceCohorts),
    },
    subject: { findFirst: () => Promise.resolve(subject) },
    live_class: liveClassOn('base'),
    $transaction: (
      callback: (tx: unknown) => Promise<unknown>,
      options?: Record<string, unknown>,
    ): Promise<unknown> => {
      transactionOptions.push(options ?? {});
      if (seed.transactionError !== undefined) return Promise.reject(seed.transactionError);
      return callback({ live_class: liveClassOn('tx') });
    },
  };

  return {
    prisma: stub as unknown as PrismaClient,
    calls,
    created,
    transactionOptions,
    /** The read of this cohort's existing IMP- markers — the read that decides
     *  whether a session is imported again. */
    markerReads: () => calls.filter((call) => call.op === 'findMany' && !('id' in call.where)
      && typeof call.where.cohort_id === 'number'),
    creates: () => calls.filter((call) => call.op === 'create'),
  };
}

const MAY_ROW = stubRow({ id: MAY_VIDEO_SESSION_ID, title: 'CE Session 12', date: dateColumn(2026, 5, 20) });
const JUNE_TEAMS_ROW = stubRow({
  id: JUNE_TEAMS_SESSION_ID,
  title: 'CE Session 15',
  date: dateColumn(2026, 6, 2),
  fromTime: timeColumn(10, 0),
  toTime: timeColumn(11, 30),
  video_url: null,
  recording_url: 'https://ttii-lms-recordings.sgp1.digitaloceanspaces.com/ce-15.mp4',
  recording_storage_key: 'recordings/2026/06/ce-15.mp4',
  recording_duration_seconds: 5280,
});
/** Production HAS these — the picker counts them and refuses to bucket them. */
const UNDATED_ROW = stubRow({ id: UNDATED_SESSION_ID, title: 'CE ad-hoc session', date: null });

describe('import writes are serialized against the already-imported read (D2)', () => {
  it('runs the marker read AND every insert on the transaction handle, at Serializable', async () => {
    // Two admins pressing "Import all 18" on the same LIVE cohort inside the
    // same second both read zero markers and both loops insert: 36 rows where
    // 18 classes ran, every enrolled student sees the duplicates, and
    // re-running the import does not clean up — it only skips. There is no
    // unique constraint to lean on and no DDL allowed, so the read and the
    // writes have to sit inside one Serializable transaction, whose range locks
    // stop the second insert landing against a stale read.
    const stub = makeStubPrisma({ sourceRows: [MAY_ROW, JUNE_TEAMS_ROW], ownRows: [] });
    const service = new OperationsService(stub.prisma);

    const result = await service.importCohortRecordedSessions(
      ADMIN_USER_ID,
      String(TARGET_COHORT_ID),
      [MAY_VIDEO_SESSION_ID, JUNE_TEAMS_SESSION_ID],
    );
    expect(importData(result)).toMatchObject({ imported: 2, skipped: 0 });

    expect(stub.transactionOptions).toHaveLength(1);
    expect(stub.transactionOptions[0]?.isolationLevel).toBe('Serializable');

    // The read that decides "already imported?" must be inside — reading it on
    // the base client is exactly the stale read the fix exists to prevent.
    expect(stub.markerReads().map((call) => call.client)).toEqual(['tx']);

    // ...and every insert on that same handle. One stray `this.prisma.create`
    // in the loop would commit outside the transaction and silently defeat it.
    expect(stub.creates()).toHaveLength(2);
    expect(stub.creates().every((call) => call.client === 'tx')).toBe(true);
    expect(stub.calls.some((call) => call.client === 'base' && call.op === 'create')).toBe(false);
  });

  it('still reports imported/skipped/rejected per row from inside the transaction', async () => {
    const stub = makeStubPrisma({
      sourceRows: [MAY_ROW, JUNE_TEAMS_ROW],
      // May is already linked; the picker would grey it out, but the POST has
      // to survive a stale client sending it anyway.
      ownRows: [{ session_id: `IMP-${MAY_VIDEO_SESSION_ID}` }],
    });
    const service = new OperationsService(stub.prisma);

    const result = await service.importCohortRecordedSessions(
      ADMIN_USER_ID,
      String(TARGET_COHORT_ID),
      [MAY_VIDEO_SESSION_ID, JUNE_TEAMS_SESSION_ID, 999_999],
    );

    expect(result.status).toBe(1);
    expect(importData(result)).toMatchObject({ imported: 1, skipped: 1 });
    expect(importData(result).message).toContain('already linked');
    expect(importData(result).message).toContain('could not be linked');
    expect(stub.created).toHaveLength(1);
  });

  it('answers a lost Serializable race with a retry sentence, not a 500', async () => {
    // InnoDB rolls one of two racing transactions back as the deadlock victim.
    // Nothing was written by the loser, so the honest answer is "retry" — a raw
    // Prisma error reaching sendOperationsError would be a 500 with a P-code in
    // it, which no admin can act on.
    const deadlock = new Prisma.PrismaClientKnownRequestError(
      'Transaction failed due to a write conflict or a deadlock. Please retry your transaction',
      { code: 'P2034', clientVersion: '6.16.2' },
    );
    const stub = makeStubPrisma({ sourceRows: [MAY_ROW], ownRows: [], transactionError: deadlock });
    const service = new OperationsService(stub.prisma);

    const result = await service.importCohortRecordedSessions(
      ADMIN_USER_ID,
      String(TARGET_COHORT_ID),
      [MAY_VIDEO_SESSION_ID],
    );

    expect(result.status).toBe(0);
    expect(String(result.message).toLowerCase()).toContain('retry');
    expect(importData(result)).toMatchObject({ imported: 0, skipped: 0 });
    expect(stub.created).toHaveLength(0);
  });

  it('does not swallow an unrelated failure as contention', async () => {
    const stub = makeStubPrisma({
      sourceRows: [MAY_ROW],
      ownRows: [],
      transactionError: new Error('connection refused'),
    });
    const service = new OperationsService(stub.prisma);

    await expect(
      service.importCohortRecordedSessions(ADMIN_USER_ID, String(TARGET_COHORT_ID), [MAY_VIDEO_SESSION_ID]),
    ).rejects.toThrow('connection refused');
  });

  it('recognises contention however the driver reports it', () => {
    expect(isImportContentionError(new Error('Deadlock found when trying to get lock'))).toBe(true);
    expect(isImportContentionError(new Error('Lock wait timeout exceeded; try restarting transaction'))).toBe(true);
    expect(isImportContentionError(new Error('Table does not exist'))).toBe(false);
    expect(isImportContentionError(null)).toBe(false);
  });
});

describe('server-side eligibility repeats every picker rule (D3)', () => {
  it('refuses a recorded session that has no date, exactly as the picker does', async () => {
    // Not reachable from the UI — which is the point: this is the "validate
    // session_ids server-side, do not trust the client" path. A copied NULL
    // date makes engagement-service report status 'upcoming' with no join
    // window, so every student in the cohort gets a permanent phantom class
    // reading "Join link not available yet" that can never age out.
    const stub = makeStubPrisma({ sourceRows: [UNDATED_ROW], ownRows: [] });
    const service = new OperationsService(stub.prisma);

    const result = await service.importCohortRecordedSessions(
      ADMIN_USER_ID,
      String(TARGET_COHORT_ID),
      [UNDATED_SESSION_ID],
    );

    expect(result.status).toBe(0);
    expect(importData(result)).toMatchObject({ imported: 0, skipped: 0 });
    expect(importData(result).message).toContain('could not be linked');
    expect(stub.created).toHaveLength(0);
  });

  it('imports the dated sessions of a mixed list and never writes a null date', async () => {
    const stub = makeStubPrisma({ sourceRows: [UNDATED_ROW, MAY_ROW], ownRows: [] });
    const service = new OperationsService(stub.prisma);

    const result = await service.importCohortRecordedSessions(
      ADMIN_USER_ID,
      String(TARGET_COHORT_ID),
      [UNDATED_SESSION_ID, MAY_VIDEO_SESSION_ID],
    );

    expect(importData(result).imported).toBe(1);
    expect(stub.created).toHaveLength(1);
    expect(stub.created[0]?.session_id).toBe(`IMP-${MAY_VIDEO_SESSION_ID}`);
    expect(stub.created.every((row) => row.date instanceof Date)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cross-tier contracts.
//
// The admin page is the only consumer of two things this service produces: the
// imported-row marker, and the envelope message that reports rows the picker
// left out. Both were broken in the first cut and neither is observable from
// either side alone, so the web client is loaded by path and exercised against
// this service's real output. The import specifier is computed rather than
// literal on purpose — a static import would pull apps/web into apps/api's
// TypeScript project (TS6307) and break `npm run typecheck`.
// ---------------------------------------------------------------------------

type WebAdminApiModule = {
  IMPORTED_LIVE_SESSION_PLATFORM: string;
  isImportedLiveSession: (session: Record<string, unknown>) => boolean;
  externalRecordingUrl: (value: unknown) => string;
  AdminPortalApi: new (apiClient: { request: (options: unknown) => Promise<unknown> }) => {
    listCohortRecordedSessions: (
      authToken: string,
      cohortId: string,
    ) => Promise<{ subjectId: string; subjectTitle: string; notice: string; months: unknown[] }>;
  };
};

async function loadWebAdminApi(): Promise<WebAdminApiModule> {
  const here = dirname(fileURLToPath(import.meta.url));
  const specifier = pathToFileURL(resolve(here, '../../../web/src/admin/admin-portal-api.ts')).href;
  return await (import(specifier) as Promise<WebAdminApiModule>);
}

describe('imported-row marker is one value on both tiers (D1)', () => {
  it('marks a created row with the exact string the admin page tests for', async () => {
    const stub = makeStubPrisma({ sourceRows: [JUNE_TEAMS_ROW], ownRows: [] });
    const service = new OperationsService(stub.prisma);
    await service.importCohortRecordedSessions(ADMIN_USER_ID, String(TARGET_COHORT_ID), [JUNE_TEAMS_SESSION_ID]);

    const web = await loadWebAdminApi();
    const row = stub.created[0];
    expect(row).toBeDefined();

    // The row the service actually wrote, through the predicate the admin page
    // actually renders the "Linked" badge from. The first cut wrote 'recorded'
    // on `platform` while the page tested 'imported' on `platform` OR
    // `live_type` (an Int the import never sets), so this was false in
    // production and an imported session looked identical to one the cohort
    // had run.
    expect(web.isImportedLiveSession(row as Record<string, unknown>)).toBe(true);
    expect(web.IMPORTED_LIVE_SESSION_PLATFORM).toBe(IMPORTED_SESSION_PLATFORM);
    expect(row?.platform).toBe(IMPORTED_SESSION_PLATFORM);
    expect(row?.status).toBe(IMPORTED_SESSION_STATUS);

    // 'recorded' is load-bearing, not decorative: teams-artifacts-sync and
    // certificate-service both select platform='teams', so a copy must never
    // claim to be one. And the first cut's marker must not quietly start
    // working again in its place.
    expect(row?.platform).not.toBe('teams');
    expect(web.isImportedLiveSession({ platform: 'imported' })).toBe(false);
    expect(web.isImportedLiveSession({ platform: 'teams', live_type: 'imported' })).toBe(false);
    expect(web.isImportedLiveSession({ platform: 'teams' })).toBe(false);
  });
});

describe('a recording link is only opened when it is an absolute web address', () => {
  it('rejects anything window.open would resolve against the admin host', async () => {
    const web = await loadWebAdminApi();

    // The imported copies make video_url rows the common case on this screen,
    // and a legacy video_url holds whatever was typed into it years ago.
    expect(web.externalRecordingUrl('https://vimeo.com/700000012')).toBe('https://vimeo.com/700000012');
    expect(web.externalRecordingUrl('HTTP://player.vimeo.com/video/1')).toBe('HTTP://player.vimeo.com/video/1');
    expect(web.externalRecordingUrl('  https://vimeo.com/1  ')).toBe('https://vimeo.com/1');

    expect(web.externalRecordingUrl('uploads/recordings/ce-15.mp4')).toBe('');
    expect(web.externalRecordingUrl('/uploads/ce-15.mp4')).toBe('');
    expect(web.externalRecordingUrl('700000012')).toBe('');
    expect(web.externalRecordingUrl('to be uploaded')).toBe('');
    expect(web.externalRecordingUrl(null)).toBe('');
    expect(web.externalRecordingUrl(undefined)).toBe('');
  });
});

describe('undated-session report reaches the admin (D4)', () => {
  const undatedHistorySeed: StubSeed = {
    sourceRows: [MAY_ROW, UNDATED_ROW],
    ownRows: [],
  };

  it('carries the envelope message through the web client as a notice', async () => {
    const service = new OperationsService(makeStubPrisma(undatedHistorySeed).prisma);
    const envelope = await service.listCohortRecordedSessions(String(TARGET_COHORT_ID));

    // The service deliberately REPORTS undated rows rather than dropping them
    // silently...
    expect(String(envelope.message)).toContain('no date on record');
    expect(recordedData(envelope).months).toHaveLength(1);

    // ...and the web client has to carry that sentence, or the admin just sees
    // a month list that is quietly short.
    const web = await loadWebAdminApi();
    const client = new web.AdminPortalApi({ request: () => Promise.resolve(envelope) });
    const history = await client.listCohortRecordedSessions('token', String(TARGET_COHORT_ID));

    expect(history.notice).toBe(envelope.message);
    expect(history.months).toHaveLength(1);
    expect(history.subjectTitle).toBe('Communicative English');
  });

  it('does not surface the envelope no-op sentinel as a message to the admin', async () => {
    // Nothing was dropped, so `message` is the legacy 'success' sentinel — that
    // is not a sentence and must never be rendered as one.
    const service = new OperationsService(makeStubPrisma({ sourceRows: [MAY_ROW], ownRows: [] }).prisma);
    const envelope = await service.listCohortRecordedSessions(String(TARGET_COHORT_ID));
    expect(envelope.message).toBe('success');

    const web = await loadWebAdminApi();
    const client = new web.AdminPortalApi({ request: () => Promise.resolve(envelope) });
    const history = await client.listCohortRecordedSessions('token', String(TARGET_COHORT_ID));

    expect(history.notice).toBe('');
    expect(history.months).toHaveLength(1);
  });
});

describeWithDatabase('cohort recorded-session linking', () => {
  const operationsService = new OperationsService(prisma);

  beforeEach(async () => {
    await resetParityTables();

    await prisma.course.createMany({
      data: [
        { id: TARGET_COURSE_ID, title: 'Diploma in Early Childhood (2026)' },
        { id: PAST_COURSE_ID, title: 'Diploma in Early Childhood (2025)' },
      ],
    });

    await prisma.subject.createMany({
      data: [
        { id: ENGLISH_SUBJECT_ID, title: 'Communicative English', free: 'off' },
        { id: OTHER_SUBJECT_ID, title: 'Child Care and Health', free: 'off' },
      ],
    });

    await prisma.cohorts.createMany({
      data: [
        { id: TARGET_COHORT_ID, title: 'CE Batch 3', course_id: TARGET_COURSE_ID, subject_id: ENGLISH_SUBJECT_ID },
        { id: PAST_COHORT_ID, title: 'CE Batch 2', course_id: PAST_COURSE_ID, subject_id: ENGLISH_SUBJECT_ID },
        { id: OTHER_SUBJECT_COHORT_ID, title: 'CCH Batch 1', course_id: PAST_COURSE_ID, subject_id: OTHER_SUBJECT_ID },
        // A legacy cohort with no subject at all — production has these.
        { id: NO_SUBJECT_COHORT_ID, title: 'Unassigned Batch', course_id: TARGET_COURSE_ID },
      ],
    });

    await prisma.live_class.createMany({
      data: [
        {
          id: MAY_VIDEO_SESSION_ID,
          cohort_id: PAST_COHORT_ID,
          title: 'CE Session 12',
          course_id: String(PAST_COURSE_ID),
          date: dateColumn(2026, 5, 20),
          fromTime: timeColumn(14, 30),
          toTime: timeColumn(16, 0),
          status: 'scheduled',
          platform: 'zoom',
          // Vimeo only — no recording_url anywhere on this subject.
          video_url: 'https://vimeo.com/700000012',
        },
        {
          id: JUNE_MIDNIGHT_SESSION_ID,
          cohort_id: PAST_COHORT_ID,
          title: 'CE Session 13 (late night)',
          course_id: String(PAST_COURSE_ID),
          date: dateColumn(2026, 6, 1),
          fromTime: timeColumn(0, 30),
          toTime: timeColumn(2, 0),
          status: 'scheduled',
          platform: 'zoom',
          video_url: 'https://vimeo.com/700000013',
        },
        {
          id: NO_MEDIA_SESSION_ID,
          cohort_id: PAST_COHORT_ID,
          title: 'CE Session 14 (never recorded)',
          course_id: String(PAST_COURSE_ID),
          date: dateColumn(2026, 5, 21),
          fromTime: timeColumn(14, 30),
          toTime: timeColumn(16, 0),
          status: 'scheduled',
          platform: 'zoom',
        },
        {
          id: UNDATED_SESSION_ID,
          cohort_id: PAST_COHORT_ID,
          title: 'CE ad-hoc session',
          course_id: String(PAST_COURSE_ID),
          date: null,
          fromTime: timeColumn(14, 30),
          toTime: timeColumn(16, 0),
          status: 'scheduled',
          platform: 'zoom',
          video_url: 'https://vimeo.com/700000099',
        },
        {
          id: JUNE_TEAMS_SESSION_ID,
          cohort_id: PAST_COHORT_ID,
          title: 'CE Session 15',
          course_id: String(PAST_COURSE_ID),
          date: dateColumn(2026, 6, 2),
          fromTime: timeColumn(10, 0),
          toTime: timeColumn(11, 30),
          status: 'scheduled',
          platform: 'teams',
          recording_url: 'https://ttii-lms-recordings.sgp1.digitaloceanspaces.com/ce-15.mp4',
          recording_storage_key: 'recordings/2026/06/ce-15.mp4',
          recording_duration_seconds: 5280,
        },
        {
          id: OTHER_SUBJECT_SESSION_ID,
          cohort_id: OTHER_SUBJECT_COHORT_ID,
          title: 'CCH Session 4',
          course_id: String(PAST_COURSE_ID),
          date: dateColumn(2026, 5, 20),
          fromTime: timeColumn(10, 0),
          toTime: timeColumn(11, 30),
          status: 'scheduled',
          platform: 'teams',
          recording_url: 'https://ttii-lms-recordings.sgp1.digitaloceanspaces.com/cch-4.mp4',
        },
      ],
    });
  });

  it('finds sessions whose only recording is a Vimeo video_url', async () => {
    // The Communicative English regression: a reader that only looks at
    // recording_url reports this subject as having nothing to import.
    const result = await operationsService.listCohortRecordedSessions(String(TARGET_COHORT_ID));
    const data = recordedData(result);

    expect(result.status).toBe(1);
    expect(data.subject_id).toBe(ENGLISH_SUBJECT_ID);
    expect(data.subject_title).toBe('Communicative English');

    const sessions = allSessions(data);
    expect(sessions.map((s) => s.id).sort((a, b) => a - b)).toEqual([
      MAY_VIDEO_SESSION_ID,
      JUNE_MIDNIGHT_SESSION_ID,
      JUNE_TEAMS_SESSION_ID,
    ]);

    const vimeoSession = sessions.find((s) => s.id === MAY_VIDEO_SESSION_ID);
    expect(vimeoSession?.source).toBe('video');
    expect(vimeoSession?.cohort_title).toBe('CE Batch 2');
    expect(vimeoSession?.from_time).toBe('14:30:00');

    expect(sessions.find((s) => s.id === JUNE_TEAMS_SESSION_ID)?.source).toBe('teams');
  });

  it('never offers a session with no recording on either source', async () => {
    const data = recordedData(await operationsService.listCohortRecordedSessions(String(TARGET_COHORT_ID)));
    expect(allSessions(data).map((s) => s.id)).not.toContain(NO_MEDIA_SESSION_ID);
  });

  it('groups by IST month, keeping a 00:30 class on the 1st out of the previous month', async () => {
    const data = recordedData(await operationsService.listCohortRecordedSessions(String(TARGET_COHORT_ID)));

    // Newest month first.
    expect(data.months.map((m) => m.label)).toEqual(['June 2026', 'May 2026']);

    const june = data.months.find((m) => m.year === 2026 && m.month === 6);
    const may = data.months.find((m) => m.year === 2026 && m.month === 5);
    expect(june?.session_count).toBe(2);
    expect(june?.sessions.map((s) => s.id)).toContain(JUNE_MIDNIGHT_SESSION_ID);
    expect(may?.session_count).toBe(1);
    expect(may?.sessions.map((s) => s.id)).not.toContain(JUNE_MIDNIGHT_SESSION_ID);
    expect(june?.sessions.find((s) => s.id === JUNE_MIDNIGHT_SESSION_ID)?.date).toBe('2026-06-01');
  });

  it('leaves an undated session out of the month buckets and says so', async () => {
    const result = await operationsService.listCohortRecordedSessions(String(TARGET_COHORT_ID));
    expect(allSessions(recordedData(result)).map((s) => s.id)).not.toContain(UNDATED_SESSION_ID);
    expect(String(result.message)).toContain('no date on record');
  });

  it('returns empty months and a readable message when the cohort has no subject', async () => {
    const result = await operationsService.listCohortRecordedSessions(String(NO_SUBJECT_COHORT_ID));
    expect(result.status).toBe(1);
    expect(recordedData(result).months).toEqual([]);
    expect(recordedData(result).subject_id).toBeNull();
    expect(String(result.message)).toContain('no subject');
  });

  it('copies the recording reference onto the target cohort without touching the source', async () => {
    const result = await operationsService.importCohortRecordedSessions(
      ADMIN_USER_ID,
      String(TARGET_COHORT_ID),
      [MAY_VIDEO_SESSION_ID, JUNE_TEAMS_SESSION_ID],
    );
    expect(result.status).toBe(1);
    expect(importData(result).imported).toBe(2);

    const copies = await prisma.live_class.findMany({
      where: { cohort_id: TARGET_COHORT_ID, deleted_at: null },
      orderBy: { id: 'asc' },
    });
    expect(copies).toHaveLength(2);

    const teamsCopy = copies.find((row) => row.session_id === `IMP-${JUNE_TEAMS_SESSION_ID}`);
    expect(teamsCopy).toBeDefined();
    expect(teamsCopy?.recording_url).toBe('https://ttii-lms-recordings.sgp1.digitaloceanspaces.com/ce-15.mp4');
    expect(teamsCopy?.recording_storage_key).toBe('recordings/2026/06/ce-15.mp4');
    expect(teamsCopy?.recording_duration_seconds).toBe(5280);
    expect(teamsCopy?.title).toBe('CE Session 15');
    // The TARGET cohort's course, not the source's.
    expect(teamsCopy?.course_id).toBe(String(TARGET_COURSE_ID));
    // No meeting behind an imported row, and nothing that a Teams-scoped query
    // (artifacts sync, attendance denominator) can mistake for a live class.
    expect(teamsCopy?.platform).toBe('recorded');
    expect(teamsCopy?.status).toBe('recorded');
    expect(teamsCopy?.join_url).toBeNull();
    expect(teamsCopy?.external_meeting_id).toBeNull();
    expect(teamsCopy?.host_email).toBeNull();
    expect(teamsCopy?.zoom_id).toBeNull();
    expect(teamsCopy?.password).toBeNull();
    // The IST wall clock survives the copy.
    expect(teamsCopy?.date?.toISOString()).toBe('2026-06-02T00:00:00.000Z');
    expect(teamsCopy?.fromTime.getUTCHours()).toBe(10);

    const vimeoCopy = copies.find((row) => row.session_id === `IMP-${MAY_VIDEO_SESSION_ID}`);
    expect(vimeoCopy?.video_url).toBe('https://vimeo.com/700000012');

    // Source rows are untouched — the old cohort keeps its sessions exactly.
    const source = await prisma.live_class.findFirst({ where: { id: JUNE_TEAMS_SESSION_ID } });
    expect(source?.cohort_id).toBe(PAST_COHORT_ID);
    expect(source?.platform).toBe('teams');
    expect(source?.deleted_at).toBeNull();
  });

  it('re-importing the same month is a no-op', async () => {
    const monthIds = [JUNE_MIDNIGHT_SESSION_ID, JUNE_TEAMS_SESSION_ID];

    const first = await operationsService.importCohortRecordedSessions(ADMIN_USER_ID, String(TARGET_COHORT_ID), monthIds);
    expect(importData(first)).toMatchObject({ imported: 2, skipped: 0 });

    const second = await operationsService.importCohortRecordedSessions(ADMIN_USER_ID, String(TARGET_COHORT_ID), monthIds);
    expect(second.status).toBe(1);
    expect(importData(second)).toMatchObject({ imported: 0, skipped: 2 });
    expect(importData(second).message).toContain('already linked');

    expect(await prisma.live_class.count({ where: { cohort_id: TARGET_COHORT_ID, deleted_at: null } })).toBe(2);
  });

  it('does not duplicate when the same id arrives twice in one request', async () => {
    const result = await operationsService.importCohortRecordedSessions(
      ADMIN_USER_ID,
      String(TARGET_COHORT_ID),
      [MAY_VIDEO_SESSION_ID, MAY_VIDEO_SESSION_ID],
    );
    expect(importData(result).imported).toBe(1);
    expect(await prisma.live_class.count({ where: { cohort_id: TARGET_COHORT_ID, deleted_at: null } })).toBe(1);
  });

  it('reports what is already imported so the picker can grey it out', async () => {
    await operationsService.importCohortRecordedSessions(ADMIN_USER_ID, String(TARGET_COHORT_ID), [MAY_VIDEO_SESSION_ID]);

    const data = recordedData(await operationsService.listCohortRecordedSessions(String(TARGET_COHORT_ID)));
    const may = data.months.find((m) => m.month === 5);
    const june = data.months.find((m) => m.month === 6);
    expect(may?.already_imported).toBe(1);
    expect(may?.sessions.find((s) => s.id === MAY_VIDEO_SESSION_ID)?.already_imported).toBe(true);
    expect(june?.already_imported).toBe(0);

    // The copy sits on the TARGET cohort, which the picker excludes, so it must
    // not come back as an importable source for itself — still three sources.
    expect(allSessions(data)).toHaveLength(3);
  });

  it('never re-offers another cohort imported copy as a source', async () => {
    // Cohort B imports May from cohort A; a third cohort of the same subject
    // must still see ONE May session, not the original plus B's copy of it —
    // otherwise it could import the same recording twice.
    await prisma.cohorts.create({
      data: { id: 9305, title: 'CE Batch 4', course_id: TARGET_COURSE_ID, subject_id: ENGLISH_SUBJECT_ID },
    });
    await operationsService.importCohortRecordedSessions(ADMIN_USER_ID, String(TARGET_COHORT_ID), [MAY_VIDEO_SESSION_ID]);

    const data = recordedData(await operationsService.listCohortRecordedSessions('9305'));
    const may = data.months.find((m) => m.month === 5);
    expect(may?.session_count).toBe(1);
    expect(may?.sessions.map((s) => s.id)).toEqual([MAY_VIDEO_SESSION_ID]);

    // And the copy cannot be imported by id either.
    const copy = await prisma.live_class.findFirst({
      where: { cohort_id: TARGET_COHORT_ID, session_id: `IMP-${MAY_VIDEO_SESSION_ID}` },
      select: { id: true },
    });
    const result = await operationsService.importCohortRecordedSessions(ADMIN_USER_ID, '9305', [copy?.id ?? 0]);
    expect(result.status).toBe(0);
    expect(importData(result).imported).toBe(0);
  });

  it('rejects ids that are not recorded sessions of this cohort subject', async () => {
    const otherSubject = await operationsService.importCohortRecordedSessions(
      ADMIN_USER_ID,
      String(TARGET_COHORT_ID),
      [OTHER_SUBJECT_SESSION_ID],
    );
    expect(otherSubject.status).toBe(0);
    expect(importData(otherSubject)).toMatchObject({ imported: 0, skipped: 0 });
    expect(importData(otherSubject).message).toContain('could not be linked');

    const noMedia = await operationsService.importCohortRecordedSessions(
      ADMIN_USER_ID,
      String(TARGET_COHORT_ID),
      [NO_MEDIA_SESSION_ID],
    );
    expect(noMedia.status).toBe(0);
    expect(importData(noMedia).imported).toBe(0);

    expect(await prisma.live_class.count({ where: { cohort_id: TARGET_COHORT_ID, deleted_at: null } })).toBe(0);
  });

  it('never writes a live_class row with a NULL date', async () => {
    // The undated fixture is a perfectly good recorded session of the right
    // subject — the ONLY thing wrong with it is that it cannot be filed under a
    // month, which is exactly why the picker refuses to list it and the POST
    // has to refuse it too. A copied NULL date reads as a permanent 'upcoming'
    // class with no join link for every student in the cohort.
    const result = await operationsService.importCohortRecordedSessions(
      ADMIN_USER_ID,
      String(TARGET_COHORT_ID),
      [UNDATED_SESSION_ID, MAY_VIDEO_SESSION_ID],
    );
    expect(importData(result).imported).toBe(1);

    const copies = await prisma.live_class.findMany({ where: { cohort_id: TARGET_COHORT_ID, deleted_at: null } });
    expect(copies).toHaveLength(1);
    expect(copies[0]?.session_id).toBe(`IMP-${MAY_VIDEO_SESSION_ID}`);
    expect(copies.every((row) => row.date !== null)).toBe(true);
  });

  it('imports the valid part of a mixed list and reports the rest', async () => {
    const result = await operationsService.importCohortRecordedSessions(
      ADMIN_USER_ID,
      String(TARGET_COHORT_ID),
      [MAY_VIDEO_SESSION_ID, OTHER_SUBJECT_SESSION_ID],
    );
    expect(result.status).toBe(1);
    expect(importData(result).imported).toBe(1);
    expect(importData(result).message).toContain('could not be linked');
  });
});
