import Fastify from 'fastify';
import { describe, expect, test, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import {
  NOT_SET_UP_MESSAGE, applicationStage, buildActivity, mergeForSave, planStatus, readSubmitted, validateCentre,
  ymdOfText, EMPTY_VALUES, type CentreValues,
} from '../../src/operations/centre-profile-model.js';
import { CentreProfileService, loginUpdate } from '../../src/operations/centre-profile-service.js';
import { OperationsService } from '../../src/operations/operations-service.js';
import { registerCentreProfileRoutes } from '../../src/routes/centre-profile-routes.js';
import type * as CentreCreate from '../../src/operations/centre-create.js';
import { memoryPrisma, type MemoryDb } from './support/memory-prisma.js';

// The legacy /admin/centres/add path emails through centre-create directly.
vi.mock('../../src/operations/centre-create.js', async (importOriginal) => ({
  ...(await importOriginal<typeof CentreCreate>()),
  emailCentreCredentials: vi.fn(() => Promise.resolve({ emailDelivered: true })),
}));

// Centres v2 (Naji 2026-10-22): Centre Directory dialog + Centre Profile 360.
// Real data only, the legacy password never leaves the server, an edit never
// blanks what it was not given, and every read/write of the 2026-10-22 tables
// degrades cleanly before the migration runs.

const NOW = new Date('2026-10-22T06:30:00Z');
type Row = Record<string, unknown>;

function seed(): Record<string, Row[]> {
  return {
    centres: [
      {
        id: 28, centre_id: '28', centre_name: 'upCarrera Education', wallet_balance: '75000', country_id: '1', state_id: 'Kerala',
        district_id: 'Kozhikode', address: 'Mavoor Road', contact_person: 'Junaid KB', contact_person_designation: null,
        country_code: '+91', phone: '9526389878', whatsapp: '9526389878', email: 'ops@upcarrera.in', secondary_phone: '',
        date_of_registration: '2025-01-10', date_of_expiry: '2026-12-31', registraion_certificate: null,
        affiliation_document: 'uploads/centre/aff.pdf', password: 'legacy-md5-hash', status: 1,
        created_at: new Date('2025-01-10T05:00:00Z'), updated_at: null, deleted_at: null,
      },
      {
        id: 30, centre_id: 'TTC0031', centre_name: 'Hanahadhi', wallet_balance: '0', country_id: 'India', state_id: 'Kerala',
        district_id: 'Malappuram', address: 'Pattikkad', contact_person: 'Hana', contact_person_designation: 'Director',
        country_code: '+91', phone: '9961819732', whatsapp: '9961819732', email: 'hana@example.com', secondary_phone: '',
        date_of_expiry: null, password: 'x', status: 1, created_at: new Date('2025-06-01T05:00:00Z'), deleted_at: null,
      },
    ],
    users: [
      { id: 501, role_id: 7, centre_id: '28', name: 'upCarrera Education', phone: '9526389878', country_code: '+91', user_email: 'ops@upcarrera.in', email: null, deleted_at: null, disabled_at: null },
      { id: 502, role_id: 7, centre_id: '30', name: 'Hanahadhi', phone: '9961819732', country_code: '+91', user_email: 'hana@example.com', email: null, deleted_at: null, disabled_at: null },
      { id: 900, role_id: 2, added_under_centre: 28, student_id: 'TTS0101', name: 'Amina C', status: 1, disabled_at: null, course_id: 16, created_at: new Date('2026-09-01T20:00:00Z'), deleted_at: null, user_email: 'amina@example.com' },
      { id: 901, role_id: 2, added_under_centre: 28, student_id: 'TTS0102', name: 'Ravi', status: 1, disabled_at: new Date(), course_id: null, created_at: new Date('2026-09-02T05:00:00Z'), deleted_at: null },
      { id: 777, role_id: 9, name: 'Counsellor', user_email: 'counsellor@example.com', deleted_at: null },
    ],
    course: [{ id: 16, title: 'Diploma in Montessori' }, { id: 18, title: 'PG Diploma' }],
    enrol: [{ id: 1, user_id: 900, course_id: 18, deleted_at: null }],
    cohort_students: [{ id: 1, user_id: 900, cohort_id: '75', deleted_at: null }],
    cohorts: [{ id: 75, cohort_id: 'MMJUL26', title: 'July', deleted_at: null }],
    applications: [
      { id: 1, application_id: 'APP-1', name: 'Lead Person', created_at: new Date('2026-10-01T05:00:00Z'), course_id: 16, certificate_combination_id: 3, application_final_fee: 35400, stage: 'payment_pending', status: 'pending', is_converted: 0, added_under_centre: 28, deleted_at: null },
      { id: 2, application_id: 'APP-2', name: 'Converted', created_at: new Date('2026-09-01T05:00:00Z'), course_id: 16, certificate_combination_id: null, application_final_fee: null, stage: 'approval_waiting', status: 'pending', is_converted: 1, added_under_centre: 28, deleted_at: null },
    ],
    certificate_combinations: [{ id: 3, combination_code: 'TTII + MSU' }],
    centre_course_plans: [
      { id: 1, centre_id: 28, course_id: 16, assigned_amount: '30000', start_date: new Date('2026-01-01T00:00:00Z'), end_date: new Date('2026-12-31T00:00:00Z'), deleted_at: null },
      { id: 2, centre_id: 28, course_id: 18, assigned_amount: '45000', start_date: new Date('2025-01-01T00:00:00Z'), end_date: new Date('2025-12-31T00:00:00Z'), deleted_at: null },
    ],
    wallet_transactions: [
      { id: 1, centre_id: 28, transaction_type: 'credit', amount: '75000', remarks: 'Fund request approved #7', created_at: new Date('2026-08-02T05:00:00Z'), deleted_at: null },
    ],
    centre_fund_requests: [
      { id: 7, centre_id: 28, amount: '75000', date: new Date('2026-08-01T00:00:00Z'), status: 'approved', description: 'Top-up', created_at: new Date('2026-08-01T05:00:00Z'), updated_at: new Date('2026-08-02T05:00:00Z'), deleted_at: null },
      { id: 8, centre_id: 28, amount: '5000', date: new Date('2026-10-01T00:00:00Z'), status: 'pending', description: 'Exam fund', created_at: new Date('2026-10-01T05:00:00Z'), updated_at: null, deleted_at: null },
    ],
    centre_kyc: [],
    centre_documents: [
      { id: 1, centre_id: 28, title: 'Lease deed.pdf', doc_type: 'Uploaded Document', file_url: 'https://cdn.example.com/lease.pdf', created_at: new Date('2026-10-05T05:00:00Z'), deleted_at: null },
    ],
    centre_agreements: [],
    centre_affiliation_certificates: [],
    centre_onboarding: [],
  };
}

/** memoryPrisma plus the upsert the service uses on centre_kyc. */
function world(opts: { missing?: string[] } = {}): { db: MemoryDb; prisma: PrismaClient; emails: Array<{ email: string; password: string }>; service: CentreProfileService } {
  const db = memoryPrisma(seed());
  for (const t of opts.missing ?? []) db.missing.add(t);
  const base = db.prisma as unknown as Record<string, Record<string, (args: unknown) => Promise<unknown>>>;
  const prisma: PrismaClient = new Proxy({}, {
    get(_target, prop: string) {
      if (prop === '$transaction') {
        return (arg: unknown) => (typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as Promise<unknown>[]));
      }
      if (prop === 'then') return undefined;
      const delegate = base[prop] as Record<string, (args: unknown) => Promise<unknown>>;
      return {
        ...delegate,
        upsert: async ({ where, create, update }: { where: Row; create: Row; update: Row }) => {
          const found = await delegate.findUnique!({ where });
          return found ? delegate.update!({ where, data: update }) : delegate.create!({ data: create });
        },
      };
    },
  }) as unknown as PrismaClient;
  const emails: Array<{ email: string; password: string }> = [];
  const service = new CentreProfileService(prisma, {
    now: () => NOW,
    loadCohorts: (id) => Promise.resolve(id === 28 ? [{ id: 75, cohort_id: 'MMJUL26', derived_status: 'active', student_count: 1 }] : []),
    emailCredentials: (input, password) => { emails.push({ email: input.email, password }); return Promise.resolve({ emailDelivered: true }); },
  });
  return { db, prisma, emails, service };
}

