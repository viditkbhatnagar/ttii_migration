import { describe, expect, it } from 'vitest';
import {
  countdown, fileProblem, maskNumber, onFileCount, passwordProblem, periodUsedPct, toProfileData,
} from '../src/centre/pages/profile/centre-profile-model.js';

describe('centre profile model', () => {
  it('masks all but the last four characters', () => {
    expect(maskNumber('123456789012')).toBe('•••• •••• 9012');
    expect(maskNumber('1234')).toBe('••••');
    expect(maskNumber('')).toBe('');
    expect(maskNumber('1234 5678 9012')).not.toContain('5678');
  });

  it('counts down in calendar days', () => {
    expect(countdown(160)).toEqual({ text: '160 days left', tone: 'success' });
    expect(countdown(60).tone).toBe('warning');
    expect(countdown(1).text).toBe('1 day left');
    expect(countdown(0).text).toBe('Expires today');
    expect(countdown(-3)).toEqual({ text: 'Expired 3 days ago', tone: 'danger' });
    expect(countdown(null).tone).toBe('neutral');
  });

  it('computes the share of the agreement period used', () => {
    expect(periodUsedPct('2026-01-01', '2027-01-01', '2026-07-02')).toBe(50);
    expect(periodUsedPct('2026-01-01', '2027-01-01', '2028-01-01')).toBe(100);
    expect(periodUsedPct('', '2027-01-01', '2026-07-02')).toBeNull();
  });

  it('validates the new password', () => {
    expect(passwordProblem('', '')).not.toBe('');
    expect(passwordProblem('short', 'short')).toMatch(/at least 8/);
    expect(passwordProblem('longenough1', 'different1')).toMatch(/do not match/);
    expect(passwordProblem('longenough1', 'longenough1')).toBe('');
  });

  it('checks upload files', () => {
    expect(fileProblem({ name: 'a.exe', size: 10 })).not.toBe('');
    expect(fileProblem({ name: 'a.pdf', size: 11 * 1024 * 1024 })).toMatch(/10 MB/);
    expect(fileProblem({ name: 'A.PDF', size: 1000 })).toBe('');
  });

  it('parses a payload and counts the checklist', () => {
    const p = toProfileData({
      kycReady: true, today: '2026-10-22',
      centre: { name: 'K', code: 'TTC1', status: 'active', countryCode: '+91', phone: '98' },
      kyc: { idNumber: '123456789012' },
      affiliation: { expiry: '2027-01-01', daysLeft: 71, agreements: [{ id: 1, agreementNo: 'A-1', status: 'Pending Renewal' }], certificates: [] },
      documents: [
        { key: 'pan', checklist: 'pan', type: 'PAN Card', onFile: true, uploadable: false },
        { key: 'gst', checklist: 'gst', type: 'GST', onFile: false, uploadable: true },
        { key: 'doc-1', checklist: '', type: 'Other', onFile: true, uploadable: false },
      ],
    });
    expect(p.centre.phone).toBe('+91 98');
    expect(p.affiliation.agreements[0]?.status).toBe('Pending Renewal');
    expect(onFileCount(p.documents)).toEqual({ onFile: 1, total: 2 });
    expect(toProfileData(null).kyc).toBeNull();
  });
});
