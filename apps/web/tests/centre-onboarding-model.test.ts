import { describe, expect, test } from 'vitest';

import {
  agreementFileError, agreementPayload, ageingDays, ageingTone, duplicateMessages, emptyAgreementForm, filterOnboarding,
  fmtDate, inr, leadFormOf, leadPayload, onboardingKpis, rowStageAction, sortOnboarding, stageCounts, stageLabel, stageTone,
  stepTracker, toOnboardingDetail, toOnboardingList, validateAgreementForm, validateLeadForm, verifiedCount,
  DEFAULT_ONB_FILTERS, type OnbDetail, type OnbRow,
} from '../src/admin/pages/centres/onboarding/onboarding-model';
import { locationErrors } from '../src/admin/pages/centres/onboarding/location-rules';
import { toFormState, uploadFileError } from '../src/public/centre-form/centre-form-api';

// Centres v2 — Centre Onboarding view model (Naji 2026-10-22).

function row(over: Partial<OnbRow>): OnbRow {
  return {
    id: '1', refNo: 'ONB-001', centreName: 'Kannur Kids Academy', contactName: 'Rasheed P', mobile: '9847012345', email: 'rasheed@kka.in',
    country: 'India', state: 'Kerala', district: 'Kannur', source: 'Website', notes: '', stage: 'lead',
    stageSince: '2026-10-19T04:00:00.000Z', createdAt: '2026-10-19T04:00:00.000Z', linkSentAt: '', linkExpired: false,
    formSubmittedAt: '', centreCode: '', centreId: '', ...over,
  };
}

const TODAY = '2026-10-22';

