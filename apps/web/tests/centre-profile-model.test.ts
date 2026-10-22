import { describe, expect, test } from 'vitest';

import {
  EMPTY_FORM, formFromProfile, fromApiErrors, isRequired, setLocation, toPayload, validateForm, type CentreForm,
} from '../src/admin/pages/centres/centre-form-model';
import {
  buildLedger, docsOnFile, filterApps, fmtDay, hasBankDetails, maskTail, safeUrl, sortLedger, stagePills, toProfile, walletTotals,
} from '../src/admin/pages/centres/centre-profile-model';

// Centre Profile 360 + the Add / Edit Centre form (Naji 2026-10-22).

const PROFILE = toProfile({
  kyc_ready: true,
  notice: '',
  centre: {
    id: 28, code: '28', name: 'upCarrera Education', status: 'active', country: '', state: 'Kerala', district: 'Kozhikode',
    address: 'Mavoor Road', contact_person: 'Junaid KB', designation: '', country_code: '+91', phone: '9526389878',
    email: 'ops@upcarrera.in', affiliation_expiry: '2026-12-31', registration_doc: '', affiliation_document: 'https://lms.teachersindia.in/uploads/aff.pdf',
    wallet_balance: 75000, created_at: '2025-01-10T05:00:00.000Z',
  },
  kyc: {
    legal_entity_name: 'upCarrera Education Pvt Ltd', entity_type: 'Private Limited', city: 'Kozhikode', pincode: '673004', gstin: '',
    pan: 'AAACU5678L', id_number: '112233445566', id_doc: '', pan_doc: '', bank_account_name: '', bank_account_number: '',
    bank_ifsc: '', bank_name: '', bank_branch: '', logo: '',
  },
  login: { user_id: 501, email: 'ops@upcarrera.in', disabled: false },
  course_plans: [{ id: 1, course: 'Diploma', amount: 30000, start: '2026-01-01', end: '2026-12-31', status: 'Active' }],
  applications: [
    { id: 1, application_id: 'APP-1', date: '2026-10-01', student: 'Lead Person', course: 'Diploma', combination: 'TTII + MSU', fee: 35400, stage: 'payment_pending' },
    { id: 2, application_id: 'APP-2', date: '2026-09-01', student: 'Converted', course: 'PG', combination: '', fee: null, stage: 'enrolled' },
  ],
  students: [{ id: 900, roll: 'TTS0101', name: 'Amina C', cohort: 'MMJUL26', course: 'PG', joined: '2026-09-02', status: 'Active' }],
  cohorts: [{ id: 75, cohort_id: 'MMJUL26', derived_status: 'active', student_count: 1 }],
  wallet: {
    balance: 75000,
    transactions: [{ id: 1, type: 'credit', amount: 75000, remarks: 'Fund request approved #7', at: '2026-08-02T05:00:00.000Z' }],
    fund_requests: [{ id: 7, amount: 75000, date: '2026-08-01', status: 'approved', description: 'Top-up', at: '2026-08-01T05:00:00.000Z' }],
  },
  documents: [
    { key: 'registration', id: null, source: 'registration', name: '—', type: 'Registration Certificate', date: '', url: '', deletable: false },
    { key: 'affiliation', id: null, source: 'affiliation', name: 'aff.pdf', type: 'Affiliation Document', date: '', url: 'https://lms.teachersindia.in/uploads/aff.pdf', deletable: false },
    { key: 'doc-1', id: 1, source: 'uploaded', name: 'Lease.pdf', type: 'Uploaded Document', date: '2026-10-05', url: 'https://cdn.example.com/lease.pdf', deletable: true },
  ],
  activity: [{ kind: 'document', text: 'Document uploaded: Lease.pdf', at: '2026-10-05T05:00:00.000Z' }],
});

