import { describe, expect, it } from 'vitest';

import type { IntegrationLogger } from '../../src/integrations/contracts.js';
import { S3StorageProvider, type S3StorageProviderConfig } from '../../src/integrations/storage-provider.js';

/**
 * CI-safe unit tests for the S3-compatible storage provider.
 *
 * This is the code path TTII uses for DigitalOcean Spaces (Spaces speaks the
 * S3 API, so the same SigV4 request construction applies). These tests use a
 * fake fetch — no network, fully deterministic — and assert the AWS Signature
 * V4 request shape, path-style vs virtual-hosted addressing, the public/CDN
 * location resolution, the public-read ACL toggle, and the presigned download
 * URL structure. The live round-trip against a real S3 server lives in the
 * gated e2e test (s3-storage-provider.e2e.test.ts).
 */

const logger: IntegrationLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

interface CapturedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
}

function makeFakeFetch(): { calls: CapturedCall[]; fetchImpl: typeof fetch } {
  const calls: CapturedCall[] = [];
  const fetchImpl = ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? 'GET').toUpperCase();
    const headers: Record<string, string> = {};
    const rawHeaders = init?.headers as Record<string, string> | undefined;
    if (rawHeaders) {
      for (const [key, value] of Object.entries(rawHeaders)) {
        headers[key.toLowerCase()] = String(value);
      }
    }
    calls.push({ url, method, headers });
    return Promise.resolve(new Response(null, { status: 200, headers: { etag: '"fake-etag"' } }));
  }) as unknown as typeof fetch;

  return { calls, fetchImpl };
}

// Mirrors a DigitalOcean Spaces config: Bangalore region (blr1), the Spaces
// endpoint, path-style addressing (works on both DO and MinIO).
const doSpacesConfig: S3StorageProviderConfig = {
  bucket: 'ttii-recordings',
  region: 'blr1',
  accessKeyId: 'DO00EXAMPLEACCESSKEY',
  secretAccessKey: 'example-spaces-secret-key',
  endpoint: 'https://blr1.digitaloceanspaces.com',
  forcePathStyle: true,
  publicBaseUrl: undefined,
};

const AMZ_DATE_RE = /^\d{8}T\d{6}Z$/;
const HEX64_RE = /^[0-9a-f]{64}$/;