const VALID_ADD: Row = {
  centre_code: 'TTC0032', centre_name: 'Bengaluru South Centre', legal_entity_name: 'EduPulse Learning Pvt Ltd',
  entity_type: 'Private Limited', registration_doc: '', affiliation_expiry: '2027-06-30',
  address: 'JP Nagar 7th Phase', country: 'India', state: 'Karnataka', district: 'Bengaluru Urban', city: 'Bengaluru', pincode: '560078',
  contact_person: 'Anita Rao', designation: 'Regional Manager', country_code: '+91', phone: '9845012345', email: 'Blr.South@EduPulse.in',
  id_number: '554433221100', id_doc: 'https://cdn.example.com/aadhaar.pdf', pan: 'aaace2222c', pan_doc: 'https://cdn.example.com/pan.pdf',
  gstin: '29AAACE2222C1Z9', bank_account_name: '', bank_account_number: '', bank_ifsc: '', bank_name: '', bank_branch: '',
};

/** One stored row, read back through the in-memory client. */
function findRow(db: MemoryDb, table: string, where: Row): Promise<Row | null> {
  const delegate = (db.prisma as unknown as Record<string, { findFirst: (a: { where: Row }) => Promise<Row | null> }>)[table];
  return delegate!.findFirst({ where });
}