describe('list', () => {
  const rows = [
    row({ id: '1', refNo: 'ONB-001' }),
    row({ id: '2', refNo: 'ONB-002', centreName: 'Mysuru Montessori House', state: 'Karnataka', district: 'Mysuru', source: 'Event', linkSentAt: '2026-10-10T04:00:00Z', stageSince: '2026-10-05T04:00:00Z', createdAt: '2026-10-05T04:00:00Z' }),
    row({ id: '3', refNo: 'ONB-003', stage: 'under_review', stageSince: '2026-10-15T04:00:00Z' }),
    row({ id: '4', refNo: 'ONB-004', stage: 'onboarded', stageSince: '2026-10-01T18:40:00Z', centreCode: 'TTC0032', centreId: '40' }),
    row({ id: '5', refNo: 'ONB-005', stage: 'onboarded', stageSince: '2026-09-30T18:20:00Z' }),
    row({ id: '6', refNo: 'ONB-006', stage: 'agreement_pending' }),
  ];

  test('parses the server payload and keeps the not-set-up flag', () => {
    const list = toOnboardingList({ ready: false, message: 'Centre onboarding is not set up yet', today: TODAY, records: [{ id: 7, refNo: 'ONB-007', stage: 'weird', centreId: null }] });
    expect(list.ready).toBe(false);
    expect(list.records[0]).toMatchObject({ id: '7', stage: 'lead', centreId: '' });
  });

  test('a lead with a link reads "Form Sent"; the stage stays lead', () => {
    expect(stageLabel(rows[0] as OnbRow)).toBe('Lead');
    expect(stageLabel(rows[1] as OnbRow)).toBe('Form Sent');
    expect(stageTone(rows[1] as OnbRow)).toBe('primary');
    expect(stageLabel(row({ stage: 'certificate_pending' }))).toBe('Certificate Pending');
  });

  test('pill counts ignore filters; KPI "Onboarded this month" uses the IST month', () => {
    expect(stageCounts(rows)).toEqual({ lead: 2, under_review: 1, agreement_pending: 1, certificate_pending: 0, onboarded: 2, rejected: 0, all: 6 });
    // 2026-10-01T18:40Z is 2 Oct IST (this month); 2026-09-30T18:20Z is 30 Sep 23:50 IST (last month).
    expect(onboardingKpis(rows, TODAY)).toEqual({ leads: 2, awaitingForm: 1, underReview: 1, awaitingAgreement: 1, onboardedThisMonth: 1 });
  });

  test('filters by stage tab, search, state and source', () => {
    expect(filterOnboarding(rows, DEFAULT_ONB_FILTERS).map((r) => r.id)).toEqual(['1', '2']);
    expect(filterOnboarding(rows, { ...DEFAULT_ONB_FILTERS, tab: 'all', search: 'mysuru' }).map((r) => r.id)).toEqual(['2']);
    expect(filterOnboarding(rows, { ...DEFAULT_ONB_FILTERS, tab: 'all', state: 'Kerala', source: 'Website' })).toHaveLength(5);
    expect(filterOnboarding(rows, { ...DEFAULT_ONB_FILTERS, tab: 'all', search: 'TTC0032' }).map((r) => r.id)).toEqual(['4']);
  });

  test('sorts by created (oldest first by default), by ageing, and flips direction', () => {
    expect(sortOnboarding(rows, 'created', 'asc', TODAY).map((r) => r.id).slice(0, 3)).toEqual(['2', '1', '3']);
    expect(sortOnboarding(rows.filter((r) => r.stage === 'lead'), 'age', 'desc', TODAY).map((r) => r.id)).toEqual(['2', '1']);
    expect(sortOnboarding(rows, 'ref', 'desc', TODAY)[0]?.id).toBe('6');
  });

  test('ageing in IST days; none for Onboarded / Rejected; red after 10, amber after 5', () => {
    expect(ageingDays(row({ stageSince: '2026-10-19T04:00:00Z' }), TODAY)).toBe(3);
    expect(ageingDays(row({ stageSince: '2026-10-21T19:00:00Z' }), TODAY)).toBe(0);
    expect(ageingDays(row({ stage: 'onboarded' }), TODAY)).toBeNull();
    expect([ageingTone(11), ageingTone(6), ageingTone(5)]).toEqual(['rose', 'amber', 'slate']);
  });

  test('the ⋮ stage action follows the stage (none for Under Review / Onboarded)', () => {
    expect(rowStageAction(row({}))).toEqual({ action: 'send', label: 'Send Form Link' });
    expect(rowStageAction(row({ linkSentAt: '2026-10-20T00:00:00Z' }))).toEqual({ action: 'resend', label: 'Resend Link' });
    expect(rowStageAction(row({ stage: 'agreement_pending' }))?.label).toBe('Upload Signed Agreement');
    expect(rowStageAction(row({ stage: 'certificate_pending' }))?.label).toBe('Generate Certificate');
    expect(rowStageAction(row({ stage: 'rejected' }))?.label).toBe('Reopen as Lead');
    expect(rowStageAction(row({ stage: 'under_review' }))).toBeNull();
    expect(rowStageAction(row({ stage: 'onboarded' }))).toBeNull();
  });
});

