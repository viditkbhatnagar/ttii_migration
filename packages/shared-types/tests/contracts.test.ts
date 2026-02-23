import { describe, expect, it } from 'vitest';

import { LEGACY_ROLE_ID, type ApiEnvelope, type ApiHealthPayload, type PortalSurface } from '../src/index';

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

  it('keeps legacy role ids stable for frontend RBAC routing', () => {
    const roleMap: Record<PortalSurface, number> = {
      admin: LEGACY_ROLE_ID.ADMIN,
      centre: LEGACY_ROLE_ID.CENTRE,
      student: LEGACY_ROLE_ID.STUDENT,
    };

    expect(roleMap.admin).toBe(1);
    expect(roleMap.centre).toBe(7);
    expect(roleMap.student).toBe(2);
  });
});
