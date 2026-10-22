import { describe, expect, test } from 'vitest';

import { emptyCentreApplication, type CentreApplication } from '@ttii/shared-types';

import type { StorageProvider } from '../../src/integrations/contracts.js';
import { CentreAffiliationService } from '../../src/operations/centre-affiliation-service.js';
import { CentreFormPublicService } from '../../src/operations/centre-form-public-service.js';
import { NOT_SET_UP_MESSAGE, formToken, tokenHash, uploadSignature } from '../../src/operations/centre-onboarding-model.js';
import { CentreOnboardingService } from '../../src/operations/centre-onboarding-service.js';
import { onboardingDb, type OnboardingDb } from './support/onboarding-db.js';

// Centres v2 — Centre Onboarding end to end on an in-memory database (Naji
// 2026-10-22): lead → form link → public submit → verify → approve (code
// reserved) → signed agreement → Issue & Complete (centre + KYC + login +
// certificate). Every transition is claim-first; tokens die on resend.

const SECRET = 'test-secret-key-0123456789';
const ADMIN = 1;

interface Clock { now: Date }

function world(seed: Record<string, Array<Record<string, unknown>>> = {}, opts: { storage?: 'ok' | 'fail' | 'none'; emailFails?: boolean } = {}) {
  const db: OnboardingDb = onboardingDb({ centres: [], users: [], centre_kyc: [], ...seed });
  const clock: Clock = { now: new Date('2026-10-22T05:00:00.000Z') };
  const now = () => new Date(clock.now.getTime());
  const emails: Array<{ to: string; subject: string; html: string }> = [];
  const credentialEmails: string[] = [];
  const stored: string[] = [];
  const storage = {
    name: 'fake',
    uploadObject: ({ key }: { key: string }) => {
      if (opts.storage === 'fail') return Promise.reject(new Error('storage down'));
      stored.push(key);
      return Promise.resolve({ key, provider: 'fake', location: `https://cdn.example/${key}` });
    },
  } as unknown as StorageProvider;
  const onboarding = new CentreOnboardingService({
    prisma: db.prisma, secret: SECRET, now,
    sendEmail: (m) => { if (opts.emailFails) return Promise.reject(new Error('smtp down')); emails.push(m); return Promise.resolve(); },
  });
  const affiliation = new CentreAffiliationService({
    prisma: db.prisma, now, secret: SECRET,
    ...(opts.storage === 'none' ? {} : { storage }),
    emailCredentials: (input) => { credentialEmails.push(input.email); return Promise.resolve({ emailDelivered: true }); },
    renderPdf: () => Promise.resolve(Buffer.from('%PDF-1.7 fake')),
  });
  const publicForm = new CentreFormPublicService({ prisma: db.prisma, secret: SECRET, now });
  return { db, clock, onboarding, affiliation, publicForm, emails, credentialEmails, stored };
}

const LEAD = { centre_name: 'Kollam Early Years', contact_name: 'Arun S', email: 'arun@key.in', mobile: '9746011122', country: 'India', state: 'Kerala', district: 'Kollam', source: 'Website', notes: 'Met at the expo' };

/** A refusal whose message mentions `part`. */
async function expectRefused(pending: Promise<{ status: number; message: string }>, part: string): Promise<void> {
  const res = await pending;
  expect(res.status).toBe(0);
  expect(res.message).toContain(part);
}

function tokenFromLink(link: string): string {
  return link.split('/').pop() ?? '';
}

function form(id: number, over: Partial<CentreApplication> = {}): CentreApplication {
  const doc = (name: string) => {
    const url = `https://cdn.example/centre-onboarding/${id}/0123456789abcdef0123456789abcdef-${name}`;
    return { name, url, sig: uploadSignature(SECRET, id, url) };
  };
  return {
    ...emptyCentreApplication(),
    centreName: 'Kollam Early Years', legalEntity: 'Kollam Early Years Trust', entityType: 'Trust',
    country: 'India', state: 'Kerala', district: 'Kollam', city: 'Kollam', pin: '691001', address1: 'Main Road, Kollam',
    contactName: 'Arun S', designation: 'Director', mobile: '+91 97460 11122', email: 'arun@key.in',
    idNumber: '456712349876', pan: 'AABTK1234K', gstin: '32AABTK1234K1Z5',
    accountName: 'Kollam Early Years Trust', accountNumber: '50100234567812', ifsc: 'HDFC0001234', bank: 'HDFC Bank', branch: 'Kollam',
    registrationDoc: doc('trust.pdf'), idDoc: doc('aadhaar.pdf'), panDoc: doc('pan.pdf'),
    ...over,
  };
}