const values = (patch: Partial<CentreValues>): CentreValues => ({ ...mergeForSave('add', readSubmitted(VALID_ADD), EMPTY_VALUES), ...patch });

describe('centre form rules (mirrors the web form)', () => {
  test('a complete add passes; identity is required on add only', () => {
    expect(validateCentre(values({}), { mode: 'add', kycReady: true })).toEqual({});
    const noId = values({ id_number: '', id_doc: '', pan: '', pan_doc: '' });
    expect(validateCentre(noId, { mode: 'add', kycReady: true })).toMatchObject({ id_number: 'Required', id_doc: 'Required', pan: 'Required', pan_doc: 'Required' });
    expect(validateCentre(noId, { mode: 'edit', kycReady: true })).toEqual({});
  });

  test('PIN is 6 digits and the mobile /^[6-9]\\d{9}$/ only for India', () => {
    expect(validateCentre(values({ pincode: '5600' }), { mode: 'add', kycReady: true }).pincode).toBe('Enter a 6-digit PIN');
    expect(validateCentre(values({ phone: '5845012345' }), { mode: 'add', kycReady: true }).phone).toBe('Enter a valid 10-digit mobile');
    const uae = values({ country: 'United Arab Emirates', state: 'Dubai', district: 'Deira', country_code: '+971', phone: '501234567', pincode: '00000' });
    expect(validateCentre(uae, { mode: 'add', kycReady: true })).toEqual({});
    expect(validateCentre({ ...uae, phone: '12345' }, { mode: 'add', kycReady: true }).phone).toBe('Enter a valid mobile (7–15 digits)');
  });

  test('format rules use the prototype messages', () => {
    const e = validateCentre(values({ pan: 'ABC', gstin: '22AAAAA0000A1Z', bank_account_number: '12', bank_ifsc: 'SBIN1234', email: 'nope', entity_type: 'Club' }), { mode: 'add', kycReady: true });
    expect(e).toMatchObject({
      pan: 'Invalid PAN format', gstin: 'Invalid GSTIN format', bank_account_number: '9–18 digits',
      bank_ifsc: 'Invalid IFSC format', email: 'Enter a valid email', entity_type: 'Select a valid type',
    });
    expect(readSubmitted({ pan: ' aaace 2222c ', email: ' A@B.IN ' })).toEqual({ pan: 'AAACE2222C', email: 'a@b.in' });
  });

  test('before the migration the centre_kyc fields are neither required nor checked', () => {
    const e = validateCentre(values({ legal_entity_name: '', entity_type: '', city: '', pincode: '', pan: 'bad' }), { mode: 'edit', kycReady: false });
    expect(e).toEqual({});
  });

  test('edit merge: a blank required field keeps its value, a sent optional field is written as sent', () => {
    const stored = values({ gstin: '29AAACE2222C1Z9', contact_person: 'Anita Rao' });
    const merged = mergeForSave('edit', readSubmitted({ contact_person: '', phone: '', gstin: '' }), stored);
    expect(merged.contact_person).toBe('Anita Rao');
    expect(merged.phone).toBe('9845012345');
    expect(merged.gstin).toBe('');
    expect(mergeForSave('edit', {}, stored).gstin).toBe('29AAACE2222C1Z9');
  });

  test('dates, stages and plan status come from the real columns', () => {
    expect(ymdOfText('2026-12-31')).toBe('2026-12-31');
    expect(ymdOfText('31/12/2026')).toBe('2026-12-31');
    expect(ymdOfText('2026-02-30')).toBe('');
    expect(applicationStage({ stage: 'approval_waiting', status: 'pending', is_converted: 1 })).toBe('enrolled');
    expect(applicationStage({ stage: 'paid', status: 'rejected', is_converted: 0 })).toBe('rejected');
    expect(applicationStage({ stage: null, status: null, is_converted: 0 })).toBe('lead');
    expect(planStatus('2026-01-01', '2026-12-31', '2026-10-22')).toBe('Active');
    expect(planStatus('2026-11-01', '', '2026-10-22')).toBe('Inactive');
    expect(planStatus('', '2026-10-21', '2026-10-22')).toBe('Inactive');
  });

  test('activity lists only recorded events, newest first', () => {
    const items = buildActivity({
      centre: { code: 'TTC0031', created_at: new Date('2025-01-01T00:00:00Z') },
      kyc: { created_at: new Date('2026-01-01T00:00:00Z'), updated_at: new Date('2026-01-01T00:00:00Z') },
      fundRequests: [{ id: 7, amount: '500', status: 'pending', created_at: new Date('2026-03-01T00:00:00Z'), updated_at: new Date('2026-03-02T00:00:00Z') }],
      walletTransactions: [],
      documents: [{ title: 'Deed', created_at: null }],
      agreements: [],
      certificates: [],
    });
    expect(items.map((i) => i.text)).toEqual(['Fund request FR-7 raised for ₹500.00', 'Centre record created as TTC0031']);
  });
});

