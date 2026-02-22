import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

describe('GET /api/health', () => {
  const app = buildApp();

  afterAll(async () => {
    await app.close();
  });

  it('returns service health envelope', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    const body = response.json<{
      data: {
        status: string;
        service: string;
      };
    }>();

    expect(response.statusCode).toBe(200);
    expect(body.data.status).toBe('ok');
    expect(body.data.service).toBe('api');
  });
});
