import type { Prisma, PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { isMissingTable } from './credential-types.js';

// Credential Manager — in-app notifications (spec §2.11 / §6.4). Deduplicated by
// key + audience + recipient. Nothing is emailed from here: email_status stays
// "not_sent" (the issue flow records its own email result on the digital row).

type Db = PrismaClient | Prisma.TransactionClient;

export const NOTICE_AUDIENCES = ['learner', 'centre', 'credential_admins', 'management'] as const;
export type NoticeAudience = typeof NOTICE_AUDIENCES[number];
export const ADMIN_AUDIENCES: readonly NoticeAudience[] = ['credential_admins', 'management'];

export interface CredentialNoticeInput {
  /** Event key, e.g. `dispatched:42`. Combined with audience + recipient into the unique dedupe key. */
  key: string;
  audience: NoticeAudience;
  recipientUserId?: number | null;
  centreId?: number | null;
  title: string;
  body?: string | null;
  link?: string | null;
}

export function dedupeKeyOf(input: Pick<CredentialNoticeInput, 'key' | 'audience' | 'recipientUserId' | 'centreId'>): string {
  const who = input.recipientUserId ?? (input.centreId ? `c${input.centreId}` : '-');
  return `${input.key}|${input.audience}|${who}`.slice(0, 200);
}

/**
 * Write a notice unless the same key + audience + recipient exists. Never
 * throws: a notification must not break the action that raised it. Returns
 * true when a new notice was written.
 */
export async function notifyCredential(input: CredentialNoticeInput, db: Db = getPrismaClient()): Promise<boolean> {
  try {
    await db.credential_notifications.create({
      data: {
        dedupe_key: dedupeKeyOf(input),
        audience: input.audience,
        recipient_user_id: input.recipientUserId ?? null,
        centre_id: input.centreId ?? null,
        title: input.title.slice(0, 200),
        body: input.body ?? null,
        link: input.link ? input.link.slice(0, 300) : null,
      },
    });
    return true;
  } catch {
    // Duplicate key (P2002), missing table (P2021) or any other failure: skip.
    return false;
  }
}

/** Notify both admin audiences (Credential admins + Management). */
export async function notifyCredentialAdmins(
  input: Omit<CredentialNoticeInput, 'audience'>,
  db: Db = getPrismaClient(),
): Promise<void> {
  for (const audience of ADMIN_AUDIENCES) await notifyCredential({ ...input, audience }, db);
}

export interface NoticeRow {
  id: number;
  title: string;
  body: string;
  audience: string;
  link: string;
  read: boolean;
  at: string;
  emailStatus: string;
}

interface NoticeRecord {
  id: number; title: string; body: string | null; audience: string; link: string | null;
  read_at: Date | null; created_at: Date; email_status: string;
}

function toRow(r: NoticeRecord): NoticeRow {
  return {
    id: r.id, title: r.title, body: r.body ?? '', audience: r.audience, link: r.link ?? '',
    read: r.read_at !== null, at: r.created_at.toISOString(), emailStatus: r.email_status,
  };
}

const FEED_LIMIT = 100;

export class CredentialNoticeFeed {
  constructor(private readonly db: Db = getPrismaClient()) {}

  /** Admin bell: Credential admins + Management notices (callers hold the access permission). */
  async adminFeed(): Promise<{ rows: NoticeRow[]; unread: number }> {
    try {
      const where = { audience: { in: [...ADMIN_AUDIENCES] } };
      const [rows, unread] = await Promise.all([
        this.db.credential_notifications.findMany({ where, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: FEED_LIMIT }),
        this.db.credential_notifications.count({ where: { ...where, read_at: null } }),
      ]);
      return { rows: rows.map(toRow), unread };
    } catch (error: unknown) {
      if (isMissingTable(error)) return { rows: [], unread: 0 };
      throw error;
    }
  }

  async markAdminRead(ids: readonly number[] | 'all'): Promise<number> {
    const where = ids === 'all'
      ? { audience: { in: [...ADMIN_AUDIENCES] }, read_at: null }
      : { audience: { in: [...ADMIN_AUDIENCES] }, read_at: null, id: { in: [...ids] } };
    try {
      const result = await this.db.credential_notifications.updateMany({ where, data: { read_at: new Date() } });
      return result.count;
    } catch (error: unknown) {
      if (isMissingTable(error)) return 0;
      throw error;
    }
  }

  /** A learner's own notices. */
  async learnerFeed(userId: number): Promise<NoticeRow[]> {
    try {
      const rows = await this.db.credential_notifications.findMany({
        where: { audience: 'learner', recipient_user_id: userId },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: FEED_LIMIT,
      });
      return rows.map(toRow);
    } catch (error: unknown) {
      if (isMissingTable(error)) return [];
      throw error;
    }
  }

  /** A centre's notices (its own centre id only). */
  async centreFeed(centreId: number): Promise<NoticeRow[]> {
    try {
      const rows = await this.db.credential_notifications.findMany({
        where: { audience: 'centre', centre_id: centreId },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take: FEED_LIMIT,
      });
      return rows.map(toRow);
    } catch (error: unknown) {
      if (isMissingTable(error)) return [];
      throw error;
    }
  }
}