async function leadWithLink(w: ReturnType<typeof world>) {
  const created = await w.onboarding.createLead(ADMIN, LEAD);
  const id = created.data?.id ?? 0;
  const sent = await w.onboarding.sendLink(ADMIN, id, 'email');
  return { id, token: tokenFromLink(sent.data?.link ?? '') };
}

async function underReview(w: ReturnType<typeof world>) {
  const { id, token } = await leadWithLink(w);
  const res = await w.publicForm.submit(token, { form: form(id), declaration: true });
  expect(res.status).toBe(1);
  return { id, token };
}

async function verifyAll(w: ReturnType<typeof world>, id: number) {
  for (const s of ['entity', 'address', 'contact', 'legal', 'bank']) await w.onboarding.setVerification(ADMIN, id, s, 'verified');
}

async function atCertificatePending(w: ReturnType<typeof world>) {
  const { id } = await underReview(w);
  await verifyAll(w, id);
  const approved = await w.onboarding.approve(ADMIN, id);
  expect(approved.status).toBe(1);
  const fileUrl = `https://cdn.example/centre-agreements/${id}/0123456789abcdef0123456789abcdef-signed.pdf`;
  const up = await w.affiliation.uploadAgreement(ADMIN, {
    id, effective_date: '2026-11-01', term_years: '3', fee_amount: '50000', fee_paid: false,
    file_url: fileUrl, file_sig: uploadSignature(SECRET, id, fileUrl),
    signed_on: '2026-10-20', ttii_signatory: 'TTII Registrar', centre_signatory: 'Arun S',
  });
  expect(up.status).toBe(1);
  return { id, centreCode: approved.data?.centreCode ?? '' };
}

describe('before the 2026-10-22 migration runs', () => {
  test('reads answer ready:false with empty data and writes refuse clearly (no 500)', async () => {
    const w = world();
    for (const t of ['centre_onboarding', 'centre_onboarding_events', 'centre_agreements', 'centre_affiliation_certificates', 'centre_kyc']) w.db.missing.add(t);
    await expect(w.onboarding.list()).resolves.toMatchObject({ ready: false, message: NOT_SET_UP_MESSAGE, records: [] });
    await expect(w.affiliation.list()).resolves.toMatchObject({ ready: false, agreements: [], certificates: [] });
    await expect(w.affiliation.nextNumbers()).resolves.toMatchObject({ ready: false });
    await expect(w.onboarding.createLead(ADMIN, LEAD)).resolves.toEqual({ status: 0, message: NOT_SET_UP_MESSAGE });
    await expect(w.onboarding.detail(1)).resolves.toMatchObject({ status: 1, data: { ready: false } });
    await expect(w.publicForm.open('A'.repeat(43))).resolves.toMatchObject({ state: 'closed', reason: 'unavailable' });
    await expect(w.affiliation.markFeePaid(ADMIN, 1, '2026-10-22')).resolves.toEqual({ status: 0, message: NOT_SET_UP_MESSAGE });
  });
});

