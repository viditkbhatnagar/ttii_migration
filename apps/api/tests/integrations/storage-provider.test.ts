import { access } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import type { IntegrationLogger } from '../../src/integrations/contracts.js';
import { LocalStorageProvider } from '../../src/integrations/storage-provider.js';

const logger: IntegrationLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

describe('storage integrations', () => {
  it('supports local storage upload/delete and signed download URL generation', async () => {
    const root = `/tmp/ttii-storage-test-${Date.now()}`;
    const provider = new LocalStorageProvider(root, 'ttii-local-storage-sign-key', logger);

    const uploaded = await provider.uploadObject({
      key: 'phase-05/contracts/readme.txt',
      body: 'integration-storage-test',
      contentType: 'text/plain',
    });

    expect(uploaded.provider).toBe('local-storage');
    expect(uploaded.location.startsWith('file://')).toBe(true);
    expect(uploaded.etag).toBeTruthy();

    const signedUrl = await provider.createSignedDownloadUrl({
      key: 'phase-05/contracts/readme.txt',
      expiresInSeconds: 300,
    });

    expect(signedUrl.startsWith('local://download/')).toBe(true);
    expect(signedUrl.includes('signature=')).toBe(true);

    const filePath = uploaded.location.slice('file://'.length);
    await expect(access(filePath)).resolves.toBeUndefined();

    await provider.deleteObject({
      key: 'phase-05/contracts/readme.txt',
    });

    await expect(access(filePath)).rejects.toThrow();
    await provider.clearAll();
  });
});
