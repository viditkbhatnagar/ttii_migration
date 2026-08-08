import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type { PrismaClient } from '@prisma/client';

import type { StorageProvider } from '../integrations/contracts.js';
import type {
  TeamsAttendanceReport,
  TeamsMeetingService,
  TeamsRecording,
} from '../integrations/teams-meeting-service.js';
import { createTeamsMeetingService } from '../integrations/teams-meeting-service.js';

export interface TeamsArtifactsSyncLogger {
  info(event: string, fields?: Record<string, unknown>): void;
  warn(event: string, fields?: Record<string, unknown>): void;
  error(event: string, fields?: Record<string, unknown>): void;
}

export interface TeamsArtifactsSyncDeps {
  prisma: PrismaClient;
  storage: StorageProvider;
  teamsCreds: {
    clientId: string | undefined;
    clientSecret: string | undefined;
    tenantId: string | undefined;
  };
  logger: TeamsArtifactsSyncLogger;
  /** Max live_class rows to process per run. Default 20. */
  batchSize?: number;
  /** How far back to look for unsynced meetings. Default 7 days. */
  retryWindowDays?: number;
  /** Minutes to wait after a class's scheduled end before fetching. Default 15. */
  postClassGraceMinutes?: number;
  /** How long after the first fetch we keep re-checking for a better recording. Default 24h. */
  recheckWindowHours?: number;
  /** Clock injection for tests. */
  now?: () => Date;
}

export interface TeamsArtifactsSyncResult {
  candidateCount: number;
  recordingsFetched: number;
  attendanceFetched: number;
  recordingErrors: number;
  attendanceErrors: number;
  /** Rows skipped because the class hasn't finished yet (+ grace). */
  notEndedYet: number;
  /** Stored recordings swapped for a larger one found on a later pass. */
  recordingsReplaced: number;
}

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_RETRY_WINDOW_DAYS = 7;
const DEFAULT_POST_CLASS_GRACE_MINUTES = 15;
const DEFAULT_RECHECK_WINDOW_HOURS = 24;

/** Meeting times on live_class are IST wall clock; the server runs UTC. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * A recording created before the class started belongs to a *different* Teams
 * session on the same meeting link — someone opening the join URL early. With
 * recordAutomatically=true + lobbyBypass 'everyone', any such click starts the
 * meeting AND the recording, so these strays are routine. 30 min of slack lets
 * a trainer who starts early still match.
 */
const PRE_CLASS_TOLERANCE_MS = 30 * 60 * 1000;

/**
 * Recording ids we downloaded and then rejected as smaller than what's already
 * stored. Without this the re-check pass would re-download the same losing
 * segment every 5 minutes for a day. Per-process; a restart just re-checks once.
 */
const rejectedRecordings = new Set<string>();
const REJECTED_CACHE_LIMIT = 500;

/**
 * One-pass sync of Microsoft Teams recordings + attendance reports for
 * recently-ended live classes. Idempotent: safe to invoke every 5 minutes.
 *
 * Candidate rows: platform='teams', scheduled `date` within
 * [now-retryWindow, now], with either recording_fetched_at or
 * attendance_fetched_at still NULL, and a non-null external_meeting_id +
 * host_email.
 *
 * NOTE: we filter on `date` (the always-populated class date), NOT `toDate`.
 * The admin live-session flow only sets `date`; `toDate`/`fromDate` are left
 * NULL for single-day classes, so filtering on `toDate` silently skipped every
 * normally-created Teams class (only a hand-crafted test row had toDate set).
 *
 * Risha UAT 2026-08-06 — `date <= now` alone made a row eligible from 00:00
 * UTC on its date, i.e. 05:30 IST, hours before an afternoon/evening class had
 * even happened. The first tick after midnight UTC grabbed whatever stray
 * artifact Teams happened to hold (live_class 749 latched a 239 KB recording
 * created the PREVIOUS DAY), set recording_fetched_at, and — because the
 * candidate query required that column to be NULL — the row was never revisited,
 * so the trainer's real recording was lost forever. Three guards now:
 *   1. never look before the class's scheduled end (IST->UTC) + grace;
 *   2. ignore recordings created before the class window started;
 *   3. keep re-checking for `recheckWindowHours` and swap in a LARGER
 *      recording if Teams publishes one late (largest wins, never downgrades).
 *
 * Errors are isolated per row and per artifact (recording vs attendance).
 * On failure we set *_fetch_error but do NOT set *_fetched_at — so the next
 * cron run will retry until the retry window expires.
 */
