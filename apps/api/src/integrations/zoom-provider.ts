import { createHmac } from 'node:crypto';

import type { ZoomProvider, ZoomSdkSignature, ZoomSdkSignatureRequest } from './contracts.js';

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function signJwt(payload: Record<string, number | string>, secret: string): string {
  const headerEncoded = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${headerEncoded}.${payloadEncoded}`;
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export class NoopZoomProvider implements ZoomProvider {
  readonly name = 'noop-zoom';

  generateSdkSignature(input: ZoomSdkSignatureRequest): ZoomSdkSignature {
    const issuedAt = input.issuedAt ?? new Date();
    const expiresAt = new Date(issuedAt.getTime() + Math.max(1, input.expiresInSeconds ?? 60) * 1000);

    return {
      signature: base64UrlEncode(`${input.meetingNumber}:${input.role}:${issuedAt.toISOString()}`),
      issuedAt,
      expiresAt,
    };
  }
}

export interface ZoomSdkProviderConfig {
  sdkKey: string;
  sdkSecret: string;
  signatureTtlSeconds: number;
}

export class ZoomSdkProvider implements ZoomProvider {
  readonly name = 'zoom-sdk';

  constructor(private readonly config: ZoomSdkProviderConfig) {}

  generateSdkSignature(input: ZoomSdkSignatureRequest): ZoomSdkSignature {
    const now = input.issuedAt ?? new Date();
    const issuedAtSeconds = Math.floor(now.getTime() / 1000);
    const expiresIn = Math.max(60, input.expiresInSeconds ?? this.config.signatureTtlSeconds);
    const expiresAtSeconds = issuedAtSeconds + expiresIn;

    const payload = {
      appKey: this.config.sdkKey,
      sdkKey: this.config.sdkKey,
      mn: input.meetingNumber,
      role: input.role,
      iat: issuedAtSeconds,
      exp: expiresAtSeconds,
      tokenExp: expiresAtSeconds,
    };

    return {
      signature: signJwt(payload, this.config.sdkSecret),
      issuedAt: new Date(issuedAtSeconds * 1000),
      expiresAt: new Date(expiresAtSeconds * 1000),
    };
  }
}
