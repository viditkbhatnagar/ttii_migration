/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/restrict-template-expressions -- in-memory fakes mirror async Prisma */
import type { PrismaClient } from '@prisma/client';
import { describe, expect, test } from 'vitest';

import { CredentialIssueService } from '../../src/operations/credential-issue-service.js';
import type { CredentialSnapshot } from '../../src/operations/credential-issue-model.js';

type Row = Record<string, unknown>;

const snap: CredentialSnapshot = {
  learner: 'Anjali Menon', printedName: 'Anjali Menon', enrolmentNo: 'E1', programme: 'P', batch: 'B', centre: 'C', level: '', durationText: '', creditsTotal: null, cgpa: '8.50', grade: 'A',
  result: 'Pass', examSession: '2026-11', completionDate: '2026-11-01', subjects: [], gradingName: 'g', ruleVersion: 1, template: { id: null, name: 'TTII layout', version: null, docType: 'certificate' },
  signatoryIds: [], issueDate: '2026-11-14', generatedAt: '2026-11-14T00:00:00Z',
};

function fake() {
  const docs: Row[] = [{
    id: 1, enrol_id: 9, user_id: 5, offering_id: 3, course_id: 2, centre_id: null, doc_type: 'certificate', version: 1, document_no: 'TTII/CERT/2026/000001', verification_id: 'TTII-AAAA-BBBB-CCCC',
    status: 'valid', issue_date: new Date(Date.UTC(2026, 10, 14)), printed_name: 'Anjali Menon', snapshot: JSON.stringify(snap), storage_key: null, replaced_by_id: null, replaces_id: null,
  }];
  const events: Row[] = [];
  const items: Row[] = [];
  const notices: Row[] = [];
  const match = (d: Row, w: Row): boolean => Object.entries(w).every(([k, v]) => d[k] === v);
  const prisma: Record<string, unknown> = {
    credential_documents: {
      findUnique: async ({ where }: { where: Row }) => docs.find((d) => match(d, where)) ?? null,
      findFirst: async ({ where }: { where: Row }) => docs.find((d) => match(d, where)) ?? null,
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const hit = docs.filter((d) => match(d, where));
        hit.forEach((d) => Object.assign(d, data));
        return { count: hit.length };
      },
      update: async ({ where, data }: { where: Row; data: Row }) => Object.assign(docs.find((d) => match(d, where)) as Row, data),
      create: async ({ data }: { data: Row }) => { const r = { id: docs.length + 1, replaced_by_id: null, storage_key: null, ...data }; docs.push(r); return r; },
    },
    credential_offering_settings: { findUnique: async () => ({ issued_by_ttii: true, default_delivery_mode: 'via_centre' }) },
    credential_config: { findFirst: async () => null },
    credential_document_events: { create: async ({ data }: { data: Row }) => { const r = { id: events.length + 1, ...data }; events.push(r); return r; } },
    credential_notifications: { findUnique: async () => null, create: async ({ data }: { data: Row }) => { notices.push(data); } },
    credential_digital_deliveries: { create: async () => ({}), updateMany: async () => ({ count: 0 }) },
    credential_delivery_items: { create: async ({ data }: { data: Row }) => { const r = { id: items.length + 1, ...data }; items.push(r); return r; } },
    credential_delivery_events: { create: async () => ({}) },
    credential_number_series: {},
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  };
  return { prisma: prisma as unknown as PrismaClient, docs, events, items, notices };
}
const svc = (f: ReturnType<typeof fake>) => new CredentialIssueService(f.prisma, { now: () => new Date('2026-11-20T06:00:00Z') });

