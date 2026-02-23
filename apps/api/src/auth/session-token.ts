import { createHash, randomBytes } from 'node:crypto';

export function generateOpaqueAuthToken(): string {
  return randomBytes(48).toString('base64url');
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