describe('leads and the form link', () => {
  test('Add Centre Lead creates ONB-001 at stage lead with an activity entry', async () => {
    const w = world();
    const res = await w.onboarding.createLead(ADMIN, LEAD);
    expect(res).toEqual({ status: 1, message: 'Centre lead added', data: { id: 1, refNo: 'ONB-001' } });
    expect(w.db.tables.centre_onboarding[0]).toMatchObject({ stage: 'lead', ref_no: 'ONB-001', mobile: '9746011122', district: 'Kollam', notes: 'Met at the expo' });
    expect(w.db.tables.centre_onboarding_events.map((e) => e.message)).toEqual(['Lead added']);
  });

  test('sending stores only the token hash, emails the link, and the public form opens prefilled', async () => {
    const w = world();
    const { id, token } = await leadWithLink(w);
    const row = w.db.tables.centre_onboarding[0] ?? {};
    expect(row.link_token_hash).toBe(tokenHash(token));
    expect(JSON.stringify(row)).not.toContain(token);
    expect(w.emails).toHaveLength(1);
    expect(w.emails[0]?.to).toBe('arun@key.in');
    expect(w.emails[0]?.html).toContain(`https://learn.teachersindia.in/centre-form/${token}`);
    const open = await w.publicForm.open(token);
    expect(open).toMatchObject({ state: 'open', ref: 'ONB-001', centreName: 'Kollam Early Years', expiresAt: '2026-11-21', prefill: { contactName: 'Arun S', email: 'arun@key.in', district: 'Kollam' } });
    // Copy Link on the detail recomputes the very same link from link_sent_at.
    const detail = await w.onboarding.detail(id);
    expect(detail.data && 'link' in detail.data ? detail.data.link?.url : '').toBe(`https://learn.teachersindia.in/centre-form/${token}`);
  });

  test('a resend kills the previous link, even inside the same second', async () => {
    const w = world();
    const { id, token: first } = await leadWithLink(w);
    const again = await w.onboarding.sendLink(ADMIN, id, 'copy');
    expect(again.message).toBe('Form link resent via Copy link');
    const second = tokenFromLink(again.data?.link ?? '');
    expect(second).not.toBe(first);
    await expect(w.publicForm.open(first)).resolves.toMatchObject({ state: 'closed', reason: 'invalid' });
    await expect(w.publicForm.open(second)).resolves.toMatchObject({ state: 'open' });
    expect(w.db.tables.centre_onboarding_events.map((e) => e.message)).toEqual(['Lead added', 'Application form link sent via Email', 'Form link resent via Copy link']);
  });

  test('a failed email still leaves a working link and says so on the timeline', async () => {
    const w = world({}, { emailFails: true });
    const created = await w.onboarding.createLead(ADMIN, LEAD);
    const sent = await w.onboarding.sendLink(ADMIN, created.data?.id ?? 0, 'email');
    expect(sent.status).toBe(1);
    expect(sent.data?.emailDelivered).toBe(false);
    await expect(w.publicForm.open(tokenFromLink(sent.data?.link ?? ''))).resolves.toMatchObject({ state: 'open' });
    expect(w.db.tables.centre_onboarding_events.at(-1)?.message).toContain('could not be sent: smtp down');
  });

  test('Mark Expired and the 30-day limit both close the form', async () => {
    const w = world();
    const { id, token } = await leadWithLink(w);
    w.clock.now = new Date('2026-11-21T18:30:00.000Z');
    await expect(w.publicForm.open(token)).resolves.toMatchObject({ state: 'closed', reason: 'expired' });
    w.clock.now = new Date('2026-10-23T05:00:00.000Z');
    await expect(w.onboarding.expireLink(ADMIN, id)).resolves.toEqual({ status: 1, message: 'Link marked expired' });
    await expect(w.publicForm.open(token)).resolves.toMatchObject({ state: 'closed', reason: 'expired' });
    await expect(w.onboarding.expireLink(ADMIN, id)).resolves.toMatchObject({ status: 0 });
    await expectRefused(w.publicForm.submit(token, { form: form(id), declaration: true }), 'expired');
  });

  test('garbage and forged tokens are refused without touching other leads', async () => {
    const w = world();
    const { id } = await leadWithLink(w);
    await expect(w.publicForm.open('short')).resolves.toMatchObject({ reason: 'invalid' });
    const forged = formToken('wrong-secret-0123456789', id, w.db.tables.centre_onboarding[0]?.link_sent_at as Date);
    await expect(w.publicForm.open(forged)).resolves.toMatchObject({ reason: 'invalid' });
  });
});