describe('S3StorageProvider (DigitalOcean Spaces code path)', () => {
  it('signs an uploadObject PUT with AWS SigV4 against the DigitalOcean Spaces endpoint', async () => {
    const { calls, fetchImpl } = makeFakeFetch();
    const provider = new S3StorageProvider(doSpacesConfig, logger, fetchImpl);

    const result = await provider.uploadObject({
      key: 'recordings/2026/06/12/clip.mp4',
      body: 'hello-spaces',
      contentType: 'video/mp4',
    });

    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.method).toBe('PUT');
    // Path-style: <endpoint>/<bucket>/<key>
    expect(call.url).toBe('https://blr1.digitaloceanspaces.com/ttii-recordings/recordings/2026/06/12/clip.mp4');
    expect(call.headers['content-type']).toBe('video/mp4');
    expect(call.headers['x-amz-date']).toMatch(AMZ_DATE_RE);
    expect(call.headers['x-amz-content-sha256']).toMatch(HEX64_RE);
    // SigV4 credential scope: <key>/<date>/<region>/s3/aws4_request
    expect(call.headers['authorization']).toContain('AWS4-HMAC-SHA256 Credential=DO00EXAMPLEACCESSKEY/');
    expect(call.headers['authorization']).toContain('/blr1/s3/aws4_request');
    expect(call.headers['authorization']).toContain('Signature=');

    expect(result.provider).toBe('s3-storage');
    expect(result.key).toBe('recordings/2026/06/12/clip.mp4');
    // No CDN base configured -> location is the object URL itself.
    expect(result.location).toBe('https://blr1.digitaloceanspaces.com/ttii-recordings/recordings/2026/06/12/clip.mp4');
    expect(result.etag).toBe('"fake-etag"');
  });

  it('resolves the public location via the CDN base URL when configured', async () => {
    const { fetchImpl } = makeFakeFetch();
    const provider = new S3StorageProvider(
      { ...doSpacesConfig, publicBaseUrl: 'https://cdn.teachersindia.in/' },
      logger,
      fetchImpl,
    );

    const result = await provider.uploadObject({
      key: 'recordings/2026/06/12/clip.mp4',
      body: 'hello-cdn',
    });

    expect(result.location).toBe('https://cdn.teachersindia.in/recordings/2026/06/12/clip.mp4');
  });

  it('uses virtual-hosted-style addressing when forcePathStyle is false', async () => {
    const { calls, fetchImpl } = makeFakeFetch();
    const provider = new S3StorageProvider({ ...doSpacesConfig, forcePathStyle: false }, logger, fetchImpl);

    await provider.uploadObject({ key: 'recordings/x.mp4', body: 'v' });

    expect(calls[0]!.url).toBe('https://ttii-recordings.blr1.digitaloceanspaces.com/recordings/x.mp4');
  });

  it('only sends the public-read ACL header when publicRead is requested', async () => {
    const { calls, fetchImpl } = makeFakeFetch();
    const provider = new S3StorageProvider(doSpacesConfig, logger, fetchImpl);

    await provider.uploadObject({ key: 'private/clip.mp4', body: 'v' });
    expect(calls[0]!.headers['x-amz-acl']).toBeUndefined();

    await provider.uploadObject({ key: 'public/logo.png', body: 'v', publicRead: true });
    expect(calls[1]!.headers['x-amz-acl']).toBe('public-read');
  });

  it('signs a deleteObject DELETE request', async () => {
    const { calls, fetchImpl } = makeFakeFetch();
    const provider = new S3StorageProvider(doSpacesConfig, logger, fetchImpl);

    await provider.deleteObject({ key: 'recordings/old.mp4' });

    expect(calls[0]!.method).toBe('DELETE');
    expect(calls[0]!.url).toBe('https://blr1.digitaloceanspaces.com/ttii-recordings/recordings/old.mp4');
    expect(calls[0]!.headers['authorization']).toContain('AWS4-HMAC-SHA256 Credential=');
  });

  it('builds a presigned GET URL with the expected X-Amz query parameters (no network call)', async () => {
    const { calls, fetchImpl } = makeFakeFetch();
    const provider = new S3StorageProvider(doSpacesConfig, logger, fetchImpl);

    const signedUrl = await provider.createSignedDownloadUrl({
      key: 'recordings/2026/06/12/clip.mp4',
      expiresInSeconds: 900,
      fileName: 'lecture-12-june.mp4',
    });

    // Presigning is offline: it must not hit the network.
    expect(calls).toHaveLength(0);

    const parsed = new URL(signedUrl);
    expect(parsed.origin).toBe('https://blr1.digitaloceanspaces.com');
    expect(parsed.pathname).toBe('/ttii-recordings/recordings/2026/06/12/clip.mp4');

    const params = parsed.searchParams;
    expect(params.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256');
    expect(params.get('X-Amz-Credential')).toMatch(/^DO00EXAMPLEACCESSKEY\/\d{8}\/blr1\/s3\/aws4_request$/);
    expect(params.get('X-Amz-Date')).toMatch(AMZ_DATE_RE);
    expect(params.get('X-Amz-Expires')).toBe('900');
    expect(params.get('X-Amz-SignedHeaders')).toBe('host');
    expect(params.get('X-Amz-Signature')).toMatch(HEX64_RE);
    expect(params.get('response-content-disposition')).toContain('lecture-12-june.mp4');
  });

  it('normalizes keys and rejects parent-traversal segments', async () => {
    const { calls, fetchImpl } = makeFakeFetch();
    const provider = new S3StorageProvider(doSpacesConfig, logger, fetchImpl);

    // Leading slashes are stripped.
    await provider.uploadObject({ key: '///recordings/leading.mp4', body: 'v' });
    expect(calls[0]!.url).toBe('https://blr1.digitaloceanspaces.com/ttii-recordings/recordings/leading.mp4');

    await expect(provider.uploadObject({ key: 'recordings/../secrets.txt', body: 'v' })).rejects.toThrow(
      /parent traversal/i,
    );
  });
});
