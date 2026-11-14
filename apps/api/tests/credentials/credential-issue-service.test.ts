/* eslint-disable @typescript-eslint/require-await -- in-memory fakes mirror async Prisma */
import Fastify from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { describe, expect, test } from 'vitest';

import { CredentialIssueService } from '../../src/operations/credential-issue-service.js';
import { CredentialPublicService } from '../../src/operations/credential-public-service.js';
import type { CredentialSnapshot } from '../../src/operations/credential-issue-model.js';
import { NOT_SET_UP_MESSAGE } from '../../src/operations/credential-types.js';
import { PUBLIC_LOOKUP_LIMIT, registerCredentialIssueRoutes } from '../../src/routes/credential-issue-routes.js';

type Row = Record<string, unknown>;

// ── Atomic numbering ────────────────────────────────────────────────────────
function seriesFake(initial: Row | null) {
  let row: Row | null = initial ? { ...initial } : null;
  const yield_ = () => new Promise<void>((r) => setTimeout(r, 0));
  const tx = {
    credential_number_series: {
      findUnique: async () => { await yield_(); return row ? { ...row } : null; },
      create: async ({ data }: { data: Row }) => { row = { id: 1, ...data }; return { ...row }; },
      updateMany: async ({ where, data }: { where: { id: number; year: { not: number } }; data: Row }) => {
        if (row && row.id === where.id && row.year !== where.year.not) { row = { ...row, ...data }; return { count: 1 }; }
        return { count: 0 };
      },
      // The increment is a single atomic step, like the row-locked UPDATE in MariaDB.
      update: async ({ data }: { data: { next_number: { increment: number } } }) => {
        row = { ...row, next_number: (row?.next_number as number) + data.next_number.increment };
        const after = { ...row }; // the row lock makes the read-back see exactly this transaction's write
        await yield_();
        return after;
      },
    },
  };
  return tx;
}
const allocate = (svc: CredentialIssueService, tx: unknown, type: string, today: string): Promise<string> =>
  (svc as unknown as { allocateNumber: (t: unknown, d: string, today: string) => Promise<string> }).allocateNumber(tx, type, today);

describe('number allocation', () => {
  const svc = new CredentialIssueService({} as PrismaClient);
  test('concurrent issues get unique, gap-free numbers', async () => {
    const tx = seriesFake({ id: 1, doc_type: 'certificate', prefix: 'TTII/CERT', year: 2026, padding: 6, next_number: 1, reset_yearly: true });
    const numbers = await Promise.all(Array.from({ length: 25 }, () => allocate(svc, tx, 'certificate', '2026-11-14')));
    expect(new Set(numbers).size).toBe(25);
    expect([...numbers].sort()[0]).toBe('TTII/CERT/2026/000001');
    expect([...numbers].sort()[24]).toBe('TTII/CERT/2026/000025');
  });
  test('the yearly reset restarts at 1 in a new IST year; without reset the year stays', async () => {
    const reset = seriesFake({ id: 1, doc_type: 'certificate', prefix: 'TTII/CERT', year: 2025, padding: 6, next_number: 90, reset_yearly: true });
    expect(await allocate(svc, reset, 'certificate', '2026-01-02')).toBe('TTII/CERT/2026/000001');
    const keep = seriesFake({ id: 1, doc_type: 'certificate', prefix: 'TTII/CERT', year: 2025, padding: 4, next_number: 90, reset_yearly: false });
    expect(await allocate(svc, keep, 'certificate', '2026-01-02')).toBe('TTII/CERT/2025/0090');
  });
  test('a missing series is created with the default prefix', async () => {
    const tx = seriesFake(null);
    expect(await allocate(svc, tx, 'marksheet', '2026-11-14')).toBe('TTII/MARK/2026/000001');
  });
});