describe('public submit', () => {
  test('validates server-side with the shared rules and refuses documents not uploaded for this lead', async () => {
    const w = world();
    const { id, token } = await leadWithLink(w);
    const res = await w.publicForm.submit(token, {
      form: form(id, {
        pin: '12', pan: 'bad', idDoc: { name: 'x.pdf', url: 'https://evil.example/x.pdf' },
        // The right shape on another host, with a signature made for a different URL: refused too.
        panDoc: { name: 'p.pdf', url: `https://evil.example/centre-onboarding/${id}/0123456789abcdef0123456789abcdef-p.pdf`, sig: uploadSignature(SECRET, id, 'https://cdn.example/other') },
      }),
      declaration: false,
    });
    expect(res.status).toBe(0);
    expect(res.data?.errors).toEqual({ pin: 'Enter a 6-digit PIN', pan: 'Enter a valid PAN', declaration: 'Confirm the declaration to continue', idDoc: 'Upload the document again', panDoc: 'Upload the document again' });
    expect(w.db.tables.centre_onboarding[0]?.stage).toBe('lead');
  });

  test('a valid submit moves the lead to Under Review once; a second submit finds it closed', async () => {
    const w = world();
    const { id, token } = await leadWithLink(w);
    const submitted = await w.publicForm.submit(token, { form: form(id, { centreName: 'Kollam Early Years Academy', email: 'office@key.in' }), declaration: true });
    expect(submitted).toEqual({ status: 1, message: 'Application submitted', data: { ref: 'ONB-001' } });
    const row = w.db.tables.centre_onboarding[0] ?? {};
    expect(row).toMatchObject({ stage: 'under_review', centre_name: 'Kollam Early Years Academy', email: 'office@key.in', verification_json: null });
    expect(JSON.parse(String(row.form_json))).toMatchObject({ legalEntity: 'Kollam Early Years Trust', pan: 'AABTK1234K' });
    expect(w.db.tables.centre_onboarding_events.at(-1)).toMatchObject({ event_type: 'form_submitted', message: 'Application form submitted', actor_user_id: null });
    await expectRefused(w.publicForm.submit(token, { form: form(id), declaration: true }), 'already been submitted');
    await expect(w.publicForm.open(token)).resolves.toMatchObject({ state: 'closed', reason: 'submitted' });
  });

  test('a resend between opening the form and submitting it wins: the stale tab cannot submit', async () => {
    const w = world();
    const { id, token } = await leadWithLink(w);
    await w.onboarding.sendLink(ADMIN, id, 'copy');
    await expect(w.publicForm.submit(token, { form: form(id), declaration: true })).resolves.toMatchObject({ status: 0 });
    expect(w.db.tables.centre_onboarding[0]?.stage).toBe('lead');
  });
});

