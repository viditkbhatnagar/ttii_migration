import { createHash, createHmac } from 'node:crypto';
import { mkdir, rm, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import type {
  IntegrationLogger,
  StorageDeleteRequest,
  StorageProvider,
  StorageSignedDownloadRequest,
  StorageUploadRequest,
  StorageUploadResult,
} from './contracts.js';

function toBuffer(value: string | Uint8Array | Buffer): Buffer {
  if (typeof value === 'string') {
    return Buffer.from(value);
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  return Buffer.from(value);
}

function normalizeObjectKey(key: string): string {
  const normalized = key.trim().replace(/^\/+/, '');
  if (!normalized) {
    throw new Error('Storage key is required.');
  }

  if (normalized.includes('..')) {
    throw new Error('Storage key cannot contain parent traversal segments.');
  }

  return normalized
    .split('/')
    .filter((segment) => segment.length > 0)
    .join('/');
}

function encodePathSegments(pathValue: string): string {
  return pathValue
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function hashSha256Hex(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function hmacSha256Hex(key: string | Buffer, value: string): string {
  return createHmac('sha256', key).update(value).digest('hex');
}

function formatAmzDate(input: Date): string {
  const year = input.getUTCFullYear();
  const month = `${input.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${input.getUTCDate()}`.padStart(2, '0');
  const hour = `${input.getUTCHours()}`.padStart(2, '0');
  const minute = `${input.getUTCMinutes()}`.padStart(2, '0');
  const second = `${input.getUTCSeconds()}`.padStart(2, '0');
  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

function formatDateStamp(input: Date): string {
  const year = input.getUTCFullYear();
  const month = `${input.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${input.getUTCDate()}`.padStart(2, '0');
  return `${year}${month}${day}`;
}

export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local-storage';
  private readonly absoluteRoot: string;

  constructor(
    rootPath: string,
    private readonly signingKey: string,
    private readonly logger: IntegrationLogger,
  ) {
    this.absoluteRoot = resolve(rootPath);
  }

  async uploadObject(input: StorageUploadRequest): Promise<StorageUploadResult> {
    const key = normalizeObjectKey(input.key);
    const destination = this.resolveKeyPath(key);
    const body = toBuffer(input.body);

    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, body);

    const etag = hashSha256Hex(body);

    this.logger.info('integration.storage.upload', {
      provider: this.name,
      key,
      bytes: body.byteLength,
      etag,
    });

    return {
      key,
      provider: this.name,
      location: `file://${destination}`,
      etag,
    };
  }

  async deleteObject(input: StorageDeleteRequest): Promise<void> {
    const key = normalizeObjectKey(input.key);
    const destination = this.resolveKeyPath(key);

    try {
      await unlink(destination);
      this.logger.info('integration.storage.delete', {
        provider: this.name,
        key,
      });
    } catch (error) {
      const maybeError = error as NodeJS.ErrnoException;
      if (maybeError.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  createSignedDownloadUrl(input: StorageSignedDownloadRequest): Promise<string> {
    const key = normalizeObjectKey(input.key);
    const expiresAt = Math.floor(Date.now() / 1000) + input.expiresInSeconds;
    const payload = `${key}:${expiresAt}`;
    const signature = hmacSha256Hex(this.signingKey, payload);
    const encodedKey = encodeURIComponent(key);

    return Promise.resolve(`local://download/${encodedKey}?expires=${expiresAt}&signature=${signature}`);
  }

  async clearAll(): Promise<void> {
    await rm(this.absoluteRoot, {
      recursive: true,
      force: true,
    });
  }

  private resolveKeyPath(key: string): string {
    const targetPath = resolve(this.absoluteRoot, key);

    if (targetPath !== this.absoluteRoot && !targetPath.startsWith(`${this.absoluteRoot}${sep}`)) {
      throw new Error('Resolved storage path escapes local storage root.');
    }

    return targetPath;
  }
}

export interface S3StorageProviderConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string | undefined;
  forcePathStyle: boolean;
  publicBaseUrl: string | undefined;
}

interface SignedRequest {
  url: URL;
  headers: Record<string, string>;
}

export class S3StorageProvider implements StorageProvider {
  readonly name = 's3-storage';
  private readonly endpoint: URL;

  constructor(
    private readonly config: S3StorageProviderConfig,
    private readonly logger: IntegrationLogger,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    const endpoint = config.endpoint?.trim() || `https://s3.${config.region}.amazonaws.com`;
    this.endpoint = new URL(endpoint);
  }

  async uploadObject(input: StorageUploadRequest): Promise<StorageUploadResult> {
    const key = normalizeObjectKey(input.key);
    const objectUrl = this.buildObjectUrl(key);
    const body = toBuffer(input.body);
    const payloadHash = hashSha256Hex(body);

    const signed = this.signRequest({
      method: 'PUT',
      url: objectUrl,
      payloadHash,
      extraHeaders: {
        ...(input.contentType ? { 'content-type': input.contentType } : {}),
        ...(input.cacheControl ? { 'cache-control': input.cacheControl } : {}),
      },
    });

    const response = await this.fetchImpl(signed.url, {
      method: 'PUT',
      headers: signed.headers,
      body: new Uint8Array(body),
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed (${response.status}): ${(await response.text()).slice(0, 256)}`);
    }

    const etag = response.headers.get('etag') ?? payloadHash;

    this.logger.info('integration.storage.upload', {
      provider: this.name,
      key,
      bytes: body.byteLength,
      etag,
    });

    return {
      key,
      provider: this.name,
      location: this.resolvePublicLocation(key),
      etag,
    };
  }

  async deleteObject(input: StorageDeleteRequest): Promise<void> {
    const key = normalizeObjectKey(input.key);
    const objectUrl = this.buildObjectUrl(key);

    const signed = this.signRequest({
      method: 'DELETE',
      url: objectUrl,
      payloadHash: hashSha256Hex(''),
      extraHeaders: {},
    });

    const response = await this.fetchImpl(signed.url, {
      method: 'DELETE',
      headers: signed.headers,
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`S3 delete failed (${response.status}): ${(await response.text()).slice(0, 256)}`);
    }

    this.logger.info('integration.storage.delete', {
      provider: this.name,
      key,
      status: response.status,
    });
  }

  createSignedDownloadUrl(input: StorageSignedDownloadRequest): Promise<string> {
    const key = normalizeObjectKey(input.key);
    const url = this.buildObjectUrl(key);
    const now = new Date();
    const amzDate = formatAmzDate(now);
    const dateStamp = formatDateStamp(now);
    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;

    const query = new Map<string, string>([
      ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
      ['X-Amz-Credential', `${this.config.accessKeyId}/${credentialScope}`],
      ['X-Amz-Date', amzDate],
      ['X-Amz-Expires', String(input.expiresInSeconds)],
      ['X-Amz-SignedHeaders', 'host'],
    ]);

    if (input.fileName && input.fileName.trim() !== '') {
      query.set('response-content-disposition', `attachment; filename="${input.fileName}"`);
    }

    const canonicalQuery = this.canonicalQueryString(query);
    const canonicalRequest = [
      'GET',
      this.canonicalUri(url),
      canonicalQuery,
      `host:${url.host}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      hashSha256Hex(canonicalRequest),
    ].join('\n');

    const signingKey = this.signingKey(dateStamp);
    const signature = hmacSha256Hex(signingKey, stringToSign);

    query.set('X-Amz-Signature', signature);

    const signedUrl = new URL(url.toString());
    signedUrl.search = this.canonicalQueryString(query);

    return Promise.resolve(signedUrl.toString());
  }

  private resolvePublicLocation(key: string): string {
    const encodedKey = encodePathSegments(key);

    if (this.config.publicBaseUrl) {
      return `${this.config.publicBaseUrl.replace(/\/+$/, '')}/${encodedKey}`;
    }

    return this.buildObjectUrl(key).toString();
  }

  private buildObjectUrl(key: string): URL {
    const normalizedKey = normalizeObjectKey(key);
    const encodedKey = encodePathSegments(normalizedKey);
    const url = new URL(this.endpoint.toString());
    const endpointPath = url.pathname.replace(/\/+$/, '');

    if (this.config.forcePathStyle) {
      const prefix = endpointPath === '' ? '' : endpointPath;
      url.pathname = `${prefix}/${this.config.bucket}/${encodedKey}`;
      return url;
    }

    url.hostname = `${this.config.bucket}.${url.hostname}`;
    const prefix = endpointPath === '' ? '' : endpointPath;
    url.pathname = `${prefix}/${encodedKey}`;
    return url;
  }

  private signRequest(input: {
    method: 'PUT' | 'DELETE';
    url: URL;
    payloadHash: string;
    extraHeaders: Record<string, string>;
  }): SignedRequest {
    const now = new Date();
    const amzDate = formatAmzDate(now);
    const dateStamp = formatDateStamp(now);
    const credentialScope = `${dateStamp}/${this.config.region}/s3/aws4_request`;

    const normalizedExtraHeaders = Object.entries(input.extraHeaders).reduce<Record<string, string>>(
      (accumulator, [key, value]) => {
        if (value.trim() === '') {
          return accumulator;
        }

        accumulator[key.toLowerCase()] = value.trim();
        return accumulator;
      },
      {},
    );

    const canonicalHeadersMap: Record<string, string> = {
      ...normalizedExtraHeaders,
      host: input.url.host,
      'x-amz-content-sha256': input.payloadHash,
      'x-amz-date': amzDate,
    };

    const signedHeaderKeys = Object.keys(canonicalHeadersMap).sort();
    const canonicalHeaders = `${signedHeaderKeys
      .map((key) => `${key}:${canonicalHeadersMap[key]}`)
      .join('\n')}\n`;
    const signedHeaders = signedHeaderKeys.join(';');

    const canonicalRequest = [
      input.method,
      this.canonicalUri(input.url),
      '',
      canonicalHeaders,
      signedHeaders,
      input.payloadHash,
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      hashSha256Hex(canonicalRequest),
    ].join('\n');

    const signature = hmacSha256Hex(this.signingKey(dateStamp), stringToSign);
    const authorization =
      `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      url: input.url,
      headers: {
        ...normalizedExtraHeaders,
        'x-amz-content-sha256': input.payloadHash,
        'x-amz-date': amzDate,
        Authorization: authorization,
      },
    };
  }

  private signingKey(dateStamp: string): Buffer {
    const dateKey = createHmac('sha256', `AWS4${this.config.secretAccessKey}`).update(dateStamp).digest();
    const regionKey = createHmac('sha256', dateKey).update(this.config.region).digest();
    const serviceKey = createHmac('sha256', regionKey).update('s3').digest();
    return createHmac('sha256', serviceKey).update('aws4_request').digest();
  }

  private canonicalUri(url: URL): string {
    const decodedPath = decodeURIComponent(url.pathname);
    return decodedPath
      .split('/')
      .map((segment) => encodeRfc3986(segment))
      .join('/')
      .replace(/%2F/g, '/');
  }

  private canonicalQueryString(values: Map<string, string>): string {
    const entries = Array.from(values.entries()).map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)] as const);

    entries.sort((left, right) => {
      if (left[0] === right[0]) {
        return left[1].localeCompare(right[1]);
      }

      return left[0].localeCompare(right[0]);
    });

    return entries.map(([key, value]) => `${key}=${value}`).join('&');
  }
}
