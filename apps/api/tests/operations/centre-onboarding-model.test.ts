import { createHash } from 'node:crypto';

import { describe, expect, test } from 'vitest';

import {
  findDuplicates, fileNameFromUrl, formToken, isLinkOpen, isOwnUpload, looksLikeToken, nextLinkSentAt, nextSequenceNo,
  parseLeadInput, parseVerification, allSectionsVerified, sniffFileType, splitMobile, tokenHash, tokenMatches,
  isSignedUpload, uploadSignature,
} from '../../src/operations/centre-onboarding-model.js';

// Centres v2 — Centre Onboarding pure rules (Naji 2026-10-22).

const SECRET = 'test-secret-key-0123456789';

describe('form link token', () => {
  const sentAt = new Date('2026-10-22T05:00:00.000Z');

  test('is a 256-bit base64url HMAC of the record id and the send instant; only its sha256 is stored', () => {
    const token = formToken(SECRET, 12, sentAt);
    expect(looksLikeToken(token)).toBe(true);
    expect(token).toBe(formToken(SECRET, 12, new Date(sentAt.getTime())));
    expect(tokenHash(token)).toBe(createHash('sha256').update(token).digest('hex'));
    expect(tokenHash(token)).toHaveLength(64);
  });

  test('depends on the record, the instant and the secret', () => {
    const token = formToken(SECRET, 12, sentAt);
    expect(formToken(SECRET, 13, sentAt)).not.toBe(token);
    expect(formToken(SECRET, 12, new Date(sentAt.getTime() + 1000))).not.toBe(token);
    expect(formToken('another-secret-0123456789', 12, sentAt)).not.toBe(token);
    expect(tokenMatches(SECRET, 12, sentAt, token)).toBe(true);
    expect(tokenMatches(SECRET, 13, sentAt, token)).toBe(false);
    expect(tokenMatches(SECRET, 12, sentAt, `${token}x`)).toBe(false);
  });

  test('the send instant is whole seconds (DATETIME(0)) and always moves forward on a resend', () => {
    const now = new Date('2026-10-22T05:00:00.750Z');
    expect(nextLinkSentAt(now, null).toISOString()).toBe('2026-10-22T05:00:00.000Z');
    // A resend inside the same second still gets a new instant, so the old link dies.
    expect(nextLinkSentAt(now, new Date('2026-10-22T05:00:00.000Z')).toISOString()).toBe('2026-10-22T05:00:01.000Z');
  });

  test('a link is open for a lead, not marked expired, until the end of the IST day 30 days on', () => {
    const row = { stage: 'lead', link_sent_at: sentAt, link_expired: false };
    // Sent 22 Oct 10:30 IST → open through 21 Nov 23:59:59 IST (= 18:29:59 UTC).
    expect(isLinkOpen(row, new Date('2026-11-21T18:29:59.998Z'))).toBe(true);
    expect(isLinkOpen(row, new Date('2026-11-21T18:30:00.000Z'))).toBe(false);
    expect(isLinkOpen({ ...row, link_expired: true }, sentAt)).toBe(false);
    expect(isLinkOpen({ ...row, stage: 'under_review' }, sentAt)).toBe(false);
    expect(isLinkOpen({ ...row, link_sent_at: null }, sentAt)).toBe(false);
  });
});

describe('numbering', () => {
  test('AGR / AFC take one past the highest number of THAT year, zero-padded', () => {
    expect(nextSequenceNo('AGR', 2026, [])).toBe('AGR-2026-001');
    expect(nextSequenceNo('AGR', 2026, ['AGR-2026-007', 'AGR-2026-003', 'AGR-2025-041', 'AFC-2026-099'])).toBe('AGR-2026-008');
    expect(nextSequenceNo('AFC', 2027, ['AFC-2026-120'])).toBe('AFC-2027-001');
    expect(nextSequenceNo('AFC', 2026, ['AFC-2026-999'])).toBe('AFC-2026-1000');
  });
});

describe('mobile split for centres.country_code + phone', () => {
  test.each([
    ['+91 98470 12345', 'India', '+91', '9847012345'],
    ['9847012345', 'India', '+91', '9847012345'],
    ['09847012345', 'India', '+91', '9847012345'],
    ['919847012345', 'India', '+91', '9847012345'],
    ['+971 50 123 4567', 'India', '+971', '501234567'],
    ['0501234567', 'United Arab Emirates', '+971', '0501234567'],
    ['00968 9123 4567', 'Oman', '+968', '91234567'],
  ])('%s (%s) → %s %s', (mobile, country, code, phone) => {
    expect(splitMobile(mobile, country)).toEqual({ countryCode: code, phone });
  });
});

