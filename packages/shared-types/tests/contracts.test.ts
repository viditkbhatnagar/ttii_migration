import { describe, expect, it } from 'vitest';

import type { ApiEnvelope, ApiHealthPayload } from '../src/index';

describe('shared api contracts', () => {
  it('keeps health envelope shape stable', () => {
    const payload: ApiEnvelope<ApiHealthPayload> = {
      data: {
        status: 'ok',
        service: 'api',
        timestamp: new Date().toISOString(),
      },
    };

    expect(payload.data.status).toBe('ok');
    expect(payload.data.service).toBe('api');
  });
});