describe('centre profile read', () => {
  test('one call carries the real tabs and never the legacy password', async () => {
    const { service } = world();
    const res = await service.profile(28);
    expect(res.status).toBe(1);
    const data = res.data!;
    expect(JSON.stringify(data)).not.toContain('legacy-md5-hash');
    expect(data.kyc_ready).toBe(true);
    expect(data.centre).toMatchObject({ code: '28', country: '', state: 'Kerala', district: 'Kozhikode', affiliation_expiry: '2026-12-31', wallet_balance: 75000 });
    expect(data.centre.affiliation_document).toBe('https://lms.teachersindia.in/uploads/centre/aff.pdf');
    expect(data.login).toEqual({ user_id: 501, email: 'ops@upcarrera.in', disabled: false });
    expect(data.course_plans.map((p) => [p.course, p.amount, p.status])).toEqual([['Diploma in Montessori', 30000, 'Active'], ['PG Diploma', 45000, 'Inactive']]);
    expect(data.applications.map((a) => [a.application_id, a.stage, a.combination, a.fee])).toEqual([
      ['APP-2', 'enrolled', '', null], ['APP-1', 'payment_pending', 'TTII + MSU', 35400],
    ]);
    expect(data.students).toEqual([
      { id: 900, roll: 'TTS0101', name: 'Amina C', cohort: 'MMJUL26', course: 'PG Diploma', joined: '2026-09-02', status: 'Active' },
      { id: 901, roll: 'TTS0102', name: 'Ravi', cohort: '', course: '', joined: '2026-09-02', status: 'Inactive' },
    ]);
    expect(data.cohorts).toHaveLength(1);
    expect(data.wallet.transactions).toEqual([{ id: 1, type: 'credit', amount: 75000, remarks: 'Fund request approved #7', at: '2026-08-02T05:00:00.000Z' }]);
    expect(data.wallet.fund_requests.map((f) => [f.id, f.status, f.date])).toEqual([[7, 'approved', '2026-08-01'], [8, 'pending', '2026-10-01']]);
    expect(data.documents.map((d) => [d.type, d.url !== '', d.deletable])).toEqual([
      ['Registration Certificate', false, false], ['Affiliation Document', true, false], ['Aadhaar / Passport', false, false],
      ['PAN Card', false, false], ['Uploaded Document', true, true],
    ]);
    expect(data.activity[0]?.text).toBe('Document uploaded: Lease deed.pdf');
    expect(data.activity.some((a) => a.text === 'Fund request FR-7 approved')).toBe(true);
  });

  test('before the migration it degrades: no KYC, base documents only, existing tables still read', async () => {
    const { service } = world({ missing: ['centre_kyc', 'centre_documents', 'centre_agreements', 'centre_affiliation_certificates'] });
    const res = await service.profile(28);
    expect(res.status).toBe(1);
    expect(res.data).toMatchObject({ kyc_ready: false, notice: NOT_SET_UP_MESSAGE, kyc: null });
    expect(res.data!.documents.every((d) => !d.deletable)).toBe(true);
    expect(res.data!.applications).toHaveLength(2);
    expect(res.data!.wallet.fund_requests).toHaveLength(2);
  });

  test('a missing or deleted centre is refused', async () => {
    const { service } = world();
    expect(await service.profile(999)).toEqual({ status: 0, message: 'Centre not found' });
    expect(await service.profile(0)).toEqual({ status: 0, message: 'Centre not found' });
  });

  test('legacy listCentres / getCentre no longer return the password', async () => {
    const { prisma } = world();
    const ops = new OperationsService(prisma);
    const rows = await ops.listCentres();
    expect(rows.every((r) => !('password' in r))).toBe(true);
    expect(rows.find((r) => r.id === 28)).toMatchObject({ country_name: '', state_name: 'Kerala', district_name: 'Kozhikode', linked_user_id: 501 });
    const one = await ops.getCentre('28') as { data: { centre: Row } };
    expect('password' in one.data.centre).toBe(false);
  });
});

