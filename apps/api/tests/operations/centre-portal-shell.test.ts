import { describe, expect, test, vi } from 'vitest';

import { CentrePortalDashboardService, recentPayments } from '../../src/operations/centre-portal-dashboard-service.js';
import {
  affiliationSummary, buildDocumentRows, cohortPhase, countByMonth, courseBreakdown, isCentreUploadUrl, previousMonth,
  thisAndLastMonth,
} from '../../src/operations/centre-portal-model.js';
import { CentrePortalProfileService } from '../../src/operations/centre-portal-profile-service.js';
import { NOT_SET_UP_MESSAGE } from '../../src/operations/centre-profile-model.js';
import { trendMonths } from '../../src/operations/centre-dashboard-model.js';
import { memoryPrisma } from './support/memory-prisma.js';

// Centre portal v2 (Naji 2026-10-22): the centre's OWN shell, dashboard and
// profile. A centre only ever sees its own rows (users.centre_id), money and
// KYC are Centre-login (role 7) only, and nothing is invented.

const NOW = new Date('2026-10-22T06:00:00Z'); // 11:30 IST, 22 Oct 2026
const d = (iso: string) => new Date(iso);
const day = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
const UPLOAD = 'https://ttii.blr1.digitaloceanspaces.com/public/uploads/1761112345678-ab12cd.pdf';

