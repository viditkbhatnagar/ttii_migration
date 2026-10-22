import { describe, expect, it } from 'vitest';

import {
  addAgreementTerm,
  agreementStatusOf,
  certificateStatusOf,
  daysBetweenYmd,
  emptyCentreApplication,
  firstStepWithError,
  istTodayYmd,
  isValidMobile,
  normaliseCentreApplication,
  validateCentreApplication,
  validateCentreApplicationStep,
  ymdToUtcDate,
  type CentreApplication,
} from '../src/index';

const doc = (name: string) => ({ name, url: `https://cdn.example/centre-onboarding/4/${name}` });

function complete(over: Partial<CentreApplication> = {}): CentreApplication {
  return {
    ...emptyCentreApplication(),
    centreName: 'Kollam Early Years', legalEntity: 'Kollam Early Years Trust', entityType: 'Trust',
    country: 'India', state: 'Kerala', district: 'Kollam', city: 'Kollam', pin: '691001', address1: 'Main Road',
    contactName: 'Arun S', designation: 'Director', mobile: '+91 97460 11122', email: 'arun@key.in',
    idNumber: '456712349876', pan: 'AABTK1234K', idDoc: doc('aadhaar.pdf'), panDoc: doc('pan.pdf'),
    ...over,
  };
}

describe('agreement term: + N years − 1 day', () => {
  it('a 3-year agreement ends the day before the third anniversary', () => {
    expect(addAgreementTerm('2026-10-22', 3)).toBe('2029-10-21');
    expect(addAgreementTerm('2026-01-01', 1)).toBe('2026-12-31');
  });
  it('29 February rolls to 1 March before the day is taken off', () => {
    expect(addAgreementTerm('2024-02-29', 1)).toBe('2025-02-28');
    expect(addAgreementTerm('2024-02-29', 4)).toBe('2028-02-28');
  });
  it('a term ending on 1 March of a leap year ends on 29 February', () => {
    expect(addAgreementTerm('2023-03-01', 1)).toBe('2024-02-29');
  });
  it('rejects impossible dates and terms', () => {
    expect(addAgreementTerm('2026-02-30', 1)).toBe('');
    expect(addAgreementTerm('22/10/2026', 1)).toBe('');
    expect(addAgreementTerm('2026-10-22', 0)).toBe('');
  });
});

describe('derived statuses', () => {
  it('agreements: Expired after the expiry day, Pending Renewal within 60 days, else Active', () => {
    expect(agreementStatusOf('2026-10-21', '2026-10-22')).toBe('Expired');
    expect(agreementStatusOf('2026-10-22', '2026-10-22')).toBe('Pending Renewal');
    expect(agreementStatusOf('2026-12-21', '2026-10-22')).toBe('Pending Renewal');
    expect(agreementStatusOf('2026-12-22', '2026-10-22')).toBe('Active');
  });
  it('certificates: Revoked wins; Expired after valid_to; else Valid', () => {
    expect(certificateStatusOf('2030-01-01', 'revoked', '2026-10-22')).toBe('Revoked');
    expect(certificateStatusOf('2026-10-21', 'valid', '2026-10-22')).toBe('Expired');
    expect(certificateStatusOf('2026-10-22', 'valid', '2026-10-22')).toBe('Valid');
  });
});

describe('calendar days', () => {
  it('today is the IST day (05:30 IST = 00:00 UTC)', () => {
    expect(istTodayYmd(Date.UTC(2026, 9, 21, 18, 29))).toBe('2026-10-21');
    expect(istTodayYmd(Date.UTC(2026, 9, 21, 18, 30))).toBe('2026-10-22');
  });
  it('builds @db.Date values at UTC midnight and counts whole days', () => {
    expect(ymdToUtcDate('2026-10-22')?.toISOString()).toBe('2026-10-22T00:00:00.000Z');
    expect(daysBetweenYmd('2026-10-20', '2026-10-22')).toBe(2);
    expect(daysBetweenYmd('2026-10-22', '2026-10-20')).toBe(-2);
  });
});

