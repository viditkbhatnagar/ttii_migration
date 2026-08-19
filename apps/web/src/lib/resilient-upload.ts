/**
 * Resilient file upload for student submissions.
 *
 * TTII 2026-08-19 — "many students are unable to submit their assignment even
 * though they have stable internet connection. Tried uploading from different
 * devices, but the issue persists."
 *
 * The nginx access log gave the mechanism. Students submit phone-scanned PDFs:
 * across the 102 submissions on record the median is 4MB, but 22% are over
 * 10MB, 11% over 25MB and the largest is 55MB. Sending 50MB up an Indian mobile
 * uplink is a MULTI-MINUTE single request, and every failure we logged is that
 * request dying part-way — nginx's client_body_timeout is an *inactivity*
 * timer, so its 408s mean the upload stalled dead, and one student's three
 * failed attempts came from three different IPs (the handset moved between
 * cells/WiFi mid-upload, which kills the connection). The old code sent the
 * whole file in one fetch() with no progress, no resume and no retry, so any
 * blip lost everything and the student — whose connection really was fine —
 * saw a frozen dialog and then "your connection dropped".
 *
 * So: upload in chunks over XHR. A dropped connection now costs one chunk
 * instead of the whole file, each chunk is retried with backoff, a stalled
 * radio is caught in seconds instead of after nginx's 300s, and the student
 * watches real progress instead of guessing.
 */

/** Small enough that one bad chunk is cheap to resend, big enough to stay efficient. */
export const CHUNK_SIZE = 4 * 1024 * 1024;

/** No bytes moved for this long means the radio is gone, not that it is slow. */
const STALL_TIMEOUT_MS = 45_000;
const STALL_POLL_MS = 5_000;

const MAX_ATTEMPTS_PER_CHUNK = 4;
const RETRY_BACKOFF_MS = [1_000, 3_000, 7_000];

export type UploadPhase = 'checking' | 'uploading' | 'finishing';

export interface UploadProgress {
  loaded: number;
  total: number;
  /** 0-100, already rounded for display. */
  percent: number;
  phase: UploadPhase;
}

export type UploadFailureReason =
  | 'unreadable-file'
  | 'stalled'
  | 'network'
  | 'too-large'
  | 'server'
  | 'aborted';

/** Carries WHY an upload failed so the UI can say something actionable. */
export class UploadError extends Error {
  readonly reason: UploadFailureReason;
  readonly status: number;

  constructor(reason: UploadFailureReason, message: string, status = 0) {
    super(message);
    this.name = 'UploadError';
    this.reason = reason;
    this.status = status;
  }
}

interface XhrResponse {
  status: number;
  text: string;
}

interface XhrOptions {
  url: string;
  body: XMLHttpRequestBodyInit;
  contentType?: string;
  onProgress?: (loaded: number) => void;
  signal?: AbortSignal;
}

/**
 * XHR rather than fetch: fetch cannot report upload progress, and progress is
 * what tells us the difference between a slow link and a dead one.
 */