describe('centre-portal-model', () => {
  test('affiliation expiry is the later of the legacy date and the agreements', () => {
    expect(affiliationSummary('2026-11-30', ['2027-03-31', '2025-01-01'], '2026-10-22')).toEqual({ expiry: '2027-03-31', daysLeft: 160, state: 'valid' });
    expect(affiliationSummary('2026-12-01', [], '2026-10-22')).toEqual({ expiry: '2026-12-01', daysLeft: 40, state: 'due_soon' });
    expect(affiliationSummary('', ['2026-10-21'], '2026-10-22')).toEqual({ expiry: '2026-10-21', daysLeft: -1, state: 'expired' });
    expect(affiliationSummary('', [], '2026-10-22')).toEqual({ expiry: '', daysLeft: null, state: 'not_set' });
  });

  test('cohort phase, IST months and month-over-month counts', () => {
    expect(cohortPhase('2026-11-01', '2027-05-01', '2026-10-22')).toBe('upcoming');
    expect(cohortPhase('2026-01-01', '2026-10-21', '2026-10-22')).toBe('completed');
    expect(cohortPhase('2026-01-01', '2026-10-22', '2026-10-22')).toBe('running');
    expect(cohortPhase('', '', '2026-10-22')).toBe('running');
    expect(previousMonth('2026-01')).toBe('2025-12');
    const months = trendMonths(NOW, 3);
    // 30 Sep 19:00 UTC is already 1 Oct in IST.
    expect(countByMonth([d('2026-09-30T19:00:00Z'), d('2026-08-10T05:00:00Z'), null, d('2025-10-01T05:00:00Z')], months)).toEqual([1, 0, 1]);
    expect(thisAndLastMonth([d('2026-10-01T00:00:00Z'), d('2026-09-15T00:00:00Z'), d('2026-09-30T19:00:00Z')], NOW)).toEqual({ thisMonth: 2, lastMonth: 1 });
  });

  test('course breakdown counts applications and (student, course) enrolments, busiest first', () => {
    const titles = new Map([[1, { title: 'DMTT', shortName: 'DMTT' }], [2, { title: 'DPTT', shortName: '' }]]);
    const out = courseBreakdown({
      applicationCourseIds: [1, 1, 2, null],
      students: [{ id: 10, course_id: 1 }, { id: 11, course_id: 2 }, { id: 12, course_id: null }],
      // Student 10 is enrolled in 1 and 2 (twice in 2); 11 has no enrol rows → users.course_id; 99 is not a centre student.
      enrolments: [{ user_id: 10, course_id: 1 }, { user_id: 10, course_id: 2 }, { user_id: 10, course_id: 2 }, { user_id: 99, course_id: 1 }],
      titles,
    });
    expect(out).toEqual([
      { courseId: 1, title: 'DMTT', shortName: 'DMTT', applications: 2, enrolments: 1 },
      { courseId: 2, title: 'DPTT', shortName: '', applications: 1, enrolments: 2 },
    ]);
  });

  test('only /centre/upload files can be filed as documents', () => {
    expect(isCentreUploadUrl(UPLOAD)).toBe(true);
    expect(isCentreUploadUrl('file:///srv/storage/public/uploads/1761112345678-x1.png')).toBe(true);
    expect(isCentreUploadUrl('https://evil.example/phish.html')).toBe(false);
    expect(isCentreUploadUrl('javascript:alert(1)//public/uploads/1761112345678-ab.pdf')).toBe(false);
    expect(isCentreUploadUrl('https://x.example/public/uploads/1761112345678-ab.exe')).toBe(false);
    expect(isCentreUploadUrl(`${UPLOAD} `)).toBe(false);
    expect(isCentreUploadUrl('')).toBe(false);
  });

  test('document rows: TTII records first, then the newest centre upload of that type; agreement never uploadable', () => {
    const rows = buildDocumentRows({
      registrationDoc: 'https://cdn.example/public/reg.pdf',
      idDoc: '',
      panDoc: '',
      legacyAffiliationDoc: 'https://cdn.example/public/aff-old.pdf',
      uploaded: [
        { id: 9, title: 'PAN new', docType: 'PAN Card', url: UPLOAD, date: '2026-10-20' },
        { id: 8, title: 'PAN old', docType: 'PAN Card', url: UPLOAD, date: '2026-10-01' },
        { id: 7, title: 'Lease', docType: 'Other Document', url: UPLOAD, date: '2026-09-01' },
      ],
      agreements: [{ id: 2, agreementNo: 'AGR-2026-002', url: 'https://cdn.example/agr2.pdf', date: '2026-04-01' }, { id: 1, agreementNo: 'AGR-2023-001', url: '', date: '2023-04-01' }],
      certificates: [{ id: 5, certificateNo: 'AFC-2026-005', url: '', date: '2026-04-01' }],
    });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.registration).toMatchObject({ onFile: true, uploadable: false, name: 'reg.pdf', source: 'centre' });
    expect(byKey.id).toMatchObject({ onFile: false, uploadable: true });
    expect(byKey.pan).toMatchObject({ onFile: true, uploadable: true, name: 'PAN new', date: '2026-10-20' });
    expect(byKey.gst).toMatchObject({ onFile: false, uploadable: true });
    expect(byKey.agreement).toMatchObject({ name: 'Agreement AGR-2026-002', onFile: true, uploadable: false });
    expect(byKey['agr-1']).toMatchObject({ onFile: false });
    expect(byKey['legacy-affiliation']).toMatchObject({ onFile: true });
    expect(byKey['cert-5']).toMatchObject({ onFile: false });
    // The older PAN upload and the lease are extra rows; the newest PAN is not repeated.
    expect(rows.filter((r) => r.key.startsWith('doc-')).map((r) => r.key)).toEqual(['doc-8', 'doc-7']);
  });

  test('recent payments: paid student_payments rows with a paid date only, newest first', () => {
    const out = recentPayments([
      { id: 1, computed_status: 'paid', paid_date: day('2026-10-01'), amount: '1,500', user_name: 'Asha', student_id: 'TTS1', course_title: 'DMTT', payment_mode: 'UPI', installment_details: 'Instalment 1' },
      { id: 2, computed_status: 'paid', paid_date: day('2026-10-10'), amount: 2500, user_name: 'Binu', student_id: 'TTS2', course_title: 'DMTT', payment_mode: null, installment_details: null },
      { id: 3, computed_status: 'overdue', paid_date: null, amount: 900 },
      { id: 'app-4-0', computed_status: 'paid', paid_date: null, amount: 1000 },
      { id: 5, computed_status: 'paid', paid_date: null, amount: 700 },
    ]);
    expect(out).toEqual([
      { id: 2, studentName: 'Binu', studentCode: 'TTS2', course: 'DMTT', amount: 2500, mode: '', paidOn: '2026-10-10', label: '' },
      { id: 1, studentName: 'Asha', studentCode: 'TTS1', course: 'DMTT', amount: 1500, mode: 'UPI', paidOn: '2026-10-01', label: 'Instalment 1' },
    ]);
  });
});