describe('detail', () => {
  const raw = {
    ready: true,
    today: TODAY,
    record: { ...row({ id: '4', stage: 'certificate_pending', centreCode: 'TTC0032' }), verification: { entity: 'verified', address: 'verified', contact: 'flagged', junk: 'verified' } },
    form: { centreName: 'Kannur Kids Academy', gstin: '32aabtk1234k1z5', idDoc: { name: 'aadhaar.pdf', url: 'https://cdn/centre-onboarding/4/x-aadhaar.pdf' } },
    link: null,
    agreement: { id: 9, agreementNo: 'AGR-2026-008', effectiveDate: '2026-11-01', expiryDate: '2029-10-31', termYears: 3, feeAmount: '50000.00', feePaid: false, status: 'Active', fileUrl: 'u', fileName: 'signed.pdf' },
    certificate: null,
    events: [
      { id: 6, type: 'agreement_uploaded', message: 'Signed agreement uploaded (AGR-2026-008)', at: '2026-10-21T06:00:00Z', by: 'Anita' },
      { id: 5, type: 'approved', message: 'Application approved', at: '2026-10-20T06:00:00Z', by: 'Anita' },
      { id: 4, type: 'form_submitted', message: 'Application form submitted', at: '2026-10-18T06:00:00Z', by: 'Centre' },
      { id: 3, type: 'link_resent', message: 'Form link resent via Email', at: '2026-10-12T06:00:00Z', by: 'Rahul' },
      { id: 2, type: 'link_sent', message: 'Application form link sent via Email', at: '2026-10-10T06:00:00Z', by: 'Rahul' },
      { id: 1, type: 'lead_added', message: 'Lead added', at: '2026-10-09T06:00:00Z', by: 'Rahul' },
    ],
    duplicates: [{ field: 'GSTIN', kind: 'centre', name: 'Kannur Old' }, { field: 'Email', kind: 'lead', name: 'Kannur Lead' }, { field: 'Phone', kind: 'x', name: 'ignored' }],
    loginClash: 'Rasheed (student)',
  };

  test('parses record, form, agreement and keeps only known verification states', () => {
    const d = toOnboardingDetail(raw) as OnbDetail;
    expect(d.ready).toBe(true);
    expect(d.record.verification).toEqual({ entity: 'verified', address: 'verified', contact: 'flagged' });
    expect(verifiedCount(d.record.verification)).toBe(2);
    expect(d.form?.gstin).toBe('32AABTK1234K1Z5');
    expect(d.agreement).toMatchObject({ agreementNo: 'AGR-2026-008', feeAmount: 50000, feePaid: false });
    expect(toOnboardingDetail({ ready: false, message: 'not set up' })).toEqual({ ready: false, message: 'not set up' });
  });

  test('the tracker dates each step by its event; the lead step by the FIRST link sent', () => {
    const d = toOnboardingDetail(raw) as OnbDetail;
    expect(stepTracker(d).map((s) => [s.label, s.state, s.note])).toEqual([
      ['Lead', 'done', '10 Oct 2026 · Rahul'],
      ['Under Review', 'done', '18 Oct 2026 · Centre'],
      ['Agreement Pending', 'done', '20 Oct 2026 · Anita'],
      ['Certificate Pending', 'current', '21 Oct 2026 · Anita'],
      ['Onboarded', 'todo', '—'],
    ]);
  });

  test('duplicate warnings, the prototype GSTIN wording first, then the login clash', () => {
    const d = toOnboardingDetail(raw) as OnbDetail;
    expect(duplicateMessages(d)).toEqual([
      'GSTIN matches an existing centre: Kannur Old',
      'Email matches another lead: Kannur Lead',
      'rasheed@kka.in is already the email of an LMS login (Rasheed (student)). Change the email with Edit before completing onboarding.',
    ]);
  });
});

