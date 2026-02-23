import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

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

export async function verifyPassword(
  plainPassword: string,
  storedHash: string | null | undefined,
): Promise<boolean> {
  if (!storedHash || !storedHash.startsWith('scrypt$')) {
    return await Promise.resolve(false);
  }

  const parts = storedHash.split('$');
  if (parts.length !== 6) {
    return await Promise.resolve(false);
  }

  const nRaw = parts[1];
  const rRaw = parts[2];
  const pRaw = parts[3];
  const salt = parts[4];
  const expectedHash = parts[5];

  if (!nRaw || !rRaw || !pRaw || !salt || !expectedHash) {
    return await Promise.resolve(false);
  }

  const n = Number.parseInt(nRaw, 10);
  const r = Number.parseInt(rRaw, 10);
  const p = Number.parseInt(pRaw, 10);

  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return await Promise.resolve(false);
  }

  const derivedKey = scryptSync(plainPassword, salt, SCRYPT_KEY_LENGTH, {
    N: n,
    r,
    p,
  });

  const expectedBuffer = toBuffer(expectedHash);
  if (expectedBuffer.length !== derivedKey.length) {
    return await Promise.resolve(false);
  }

  return await Promise.resolve(timingSafeEqual(expectedBuffer, derivedKey));
}
