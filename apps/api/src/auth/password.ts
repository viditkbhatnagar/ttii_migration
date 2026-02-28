import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import bcrypt from 'bcryptjs';

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function toBuffer(value: string): Buffer {
  return Buffer.from(value, 'hex');
}

export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const key = scryptSync(plainPassword, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });

  return await Promise.resolve(`scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${key.toString('hex')}`);
}

function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2y$') || hash.startsWith('$2a$') || hash.startsWith('$2b$');
}

async function verifyBcrypt(plainPassword: string, storedHash: string): Promise<boolean> {
  // bcryptjs expects $2a$ prefix; PHP's $2y$ is compatible
  const normalizedHash = storedHash.replace(/^\$2y\$/, '$2a$');
  return bcrypt.compare(plainPassword, normalizedHash);
}

function verifyScrypt(plainPassword: string, storedHash: string): boolean {
  const parts = storedHash.split('$');
  if (parts.length !== 6) {
    return false;
  }

  const nRaw = parts[1];
  const rRaw = parts[2];
  const pRaw = parts[3];
  const salt = parts[4];
  const expectedHash = parts[5];

  if (!nRaw || !rRaw || !pRaw || !salt || !expectedHash) {
    return false;
  }

  const n = Number.parseInt(nRaw, 10);
  const r = Number.parseInt(rRaw, 10);
  const p = Number.parseInt(pRaw, 10);

  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  const derivedKey = scryptSync(plainPassword, salt, SCRYPT_KEY_LENGTH, {
    N: n,
    r,
    p,
  });

  const expectedBuffer = toBuffer(expectedHash);
  if (expectedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, derivedKey);
}

export async function verifyPassword(
  plainPassword: string,
  storedHash: string | null | undefined,
): Promise<boolean> {
  if (!storedHash) {
    return false;
  }

  if (storedHash.startsWith('scrypt$')) {
    return verifyScrypt(plainPassword, storedHash);
  }

  if (isBcryptHash(storedHash)) {
    return verifyBcrypt(plainPassword, storedHash);
  }

  return false;
}
