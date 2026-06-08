import { randomBytes } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import type { IntegrationLogger } from '../../src/integrations/contracts.js';
import { S3StorageProvider } from '../../src/integrations/storage-provider.js';

/**
 * Live end-to-end test of the S3-compatible storage provider — i.e. the exact
 * code path TTII uses for DigitalOcean Spaces.
 *
 * Gated on S3_TEST_ENDPOINT so CI (which has no object store) skips it. Run it
 * locally against MinIO (an S3-compatible server that speaks the same protocol
 * as DigitalOcean Spaces) via `npm run test:spaces` — see scripts/spaces-e2e.sh.
 *
 * What it proves:
 *   1. uploadObject  -> presigned GET -> bytes round-trip exactly.
 *   2. uploadFromFile (streaming, the recording path) -> presigned GET -> exact
 *      bytes; deleteObject then 404.
 *   3. The real Teams artifacts sync job (syncPendingTeamsArtifacts) downloads a
 *      recording and lands it in object storage with recording_storage_key set,
 *      and that key replays via a signed URL — the full auto-upload pipeline.
 */

// Mock the Teams meeting service so the sync job uses a fake recording source
// instead of hitting Microsoft Graph. Hoisted above imports by vitest.
vi.mock('../../src/integrations/teams-meeting-service.js', () => ({
  createTeamsMeetingService: vi.fn(),
}));

import { createTeamsMeetingService } from '../../src/integrations/teams-meeting-service.js';
import { syncPendingTeamsArtifacts } from '../../src/jobs/teams-artifacts-sync.js';

const logger: IntegrationLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

const ENDPOINT = process.env.S3_TEST_ENDPOINT;
const RUN = Boolean(ENDPOINT);

function providerFromEnv(): S3StorageProvider {
  return new S3StorageProvider(
    {
      bucket: process.env.S3_TEST_BUCKET ?? 'ttii-recordings-test',
      region: process.env.S3_TEST_REGION ?? 'us-east-1',
      accessKeyId: process.env.S3_TEST_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_TEST_SECRET_ACCESS_KEY ?? '',
      endpoint: ENDPOINT,
      forcePathStyle: (process.env.S3_TEST_FORCE_PATH_STYLE ?? 'true') === 'true',
      publicBaseUrl: process.env.S3_TEST_PUBLIC_BASE_URL || undefined,
    },
    logger,
  );
}

describe.skipIf(!RUN)('S3StorageProvider live round-trip (MinIO / DigitalOcean Spaces)', () => {
  const provider = RUN ? providerFromEnv() : (null as unknown as S3StorageProvider);
  let tmpDir = '';

  beforeAll(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'ttii-spaces-e2e-'));
  });

  afterAll(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  it('round-trips a small object: uploadObject -> signed GET -> exact bytes', async () => {
    const key = `e2e/object/${Date.now()}.txt`;
    const body = `hello-digitalocean-spaces-${Date.now()}`;

    const uploaded = await provider.uploadObject({ key, body, contentType: 'text/plain' });
    expect(uploaded.provider).toBe('s3-storage');
    expect(uploaded.key).toBe(key);

    const signedUrl = await provider.createSignedDownloadUrl({ key, expiresInSeconds: 300 });
    const res = await fetch(signedUrl);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(body);

    await provider.deleteObject({ key });
  });

  it('round-trips a streamed file (recording path): uploadFromFile -> signed GET -> exact bytes -> delete -> 404', async () => {
    // ~3 MB of random bytes simulates a recording MP4 streamed from disk.
    const payload = randomBytes(3 * 1024 * 1024);
    const filePath = path.join(tmpDir, 'recording.mp4');
    await writeFile(filePath, payload);

    const key = `e2e/recordings/${Date.now()}/clip.mp4`;
    const uploaded = await provider.uploadFromFile({
      key,
      filePath,
      contentType: 'video/mp4',
    });
    expect(uploaded.key).toBe(key);

    const signedUrl = await provider.createSignedDownloadUrl({ key, expiresInSeconds: 300 });
    const res = await fetch(signedUrl);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('video/mp4');
    const downloaded = Buffer.from(await res.arrayBuffer());
    expect(downloaded.length).toBe(payload.length);
    expect(downloaded.equals(payload)).toBe(true);

    await provider.deleteObject({ key });
    const afterDelete = await fetch(await provider.createSignedDownloadUrl({ key, expiresInSeconds: 300 }));
    expect(afterDelete.status).toBe(404);
  });
});

