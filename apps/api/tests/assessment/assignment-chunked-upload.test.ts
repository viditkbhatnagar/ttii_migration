import { describe, expect, test } from 'vitest';

import Fastify, { type FastifyInstance } from 'fastify';

import type { AssessmentService } from '../../src/assessment/assessment-service.js';
import type { AuthService } from '../../src/auth/auth-service.js';
import type {
  StorageProvider,
  StorageUploadFromFileRequest,
  StorageUploadResult,
} from '../../src/integrations/contracts.js';
import { registerAssignmentUploadRoutes } from '../../src/routes/assignment-upload.js';

// TTII 2026-08-19 — chunked/resumable assignment upload.
//
// Students submit phone-scanned PDFs (median 4MB, 11% over 25MB, largest 55MB
// on record). A single multi-minute POST died whenever the handset changed
// network mid-transfer, losing the whole file. Uploading in chunks means a drop
// costs one chunk — but only if the pieces are put back together EXACTLY, so
// these tests are about byte-for-byte reassembly, retry idempotency, and
// refusing to record a truncated submission.

const STUDENT_ID = 137;
const ASSIGNMENT_ID = '4101';

interface Captured {
  uploads: StorageUploadFromFileRequest[];
  submissions: { assignmentId: string; answerFiles: unknown }[];
  /** What actually landed in object storage, read back off disk. */
  bytes: Buffer[];
}

async function buildApp(): Promise<{ app: FastifyInstance; captured: Captured }> {
  const captured: Captured = { uploads: [], submissions: [], bytes: [] };

  const authService = {
    authenticateAuthToken: (token: string) =>
      Promise.resolve(token === 'good-token' ? { user: { id: STUDENT_ID } } : null),
  } as unknown as AuthService;

  const assessmentService = {
    submitAssignment: (_userId: string, input: { assignmentId: string; answerFiles: unknown }) => {
      captured.submissions.push(input);
      return Promise.resolve({ status: 1, message: 'success', data: [] });
    },
  } as unknown as AssessmentService;

  const storage = {
    name: 's3-storage',
    uploadFromFile: async (input: StorageUploadFromFileRequest): Promise<StorageUploadResult> => {
      captured.uploads.push(input);
      const { readFile } = await import('node:fs/promises');
      captured.bytes.push(await readFile(input.filePath));
      return {
        key: input.key,
        provider: 's3-storage',
        location: `https://cdn.example/${input.key}`,
      };
    },
  } as unknown as StorageProvider;

  const app = Fastify();
  // Registered through a plugin so the routes get their own encapsulation
  // context, exactly as they do inside registerAssessmentRoutes — the
  // octet-stream content-type parser must not leak to the whole server.
  await app.register(
    (instance, _opts, done) => {
      registerAssignmentUploadRoutes(instance, { authService, assessmentService, storage });
      done();
    },
    { prefix: '/api' },
  );
  await app.ready();

  return { app, captured };
}

function sendChunk(
  app: FastifyInstance,
  opts: { uploadId: string; index: number; count: number; payload: Buffer; token?: string },
) {
  return app.inject({
    method: 'POST',
    url: '/api/assignment/submit_assignment/chunk',
    query: {
      auth_token: opts.token ?? 'good-token',
      upload_id: opts.uploadId,
      chunk_index: String(opts.index),
      chunk_count: String(opts.count),
    },
    headers: { 'content-type': 'application/octet-stream' },
    payload: opts.payload,
  });
}

function complete(
  app: FastifyInstance,
  opts: { uploadId: string; count: number; token?: string; fileName?: string },
) {
  return app.inject({
    method: 'POST',
    url: '/api/assignment/submit_assignment/complete',
    query: { auth_token: opts.token ?? 'good-token' },
    payload: {
      upload_id: opts.uploadId,
      assignment_id: ASSIGNMENT_ID,
      chunk_count: opts.count,
      file_name: opts.fileName ?? 'my-scan.pdf',
      content_type: 'application/pdf',
    },
  });
}