describe('add centre', () => {
  test('creates the centre, its KYC row and the role-7 login, then emails after commit', async () => {
    const { db, service, emails } = world();
    const res = await service.save(1, VALID_ADD);
    expect(res).toMatchObject({ status: 1, message: 'Centre "Bengaluru South Centre" added', data: { code: 'TTC0032', mode: 'add', email_delivered: true } });
    const id = res.data!.id;
    const row = await findRow(db, 'centres', { id });
    expect(row).toMatchObject({ centre_id: 'TTC0032', email: 'blr.south@edupulse.in', state_id: 'Karnataka', country_code: '+91', status: 1, date_of_registration: '2026-10-22' });
    const login = db.tables.users.find((u) => u.role_id === 7 && u.centre_id === String(id));
    expect(login).toMatchObject({ user_email: 'blr.south@edupulse.in', name: 'Bengaluru South Centre' });
    expect(emails).toHaveLength(1);
    expect(emails[0]?.email).toBe('blr.south@edupulse.in');
  });

  test('refuses a code in use (numbers compare: "TTC0031" is taken by "TTC0031")', async () => {
    const { service, emails } = world();
    const res = await service.save(1, { ...VALID_ADD, centre_code: 'ttc31' });
    expect(res.status).toBe(0);
    expect(res.data?.errors).toEqual({ centre_code: 'Centre ID already exists' });
    expect(emails).toHaveLength(0);
  });

  test('refuses another centre email / mobile and an email that is already a centre login', async () => {
    const { db, service } = world();
    const dup = await service.save(1, { ...VALID_ADD, email: 'hana@example.com', phone: '9961819732' });
    expect(dup.data?.errors).toMatchObject({ email: 'Another centre already uses this email', phone: 'Another centre already uses this mobile' });
    db.tables.users.push({ id: 600, role_id: 7, centre_id: '99', user_email: 'free@centre.in', deleted_at: null });
    const login = await service.save(1, { ...VALID_ADD, email: 'free@centre.in' });
    expect(login.data?.errors).toEqual({ email: 'This email is already used by a centre login' });
    // A counsellor with the same email is a different role: the role switcher handles it.
    const ok = await service.save(1, { ...VALID_ADD, email: 'counsellor@example.com' });
    expect(ok.status).toBe(1);
  });

  test('field errors come back together with the prototype message', async () => {
    const { service } = world();
    const res = await service.save(1, { ...VALID_ADD, centre_name: '', pincode: '12' });
    expect(res).toMatchObject({ status: 0, message: 'Please fix the highlighted fields' });
    expect(res.data?.errors).toEqual({ centre_name: 'Required', pincode: 'Enter a 6-digit PIN' });
  });

  test('before the migration it refuses with a clear message and writes nothing', async () => {
    const { db, service, emails } = world({ missing: ['centre_kyc'] });
    const before = db.tables.users.length;
    expect(await service.save(1, VALID_ADD)).toEqual({ status: 0, message: NOT_SET_UP_MESSAGE });
    expect(db.tables.users.length).toBe(before);
    expect(emails).toHaveLength(0);
  });
});