describe.skipIf(!RUN)('Teams recording auto-upload pipeline -> object storage (end-to-end)', () => {
  it('syncs a Teams recording into storage with recording_storage_key and replays via signed URL', async () => {
    const provider = providerFromEnv();

    // ---- Fake the Teams recording source (Microsoft Graph) ----
    const fakeRecordingBytes = randomBytes(512 * 1024); // 512 KB fake MP4
    const liveClassId = 4242;
    const recordingId = 'rec-e2e-abc-123';

    const fakeTeamsService = {
      listRecordings: vi.fn().mockResolvedValue([
        {
          recordingId,
          meetingId: 'meet-1',
          contentUrl: 'https://graph.example/recording/content',
          createdDateTime: '2026-06-08T10:00:00Z',
        },
      ]),
      downloadRecording: vi.fn().mockResolvedValue({
        body: new Response(fakeRecordingBytes).body,
        contentLength: fakeRecordingBytes.length,
        contentType: 'video/mp4',
      }),
      // No attendance report ready -> attendance leg is a no-op this run.
      getAttendanceReports: vi.fn().mockResolvedValue([]),
    };
    vi.mocked(createTeamsMeetingService).mockReturnValue(
      fakeTeamsService as unknown as ReturnType<typeof createTeamsMeetingService>,
    );

    // ---- Fake just the Prisma calls the job makes ----
    const updates: Array<{ where: unknown; data: Record<string, unknown> }> = [];
    const candidate = {
      id: liveClassId,
      external_meeting_id: 'meet-1',
      host_email: 'naji@teachersindia.in',
      fromTime: new Date('2026-06-08T09:00:00Z'),
      toTime: new Date('2026-06-08T10:00:00Z'),
      toDate: new Date('2026-06-08T00:00:00Z'),
      recording_fetched_at: null,
      attendance_fetched_at: null,
    };
    const fakePrisma = {
      live_class: {
        findMany: vi.fn().mockResolvedValue([candidate]),
        update: vi.fn().mockImplementation((args: { where: unknown; data: Record<string, unknown> }) => {
          updates.push(args);
          return Promise.resolve({});
        }),
      },
    } as unknown as PrismaClient;

    // ---- Run the real sync job against real (MinIO) storage ----
    const result = await syncPendingTeamsArtifacts({
      prisma: fakePrisma,
      storage: provider,
      teamsCreds: { clientId: 'id', clientSecret: 'secret', tenantId: 'tenant' },
      logger: { info: () => {}, warn: () => {}, error: () => {} },
      now: () => new Date('2026-06-08T11:00:00Z'),
    });

    expect(result.recordingsFetched).toBe(1);
    expect(result.recordingErrors).toBe(0);

    // The job persisted the storage key + a playable location.
    const recordingUpdate = updates.find((u) => 'recording_storage_key' in u.data);
    expect(recordingUpdate).toBeTruthy();
    const expectedKey = `recordings/2026/06/${liveClassId}/${recordingId}.mp4`;
    expect(recordingUpdate!.data.recording_storage_key).toBe(expectedKey);
    expect(String(recordingUpdate!.data.recording_url)).toContain('ttii-recordings-test');
    expect(recordingUpdate!.data.recording_fetched_at).toBeInstanceOf(Date);

    // The stored object replays via a signed URL with the exact original bytes.
    const signedUrl = await provider.createSignedDownloadUrl({ key: expectedKey, expiresInSeconds: 300 });
    const res = await fetch(signedUrl);
    expect(res.status).toBe(200);
    const downloaded = Buffer.from(await res.arrayBuffer());
    expect(downloaded.equals(fakeRecordingBytes)).toBe(true);

    // Cleanup.
    await provider.deleteObject({ key: expectedKey });
  });
});