describe('revoke and restore', () => {
  test('a reason is required and the document changes only when allowed', async () => {
    const f = fake();
    expect((await svc(f).revoke(1, 1, ' ')).status).toBe(0);
    expect(f.docs[0]?.status).toBe('valid');
    const out = await svc(f).revoke(1, 1, 'issued in error');
    expect(out.status).toBe(1);
    expect(f.docs[0]).toMatchObject({ status: 'revoked', revoke_reason: 'issued in error' });
    expect(f.events.at(-1)).toMatchObject({ action: 'Revoke', before_status: 'valid', after_status: 'revoked', actor_user_id: 1 });
    expect((await svc(f).revoke(1, 1, 'again')).status).toBe(0);
    expect((await svc(f).restore(1, 1, 'verified fine')).status).toBe(1);
    expect(f.docs[0]).toMatchObject({ status: 'valid', revoked_at: null });
    expect((await svc(f).restore(1, 1, 'x')).status).toBe(0);
  });
  test('a superseded version cannot be revoked', async () => {
    const f = fake();
    (f.docs[0] as Row).status = 'superseded';
    expect((await svc(f).revoke(1, 1, 'r')).status).toBe(0);
  });
});

describe('duplicate, print and resend', () => {
  test('a duplicate keeps numbers and logs a duplicate-copy event; it needs a reason and a valid document', async () => {
    const f = fake();
    expect((await svc(f).recordCopy(1, 1, 'duplicate', '')).status).toBe(0);
    const out = await svc(f).recordCopy(1, 1, 'duplicate', 'lost original');
    expect(out.status).toBe(1);
    expect(f.docs).toHaveLength(1);
    expect(f.events.at(-1)).toMatchObject({ action: 'Duplicate', copy_type: 'duplicate' });
    expect(f.docs[0]).toMatchObject({ document_no: 'TTII/CERT/2026/000001', verification_id: 'TTII-AAAA-BBBB-CCCC' });
    (f.docs[0] as Row).status = 'revoked';
    expect((await svc(f).recordCopy(1, 1, 'print', '')).status).toBe(0);
  });
  test('print logs an Original copy event without a reason', async () => {
    const f = fake();
    expect((await svc(f).recordCopy(1, 1, 'print', '')).status).toBe(1);
    expect(f.events.at(-1)).toMatchObject({ action: 'Print', copy_type: 'original' });
  });
  test('resend logs an event and a notice, and reports honestly when no email could be sent', async () => {
    const f = fake();
    const out = await svc(f).resend(1, 1);
    expect(out.status).toBe(1);
    expect(out.message).toContain('could not be sent');
    expect(f.events.at(-1)).toMatchObject({ action: 'Resend' });
    expect(f.notices.length).toBeGreaterThan(0);
  });
});

describe('correction', () => {
  test('creates version 2 with a new verification ID and an -R1 number, supersedes the old one and keeps its snapshot', async () => {
    const f = fake();
    const before = f.docs[0]?.snapshot;
    const out = await svc(f).correction(1, 1, 'misspelt name', 'Anjali K Menon');
    expect(out.status).toBe(1);
    const [oldDoc, newDoc] = f.docs as [Row, Row];
    expect(oldDoc).toMatchObject({ status: 'superseded', replaced_by_id: newDoc.id });
    expect(oldDoc.snapshot).toBe(before);
    expect(newDoc).toMatchObject({ version: 2, status: 'valid', document_no: 'TTII/CERT/2026/000001-R1', printed_name: 'Anjali K Menon', replaces_id: 1 });
    expect(newDoc.verification_id).not.toBe(oldDoc.verification_id);
    expect(JSON.parse(newDoc.snapshot as string)).toMatchObject({ printedName: 'Anjali K Menon', programme: 'P', issueDate: '2026-11-20' });
    expect(f.events.map((e) => `${e.document_id}:${e.action}`)).toEqual(['1:Correction', '2:Issue']);
    expect(f.items).toHaveLength(1); // via_centre default mode queues a print item for the new version
  });
  test('requires a reason and a corrected name, and a valid source', async () => {
    const f = fake();
    expect((await svc(f).correction(1, 1, '', 'A')).status).toBe(0);
    expect((await svc(f).correction(1, 1, 'r', ' ')).status).toBe(0);
    expect(f.docs).toHaveLength(1);
    (f.docs[0] as Row).status = 'revoked';
    expect((await svc(f).correction(1, 1, 'r', 'A')).status).toBe(0);
  });
  test('a second correction of the already superseded version is refused', async () => {
    const f = fake();
    await svc(f).correction(1, 1, 'r', 'A B');
    expect((await svc(f).correction(1, 1, 'r', 'A C')).status).toBe(0);
    expect(f.docs).toHaveLength(2);
  });
});
