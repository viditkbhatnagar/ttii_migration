import { describe, expect, test } from 'vitest';

import {
  VERIFICATION_ALPHABET, actionRefusal, alertCandidates, correctionDocumentNo, deviceClass, formatDocumentNo, maskEnrolment, newVerificationId,
  normaliseVerificationId, publicProjection, publicUrl, type CredentialSnapshot, type ScanLite,
} from '../../src/operations/credential-issue-model.js';

const snapshot: CredentialSnapshot = {
  learner: 'Anjali Menon', printedName: 'Anjali K Menon', enrolmentNo: 'TIDMTT26111101', programme: 'Montessori Diploma', batch: 'B1', centre: 'C1', level: 'Diploma',
  durationText: '12 months', creditsTotal: null, cgpa: '8.50', grade: 'A', result: 'Pass', examSession: '2026-11', completionDate: '2026-11-01',
  subjects: [{ code: 'E1', title: 'Foundations', credits: 10, internal: null, theory: 85, practical: null, total: 85, points: 9, grade: 'A+', result: 'Pass' }],
  gradingName: 'g', ruleVersion: 1, template: { id: null, name: 'TTII layout', version: null, docType: 'marksheet' }, signatoryIds: [], issueDate: '2026-11-14', generatedAt: '2026-11-14T00:00:00Z',
};
const input = (over: Partial<Parameters<typeof publicProjection>[0]> = {}) => ({
  verificationId: 'TTII-AAAA-BBBB-CCCC', status: 'valid', docType: 'marksheet', documentNo: 'TTII/MARK/2026/000001', issueDate: '2026-11-14', revokedAt: '', replacedByVerificationId: '', snapshot, ...over,
});

describe('numbers and identifiers', () => {
  test('document number format and padding', () => {
    expect(formatDocumentNo('TTII/CERT', 2026, 123, 6)).toBe('TTII/CERT/2026/000123');
    expect(formatDocumentNo('', 2026, 1, 3)).toBe('TTII/DOC/2026/001');
  });
  test('correction number replaces any previous -R suffix', () => {
    expect(correctionDocumentNo('TTII/CERT/2026/000001', 1)).toBe('TTII/CERT/2026/000001-R1');
    expect(correctionDocumentNo('TTII/CERT/2026/000001-R1', 2)).toBe('TTII/CERT/2026/000001-R2');
  });
  test('verification IDs use the unambiguous alphabet in TTII-XXXX-XXXX-XXXX groups and are unique', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newVerificationId()));
    expect(ids.size).toBe(500);
    for (const id of ids) {
      expect(id).toMatch(/^TTII-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(id.slice(5).replace(/-/g, '')).not.toMatch(/[01OIL]/);
    }
    expect(VERIFICATION_ALPHABET).not.toMatch(/[01OI]/);
  });
  test('lookup is case-insensitive, trimmed, capped and tolerates missing dashes', () => {
    expect(normaliseVerificationId('  ttii-aaaa-bbbb-cccc ')).toBe('TTII-AAAA-BBBB-CCCC');
    expect(normaliseVerificationId('ttiiaaaabbbbcccc')).toBe('TTII-AAAA-BBBB-CCCC');
    expect(normaliseVerificationId('x'.repeat(200))).toHaveLength(80);
    expect(normaliseVerificationId('   ')).toBe('');
  });
  test('QR payload url', () => expect(publicUrl('TTII-A B')).toBe('https://learn.teachersindia.in/v/TTII-A%20B'));
  test('enrolment masking', () => expect(maskEnrolment('TIDMTT26111101')).toBe('••••1101'));
  test('device classes', () => {
    expect(deviceClass('Mozilla/5.0 (Linux; Android 14)')).toBe('Android');
    expect(deviceClass('Mozilla/5.0 (iPhone; CPU iPhone OS 17)')).toBe('iPhone / iPad');
    expect(deviceClass('Mozilla/5.0 (Macintosh)')).toBe('Desktop');
    expect(deviceClass('')).toBe('Unknown');
  });
});

describe('public projection privacy', () => {
  test('a valid marksheet shows masked enrolment and marks, and nothing personal', () => {
    const p = publicProjection(input());
    expect(p.enrolment).toBe('••••1101');
    expect(p.learner).toBe('Anjali K Menon');
    expect(p.subjects).toHaveLength(1);
    const text = JSON.stringify(p);
    for (const secret of ['TIDMTT26111101', 'phone', 'email', 'dob', 'address', 'Montessori Diploma'.slice(0, 0) + 'issuedByUser']) expect(text).not.toContain(secret);
    expect(Object.keys(p)).not.toContain('snapshot');
  });
  test('a certificate carries no subject table', () => expect(publicProjection(input({ docType: 'certificate' })).subjects).toBeUndefined());
  test('a revoked document has no marks, no enrolment and no reason', () => {
    const p = publicProjection(input({ status: 'revoked', revokedAt: '2026-11-20' }));
    expect(p).toEqual({ verificationId: 'TTII-AAAA-BBBB-CCCC', status: 'revoked', learner: 'Anjali K Menon', programme: 'Montessori Diploma', revokedAt: '2026-11-20' });
  });
  test('a superseded document points to the newer version', () => {
    const p = publicProjection(input({ status: 'superseded', replacedByVerificationId: 'TTII-NEW' }));
    expect(p.replacedBy).toBe('TTII-NEW');
    expect(p.enrolment).toBeUndefined();
    expect(p.cgpa).toBeUndefined();
  });
});

