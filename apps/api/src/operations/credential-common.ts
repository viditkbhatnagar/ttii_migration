import type { Prisma, PrismaClient } from '@prisma/client';

import { NOT_SET_UP_MESSAGE, isMissingTable } from './credential-types.js';
import { notifyCredentialAdmins } from './credential-notifications.js';

// Shared helpers of the issuing side of the Credential Manager.

export interface Outcome<T = undefined> {
  status: 0 | 1;
  message: string;
  data?: T;
}
export const ok = <T>(data: T, message = 'success'): Outcome<T> => ({ status: 1, message, data });
export const fail = (message: string): Outcome<never> => ({ status: 0, message });

const IST_OFFSET_MS = 330 * 60 * 1000;
/** "Today" in IST as YYYY-MM-DD. */
export function istToday(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}
/** A YYYY-MM-DD as a @db.Date value (UTC midnight; never new Date('YYYY-MM-DD') for local-day logic). */
export function dateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}
export const ymdOf = (v: Date | null | undefined): string => (v instanceof Date && !Number.isNaN(v.getTime()) ? v.toISOString().slice(0, 10) : '');
/** DD-MM-YYYY for display in PDFs and emails. */
export function dmy(value: string): string {
  const [y, m, d] = value.split('-');
  return y && m && d ? `${d}-${m}-${y}` : value;
}
export const isoOf = (v: Date | null | undefined): string => (v instanceof Date && !Number.isNaN(v.getTime()) ? v.toISOString() : '');

/** Runs the body; a missing credential table (migration not applied) becomes a refusal, never a 500. */
export async function guarded<T>(body: () => Promise<Outcome<T>>): Promise<Outcome<T>> {
  try {
    return await body();
  } catch (error: unknown) {
    if (isMissingTable(error)) return fail(NOT_SET_UP_MESSAGE);
    throw error;
  }
}

export const NOT_SET_UP_EMPTY = { notSetUp: true, message: NOT_SET_UP_MESSAGE } as const;

type Db = PrismaClient | Prisma.TransactionClient;

/** In-app notice, deduped by key (a duplicate key is silently skipped). */
export async function notify(
  db: Db,
  input: { key: string; audience: 'learner' | 'centre' | 'credential_admins' | 'management'; recipientUserId?: number | null; centreId?: number | null; title: string; body?: string; link?: string },
): Promise<void> {
  const exists = await db.credential_notifications.findUnique({ where: { dedupe_key: input.key.slice(0, 200) }, select: { id: true } });
  if (exists) return;
  await db.credential_notifications.create({
    data: {
      dedupe_key: input.key.slice(0, 200),
      audience: input.audience,
      recipient_user_id: input.recipientUserId ?? null,
      centre_id: input.centreId ?? null,
      title: input.title.slice(0, 200),
      body: input.body ?? null,
      link: input.link?.slice(0, 300) ?? null,
    },
  });
}

/** Display names for user ids (history lines). */
export async function userNames(db: Db, ids: Array<number | null | undefined>): Promise<Map<number, string>> {
  const unique = [...new Set(ids.filter((v): v is number => typeof v === 'number' && v > 0))];
  if (unique.length === 0) return new Map();
  const rows = await db.users.findMany({ where: { id: { in: unique } }, select: { id: true, name: true } });
  return new Map(rows.map((r) => [r.id, (r.name ?? '').trim() || `User ${r.id}`]));
}

export type CredentialNoticeKind = 'issue' | 'revoke' | 'restore' | 'correction' | 'duplicate';

const NOTICE_TITLE: Record<CredentialNoticeKind, string> = {
  issue: 'Credential issued', revoke: 'Credential revoked', restore: 'Credential restored',
  correction: 'Credential corrected', duplicate: 'Credential duplicate',
};

/**
 * Admin bell notices for the Credential Manager (issue, revoke, restore, correction,
 * duplicate). Learner notices are written by notify() inside each action; this adds the
 * Credential admins / Management notices. Fire-and-forget: notifyCredential never throws.
 */
export function emitCredentialNotice(kind: CredentialNoticeKind, doc: { id: number; userId: number; documentNo: string }): void {
  void notifyCredentialAdmins({
    key: kind === 'issue' || kind === 'correction' ? `doc-${kind}:${doc.id}` : `doc-${kind}:${doc.id}:${Date.now()}`, title: NOTICE_TITLE[kind], body: doc.documentNo,
    link: kind === 'issue' ? '/admin/credentials/delivery' : '/admin/credentials/issued',
  });
}