// ── Public lookup ───────────────────────────────────────────────────────────
const snapshot: CredentialSnapshot = {
  learner: 'Anjali Menon', printedName: 'Anjali K Menon', enrolmentNo: 'TIDMTT26111101', programme: 'Montessori Diploma', batch: 'B', centre: 'C', level: '', durationText: '', creditsTotal: null,
  cgpa: '8.50', grade: 'A', result: 'Pass', examSession: '2026-11', completionDate: '2026-11-01', subjects: [], gradingName: 'g', ruleVersion: 1,
  template: { id: null, name: 'TTII layout', version: null, docType: 'certificate' }, signatoryIds: [], issueDate: '2026-11-14', generatedAt: '2026-11-14T00:00:00Z',
};
function publicFake(docs: Row[], inScope = true) {
  const scans: Row[] = [];
  const alerts: Row[] = [];
  const notices: Row[] = [];
  const prisma = {
    credential_documents: {
      findUnique: async ({ where }: { where: Row }) => docs.find((d) => (where.verification_id ? d.verification_id === where.verification_id : d.id === where.id)) ?? null,
      findFirst: async () => null,
      update: async ({ where, data }: { where: { id: number }; data: { scan_count: { increment: number }; last_scanned_at: Date } }) => {
        const d = docs.find((x) => x.id === where.id) as Row;
        d.scan_count = (d.scan_count as number) + data.scan_count.increment;
        d.last_scanned_at = data.last_scanned_at;
      },
    },
    credential_offering_settings: { findUnique: async () => ({ issued_by_ttii: inScope }) },
    credential_scans: {
      create: async ({ data }: { data: Row }) => { const r = { id: scans.length + 1, ...data }; scans.push(r); return r; },
      findMany: async ({ where }: { where: { ip: string } }) => scans.filter((s) => s.ip === where.ip && s.status === 'not_found').map((s) => ({ ...s, created_at: s.created_at })),
    },
    credential_scan_alerts: {
      create: async ({ data }: { data: Row }) => {
        if (alerts.some((a) => a.alert_key === data.alert_key)) throw Object.assign(new Error('dup'), { code: 'P2002' });
        alerts.push(data);
      },
    },
    credential_notifications: {
      findUnique: async ({ where }: { where: { dedupe_key: string } }) => notices.find((n) => n.dedupe_key === where.dedupe_key) ?? null,
      create: async ({ data }: { data: Row }) => { notices.push(data); },
    },
  };
  return { prisma: prisma as unknown as PrismaClient, scans, alerts, notices };
}
const doc = (over: Row = {}): Row => ({
  id: 1, enrol_id: 9, offering_id: 3, doc_type: 'certificate', status: 'valid', verification_id: 'TTII-AAAA-BBBB-CCCC', document_no: 'TTII/CERT/2026/000001', issue_date: new Date(Date.UTC(2026, 10, 14)),
  snapshot: JSON.stringify(snapshot), scan_count: 0, last_scanned_at: null, replaced_by_id: null, revoked_at: null, ...over,
});
const ctx = { method: 'qr' as const, ip: '9.9.9.9', userAgent: 'Mozilla/5.0 (Linux; Android 14)' };

