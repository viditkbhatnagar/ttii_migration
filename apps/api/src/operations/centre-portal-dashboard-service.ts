import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { buildApplicationPayments, type PaymentStatusLoader } from './centre-application-payments.js';
import {
  conversionPct, dateYmd, isInProgress, isMissingTable, istYmd, looseYmd, money, pipelineStageOf, roundMoney,
  toPositiveInt, trendMonths, type PipelineStage,
} from './centre-dashboard-model.js';
import {
  affiliationSummary, cohortPhase, countByMonth, courseBreakdown, isCentreOwner, thisAndLastMonth,
  type AffiliationSummary, type CentreActor, type CourseCount,
} from './centre-portal-model.js';
import { studentStatus } from './centre-profile-model.js';

// Centre portal v2 (Naji 2026-10-22): the top-bar / sidebar facts and the
// Centre Dashboard of the centre's OWN login. READ-ONLY, real data only.
//
// Scope: the centre is ALWAYS the caller's users.centre_id — a centre id from
// the client is never read. Money (wallet, fee collections, wallet ledger,
// recent payments) and the affiliation expiry are for the Centre login (role
// 7) only; an Associate (role 10) on the shared /centre/* surface gets the
// rest with `money: null`.
//
// What the prototype fabricated and what is shown instead:
//  - "Revenue Generated": centres do not earn through the LMS. Shown instead:
//    the fees the centre's students have paid, from the same computation as
//    Fees → Payment Status (OperationsService.listPaymentStatus), scoped to
//    this centre's students and applications;
//  - "Seats Available" / "Certificates Pending" / targets: no source → omitted;
//  - trend deltas: this month against last month, from real rows.

const STUDENT_ROLE_ID = 2;
const RECENT_SHOWN = 5;

export interface ShellCentre {
  id: number;
  code: string;
  name: string;
  contactPerson: string;
  designation: string;
}

export interface CentreShell {
  centre: ShellCentre | null;
  /** The signed-in user's own name (fallback for the welcome line). */
  userName: string;
  /** Role 7 only. */
  wallet: { balance: number } | null;
  /** Role 7 only. */
  affiliation: AffiliationSummary | null;
}

export interface RecentApplication { id: number; applicationId: string; name: string; course: string; date: string; stage: PipelineStage }
export interface RecentPayment { id: number; studentName: string; studentCode: string; course: string; amount: number; mode: string; paidOn: string; label: string }
export interface RecentWalletTxn { id: number; type: 'credit' | 'debit'; amount: number; remarks: string; date: string }

export interface DashboardMoney {
  walletBalance: number;
  pendingTopUps: number;
  /** Everything scheduled on the centre's applications / students' fee plans. */
  feesScheduled: number;
  feesPaid: number;
  feesBalance: number;
  /** Rows (applications / student-courses) with a balance. */
  withBalance: number;
  recentPayments: RecentPayment[];
  recentWallet: RecentWalletTxn[];
}

export interface CentrePortalDashboard {
  today: string;
  centre: ShellCentre | null;
  kpis: {
    applications: number;
    applicationsThisMonth: number;
    applicationsLastMonth: number;
    inProgress: number;
    awaitingApproval: number;
    converted: number;
    conversion: number;
    students: number;
    studentsThisMonth: number;
    studentsLastMonth: number;
    activeStudents: number;
    runningCohorts: number;
    upcomingCohorts: number;
  };
  trend: Array<{ month: string; label: string; applications: number; enrolments: number }>;
  courses: CourseCount[];
  recentApplications: RecentApplication[];
  /** Role 7 only. */
  money: DashboardMoney | null;
}

export interface CentrePortalDashboardDeps {
  prisma?: PrismaClient;
  /** The Fees → Payment Status computation (OperationsService.listPaymentStatus), narrowed to a scope. */
  loadPaymentStatus: PaymentStatusLoader;
}

type CentreRecord = { id: number; centre_id: string | null; centre_name: string | null; contact_person: string | null; contact_person_designation: string | null; wallet_balance: string | null; date_of_expiry: string | null };

const clean = (value: string | null | undefined): string => (value ?? '').trim();

function shellCentre(c: CentreRecord): ShellCentre {
  return {
    id: c.id,
    code: clean(c.centre_id),
    name: clean(c.centre_name),
    contactPerson: clean(c.contact_person),
    designation: clean(c.contact_person_designation),
  };
}

export class CentrePortalDashboardService {
  private readonly prisma: PrismaClient;
  private readonly loadPaymentStatus: PaymentStatusLoader;

  constructor(deps: CentrePortalDashboardDeps) {
    this.prisma = deps.prisma ?? getPrismaClient();
    this.loadPaymentStatus = deps.loadPaymentStatus;
  }