describe('review, approval and the reserved centre code', () => {
  test('Approve is refused until all five sections are verified, then reserves TTC#### one past every code in use', async () => {
    const w = world({ centres: [{ id: 30, centre_id: 'TTC0001', centre_name: 'Old', email: 'o@x.in', phone: '1', deleted_at: null }, { id: 31, centre_id: '31', centre_name: 'Numeric', email: 'n@x.in', phone: '2', deleted_at: null }] });
    const { id } = await underReview(w);
    await w.onboarding.setVerification(ADMIN, id, 'entity', 'verified');
    await w.onboarding.setVerification(ADMIN, id, 'bank', 'flagged');
    await expect(w.onboarding.approve(ADMIN, id)).resolves.toEqual({ status: 0, message: 'Verify every section first.' });
    await verifyAll(w, id);
    const res = await w.onboarding.approve(ADMIN, id);
    expect(res).toEqual({ status: 1, message: 'Application approved', data: { centreCode: 'TTC0032' } });
    expect(w.db.tables.centre_onboarding[0]).toMatchObject({ stage: 'agreement_pending', centre_code: 'TTC0032' });
    expect(w.db.tables.centre_onboarding_events.at(-1)?.message).toBe('Application approved — centre code TTC0032 assigned — awaiting signed agreement');
  });

  test('two approvals reserving the same code: the UNIQUE index refuses one and it retries with the next code', async () => {
    const w = world();
    const { id } = await underReview(w);
    await verifyAll(w, id);
    // Another record grabs TTC0001 between our code computation and our claim.
    let raced = false;
    w.db.beforeUpdateMany = (table, where) => {
      if (raced || table !== 'centre_onboarding' || where.stage !== 'under_review') return;
      raced = true;
      w.db.insertCommitted('centre_onboarding', { id: 99, centre_name: 'Rival', contact_name: '', email: '', mobile: '', stage: 'agreement_pending', centre_code: 'TTC0001', deleted_at: null });
    };
    const res = await w.onboarding.approve(ADMIN, id);
    expect(res).toEqual({ status: 1, message: 'Application approved', data: { centreCode: 'TTC0002' } });
  });

  test('concurrent approvals: exactly one wins', async () => {
    const w = world();
    const { id } = await underReview(w);
    await verifyAll(w, id);
    const results = await Promise.all([w.onboarding.approve(ADMIN, id), w.onboarding.approve(2, id)]);
    expect(results.map((r) => r.status).sort()).toEqual([0, 1]);
    expect(w.db.tables.centre_onboarding_events.filter((e) => e.event_type === 'approved')).toHaveLength(1);
  });

  test('Request Changes sends it back to Lead with a NEW link, the remarks emailed and shown on the form', async () => {
    const w = world();
    const { id, token } = await underReview(w);
    await expect(w.onboarding.requestChanges(ADMIN, id, '  ')).resolves.toMatchObject({ status: 0 });
    const res = await w.onboarding.requestChanges(ADMIN, id, 'Upload a clearer PAN card.');
    expect(res.status).toBe(1);
    expect(w.db.tables.centre_onboarding[0]).toMatchObject({ stage: 'lead', remarks: 'Upload a clearer PAN card.', link_expired: false });
    expect(w.emails.at(-1)?.html).toContain('Upload a clearer PAN card.');
    await expect(w.publicForm.open(token)).resolves.toMatchObject({ reason: 'invalid' });
    const fresh = tokenFromLink(res.data?.link ?? '');
    await expect(w.publicForm.open(fresh)).resolves.toMatchObject({ state: 'open', remarks: 'Upload a clearer PAN card.', prefill: { legalEntity: 'Kollam Early Years Trust', pan: 'AABTK1234K' } });
  });

  test('Reject needs a reason; Reopen as Lead clears it and kills the old link', async () => {
    const w = world();
    const { id, token } = await underReview(w);
    await expect(w.onboarding.reject(ADMIN, id, '')).resolves.toEqual({ status: 0, message: 'A reason is required.' });
    await expect(w.onboarding.reject(ADMIN, id, 'Infrastructure does not meet minimum requirements.')).resolves.toEqual({ status: 1, message: 'Rejected' });
    await expect(w.onboarding.reject(ADMIN, id, 'again')).resolves.toMatchObject({ status: 0 });
    await expect(w.onboarding.reopen(ADMIN, id)).resolves.toEqual({ status: 1, message: 'Reopened as lead' });
    expect(w.db.tables.centre_onboarding[0]).toMatchObject({ stage: 'lead', reject_reason: null, link_sent_at: null, link_token_hash: null });
    await expect(w.publicForm.open(token)).resolves.toMatchObject({ reason: 'invalid' });
  });

  test('Edit is refused once onboarded', async () => {
    const w = world();
    const { id } = await atCertificatePending(w);
    await w.affiliation.completeOnboarding(ADMIN, id);
    await expectRefused(w.onboarding.updateLead(ADMIN, id, LEAD), 'already onboarded');
  });
});