function xhrSend(options: XhrOptions): Promise<XhrResponse> {
  return new Promise<XhrResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let lastActivity = Date.now();
    let stalled = false;
    let settled = false;

    const watchdog = window.setInterval(() => {
      if (Date.now() - lastActivity > STALL_TIMEOUT_MS) {
        stalled = true;
        xhr.abort();
      }
    }, STALL_POLL_MS);

    const cleanup = (): void => {
      window.clearInterval(watchdog);
      options.signal?.removeEventListener('abort', onExternalAbort);
    };

    function onExternalAbort(): void {
      xhr.abort();
    }

    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    xhr.open('POST', options.url, true);
    if (options.contentType) xhr.setRequestHeader('Content-Type', options.contentType);

    xhr.upload.onprogress = (event: ProgressEvent): void => {
      lastActivity = Date.now();
      options.onProgress?.(event.loaded);
    };
    // A server that is slow to answer after the body landed is still alive.
    xhr.onprogress = (): void => {
      lastActivity = Date.now();
    };

    xhr.onload = (): void => {
      settle(() => resolve({ status: xhr.status, text: xhr.responseText }));
    };
    xhr.onerror = (): void => {
      settle(() =>
        reject(new UploadError('network', 'The connection dropped while sending your file.')),
      );
    };
    xhr.onabort = (): void => {
      settle(() =>
        reject(
          stalled
            ? new UploadError('stalled', 'The upload stopped making progress.')
            : new UploadError('aborted', 'Upload cancelled.'),
        ),
      );
    };

    if (options.signal) {
      if (options.signal.aborted) {
        settle(() => reject(new UploadError('aborted', 'Upload cancelled.')));
        return;
      }
      options.signal.addEventListener('abort', onExternalAbort);
    }

    xhr.send(options.body);
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Network blips and stalls are worth another go; a rejection from the server is not. */
function isRetryable(error: unknown): boolean {
  if (!(error instanceof UploadError)) return false;
  if (error.reason === 'network' || error.reason === 'stalled') return true;
  return error.reason === 'server' && error.status >= 500;
}

async function withRetry<T>(attempt: (tryIndex: number) => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let tryIndex = 0; tryIndex < MAX_ATTEMPTS_PER_CHUNK; tryIndex += 1) {
    try {
      return await attempt(tryIndex);
    } catch (error: unknown) {
      lastError = error;
      if (!isRetryable(error) || tryIndex === MAX_ATTEMPTS_PER_CHUNK - 1) throw error;
      await delay(RETRY_BACKOFF_MS[Math.min(tryIndex, RETRY_BACKOFF_MS.length - 1)] ?? 3_000);
    }
  }
  throw lastError;
}

/**
 * A File handle can go stale between being picked and being sent — Android
 * re-materialises files chosen from Drive/WhatsApp, and the browser then
 * refuses to read them. Touch the first bytes up front so that failure is a
 * clear "pick the file again" instead of a mystery halfway through.
 */
async function assertReadable(file: File): Promise<void> {
  try {
    await file.slice(0, Math.min(1024, file.size || 1)).arrayBuffer();
  } catch {
    throw new UploadError(
      'unreadable-file',
      'That file could not be read from your device. Please choose it again.',
    );
  }
}

