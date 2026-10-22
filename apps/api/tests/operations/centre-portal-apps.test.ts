import Fastify from 'fastify';
import { describe, expect, test, vi } from 'vitest';

import {
  CENTRE_VISIBLE_EVENTS, centreAppState, checkAddApplication, combinationsForOffering, coursePlanStatus, enrolmentStatusOf,
  feeTotalsByUser, offeringOpenOn, planStatusOn, plainText, timelineOf,
} from '../../src/operations/centre-portal-apps-model.js';
import { CentrePortalAppsService, type CentrePortalAppsOps } from '../../src/operations/centre-portal-apps-service.js';
import { OperationsService } from '../../src/operations/operations-service.js';
import { registerOperationsRoutes } from '../../src/routes/operations.js';
import { registerCentrePortalAppsRoutes } from '../../src/routes/centre-portal-apps-routes.js';
import { memoryPrisma } from './support/memory-prisma.js';

// Centre portal v2 (Naji 2026-10-22): Applications / Students / Courses & Fees.
// Every read and write is scoped to the caller's own centre, Add Application
// only accepts a course assigned to the centre and an offering / combination
// of that course, and Courses & Fees is Centre (role 7) only.

const NOW = new Date('2026-10-22T06:30:00Z'); // 12:00 IST
const d = (ymd: string) => new Date(`${ymd}T00:00:00Z`); // a @db.Date value
type Row = Record<string, unknown>;