describe('signed agreement', () => {
  test('numbers AGR-YYYY-### after the max for the year, expiry = +N years − 1 day, stage → Certificate Pending', async () => {
    const w = world({ centre_agreements: [
      { id: 1, agreement_no: 'AGR-2026-007', centre_id: 5, onboarding_id: null, effective_date: new Date('2026-01-01T00:00:00Z'), expiry_date: new Date('2028-12-31T00:00:00Z'), term_years: 3, file_url: 'x', fee_amount: '0', fee_paid: true, deleted_at: null },
      { id: 2, agreement_no: 'AGR-2025-041', centre_id: 6, onboarding_id: null, effective_date: new Date('2025-01-01T00:00:00Z'), expiry_date: new Date('2026-12-31T00:00:00Z'), term_years: 2, file_url: 'x', fee_amount: '0', fee_paid: true, deleted_at: null },
    ] });
    const { id } = await atCertificatePending(w);
    const a = w.db.tables.centre_agreements.find((r) => r.onboarding_id === id) ?? {};
    expect(a).toMatchObject({ agreement_no: 'AGR-2026-008', term_years: 3, fee_amount: '50000.00', fee_paid: false, ttii_signatory: 'TTII Registrar' });
    expect((a.effective_date as Date).toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect((a.expiry_date as Date).toISOString()).toBe('2029-10-31T00:00:00.000Z');
    expect(w.db.tables.centre_onboarding.find((r) => r.id === id)?.stage).toBe('certificate_pending');
  });

  test('refuses a file that was not uploaded for this centre, a missing fee and a second upload', async () => {
    const w = world();
    const { id } = await underReview(w);
    await verifyAll(w, id);
    await w.onboarding.approve(ADMIN, id);
    const fileUrl = `https://cdn.example/centre-agreements/${id}/0123456789abcdef0123456789abcdef-s.pdf`;
    const base = { id, effective_date: '2026-11-01', term_years: '1', fee_amount: '1000', file_url: fileUrl, file_sig: uploadSignature(SECRET, id, fileUrl) };
    await expect(w.affiliation.uploadAgreement(ADMIN, { ...base, file_url: 'https://evil.example/s.pdf' })).resolves.toEqual({ status: 0, message: 'Upload the signed PDF again.' });
    await expect(w.affiliation.uploadAgreement(ADMIN, { ...base, file_sig: '' })).resolves.toEqual({ status: 0, message: 'Upload the signed PDF again.' });
    await expect(w.affiliation.uploadAgreement(ADMIN, { ...base, fee_amount: '' })).resolves.toEqual({ status: 0, message: 'Affiliation Fee (₹): Required' });
    await expectRefused(w.affiliation.uploadAgreement(ADMIN, { ...base, fee_paid: true }), 'Paid on');
    await expect(w.affiliation.uploadAgreement(ADMIN, base)).resolves.toMatchObject({ status: 1, data: { agreementNo: 'AGR-2026-001' } });
    await expect(w.affiliation.uploadAgreement(ADMIN, base)).resolves.toMatchObject({ status: 0 });
    expect(w.db.tables.centre_agreements).toHaveLength(1);
  });
});

describe('Issue & Complete Onboarding', () => {
  test('creates the centre with the reserved code, its KYC and role-7 login, and links agreement + certificate', async () => {
    const w = world();
    const { id, centreCode } = await atCertificatePending(w);
    const res = await w.affiliation.completeOnboarding(ADMIN, id);
    expect(res).toMatchObject({ status: 1, message: 'Kollam Early Years onboarded — added to Centre Directory', data: { centreCode, certificateNo: 'AFC-2026-001', pdfReady: true, emailDelivered: true } });
    const centre = w.db.tables.centres[0] ?? {};
    expect(centre).toMatchObject({
      centre_id: centreCode, centre_name: 'Kollam Early Years', contact_person: 'Arun S', contact_person_designation: 'Director',
      country_code: '+91', phone: '9746011122', email: 'arun@key.in', state_id: 'Kerala', district_id: 'Kollam',
      date_of_registration: '2026-11-01', date_of_expiry: '2029-10-31', status: 1,
    });
    expect(String(centre.registraion_certificate)).toContain('trust.pdf');
    expect(w.db.tables.centre_kyc[0]).toMatchObject({ centre_id: centre.id, legal_entity_name: 'Kollam Early Years Trust', pan: 'AABTK1234K', gstin: '32AABTK1234K1Z5', bank_ifsc: 'HDFC0001234', pincode: '691001' });
    expect(w.db.tables.users[0]).toMatchObject({ role_id: 7, user_email: 'arun@key.in', centre_id: String(centre.id) });
    expect(w.db.tables.centre_onboarding[0]).toMatchObject({ stage: 'onboarded', centre_id: centre.id });
    expect(w.db.tables.centre_agreements[0]).toMatchObject({ centre_id: centre.id });
    const cert = w.db.tables.centre_affiliation_certificates[0] ?? {};
    expect(cert).toMatchObject({ certificate_no: 'AFC-2026-001', centre_id: centre.id, status: 'valid' });
    expect(String(cert.file_url)).toMatch(/^https:\/\/cdn\.example\/centre-certificates\/AFC-2026-001-[0-9a-f]{32}\.pdf$/);
    expect((cert.valid_to as Date).toISOString()).toBe('2029-10-31T00:00:00.000Z');
    expect(w.credentialEmails).toEqual(['arun@key.in']);
  });

  test('a second Issue (double click / second admin) creates nothing more', async () => {
    const w = world();
    const { id } = await atCertificatePending(w);
    const results = await Promise.all([w.affiliation.completeOnboarding(ADMIN, id), w.affiliation.completeOnboarding(2, id)]);
    expect(results.map((r) => r.status).sort()).toEqual([0, 1]);
    expect(w.db.count('centres')).toBe(1);
    expect(w.db.count('users')).toBe(1);
    expect(w.db.count('centre_affiliation_certificates')).toBe(1);
    expect(w.credentialEmails).toHaveLength(1);
  });

  test('refuses when the email already has an LMS login, and writes nothing', async () => {
    const w = world();
    const { id } = await atCertificatePending(w);
    w.db.tables.users.push({ id: 400, name: 'Arun (student)', user_email: 'arun@key.in', email: null, role_id: 2, deleted_at: null });
    const res = await w.affiliation.completeOnboarding(ADMIN, id);
    await expectRefused(Promise.resolve(res), 'already the email of an LMS login (Arun (student))');
    expect(w.db.count('centres')).toBe(0);
    expect(w.db.tables.centre_onboarding[0]?.stage).toBe('certificate_pending');
  });

  test('a storage failure keeps the centre and the certificate (file_url NULL); Regenerate PDF fixes it', async () => {
    const w = world({}, { storage: 'fail' });
    const { id } = await atCertificatePending(w);
    const res = await w.affiliation.completeOnboarding(ADMIN, id);
    expect(res).toMatchObject({ status: 1, data: { pdfReady: false } });
    expect(w.db.count('centres')).toBe(1);
    const cert = w.db.tables.centre_affiliation_certificates[0] ?? {};
    expect(cert.file_url).toBeNull();
    const regen = new CentreAffiliationService({
      prisma: w.db.prisma, now: () => w.clock.now,
      storage: { name: 'ok', uploadObject: ({ key }: { key: string }) => Promise.resolve({ key, provider: 'ok', location: `https://cdn.example/${key}` }) } as unknown as StorageProvider,
      renderPdf: () => Promise.resolve(Buffer.from('%PDF-1.7')),
    });
    await expect(regen.regenerateCertificatePdf(ADMIN, Number(cert.id))).resolves.toMatchObject({ status: 1, message: 'Certificate PDF generated' });
    expect(String(w.db.tables.centre_affiliation_certificates[0]?.file_url)).toContain('centre-certificates/AFC-2026-001-');
  });

  test('certificate numbers continue after the highest of the year', async () => {
    const w = world({ centre_affiliation_certificates: [{ id: 1, certificate_no: 'AFC-2026-104', centre_id: 9, valid_from: new Date('2026-01-01T00:00:00Z'), valid_to: new Date('2027-12-31T00:00:00Z'), status: 'valid', deleted_at: null }] });
    const { id } = await atCertificatePending(w);
    await expect(w.affiliation.completeOnboarding(ADMIN, id)).resolves.toMatchObject({ data: { certificateNo: 'AFC-2026-105' } });
  });
});

describe('Affiliation & Agreements', () => {
  test('statuses are derived from dates; onboarding rows show the lead name and reserved code', async () => {
    const day = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
    const w = world({
      centres: [{ id: 5, centre_id: 'TTC0005', centre_name: 'Palakkad Centre', email: 'p@x.in', phone: '1', deleted_at: null }],
      centre_onboarding: [{ id: 3, ref_no: 'ONB-003', centre_name: 'Thrissur Teacher Hub', contact_name: 'Meera', email: 'm@x.in', mobile: '', stage: 'certificate_pending', centre_code: 'TTC0009', deleted_at: null }],
      centre_agreements: [
        { id: 1, agreement_no: 'AGR-2026-001', centre_id: 5, onboarding_id: null, effective_date: day('2024-01-01'), expiry_date: day('2026-10-21'), term_years: 3, file_url: 'u', fee_amount: '1', fee_paid: true, deleted_at: null },
        { id: 2, agreement_no: 'AGR-2026-002', centre_id: 5, onboarding_id: null, effective_date: day('2024-01-01'), expiry_date: day('2026-12-21'), term_years: 3, file_url: 'u', fee_amount: '1', fee_paid: true, deleted_at: null },
        { id: 3, agreement_no: 'AGR-2026-003', centre_id: null, onboarding_id: 3, effective_date: day('2026-10-01'), expiry_date: day('2029-09-30'), term_years: 3, file_url: 'u', fee_amount: '40000', fee_paid: false, deleted_at: null },
      ],
      centre_affiliation_certificates: [
        { id: 1, certificate_no: 'AFC-2026-001', centre_id: 5, agreement_id: 1, valid_from: day('2024-01-01'), valid_to: day('2026-10-21'), status: 'valid', deleted_at: null },
        { id: 2, certificate_no: 'AFC-2026-002', centre_id: 5, agreement_id: 2, valid_from: day('2024-01-01'), valid_to: day('2029-01-01'), status: 'revoked', deleted_at: null },
      ],
    });
    const list = await w.affiliation.list();
    expect(list.agreements.map((a) => [a.agreementNo, a.status, a.centreName, a.centreCode, a.inOnboarding])).toEqual([
      ['AGR-2026-001', 'Expired', 'Palakkad Centre', 'TTC0005', false],
      ['AGR-2026-002', 'Pending Renewal', 'Palakkad Centre', 'TTC0005', false],
      ['AGR-2026-003', 'Active', 'Thrissur Teacher Hub', 'TTC0009', true],
    ]);
    expect(list.certificates.map((c) => [c.certificateNo, c.status, c.agreementNo])).toEqual([['AFC-2026-001', 'Expired', 'AGR-2026-001'], ['AFC-2026-002', 'Revoked', 'AGR-2026-002']]);
  });

  test('Mark Fee Paid is claim-first: the second click is refused; future dates are refused', async () => {
    const w = world({ centre_agreements: [{ id: 7, agreement_no: 'AGR-2026-007', centre_id: 5, onboarding_id: null, effective_date: new Date('2026-01-01T00:00:00Z'), expiry_date: new Date('2028-12-31T00:00:00Z'), term_years: 3, file_url: 'u', fee_amount: '40000', fee_paid: false, fee_paid_on: null, deleted_at: null }] });
    await expect(w.affiliation.markFeePaid(ADMIN, 7, '2026-10-23')).resolves.toEqual({ status: 0, message: 'Paid on cannot be in the future' });
    const both = await Promise.all([w.affiliation.markFeePaid(ADMIN, 7, '2026-10-20'), w.affiliation.markFeePaid(2, 7, '2026-10-21')]);
    expect(both.map((r) => r.status).sort()).toEqual([0, 1]);
    expect(both.find((r) => r.status === 0)?.message).toBe('This affiliation fee is already marked paid.');
    expect((w.db.tables.centre_agreements[0]?.fee_paid_on as Date).toISOString()).toBe('2026-10-20T00:00:00.000Z');
  });
});