describe('public lookup', () => {
  test('a valid lookup records a scan, bumps the counters and exposes no private data', async () => {
    const f = publicFake([doc()]);
    const out = await new CredentialPublicService(f.prisma).lookup('ttii-aaaa-bbbb-cccc', ctx);
    expect(out.status).toBe(1);
    expect(out.data?.status).toBe('valid');
    expect(out.data?.enrolment).toBe('••••1101');
    expect(JSON.stringify(out.data)).not.toContain('TIDMTT26111101');
    expect(f.scans).toHaveLength(1);
    expect(f.scans[0]).toMatchObject({ status: 'valid', method: 'qr', ip: '9.9.9.9', device: 'Android', document_id: 1 });
    expect((f.prisma as unknown as { credential_documents: unknown }).credential_documents).toBeTruthy();
    expect(f.alerts).toHaveLength(0);
  });
  test('an unknown ID is still recorded as a not-found scan', async () => {
    const f = publicFake([]);
    const out = await new CredentialPublicService(f.prisma).lookup('TTII-NOPE', { ...ctx, method: 'manual' });
    expect(out.data?.status).toBe('not_found');
    expect(f.scans[0]).toMatchObject({ status: 'not_found', method: 'manual', document_id: null });
  });
  test('an empty ID is refused without a scan', async () => {
    const f = publicFake([]);
    expect((await new CredentialPublicService(f.prisma).lookup('  ', ctx)).status).toBe(0);
    expect(f.scans).toHaveLength(0);
  });
  test('a revoked scan raises one alert and notifies admins and management once', async () => {
    const f = publicFake([doc({ status: 'revoked', revoked_at: new Date(Date.UTC(2026, 10, 20)) })]);
    const svc = new CredentialPublicService(f.prisma);
    const out = await svc.lookup('TTII-AAAA-BBBB-CCCC', ctx);
    expect(out.data).toMatchObject({ status: 'revoked', revokedAt: '2026-11-20' });
    expect(out.data?.cgpa).toBeUndefined();
    expect(f.alerts).toHaveLength(1);
    expect(f.notices.map((n) => n.audience).sort()).toEqual(['credential_admins', 'management']);
    await svc.lookup('TTII-AAAA-BBBB-CCCC', ctx);
    expect(f.scans).toHaveLength(2);
    expect(f.alerts).toHaveLength(2); // a new scan id is a new alert key
  });
  test('over 20 not-found lookups from one IP in a day raise the alert exactly once', async () => {
    const f = publicFake([]);
    const svc = new CredentialPublicService(f.prisma, () => new Date('2026-11-14T10:00:00Z'));
    for (let i = 0; i < 22; i += 1) await svc.lookup(`TTII-MISS-${i}`, ctx);
    expect(f.alerts.filter((a) => a.type === 'not_found_attempts')).toHaveLength(1);
  });
  test('a document of an offering that is not TTII-issued looks like not found', async () => {
    const f = publicFake([doc()], false);
    const out = await new CredentialPublicService(f.prisma).lookup('TTII-AAAA-BBBB-CCCC', ctx);
    expect(out.data?.status).toBe('not_found');
    expect(f.scans[0]?.document_id).toBeNull();
  });
  test('before the migration the lookup refuses with the not-set-up message, never throws', async () => {
    const prisma = { credential_documents: { findUnique: async () => { throw Object.assign(new Error('x'), { code: 'P2021' }); } } } as unknown as PrismaClient;
    const out = await new CredentialPublicService(prisma).lookup('TTII-A', ctx);
    expect(out).toMatchObject({ status: 0, message: NOT_SET_UP_MESSAGE });
  });
});

// ── Routes: rate limit and permission guards ────────────────────────────────
describe('routes', () => {
  const build = async (roleId: number) => {
    const app = Fastify();
    const requireAuth = (request: { authContext?: unknown }) => { request.authContext = { user: { id: 5, role_id: roleId } }; return Promise.resolve(); };
    const never = () => Promise.reject(new Error('must not be called'));
    registerCredentialIssueRoutes(app, {
      requireAuth: requireAuth as never,
      requireStudentRole: requireAuth as never,
      eligibility: { list: never, issue: never } as never,
      issue: { issue: never } as never,
      issued: { list: never } as never,
      publicService: { lookup: () => Promise.resolve({ status: 1, message: 'success', data: { verificationId: 'X', status: 'not_found' } }) } as never,
    });
    await app.ready();
    return app;
  };
  test('admin credential routes refuse a counsellor and an instructor (403)', async () => {
    for (const role of [9, 3, 2, 4]) {
      const app = await build(role);
      for (const [method, url] of [['GET', '/admin/credentials/ready/index'], ['POST', '/admin/credentials/ready/issue'], ['GET', '/admin/credentials/issued/index'], ['POST', '/admin/credentials/issued/revoke'], ['POST', '/admin/credentials/ready/override']] as const) {
        const res = await app.inject({ method, url, payload: {} });
        expect(res.statusCode, `${role} ${url}`).toBe(403);
      }
      await app.close();
    }
  });
  test('the public lookup is rate limited per client IP after 30 per minute and is no-store/noindex', async () => {
    const app = await build(1);
    let last = 0;
    for (let i = 0; i < PUBLIC_LOOKUP_LIMIT; i += 1) {
      const res = await app.inject({ method: 'GET', url: '/credentials/public/verify?id=X', remoteAddress: '8.8.8.8' });
      last = res.statusCode;
      expect(res.headers['x-robots-tag']).toContain('noindex');
    }
    expect(last).toBe(200);
    const blocked = await app.inject({ method: 'GET', url: '/credentials/public/verify?id=X', remoteAddress: '8.8.8.8' });
    expect(blocked.statusCode).toBe(429);
    const other = await app.inject({ method: 'GET', url: '/credentials/public/verify?id=X', remoteAddress: '7.7.7.7' });
    expect(other.statusCode).toBe(200);
    await app.close();
  });
});