describe('edit centre', () => {
  const EDIT: Row = {
    id: 30, centre_code: 'TTC0031', centre_name: 'Hanahadhi Academy', legal_entity_name: 'Hanahadhi Trust', entity_type: 'Trust',
    address: 'Pattikkad Road', country: 'India', state: 'Kerala', district: 'Malappuram', city: 'Malappuram', pincode: '676505',
    contact_person: 'Hana', designation: 'Director', country_code: '+91', phone: '9961819732', email: 'hana@example.com',
    id_number: '', id_doc: '', pan: '', pan_doc: '', gstin: '32AABTH1234K1Z5',
  };

  test('saves centre + KYC without identity papers, and keeps the login in step', async () => {
    const { db, service } = world();
    const res = await service.save(1, { ...EDIT, email: 'office@hanahadhi.in', phone: '9961800000' });
    expect(res).toMatchObject({ status: 1, message: 'Centre "Hanahadhi Academy" updated' });
    const centre = await findRow(db, 'centres', { id: 30 });
    expect(centre).toMatchObject({ centre_name: 'Hanahadhi Academy', email: 'office@hanahadhi.in', phone: '9961800000', whatsapp: '9961800000', password: 'x' });
    const kyc = await findRow(db, 'centre_kyc', { centre_id: 30 });
    expect(kyc).toMatchObject({ legal_entity_name: 'Hanahadhi Trust', gstin: '32AABTH1234K1Z5', pan: null });
    expect(db.tables.users.find((u) => u.id === 502)).toMatchObject({ name: 'Hanahadhi Academy', user_email: 'office@hanahadhi.in', phone: '9961800000' });
  });

  test('an edit keeps the logo (it is not a form field)', async () => {
    const { db, service } = world();
    await service.setLogo(1, 30, 'https://cdn.example.com/hana.png');
    await service.save(1, EDIT);
    expect((await findRow(db, 'centre_kyc', { centre_id: 30 }))?.logo).toBe('https://cdn.example.com/hana.png');
  });

  test('blank required fields never blank the stored contact, phone or email', async () => {
    const { db, service } = world();
    await service.save(1, EDIT);
    const res = await service.save(1, { id: 30, contact_person: '', phone: '', email: '', gstin: '' });
    expect(res.status).toBe(1);
    const centre = await findRow(db, 'centres', { id: 30 });
    expect(centre).toMatchObject({ contact_person: 'Hana', phone: '9961819732', email: 'hana@example.com' });
    const kyc = await findRow(db, 'centre_kyc', { centre_id: 30 });
    expect(kyc?.gstin).toBeNull();
    expect(kyc?.legal_entity_name).toBe('Hanahadhi Trust');
  });

  test('refuses an email that belongs to another user, and another centre code', async () => {
    const { service } = world();
    const email = await service.save(1, { ...EDIT, email: 'amina@example.com' });
    expect(email.data?.errors).toEqual({ email: 'This email belongs to another user' });
    const code = await service.save(1, { ...EDIT, centre_code: '28' });
    expect(code.data?.errors).toEqual({ centre_code: 'Centre ID already exists' });
  });

  test('before the migration: centre columns still save, KYC input is refused', async () => {
    const { db, service } = world({ missing: ['centre_kyc'] });
    const refused = await service.save(1, EDIT);
    expect(refused).toEqual({ status: 0, message: NOT_SET_UP_MESSAGE });
    const plain = { ...EDIT, legal_entity_name: '', entity_type: '', city: '', pincode: '', gstin: '' };
    const ok = await service.save(1, plain);
    expect(ok.status).toBe(1);
    const centre = await findRow(db, 'centres', { id: 30 });
    expect(centre?.centre_name).toBe('Hanahadhi Academy');
  });

  test('loginUpdate follows only centre values that changed, and only where the login still matched them', () => {
    const v = values({ centre_name: 'X', phone: '9000000000', email: 'x@y.in' });
    const prev = { name: 'Old', phone: '9111111111', email: 'old@y.in' };
    expect(loginUpdate({ name: 'X', phone: '9000000000', country_code: '+91', user_email: 'x@y.in', email: null }, v, { name: 'X', phone: '9000000000', email: 'x@y.in' })).toBeNull();
    expect(loginUpdate({ name: 'Old', phone: '9111111111', country_code: '+91', user_email: 'old@y.in', email: 'old@y.in' }, v, prev))
      .toEqual({ name: 'X', phone: '9000000000', country_code: '+91', user_email: 'x@y.in', email: 'x@y.in' });
    // A login deliberately set apart from the centre is left alone.
    expect(loginUpdate({ name: 'Front desk', phone: '9222222222', country_code: '+91', user_email: 'desk@y.in', email: null }, v, prev)).toBeNull();
    // An unrelated edit never rewrites a login whose email differs from the centre's.
    expect(loginUpdate({ name: 'X', phone: '9000000000', country_code: '+91', user_email: 'desk@y.in', email: null }, v, { name: 'X', phone: '9000000000', email: 'x@y.in' })).toBeNull();
  });

  test('a present but unreadable id is refused, never treated as a new centre', async () => {
    const { db, service, emails } = world();
    const before = db.tables.users.length;
    expect(await service.save(1, { ...VALID_ADD, id: 'TTC0031' })).toEqual({ status: 0, message: 'Centre not found' });
    expect(await service.save(1, { ...VALID_ADD, id: 0 })).toEqual({ status: 0, message: 'Centre not found' });
    expect(db.tables.users.length).toBe(before);
    expect(emails).toHaveLength(0);
  });

  test('a stored legacy file path (even with a space) never blocks an edit and is kept as stored', async () => {
    const { db, service } = world();
    const stored = (db.tables as unknown as Record<string, Row[]>).centres!.find((c) => c.id === 30)!;
    stored.registraion_certificate = 'uploads/centre/reg cert.pdf';
    const profile = await service.profile(30);
    const shown = profile.data!.centre.registration_doc;
    expect(shown).toBe('https://lms.teachersindia.in/uploads/centre/reg cert.pdf');
    const res = await service.save(1, { ...EDIT, registration_doc: shown });
    expect(res.status).toBe(1);
    expect((await findRow(db, 'centres', { id: 30 }))?.registraion_certificate).toBe('uploads/centre/reg cert.pdf');
    const bad = await service.save(1, { ...EDIT, registration_doc: 'javascript:alert(1)' });
    expect(bad.data?.errors).toEqual({ registration_doc: 'Upload the file again' });
  });
});

