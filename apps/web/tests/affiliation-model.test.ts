import { describe, expect, test } from 'vitest';

import {
  AGREEMENT_PILLS, CERTIFICATE_PILLS, DEFAULT_AFFILIATION_FILTERS, centreOptions, filterAgreements, filterCertificates,
  sortAgreements, sortCertificates, statusCounts, statusTone, termLabel, toAffiliation,
} from '../src/admin/pages/centres/affiliation/affiliation-model';

// Centres v2 — Affiliation & Agreements view model (Naji 2026-10-22).

const raw = {
  ready: true,
  today: '2026-10-22',
  agreements: [
    { id: 1, agreementNo: 'AGR-2026-010', centreName: 'Palakkad Centre', centreCode: 'TTC0005', inOnboarding: false, effectiveDate: '2024-01-01', expiryDate: '2026-10-21', termYears: 3, status: 'Expired', fileUrl: 'u1', feeAmount: 40000, feePaid: true },
    { id: 2, agreementNo: 'AGR-2026-002', centreName: 'Palakkad Centre', centreCode: 'TTC0005', inOnboarding: false, effectiveDate: '2024-06-01', expiryDate: '2026-12-01', termYears: 2, status: 'Pending Renewal', fileUrl: 'u2', feeAmount: 30000, feePaid: true },
    { id: 3, agreementNo: 'AGR-2026-003', centreName: 'Thrissur Teacher Hub', centreCode: 'TTC0009', inOnboarding: true, onboardingId: 3, effectiveDate: '2026-10-01', expiryDate: '2029-09-30', termYears: 1, status: 'Active', fileUrl: '', feeAmount: '40000', feePaid: false },
  ],
  certificates: [
    { id: 1, certificateNo: 'AFC-2026-001', centreName: 'Palakkad Centre', centreCode: 'TTC0005', validFrom: '2024-01-01', validTo: '2026-10-21', status: 'Expired', fileUrl: 'c1', agreementNo: 'AGR-2026-010' },
    { id: 2, certificateNo: 'AFC-2026-002', centreName: 'Kochi Smart Teachers', centreCode: 'TTC0011', validFrom: '2025-01-01', validTo: '2028-01-01', status: 'Revoked', fileUrl: '' },
    { id: 3, certificateNo: 'AFC-2026-003', centreName: 'Kochi Smart Teachers', centreCode: 'TTC0011', validFrom: '2026-01-01', validTo: '2029-01-01', status: 'nonsense', fileUrl: 'c3' },
  ],
};

describe('affiliation & agreements', () => {
  const data = toAffiliation(raw);

  test('parses rows; an unknown status falls back to the healthy one', () => {
    expect(data.agreements[2]).toMatchObject({ id: '3', inOnboarding: true, onboardingId: '3', feeAmount: 40000, feePaid: false });
    expect(data.certificates[2]?.status).toBe('Valid');
    expect(toAffiliation({ ready: false, message: 'not set up' })).toMatchObject({ ready: false, agreements: [], certificates: [] });
  });

  test('pill counts over all rows', () => {
    expect(statusCounts(data.agreements, AGREEMENT_PILLS)).toEqual({ All: 3, Active: 1, 'Pending Renewal': 1, Expired: 1 });
    expect(statusCounts(data.certificates, CERTIFICATE_PILLS)).toEqual({ All: 3, Valid: 1, Expired: 1, Revoked: 1 });
  });

  test('search matches number, centre and code; the centre filter is exact', () => {
    expect(filterAgreements(data.agreements, { ...DEFAULT_AFFILIATION_FILTERS, search: 'ttc0009' }).map((a) => a.id)).toEqual(['3']);
    expect(filterAgreements(data.agreements, { ...DEFAULT_AFFILIATION_FILTERS, status: 'Expired' }).map((a) => a.id)).toEqual(['1']);
    expect(filterCertificates(data.certificates, { ...DEFAULT_AFFILIATION_FILTERS, centre: 'Kochi Smart Teachers' })).toHaveLength(2);
    expect(centreOptions(data.agreements)).toEqual([{ value: 'Palakkad Centre', label: 'Palakkad Centre' }, { value: 'Thrissur Teacher Hub', label: 'Thrissur Teacher Hub' }]);
  });

  test('sorting: number ascending by default (natural), expiry and term', () => {
    expect(sortAgreements(data.agreements, 'no', 'asc').map((a) => a.agreementNo)).toEqual(['AGR-2026-002', 'AGR-2026-003', 'AGR-2026-010']);
    expect(sortAgreements(data.agreements, 'expiry', 'desc').map((a) => a.id)).toEqual(['3', '2', '1']);
    expect(sortAgreements(data.agreements, 'term', 'asc').map((a) => a.termYears)).toEqual([1, 2, 3]);
    expect(sortCertificates(data.certificates, 'to', 'asc').map((c) => c.id)).toEqual(['1', '2', '3']);
  });

  test('labels and tones', () => {
    expect([termLabel(1), termLabel(3)]).toEqual(['1 Year', '3 Years']);
    expect([statusTone('Active'), statusTone('Pending Renewal'), statusTone('Expired'), statusTone('Revoked'), statusTone('Valid')]).toEqual(['emerald', 'amber', 'rose', 'slate', 'emerald']);
  });
});