// Two centres: 28 (the caller's) and 29 (someone else's). Everything of 29 must stay invisible.
function seed() {
  return {
    users: [
      { id: 700, role_id: 7, name: 'Junaid KB', centre_id: '28', deleted_at: null },
      { id: 701, role_id: 10, name: 'Asso Ciate', centre_id: '28', deleted_at: null },
      { id: 702, role_id: 7, name: 'Orphan', centre_id: '', deleted_at: null },
      { id: 703, role_id: 7, name: 'Other centre', centre_id: '29', deleted_at: null },
      { id: 10, role_id: 2, name: 'Asha', student_id: 'TTS10', course_id: 1, application_id: 101, added_under_centre: 28, created_at: d('2026-10-05T05:00:00Z'), status: 1, disabled_at: null, deleted_at: null },
      { id: 11, role_id: 2, name: 'Binu', student_id: 'TTS11', course_id: 2, application_id: 0, added_under_centre: 28, created_at: d('2026-09-12T05:00:00Z'), status: 3, disabled_at: null, deleted_at: null },
      { id: 12, role_id: 2, name: 'Other', student_id: 'TTS12', course_id: 1, application_id: 0, added_under_centre: 29, created_at: d('2026-10-06T05:00:00Z'), status: 1, disabled_at: null, deleted_at: null },
    ],
    centres: [
      { id: 28, centre_id: 'TTC028', centre_name: 'upCarrera Education', contact_person: 'Junaid KB', contact_person_designation: 'Director', wallet_balance: '3,201.50', date_of_expiry: '2026-11-30', status: 1, address: 'Mavoor Road', country_id: 'India', state_id: 'Kerala', district_id: 'Kozhikode', country_code: '+91', phone: '9526389878', email: 'ops@upcarrera.in', date_of_registration: '2025-04-01', registraion_certificate: 'https://cdn.example/public/reg.pdf', affiliation_document: '', deleted_at: null },
      { id: 29, centre_id: 'TTC029', centre_name: 'Other Centre', contact_person: 'X', contact_person_designation: '', wallet_balance: '99999', date_of_expiry: '2030-01-01', status: 1, deleted_at: null },
    ],
    applications: [
      { id: 101, application_id: 'APP-101', name: 'Asha', added_under_centre: 28, course_id: 1, stage: 'enrolled', status: 'converted', is_converted: 1, student_id: 10, created_at: d('2026-10-02T05:00:00Z'), deleted_at: null },
      { id: 102, application_id: 'APP-102', name: 'Chitra', added_under_centre: 28, course_id: 1, stage: 'approval_waiting', status: 'pending', is_converted: 0, student_id: null, created_at: d('2026-10-10T05:00:00Z'), deleted_at: null },
      { id: 103, application_id: '', name: 'Devi', added_under_centre: 28, course_id: 2, stage: 'lead', status: 'rejected', is_converted: 0, student_id: null, created_at: d('2026-09-20T05:00:00Z'), deleted_at: null },
      { id: 104, application_id: 'APP-104', name: 'Gone', added_under_centre: 28, course_id: 1, stage: 'lead', status: 'pending', is_converted: 0, student_id: null, created_at: d('2026-10-11T05:00:00Z'), deleted_at: d('2026-10-12T05:00:00Z') },
      { id: 201, application_id: 'APP-201', name: 'Not mine', added_under_centre: 29, course_id: 1, stage: 'lead', status: 'pending', is_converted: 0, student_id: null, created_at: d('2026-10-15T05:00:00Z'), deleted_at: null },
    ],
    cohorts: [
      { id: 1, centre_id: 28, start_date: day('2026-01-10'), end_date: day('2026-12-20'), deleted_at: null },
      { id: 2, centre_id: 28, start_date: day('2026-11-15'), end_date: day('2027-05-15'), deleted_at: null },
      { id: 3, centre_id: 28, start_date: day('2025-06-01'), end_date: day('2026-03-01'), deleted_at: null },
      { id: 4, centre_id: 29, start_date: day('2026-01-10'), end_date: day('2026-12-20'), deleted_at: null },
    ],
    enrol: [
      { id: 1, user_id: 10, course_id: 1, deleted_at: null },
      { id: 2, user_id: 12, course_id: 1, deleted_at: null },
    ],
    course: [{ id: 1, title: 'Diploma in Montessori Teachers Training', short_name: 'DMTT' }, { id: 2, title: 'Diploma in Professional Teacher Training', short_name: 'DPTT' }],
    centre_fund_requests: [
      { id: 1, centre_id: 28, status: 'pending', deleted_at: null },
      { id: 2, centre_id: 28, status: 'approved', deleted_at: null },
      { id: 3, centre_id: 29, status: 'pending', deleted_at: null },
    ],
    wallet_transactions: [
      { id: 1, centre_id: 28, transaction_type: 'credit', amount: '5,000', remarks: 'Fund request approved #2', created_at: d('2026-10-01T05:00:00Z'), deleted_at: null },
      { id: 2, centre_id: 28, transaction_type: 'Debit', amount: '1798.5', remarks: 'Fee', created_at: d('2026-10-03T05:00:00Z'), deleted_at: null },
      { id: 3, centre_id: 29, transaction_type: 'credit', amount: '99999', remarks: 'Other', created_at: d('2026-10-04T05:00:00Z'), deleted_at: null },
    ],
    centre_agreements: [
      { id: 1, agreement_no: 'AGR-2026-001', centre_id: 28, onboarding_id: null, effective_date: day('2024-04-01'), term_years: 3, expiry_date: day('2027-03-31'), signed_on: day('2024-03-30'), ttii_signatory: 'Registrar', centre_signatory: 'Junaid', file_url: 'https://cdn.example/agr1.pdf', fee_amount: 50000, fee_paid: true, fee_paid_on: day('2024-04-02'), notes: 'internal note', created_at: d('2024-04-01T05:00:00Z'), deleted_at: null },
      { id: 2, agreement_no: 'AGR-2026-009', centre_id: 29, onboarding_id: null, effective_date: day('2026-01-01'), term_years: 5, expiry_date: day('2030-12-31'), signed_on: null, ttii_signatory: null, centre_signatory: null, file_url: 'https://cdn.example/agr9.pdf', fee_amount: 1, fee_paid: false, fee_paid_on: null, notes: null, created_at: null, deleted_at: null },
    ],
    centre_affiliation_certificates: [
      { id: 1, certificate_no: 'AFC-2026-001', centre_id: 28, agreement_id: 1, onboarding_id: null, valid_from: day('2024-04-01'), valid_to: day('2027-03-31'), file_url: null, status: 'valid', created_at: null, deleted_at: null },
      { id: 2, certificate_no: 'AFC-2026-009', centre_id: 29, agreement_id: 2, onboarding_id: null, valid_from: day('2026-01-01'), valid_to: day('2030-12-31'), file_url: null, status: 'valid', created_at: null, deleted_at: null },
    ],
    centre_kyc: [
      { centre_id: 28, legal_entity_name: 'upCarrera Pvt Ltd', entity_type: 'Private Limited', city: 'Kozhikode', pincode: '673004', gstin: '32AAACU5678L1Z8', pan: 'AAACU5678L', id_number: '112233445566', id_doc: '', pan_doc: 'https://cdn.example/public/pan.pdf', bank_account_name: 'upCarrera', bank_account_number: '3029012345678', bank_ifsc: 'SBIN0001234', bank_name: 'SBI', bank_branch: 'Kozhikode' },
      { centre_id: 29, legal_entity_name: 'Other Pvt Ltd', bank_account_number: '999999999999' },
    ],
    centre_documents: [
      { id: 1, centre_id: 28, title: 'GST certificate', doc_type: 'GST Registration', file_url: UPLOAD, created_at: d('2026-10-05T05:00:00Z'), deleted_at: null },
      { id: 2, centre_id: 29, title: 'Their lease', doc_type: 'Other Document', file_url: UPLOAD, created_at: d('2026-10-05T05:00:00Z'), deleted_at: null },
    ],
  };
}