export async function syncPendingTeamsArtifacts(
  deps: TeamsArtifactsSyncDeps,
): Promise<TeamsArtifactsSyncResult> {
  const teams = createTeamsMeetingService({
    clientId: deps.teamsCreds.clientId,
    clientSecret: deps.teamsCreds.clientSecret,
    tenantId: deps.teamsCreds.tenantId,
  });
  if (!teams) {
    deps.logger.warn('teams-artifacts-sync.skipped', {
      reason: 'Teams M365 credentials not configured (EMAIL_MSGRAPH_*)',
    });
    return {
      candidateCount: 0,
      recordingsFetched: 0,
      attendanceFetched: 0,
      recordingErrors: 0,
      attendanceErrors: 0,
      notEndedYet: 0,
      recordingsReplaced: 0,
    };
  }

  const now = deps.now?.() ?? new Date();
  const retryWindowDays = deps.retryWindowDays ?? DEFAULT_RETRY_WINDOW_DAYS;
  const windowStart = new Date(now.getTime() - retryWindowDays * 24 * 60 * 60 * 1000);
  const batchSize = deps.batchSize ?? DEFAULT_BATCH_SIZE;
  const graceMs = (deps.postClassGraceMinutes ?? DEFAULT_POST_CLASS_GRACE_MINUTES) * 60 * 1000;
  const recheckMs = (deps.recheckWindowHours ?? DEFAULT_RECHECK_WINDOW_HOURS) * 60 * 60 * 1000;
  const recheckCutoff = new Date(now.getTime() - recheckMs);

  const candidates = await deps.prisma.live_class.findMany({
    where: {
      platform: 'teams',
      external_meeting_id: { not: null },
      host_email: { not: null },
      date: { gte: windowStart, lte: now },
      OR: [
        { recording_fetched_at: null },
        { attendance_fetched_at: null },
        // Third arm: a class we already fetched but that ended recently enough
        // that Teams may still publish a better (longer) recording.
        { recording_fetched_at: { gte: recheckCutoff } },
      ],
      deleted_at: null,
    },
    select: {
      id: true,
      external_meeting_id: true,
      host_email: true,
      fromTime: true,
      toTime: true,
      date: true,
      recording_fetched_at: true,
      attendance_fetched_at: true,
      recording_graph_id: true,
      recording_size_bytes: true,
    },
    orderBy: { date: 'desc' },
    take: batchSize,
  });

  const result: TeamsArtifactsSyncResult = {
    candidateCount: candidates.length,
    recordingsFetched: 0,
    attendanceFetched: 0,
    recordingErrors: 0,
    attendanceErrors: 0,
    notEndedYet: 0,
    recordingsReplaced: 0,
  };

  if (candidates.length === 0) {
    return result;
  }

  deps.logger.info('teams-artifacts-sync.start', {
    candidates: candidates.length,
    windowStart: windowStart.toISOString(),
  });

  for (const row of candidates) {
    if (!row.external_meeting_id || !row.host_email) continue;

    // Gate on the class actually being over. `date` alone flips true at 00:00
    // UTC = 05:30 IST, long before the session runs.
    const window = computeClassWindowUtc(row.date, row.fromTime, row.toTime);
    if (window === null || now.getTime() < window.endMs + graceMs) {
      result.notEndedYet += 1;
      continue;
    }

    const alreadyFetchedAt = row.recording_fetched_at;
    const withinRecheck =
      alreadyFetchedAt !== null && alreadyFetchedAt.getTime() >= recheckCutoff.getTime();

    if (alreadyFetchedAt === null || withinRecheck) {
      try {
        const outcome = await syncRecording({
          liveClassId: row.id,
          meetingId: row.external_meeting_id,
          hostEmail: row.host_email,
          meetingDurationSeconds: computeMeetingDurationSeconds(row.fromTime, row.toTime),
          classStartMs: window.startMs,
          storedGraphId: row.recording_graph_id,
          storedSizeBytes: row.recording_size_bytes,
          teams,
          storage: deps.storage,
          prisma: deps.prisma,
          logger: deps.logger,
        });
        if (outcome === 'fetched') result.recordingsFetched += 1;
        if (outcome === 'replaced') result.recordingsReplaced += 1;
      } catch (err) {
        result.recordingErrors += 1;
        const message = err instanceof Error ? err.message : String(err);
        deps.logger.warn('teams-artifacts-sync.recording-failed', {
          liveClassId: row.id,
          error: message,
        });
        await deps.prisma.live_class.update({
          where: { id: row.id },
          data: { recording_fetch_error: message.substring(0, 500) },
        });
      }
    }

    if (row.attendance_fetched_at === null) {
      try {
        const fetched = await syncAttendance({
          liveClassId: row.id,
          meetingId: row.external_meeting_id,
          hostEmail: row.host_email,
          teams,
          prisma: deps.prisma,
          logger: deps.logger,
        });
        if (fetched) result.attendanceFetched += 1;
      } catch (err) {
        result.attendanceErrors += 1;
        const message = err instanceof Error ? err.message : String(err);
        deps.logger.warn('teams-artifacts-sync.attendance-failed', {
          liveClassId: row.id,
          error: message,
        });
        await deps.prisma.live_class.update({
          where: { id: row.id },
          data: { attendance_fetch_error: message.substring(0, 500) },
        });
      }
    }
  }

  deps.logger.info('teams-artifacts-sync.done', result as unknown as Record<string, unknown>);

  return result;
}

