import { describe, expect, it } from 'vitest';

import {
  AUDIT_CSV_HEADER,
  actorLabel,
  auditCsvRows,
  auditExportQuery,
  auditQuery,
  auditSummaryCsv,
  defaultAuditFilters,
  eventOptionsFor,
  parseUserAgent,
  recordLabel,
  toAuditPage,
  type AuditEventOption,
  type AuditRow,
} from '../src/admin/pages/audit_logs/audit-logs-model';

// Administration → Audit Logs (Naji's AuditLogsModule) on real data.

const NOW = new Date('2026-10-12T04:30:00Z');

function row(patch: Partial<AuditRow> = {}): AuditRow {
  return {
    key: 'auth-1', source: 'auth', at: '2026-10-12T04:00:00.000Z', event: 'LOGIN_FAILED', action: 'Failed sign-in', category: 'Sign-in',
    success: false, userId: '5', userName: 'Ravi', userRole: 'Student', userEmail: 'ravi@x.in', identifier: 'ravi@x.in',
    ipAddress: '10.0.0.1', userAgent: '', description: '', details: [], applicationId: '', applicationCode: '', applicantName: '',
    ...patch,
  };
}

describe('filters → query', () => {
  it('defaults to the last 30 IST days', () => {
    expect(defaultAuditFilters(NOW)).toMatchObject({ from: '2026-09-13', to: '2026-10-12', source: 'all', outcome: 'all' });
  });

  it('sends only the filters in use, paged by take/skip', () => {
    const f = { ...defaultAuditFilters(NOW), source: 'auth' as const, outcome: 'failure' as const, search: '  ravi ', userId: '5', event: 'LOGIN_FAILED' };
    expect(auditQuery(f, 3)).toEqual({
      take: '25', skip: '50', from: '2026-09-13', to: '2026-10-12', source: 'auth', outcome: 'failure', q: 'ravi', user: '5', event: 'LOGIN_FAILED',
    });
  });

  it('Export pages rows-only by keyset cursor', () => {
    expect(auditExportQuery(defaultAuditFilters(NOW), null)).toEqual({ take: '100', meta: '0', from: '2026-09-13', to: '2026-10-12' });
    expect(auditExportQuery(defaultAuditFilters(NOW), '2026-10-12T03:00:00.000Z|application|21'))
      .toMatchObject({ after: '2026-10-12T03:00:00.000Z|application|21', meta: '0' });
  });
});

describe('toAuditPage', () => {
  it('normalises the payload and never leaves undefined fields', () => {
    const page = toAuditPage({
      rows: [{ key: 'app-2', source: 'application', at: '2026-10-12T03:00:00Z', event: 'payment_approved', action: 'Payment approved', success: true, details: [{ label: 'Role', value: 'Admin' }, { label: '', value: 'x' }] }, { nokey: true }],
      total: '7',
      kpis: { signInsToday: 3, failedSignIns24h: 1, applicationActions7d: 9, paymentActions7d: 4 },
      eventTypes: [{ value: 'LOGIN_FAILED', label: 'Failed sign-in', source: 'auth', count: 2 }, { label: 'no value' }],
      user: { id: 5, name: 'Ravi' },
    });
    expect(page.total).toBe(7);
    expect(page.rows).toHaveLength(1);
    expect(page.rows[0]).toMatchObject({ source: 'application', userName: '', ipAddress: '', details: [{ label: 'Role', value: 'Admin' }] });
    expect(page.kpis).toEqual({ signInsToday: 3, failedSignIns24h: 1, applicationActions7d: 9, paymentActions7d: 4 });
    expect(page.eventTypes).toHaveLength(1);
    expect(page.user).toEqual({ id: '5', name: 'Ravi' });
  });

  it('rows-only pages carry no KPIs', () => {
    expect(toAuditPage({ rows: [], total: 0, kpis: null, nextCursor: 'x|auth|1' })).toMatchObject({ kpis: null, nextCursor: 'x|auth|1' });
    expect(toAuditPage(null)).toMatchObject({ rows: [], total: 0, kpis: null, eventTypes: [], user: null, nextCursor: null });
  });
});

describe('eventOptionsFor', () => {
  const options: AuditEventOption[] = [
    { value: 'LOGIN_FAILED', label: 'Failed sign-in', source: 'auth', count: 1 },
    { value: 'payment_approved', label: 'Payment approved', source: 'application', count: 1 },
    { value: 'instalment_link_sent', label: 'Instalment link sent', source: 'application', count: 1 },
    { value: 'lead_created', label: 'Lead created', source: 'application', count: 1 },
  ];
  it('lists only the events a tab can show', () => {
    expect(eventOptionsFor('all', options)).toHaveLength(4);
    expect(eventOptionsFor('auth', options).map((o) => o.value)).toEqual(['LOGIN_FAILED']);
    expect(eventOptionsFor('application', options)).toHaveLength(3);
    expect(eventOptionsFor('payment', options).map((o) => o.value)).toEqual(['payment_approved', 'instalment_link_sent']);
  });
});

describe('parseUserAgent', () => {
  it('names the browser and device', () => {
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'))
      .toEqual({ browser: 'Chrome 124', device: 'Windows' });
    expect(parseUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'))
      .toEqual({ browser: 'Safari 17', device: 'macOS' });
    expect(parseUserAgent('Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/124.0 Safari/537.36 Edg/124.0.2478.80'))
      .toEqual({ browser: 'Edge 124', device: 'Windows' });
    expect(parseUserAgent('Dart/3.3 (dart:io)')).toEqual({ browser: 'Mobile app', device: '' });
    expect(parseUserAgent('')).toEqual({ browser: '', device: '' });
  });
});

describe('labels', () => {
  it('names the actor when there is no signed-in user', () => {
    expect(actorLabel(row())).toBe('Ravi');
    expect(actorLabel(row({ userName: '', identifier: 'x•••y' }))).toBe('Unknown account');
    expect(actorLabel(row({ userName: '', identifier: '' }))).toBe('Anonymous');
    expect(actorLabel(row({ userName: '', source: 'application' }))).toBe('Applicant / system');
  });

  it('names the application record', () => {
    expect(recordLabel(row())).toBe('');
    expect(recordLabel(row({ applicationId: '31', applicationCode: 'TTII260031', applicantName: 'Anu' }))).toBe('TTII260031 · Anu');
    expect(recordLabel(row({ applicationId: '31' }))).toBe('Application #31');
  });
});

describe('CSV', () => {
  it('exports one line per activity with the formatted time', () => {
    const csv = auditCsvRows([row({ details: [{ label: 'Reason', value: 'bad' }] })], () => '12/10/2026, 9:30 AM');
    expect(csv[0]).toEqual(AUDIT_CSV_HEADER);
    expect(csv[1]?.slice(0, 7)).toEqual(['12/10/2026, 9:30 AM', 'Sign-in', 'Sign-in', 'Failed sign-in', 'LOGIN_FAILED', 'Failed', 'Ravi']);
    expect(csv[1]).toContain('Reason: bad');
  });

  it('summarises by category, status and action, biggest first', () => {
    const csv = auditSummaryCsv([
      row(),
      row({ key: 'auth-2' }),
      row({ key: 'app-3', source: 'application', category: 'Payment', success: true, action: 'Payment approved' }),
    ]);
    expect(csv).toEqual([
      ['Section', 'Item', 'Count'],
      ['Category', 'Sign-in', 2],
      ['Category', 'Payment', 1],
      ['Status', 'Failed', 2],
      ['Status', 'Success', 1],
      ['Action', 'Failed sign-in', 2],
      ['Action', 'Payment approved', 1],
    ]);
  });
});