const PAYMENT_STATUS = {
  installments: [
    // Asha (users.id 10), enrolled: one paid, one due.
    { id: 501, user_id: 10, course_id: 1, amount: 10000, computed_status: 'paid', paid_date: day('2026-10-06'), user_name: 'Asha', student_id: 'TTS10', course_title: 'DMTT', payment_mode: 'UPI', installment_details: 'Registration' },
    { id: 502, user_id: 10, course_id: 1, amount: 15000, computed_status: 'due', paid_date: null, user_name: 'Asha', student_id: 'TTS10', course_title: 'DMTT' },
    // Chitra's application plan (pre-enrolment): registration settled.
    { id: 'app-102-0', user_id: null, course_id: 1, amount: 5000, computed_status: 'paid', paid_date: null },
    { id: 'app-102-1', user_id: null, course_id: 1, amount: 20000, computed_status: 'upcoming', paid_date: null },
  ],
};

function dashboardService(missing: string[] = []) {
  const db = memoryPrisma(seed());
  for (const t of missing) db.missing.add(t);
  const loadPaymentStatus = vi.fn().mockResolvedValue(PAYMENT_STATUS);
  return { service: new CentrePortalDashboardService({ prisma: db.prisma, loadPaymentStatus }), loadPaymentStatus };
}