describe('dialogs', () => {
  test('Add / Edit Centre Lead: required fields, optional mobile, email fits the login column', () => {
    const empty = leadFormOf(null);
    expect(empty.country).toBe('India');
    expect(validateLeadForm(empty)).toEqual({ centreName: 'Required', contactName: 'Required', email: 'Required', state: 'Required', source: 'Required' });
    const ok = { ...leadFormOf(row({})), source: 'Website' };
    expect(validateLeadForm(ok)).toEqual({});
    expect(validateLeadForm({ ...ok, email: 'nope', mobile: '12' })).toEqual({ email: 'Invalid email', mobile: 'Enter a valid mobile number' });
    expect(validateLeadForm({ ...ok, email: `${'a'.repeat(45)}@kka.in` }).email).toBe('Must be 50 characters or fewer');
    expect(leadPayload({ ...ok, centreName: '  Kannur  ' })).toMatchObject({ centre_name: 'Kannur', source: 'Website', mobile: '9847012345' });
  });

  test('location boxes must hold one of their options', () => {
    expect(locationErrors({ country: 'India', state: 'Kerala', district: 'Kannur' }, true)).toEqual({});
    expect(locationErrors({ country: 'Ind', state: 'Kera', district: '' }, true)).toEqual({ country: 'Select a country from the list', district: 'Required' });
    expect(locationErrors({ country: 'India', state: 'Kera', district: '' }, false)).toEqual({ state: 'Select a state from the list' });
    expect(locationErrors({ country: 'Oman', state: 'Muscat', district: 'Seeb' }, true)).toEqual({});
  });

  test('Upload Signed Agreement: fee, PDF, paid-on date; no future dates', () => {
    const f = emptyAgreementForm(TODAY, 'Arun S');
    expect(f).toMatchObject({ effectiveDate: TODAY, term: '3', centreSignatory: 'Arun S' });
    expect(validateAgreementForm(f, TODAY)).toEqual({ fee: 'Required', file: 'Upload the signed PDF' });
    const filled = { ...f, fee: '50000', fileUrl: 'https://cdn/centre-agreements/4/x.pdf', fileName: 'x.pdf', fileSig: 'sig', feePaid: true, feePaidOn: '2026-10-23', signedOn: '2026-10-23' };
    expect(validateAgreementForm(filled, TODAY)).toEqual({ signedOn: 'Cannot be in the future', feePaidOn: 'Cannot be in the future' });
    expect(agreementPayload('4', { ...filled, feePaidOn: TODAY, signedOn: '' })).toMatchObject({ id: '4', term_years: '3', fee_amount: '50000', fee_paid: true, fee_paid_on: TODAY, file_url: 'https://cdn/centre-agreements/4/x.pdf', file_sig: 'sig' });
    expect(agreementFileError({ type: 'image/png', size: 10, name: 'a.png' })).toBe('PDF only');
    expect(agreementFileError({ type: 'application/pdf', size: 11 * 1024 * 1024, name: 'a.pdf' })).toBe('Max 10 MB');
    expect(agreementFileError({ type: 'application/pdf', size: 100, name: 'a.pdf' })).toBe('');
  });

  test('formatting', () => {
    expect(fmtDate('2026-10-22')).toBe('22 Oct 2026');
    expect(fmtDate('2026-10-21T19:00:00.000Z')).toBe('22 Oct 2026');
    expect(fmtDate('')).toBe('—');
    expect(inr(50000)).toBe('₹50,000');
    expect(inr(1234.5)).toBe('₹1,234.50');
  });
});

describe('public form client', () => {
  test('open and closed states', () => {
    expect(toFormState({ state: 'open', ref: 'ONB-004', centreName: 'KEY', expiresAt: '2026-11-21', remarks: '', prefill: { centreName: 'KEY', pan: 'aabtk1234k', panDoc: { name: 'p.pdf', url: 'https://cdn/p.pdf', sig: 'abc' } } })).toMatchObject({
      state: 'open', ref: 'ONB-004', prefill: { centreName: 'KEY', pan: 'AABTK1234K', country: 'India', idDoc: null, panDoc: { name: 'p.pdf', url: 'https://cdn/p.pdf', sig: 'abc' } },
    });
    expect(toFormState({ state: 'closed', reason: 'expired', message: 'This link has expired.' })).toEqual({ state: 'closed', reason: 'expired', message: 'This link has expired.' });
    expect(toFormState({})).toMatchObject({ state: 'closed', reason: 'invalid' });
  });

  test('uploads: PDF / PNG / JPEG under 5 MB', () => {
    expect(uploadFileError({ type: 'application/msword', size: 10 })).toBe('Choose a PDF, JPG or PNG file');
    expect(uploadFileError({ type: 'image/jpeg', size: 5 * 1024 * 1024 + 1 })).toBe('File must be under 5 MB');
    expect(uploadFileError({ type: 'image/png', size: 1000 })).toBe('');
  });
});