describe('profile mapping and display helpers', () => {
  test('maps the profile payload', () => {
    expect(PROFILE.centre).toMatchObject({ id: '28', code: '28', status: 'active', walletBalance: 75000 });
    expect(PROFILE.kyc?.pan).toBe('AAACU5678L');
    expect(PROFILE.login).toEqual({ userId: '501', email: 'ops@upcarrera.in', disabled: false });
    expect(PROFILE.applications[1]?.fee).toBeNull();
    expect(PROFILE.cohorts[0]).toMatchObject({ id: '75', status: 'active', students: 1 });
    expect(docsOnFile(PROFILE.documents)).toBe(2);
  });

  test('masks to the last 4 characters (account number and Aadhaar / Passport)', () => {
    expect(maskTail('3029012345678')).toBe('•••••••••5678');
    expect(maskTail('112233445566')).toBe('••••••••5566');
    expect(maskTail('A12')).toBe('•••');
    expect(maskTail('')).toBe('');
  });

  test('only http(s) file links reach an href or the viewer', () => {
    expect(safeUrl('https://cdn.example.com/a b.pdf')).toBe('https://cdn.example.com/a b.pdf');
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('//evil.example/x')).toBe('');
    expect(toProfile({ documents: [{ key: 'x', url: 'data:text/html,<b>' }] }).documents[0]?.url).toBe('');
  });

  test('bank details count only when one is captured', () => {
    expect(hasBankDetails(PROFILE.kyc)).toBe(false);
    expect(hasBankDetails(PROFILE.kyc ? { ...PROFILE.kyc, ifsc: 'SBIN0001234' } : null)).toBe(true);
    expect(hasBankDetails(null)).toBe(false);
  });

  test('dates show as "22 Oct 2026"; instants use the IST day', () => {
    expect(fmtDay('2026-10-22')).toBe('22 Oct 2026');
    expect(fmtDay('2026-10-21T20:00:00.000Z')).toBe('22 Oct 2026');
    expect(fmtDay('')).toBe('—');
  });

  test('application stage pills keep the prototype set and add stages in use', () => {
    const pills = stagePills(PROFILE.applications);
    expect(pills.map((p) => p.label)).toEqual(['Lead', 'Payment Pending', 'Paid', 'Approval Waiting', 'Enrolled', 'Rejected']);
    expect(pills.find((p) => p.stage === 'enrolled')?.count).toBe(1);
    expect(filterApps(PROFILE.applications, { stage: 'all', course: '', combination: 'TTII + MSU', search: '' }).map((a) => a.appId)).toEqual(['APP-1']);
    expect(filterApps(PROFILE.applications, { stage: 'all', course: '', combination: '', search: 'convert' }).map((a) => a.appId)).toEqual(['APP-2']);
  });
});

describe('wallet ledger', () => {
  test('a ledger that replays to the stored balance shows running balances', () => {
    const { rows, reconciled } = buildLedger(PROFILE.transactions, PROFILE.fundRequests, PROFILE.walletBalance);
    expect(reconciled).toBe(true);
    expect(rows.find((r) => r.ref === 'TXN-1')).toMatchObject({ type: 'Credit', balance: 75000, status: 'Completed', date: '2026-08-02' });
    expect(rows.find((r) => r.ref === 'FR-7')).toMatchObject({ type: 'Request', balance: null, status: 'Approved', date: '2026-08-01' });
    expect(sortLedger(rows, 'date', 'asc').map((r) => r.ref)).toEqual(['FR-7', 'TXN-1']);
  });

  test('a ledger that does not reconcile shows no running balance at all', () => {
    const txns = [
      { id: '1', type: 'credit' as const, amount: 1000, remarks: '', at: '2026-01-01T00:00:00.000Z' },
      { id: '2', type: 'debit' as const, amount: 400, remarks: '', at: '2026-02-01T00:00:00.000Z' },
    ];
    const off = buildLedger(txns, [], 3201.5);
    expect(off.reconciled).toBe(false);
    expect(off.rows.every((r) => r.balance === null)).toBe(true);
    const on = buildLedger(txns, [], 600);
    expect(on.rows.map((r) => r.balance)).toEqual([1000, 600]);
    expect(walletTotals(txns)).toEqual({ credits: 1000, debits: 400 });
    expect(buildLedger([{ ...txns[0]!, type: 'other' }], [], 1000).reconciled).toBe(false);
  });
});

