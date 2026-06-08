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
  /** Clock injection for tests. */
  now?: () => Date;
}

export interface TeamsArtifactsSyncResult {
  candidateCount: number;
  recordingsFetched: number;
  attendanceFetched: number;
  recordingErrors: number;
  attendanceErrors: number;
}

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_RETRY_WINDOW_DAYS = 7;

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
    return { candidateCount: 0, recordingsFetched: 0, attendanceFetched: 0, recordingErrors: 0, attendanceErrors: 0 };
  }

  const now = deps.now?.() ?? new Date();
  const retryWindowDays = deps.retryWindowDays ?? DEFAULT_RETRY_WINDOW_DAYS;
  const windowStart = new Date(now.getTime() - retryWindowDays * 24 * 60 * 60 * 1000);
  const batchSize = deps.batchSize ?? DEFAULT_BATCH_SIZE;

  const candidates = await deps.prisma.live_class.findMany({
    where: {
      platform: 'teams',
      external_meeting_id: { not: null },
      host_email: { not: null },
      date: { gte: windowStart, lte: now },
      OR: [{ recording_fetched_at: null }, { attendance_fetched_at: null }],
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

    if (row.recording_fetched_at === null) {
      try {
        const fetched = await syncRecording({
          liveClassId: row.id,
          meetingId: row.external_meeting_id,
          hostEmail: row.host_email,
          meetingDurationSeconds: computeMeetingDurationSeconds(row.fromTime, row.toTime),
          teams,
          storage: deps.storage,
          prisma: deps.prisma,
          logger: deps.logger,
        });
        if (fetched) result.recordingsFetched += 1;
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
  teams: TeamsMeetingService;
  storage: StorageProvider;
  prisma: PrismaClient;
  logger: TeamsArtifactsSyncLogger;
}

async function syncRecording(args: SyncRecordingArgs): Promise<boolean> {
  const recordings = await args.teams.listRecordings(args.meetingId, args.hostEmail);
  if (recordings.length === 0) {
    // Not ready yet — leave recording_fetched_at NULL so cron retries.
    return false;
  }

  // Pick the most recent recording (usually only one; meetings that start/stop
  // recording produce multiple segments).
  const recording = pickNewestRecording(recordings);
  if (!recording.contentUrl) return false;

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

    args.logger.info('teams-artifacts-sync.recording-stored', {
      liveClassId: args.liveClassId,
      bytes: sizeBytes,
      key: uploadResult.key,
    });

    return true;
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

function pickNewestRecording(recordings: TeamsRecording[]): TeamsRecording {
  const sorted = [...recordings].sort((a, b) =>
    (b.createdDateTime || '').localeCompare(a.createdDateTime || ''),
  );
  return sorted[0]!;
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