  /** The caller and their centre (users.centre_id). Null centre when none is linked or it is deleted. */
  private async actorCentre(actor: CentreActor): Promise<{ userName: string; centre: CentreRecord | null }> {
    const user = await this.prisma.users.findFirst({
      where: { id: actor.userId, deleted_at: null },
      select: { id: true, name: true, centre_id: true },
    });
    const centreId = toPositiveInt(user?.centre_id);
    const centre = centreId > 0
      ? await this.prisma.centres.findFirst({
        where: { id: centreId, deleted_at: null },
        select: {
          id: true, centre_id: true, centre_name: true, contact_person: true, contact_person_designation: true,
          wallet_balance: true, date_of_expiry: true,
        },
      })
      : null;
    return { userName: clean(user?.name), centre };
  }

  /** Expiry days of the centre's live agreements ([] before the 2026-10-22 migration). */
  private async agreementExpiries(centreId: number): Promise<string[]> {
    try {
      const rows = await this.prisma.centre_agreements.findMany({
        where: { centre_id: centreId, deleted_at: null },
        select: { expiry_date: true },
      });
      return rows.map((r) => dateYmd(r.expiry_date)).filter(Boolean);
    } catch (error: unknown) {
      if (isMissingTable(error)) return [];
      throw error;
    }
  }

  async shell(actor: CentreActor, now: Date = new Date()): Promise<CentreShell> {
    const { userName, centre } = await this.actorCentre(actor);
    if (!centre) return { centre: null, userName, wallet: null, affiliation: null };
    if (!isCentreOwner(actor)) return { centre: shellCentre(centre), userName, wallet: null, affiliation: null };
    const expiries = await this.agreementExpiries(centre.id);
    return {
      centre: shellCentre(centre),
      userName,
      wallet: { balance: roundMoney(money(centre.wallet_balance)) },
      affiliation: affiliationSummary(looseYmd(centre.date_of_expiry), expiries, istYmd(now)),
    };
  }