interface SyncRecordingArgs {
  liveClassId: number;
  meetingId: string;
  hostEmail: string;
  meetingDurationSeconds: number | null;
  /** Start of the class window in UTC ms — used to reject pre-class strays. */
  classStartMs: number;
  storedGraphId: string | null;
  storedSizeBytes: bigint | null;
  teams: TeamsMeetingService;
  storage: StorageProvider;
  prisma: PrismaClient;
  logger: TeamsArtifactsSyncLogger;
}

type SyncRecordingOutcome = 'fetched' | 'replaced' | 'skipped';

async function syncRecording(args: SyncRecordingArgs): Promise<SyncRecordingOutcome> {
  const recordings = await args.teams.listRecordings(args.meetingId, args.hostEmail);
  if (recordings.length === 0) {
    // Not ready yet — leave recording_fetched_at NULL so cron retries.
    return 'skipped';
  }

  const recording = pickSessionRecording(recordings, args.classStartMs);
  if (!recording || !recording.contentUrl) {
    // Every recording Teams holds for this meeting predates the class — a
    // join-and-leave stray, not the session. Retry rather than latch it.
    args.logger.info('teams-artifacts-sync.recording-not-from-session', {
      liveClassId: args.liveClassId,
      candidates: recordings.length,
    });
    return 'skipped';
  }

  // Already have exactly this recording — nothing to do.
  if (args.storedGraphId !== null && args.storedGraphId === recording.recordingId) {
    return 'skipped';
  }

  const rejectKey = `${args.liveClassId}:${recording.recordingId}`;
  if (rejectedRecordings.has(rejectKey)) return 'skipped';

  const isReplacement = args.storedGraphId !== null;
  const createdAt = recording.createdDateTime ? new Date(recording.createdDateTime) : new Date();
  const yyyy = String(createdAt.getUTCFullYear());
  const mm = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
  const objectKey = `recordings/${yyyy}/${mm}/${args.liveClassId}/${recording.recordingId}.mp4`;

  const tmpPath = path.join(
    tmpdir(),
    `teams-rec-${args.liveClassId}-${recording.recordingId}-${Date.now()}.mp4`,
  );

  let sizeBytes = 0;
  let sha256Hex = '';

  try {
    const stream = await args.teams.downloadRecording(recording.contentUrl);

    // Fork: write to file AND update sha256 AND count bytes, all in one pass.
    const hash = createHash('sha256');
    // Cast needed: Node types distinguish DOM ReadableStream<Uint8Array> from
    // Node's ReadableStream shape; Readable.fromWeb accepts both at runtime.
    const source = Readable.fromWeb(stream.body as unknown as Parameters<typeof Readable.fromWeb>[0]);
    const sink = createWriteStream(tmpPath);

    source.on('data', (chunk: Buffer | Uint8Array) => {
      hash.update(chunk);
      sizeBytes += chunk.byteLength;
    });

    await pipeline(source, sink);
    sha256Hex = hash.digest('hex');

    // Largest wins. A replacement must be strictly bigger than what we already
    // hold, so a late-arriving fragment can never displace the full session.
    if (isReplacement && args.storedSizeBytes !== null && BigInt(sizeBytes) <= args.storedSizeBytes) {
      rejectedRecordings.add(rejectKey);
      if (rejectedRecordings.size > REJECTED_CACHE_LIMIT) rejectedRecordings.clear();
      args.logger.info('teams-artifacts-sync.recording-smaller-kept-existing', {
        liveClassId: args.liveClassId,
        candidateBytes: sizeBytes,
        storedBytes: args.storedSizeBytes.toString(),
      });
      return 'skipped';
    }

    const uploadResult = await args.storage.uploadFromFile({
      key: objectKey,
      filePath: tmpPath,
      contentType: stream.contentType || 'video/mp4',
      precomputedSha256: sha256Hex,
      contentLength: sizeBytes,
    });

    await args.prisma.live_class.update({
      where: { id: args.liveClassId },
      data: {
        recording_url: uploadResult.location,
        recording_storage_key: uploadResult.key,
        recording_graph_id: recording.recordingId,
        recording_size_bytes: BigInt(sizeBytes),
        recording_duration_seconds: args.meetingDurationSeconds,
        recording_fetched_at: new Date(),
        recording_fetch_error: null,
      },
    });

    // NOTE: on replacement the superseded object is deliberately LEFT in
    // Spaces. It is a few hundred KB and we would rather orphan a stub than
    // risk deleting the only copy of a session.
    args.logger.info('teams-artifacts-sync.recording-stored', {
      liveClassId: args.liveClassId,
      bytes: sizeBytes,
      key: uploadResult.key,
      replaced: isReplacement,
    });

    return isReplacement ? 'replaced' : 'fetched';
  } finally {
    await unlink(tmpPath).catch(() => {
      // Best-effort cleanup; leave it if unlink fails (tmpfs will eat it).
    });
  }
}