describe('centre application validation', () => {
  it('a complete form passes', () => {
    expect(validateCentreApplication(complete(), true)).toEqual({});
  });
  it('step 1 requires name, legal entity and a known entity type', () => {
    const e = validateCentreApplicationStep(0, complete({ legalEntity: '', entityType: 'Company' }));
    expect(e).toEqual({ legalEntity: 'Required', entityType: 'Select an entity type' });
  });
  it('a 6-digit PIN only when the country is India', () => {
    expect(validateCentreApplicationStep(1, complete({ pin: '6910' })).pin).toBe('Enter a 6-digit PIN');
    expect(validateCentreApplicationStep(1, complete({ country: 'Oman', pin: '112' })).pin).toBeUndefined();
  });
  it('contact step: mobile, email, PAN, optional GSTIN and both identity uploads', () => {
    const e = validateCentreApplicationStep(2, complete({
      mobile: '12', email: 'nope', pan: 'ABCDE1234', gstin: '32AABT', idDoc: null, panDoc: null,
    }));
    expect(e).toEqual({
      mobile: 'Enter a valid mobile number', email: 'Enter a valid email', pan: 'Enter a valid PAN',
      gstin: 'Enter a valid GSTIN', idDoc: 'Upload the document', panDoc: 'Upload the document',
    });
    expect(validateCentreApplicationStep(2, complete({ gstin: '32AABTK1234K1Z5' }))).toEqual({});
  });
  it('the login email must fit users.user_email (50 characters)', () => {
    const long = `${'a'.repeat(45)}@x.com`;
    expect(validateCentreApplicationStep(2, complete({ email: long })).email).toBe('Must be 50 characters or fewer');
  });
  it('bank details are optional but checked when given', () => {
    expect(validateCentreApplicationStep(3, complete())).toEqual({});
    expect(validateCentreApplicationStep(3, complete({ accountNumber: '12ab', ifsc: 'HDFC1234' }))).toEqual({
      accountNumber: 'Enter 9–18 digits', ifsc: 'Enter a valid IFSC',
    });
  });
  it('the declaration is required on submit', () => {
    expect(validateCentreApplication(complete(), false)).toEqual({ declaration: 'Confirm the declaration to continue' });
  });
  it('points at the first step with an error', () => {
    expect(firstStepWithError({ city: 'Required', declaration: 'x' })).toBe(1);
    expect(firstStepWithError({ panDoc: 'Upload the document' })).toBe(2);
    expect(firstStepWithError({ declaration: 'x' })).toBe(4);
    expect(firstStepWithError({})).toBe(-1);
  });
  it('mobile numbers allow +, spaces, brackets and dashes with 7-15 digits', () => {
    expect(isValidMobile('+91 (984) 701-2345')).toBe(true);
    expect(isValidMobile('9847012345')).toBe(true);
    expect(isValidMobile('+1234567890123456')).toBe(false);
  });
  it('normalises untrusted input: trims, upper-cases PAN / GSTIN / IFSC, drops bad documents', () => {
    const f = normaliseCentreApplication({ centreName: '  KEY  ', pan: 'aabtk1234k', ifsc: 'hdfc0001234', idDoc: { name: 'x' }, panDoc: doc('p.pdf'), extra: 'ignored' });
    expect(f.centreName).toBe('KEY');
    expect(f.pan).toBe('AABTK1234K');
    expect(f.ifsc).toBe('HDFC0001234');
    expect(f.idDoc).toBeNull();
    expect(f.panDoc).toEqual(doc('p.pdf'));
    // The upload signature travels with a document (the server checks it on submit).
    expect(normaliseCentreApplication({ idDoc: { ...doc('a.pdf'), sig: 'abc' } }).idDoc).toEqual({ ...doc('a.pdf'), sig: 'abc' });
    expect(f.country).toBe('India');
    expect('extra' in f).toBe(false);
  });
});

describe('isValidEmail (one address only)', () => {
  it('rejects comma / semicolon lists, spaces, quotes and angle brackets', async () => {
    const { isValidEmail } = await import('../src/centre-onboarding.js');
    expect(isValidEmail('centre@example.in')).toBe(true);
    expect(isValidEmail('a@b.co,c@d.co')).toBe(false);
    expect(isValidEmail('a@b.co;c@d.co')).toBe(false);
    expect(isValidEmail('a b@c.co')).toBe(false);
    expect(isValidEmail('"x"@c.co')).toBe(false);
    expect(isValidEmail('<a@b.co>')).toBe(false);
  });
});