describe('uploads', () => {
  test('only files our upload endpoint stored for THIS lead are accepted', () => {
    const own = 'https://ttii.sgp1.digitaloceanspaces.com/centre-onboarding/4/0123456789abcdef0123456789abcdef-pan.pdf';
    expect(isOwnUpload(own, 'centre-onboarding/4/')).toBe(true);
    expect(isOwnUpload(own, 'centre-onboarding/5/')).toBe(false);
    expect(isOwnUpload('https://evil.example/phish', 'centre-onboarding/4/')).toBe(false);
    expect(isOwnUpload('javascript:alert(1)//centre-onboarding/4/x.pdf', 'centre-onboarding/4/')).toBe(false);
    expect(isOwnUpload('https://cdn/centre-onboarding/4/../5/x.pdf', 'centre-onboarding/4/')).toBe(false);
    expect(isOwnUpload('https://cdn/centre-onboarding/4/pan.pdf', 'centre-onboarding/4/')).toBe(false);
    expect(fileNameFromUrl(own)).toBe('pan.pdf');
  });

  test('a document counts only with the signature the upload endpoint issued for that record and URL', () => {
    const own = 'https://cdn/centre-onboarding/4/0123456789abcdef0123456789abcdef-pan.pdf';
    const sig = uploadSignature(SECRET, 4, own);
    expect(isSignedUpload(SECRET, 4, 'centre-onboarding/4/', own, sig)).toBe(true);
    expect(isSignedUpload(SECRET, 4, 'centre-onboarding/4/', own, undefined)).toBe(false);
    expect(isSignedUpload(SECRET, 5, 'centre-onboarding/4/', own, sig)).toBe(false);
    // Same path on someone else's host: the shape matches, the signature does not.
    const evil = 'https://evil.example/centre-onboarding/4/0123456789abcdef0123456789abcdef-pan.pdf';
    expect(isSignedUpload(SECRET, 4, 'centre-onboarding/4/', evil, sig)).toBe(false);
  });

  test('file types are sniffed from content', () => {
    expect(sniffFileType(Buffer.from('%PDF-1.7'))).toBe('application/pdf');
    expect(sniffFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(sniffFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffFileType(Buffer.from('<html>'))).toBeNull();
  });
});

describe('lead input', () => {
  test('mobile and district are optional; email, country, state and source are required', () => {
    const ok = parseLeadInput({ centre_name: 'Kannur Kids', contact_name: 'Rasheed', email: 'R@KKA.in', state: 'Kerala', source: 'Website' });
    expect('lead' in ok ? ok.lead : null).toMatchObject({ email: 'r@kka.in', country: 'India', mobile: '', district: '' });
    const bad = parseLeadInput({ centre_name: '', email: 'nope', mobile: '12', state: '', source: 'Billboard' });
    expect(bad).toEqual({ errors: { centreName: 'Required', contactName: 'Required', state: 'Required', email: 'Invalid email', mobile: 'Enter a valid mobile number', source: 'Select a source' } });
  });
});

describe('verification + duplicates', () => {
  test('approval needs all five sections verified; junk in the JSON is ignored', () => {
    const v = parseVerification('{"entity":"verified","address":"verified","contact":"verified","legal":"verified","bank":"flagged","x":"verified"}');
    expect(v).toEqual({ entity: 'verified', address: 'verified', contact: 'verified', legal: 'verified', bank: 'flagged' });
    expect(allSectionsVerified(v)).toBe(false);
    expect(allSectionsVerified({ ...v, bank: 'verified' })).toBe(true);
    expect(parseVerification('not json')).toEqual({});
  });

  test('email / mobile / GSTIN matches against centres and other leads', () => {
    const hits = findDuplicates(
      { email: 'Arun@KEY.in', mobile: '+91 97460 11122', gstin: '32aabtk1234k1z5' },
      [
        { kind: 'centre', name: 'Kollam Centre', email: 'arun@key.in', mobile: '', gstin: '32AABTK1234K1Z5' },
        { kind: 'lead', name: 'Kollam Lead', email: '', mobile: '9746011122', gstin: '' },
        { kind: 'centre', name: 'Other', email: 'x@y.z', mobile: '9999999999', gstin: '' },
      ],
    );
    expect(hits).toEqual([
      { field: 'GSTIN', kind: 'centre', name: 'Kollam Centre' },
      { field: 'Email', kind: 'centre', name: 'Kollam Centre' },
      { field: 'Mobile', kind: 'lead', name: 'Kollam Lead' },
    ]);
  });
});
