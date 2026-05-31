import { Readable } from 'node:stream';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';

import { env } from '../env.js';

// Ainvox cloud-telephony REST client (call logs + recordings).
//
// Outbound calls are placed from the browser Dialer SDK; the call logs and
// recordings live on Ainvox and are pulled on demand by the admin Call
// History feature via this server-side client. Auth is HTTP Basic
// (public:secret) — the secret key NEVER reaches the browser.
//
// NOTE: the call-log row shape is not fully specified in the Ainvox docs, so
// listCallLogs maps fields best-effort and always returns the untouched `raw`
// object. Confirm/refine the mapping against a live response once we have an
// account. See memory: project_ainvox-calling-integration.

export interface AinvoxCallLog {
  uuid: string;
  direction: string | null;
  /** The other party's number (student), in +E.164. */
  phoneNumber: string | null;
  /** Our virtual / caller-id number. */
  virtualNumber: string | null;
  status: string | null;
  durationSeconds: number | null;
  /** Path/URL to pass to getRecordingStream — null when no recording. */
  recordingUrl: string | null;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  hangupCause: string | null;
  cost: number | null;
  /** Full untouched row from Ainvox, for fields we haven't mapped yet. */
  raw: Record<string, unknown>;
}

export interface AinvoxCallLogQuery {
  phoneNumber?: string;
  direction?: 'inbound' | 'outbound';
  pageNumber?: number;
  perPage?: number;
}

export interface AinvoxCallLogPage {
  pageNumber: number;
  perPage: number;
  totalRows: number | null;
  data: AinvoxCallLog[];
}

export interface AinvoxRecordingStream {
  /** Node Readable, ready to pipe to a Fastify reply. */
  body: Readable;
  contentType: string;
  contentLength: number | null;
}

export class AinvoxError extends Error {
  public readonly code:
    | 'not_configured' // keys missing / provider disabled
    | 'unauthorized' // 401 — bad API keys
    | 'bad_request' // 400 — invalid params
    | 'not_found' // 404
    | 'network' // fetch/connectivity
    | 'unknown'; // everything else

  constructor(code: AinvoxError['code'], message: string, public readonly status?: number) {
    super(message);
    this.code = code;
    this.name = 'AinvoxError';
  }
}

interface AinvoxConfig {
  baseUrl: string;
  publicKey: string;
  secretKey: string;
  /** Required on the call-log API (verified live). */
  accountId: string;
  virtualNumber: string | null;
  timeoutMs: number;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export class AinvoxService {
  private readonly config: AinvoxConfig;

  constructor(config: AinvoxConfig) {
    this.config = config;
  }

  private authHeader(): string {
    const token = Buffer.from(`${this.config.publicKey}:${this.config.secretKey}`).toString('base64');
    return `Basic ${token}`;
  }

  private async request(path: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      return await fetch(`${this.config.baseUrl}${path}`, {
        method: 'GET',
        headers: { Authorization: this.authHeader(), 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Network error reaching Ainvox';
      throw new AinvoxError('network', message);
    } finally {
      clearTimeout(timer);
    }
  }

  private failFor(status: number): never {
    if (status === 401) throw new AinvoxError('unauthorized', 'Ainvox rejected the API credentials', status);
    if (status === 400) throw new AinvoxError('bad_request', 'Ainvox rejected the request', status);
    if (status === 404) throw new AinvoxError('not_found', 'Ainvox resource not found', status);
    throw new AinvoxError('unknown', `Ainvox returned an unexpected status (${status})`, status);
  }

  /**
   * Pull the call log, optionally filtered to one student's phone number.
   * accountId is always sent (the API 400s without it). The phoneNumber
   * filter must be +E.164 — both verified against the live API.
   */
  async listCallLogs(query: AinvoxCallLogQuery = {}): Promise<AinvoxCallLogPage> {
    const params = new URLSearchParams();
    params.set('accountId', this.config.accountId);
    params.set('pageNumber', String(query.pageNumber ?? 1));
    params.set('perPage', String(query.perPage ?? 20));
    if (query.phoneNumber) params.set('phoneNumber', query.phoneNumber);
    if (query.direction) params.set('direction', query.direction);

    const response = await this.request(`/api/calls/log?${params.toString()}`);
    if (!response.ok) this.failFor(response.status);

    const payload = (await response.json()) as Record<string, unknown>;
    const rows = Array.isArray(payload.data) ? (payload.data as Record<string, unknown>[]) : [];

    return {
      // Envelope uses currentPage/totalRows (not pageNumber) — verified live.
      pageNumber: asNumber(payload.currentPage) ?? asNumber(payload.pageNumber) ?? query.pageNumber ?? 1,
      perPage: asNumber(payload.perPage) ?? query.perPage ?? 20,
      totalRows: asNumber(payload.totalRows),
      data: rows.map((row) => ({
        uuid: asString(row.uuid) ?? '',
        direction: asString(row.direction),
        phoneNumber: asString(row.phoneNumber),
        virtualNumber: asString(row.virtualNumber),
        status: asString(row.status),
        durationSeconds: asNumber(row.duration), // string seconds in the API
        recordingUrl: asString(row.recordingUrl),
        startedAt: asString(row.startTime) ?? asString(row.dateTime),
        answeredAt: asString(row.answerTime),
        endedAt: asString(row.endTime),
        hangupCause: asString(row.hangupCause),
        cost: asNumber(row.cost),
        raw: row,
      })),
    };
  }

  /** Stream a recording file (Basic Auth proxied — never expose the secret). */
  async getRecordingStream(recordingPath: string): Promise<AinvoxRecordingStream> {
    const response = await this.request(`/api/media/file?path=${encodeURIComponent(recordingPath)}`);
    if (!response.ok) this.failFor(response.status);
    if (!response.body) throw new AinvoxError('not_found', 'Recording stream was empty');

    const contentLengthHeader = response.headers.get('content-length');
    return {
      // The undici/DOM ReadableStream and Node's stream/web ReadableStream are
      // structurally identical at runtime but typed as distinct — cast across.
      body: Readable.fromWeb(response.body as unknown as NodeWebReadableStream<Uint8Array>),
      contentType: response.headers.get('content-type') ?? 'audio/wav',
      contentLength: contentLengthHeader ? Number(contentLengthHeader) : null,
    };
  }
}

/**
 * Build the Ainvox client from env, or return null when the provider is
 * disabled / keys are missing. Routes map null to a 503 so the feature can
 * ship before the dashboard keys are generated.
 */
export function createAinvoxService(): AinvoxService | null {
  if (env.AINVOX_PROVIDER !== 'ainvox') return null;
  if (!env.AINVOX_PUBLIC_KEY || !env.AINVOX_SECRET_KEY || !env.AINVOX_ACCOUNT_ID) return null;
  return new AinvoxService({
    baseUrl: env.AINVOX_BASE_URL,
    publicKey: env.AINVOX_PUBLIC_KEY,
    secretKey: env.AINVOX_SECRET_KEY,
    accountId: env.AINVOX_ACCOUNT_ID,
    virtualNumber: env.AINVOX_VIRTUAL_NUMBER ?? null,
    timeoutMs: env.AINVOX_TIMEOUT_MS,
  });
}