describe('scan alerts', () => {
  const at = (iso: string) => new Date(iso);
  const nf = (id: number, iso: string, ip = '1.1.1.1'): ScanLite => ({ id, at: at(iso), documentId: null, status: 'not_found', country: null, ip });
  test('a valid scan raises nothing; revoked and superseded scans raise one per document per UTC day', () => {
    const valid: ScanLite = { id: 1, at: at('2026-11-14T10:00:00Z'), documentId: 5, status: 'valid', country: null, ip: 'x' };
    expect(alertCandidates(valid, [valid], 'V')).toEqual([]);
    const rev: ScanLite = { ...valid, id: 2, status: 'revoked' };
    expect(alertCandidates(rev, [rev], 'V')).toEqual([{ key: 'status:5:2026-11-14', type: 'revoked_scan', details: 'V showed Revoked.' }]);
    // A second scan of the same revoked document the same day maps to the same key (deduped by the unique alert_key).
    expect(alertCandidates({ ...rev, id: 9, at: at('2026-11-14T18:00:00Z') }, [rev], 'V')[0]?.key).toBe('status:5:2026-11-14');
    const sup: ScanLite = { ...valid, id: 3, status: 'superseded' };
    expect(alertCandidates(sup, [sup], 'V')[0]?.type).toBe('superseded_scan');
  });
  test('the 21st not-found scan from one IP in a UTC day triggers; the 20th does not', () => {
    const all = Array.from({ length: 21 }, (_, i) => nf(i + 1, `2026-11-14T10:${String(i).padStart(2, '0')}:00Z`));
    expect(alertCandidates(all[19] as ScanLite, all.slice(0, 20), 'V')).toEqual([]);
    const out = alertCandidates(all[20] as ScanLite, all, 'V');
    expect(out).toEqual([{ key: 'notfound:1.1.1.1:2026-11-14', type: 'not_found_attempts', details: '21 not-found attempts from the same IP in one UTC day.' }]);
  });
  test('scans from the previous day or another IP do not count', () => {
    const history = [...Array.from({ length: 20 }, (_, i) => nf(i + 1, '2026-11-13T10:00:00Z')), nf(30, '2026-11-14T10:00:00Z', '2.2.2.2')];
    const now = nf(31, '2026-11-14T11:00:00Z');
    expect(alertCandidates(now, [...history, now], 'V')).toEqual([]);
  });
  test('three countries within 7 days raise a per-document daily alert; two, or an old scan, do not', () => {
    const s = (id: number, iso: string, country: string): ScanLite => ({ id, at: at(iso), documentId: 7, status: 'valid', country, ip: null });
    const three = [s(1, '2026-11-10T00:00:00Z', 'IN'), s(2, '2026-11-12T00:00:00Z', 'AE'), s(3, '2026-11-14T00:00:00Z', 'US')];
    expect(alertCandidates(three[2] as ScanLite, three, 'V')[0]?.key).toBe('countries:7:2026-11-14');
    expect(alertCandidates(three[1] as ScanLite, three.slice(0, 2), 'V')).toEqual([]);
    const old = [s(1, '2026-11-01T00:00:00Z', 'IN'), ...three.slice(1)];
    expect(alertCandidates(old[2] as ScanLite, old, 'V')).toEqual([]);
  });
});

describe('action semantics', () => {
  test('reasons are required except print and resend', () => {
    expect(actionRefusal('duplicate', 'valid', '')).toBe('A reason is required.');
    expect(actionRefusal('revoke', 'valid', ' ')).toBe('A reason is required.');
    expect(actionRefusal('print', 'valid', '')).toBeNull();
    expect(actionRefusal('resend', 'valid', '')).toBeNull();
  });
  test('correction needs the corrected name', () => {
    expect(actionRefusal('correction', 'valid', 'typo', { correctedName: '' })).toBe('Enter the corrected learner name.');
    expect(actionRefusal('correction', 'valid', 'typo', { correctedName: 'A' })).toBeNull();
  });
  test('only valid documents are duplicated, corrected, printed or revoked; superseded is terminal', () => {
    for (const a of ['duplicate', 'correction', 'print', 'revoke', 'resend'] as const) {
      expect(actionRefusal(a, 'revoked', 'r', { correctedName: 'A' })).not.toBeNull();
      expect(actionRefusal(a, 'superseded', 'r', { correctedName: 'A' })).not.toBeNull();
    }
  });
  test('restore only applies to a revoked document', () => {
    expect(actionRefusal('restore', 'revoked', 'ok')).toBeNull();
    expect(actionRefusal('restore', 'valid', 'ok')).not.toBeNull();
    expect(actionRefusal('restore', 'superseded', 'ok')).not.toBeNull();
  });
});
