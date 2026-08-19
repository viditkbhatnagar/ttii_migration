import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { AuthService } from '../auth/auth-service.js';
import { extractAuthToken } from '../auth/middleware.js';
import type { AssessmentService } from '../assessment/assessment-service.js';
import type { StorageProvider } from '../integrations/contracts.js';

/**
 * Chunked, resumable assignment upload.
 *
 * Naji/TTII 2026-08-19 — "many students cannot submit even on a stable
 * connection, on different devices". The access log gave the real mechanism.
 * Students submit phone-scanned PDFs: of the 102 submissions on record the
 * median is 4MB but 22% are over 10MB, 11% over 25MB and the largest is 55MB.
 * On a typical Indian mobile uplink a 50MB file is a MULTI-MINUTE single POST,
 * and nginx's client_body_timeout is an *inactivity* timer — so the 408s we
 * logged are not slowness, they are the upload STALLING dead for 300s. One
 * student's three failures came from three different IPs: the handset moved
 * between cells/WiFi mid-upload, which kills the connection and loses the whole
 * transfer. There was no progress, no resume and no retry, so the student saw a
 * frozen dialog and then "your connection dropped" — hence "stable internet,
 * still fails".
 *
 * Uploading in chunks makes a dropped connection cost one chunk instead of the
 * whole file, and each chunk is retried client-side. Chunks stream straight to
 * disk and are only then streamed on to object storage, which also removes the
 * old whole-file-in-memory buffer (the API runs on a 2GB box under a 1GB pm2
 * max_memory_restart, so a few concurrent 50MB uploads were a real risk).
 *
 * The single-shot multipart route in assessment.ts is DELIBERATELY left intact:
 * the shipped Dart mobile app posts to it and cannot be updated from here.
 */

const UPLOAD_ROOT = join(tmpdir(), 'ttii-assignment-uploads');

// Matches the client's CHUNK_SIZE ceiling with headroom; a single chunk that
// claims to be bigger than this is rejected rather than buffered.
const MAX_CHUNK_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
// Bounds the worst case a single authenticated upload can put on disk before
// `complete` gets a chance to reject it (MAX_CHUNKS x MAX_CHUNK_BYTES). The web
// client caps submissions at 100MB and uses 4MB chunks, so it never needs more
// than ~25 — this is headroom, not a target.
const MAX_CHUNKS = 64;
// Abandoned uploads (student closed the tab mid-transfer) are swept after this.
const STALE_UPLOAD_MS = 6 * 60 * 60 * 1000;

/** Upload ids come from the browser, so they are path segments — keep them inert. */
function isSafeUploadId(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,64}$/.test(value);
}

/**
 * Everything here arrives as `unknown` off the wire, so coerce explicitly:
 * blanket String() on an object yields "[object Object]" and would happily let
 * a JSON object through as an upload id or a path segment.
 */
function toText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function toInt(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(toText(value), 10);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : -1;
}

function uploadDir(userId: string, uploadId: string): string {
  return join(UPLOAD_ROOT, userId.replace(/[^0-9A-Za-z]/g, ''), uploadId);
}

/**
 * Object keys are derived from a student-supplied filename, so take only the
 * extension and only when it looks like one. Everything else is generated.
 */
function safeExtension(fileName: string): string {
  const raw = (fileName.split('.').pop() ?? '').toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(raw) ? raw : 'pdf';
}

/** Best-effort removal of uploads abandoned mid-transfer. Never throws. */
async function sweepStaleUploads(): Promise<void> {
  try {
    const users = await readdir(UPLOAD_ROOT, { withFileTypes: true });
    const cutoff = Date.now() - STALE_UPLOAD_MS;
    for (const user of users) {
      if (!user.isDirectory()) continue;
      const userDir = join(UPLOAD_ROOT, user.name);
      const uploads = await readdir(userDir, { withFileTypes: true }).catch(() => []);
      for (const upload of uploads) {
        if (!upload.isDirectory()) continue;
        const dir = join(userDir, upload.name);
        const info = await stat(dir).catch(() => null);
        if (info && info.mtimeMs < cutoff) {
          await rm(dir, { recursive: true, force: true }).catch(() => undefined);
        }
      }
    }
  } catch {
    // The directory may not exist yet — nothing to sweep.
  }
}