describe('chunked assignment upload', () => {
  test('chunks are reassembled byte-for-byte, in order, and submitted', async () => {
    const { app, captured } = await buildApp();
    const uploadId = 'aaaaaaaabbbbbbbb';
    const parts = [Buffer.from('FIRST-'), Buffer.from('SECOND-'), Buffer.from('THIRD')];

    for (const [index, payload] of parts.entries()) {
      const res = await sendChunk(app, { uploadId, index, count: parts.length, payload });
      expect(res.statusCode).toBe(200);
    }

    const done = await complete(app, { uploadId, count: parts.length });
    expect(done.statusCode).toBe(200);

    expect(captured.bytes).toHaveLength(1);
    expect(captured.bytes[0]?.toString()).toBe('FIRST-SECOND-THIRD');
    expect(captured.submissions).toHaveLength(1);
    expect(captured.submissions[0]?.assignmentId).toBe(ASSIGNMENT_ID);

    await app.close();
  });

  test('chunks arriving OUT OF ORDER still assemble correctly', async () => {
    const { app, captured } = await buildApp();
    const uploadId = 'ccccccccdddddddd';

    await sendChunk(app, { uploadId, index: 2, count: 3, payload: Buffer.from('THIRD') });
    await sendChunk(app, { uploadId, index: 0, count: 3, payload: Buffer.from('FIRST-') });
    await sendChunk(app, { uploadId, index: 1, count: 3, payload: Buffer.from('SECOND-') });

    expect((await complete(app, { uploadId, count: 3 })).statusCode).toBe(200);
    expect(captured.bytes[0]?.toString()).toBe('FIRST-SECOND-THIRD');

    await app.close();
  });

  test('re-sending a chunk overwrites it — a retry must not duplicate bytes', async () => {
    const { app, captured } = await buildApp();
    const uploadId = 'eeeeeeeeffffffff';

    // A chunk that died half-sent, then the client retried the same index.
    await sendChunk(app, { uploadId, index: 0, count: 2, payload: Buffer.from('TRUNC') });
    await sendChunk(app, { uploadId, index: 0, count: 2, payload: Buffer.from('FIRST-') });
    await sendChunk(app, { uploadId, index: 1, count: 2, payload: Buffer.from('SECOND') });

    expect((await complete(app, { uploadId, count: 2 })).statusCode).toBe(200);
    expect(captured.bytes[0]?.toString()).toBe('FIRST-SECOND');

    await app.close();
  });

  test('a missing chunk is refused, and nothing is submitted', async () => {
    const { app, captured } = await buildApp();
    const uploadId = 'gggggggghhhhhhhh';

    await sendChunk(app, { uploadId, index: 0, count: 3, payload: Buffer.from('FIRST-') });
    // index 1 never arrives
    await sendChunk(app, { uploadId, index: 2, count: 3, payload: Buffer.from('THIRD') });

    const done = await complete(app, { uploadId, count: 3 });
    expect(done.statusCode).toBe(409);
    // The load-bearing assertion: a truncated file is never recorded as work.
    expect(captured.submissions).toHaveLength(0);
    expect(captured.uploads).toHaveLength(0);

    await app.close();
  });

  test('the assembled object is uploaded public-read, or faculty cannot open it', async () => {
    const { app, captured } = await buildApp();
    const uploadId = 'iiiiiiiijjjjjjjj';

    await sendChunk(app, { uploadId, index: 0, count: 1, payload: Buffer.from('PDF') });
    await complete(app, { uploadId, count: 1 });

    expect(captured.uploads[0]?.publicRead).toBe(true);
    expect(captured.uploads[0]?.key).toContain('public/assignment-submissions/');

    await app.close();
  });

  test('a hostile upload id cannot escape the upload directory', async () => {
    const { app } = await buildApp();

    const res = await sendChunk(app, {
      uploadId: '../../../etc/passwd',
      index: 0,
      count: 1,
      payload: Buffer.from('x'),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  test('the filename only ever contributes an extension to the storage key', async () => {
    const { app, captured } = await buildApp();
    const uploadId = 'kkkkkkkkllllllll';

    await sendChunk(app, { uploadId, index: 0, count: 1, payload: Buffer.from('PDF') });
    await complete(app, { uploadId, count: 1, fileName: '../../evil/name.PdF' });

    const key = captured.uploads[0]?.key ?? '';
    expect(key).not.toContain('..');
    expect(key).not.toContain('evil');
    expect(key.endsWith('.pdf')).toBe(true);

    await app.close();
  });

  test('an unauthenticated caller is rejected before anything is written', async () => {
    const { app, captured } = await buildApp();

    const res = await sendChunk(app, {
      uploadId: 'mmmmmmmmnnnnnnnn',
      index: 0,
      count: 1,
      payload: Buffer.from('x'),
      token: 'bad-token',
    });
    expect(res.statusCode).toBe(401);
    expect(captured.uploads).toHaveLength(0);

    await app.close();
  });
});