describe('CentrePortalDashboardService', () => {
  test('shell: own centre, wallet and the later affiliation expiry for the Centre login', async () => {
    const { service } = dashboardService();
    expect(await service.shell({ userId: 700, roleId: 7 }, NOW)).toEqual({
      centre: { id: 28, code: 'TTC028', name: 'upCarrera Education', contactPerson: 'Junaid KB', designation: 'Director' },
      userName: 'Junaid KB',
      wallet: { balance: 3201.5 },
      affiliation: { expiry: '2027-03-31', daysLeft: 160, state: 'valid' },
    });
  });

  test('shell: an Associate gets no money or affiliation; no linked centre gives nothing', async () => {
    const { service } = dashboardService();
    expect(await service.shell({ userId: 701, roleId: 10 }, NOW)).toMatchObject({ centre: { id: 28 }, wallet: null, affiliation: null });
    expect(await service.shell({ userId: 702, roleId: 7 }, NOW)).toEqual({ centre: null, userName: 'Orphan', wallet: null, affiliation: null });
  });

  test('shell: before the agreements migration the legacy expiry stands', async () => {
    const { service } = dashboardService(['centre_agreements']);
    expect((await service.shell({ userId: 700, roleId: 7 }, NOW)).affiliation).toEqual({ expiry: '2026-11-30', daysLeft: 39, state: 'due_soon' });
  });

  test('dashboard: KPIs, trend and courses from the caller\'s centre only', async () => {
    const { service, loadPaymentStatus } = dashboardService();
    const out = await service.dashboard({ userId: 700, roleId: 7 }, NOW);
    expect(out.kpis).toEqual({
      applications: 3, // 104 is deleted, 201 is centre 29's
      applicationsThisMonth: 2,
      applicationsLastMonth: 1,
      inProgress: 1, // 102
      awaitingApproval: 1,
      converted: 1,
      conversion: 33,
      students: 2,
      studentsThisMonth: 1,
      studentsLastMonth: 1,
      activeStudents: 1, // Binu is dropped (status 3)
      runningCohorts: 1,
      upcomingCohorts: 1,
    });
    expect(out.trend.map((t) => [t.month, t.applications, t.enrolments])).toEqual([
      ['2026-05', 0, 0], ['2026-06', 0, 0], ['2026-07', 0, 0], ['2026-08', 0, 0], ['2026-09', 1, 1], ['2026-10', 2, 1],
    ]);
    expect(out.courses.map((c) => [c.courseId, c.applications, c.enrolments])).toEqual([[1, 2, 1], [2, 1, 1]]);
    expect(out.recentApplications.map((a) => [a.applicationId, a.stage])).toEqual([['APP-102', 'approval_waiting'], ['APP-101', 'enrolled'], ['#103', 'rejected']]);
    // Payment Status is asked about this centre's students and applications only.
    expect(loadPaymentStatus).toHaveBeenCalledWith({ userIds: [10, 11], applicationIds: [102, 101, 103] });
    expect(out.money).toEqual({
      walletBalance: 3201.5,
      pendingTopUps: 1,
      feesScheduled: 50000,
      feesPaid: 15000,
      feesBalance: 35000,
      withBalance: 2,
      recentPayments: [{ id: 501, studentName: 'Asha', studentCode: 'TTS10', course: 'DMTT', amount: 10000, mode: 'UPI', paidOn: '2026-10-06', label: 'Registration' }],
      recentWallet: [
        { id: 2, type: 'debit', amount: 1798.5, remarks: 'Fee', date: '2026-10-03' },
        { id: 1, type: 'credit', amount: 5000, remarks: 'Fund request approved #2', date: '2026-10-01' },
      ],
    });
    expect(JSON.stringify(out)).not.toContain('Not mine');
    expect(JSON.stringify(out)).not.toContain('99999');
  });

  test('dashboard: an Associate gets no money and Payment Status is never read', async () => {
    const { service, loadPaymentStatus } = dashboardService();
    const out = await service.dashboard({ userId: 701, roleId: 10 }, NOW);
    expect(out.money).toBeNull();
    expect(out.kpis.applications).toBe(3);
    expect(loadPaymentStatus).not.toHaveBeenCalled();
  });

  test('dashboard: a login with no centre sees an empty dashboard, not another centre', async () => {
    const { service, loadPaymentStatus } = dashboardService();
    const out = await service.dashboard({ userId: 702, roleId: 7 }, NOW);
    expect(out.centre).toBeNull();
    expect(out.kpis.applications).toBe(0);
    expect(out.trend).toHaveLength(6);
    expect(out.money).toBeNull();
    expect(loadPaymentStatus).not.toHaveBeenCalled();
  });
});