export interface RegisterAssignmentUploadOptions {
  authService?: AuthService;
  assessmentService?: AssessmentService;
  storage?: StorageProvider;
}

export function registerAssignmentUploadRoutes(
  app: FastifyInstance,
  options: RegisterAssignmentUploadOptions,
): void {
  const { authService, assessmentService } = options;
  if (!authService || !assessmentService) return;

  // Chunks arrive as raw bytes. Hand the stream through untouched so it can go
  // straight to disk — parsing it into a Buffer would reintroduce exactly the
  // memory pressure this route exists to remove. Scoped to this plugin.
  app.addContentTypeParser('application/octet-stream', (_request, payload, done) => {
    done(null, payload);
  });

  async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
    const token = extractAuthToken(request) ?? '';
    const context = token ? await authService!.authenticateAuthToken(token) : null;
    if (!context) {
      reply.code(401).send({ status: false, message: 'User not authenticated!', data: [] });
      return null;
    }
    return String(context.user.id);
  }

  /**
   * Report an upload that failed on the student's device.
   *
   * This exists because of how this incident went: on the day it was reported
   * there were ZERO failed submit requests in the access log. Every failure
   * happened in the browser, before or during send, and nothing anywhere
   * recorded why — so the cause could not be established from the server at
   * all. A few hundred bytes posted after a failure turns the next report from
   * guesswork into a log line. Best-effort and fire-and-forget: it must never
   * be able to fail a submission.
   */
  app.post('/assignment/upload_diagnostics', async (request, reply) => {
    try {
      const userId = await authenticate(request, reply);
      if (!userId) return;

      const body = ((request.body as Record<string, unknown>) ?? {});
      const text = (value: unknown, max: number): string => toText(value).slice(0, max);

      request.log.warn(
        {
          event: 'assignment.upload.client_failure',
          user_id: userId,
          assignment_id: text(body.assignment_id, 32),
          reason: text(body.reason, 32),
          http_status: toInt(body.http_status),
          bytes_sent: toInt(body.bytes_sent),
          total_bytes: toInt(body.total_bytes),
          duration_ms: toInt(body.duration_ms),
          chunk_index: toInt(body.chunk_index),
          file_type: text(body.file_type, 64),
          network: text(body.network, 32),
          downlink: text(body.downlink, 16),
          message: text(body.message, 200),
          user_agent: toText(request.headers['user-agent']).slice(0, 200),
        },
        'assignment upload failed on the client',
      );

      reply.code(200).send({ status: 1, message: 'success', data: [] });
    } catch {
      reply.code(200).send({ status: 1, message: 'success', data: [] });
    }
  });

  /**
   * Receive one chunk. Each chunk is written to its own file named by index, so
   * a client retry of the same index simply overwrites it — retries are
   * idempotent and chunks may arrive out of order.
   */
  app.post('/assignment/submit_assignment/chunk', async (request, reply) => {
    try {
      const userId = await authenticate(request, reply);
      if (!userId) return;

      const query = (request.query as Record<string, unknown>) ?? {};
      const uploadId = toText(query.upload_id).trim();
      const chunkIndex = toInt(query.chunk_index);
      const chunkCount = toInt(query.chunk_count);

      if (!isSafeUploadId(uploadId) || chunkCount < 1 || chunkCount > MAX_CHUNKS) {
        reply.code(400).send({ status: 0, message: 'Invalid upload request.', data: [] });
        return;
      }
      if (chunkIndex < 0 || chunkIndex >= chunkCount) {
        reply.code(400).send({ status: 0, message: 'Invalid chunk index.', data: [] });
        return;
      }

      const declared = toInt(request.headers['content-length']);
      if (declared > MAX_CHUNK_BYTES) {
        reply.code(413).send({ status: 0, message: 'Chunk too large.', data: [] });
        return;
      }

      const dir = uploadDir(userId, uploadId);
      await mkdir(dir, { recursive: true });

      const target = join(dir, `${chunkIndex}.part`);
      const body = request.body as NodeJS.ReadableStream | undefined;
      if (!body || typeof (body as { pipe?: unknown }).pipe !== 'function') {
        reply.code(400).send({ status: 0, message: 'Chunk body missing.', data: [] });
        return;
      }

      // Stream to disk. A client that dies mid-chunk leaves a short file, which
      // the retry of the same index overwrites.
      await pipeline(body, createWriteStream(target));

      const written = await stat(target).catch(() => null);
      if (written && written.size > MAX_CHUNK_BYTES) {
        await rm(target, { force: true }).catch(() => undefined);
        reply.code(413).send({ status: 0, message: 'Chunk too large.', data: [] });
        return;
      }

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: { chunk_index: chunkIndex, bytes: written?.size ?? 0 },
      });
    } catch (error: unknown) {
      request.log.error({ err: error }, 'assignment.upload.chunk_failed');
      reply.code(500).send({ status: 0, message: 'Could not store the uploaded part.', data: [] });
    }
  });

  /**
   * All chunks are in — join them, push the assembled file to object storage and
   * record the submission. The response envelope is the same one the single-shot
   * route returns, so the student client treats both paths identically.
   */
  app.post('/assignment/submit_assignment/complete', async (request, reply) => {
    let dir = '';
    try {
      const userId = await authenticate(request, reply);
      if (!userId) return;

      const payload = ((request.body as Record<string, unknown>) ?? {});
      const uploadId = toText(payload.upload_id).trim();
      const assignmentId = toText(payload.assignment_id).trim();
      const chunkCount = toInt(payload.chunk_count);
      const fileName = toText(payload.file_name) || 'submission.pdf';
      const contentType = toText(payload.content_type) || 'application/pdf';

      if (!isSafeUploadId(uploadId) || chunkCount < 1 || chunkCount > MAX_CHUNKS) {
        reply.code(400).send({ status: 0, message: 'Invalid upload request.', data: [] });
        return;
      }

      const storage = options.storage;
      if (!storage) {
        reply.code(500).send({ status: 0, message: 'Storage not configured.', data: [] });
        return;
      }

      dir = uploadDir(userId, uploadId);

      // Verify every part is present BEFORE assembling, so a missing chunk is a
      // clean, actionable error rather than a silently truncated submission.
      let total = 0;
      for (let index = 0; index < chunkCount; index += 1) {
        const info = await stat(join(dir, `${index}.part`)).catch(() => null);
        if (!info) {
          reply.code(409).send({
            status: 0,
            message: 'Upload incomplete — some parts did not arrive. Please try again.',
            data: { missing_chunk: index },
          });
          return;
        }
        total += info.size;
      }
      if (total <= 0 || total > MAX_TOTAL_BYTES) {
        reply.code(413).send({ status: 0, message: 'That file is too large to upload.', data: [] });
        return;
      }

      // Join the parts in order, streaming — never the whole file in memory.
      const assembled = join(dir, 'assembled');
      const out = createWriteStream(assembled);
      try {
        for (let index = 0; index < chunkCount; index += 1) {
          await pipeline(createReadStream(join(dir, `${index}.part`)), out, { end: false });
        }
        await new Promise<void>((resolveEnd, rejectEnd) => {
          out.once('error', rejectEnd);
          out.end(() => {
            resolveEnd();
          });
        });
      } catch (assemblyError: unknown) {
        // Leaving the handle open would leak an fd for every failed assembly.
        out.destroy();
        throw assemblyError;
      }

      const key = `public/assignment-submissions/${userId}-${assignmentId || 'a'}-${Date.now()}-0.${safeExtension(fileName)}`;
      const uploaded = await storage.uploadFromFile({
        key,
        filePath: assembled,
        contentType,
        publicRead: true,
        contentLength: total,
      });

      const submission = await assessmentService.submitAssignment(userId, {
        assignmentId,
        answerFiles: [uploaded.location],
      });

      reply.code(200).send(submission);
    } catch (error: unknown) {
      request.log.error({ err: error }, 'assignment.upload.complete_failed');
      reply.code(500).send({ status: 0, message: 'Could not finish the submission.', data: [] });
    } finally {
      if (dir) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
      void sweepStaleUploads();
    }
  });
}
