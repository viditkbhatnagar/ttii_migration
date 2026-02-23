import { describe, expect, it } from 'vitest';

import { ZoomSdkProvider } from '../../src/integrations/zoom-provider.js';

describe('zoom integrations', () => {
  it('generates Zoom SDK signatures server-side', () => {
    const provider = new ZoomSdkProvider({
      sdkKey: 'zoom_sdk_key_123',
      sdkSecret: 'zoom_sdk_secret_12345',
      signatureTtlSeconds: 3600,
    });

    const issuedAt = new Date('2026-02-22T10:00:00.000Z');
    const signature = provider.generateSdkSignature({
      meetingNumber: '9876543210',
      role: 1,
      issuedAt,
    });

    const parts = signature.signature.split('.');
    expect(parts).toHaveLength(3);

    const payload = JSON.parse(Buffer.from(parts[1] ?? '', 'base64url').toString('utf8')) as {
      sdkKey: string;
      mn: string;
      role: number;
      iat: number;
      exp: number;
      tokenExp: number;
    };

    expect(payload.sdkKey).toBe('zoom_sdk_key_123');
    expect(payload.mn).toBe('9876543210');
    expect(payload.role).toBe(1);
    expect(payload.iat).toBe(Math.floor(issuedAt.getTime() / 1000));
    expect(payload.exp).toBe(payload.tokenExp);
    expect(signature.expiresAt.getTime()).toBeGreaterThan(signature.issuedAt.getTime());
  });
});