function profileService(missing: string[] = []) {
  const db = memoryPrisma(seed());
  for (const t of missing) db.missing.add(t);
  return { db, service: new CentrePortalProfileService({ prisma: db.prisma, now: () => NOW }) };
}

describe('CentrePortalProfileService', () => {
  test('the Centre login reads its own centre, KYC, affiliation and documents', async () => {
    const { service } = profileService();
    const out = await service.profile({ userId: 700, roleId: 7 });
    expect(out.status).toBe(1);
    const data = out.data!;
    expect(data.kycReady).toBe(true);
    expect(data.centre).toMatchObject({ id: 28, code: 'TTC028', name: 'upCarrera Education', state: 'Kerala', district: 'Kozhikode', registrationDate: '2025-04-01' });
    expect(data.kyc).toMatchObject({ legalEntityName: 'upCarrera Pvt Ltd', bankAccountNumber: '3029012345678', idNumber: '112233445566' });
    expect(data.affiliation).toMatchObject({ expiry: '2027-03-31', daysLeft: 160, state: 'valid' });
    expect(data.affiliation.agreements).toHaveLength(1);
    expect(data.affiliation.agreements[0]).toMatchObject({ agreementNo: 'AGR-2026-001', status: 'Active', expiryDate: '2027-03-31' });
    // Admin-only agreement fields never reach the centre.
    expect(data.affiliation.agreements[0]).not.toHaveProperty('notes');
    expect(data.affiliation.agreements[0]).not.toHaveProperty('feeAmount');
    expect(data.affiliation.certificates.map((c) => c.certificateNo)).toEqual(['AFC-2026-001']);
    const docs = Object.fromEntries(data.documents.map((r) => [r.key, r]));
    expect(docs.registration?.onFile).toBe(true);
    expect(docs.pan?.onFile).toBe(true);
    expect(docs.gst).toMatchObject({ onFile: true, name: 'GST certificate' });
    expect(docs.bank?.onFile).toBe(false);
    const text = JSON.stringify(data);
    for (const leak of ['Other Pvt Ltd', '999999999999', 'AGR-2026-009', 'AFC-2026-009', 'Their lease', 'internal note']) expect(text).not.toContain(leak);
  });

  test('an Associate is refused and reads nothing', async () => {
    const { service } = profileService();
    expect(await service.profile({ userId: 701, roleId: 10 })).toEqual({ status: 0, message: 'Only the centre login can open the centre profile.' });
    expect(await service.addDocument({ userId: 701, roleId: 10 }, { doc_type: 'PAN Card', file_url: UPLOAD })).toMatchObject({ status: 0 });
  });

  test('no linked centre is a clear refusal', async () => {
    const { service } = profileService();
    expect((await service.profile({ userId: 702, roleId: 7 })).message).toContain('No centre is linked');
  });

  test('before the 2026-10-22 migration the profile still opens without KYC', async () => {
    const { service } = profileService(['centre_kyc', 'centre_agreements', 'centre_affiliation_certificates', 'centre_documents']);
    const out = await service.profile({ userId: 700, roleId: 7 });
    expect(out.status).toBe(1);
    expect(out.data?.kycReady).toBe(false);
    expect(out.data?.kyc).toBeNull();
    expect(out.data?.affiliation).toMatchObject({ expiry: '2026-11-30', agreements: [], certificates: [] });
  });

  test('addDocument files the upload under the caller\'s own centre, whatever the payload says', async () => {
    const { db, service } = profileService();
    const out = await service.addDocument({ userId: 700, roleId: 7 }, { doc_type: 'PAN Card', title: 'PAN', file_url: UPLOAD, centre_id: 29 });
    expect(out).toMatchObject({ status: 1, message: 'Document uploaded' });
    const rows = (db.tables as unknown as Record<string, Array<Record<string, unknown>>>).centre_documents ?? [];
    expect(rows.at(-1)).toMatchObject({ centre_id: 28, title: 'PAN', doc_type: 'PAN Card', file_url: UPLOAD, created_by: 700 });
  });

  test('addDocument refuses unknown types, outside links and long names', async () => {
    const { service } = profileService();
    const actor = { userId: 700, roleId: 7 };
    expect((await service.addDocument(actor, { doc_type: 'Passport photo', file_url: UPLOAD })).status).toBe(0);
    expect((await service.addDocument(actor, { doc_type: 'PAN Card', file_url: 'https://evil.example/x.pdf' })).message).toContain('Upload the file again');
    expect((await service.addDocument(actor, { doc_type: 'PAN Card', file_url: UPLOAD, title: 'x'.repeat(251) })).status).toBe(0);
    expect((await service.addDocument({ userId: 702, roleId: 7 }, { doc_type: 'PAN Card', file_url: UPLOAD })).message).toContain('No centre is linked');
  });

  test('addDocument before the migration explains why', async () => {
    const { service } = profileService(['centre_documents']);
    expect(await service.addDocument({ userId: 700, roleId: 7 }, { doc_type: 'PAN Card', file_url: UPLOAD })).toEqual({ status: 0, message: NOT_SET_UP_MESSAGE });
  });
});
