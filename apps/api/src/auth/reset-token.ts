import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

interface PasswordResetPayload {
  uid: number;
  eh: string;
  iat: number;
  exp: number;
  pwh: string;
  jti: string;
}

interface CreateResetTokenInput {
  userId: number;
  email: string;
  currentPasswordHash: string;
  signingKey: string;
  ttlSeconds: number;
}

interface ValidateResetTokenInput {
  token: string;
  expectedUserId: number;
  expectedEmail: string;
  currentPasswordHash: string;
  signingKey: string;
}

export interface PasswordResetValidationResult {
  valid: boolean;
  expiresAt?: Date;
}

function base64urlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function base64urlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function digestPasswordHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 24);
}

function safeEqualString(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

function signPayload(payloadEncoded: string, signingKey: string): string {
  return createHmac('sha256', signingKey).update(payloadEncoded).digest('base64url');
}

export function createSignedPasswordResetToken(input: CreateResetTokenInput): { token: string; expiresAt: Date } {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttl = Math.max(300, input.ttlSeconds);

  const payload: PasswordResetPayload = {
    uid: input.userId,
    eh: createHash('sha256').update(normalizeEmail(input.email)).digest('hex'),
    iat: nowSeconds,
    exp: nowSeconds + ttl,
    pwh: digestPasswordHash(input.currentPasswordHash),
    jti: randomBytes(16).toString('hex'),
  };

  const payloadEncoded = base64urlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadEncoded, input.signingKey);

  return {
    token: `${payloadEncoded}.${signature}`,
    expiresAt: new Date(payload.exp * 1000),
  };
}

export function validateSignedPasswordResetToken(input: ValidateResetTokenInput): PasswordResetValidationResult {
  if (!input.token.includes('.')) {
    return { valid: false };
  }

  const [payloadEncoded, signature] = input.token.split('.', 2);
  if (!payloadEncoded || !signature) {
    return { valid: false };
  }

  const expectedSignature = signPayload(payloadEncoded, input.signingKey);
  if (!safeEqualString(expectedSignature, signature)) {
    return { valid: false };
  }

  let payload: PasswordResetPayload | null = null;
  try {
    payload = JSON.parse(base64urlDecode(payloadEncoded)) as PasswordResetPayload;
  } catch {
    return { valid: false };
  }

  if (!payload || typeof payload !== 'object') {
    return { valid: false };
  }

  const expectedEmailHash = createHash('sha256').update(normalizeEmail(input.expectedEmail)).digest('hex');
  const expectedPasswordDigest = digestPasswordHash(input.currentPasswordHash);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (payload.uid !== input.expectedUserId) {
    return { valid: false };
  }

  if (!safeEqualString(payload.eh, expectedEmailHash)) {
    return { valid: false };
  }

  if (!safeEqualString(payload.pwh, expectedPasswordDigest)) {
    return { valid: false };
  }

  if (payload.exp <= nowSeconds) {
    return { valid: false };
  }

  return {
    valid: true,
    expiresAt: new Date(payload.exp * 1000),
  };
}