interface SyncAttendanceArgs {
  liveClassId: number;
  meetingId: string;
  hostEmail: string;
  teams: TeamsMeetingService;
  prisma: PrismaClient;
  logger: TeamsArtifactsSyncLogger;
}

async function syncAttendance(args: SyncAttendanceArgs): Promise<boolean> {
  const reports = await args.teams.getAttendanceReports(args.meetingId, args.hostEmail);
  if (reports.length === 0) return false; // Not ready yet

  const latest = pickNewestReport(reports);

  // Risha UAT 2026-08-06 — an attendance report for a stray join-and-leave
  // carries no email-bearing records (anonymous joiners are filtered out
  // upstream). Latching it left live_class 749 permanently blank. Treat an
  // empty report as "not ready" and retry.
  if (latest.records.length === 0) return false;

  const meetingDurationSeconds = computeReportDurationSeconds(latest);

  for (const rec of latest.records) {
    if (!rec.email) continue;
    const emailLower = rec.email.toLowerCase();

    const user = await args.prisma.users.findFirst({
      where: { user_email: emailLower, deleted_at: null },
      select: { id: true },
    });

    const percentAttended =
      meetingDurationSeconds > 0
        ? Math.round(Math.min(100, (rec.totalSeconds / meetingDurationSeconds) * 100) * 100) / 100
        : null;

    const firstJoin = rec.intervals[0]?.joinDateTime
      ? new Date(rec.intervals[0].joinDateTime)
      : null;
    const lastLeave = rec.intervals.length > 0 && rec.intervals[rec.intervals.length - 1]?.leaveDateTime
      ? new Date(rec.intervals[rec.intervals.length - 1]!.leaveDateTime)
      : null;

    const payload = {
      user_id: user?.id ?? null,
      display_name: rec.displayName || null,
      role: rec.role || null,
      total_seconds: rec.totalSeconds,
      percent_attended: percentAttended,
      first_joined_at: firstJoin,
      last_left_at: lastLeave,
      intervals_json: JSON.stringify(rec.intervals),
    };

    await args.prisma.live_class_attendance.upsert({
      where: {
        live_class_id_email: {
          live_class_id: args.liveClassId,
          email: emailLower,
        },
      },
      create: {
        live_class_id: args.liveClassId,
        email: emailLower,
        ...payload,
      },
      update: payload,
    });
  }

  await args.prisma.live_class.update({
    where: { id: args.liveClassId },
    data: {
      attendance_fetched_at: new Date(),
      attendance_fetch_error: null,
    },
  });

  args.logger.info('teams-artifacts-sync.attendance-stored', {
    liveClassId: args.liveClassId,
    participants: latest.records.length,
  });

  return true;
}