function seed(): Record<string, Row[]> {
  return {
    users: [
      { id: 501, role_id: 7, centre_id: '28', name: 'upCarrera Education', deleted_at: null },
      { id: 502, role_id: 7, centre_id: '30', name: 'Hanahadhi', deleted_at: null },
      { id: 503, role_id: 10, centre_id: '28', name: 'Associate A', deleted_at: null },
      { id: 504, role_id: 7, centre_id: '28', name: 'Second centre login', deleted_at: null },
      { id: 1, role_id: 1, centre_id: null, name: 'TTII Admin', deleted_at: null },
      { id: 900, role_id: 2, added_under_centre: 28, student_id: 'TTS0101', name: 'Amina C', application_id: 2, course_id: 16, country_code: '+91', phone: '9000000001', user_email: 'amina@example.com', gender: 'Female', dob: d('2001-03-14'), place: 'Kozhikode', pin_code: '673004', disabled_at: null, created_at: new Date('2026-09-01T20:00:00Z'), image: '', profile_picture: 'uploads/amina.jpg', deleted_at: null },
      { id: 950, role_id: 2, added_under_centre: 30, student_id: 'TTS0150', name: 'Other centre student', application_id: 0, deleted_at: null },
    ],
    course: [
      { id: 16, title: 'Diploma in Montessori', status: 'active', short_name: 'DMTT', course_code: 'TTII-101', duration: '12 months', category_id: 4, short_description: '<p>Learn <b>Montessori</b> &amp; more</p>', description: '', level: 'Diploma', language: 'English', deleted_at: null },
      { id: 18, title: 'PG Diploma', status: 'active', short_name: 'PGD', course_code: '', duration: '18 months', category_id: null, deleted_at: null },
      { id: 20, title: 'Advanced AI Educator', status: 'active', short_name: 'CAIE', deleted_at: null },
    ],
    category: [{ id: 4, name: 'Diploma' }],
    centre_course_plans: [
      { id: 1, centre_id: 28, course_id: 16, assigned_amount: '3,201', start_date: d('2026-01-01'), end_date: d('2026-12-31'), deleted_at: null },
      { id: 2, centre_id: 28, course_id: 18, assigned_amount: '45000', start_date: d('2025-01-01'), end_date: d('2025-12-31'), deleted_at: null },
      { id: 3, centre_id: 30, course_id: 20, assigned_amount: '9999', start_date: null, end_date: null, deleted_at: null },
    ],
    offerings: [
      { id: 61, course_id: 16, title: 'DMTT Jan 2027', offering_code: 'OFF-61', delivery_mode: 'cohort', status: 'active', start_date: d('2027-01-10'), end_date: d('2027-12-20'), enrollment_end: d('2026-12-31'), max_enrollment: 60, deleted_at: null },
      { id: 62, course_id: 16, title: 'DMTT Draft', status: 'draft', enrollment_end: null, deleted_at: null },
      { id: 63, course_id: 16, title: 'DMTT closed', status: 'active', enrollment_end: d('2026-10-21'), deleted_at: null },
      { id: 64, course_id: 16, title: 'DMTT no packages', status: 'active', enrollment_end: null, deleted_at: null },
      { id: 71, course_id: 18, title: 'PGD Mar 2027', status: 'active', enrollment_end: null, deleted_at: null },
      { id: 81, course_id: 20, title: 'CAIE Nov', status: 'active', enrollment_end: null, deleted_at: null },
    ],
    certificate_combinations: [
      { id: 3, course_id: 16, combination_code: 'TTII', status: 'active', deleted_at: null },
      { id: 4, course_id: 16, combination_code: 'TTII + MSU', status: 'active', deleted_at: null },
      { id: 5, course_id: 16, combination_code: 'TTII + KHDA', status: 'inactive', deleted_at: null },
      { id: 9, course_id: 20, combination_code: 'TTII + AGI', status: 'active', deleted_at: null },
    ],
    offering_certificate_packages: [
      { id: 1, offering_id: 61, combination_id: 4, deleted_at: null },
      { id: 2, offering_id: 61, combination_id: 5, deleted_at: null },
    ],
    certificate_combination_partners: [{ combination_id: 4, partner_id: 1 }, { combination_id: 4, partner_id: 2 }],
    certification_partners: [
      { id: 1, name: 'Teachers Training Institute of India', short_name: 'TTII', position: 0, deleted_at: null },
      { id: 2, name: 'Manonmaniam Sundaranar University', short_name: 'MSU', position: 1, deleted_at: null },
    ],
    applications: [
      { id: 1, application_id: 'APP-1', name: 'Lead Person', country_code: '+91', phone: '9000000009', email: '+919000000009', user_email: 'lead@example.com', course_id: 16, offering_id: 61, certificate_combination_id: 4, stage: 'lead', status: 'pending', is_converted: 0, student_id: null, added_under_centre: 28, created_by: 501, created_at: new Date('2026-10-01T20:00:00Z'), deleted_at: null },
      { id: 2, application_id: 'APP-2', name: 'Amina C', country_code: '+91', phone: '9000000001', user_email: 'amina@example.com', course_id: 16, offering_id: 61, certificate_combination_id: 3, stage: 'lead', status: 'converted', is_converted: 1, student_id: 900, added_under_centre: 28, created_by: 501, created_at: new Date('2026-08-30T05:00:00Z'), deleted_at: null },
      { id: 3, application_id: 'APP-3', name: 'Rejected One', phone: '9000000003', user_email: '', course_id: 16, stage: 'rejected', status: 'rejected', is_converted: 0, rejection_reason: 'Duplicate', rejected_by: 1, added_under_centre: 28, created_by: 501, created_at: new Date('2026-10-05T05:00:00Z'), deleted_at: null },
      { id: 4, application_id: 'APP-4', name: 'Other Centre', phone: '9000000004', user_email: 'other@example.com', course_id: 20, stage: 'lead', status: 'pending', is_converted: 0, added_under_centre: 30, created_by: 502, created_at: new Date('2026-10-06T05:00:00Z'), deleted_at: null },
      { id: 5, application_id: 'APP-5', name: 'Deleted', phone: '9000000005', user_email: '', stage: 'lead', status: 'pending', is_converted: 0, added_under_centre: 28, created_by: 501, created_at: new Date('2026-10-07T05:00:00Z'), deleted_at: new Date() },
    ],
    application_events: [
      { id: 1, application_id: 2, event_type: 'converted', description: 'Lead converted to enrolled student', created_at: new Date('2026-09-01T20:00:00Z') },
      { id: 2, application_id: 2, event_type: 'student_payment_reconcile', description: 'Finance, please check: x', created_at: new Date('2026-09-02T05:00:00Z') },
    ],
    enrol: [{ id: 1, user_id: 900, course_id: 16, enrollment_id: 'ENR-1', enrollment_date: '2026-09-02', enrollment_status: 'On hold', mode_of_study: 'Online', created_at: new Date('2026-09-01T20:00:00Z'), deleted_at: null }],
    cohort_students: [{ id: 1, user_id: 900, cohort_id: '75', deleted_at: null }],
    cohorts: [{ id: 75, cohort_id: 'MMJUL26', title: 'July batch', course_id: 16, instructor_id: 1, start_date: d('2026-07-01'), end_date: d('2027-06-30'), deleted_at: null }],
  };
}

