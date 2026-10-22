import type { PrismaClient } from '@prisma/client';

// Centre codes (centres.centre_id): "TTC" + 4 digits, e.g. TTC0032.
//
// Production already holds mixed shapes: the legacy PHP code "TTC0001" and the
// plain numbers ("30", "31") that addCentre wrote before 2026-10-22 while its
// response claimed TTC####. The next code is one past the highest NUMBER found
// in ANY existing code — soft-deleted centres and codes reserved by onboarding
// included — so a code is never handed out twice and never collides with an
// old numeric one.
//
// Not race-proof on its own (no UNIQUE index on centres.centre_id): callers
// that reserve a code check it again inside their write.

export const CENTRE_CODE_PREFIX = 'TTC';

/** The number inside a centre code ("TTC0032" → 32, "31" → 31, "" → 0). */
export function centreCodeNumber(code: string | null | undefined): number {
  const match = /(\d+)\s*$/.exec(String(code ?? '').trim());
  if (!match) return 0;
  const n = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
}

export function formatCentreCode(n: number): string {
  return `${CENTRE_CODE_PREFIX}${String(Math.max(1, Math.trunc(n))).padStart(4, '0')}`;
}

/** One past the highest number across every given code. */
export function nextCentreCodeFrom(codes: ReadonlyArray<string | null | undefined>): string {
  const highest = codes.reduce((max, code) => Math.max(max, centreCodeNumber(code)), 0);
  return formatCentreCode(highest + 1);
}

/** Case- and padding-insensitive comparison ("ttc32" equals "TTC0032"; "31" equals "TTC0031"). */
export function sameCentreCode(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = centreCodeNumber(a);
  const nb = centreCodeNumber(b);
  if (na > 0 || nb > 0) return na === nb;
  return String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
}

type CodeReader = Pick<PrismaClient, 'centres' | 'centre_onboarding'>;

/** Every code in use: all centres (deleted ones too) plus codes reserved by onboarding. */
export async function loadUsedCentreCodes(db: CodeReader): Promise<string[]> {
  const centres = await db.centres.findMany({ select: { centre_id: true } });
  let reserved: Array<{ centre_code: string | null }> = [];
  try {
    reserved = await db.centre_onboarding.findMany({ where: { centre_code: { not: null } }, select: { centre_code: true } });
  } catch (error: unknown) {
    // P2021: centre_onboarding not migrated yet — no reserved codes exist.
    if ((error as { code?: string } | null)?.code !== 'P2021') throw error;
  }
  return [
    ...centres.map((c) => c.centre_id ?? ''),
    ...reserved.map((r) => r.centre_code ?? ''),
  ].filter((code) => code.trim() !== '');
}

export async function nextCentreCode(db: CodeReader): Promise<string> {
  return nextCentreCodeFrom(await loadUsedCentreCodes(db));
}

/** True when `code` is already used by a centre (deleted ones too) or reserved by onboarding. */
export async function isCentreCodeTaken(db: CodeReader, code: string, ignore?: { centreId?: number; onboardingId?: number }): Promise<boolean> {
  const centres = await db.centres.findMany({ select: { id: true, centre_id: true } });
  if (centres.some((c) => c.id !== ignore?.centreId && sameCentreCode(c.centre_id, code))) return true;
  try {
    const reserved = await db.centre_onboarding.findMany({ where: { centre_code: { not: null } }, select: { id: true, centre_code: true } });
    return reserved.some((r) => r.id !== ignore?.onboardingId && sameCentreCode(r.centre_code, code));
  } catch (error: unknown) {
    if ((error as { code?: string } | null)?.code !== 'P2021') throw error;
    return false;
  }
}
