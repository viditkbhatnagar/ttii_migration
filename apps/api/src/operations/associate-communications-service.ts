import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { ASSOCIATE_ROLE_ID, isoOrEmpty, toPositiveInt } from './associate-admin-model.js';

// Admin → Associate Management → Communications (Naji's design, TTII
// 2026-10-12). A MANUAL log: staff record a call / WhatsApp / email / note with
// an associate that already happened. Nothing is ever sent from here.
// Table: associate_communications (deploy/migrations/2026-10-12-associate-
// communications.sql). Until that file is run, reads return an empty list
// with a clear note and writes are refused — never a 500.

export const COMM_CHANNELS = ['Call', 'WhatsApp', 'Email', 'Note'] as const;
export const COMM_DIRECTIONS = ['Outgoing', 'Incoming'] as const;
export type CommChannel = (typeof COMM_CHANNELS)[number];
export type CommDirection = (typeof COMM_DIRECTIONS)[number];

export const COMM_SUBJECT_MAX = 255;
export const COMM_MESSAGE_MAX = 5000;
/** The list returns at most this many entries, newest first. */
export const COMM_LIST_LIMIT = 2000;

export const COMM_TABLE_MISSING_MESSAGE =
  'The communications log is not set up yet (the associate_communications table has not been created). Nothing has been logged.';

export interface CommunicationInput {
  associateId: number;
  channel: CommChannel;
  direction: CommDirection;
  subject: string;
  message: string;
}

export interface CommunicationRow {
  id: number;
  associateId: number;
  associateName: string;
  channel: string;
  direction: string;
  subject: string;
  message: string;
  createdBy: number | null;
  createdByName: string;
  /** ISO instant the entry was logged. */
  createdAt: string;
}

export interface CommunicationList {
  rows: CommunicationRow[];
  /** True when the table does not exist yet (migration not run). */
  tableMissing: boolean;
  /** True when there were more than COMM_LIST_LIMIT entries. */
  truncated: boolean;
}

export type ValidationResult = { ok: true; value: CommunicationInput } | { ok: false; errors: Record<string, string> };

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Validates a Log Communication payload (snake_case body as the client posts it). */
export function validateCommunicationInput(payload: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string> = {};
  const associateId = toPositiveInt(payload.associate_id);
  const channel = str(payload.channel);
  const direction = str(payload.direction);
  const subject = str(payload.subject);
  const message = str(payload.message);
  if (!associateId) errors.associate_id = 'Select an associate.';
  if (!(COMM_CHANNELS as readonly string[]).includes(channel)) errors.channel = `Channel must be one of ${COMM_CHANNELS.join(', ')}.`;
  if (!(COMM_DIRECTIONS as readonly string[]).includes(direction)) errors.direction = 'Direction must be Outgoing or Incoming.';
  if (!subject) errors.subject = 'Subject is required.';
  else if (subject.length > COMM_SUBJECT_MAX) errors.subject = `Subject must be at most ${COMM_SUBJECT_MAX} characters.`;
  if (!message) errors.message = 'Summary / notes are required.';
  else if (message.length > COMM_MESSAGE_MAX) errors.message = `Summary must be at most ${COMM_MESSAGE_MAX} characters.`;
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { associateId, channel: channel as CommChannel, direction: direction as CommDirection, subject, message },
  };
}

/** Prisma P2021 = "the table does not exist in the current database". */
export function isTableMissingError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';
}

export class CommunicationValidationError extends Error {
  constructor(message: string, readonly errors: Record<string, string>) { super(message); }
}

export class CommunicationTableMissingError extends Error {
  constructor() { super(COMM_TABLE_MISSING_MESSAGE); }
}

export class AssociateCommunicationsService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async list(): Promise<CommunicationList> {
    let entries;
    try {
      entries = await this.prisma.associate_communications.findMany({
        where: { deleted_at: null },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take: COMM_LIST_LIMIT + 1,
      });
    } catch (error: unknown) {
      if (isTableMissingError(error)) return { rows: [], tableMissing: true, truncated: false };
      throw error;
    }
    const truncated = entries.length > COMM_LIST_LIMIT;
    const kept = entries.slice(0, COMM_LIST_LIMIT);
    const userIds = [...new Set(kept.flatMap((e) => [e.associate_id, e.created_by ?? 0]).filter((id) => id > 0))];
    const users = userIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const nameOf = new Map(users.map((u) => [u.id, (u.name ?? '').trim()]));
    return {
      rows: kept.map((e) => ({
        id: e.id,
        associateId: e.associate_id,
        associateName: nameOf.get(e.associate_id) || `Associate #${e.associate_id}`,
        channel: e.channel,
        direction: e.direction,
        subject: e.subject,
        message: e.message,
        createdBy: e.created_by,
        createdByName: e.created_by ? nameOf.get(e.created_by) || `User #${e.created_by}` : '',
        createdAt: isoOrEmpty(e.created_at),
      })),
      tableMissing: false,
      truncated,
    };
  }

  /** Records one entry. Sends nothing. */
  async log(actorUserId: number, payload: Record<string, unknown>): Promise<{ id: number }> {
    const check = validateCommunicationInput(payload);
    if (!check.ok) {
      throw new CommunicationValidationError(Object.values(check.errors)[0] ?? 'Invalid input.', check.errors);
    }
    const input = check.value;
    const associate = await this.prisma.users.findFirst({
      where: { id: input.associateId, role_id: ASSOCIATE_ROLE_ID, deleted_at: null },
      select: { id: true },
    });
    if (!associate) {
      throw new CommunicationValidationError('Associate not found.', { associate_id: 'Associate not found.' });
    }
    try {
      const created = await this.prisma.associate_communications.create({
        data: {
          associate_id: input.associateId,
          channel: input.channel,
          direction: input.direction,
          subject: input.subject,
          message: input.message,
          created_by: actorUserId > 0 ? actorUserId : null,
          created_at: new Date(),
        },
        select: { id: true },
      });
      return { id: created.id };
    } catch (error: unknown) {
      if (isTableMissingError(error)) throw new CommunicationTableMissingError();
      throw error;
    }
  }
}
