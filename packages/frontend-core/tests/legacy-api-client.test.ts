import { describe, expect, it, vi } from 'vitest';

import { ApiError, LegacyApiClient } from '../src/index';

function toUrl(value: RequestInfo | URL): URL {
  if (value instanceof URL) {
    return value;
  }

  if (typeof value === 'string') {
    return new URL(value);
  }

  return new URL(value.url);
}

describe('LegacyApiClient', () => {
  it('adds auth_token to GET requests', async () => {
    let requestUrl: URL | null = null;
    const fetchImpl = vi.fn((input: RequestInfo | URL) => {
      requestUrl = toUrl(input);

      return Promise.resolve(
        new Response(JSON.stringify({ status: 1, data: { ok: true } }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
      );
    }) as unknown as typeof fetch;

    const client = new LegacyApiClient({
      baseUrl: 'http://127.0.0.1:4000/api',
      fetchImpl,
    });

    await client.request({
      path: '/auth/me',
      authToken: 'student-token',
    });

    expect(requestUrl?.pathname).toBe('/api/auth/me');
    expect(String(requestUrl)).toContain('auth_token=student-token');
  });

  it('adds auth_token to POST body payloads', async () => {
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const bodyPayload = typeof init?.body === 'string' ? init.body : '{}';
      const payload = JSON.parse(bodyPayload) as Record<string, unknown>;

      expect(payload.auth_token).toBe('centre-token');
      expect(payload.name).toBe('Centre Operator');

      return Promise.resolve(
        new Response(JSON.stringify({ status: 1, data: {} }), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
      );
    }) as unknown as typeof fetch;

    const client = new LegacyApiClient({
      baseUrl: 'http://127.0.0.1:4000/api',
      fetchImpl,
    });

    await client.request({
      method: 'POST',
      path: '/centre/applications/add',
      authToken: 'centre-token',
      body: {
        name: 'Centre Operator',
      },
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws ApiError when legacy status indicates failure', async () => {
    const fetchImpl = vi.fn(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            status: 0,
            message: 'User not authenticated!',
            data: [],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      );
    }) as unknown as typeof fetch;

    const client = new LegacyApiClient({
      baseUrl: 'http://127.0.0.1:4000/api',
      fetchImpl,
    });

    await expect(
      client.request({
        path: '/auth/me',
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('accepts string success status payloads used by legacy routes', async () => {
    const fetchImpl = vi.fn(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            status: 'success',
            data: {
              ok: true,
            },
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      );
    }) as unknown as typeof fetch;

    const client = new LegacyApiClient({
      baseUrl: 'http://127.0.0.1:4000/api',
      fetchImpl,
    });

    await expect(
      client.request({
        path: '/assignment/get_assignment_details',
      }),
    ).resolves.toEqual({
      status: 'success',
      data: {
        ok: true,
      },
    });
  });

  it('accepts human-readable success status strings from legacy endpoints', async () => {
    const fetchImpl = vi.fn(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            status: 'Successfully Saved',
            data: [],
          }),
          {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      );
    }) as unknown as typeof fetch;

    const client = new LegacyApiClient({
      baseUrl: 'http://127.0.0.1:4000/api',
      fetchImpl,
    });

    await expect(
      client.request({
        path: '/assignment/save_assignment',
      }),
    ).resolves.toEqual({
      status: 'Successfully Saved',
      data: [],
    });
  });
});
