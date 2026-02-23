import { ApiError } from './api-error.js';

export type QueryValue = string | number | boolean | null | undefined;

export interface LegacyApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

export interface LegacyApiRequestOptions {
  method?: 'GET' | 'POST';
  path: string;
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
  authToken?: string;
  signal?: AbortSignal;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function toQueryStringValue(value: QueryValue): string {
  return typeof value === 'boolean' ? String(Number(value)) : String(value);
}

function extractMessage(payload: unknown, fallbackMessage: string): string {
  if (isRecord(payload) && typeof payload.message === 'string' && payload.message.trim() !== '') {
    return payload.message;
  }

  return fallbackMessage;
}

export function isLegacySuccessStatus(status: unknown): boolean {
  if (status === 1 || status === true) {
    return true;
  }

  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    if (normalized === '1' || normalized === 'true' || normalized === 'success' || normalized === 'ok') {
      return true;
    }

    // Some legacy routes return human-readable status strings like
    // "Successfully Saved" instead of numeric/boolean flags.
    return normalized.startsWith('success');
  }

  return false;
}

export class LegacyApiClient {
  private readonly baseUrl: string;

  private readonly fetchImpl: typeof fetch;

  constructor(options: LegacyApiClientOptions) {
    this.baseUrl = withTrailingSlash(options.baseUrl);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async request<T>(options: LegacyApiRequestOptions): Promise<T> {
    const method = options.method ?? (options.body ? 'POST' : 'GET');
    const query = { ...(options.query ?? {}) };
    const body = { ...(options.body ?? {}) };

    if (options.authToken) {
      if (method === 'GET') {
        query.auth_token = options.authToken;
      } else {
        body.auth_token = options.authToken;
      }
    }

    const url = this.buildRequestUrl(options.path, query);
    const requestInit: RequestInit = {
      method,
    };

    if (options.signal) {
      requestInit.signal = options.signal;
    }

    if (method === 'POST') {
      requestInit.headers = {
        'content-type': 'application/json',
      };
      requestInit.body = JSON.stringify(body);
    }

    const response = await this.fetchImpl(url, requestInit);

    const payload = await this.parseResponse(response, options.path);
    this.ensureSuccess(payload, response, options.path);

    return payload as T;
  }

  private buildRequestUrl(path: string, query: Record<string, QueryValue>): URL {
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(normalizedPath, this.baseUrl);

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      url.searchParams.set(key, toQueryStringValue(value));
    }

    return url;
  }

  private async parseResponse(response: Response, path: string): Promise<unknown> {
    const text = await response.text();

    if (text.trim() === '') {
      return {};
    }

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ApiError('API returned invalid JSON.', {
        statusCode: response.status,
        payload: text,
        path,
      });
    }
  }

  private ensureSuccess(payload: unknown, response: Response, path: string): void {
    if (!response.ok) {
      throw new ApiError(extractMessage(payload, `Request failed with status ${response.status}.`), {
        statusCode: response.status,
        status: isRecord(payload) ? payload.status : undefined,
        payload,
        path,
      });
    }

    if (isRecord(payload) && Object.hasOwn(payload, 'status') && !isLegacySuccessStatus(payload.status)) {
      throw new ApiError(extractMessage(payload, 'Request failed.'), {
        statusCode: response.status >= 400 ? response.status : 400,
        status: payload.status,
        payload,
        path,
      });
    }
  }
}