describe('status, documents and logo', () => {
  test('status flips centres.status only', async () => {
    const { db, service } = world();
    expect(await service.setStatus(1, 28, 'inactive')).toEqual({ status: 1, message: 'upCarrera Education marked Inactive', data: { status: 'inactive' } });
    const centre = await findRow(db, 'centres', { id: 28 });
    expect(centre?.status).toBe(0);
    expect(db.tables.users.find((u) => u.id === 501)?.disabled_at).toBeNull();
    expect((await service.setStatus(1, 28, 'paused')).status).toBe(0);
  });

  test('documents: add, soft delete, and refuse before the migration', async () => {
    const { service } = world();
    const added = await service.addDocument(1, { centre_id: 28, title: 'Fire NOC.pdf', file_url: 'https://cdn.example.com/noc.pdf' });
    expect(added.status).toBe(1);
    expect((await service.addDocument(1, { centre_id: 28, title: 'x', file_url: 'javascript:alert(1)' })).status).toBe(0);
    expect(await service.deleteDocument(1, added.data!.id, 30)).toEqual({ status: 0, message: 'Document not found' });
    // No centre given: refused rather than deleting another centre's document by id.
    expect(await service.deleteDocument(1, added.data!.id)).toEqual({ status: 0, message: 'Document not found' });
    expect(await service.deleteDocument(1, added.data!.id, 28)).toEqual({ status: 1, message: 'Document deleted' });
    const profile = await service.profile(28);
    expect(profile.data!.documents.filter((d) => d.source === 'uploaded')).toHaveLength(1);

    const missing = world({ missing: ['centre_documents', 'centre_kyc'] }).service;
    expect(await missing.addDocument(1, { centre_id: 28, title: 'a', file_url: 'https://x.y/a.pdf' })).toEqual({ status: 0, message: NOT_SET_UP_MESSAGE });
    expect(await missing.deleteDocument(1, 1, 28)).toEqual({ status: 0, message: NOT_SET_UP_MESSAGE });
    expect(await missing.setLogo(1, 28, 'https://x.y/logo.png')).toEqual({ status: 0, message: NOT_SET_UP_MESSAGE });
  });

  test('logo upserts centre_kyc.logo and shows on the profile', async () => {
    const { service } = world();
    expect(await service.setLogo(1, 28, 'https://cdn.example.com/logo.png')).toMatchObject({ status: 1, message: 'Logo updated' });
    expect((await service.profile(28)).data!.kyc?.logo).toBe('https://cdn.example.com/logo.png');
    expect(await service.nextCode()).toEqual({ code: 'TTC0032' });
  });
});

