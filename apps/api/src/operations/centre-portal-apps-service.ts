import type { Prisma, PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { toLegacyFileUrl } from '../data/legacy-asset-url.js';
import { buildApplicationPayments, type ApplicationPaymentRow } from './centre-application-payments.js';
import { paymentState, roundMoney } from './centre-dashboard-model.js';
import { loadCourseCatalog, type CatalogCourse, type OptionCourse } from './centre-portal-apps-catalog.js';
import {
  centreAppState, checkAddApplication, coursePlanStatus, dateYmd, enrolmentStatusOf, feeTotalsByUser, istYmd, money,
  phoneText, planStatusOn, plainText, positiveInt, scalarText as text, timelineOf,
  type CentreAppState, type EnrolmentStatus, type PlanStatus, type TimelineEvent,
} from './centre-portal-apps-model.js';
import type { CentreApplicationInput, PaymentStatusScope, StudentFilters } from './operations-service.js';

// Centre portal v2 (Naji 2026-10-22): Applications, Students and Courses &
// Fees for the logged-in centre (users.centre_id). Every read and write is
// scoped to the caller's own centre — the client never names a centre — with
// the SAME ownership rule as the existing /centre/applications/* guards:
// created_by = the caller OR added_under_centre = the caller's centre.
//
// Real data only. Not built (pending product decisions): the "pay TTII" stages
// of the prototype's application pipeline, per-combination fees / discount /
// GST from a centre fee sheet, and fee auto-fill on Add Application.

/** The OperationsService methods this service reuses (a fake in tests). */
export interface CentrePortalAppsOps {
  addCentreApplication(actorUserId: string, input: CentreApplicationInput): Promise<Record<string, unknown>>;
  listStudents(scope: 'admin' | 'centre', actorUserId: string, filters: StudentFilters): Promise<Array<Record<string, unknown>>>;
  listPaymentStatus(filters: { scope: PaymentStatusScope }): Promise<Record<string, unknown>>;
  actorOwnsAssociateStudent(actorUserId: string, studentId: string): Promise<boolean>;
}

export interface CentreApplicationRow {
  id: number;
  applicationId: string;
  /** IST day the application was added (YYYY-MM-DD). */
  date: string;
  name: string;
  phone: string;
  email: string;
  courseId: number | null;
  course: string;
  offeringId: number | null;
  offering: string;
  combinationId: number | null;
  combination: string;
  state: CentreAppState;
  /** The student's scheduled fee on TTII's plan; null when there is no plan. */
  fee: number | null;
  paid: number | null;
  studentUserId: number | null;
  studentCode: string;
  rejectionReason: string;
}

export interface PaymentLine { label: string; course: string; amount: number; dueDate: string; paidDate: string; status: string; mode: string }

export interface CentreApplicationDetail extends CentreApplicationRow {
  dob: string;
  gender: string;
  address: string;
  district: string;
  stateName: string;
  qualification: string;
  modeOfStudy: string;
  language: string;
  addedBy: string;
  rejectedAt: string;
  rejectedBy: string;
  payments: { fee: number; paid: number; balance: number; status: string; lines: PaymentLine[] };
  timeline: TimelineEvent[];
}

export interface CentreStudentRow {
  id: number;
  studentCode: string;
  name: string;
  email: string;
  phone: string;
  course: string;
  offering: string;
  combination: string;
  enrolledOn: string;
  fee: number;
  paid: number;
  balance: number;
  feeState: 'paid' | 'partial' | 'unpaid' | 'overdue' | 'no_plan';
  status: EnrolmentStatus;
  progress: number | null;
  photo: string;
  loginDisabled: boolean;
}

const APP_SELECT = {
  id: true, application_id: true, name: true, country_code: true, phone: true, user_email: true, course_id: true,
  offering_id: true, certificate_combination_id: true, stage: true, status: true, is_converted: true, student_id: true,
  added_under_centre: true, created_at: true, rejection_reason: true,
} satisfies Prisma.applicationsSelect;

type AppRow = Prisma.applicationsGetPayload<{ select: typeof APP_SELECT }>;

interface Owner { actorId: number; roleId: number; centreId: number; or: Prisma.applicationsWhereInput[] }

interface Hydrated { rows: CentreApplicationRow[]; installments: Array<Record<string, unknown>> }

/** Fees, payments and instalments are the centre owner's (role 7) — an associate (role 10) never receives them. */
const ASSOCIATE_ROLE_ID = 10;
const hidesMoney = (owner: Owner): boolean => owner.roleId === ASSOCIATE_ROLE_ID;

export type MoneyFreeApplicationRow = Omit<CentreApplicationRow, 'fee' | 'paid'>;
export type MoneyFreeApplicationDetail = Omit<CentreApplicationDetail, 'fee' | 'paid' | 'payments'>;
export type MoneyFreeStudentRow = Omit<CentreStudentRow, 'fee' | 'paid' | 'balance' | 'feeState'>;

function withoutApplicationMoney<T extends CentreApplicationRow>(row: T): Omit<T, 'fee' | 'paid'> {
  const { fee: _fee, paid: _paid, ...rest } = row;
  return rest;
}

const uniq = (values: Array<number | null | undefined>): number[] =>
  [...new Set(values.filter((v): v is number => typeof v === 'number' && v > 0))];


function installmentsOf(payload: Record<string, unknown>): Array<Record<string, unknown>> {
  return Array.isArray(payload.installments) ? (payload.installments as Array<Record<string, unknown>>) : [];
}

function paymentLine(row: Record<string, unknown>): PaymentLine {
  const ymd = (v: unknown) => (v instanceof Date ? dateYmd(v) : text(v).slice(0, 10));
  return {
    label: text(row.installment_details) || 'Instalment',
    course: text(row.course_title),
    amount: roundMoney(money(row.amount)),
    dueDate: ymd(row.due_date),
    paidDate: ymd(row.paid_date),
    status: text(row.computed_status) || 'upcoming',
    mode: text(row.payment_mode),
  };
}

export class CentrePortalAppsService {
  private readonly prisma: PrismaClient;

  private readonly ops: CentrePortalAppsOps;

  private readonly now: () => Date;

  constructor(deps: { ops: CentrePortalAppsOps; prisma?: PrismaClient; now?: () => Date }) {
    this.ops = deps.ops;
    this.prisma = deps.prisma ?? getPrismaClient();
    this.now = deps.now ?? (() => new Date());
  }

  private today(): string {
    return istYmd(this.now());
  }

  /** The caller and their centre (users.centre_id) — the only scope this service trusts. */
  private async owner(actorUserId: string): Promise<Owner | null> {
    const actorId = positiveInt(actorUserId);
    if (!actorId) return null;
    const user = await this.prisma.users.findFirst({ where: { id: actorId, deleted_at: null }, select: { centre_id: true, role_id: true } });
    if (!user) return null;
    const centreId = positiveInt(user.centre_id);
    return { actorId, roleId: positiveInt(user.role_id), centreId, or: [{ created_by: actorId }, ...(centreId ? [{ added_under_centre: centreId }] : [])] };
  }

  // ─── Applications ─────────────────────────────────────────────────────────

  async listApplications(actorUserId: string): Promise<{ rows: Array<CentreApplicationRow | MoneyFreeApplicationRow> }> {
    const owner = await this.owner(actorUserId);
    if (!owner) return { rows: [] };
    const apps = await this.prisma.applications.findMany({
      where: { deleted_at: null, OR: owner.or },
      select: APP_SELECT,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
    const { rows } = await this.hydrate(apps);
    return { rows: hidesMoney(owner) ? rows.map(withoutApplicationMoney) : rows };
  }

  async getApplication(actorUserId: string, id: string): Promise<CentreApplicationDetail | MoneyFreeApplicationDetail | null> {
    const owner = await this.owner(actorUserId);
    const appId = positiveInt(id);
    if (!owner || !appId) return null;
    const app = await this.prisma.applications.findFirst({
      where: { id: appId, deleted_at: null, OR: owner.or },
      select: {
        ...APP_SELECT, date_of_birth: true, dob: true, gender: true, address: true, district: true, state: true,
        highest_qualification: true, mode_of_study: true, preferred_language: true, created_by: true, rejected_at: true, rejected_by: true,
      },
    });
    if (!app) return null;
    const [{ rows: [row], installments }, events, addedBy, rejectedBy] = await Promise.all([
      this.hydrate([app]),
      this.prisma.application_events.findMany({
        where: { application_id: appId },
        select: { event_type: true, description: true, created_at: true },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take: 50,
      }),
      this.whoLabel(app.created_by, owner),
      this.whoLabel(app.rejected_by, owner),
    ]);
    if (!row) return null;
    const lines = installments
      .filter((r) => {
        const key = typeof r.id === 'string' ? r.id : '';
        if (key.startsWith(`app-${appId}-`)) return true;
        return row.studentUserId !== null && positiveInt(r.user_id) === row.studentUserId
          && (!app.course_id || positiveInt(r.course_id) === app.course_id);
      })
      .map(paymentLine);
    const fee = roundMoney(lines.reduce((sum, l) => sum + l.amount, 0));
    const paid = roundMoney(lines.filter((l) => l.status === 'paid').reduce((sum, l) => sum + l.amount, 0));
    const detail: CentreApplicationDetail = {
      ...row,
      dob: dateYmd(app.date_of_birth ?? app.dob),
      gender: text(app.gender),
      address: text(app.address),
      district: text(app.district),
      stateName: text(app.state),
      qualification: text(app.highest_qualification),
      modeOfStudy: text(app.mode_of_study),
      language: text(app.preferred_language),
      addedBy,
      rejectedAt: app.rejected_at ? app.rejected_at.toISOString() : '',
      rejectedBy: row.state === 'rejected' ? rejectedBy : '',
      payments: { fee, paid, balance: Math.max(0, roundMoney(fee - paid)), status: paymentState(fee, paid), lines },
      timeline: timelineOf(events, app.created_at),
    };
    if (!hidesMoney(owner)) return detail;
    const { fee: _fee, paid: _paid, payments: _payments, ...moneyFree } = detail;
    return moneyFree;
  }

  /** "You" / "Your centre" / "TTII" — never another person's name. */
  private async whoLabel(userId: number | null, owner: Owner): Promise<string> {
    if (!userId) return '';
    if (userId === owner.actorId) return 'You';
    const user = await this.prisma.users.findFirst({ where: { id: userId }, select: { centre_id: true } });
    return owner.centreId && positiveInt(user?.centre_id) === owner.centreId ? 'Your centre' : 'TTII';
  }

  private async hydrate(apps: AppRow[]): Promise<Hydrated> {
    if (apps.length === 0) return { rows: [], installments: [] };
    const appIds = apps.map((a) => a.id);
    const [courses, offerings, combos, students] = await Promise.all([
      this.prisma.course.findMany({ where: { id: { in: uniq(apps.map((a) => a.course_id)) } }, select: { id: true, title: true } }),
      this.prisma.offerings.findMany({ where: { id: { in: uniq(apps.map((a) => a.offering_id)) } }, select: { id: true, title: true, offering_code: true } }),
      this.prisma.certificate_combinations.findMany({ where: { id: { in: uniq(apps.map((a) => a.certificate_combination_id)) } }, select: { id: true, combination_code: true } }),
      this.prisma.users.findMany({
        where: { role_id: 2, deleted_at: null, OR: [{ id: { in: uniq(apps.map((a) => a.student_id)) } }, { application_id: { in: appIds } }] },
        select: { id: true, name: true, student_id: true, course_id: true, application_id: true, added_under_centre: true, created_at: true },
      }),
    ]);
    const courseTitles = new Map(courses.map((c) => [c.id, text(c.title)]));
    const offeringTitles = new Map(offerings.map((o) => [o.id, text(o.title) || text(o.offering_code)]));
    const comboCodes = new Map(combos.map((c) => [c.id, text(c.combination_code)]));
    const studentsById = new Map(students.map((s) => [s.id, s]));
    const studentByApp = new Map(students.filter((s) => s.application_id > 0).map((s) => [s.application_id, s]));

    const payload = await this.ops.listPaymentStatus({ scope: { userIds: students.map((s) => s.id), applicationIds: appIds } });
    const installments = installmentsOf(payload);
    const fees = new Map<number, ApplicationPaymentRow>();
    for (const r of buildApplicationPayments({ centreNames: new Map(), courseTitles, apps, students, installments })) {
      if (r.key.startsWith('app-')) fees.set(Number(r.key.slice(4)), r);
    }

    const rows = apps.map((a): CentreApplicationRow => {
      const state = centreAppState(a);
      const student = state === 'enrolled'
        ? (a.student_id ? studentsById.get(a.student_id) : undefined) ?? studentByApp.get(a.id)
        : undefined;
      const fee = fees.get(a.id);
      const hasPlan = fee !== undefined && fee.status !== 'no_plan';
      return {
        id: a.id,
        applicationId: text(a.application_id) || `#${a.id}`,
        date: istYmd(a.created_at),
        name: text(a.name),
        phone: phoneText(a.country_code, a.phone),
        email: text(a.user_email),
        courseId: a.course_id ?? null,
        course: a.course_id ? courseTitles.get(a.course_id) ?? '' : '',
        offeringId: a.offering_id ?? null,
        offering: a.offering_id ? offeringTitles.get(a.offering_id) ?? '' : '',
        combinationId: a.certificate_combination_id ?? null,
        combination: a.certificate_combination_id ? comboCodes.get(a.certificate_combination_id) ?? '' : '',
        state,
        fee: hasPlan ? fee.fee : null,
        paid: hasPlan ? fee.paid : null,
        studentUserId: student?.id ?? (state === 'enrolled' ? a.student_id ?? null : null),
        studentCode: text(student?.student_id),
        rejectionReason: state === 'rejected' ? text(a.rejection_reason) : '',
      };
    });
    return { rows, installments };
  }

  // ─── Add Application ──────────────────────────────────────────────────────

  /** The centre's courses (centre_course_plans), every status, with their open offerings and certificate combinations. No fees. */
  private async optionCourses(actorUserId: string): Promise<OptionCourse[]> {
    const owner = await this.owner(actorUserId);
    if (!owner?.centreId) return [];
    const plans = await this.prisma.centre_course_plans.findMany({
      where: { centre_id: owner.centreId, deleted_at: null },
      select: { course_id: true, start_date: true, end_date: true },
    });
    const today = this.today();
    const catalog = await loadCourseCatalog(this.prisma, uniq(plans.map((p) => p.course_id)), today);
    return catalog
      .map((c): OptionCourse => ({ ...c, planStatus: coursePlanStatus(plans.filter((p) => p.course_id === c.id), today), offerings: c.offerings.filter((o) => o.open) }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  /** What the Add Application form may pick: the centre's courses that are active in the TTII catalogue, with open offerings and combinations. No fees. */
  async applicationOptions(actorUserId: string): Promise<{ courses: OptionCourse[] }> {
    return { courses: (await this.optionCourses(actorUserId)).filter((c) => c.status === 'active') };
  }

  /**
   * Why this course / offering / combination may not take a new application from
   * the caller's centre, or null when it may. The offering is optional only for the
   * legacy add route, which never sent one; whatever IS sent must belong.
   */
  async selectionRefusal(
    actorUserId: string,
    sel: { courseId: number; offeringId: number | null; combinationId: number | null },
  ): Promise<string | null> {
    const courses = await this.optionCourses(actorUserId);
    if (courses.length === 0) return 'No courses are assigned to your centre yet. Please contact TTII.';
    const course = courses.find((c) => c.id === sel.courseId);
    if (!course) return 'This course is not assigned to your centre.';
    if (course.status !== 'active') return 'This course is not open for new applications.';
    if (course.planStatus !== 'active') {
      return course.planStatus === 'upcoming'
        ? "Your centre's validity for this course has not started yet."
        : "Your centre's validity for this course has ended. Please contact TTII.";
    }
    if (!sel.offeringId) {
      return sel.combinationId ? 'Choose the offering for this certificate combination.' : null;
    }
    const offering = course.offerings.find((o) => o.id === sel.offeringId);
    if (!offering) return 'Choose an offering of this course that is open for enrolment.';
    if (offering.combinations.length > 0 && !offering.combinations.some((c) => c.id === sel.combinationId)) {
      return 'Choose a certificate combination offered for this offering.';
    }
    if (offering.combinations.length === 0 && sel.combinationId) {
      return 'This offering has no certificate combinations to choose from.';
    }
    return null;
  }

  async addApplication(actorUserId: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const checked = checkAddApplication(payload);
    if (!checked.ok) return { status: 0, message: checked.message };
    const input = checked.value;
    const refusal = await this.selectionRefusal(actorUserId, input);
    if (refusal) return { status: 0, message: refusal };
    return this.ops.addCentreApplication(actorUserId, {
      name: input.name,
      countryCode: input.countryCode,
      phone: input.phone,
      email: input.email,
      courseId: String(input.courseId),
      offeringId: String(input.offeringId),
      certificateCombinationId: input.combinationId ? String(input.combinationId) : '',
      // The values the centre Add Application has always sent.
      pipeline: '0',
      pipelineUser: '',
      status: 'pending',
    });
  }

  // ─── Students ─────────────────────────────────────────────────────────────

  async listStudents(actorUserId: string): Promise<{ rows: Array<CentreStudentRow | MoneyFreeStudentRow> }> {
    // listStudents('centre') = role-2 users under the caller's centre — the
    // same list /centre/students/index has always returned (associates too).
    const base = await this.ops.listStudents('centre', actorUserId, {});
    const userIds = uniq(base.map((r) => positiveInt(r.id)));
    if (userIds.length === 0) return { rows: [] };
    const owner = await this.owner(actorUserId);
    const hide = owner !== null && hidesMoney(owner);
    const [users, payload] = await Promise.all([
      this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, application_id: true, country_code: true, created_at: true } }),
      hide ? Promise.resolve<Record<string, unknown>>({}) : this.ops.listPaymentStatus({ scope: { userIds, applicationIds: [] } }),
    ]);
    const links = await this.applicationLinks(users);
    const totals = feeTotalsByUser(installmentsOf(payload));
    const userById = new Map(users.map((u) => [u.id, u]));
    const rows = base.map((r): CentreStudentRow => {
      const id = positiveInt(r.id);
      const user = userById.get(id);
      const link = links.get(id);
      const t = totals.get(id) ?? { fee: 0, paid: 0 };
      const fee = roundMoney(t.fee);
      const paid = roundMoney(t.paid);
      const state = paymentState(fee, paid);
      const progress = typeof r.progress_pct === 'number' ? r.progress_pct : null;
      return {
        id,
        studentCode: text(r.student_id),
        name: text(r.name),
        email: text(r.user_email),
        phone: phoneText(user?.country_code, text(r.phone)),
        course: text(r.course_title),
        offering: link?.offering ?? '',
        combination: link?.combination ?? '',
        enrolledOn: text(r.enrolled_date) || istYmd(user?.created_at ?? null),
        fee,
        paid,
        balance: Math.max(0, roundMoney(fee - paid)),
        feeState: state !== 'paid' && state !== 'no_plan' && text(r.fee_status) === 'Overdue' ? 'overdue' : state,
        status: enrolmentStatusOf(r.course_enrol_status),
        progress,
        photo: text(r.image),
        loginDisabled: Boolean(r.disabled_at),
      };
    });
    if (!hide) return { rows };
    return { rows: rows.map(({ fee: _fee, paid: _paid, balance: _balance, feeState: _feeState, ...rest }) => rest) };
  }

  /** users.id → the offering / combination of the application the student came from. */
  private async applicationLinks(users: Array<{ id: number; application_id: number }>): Promise<Map<number, { offering: string; combination: string; applicationId: number }>> {
    const userIds = users.map((u) => u.id);
    const apps = await this.prisma.applications.findMany({
      where: { deleted_at: null, OR: [{ id: { in: uniq(users.map((u) => u.application_id)) } }, { student_id: { in: userIds } }] },
      select: { id: true, student_id: true, offering_id: true, certificate_combination_id: true },
      orderBy: { id: 'desc' },
    });
    const [offerings, combos] = await Promise.all([
      this.prisma.offerings.findMany({ where: { id: { in: uniq(apps.map((a) => a.offering_id)) } }, select: { id: true, title: true, offering_code: true } }),
      this.prisma.certificate_combinations.findMany({ where: { id: { in: uniq(apps.map((a) => a.certificate_combination_id)) } }, select: { id: true, combination_code: true } }),
    ]);
    const offeringTitles = new Map(offerings.map((o) => [o.id, text(o.title) || text(o.offering_code)]));
    const comboCodes = new Map(combos.map((c) => [c.id, text(c.combination_code)]));
    const out = new Map<number, { offering: string; combination: string; applicationId: number }>();
    for (const u of users) {
      const app = apps.find((a) => a.id === u.application_id) ?? apps.find((a) => a.student_id === u.id);
      if (!app) continue;
      out.set(u.id, {
        applicationId: app.id,
        offering: app.offering_id ? offeringTitles.get(app.offering_id) ?? '' : '',
        combination: app.certificate_combination_id ? comboCodes.get(app.certificate_combination_id) ?? '' : '',
      });
    }
    return out;
  }

  async getStudent(actorUserId: string, id: string): Promise<Record<string, unknown> | null> {
    const userId = positiveInt(id);
    if (!userId || !(await this.ops.actorOwnsAssociateStudent(actorUserId, String(userId)))) return null;
    const user = await this.prisma.users.findFirst({
      where: { id: userId, role_id: 2, deleted_at: null },
      select: {
        id: true, student_id: true, name: true, user_email: true, country_code: true, phone: true, gender: true, dob: true,
        place: true, pin_code: true, disabled_at: true, created_at: true, image: true, profile_picture: true, application_id: true,
      },
    });
    if (!user) return null;
    const owner = await this.owner(actorUserId);
    const hide = owner !== null && hidesMoney(owner);
    const [enrolments, payload, cohortLinks, links] = await Promise.all([
      this.prisma.enrol.findMany({
        where: { user_id: userId, deleted_at: null },
        select: { id: true, course_id: true, enrollment_id: true, enrollment_date: true, enrollment_status: true, mode_of_study: true, created_at: true },
        orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
      }),
      hide ? Promise.resolve<Record<string, unknown>>({}) : this.ops.listPaymentStatus({ scope: { userIds: [userId], applicationIds: [] } }),
      this.prisma.cohort_students.findMany({ where: { user_id: userId, deleted_at: null }, select: { cohort_id: true } }),
      this.applicationLinks([user]),
    ]);
    const cohortIds = uniq(cohortLinks.map((c) => positiveInt(c.cohort_id)));
    const cohorts = cohortIds.length === 0 ? [] : await this.prisma.cohorts.findMany({
      where: { id: { in: cohortIds }, deleted_at: null },
      select: { id: true, cohort_id: true, title: true, course_id: true, instructor_id: true, start_date: true, end_date: true },
      orderBy: [{ start_date: 'desc' }, { id: 'desc' }],
    });
    const [courses, instructors] = await Promise.all([
      this.prisma.course.findMany({ where: { id: { in: uniq([...enrolments.map((e) => e.course_id), ...cohorts.map((c) => c.course_id)]) } }, select: { id: true, title: true } }),
      this.prisma.users.findMany({ where: { id: { in: uniq(cohorts.map((c) => c.instructor_id)) } }, select: { id: true, name: true } }),
    ]);
    const courseTitles = new Map(courses.map((c) => [c.id, text(c.title)]));
    const instructorNames = new Map(instructors.map((i) => [i.id, text(i.name)]));
    const lines = installmentsOf(payload).filter((r) => positiveInt(r.user_id) === userId).map(paymentLine);
    const fee = roundMoney(lines.reduce((sum, l) => sum + l.amount, 0));
    const paid = roundMoney(lines.filter((l) => l.status === 'paid').reduce((sum, l) => sum + l.amount, 0));
    const today = this.today();
    const link = links.get(userId);
    const profile = {
      id: user.id,
      studentCode: text(user.student_id),
      name: text(user.name),
      email: text(user.user_email),
      phone: phoneText(user.country_code, user.phone),
      gender: text(user.gender),
      dob: dateYmd(user.dob),
      place: [text(user.place), text(user.pin_code)].filter(Boolean).join(' – '),
      joinedOn: istYmd(user.created_at),
      photo: toLegacyFileUrl(user.image) || toLegacyFileUrl(user.profile_picture),
      loginDisabled: user.disabled_at !== null,
      offering: link?.offering ?? '',
      combination: link?.combination ?? '',
      applicationId: link?.applicationId ?? null,
      enrolments: enrolments.map((e) => ({
        id: e.id,
        course: e.course_id ? courseTitles.get(e.course_id) ?? '' : '',
        enrolmentId: text(e.enrollment_id),
        enrolledOn: (text(e.enrollment_date).match(/^\d{4}-\d{2}-\d{2}/)?.[0]) ?? istYmd(e.created_at),
        status: enrolmentStatusOf(e.enrollment_status),
        mode: text(e.mode_of_study),
      })),
      cohorts: cohorts.map((c) => {
        const start = dateYmd(c.start_date);
        const end = dateYmd(c.end_date);
        return {
          id: c.id,
          code: text(c.cohort_id),
          title: text(c.title),
          course: c.course_id ? courseTitles.get(c.course_id) ?? '' : '',
          instructor: c.instructor_id ? instructorNames.get(c.instructor_id) ?? '' : '',
          startDate: start,
          endDate: end,
          status: start && start > today ? 'upcoming' : end && end < today ? 'completed' : 'running',
        };
      }),
    };
    if (hide) return profile;
    return { ...profile, payments: { fee, paid, balance: Math.max(0, roundMoney(fee - paid)), status: paymentState(fee, paid), lines } };
  }

  // ─── Courses & Fees (role 7 only — the route enforces it) ─────────────────

  async listCourses(actorUserId: string): Promise<{ today: string; rows: Array<Record<string, unknown>> }> {
    const today = this.today();
    const owner = await this.owner(actorUserId);
    if (!owner?.centreId) return { today, rows: [] };
    const plans = await this.prisma.centre_course_plans.findMany({
      where: { centre_id: owner.centreId, deleted_at: null },
      select: { id: true, course_id: true, assigned_amount: true, start_date: true, end_date: true },
      orderBy: [{ start_date: 'desc' }, { id: 'desc' }],
    });
    const catalog = new Map((await loadCourseCatalog(this.prisma, uniq(plans.map((p) => p.course_id)), today)).map((c) => [c.id, c]));
    const rows = plans.flatMap((p) => {
      const course = catalog.get(p.course_id);
      if (!course) return [];
      return [{ planId: p.id, ...planFields(p, today), ...courseSummary(course) }];
    });
    return { today, rows };
  }

  async getCourse(actorUserId: string, courseIdText: string): Promise<Record<string, unknown> | null> {
    const today = this.today();
    const owner = await this.owner(actorUserId);
    const courseId = positiveInt(courseIdText);
    if (!owner?.centreId || !courseId) return null;
    const plans = await this.prisma.centre_course_plans.findMany({
      where: { centre_id: owner.centreId, course_id: courseId, deleted_at: null },
      select: { id: true, course_id: true, assigned_amount: true, start_date: true, end_date: true },
      orderBy: [{ start_date: 'desc' }, { id: 'desc' }],
    });
    if (plans.length === 0) return null;
    const [catalog, about, centreStudents, apps] = await Promise.all([
      loadCourseCatalog(this.prisma, [courseId], today),
      this.prisma.course.findFirst({ where: { id: courseId, deleted_at: null }, select: { short_description: true, description: true, level: true, language: true } }),
      this.prisma.users.findMany({ where: { role_id: 2, added_under_centre: owner.centreId, deleted_at: null }, select: { id: true } }),
      this.prisma.applications.findMany({ where: { deleted_at: null, course_id: courseId, OR: owner.or }, select: { stage: true, status: true, is_converted: true } }),
    ]);
    const course = catalog[0];
    if (!course || !about) return null;
    const studentIds = centreStudents.map((s) => s.id);
    const enrolled = studentIds.length === 0 ? 0 : await this.prisma.enrol.count({ where: { course_id: courseId, deleted_at: null, user_id: { in: studentIds } } });
    return {
      ...courseSummary(course),
      today,
      level: text(about.level),
      language: text(about.language),
      summary: plainText(about.short_description),
      description: plainText(about.description),
      planStatus: coursePlanStatus(plans, today),
      plans: plans.map((p) => ({ planId: p.id, ...planFields(p, today) })),
      offerings: course.offerings,
      enrolledStudents: enrolled,
      pendingApplications: apps.filter((a) => centreAppState(a) === 'pending').length,
    };
  }
}

function planFields(plan: { assigned_amount: string; start_date: Date | null; end_date: Date | null }, today: string) {
  const raw = text(plan.assigned_amount);
  return {
    centreFee: raw === '' ? null : roundMoney(money(raw)),
    startDate: dateYmd(plan.start_date),
    endDate: dateYmd(plan.end_date),
    status: planStatusOn(plan, today) satisfies PlanStatus,
  };
}

function courseSummary(course: CatalogCourse) {
  return {
    courseId: course.id,
    course: course.title,
    shortName: course.shortName,
    code: course.code,
    category: course.category,
    duration: course.duration,
    combinations: course.combinations,
    openOfferings: course.offerings.filter((o) => o.open).length,
  };
}