describe('add / edit centre form', () => {
  const ADD = { mode: 'add' as const, kycReady: true };
  const EDIT = { mode: 'edit' as const, kycReady: true };
  const full: CentreForm = {
    ...EMPTY_FORM, centreId: 'TTC0032', name: 'Bengaluru South Centre', legalEntity: 'EduPulse Learning Pvt Ltd', entityType: 'Private Limited',
    address1: 'JP Nagar', country: 'India', state: 'Karnataka', district: 'Udupi', city: 'Bengaluru', pin: '560078',
    contactName: 'Anita Rao', designation: 'Manager', mobile: '9845012345', email: 'blr@edupulse.in',
    idNumber: '554433221100', idDoc: 'https://cdn.example.com/a.pdf', pan: 'AAACE2222C', panDoc: 'https://cdn.example.com/p.pdf',
  };

  test('identity papers are required on add only; kyc fields drop out before the migration', () => {
    expect(validateForm(full, ADD)).toEqual({});
    const noId = { ...full, idNumber: '', idDoc: '', pan: '', panDoc: '' };
    expect(validateForm(noId, ADD)).toEqual({ idNumber: 'Required', idDoc: 'Required', pan: 'Required', panDoc: 'Required' });
    expect(validateForm(noId, EDIT)).toEqual({});
    expect(isRequired('legalEntity', { mode: 'edit', kycReady: false })).toBe(false);
    expect(validateForm({ ...noId, legalEntity: '', entityType: '', city: '', pin: '' }, { mode: 'edit', kycReady: false })).toEqual({});
  });

  test('PIN and mobile rules depend on the country', () => {
    expect(validateForm({ ...full, pin: '5600' }, ADD).pin).toBe('Enter a 6-digit PIN');
    expect(validateForm({ ...full, mobile: '5845012345' }, ADD).mobile).toBe('Enter a valid 10-digit mobile');
    const uae = { ...full, country: 'United Arab Emirates', state: 'Dubai', district: 'Deira', pin: '00000', mobile: '501234567' };
    expect(validateForm(uae, ADD)).toEqual({});
    expect(validateForm({ ...uae, mobile: '123' }, ADD).mobile).toBe('Enter a valid mobile (7–15 digits)');
    expect(validateForm({ ...full, state: 'Atlantis' }, ADD).state).toBe('Select a state from the list');
    expect(validateForm({ ...full, pan: 'ABC', gstin: 'X', accountNumber: '12', ifsc: 'SBIN1' }, ADD)).toMatchObject({
      pan: 'Invalid PAN format', gstin: 'Invalid GSTIN format', accountNumber: '9–18 digits', ifsc: 'Invalid IFSC format',
    });
  });

  test('the payload uses the API field names and the dial code of the country', () => {
    const body = toPayload({ ...full, pan: 'aaace2222c' }, EDIT, '28');
    expect(body).toMatchObject({ id: '28', centre_code: 'TTC0032', centre_name: 'Bengaluru South Centre', pincode: '560078', phone: '9845012345', country_code: '+91', pan: 'AAACE2222C' });
    const noKyc = toPayload(full, { mode: 'edit', kycReady: false }, '28');
    expect('legal_entity_name' in noKyc).toBe(false);
    expect('pan' in noKyc).toBe(false);
  });

  test('server field errors land on the form fields', () => {
    expect(fromApiErrors({ errors: { centre_code: 'Centre ID already exists', phone: 'Another centre already uses this mobile', email: 'x' } }))
      .toEqual({ centreId: 'Centre ID already exists', mobile: 'Another centre already uses this mobile', email: 'x' });
  });

  test('cascading location: a new country clears state and district', () => {
    expect(setLocation(full, 'country', 'Qatar')).toMatchObject({ country: 'Qatar', state: '', district: '' });
    expect(setLocation(full, 'state', 'Kerala')).toMatchObject({ state: 'Kerala', district: '' });
    expect(setLocation(full, 'country', 'India')).toBe(full);
  });

  test('edit pre-fills from the profile; a legacy centre with an Indian state reads as India', () => {
    const form = formFromProfile(PROFILE);
    expect(form).toMatchObject({ centreId: '28', country: 'India', state: 'Kerala', district: 'Kozhikode', legalEntity: 'upCarrera Education Pvt Ltd', pin: '673004', mobile: '9526389878' });
  });
});