  async dashboard(actor: CentreActor, now: Date = new Date()): Promise<CentrePortalDashboard> {
    const today = istYmd(now);
    const months = trendMonths(now, 6);
    const { centre } = await this.actorCentre(actor);
    if (!centre) return emptyDashboard(today, months);

    const [apps, students, cohorts] = await Promise.all([
      this.prisma.applications.findMany({
        where: { deleted_at: null, added_under_centre: centre.id },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        select: {
          id: true, application_id: true, name: true, added_under_centre: true, course_id: true, stage: true,
          status: true, is_converted: true, student_id: true, created_at: true,
        },
      }),
      this.prisma.users.findMany({
        where: { role_id: STUDENT_ROLE_ID, deleted_at: null, added_under_centre: centre.id },
        select: {
          id: true, name: true, student_id: true, course_id: true, application_id: true, added_under_centre: true,
          created_at: true, status: true, disabled_at: true,
        },
      }),
      this.prisma.cohorts.findMany({ where: { deleted_at: null, centre_id: centre.id }, select: { id: true, start_date: true, end_date: true } }),
    ]);
    const studentIds = students.map((s) => s.id);
    const enrolments = studentIds.length > 0
      ? await this.prisma.enrol.findMany({ where: { user_id: { in: studentIds }, deleted_at: null }, select: { user_id: true, course_id: true } })
      : [];
    const courseIds = [...new Set([
      ...apps.map((a) => a.course_id), ...students.map((s) => s.course_id), ...enrolments.map((e) => e.course_id),
    ].filter((id): id is number => typeof id === 'number' && id > 0))];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true, short_name: true } })
      : [];
    const titles = new Map(courses.map((c) => [c.id, { title: clean(c.title), shortName: clean(c.short_name) }]));

    const stages = apps.map((a) => pipelineStageOf(a));
    const converted = stages.filter((s) => s === 'enrolled').length;
    const appMonths = thisAndLastMonth(apps.map((a) => a.created_at), now);
    const studentMonths = thisAndLastMonth(students.map((s) => s.created_at), now);
    const phases = cohorts.map((c) => cohortPhase(dateYmd(c.start_date), dateYmd(c.end_date), today));
    const appTrend = countByMonth(apps.map((a) => a.created_at), months);
    const studentTrend = countByMonth(students.map((s) => s.created_at), months);

    return {
      today,
      centre: shellCentre(centre),
      kpis: {
        applications: apps.length,
        applicationsThisMonth: appMonths.thisMonth,
        applicationsLastMonth: appMonths.lastMonth,
        inProgress: stages.filter(isInProgress).length,
        awaitingApproval: stages.filter((s) => s === 'approval_waiting').length,
        converted,
        conversion: conversionPct(converted, apps.length),
        students: students.length,
        studentsThisMonth: studentMonths.thisMonth,
        studentsLastMonth: studentMonths.lastMonth,
        activeStudents: students.filter((s) => studentStatus(s) === 'Active').length,
        runningCohorts: phases.filter((p) => p === 'running').length,
        upcomingCohorts: phases.filter((p) => p === 'upcoming').length,
      },
      trend: months.map((m, i) => ({ ...m, applications: appTrend[i] ?? 0, enrolments: studentTrend[i] ?? 0 })),
      courses: courseBreakdown({ applicationCourseIds: apps.map((a) => a.course_id), students, enrolments, titles }),
      recentApplications: apps.slice(0, RECENT_SHOWN).map((a, i) => ({
        id: a.id,
        applicationId: clean(a.application_id) || `#${a.id}`,
        name: clean(a.name),
        course: a.course_id ? titles.get(a.course_id)?.title ?? '' : '',
        date: istYmd(a.created_at),
        stage: stages[i] ?? 'lead',
      })),
      money: isCentreOwner(actor) ? await this.money(centre, apps, students, titles) : null,
    };
  }

  private async money(
    centre: CentreRecord,
    apps: Parameters<typeof buildApplicationPayments>[0]['apps'],
    students: Parameters<typeof buildApplicationPayments>[0]['students'],
    titles: Map<number, { title: string; shortName: string }>,
  ): Promise<DashboardMoney> {
    const userIds = [...new Set([
      ...students.map((s) => s.id),
      ...apps.map((a) => a.student_id).filter((id): id is number => typeof id === 'number' && id > 0),
    ])];
    const [paymentStatus, pendingTopUps, txns] = await Promise.all([
      this.loadPaymentStatus({ userIds, applicationIds: apps.map((a) => a.id) }),
      this.prisma.centre_fund_requests.count({ where: { deleted_at: null, centre_id: centre.id, status: 'pending' } }),
      this.prisma.wallet_transactions.findMany({
        where: { deleted_at: null, centre_id: centre.id },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take: RECENT_SHOWN,
        select: { id: true, transaction_type: true, amount: true, remarks: true, created_at: true },
      }),
    ]);
    const installments = Array.isArray(paymentStatus.installments) ? paymentStatus.installments as Array<Record<string, unknown>> : [];
    const rows = buildApplicationPayments({
      centreNames: new Map([[centre.id, clean(centre.centre_name)]]),
      courseTitles: new Map([...titles].map(([id, t]) => [id, t.title])),
      apps,
      students,
      installments,
    });
    return {
      walletBalance: roundMoney(money(centre.wallet_balance)),
      pendingTopUps,
      feesScheduled: roundMoney(rows.reduce((s, r) => s + r.fee, 0)),
      feesPaid: roundMoney(rows.reduce((s, r) => s + r.paid, 0)),
      feesBalance: roundMoney(rows.reduce((s, r) => s + r.balance, 0)),
      withBalance: rows.filter((r) => r.balance > 0).length,
      recentPayments: recentPayments(installments),
      recentWallet: txns.map((t) => ({
        id: t.id,
        type: clean(t.transaction_type).toLowerCase() === 'debit' ? 'debit' : 'credit',
        amount: roundMoney(money(t.amount)),
        remarks: clean(t.remarks),
        date: istYmd(t.created_at),
      })),
    };
  }
}

/** Paid student_payments instalments with a paid date, newest first (plan rows before enrolment carry no date). */
export function recentPayments(installments: ReadonlyArray<Record<string, unknown>>, limit = RECENT_SHOWN): RecentPayment[] {
  const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');
  return installments
    .filter((r) => typeof r.id === 'number' && r.computed_status === 'paid' && r.paid_date instanceof Date && !Number.isNaN(r.paid_date.getTime()))
    .map((r) => ({
      id: r.id as number,
      studentName: text(r.user_name),
      studentCode: text(r.student_id),
      course: text(r.course_title),
      amount: roundMoney(money(r.amount)),
      mode: text(r.payment_mode),
      paidOn: dateYmd(r.paid_date as Date),
      label: text(r.installment_details),
    }))
    .sort((a, b) => b.paidOn.localeCompare(a.paidOn) || b.id - a.id)
    .slice(0, limit);
}

function emptyDashboard(today: string, months: ReturnType<typeof trendMonths>): CentrePortalDashboard {
  return {
    today,
    centre: null,
    kpis: {
      applications: 0, applicationsThisMonth: 0, applicationsLastMonth: 0, inProgress: 0, awaitingApproval: 0, converted: 0,
      conversion: 0, students: 0, studentsThisMonth: 0, studentsLastMonth: 0, activeStudents: 0, runningCohorts: 0, upcomingCohorts: 0,
    },
    trend: months.map((m) => ({ ...m, applications: 0, enrolments: 0 })),
    courses: [],
    recentApplications: [],
    money: null,
  };
}