describe('course plans (Course & Fee Structure)', () => {
  const base = { centre_id: 30, course_id: 16, assigned_amount: '10,000', start_date: '2026-10-01', end_date: '2027-03-31' };

  test('adds a plan, stores the fee as a plain string and UTC-midnight dates', async () => {
    const { service, db } = world();
    const res = await service.savePlan(1, base);
    expect(res).toMatchObject({ status: 1, message: 'Course assigned' });
    const row = await findRow(db, 'centre_course_plans', { id: res.data!.id });
    expect(row).toMatchObject({ centre_id: 30, course_id: 16, assigned_amount: '10000', created_by: 1 });
    expect((row!.start_date as Date).toISOString()).toBe('2026-10-01T00:00:00.000Z');
    const plans = (await service.profile(30)).data!.course_plans;
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ course_id: 16, amount: 10000, status: 'Active' });
  });

  test('validates centre, course, fee and dates', async () => {
    const { service } = world();
    expect((await service.savePlan(1, { ...base, centre_id: 999 })).message).toBe('Centre not found');
    expect((await service.savePlan(1, { ...base, course_id: 999 })).message).toBe('Choose a course.');
    for (const fee of ['', 'abc', '-5', '1e3']) expect((await service.savePlan(1, { ...base, assigned_amount: fee })).status).toBe(0);
    expect((await service.savePlan(1, { ...base, assigned_amount: '0' })).status).toBe(1);
    expect((await service.savePlan(1, { ...base, course_id: 18, start_date: '2026-02-30' })).message).toBe('Enter a valid start date.');
    expect((await service.savePlan(1, { ...base, course_id: 18, end_date: '2026-09-30' })).message).toBe('The end date cannot be before the start date.');
  });

  test('refuses a second LIVE plan for the course but allows a renewal after expiry', async () => {
    const { service } = world();
    const dup = await service.savePlan(1, { ...base, centre_id: 28, course_id: 16 });
    expect(dup.message).toBe('This course is already assigned to this centre — edit the existing plan instead');
    // Plan 2 (course 18, centre 28) ended 2025-12-31: a new plan is a renewal.
    expect((await service.savePlan(1, { ...base, centre_id: 28, course_id: 18 })).status).toBe(1);
    // Ending today still blocks.
    const { service: s2 } = world();
    await s2.savePlan(1, { ...base, end_date: '2026-10-22' });
    expect((await s2.savePlan(1, base)).status).toBe(0);
  });

  test('edit keeps the course, is scoped to the centre, and ignores deleted plans', async () => {
    const { service, db } = world();
    expect((await service.savePlan(1, { ...base, id: 1, centre_id: 30 })).message).toBe('Course plan not found');
    const ok = await service.savePlan(2, { id: 1, centre_id: 28, course_id: 18, assigned_amount: '31000', start_date: '2026-01-01', end_date: '2027-01-31' });
    expect(ok).toMatchObject({ status: 1, message: 'Course plan updated' });
    expect(await findRow(db, 'centre_course_plans', { id: 1 })).toMatchObject({ course_id: 16, assigned_amount: '31000', updated_by: 2 });
    await service.deletePlan(1, 1, 28);
    expect((await service.savePlan(1, { id: 1, centre_id: 28, assigned_amount: '1', start_date: '2026-01-01', end_date: '2026-02-01' })).message).toBe('Course plan not found');
  });

  test('delete is a soft delete scoped to the centre', async () => {
    const { service, db } = world();
    expect(await service.deletePlan(1, 1, 30)).toEqual({ status: 0, message: 'Course plan not found' });
    expect(await service.deletePlan(1, 0, 28)).toEqual({ status: 0, message: 'Course plan not found' });
    expect(await service.deletePlan(7, 1, 28)).toEqual({ status: 1, message: 'Course removed' });
    expect(await findRow(db, 'centre_course_plans', { id: 1 })).toMatchObject({ deleted_by: 7 });
    expect((await service.profile(28)).data!.course_plans.map((p) => p.id)).toEqual([2]);
    expect((await service.deletePlan(1, 1, 28)).status).toBe(0);
  });

  test('course options list active, non-deleted courses by title', async () => {
    const { service, db } = world();
    db.tables.course.push({ id: 19, title: 'Archived', status: 'inactive', deleted_at: null }, { id: 20, title: 'Gone', status: 'active', deleted_at: new Date() });
    for (const c of db.tables.course) if (c.status === undefined) c.status = 'active';
    const res = await service.courseOptions();
    expect(res.data!.courses.map((c) => c.id)).toEqual([16, 18]);
  });
});

describe('routes', () => {
  test('every route sits behind the admin-only guard', async () => {
    const app = Fastify();
    const { service } = world();
    const allow = () => Promise.resolve();
    const deny = async (_req: unknown, reply: { code: (n: number) => { send: (b: unknown) => Promise<void> } }) => { await reply.code(403).send({ status: 0 }); };
    registerCentreProfileRoutes(app, { requireAuth: allow, requireAdminOnlyRole: deny as never, service });
    for (const [method, url] of [['GET', '/admin/centres/profile?id=28'], ['GET', '/admin/centres/next_code'], ['POST', '/admin/centres/save'],
      ['POST', '/admin/centres/status'], ['POST', '/admin/centres/documents/add'], ['POST', '/admin/centres/documents/delete'], ['POST', '/admin/centres/logo'],
      ['GET', '/admin/centres/course_options'], ['POST', '/admin/centres/course_plan/save'], ['POST', '/admin/centres/course_plan/delete']] as const) {
      const res = await app.inject({ method, url, ...(method === 'POST' ? { payload: {} } : {}) });
      expect(res.statusCode, url).toBe(403);
    }
    await app.close();
  });

  test('answers with the envelope', async () => {
    const app = Fastify();
    const { service } = world();
    registerCentreProfileRoutes(app, { requireAuth: () => Promise.resolve(), requireAdminOnlyRole: () => Promise.resolve(), service });
    const res = await app.inject({ method: 'GET', url: '/admin/centres/profile?id=28' });
    const body = res.json<{ status: number; data: { centre: { code: string } } }>();
    expect(body.status).toBe(1);
    expect(body.data.centre.code).toBe('28');
    expect(res.body).not.toContain('legacy-md5-hash');
    await app.close();
  });
});