function parseEnvelope(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Random, URL-safe, and matched by the server's upload-id whitelist. */
function newUploadId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Tell the server that an upload failed here, on the device.
 *
 * The 2026-08-19 incident had ZERO server-side footprint: every failure died in
 * the browser, so nothing was recorded and the cause could not be established.
 * This is that missing evidence. Best-effort — it must never mask the real
 * error, so every failure inside it is swallowed.
 */
export function reportUploadFailure(input: {
  baseUrl: string;
  authToken: string;
  assignmentId: string;
  file: File;
  error: unknown;
  bytesSent: number;
  durationMs: number;
  chunkIndex: number;
}): void {
  try {
    const { error } = input;
    const connection = (navigator as unknown as {
      connection?: { effectiveType?: string; downlink?: number };
    }).connection;

    const body = JSON.stringify({
      assignment_id: input.assignmentId,
      reason: error instanceof UploadError ? error.reason : 'unknown',
      http_status: error instanceof UploadError ? error.status : 0,
      bytes_sent: input.bytesSent,
      total_bytes: input.file.size,
      duration_ms: Math.round(input.durationMs),
      chunk_index: input.chunkIndex,
      file_type: input.file.type || 'unknown',
      network: connection?.effectiveType ?? 'unknown',
      downlink: connection?.downlink != null ? String(connection.downlink) : 'unknown',
      message: error instanceof Error ? error.message : String(error),
    });

    const url =
      `${input.baseUrl}assignment/upload_diagnostics?auth_token=${encodeURIComponent(input.authToken)}`;

    // keepalive so the report still goes out if the student closes the dialog
    // or the tab straight after the failure.
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Diagnostics must never interfere with the student's own error.
  }
}

export interface ChunkedUploadOptions {
  /** API base, already ending in a slash. */
  baseUrl: string;
  authToken: string;
  assignmentId: string;
  file: File;
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

/** Mutable counters shared with the failure report, so a report knows how far it got. */
interface UploadTelemetry {
  bytesSent: number;
  chunkIndex: number;
}

/**
 * Upload a submission in chunks and finalise it. Resolves with the server's
 * response envelope — identical in shape to the single-shot route's, so callers
 * treat both paths the same.
 */
export async function uploadAssignmentInChunks(
  options: ChunkedUploadOptions,
): Promise<Record<string, unknown> | null> {
  const telemetry: UploadTelemetry = { bytesSent: 0, chunkIndex: 0 };
  const startedAt = Date.now();

  try {
    return await performChunkedUpload(options, telemetry);
  } catch (error: unknown) {
    reportUploadFailure({
      baseUrl: options.baseUrl,
      authToken: options.authToken,
      assignmentId: options.assignmentId,
      file: options.file,
      error,
      bytesSent: telemetry.bytesSent,
      durationMs: Date.now() - startedAt,
      chunkIndex: telemetry.chunkIndex,
    });
    throw error;
  }
}

async function performChunkedUpload(
  options: ChunkedUploadOptions,
  telemetry: UploadTelemetry,
): Promise<Record<string, unknown> | null> {
  const { baseUrl, authToken, assignmentId, file, onProgress, signal } = options;
  const total = file.size;

  onProgress?.({ loaded: 0, total, percent: 0, phase: 'checking' });
  await assertReadable(file);

  const uploadId = newUploadId();
  const chunkCount = Math.max(1, Math.ceil(total / CHUNK_SIZE));
  const auth = encodeURIComponent(authToken);
  const percentOf = (loaded: number): number => (total > 0 ? Math.round((loaded / total) * 100) : 0);

  for (let index = 0; index < chunkCount; index += 1) {
    telemetry.chunkIndex = index;
    const start = index * CHUNK_SIZE;
    const slice = file.slice(start, Math.min(start + CHUNK_SIZE, total));
    const url =
      `${baseUrl}assignment/submit_assignment/chunk?auth_token=${auth}`
      + `&upload_id=${uploadId}&chunk_index=${index}&chunk_count=${chunkCount}`;

    await withRetry(async () => {
      const response = await xhrSend({
        url,
        body: slice,
        contentType: 'application/octet-stream',
        ...(signal ? { signal } : {}),
        onProgress: (loaded) => {
          // Progress within the current chunk, on top of chunks already banked.
          const done = Math.min(telemetry.bytesSent + loaded, total);
          onProgress?.({ loaded: done, total, percent: percentOf(done), phase: 'uploading' });
        },
      });

      if (response.status === 413) {
        throw new UploadError('too-large', 'That file is too large to upload.', 413);
      }
      if (response.status < 200 || response.status >= 300) {
        const message =
          (parseEnvelope(response.text)?.message as string | undefined)
          ?? 'The server could not store part of your file.';
        throw new UploadError('server', message, response.status);
      }
    });

    telemetry.bytesSent = Math.min(telemetry.bytesSent + slice.size, total);
    onProgress?.({
      loaded: telemetry.bytesSent,
      total,
      percent: percentOf(telemetry.bytesSent),
      phase: 'uploading',
    });
  }

  onProgress?.({ loaded: total, total, percent: 100, phase: 'finishing' });

  // Assembling and pushing to object storage happens server-side and can take a
  // few seconds on a large file; the same retry policy covers a blip here.
  return withRetry(async () => {
    const response = await xhrSend({
      url: `${baseUrl}assignment/submit_assignment/complete?auth_token=${auth}`,
      contentType: 'application/json',
      ...(signal ? { signal } : {}),
      body: JSON.stringify({
        upload_id: uploadId,
        assignment_id: assignmentId,
        file_name: file.name,
        content_type: file.type || 'application/pdf',
        chunk_count: chunkCount,
      }),
    });

    if (response.status < 200 || response.status >= 300) {
      const message =
        (parseEnvelope(response.text)?.message as string | undefined)
        ?? 'The server could not finish your submission.';
      throw new UploadError('server', message, response.status);
    }
    return parseEnvelope(response.text);
  });
}