/**
 * Picks the recording that actually belongs to this class.
 *
 * Teams keeps every recording ever made on the meeting link, so the list can
 * contain artifacts from someone who opened the link days earlier. Anything
 * created before the class window started is discarded; of what remains the
 * newest wins (the trainer's session always starts after a join-and-leave).
 *
 * Returns null when nothing matches — the caller retries instead of latching a
 * stray. If Graph gave us no usable timestamps at all we fall back to the old
 * newest-wins behaviour rather than storing nothing.
 */
function pickSessionRecording(
  recordings: TeamsRecording[],
  classStartMs: number,
): TeamsRecording | null {
  const earliestAcceptableMs = classStartMs - PRE_CLASS_TOLERANCE_MS;
  let sawUsableTimestamp = false;

  const inWindow = recordings.filter((r) => {
    if (!r.createdDateTime) return false;
    const ms = new Date(r.createdDateTime).getTime();
    if (Number.isNaN(ms)) return false;
    sawUsableTimestamp = true;
    return ms >= earliestAcceptableMs;
  });

  const pool = sawUsableTimestamp ? inWindow : recordings;
  if (pool.length === 0) return null;

  const sorted = [...pool].sort((a, b) =>
    (b.createdDateTime || '').localeCompare(a.createdDateTime || ''),
  );
  return sorted[0] ?? null;
}

/**
 * Class start/end as UTC epoch ms. `date` is @db.Date and fromTime/toTime are
 * @db.Time, which Prisma hands back anchored at UTC midnight / 1970-01-01 — so
 * both must be read with UTC getters. The wall-clock values are IST, hence the
 * explicit offset subtraction (never `new Date("YYYY-MM-DD...")`, which would
 * reinterpret them in the process timezone).
 */
function computeClassWindowUtc(
  date: Date | null | undefined,
  fromTime: Date | null | undefined,
  toTime: Date | null | undefined,
): { startMs: number; endMs: number } | null {
  if (!date || !fromTime || !toTime) return null;

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const startMs =
    Date.UTC(year, month, day, fromTime.getUTCHours(), fromTime.getUTCMinutes(), fromTime.getUTCSeconds()) -
    IST_OFFSET_MS;
  let endMs =
    Date.UTC(year, month, day, toTime.getUTCHours(), toTime.getUTCMinutes(), toTime.getUTCSeconds()) -
    IST_OFFSET_MS;

  // A class whose toTime is at or before its fromTime runs past IST midnight.
  if (endMs <= startMs) endMs += 24 * 60 * 60 * 1000;

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null;
  return { startMs, endMs };
}

function pickNewestReport(reports: TeamsAttendanceReport[]): TeamsAttendanceReport {
  const sorted = [...reports].sort((a, b) =>
    (b.meetingEndDateTime || '').localeCompare(a.meetingEndDateTime || ''),
  );
  return sorted[0]!;
}

function computeReportDurationSeconds(report: TeamsAttendanceReport): number {
  if (!report.meetingStartDateTime || !report.meetingEndDateTime) return 0;
  const start = new Date(report.meetingStartDateTime).getTime();
  const end = new Date(report.meetingEndDateTime).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
  return Math.round((end - start) / 1000);
}

/**
 * Fallback duration when Graph's attendance report is empty — compute from
 * the scheduled meeting fromTime/toTime on the live_class row. Less accurate
 * than the actual meeting window but close enough for percent-attended math.
 */
function computeMeetingDurationSeconds(
  fromTime: Date | null | undefined,
  toTime: Date | null | undefined,
): number | null {
  if (!fromTime || !toTime) return null;
  const fromMs = fromTime.getTime();
  const toMs = toTime.getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs <= fromMs) return null;
  return Math.round((toMs - fromMs) / 1000);
}