const PLAN_ROWS = [
  { id: 'app-1-0', user_id: null, course_id: 16, amount: 5000, computed_status: 'paid' },
  { id: 'app-1-1', user_id: null, course_id: 16, amount: 10000, computed_status: 'upcoming' },
  { id: 11, user_id: 900, course_id: 16, amount: 20000, computed_status: 'paid', installment_details: 'Registration', due_date: d('2026-09-01'), paid_date: d('2026-09-01'), payment_mode: 'UPI', course_title: 'Diploma in Montessori' },
  { id: 12, user_id: 900, course_id: 16, amount: 15000, computed_status: 'overdue', installment_details: 'Instalment 1', due_date: d('2026-10-01'), paid_date: null, course_title: 'Diploma in Montessori' },
];

function makeOps(overrides: Partial<CentrePortalAppsOps> = {}) {
  return {
    addCentreApplication: vi.fn().mockResolvedValue({ status: 1, message: 'Application Added Successfully!', application_id: 99 }),
    listStudents: vi.fn().mockResolvedValue([]),
    listPaymentStatus: vi.fn().mockImplementation(({ scope }: { scope: { userIds: number[]; applicationIds: number[] } }) => Promise.resolve({
      installments: PLAN_ROWS.filter((r) => (typeof r.id === 'string' ? scope.applicationIds.includes(Number(r.id.split('-')[1])) : scope.userIds.includes(r.user_id ?? 0))),
    })),
    actorOwnsAssociateStudent: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeService(ops = makeOps(), data: ReturnType<typeof seed> = seed()) {
  const db = memoryPrisma(data);
  const service = new CentrePortalAppsService({ ops: ops as unknown as CentrePortalAppsOps, prisma: db.prisma, now: () => NOW });
  return { db, ops, service };
}

describe('centre portal rules', () => {
  test('three real application states', () => {
    expect(centreAppState({ stage: 'lead', status: 'pending', is_converted: 0 })).toBe('pending');
    expect(centreAppState({ stage: 'payment_pending', status: 'pending', is_converted: 0 })).toBe('pending');
    expect(centreAppState({ stage: 'lead', status: 'converted', is_converted: 1 })).toBe('enrolled');
    expect(centreAppState({ stage: 'rejected', status: 'pending', is_converted: 0 })).toBe('rejected');
  });

  test('course validity by IST day; any active plan opens the course', () => {
    expect(planStatusOn({ start_date: d('2026-10-22'), end_date: d('2026-10-22') }, '2026-10-22')).toBe('active');
    expect(planStatusOn({ start_date: d('2026-10-23'), end_date: null }, '2026-10-22')).toBe('upcoming');
    expect(planStatusOn({ start_date: null, end_date: d('2026-10-21') }, '2026-10-22')).toBe('expired');
    expect(planStatusOn({ start_date: null, end_date: null }, '2026-10-22')).toBe('active');
    expect(coursePlanStatus([{ start_date: null, end_date: d('2025-01-01') }, { start_date: null, end_date: null }], '2026-10-22')).toBe('active');
    expect(coursePlanStatus([{ start_date: null, end_date: d('2025-01-01') }, { start_date: d('2027-01-01'), end_date: null }], '2026-10-22')).toBe('upcoming');
  });

  test('offerings open for applications: active and enrolment window not closed', () => {
    expect(offeringOpenOn({ status: 'Active', enrollment_end: null }, '2026-10-22')).toBe(true);
    expect(offeringOpenOn({ status: 'active', enrollment_end: d('2026-10-22') }, '2026-10-22')).toBe(true);
    expect(offeringOpenOn({ status: 'active', enrollment_end: d('2026-10-21') }, '2026-10-22')).toBe(false);
    expect(offeringOpenOn({ status: 'draft', enrollment_end: null }, '2026-10-22')).toBe(false);
  });

  test('combinations: the packaged ones, else every active combination of the course', () => {
    const combos = [{ id: 3 }, { id: 4 }];
    expect(combinationsForOffering(combos, [4, 99])).toEqual([{ id: 4 }]);
    expect(combinationsForOffering(combos, [99])).toEqual(combos);
    expect(combinationsForOffering(combos, [])).toEqual(combos);
  });

  test('add-application input checks', () => {
    const ok = checkAddApplication({ name: '  Ravi  Kumar ', code: '91', phone: '98 470-12345', email: 'Ravi@Example.com', course_id: '16', offering_id: 61, combination_id: '4' });
    expect(ok).toEqual({ ok: true, value: { name: 'Ravi Kumar', countryCode: '+91', phone: '9847012345', email: 'ravi@example.com', courseId: 16, offeringId: 61, combinationId: 4 } });
    expect(checkAddApplication({ phone: '9847012345', email: 'a@b.co', course_id: 16, offering_id: 61 })).toMatchObject({ ok: false, message: 'Student name is required.' });
    expect(checkAddApplication({ name: 'A', phone: '12ab', email: 'a@b.co', course_id: 16, offering_id: 61 })).toMatchObject({ ok: false });
    expect(checkAddApplication({ name: 'A', phone: '9847012345', email: '', course_id: 16, offering_id: 61 })).toMatchObject({ ok: false, message: 'Email is required.' });
    expect(checkAddApplication({ name: 'A', phone: '9847012345', email: 'not-an-email', course_id: 16, offering_id: 61 })).toMatchObject({ ok: false });
    expect(checkAddApplication({ name: 'A', phone: '9847012345', email: 'a@b.co', course_id: 16 })).toMatchObject({ ok: false, message: 'Choose an offering.' });
    expect(checkAddApplication({ name: 'A', phone: '9847012345', email: 'a@b.co', offering_id: 61 })).toMatchObject({ ok: false, message: 'Choose a course.' });
  });

  test('enrolment status spellings, fee totals and the centre-visible timeline', () => {
    expect(enrolmentStatusOf(null)).toBe('Active');
    expect(enrolmentStatusOf('On hold')).toBe('On Hold');
    expect(enrolmentStatusOf('dropped')).toBe('Dropout');
    expect(enrolmentStatusOf('graduate')).toBe('Graduated');
    expect(feeTotalsByUser([{ user_id: 900, amount: '1,000', computed_status: 'paid' }, { user_id: 900, amount: 500, computed_status: 'due' }, { user_id: null, amount: 9 }]))
      .toEqual(new Map([[900, { fee: 1500, paid: 1000 }]]));
    const timeline = timelineOf([
      { event_type: 'converted', description: 'Converted', created_at: new Date('2026-09-02T00:00:00Z') },
      { event_type: 'student_payment_unrecorded', description: 'Finance note', created_at: new Date('2026-09-03T00:00:00Z') },
    ], new Date('2026-09-01T00:00:00Z'));
    expect(timeline.map((e) => e.type)).toEqual(['converted', 'created']);
    expect(CENTRE_VISIBLE_EVENTS.has('verification_changed')).toBe(false);
    expect(plainText('<p>Learn <b>Montessori</b> &amp; more</p><p>Two</p>')).toBe('Learn Montessori & more\nTwo');
  });
});

describe('applications', () => {
  test('a centre sees only its own applications — pending, enrolled and rejected — with real fees', async () => {
    const { service, ops } = makeService();
    const { rows } = await service.listApplications('501');
    expect(rows.map((r) => r.applicationId)).toEqual(['APP-3', 'APP-1', 'APP-2']);
    expect(rows.map((r) => r.state)).toEqual(['rejected', 'pending', 'enrolled']);
    const lead = rows.find((r) => r.id === 1);
    expect(lead).toMatchObject({ course: 'Diploma in Montessori', offering: 'DMTT Jan 2027', combination: 'TTII + MSU', fee: 15000, paid: 5000, phone: '+91 9000000009', date: '2026-10-02' });
    expect(rows.find((r) => r.id === 2)).toMatchObject({ studentUserId: 900, studentCode: 'TTS0101', fee: 35000, paid: 20000 });
    expect(rows.find((r) => r.id === 3)).toMatchObject({ fee: null, paid: null, rejectionReason: 'Duplicate' });
    // The fee read is narrowed to this centre's applications and students only.
    expect(ops.listPaymentStatus).toHaveBeenCalledWith({ scope: { userIds: [900], applicationIds: [3, 1, 2] } });
  });

  test("another centre's login, and a caller with no centre, see none of them", async () => {
    const { service } = makeService();
    expect((await service.listApplications('502')).rows.map((r) => r.applicationId)).toEqual(['APP-4']);
    expect((await service.listApplications('1')).rows).toEqual([]);
    expect((await service.listApplications('')).rows).toEqual([]);
  });

  test('detail is ownership-checked; the timeline hides finance-only notes; staff names never leak', async () => {
    const { service } = makeService();
    expect(await service.getApplication('502', '2')).toBeNull();
    expect(await service.getApplication('501', '5')).toBeNull(); // deleted
    const enrolled = await service.getApplication('501', '2');
    expect(enrolled?.timeline.map((e) => e.type)).toEqual(['converted', 'created']);
    expect(enrolled?.payments).toMatchObject({ fee: 35000, paid: 20000, balance: 15000, status: 'partial' });
    expect(enrolled?.payments.lines.map((l) => [l.label, l.dueDate, l.status])).toEqual([['Registration', '2026-09-01', 'paid'], ['Instalment 1', '2026-10-01', 'overdue']]);
    expect(enrolled?.addedBy).toBe('You');
    const rejected = await service.getApplication('504', '3');
    expect(rejected).toMatchObject({ state: 'rejected', rejectedBy: 'TTII', addedBy: 'Your centre' });
  });

  test("options: the centre's assigned courses, open offerings and their combinations — no fees", async () => {
    const { service } = makeService();
    const { courses } = await service.applicationOptions('501');
    expect(courses.map((c) => [c.title, c.planStatus])).toEqual([['Diploma in Montessori', 'active'], ['PG Diploma', 'expired']]);
    const dmtt = courses[0];
    expect(dmtt?.offerings.map((o) => o.title)).toEqual(['DMTT Jan 2027', 'DMTT no packages']);
    expect(dmtt?.offerings[0]?.combinations.map((c) => c.code)).toEqual(['TTII + MSU']);
    expect(dmtt?.offerings[1]?.combinations.map((c) => c.code)).toEqual(['TTII', 'TTII + MSU']);
    expect(JSON.stringify(courses)).not.toMatch(/fee|amount|3,201/i);
    expect((await service.applicationOptions('1')).courses).toEqual([]);
  });

  const valid = { name: 'Ravi Kumar', code: '+91', phone: '9847012345', email: 'ravi@example.com', course_id: 16, offering_id: 61, combination_id: 4 };

  test('add: the course must be assigned to the centre and the offering / combination must belong to it', async () => {
    const { service, ops } = makeService();
    const refusals: Array<[Record<string, unknown>, RegExp]> = [
      [{ ...valid, course_id: 20 }, /not assigned to your centre/],
      [{ ...valid, course_id: 18, offering_id: 71 }, /validity for this course has ended/],
      [{ ...valid, offering_id: 81 }, /offering of this course/],
      [{ ...valid, offering_id: 63 }, /offering of this course/], // enrolment closed
      [{ ...valid, offering_id: 62 }, /offering of this course/], // draft
      [{ ...valid, combination_id: 3 }, /certificate combination offered/], // not packaged on 61
      [{ ...valid, combination_id: 0 }, /certificate combination offered/],
      [{ ...valid, combination_id: 9 }, /certificate combination offered/], // another course's combination
    ];
    const refused = async (actor: string, payload: Record<string, unknown>, message: RegExp) => {
      const res = await service.addApplication(actor, payload);
      expect(res.status).toBe(0);
      expect(String(res.message)).toMatch(message);
    };
    for (const [payload, message] of refusals) await refused('501', payload, message);
    await refused('502', valid, /not assigned/);
    await refused('1', valid, /No courses/);
    expect(ops.addCentreApplication).not.toHaveBeenCalled();
  });

  test('add: a valid application is stored with its offering and combination', async () => {
    const { service, ops } = makeService();
    expect(await service.addApplication('501', valid)).toMatchObject({ status: 1, application_id: 99 });
    expect(ops.addCentreApplication).toHaveBeenCalledWith('501', {
      name: 'Ravi Kumar', countryCode: '+91', phone: '9847012345', email: 'ravi@example.com', courseId: '16', offeringId: '61',
      certificateCombinationId: '4', pipeline: '0', pipelineUser: '', status: 'pending',
    });
  });
});

describe('addCentreApplication duplicate check (legacy route too)', () => {
  const base = { name: 'X', countryCode: '+91', courseId: '16', pipeline: '0', pipelineUser: '', status: 'pending' };

  test('a blank email never matches other blank emails; a real phone or email still does', async () => {
    const db = memoryPrisma(seed());
    const ops = new OperationsService(db.prisma);
    expect(await ops.addCentreApplication('501', { ...base, phone: '9111111111', email: '' })).toMatchObject({ status: 1 });
    expect(await ops.addCentreApplication('501', { ...base, phone: '9222222222', email: '' })).toMatchObject({ status: 1 });
    expect(await ops.addCentreApplication('501', { ...base, phone: '9222222222', email: 'new@example.com' })).toMatchObject({ status: 0 });
    expect(await ops.addCentreApplication('501', { ...base, phone: '9333333333', email: 'lead@example.com' })).toMatchObject({ status: 0 });
  });

  test('stores offering_id and certificate_combination_id when given, under the caller\'s centre', async () => {
    const db = memoryPrisma(seed());
    const ops = new OperationsService(db.prisma);
    const res = await ops.addCentreApplication('501', { ...base, phone: '9444444444', email: 'n@example.com', offeringId: '61', certificateCombinationId: '4' });
    const row = (db.tables as unknown as Record<string, Row[]>).applications?.find((a) => a.id === res.application_id);
    expect(row).toMatchObject({ offering_id: 61, certificate_combination_id: 4, added_under_centre: 28, created_by: 501, user_email: 'n@example.com' });
  });
});

describe('students', () => {
  const base = [
    { id: 900, student_id: 'TTS0101', name: 'Amina C', user_email: 'amina@example.com', phone: '9000000001', course_title: 'Diploma in Montessori', course_enrol_status: 'On hold', enrolled_date: '2026-09-02', fee_status: 'Overdue', progress_pct: 40, image: 'https://x/a.jpg', disabled_at: null },
  ];

  test("the centre's students with fee / paid from the scoped Payment Status read and the offering they applied for", async () => {
    const ops = makeOps({ listStudents: vi.fn().mockResolvedValue(base) });
    const { service } = makeService(ops);
    const { rows } = await service.listStudents('501');
    expect(rows).toEqual([expect.objectContaining({
      id: 900, studentCode: 'TTS0101', offering: 'DMTT Jan 2027', combination: 'TTII', phone: '+91 9000000001',
      fee: 35000, paid: 20000, balance: 15000, feeState: 'overdue', status: 'On Hold', progress: 40, loginDisabled: false,
    })]);
    expect(ops.listStudents).toHaveBeenCalledWith('centre', '501', {});
    expect(ops.listPaymentStatus).toHaveBeenCalledWith({ scope: { userIds: [900], applicationIds: [] } });
  });

  test('no students: no payment read at all', async () => {
    const { service, ops } = makeService();
    expect(await service.listStudents('502')).toEqual({ rows: [] });
    expect(ops.listPaymentStatus).not.toHaveBeenCalled();
  });

  test('profile is ownership-checked and carries enrolments, payments and cohorts', async () => {
    const owns = vi.fn().mockImplementation((_actor: string, id: string) => Promise.resolve(id === '900'));
    const { service } = makeService(makeOps({ actorOwnsAssociateStudent: owns }));
    expect(await service.getStudent('502', '950')).toBeNull();
    const profile = await service.getStudent('501', '900');
    expect(owns).toHaveBeenCalledWith('501', '900');
    expect(profile).toMatchObject({
      studentCode: 'TTS0101', dob: '2001-03-14', place: 'Kozhikode – 673004', photo: 'https://lms.teachersindia.in/uploads/amina.jpg',
      offering: 'DMTT Jan 2027', enrolments: [{ course: 'Diploma in Montessori', enrolledOn: '2026-09-02', status: 'On Hold' }],
      payments: { fee: 35000, paid: 20000, balance: 15000 },
      cohorts: [{ code: 'MMJUL26', title: 'July batch', instructor: 'TTII Admin', status: 'running' }],
    });
  });
});

describe('courses & fees', () => {
  test("the centre's plans with the centre fee (comma-safe), validity status and real combinations", async () => {
    const { service } = makeService();
    const { rows, today } = await service.listCourses('501');
    expect(today).toBe('2026-10-22');
    expect(rows).toEqual([
      expect.objectContaining({ planId: 1, course: 'Diploma in Montessori', category: 'Diploma', code: 'TTII-101', centreFee: 3201, status: 'active', startDate: '2026-01-01', endDate: '2026-12-31', openOfferings: 2 }),
      expect.objectContaining({ planId: 2, course: 'PG Diploma', centreFee: 45000, status: 'expired', combinations: [] }),
    ]);
    expect((rows[0]?.combinations as Array<{ code: string; partners: string[] }>).map((c) => [c.code, c.partners]))
      .toEqual([['TTII', []], ['TTII + MSU', ['TTII', 'MSU']]]);
    expect((await service.listCourses('502')).rows.map((r) => r.course)).toEqual(['Advanced AI Educator']);
  });

  test('course detail only for a course assigned to the centre', async () => {
    const { service } = makeService();
    expect(await service.getCourse('501', '20')).toBeNull();
    const course = await service.getCourse('501', '16');
    expect(course).toMatchObject({
      course: 'Diploma in Montessori', summary: 'Learn Montessori & more', planStatus: 'active', enrolledStudents: 1, pendingApplications: 1,
      plans: [{ centreFee: 3201, status: 'active' }],
    });
    expect((course?.offerings as Array<{ title: string; open: boolean }>).map((o) => [o.title, o.open]))
      .toEqual([['DMTT Jan 2027', true], ['DMTT closed', false], ['DMTT no packages', true]]);
  });
});

describe('routes', () => {
  const USERS: Record<string, { id: number; role_id: number }> = {
    centre: { id: 501, role_id: 7 }, associate: { id: 503, role_id: 10 }, student: { id: 900, role_id: 2 }, counsellor: { id: 777, role_id: 9 }, admin: { id: 1, role_id: 1 },
  };
  function makeApp() {
    const authService = {
      authenticateAuthToken: (token: string) => Promise.resolve(USERS[token] ? { user: { ...USERS[token], name: token } } : null),
      logAuthDenied: () => Promise.resolve(),
      logRbacDenied: () => Promise.resolve(),
    };
    const service = {
      listApplications: vi.fn().mockResolvedValue({ rows: [] }),
      applicationOptions: vi.fn().mockResolvedValue({ courses: [] }),
      getApplication: vi.fn().mockResolvedValue(null),
      addApplication: vi.fn().mockResolvedValue({ status: 0, message: 'This course is not assigned to your centre.' }),
      listStudents: vi.fn().mockResolvedValue({ rows: [] }),
      getStudent: vi.fn().mockResolvedValue({ id: 900 }),
      listCourses: vi.fn().mockRejectedValue(new Error('db down: secret detail')),
      getCourse: vi.fn().mockResolvedValue(null),
    };
    const app = Fastify({ logger: false });
    registerCentrePortalAppsRoutes(app, { authService: authService as never, operationsService: makeOps() as never, service: service as never });
    return { app, service };
  }
  const get = (app: ReturnType<typeof makeApp>['app'], url: string, token?: string) =>
    app.inject({ method: 'GET', url: token ? `${url}${url.includes('?') ? '&' : '?'}auth_token=${token}` : url });

  test('only centre and associate logins reach applications and students; the caller id comes from the token', async () => {
    const { app, service } = makeApp();
    for (const url of ['/centre/portal/applications', '/centre/portal/applications/options', '/centre/portal/students', '/centre/portal/students/900']) {
      for (const token of ['student', 'counsellor', 'admin']) expect((await get(app, url, token)).statusCode).toBe(403);
      expect((await get(app, url)).statusCode).toBe(401);
      for (const token of ['centre', 'associate']) expect((await get(app, url, token)).statusCode).toBe(200);
    }
    expect(service.listApplications).toHaveBeenCalledWith('501');
    expect(service.getStudent).toHaveBeenLastCalledWith('503', '900');
    await app.close();
  });

  test('Courses & Fees is Centre (7) only — associates are refused', async () => {
    const { app, service } = makeApp();
    for (const url of ['/centre/portal/courses', '/centre/portal/courses/16']) {
      expect((await get(app, url, 'associate')).statusCode).toBe(403);
    }
    expect(service.listCourses).not.toHaveBeenCalled();
    expect(service.getCourse).not.toHaveBeenCalled();
    expect((await get(app, '/centre/portal/courses/16', 'centre')).statusCode).toBe(404);
    const failed = await get(app, '/centre/portal/courses', 'centre');
    expect(failed.statusCode).toBe(500);
    expect(failed.json()).toEqual({ status: 0, message: 'Something went wrong. Please try again.', data: {} });
    await app.close();
  });

  test('another centre\'s application is a 404; add refusals carry their reason', async () => {
    const { app, service } = makeApp();
    const res = await get(app, '/centre/portal/applications/4', 'centre');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toMatchObject({ status: 0, message: 'Application not found.' });
    expect(service.getApplication).toHaveBeenCalledWith('501', '4');
    const add = await app.inject({ method: 'POST', url: '/centre/portal/applications/add', payload: { auth_token: 'centre', course_id: 20, centre_id: 30 } });
    expect(add.statusCode).toBe(200);
    expect(add.json()).toEqual({ status: 0, message: 'This course is not assigned to your centre.', data: {} });
    expect(service.addApplication).toHaveBeenCalledWith('501', { auth_token: 'centre', course_id: 20, centre_id: 30 });
    expect((await app.inject({ method: 'POST', url: '/centre/portal/applications/add', payload: { auth_token: 'student' } })).statusCode).toBe(403);
    await app.close();
  });
});

describe('security review 2026-10-22: inactive courses and the legacy add route', () => {
  test('options hide a course that is not active in the catalogue, and add refuses it with a clear reason', async () => {
    const data = seed();
    data.course = (data.course ?? []).map((c) => (c.id === 16 ? { ...c, status: 'inactive' } : c));
    const { service, ops } = makeService(undefined, data);
    expect((await service.applicationOptions('501')).courses.map((c) => c.title)).toEqual(['PG Diploma']);
    const res = await service.addApplication('501', { name: 'Ravi Kumar', code: '+91', phone: '9847012345', email: 'ravi@example.com', course_id: 16, offering_id: 61, combination_id: 4 });
    expect(res).toMatchObject({ status: 0, message: 'This course is not open for new applications.' });
    expect(ops.addCentreApplication).not.toHaveBeenCalled();
  });

  test('selectionRefusal: course must be assigned and active-plan; an offering, when sent, must belong', async () => {
    const { service } = makeService();
    expect(await service.selectionRefusal('501', { courseId: 16, offeringId: null, combinationId: null })).toBeNull();
    expect(await service.selectionRefusal('501', { courseId: 20, offeringId: null, combinationId: null })).toMatch(/not assigned/);
    expect(await service.selectionRefusal('501', { courseId: 18, offeringId: null, combinationId: null })).toMatch(/validity/);
    expect(await service.selectionRefusal('501', { courseId: 16, offeringId: 71, combinationId: null })).toMatch(/offering of this course/);
    expect(await service.selectionRefusal('501', { courseId: 16, offeringId: 61, combinationId: 9 })).toMatch(/combination offered/);
    expect(await service.selectionRefusal('501', { courseId: 16, offeringId: null, combinationId: 4 })).toMatch(/Choose the offering/);
  });

  test('legacy POST /centre/applications/add: a centre owner is validated, an associate keeps the old behaviour', async () => {
    const refusal = vi.fn().mockImplementation((_actor: string, sel: { courseId: number }) => Promise.resolve(sel.courseId === 20 ? 'This course is not assigned to your centre.' : null));
    const ops = { addCentreApplication: vi.fn().mockResolvedValue({ status: 1, message: 'Application Added Successfully!', application_id: 5 }) };
    const authService = {
      authenticateAuthToken: (t: string) => Promise.resolve({ centre: { user: { id: 501, role_id: 7, name: 'c' } }, associate: { user: { id: 503, role_id: 10, name: 'a' } } }[t] ?? null),
      logAuthDenied: () => Promise.resolve(),
      logRbacDenied: () => Promise.resolve(),
    };
    const app = Fastify({ logger: false });
    registerOperationsRoutes(app, { authService: authService as never, operationsService: ops as never, centrePortalAppsService: { selectionRefusal: refusal } });
    const post = (auth_token: string, course_id: string) =>
      app.inject({ method: 'POST', url: '/centre/applications/add', payload: { auth_token, name: 'X', phone: '9000000000', email: 'x@e.com', course_id } });

    expect((await post('centre', '20')).json()).toEqual({ status: 0, message: 'This course is not assigned to your centre.' });
    expect(ops.addCentreApplication).not.toHaveBeenCalled();
    expect((await post('centre', '16')).json()).toMatchObject({ status: 1 });
    expect(ops.addCentreApplication).toHaveBeenCalledTimes(1);
    expect((await post('associate', '20')).json()).toMatchObject({ status: 1 });
    expect(refusal).toHaveBeenCalledTimes(2); // never asked for the associate
    await app.close();
  });
});
