import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import {
  AFFILIATION_DUE_SOON_DAYS, AFFILIATION_NOT_SET_UP, CREDIT_TYPES, PIPELINE_STAGES, affiliationState, conversionPct,
  dateYmd, daysBetween, earlierYmd, feePeriod, feeStatus, inWindow, isInProgress, isMissingTable, istDayStart, istYmd,
  laterYmd, looseYmd, money, parsePeriod, periodWindow, pipelineStageOf, roundMoney, stateName, toPositiveInt, trendMonths,
  type AffiliationState, type DashboardPeriod, type FeeStatus, type PipelineStage, type StageFacts,
} from './centre-dashboard-model.js';
import { ACTIVITY_SHOWN, buildActivity, type ActivityInput, type DashboardActivity } from './centre-dashboard-activity.js';
import { buildApplicationPayments, type ApplicationPaymentRow, type PaymentStatusLoader } from './centre-application-payments.js';

export type { DashboardActivity } from './centre-dashboard-activity.js';
export type { ApplicationPaymentRow, PaymentStatusLoader, PaymentStatusScope } from './centre-application-payments.js';

// Centres v2 (Naji 2026-10-22): the Centre Dashboard and the money tabs of
// Wallet & Payment, on real data only. READ-ONLY — every read is a Prisma
// query builder call; nothing here writes.
//
// What the prototype fabricated and what is read instead:
//  - "Collected from Centres": centres pay TTII nothing per application today,
//    so it is wallet top-ups credited (wallet_transactions credits) plus
//    affiliation fees recorded paid (centre_agreements), both in the period;
//  - revenue trend: the same two sources by IST month — no baseline;
//  - pipeline: centre applications (applications.added_under_centre) by their
//    REAL stage;
//  - affiliation expiry: the later of centres.date_of_expiry and the newest
//    live centre_agreements.expiry_date.
// Periods are IST calendar periods to date (this month / quarter / year).
//
// Reads are bounded: application and student counts are aggregated in the
// database (groupBy / count), the activity feed reads only the newest few
// rows of each source, and the money read is credits only. That credits read
// — three columns — is the one all-time read: per-centre Revenue is all-time
// by design and amounts are VarChar, which the query builder cannot sum.
//
// centre_agreements / centre_onboarding* do not exist until
// 2026-10-22-centre-onboarding-affiliation.sql runs: those reads answer empty
// (affiliationReady = false), never a 500.

const STUDENT_ROLE_ID = 2;
const LOW_WALLET_UNDER = 5000;
const RENEWALS_SHOWN = 5;
const ACTIVE = 1;

export interface DashboardCentreOption { id: number; code: string; name: string }

export interface DashboardKpis {
  totalCentres: number;
  activeCentres: number;
  inactiveCentres: number;
  /** All time. */
  enrollments: number;
  /** Created in the period. */
  inProgress: number;
  /** All time. */
  awaitingApproval: number;
  collected: number;
  collectedTopUps: number;
  collectedAffiliation: number;
  walletTotal: number;
  pendingTopUps: number;
}

export interface DashboardCentreRow {
  id: number;
  code: string;
  name: string;
  state: string;
  status: 'active' | 'inactive';
  enrollments: number;
  applications: number;
  /** Centre applications converted to enrolments. */
  approved: number;
  conversion: number;
  /** Wallet top-ups credited, all time. */
  revenue: number;
  wallet: number;
  /** YYYY-MM-DD, '' when no expiry is recorded anywhere. */
  affiliationExpiry: string;
  daysLeft: number | null;
  affiliation: AffiliationState;
}

export interface CentreDashboard {
  period: DashboardPeriod;
  /** The IST calendar period to date. */
  window: { fromYmd: string; toYmd: string };
  today: string;
  centreId: number | null;
  centres: DashboardCentreOption[];
  kpis: DashboardKpis;
  pipeline: Array<{ stage: PipelineStage; count: number }>;
  actions: { awaitingApproval: number; pendingTopUps: number; expiringSoon: number; expired: number };
  trend: Array<{ month: string; label: string; topUps: number; affiliation: number }>;
  rows: DashboardCentreRow[];
  renewals: Array<{ id: number; name: string; expiry: string; daysLeft: number }>;
  lowWallets: Array<{ id: number; name: string; balance: number }>;
  activity: DashboardActivity[];
  affiliationReady: boolean;
  affiliationMessage: string;
}

export interface AffiliationFeeRow {
  id: number;
  recordNo: string;
  centreId: number | null;
  centreName: string;
  /** The agreement still belongs to an onboarding lead (no centre yet). */
  onboarding: boolean;
  period: string;
  amount: number;
  /** The agreement's effective date (YYYY-MM-DD). */
  dueDate: string;
  /** YYYY-MM-DD, '' when not recorded. */
  paidOn: string;
  status: FeeStatus;
}

export interface AffiliationFeeList { ready: boolean; message: string; rows: AffiliationFeeRow[] }

export interface ApplicationPaymentList { rows: ApplicationPaymentRow[] }

type CentreRecord = Awaited<ReturnType<CentreDashboardService['loadCentres']>>[number];

interface AgreementRecord {
  id: number;
  agreement_no: string;
  centre_id: number | null;
  onboarding_id: number | null;
  effective_date: Date;
  expiry_date: Date;
  fee_amount: unknown;
  fee_paid: boolean;
  fee_paid_on: Date | null;
  updated_at: Date | null;
  created_at: Date | null;
}

interface StageGroup extends StageFacts { added_under_centre: number | null; _count: { id: number } }

/**
 * The IST day an affiliation fee was paid: fee_paid_on, else — for a fee
 * marked paid without a date — the day the record was last updated, the
 * closest real record of when it was marked paid. '' when unpaid.
 */
export function feePaidYmd(a: Pick<AgreementRecord, 'fee_paid' | 'fee_paid_on' | 'updated_at' | 'created_at'>): string {
  if (!a.fee_paid) return '';
  return dateYmd(a.fee_paid_on) || istYmd(a.updated_at ?? a.created_at);
}

export interface CentreDashboardDeps {
  prisma?: PrismaClient;
  /** The Fees → Payment Status computation (OperationsService.listPaymentStatus), narrowed to a scope. */
  loadPaymentStatus: PaymentStatusLoader;
}

export class CentreDashboardService {
  private readonly prisma: PrismaClient;
  private readonly loadPaymentStatus: PaymentStatusLoader;

  constructor(deps: CentreDashboardDeps) {
    this.prisma = deps.prisma ?? getPrismaClient();
    this.loadPaymentStatus = deps.loadPaymentStatus;
  }

  private loadCentres() {
    return this.prisma.centres.findMany({
      where: { deleted_at: null },
      select: {
        id: true, centre_id: true, centre_name: true, status: true, wallet_balance: true, state_id: true,
        date_of_expiry: true, phone: true, email: true,
      },
      orderBy: [{ centre_name: 'asc' }, { id: 'asc' }],
    });
  }

  /** Live agreements of these centres (plus onboarding ones when asked); ready=false before the migration. */
  private async loadAgreements(ids: number[], includeUnassigned: boolean): Promise<{ ready: boolean; rows: AgreementRecord[] }> {
    const scope = [
      ...(ids.length > 0 ? [{ centre_id: { in: ids } }] : []),
      ...(includeUnassigned ? [{ centre_id: null }] : []),
    ];
    if (scope.length === 0) return { ready: true, rows: [] };
    try {
      const rows = await this.prisma.centre_agreements.findMany({
        where: { deleted_at: null, OR: scope },
        select: {
          id: true, agreement_no: true, centre_id: true, onboarding_id: true, effective_date: true, expiry_date: true,
          fee_amount: true, fee_paid: true, fee_paid_on: true, updated_at: true, created_at: true,
        },
        orderBy: { id: 'desc' },
      });
      return { ready: true, rows };
    } catch (error: unknown) {
      if (isMissingTable(error)) return { ready: false, rows: [] };
      throw error;
    }
  }

  /** Onboarding lead names by id ({} before the migration). */
  private async loadOnboardingNames(ids: number[]): Promise<Map<number, string>> {
    if (ids.length === 0) return new Map();
    try {
      const rows = await this.prisma.centre_onboarding.findMany({ where: { id: { in: ids } }, select: { id: true, centre_name: true } });
      return new Map(rows.map((r) => [r.id, r.centre_name]));
    } catch (error: unknown) {
      if (isMissingTable(error)) return new Map();
      throw error;
    }
  }

  /**
   * The newest onboarding events, filtered in the query: one centre's leads,
   * or (all centres) leads not yet a centre plus leads of LIVE centres — an
   * event of a since-deleted centre is dropped. [] before the migration.
   */
  private async loadOnboardingEvents(centreId: number | null, liveIds: number[]): Promise<ActivityInput['onboarding']> {
    try {
      const leads = await this.prisma.centre_onboarding.findMany({
        where: {
          deleted_at: null,
          ...(centreId !== null ? { centre_id: centreId } : { OR: [{ centre_id: null }, { centre_id: { in: liveIds } }] }),
        },
        select: { id: true, centre_name: true, ref_no: true },
      });
      if (leads.length === 0) return [];
      const events = await this.prisma.centre_onboarding_events.findMany({
        where: { onboarding_id: { in: leads.map((l) => l.id) } },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take: ACTIVITY_SHOWN,
        select: { id: true, onboarding_id: true, message: true, created_at: true },
      });
      const leadMap = new Map(leads.map((l) => [l.id, l]));
      return events.map((e) => {
        const lead = leadMap.get(e.onboarding_id);
        return { id: e.id, at: e.created_at, name: lead?.centre_name ?? '', ref: lead?.ref_no ?? '', message: e.message };
      });
    } catch (error: unknown) {
      if (isMissingTable(error)) return [];
      throw error;
    }
  }

  /** Counts aggregated in the database: students per centre, applications by stage (all time and in the period), pending top-ups. */
  private async loadCounts(ids: number[], periodStart: Date) {
    if (ids.length === 0) return { students: new Map<number, number>(), appsAll: [] as StageGroup[], appsPeriod: [] as StageGroup[], pendingTopUps: 0 };
    const base = { deleted_at: null, added_under_centre: { in: ids } };
    const [students, appsAll, appsPeriod, pendingTopUps] = await Promise.all([
      this.prisma.users.groupBy({
        by: ['added_under_centre'],
        where: { role_id: STUDENT_ROLE_ID, deleted_at: null, added_under_centre: { in: ids } },
        _count: { id: true },
      }),
      this.prisma.applications.groupBy({
        by: ['added_under_centre', 'stage', 'status', 'is_converted'], where: base, _count: { id: true },
      }),
      this.prisma.applications.groupBy({
        by: ['added_under_centre', 'stage', 'status', 'is_converted'], where: { ...base, created_at: { gte: periodStart } }, _count: { id: true },
      }),
      this.prisma.centre_fund_requests.count({ where: { deleted_at: null, centre_id: { in: ids }, status: 'pending' } }),
    ]);
    const studentCount = new Map<number, number>();
    for (const g of students) if (g.added_under_centre !== null) studentCount.set(g.added_under_centre, g._count.id);
    return { students: studentCount, appsAll: appsAll as StageGroup[], appsPeriod: appsPeriod as StageGroup[], pendingTopUps };
  }

  /** Wallet credits: (centre, amount, when) only. */
  private loadCredits(ids: number[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return this.prisma.wallet_transactions.findMany({
      where: { deleted_at: null, centre_id: { in: ids }, transaction_type: { in: CREDIT_TYPES } },
      select: { centre_id: true, amount: true, created_at: true },
    });
  }

  /** The newest few rows of each activity source (orderBy + take). */
  private async loadActivity(ids: number[], centreId: number | null, liveIds: number[]): Promise<ActivityInput> {
    const take = ACTIVITY_SHOWN;
    const none = ids.length === 0;
    const fundSelect = { id: true, centre_id: true, amount: true, status: true, created_at: true, updated_at: true } as const;
    const appSelect = { id: true, application_id: true, name: true, added_under_centre: true, created_at: true, converted_at: true } as const;
    const appBase = { deleted_at: null, added_under_centre: { in: ids } };
    const [requested, decided, txns, created, enrolled, onboarding] = await Promise.all([
      none ? [] : this.prisma.centre_fund_requests.findMany({
        where: { deleted_at: null, centre_id: { in: ids } }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take, select: fundSelect,
      }),
      none ? [] : this.prisma.centre_fund_requests.findMany({
        where: { deleted_at: null, centre_id: { in: ids }, status: { in: ['approved', 'rejected'] } },
        orderBy: [{ updated_at: 'desc' }, { id: 'desc' }], take, select: fundSelect,
      }),
      none ? [] : this.prisma.wallet_transactions.findMany({
        where: { deleted_at: null, centre_id: { in: ids } }, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take,
        select: { id: true, centre_id: true, transaction_type: true, amount: true, remarks: true, created_at: true },
      }),
      none ? [] : this.prisma.applications.findMany({ where: appBase, orderBy: [{ created_at: 'desc' }, { id: 'desc' }], take, select: appSelect }),
      none ? [] : this.prisma.applications.findMany({
        where: { ...appBase, converted_at: { not: null } }, orderBy: [{ converted_at: 'desc' }, { id: 'desc' }], take, select: appSelect,
      }),
      this.loadOnboardingEvents(centreId, liveIds),
    ]);
    // An approval outside the newest wallet rows still has its credit: it must not fall back to updated_at.
    const approvedIds = decided.filter((r) => r.status === 'approved').map((r) => r.id);
    const credits = approvedIds.length === 0 ? [] : await this.prisma.wallet_transactions.findMany({
      where: { deleted_at: null, remarks: { in: approvedIds.map((id) => `Fund request approved #${id}`) } },
      select: { remarks: true },
    });
    const creditedRequestIds = new Set(credits.map((c) => Number(/#(\d+)/.exec(c.remarks ?? '')?.[1] ?? 0)).filter((id) => id > 0));
    const unique = <T extends { id: number }>(rows: T[]): T[] => [...new Map(rows.map((r) => [r.id, r])).values()];
    return {
      centreNames: new Map(),
      requests: unique([...requested, ...decided]),
      txns,
      apps: unique([...created, ...enrolled]),
      onboarding,
      creditedRequestIds,
    };
  }

  async dashboard(query: { period?: unknown; centreId?: unknown }, now: Date = new Date()): Promise<CentreDashboard> {
    const period = parsePeriod(query.period);
    const window = periodWindow(period, now);
    const months = trendMonths(now);
    const requested = toPositiveInt(query.centreId);
    const allCentres = await this.loadCentres();
    const centres = requested > 0 ? allCentres.filter((c) => c.id === requested) : allCentres;
    const ids = centres.map((c) => c.id);

    const [counts, credits, agreements, activity] = await Promise.all([
      this.loadCounts(ids, istDayStart(window.fromYmd)),
      this.loadCredits(ids),
      this.loadAgreements(ids, requested === 0),
      this.loadActivity(ids, requested > 0 ? requested : null, allCentres.map((c) => c.id)),
    ]);

    const today = window.toYmd;
    const trendStart = `${months[0]?.month ?? today.slice(0, 7)}-01`;
    const sinceYmd = earlierYmd(window.fromYmd, trendStart);
    const recentCredits = credits.map((t) => ({ ...t, ymd: istYmd(t.created_at), amount: money(t.amount) })).filter((t) => t.ymd >= sinceYmd);
    const paidFees = agreements.rows.map((a) => ({ ymd: feePaidYmd(a), amount: money(a.fee_amount) })).filter((f) => f.ymd !== '');
    const latestExpiry = new Map<number, string>();
    for (const a of agreements.rows) {
      if (a.centre_id !== null) latestExpiry.set(a.centre_id, laterYmd(latestExpiry.get(a.centre_id) ?? '', dateYmd(a.expiry_date)));
    }

    const rows = centres.map((c) => centreRow(c, {
      students: counts.students.get(c.id) ?? 0,
      groups: counts.appsAll.filter((g) => g.added_under_centre === c.id),
      revenue: credits.filter((t) => t.centre_id === c.id).reduce((s, t) => s + money(t.amount), 0),
      expiry: laterYmd(looseYmd(c.date_of_expiry), latestExpiry.get(c.id) ?? ''),
      today,
    }));
    // Inactive centres are not operating: no renewals, low-wallet or expiry alerts for them.
    const operating = rows.filter((r) => r.status === 'active');
    const dated = operating.filter((r): r is DashboardCentreRow & { daysLeft: number } => r.daysLeft !== null);

    const sumStage = (groups: StageGroup[], test: (stage: PipelineStage) => boolean) =>
      groups.reduce((s, g) => s + (test(pipelineStageOf(g)) ? g._count.id : 0), 0);
    const collectedTopUps = roundMoney(recentCredits.filter((t) => inWindow(t.ymd, window)).reduce((s, t) => s + t.amount, 0));
    const collectedAffiliation = roundMoney(paidFees.filter((f) => inWindow(f.ymd, window)).reduce((s, f) => s + f.amount, 0));
    const awaitingApproval = sumStage(counts.appsAll, (st) => st === 'approval_waiting');
    const active = centres.filter((c) => c.status === ACTIVE).length;

    return {
      period,
      window: { fromYmd: window.fromYmd, toYmd: window.toYmd },
      today,
      centreId: requested > 0 ? requested : null,
      centres: allCentres.map((c) => ({ id: c.id, code: c.centre_id ?? '', name: (c.centre_name ?? '').trim() })),
      kpis: {
        totalCentres: centres.length,
        activeCentres: active,
        inactiveCentres: centres.length - active,
        enrollments: rows.reduce((s, r) => s + r.enrollments, 0),
        inProgress: sumStage(counts.appsPeriod, isInProgress),
        awaitingApproval,
        collected: roundMoney(collectedTopUps + collectedAffiliation),
        collectedTopUps,
        collectedAffiliation,
        walletTotal: roundMoney(rows.reduce((s, r) => s + r.wallet, 0)),
        pendingTopUps: counts.pendingTopUps,
      },
      pipeline: PIPELINE_STAGES.map((stage) => ({ stage, count: sumStage(counts.appsPeriod, (st) => st === stage) })),
      actions: {
        awaitingApproval,
        pendingTopUps: counts.pendingTopUps,
        expiringSoon: dated.filter((r) => r.daysLeft >= 0 && r.daysLeft <= AFFILIATION_DUE_SOON_DAYS).length,
        expired: dated.filter((r) => r.daysLeft < 0).length,
      },
      trend: months.map((m) => ({
        ...m,
        topUps: roundMoney(recentCredits.filter((t) => t.ymd.startsWith(m.month)).reduce((s, t) => s + t.amount, 0)),
        affiliation: roundMoney(paidFees.filter((f) => f.ymd.startsWith(m.month)).reduce((s, f) => s + f.amount, 0)),
      })),
      rows,
      renewals: [...dated].sort((a, b) => a.daysLeft - b.daysLeft || a.name.localeCompare(b.name)).slice(0, RENEWALS_SHOWN)
        .map((r) => ({ id: r.id, name: r.name, expiry: r.affiliationExpiry, daysLeft: r.daysLeft })),
      lowWallets: operating.filter((r) => r.wallet < LOW_WALLET_UNDER).sort((a, b) => a.wallet - b.wallet)
        .map((r) => ({ id: r.id, name: r.name, balance: r.wallet })),
      activity: buildActivity({ ...activity, centreNames: new Map(centres.map((c) => [c.id, (c.centre_name ?? '').trim()])) }),
      affiliationReady: agreements.ready,
      affiliationMessage: agreements.ready ? '' : AFFILIATION_NOT_SET_UP,
    };
  }

  /** Wallet & Payment → Affiliation Fee Records (centre_agreements), statuses derived from today (IST). */
  async affiliationFees(now: Date = new Date()): Promise<AffiliationFeeList> {
    const centres = await this.loadCentres();
    const names = new Map(centres.map((c) => [c.id, (c.centre_name ?? '').trim()]));
    const agreements = await this.loadAgreements(centres.map((c) => c.id), true);
    if (!agreements.ready) return { ready: false, message: AFFILIATION_NOT_SET_UP, rows: [] };
    const leadIds = [...new Set(agreements.rows.filter((a) => a.centre_id === null && a.onboarding_id !== null).map((a) => a.onboarding_id as number))];
    const leadNames = await this.loadOnboardingNames(leadIds);
    const today = istYmd(now);
    const rows = agreements.rows.map((a): AffiliationFeeRow => {
      const amount = roundMoney(money(a.fee_amount));
      const dueDate = dateYmd(a.effective_date);
      return {
        id: a.id,
        recordNo: a.agreement_no,
        centreId: a.centre_id,
        centreName: a.centre_id !== null ? names.get(a.centre_id) ?? '' : leadNames.get(a.onboarding_id ?? 0) ?? '',
        onboarding: a.centre_id === null,
        period: feePeriod(dueDate, dateYmd(a.expiry_date)),
        amount,
        dueDate,
        paidOn: a.fee_paid ? dateYmd(a.fee_paid_on) : '',
        status: feeStatus({ paid: a.fee_paid, amount, dueYmd: dueDate }, today),
      };
    });
    return { ready: true, message: '', rows };
  }

  /** Wallet & Payment → Application Payments: fee / paid / balance per centre application or student. */
  async applicationPayments(): Promise<ApplicationPaymentList> {
    const centres = await this.loadCentres();
    const ids = centres.map((c) => c.id);
    if (ids.length === 0) return { rows: [] };
    const [apps, students] = await Promise.all([
      this.prisma.applications.findMany({
        where: { deleted_at: null, added_under_centre: { in: ids } },
        select: {
          id: true, application_id: true, name: true, added_under_centre: true, course_id: true, stage: true,
          status: true, is_converted: true, student_id: true, created_at: true,
        },
      }),
      this.prisma.users.findMany({
        where: { role_id: STUDENT_ROLE_ID, deleted_at: null, added_under_centre: { in: ids } },
        select: { id: true, name: true, student_id: true, course_id: true, application_id: true, added_under_centre: true, created_at: true },
      }),
    ]);
    // Only these centres' students (and converted applicants) and applications reach Payment Status.
    const userIds = [...new Set([...students.map((s) => s.id), ...apps.map((a) => a.student_id).filter((id): id is number => typeof id === 'number' && id > 0)])];
    const paymentStatus = await this.loadPaymentStatus({ userIds, applicationIds: apps.map((a) => a.id) });
    const courseIds = [...new Set([...apps.map((a) => a.course_id), ...students.map((s) => s.course_id)].filter((x): x is number => typeof x === 'number' && x > 0))];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
      : [];
    const rows = buildApplicationPayments({
      centreNames: new Map(centres.map((c) => [c.id, (c.centre_name ?? '').trim()])),
      courseTitles: new Map(courses.map((c) => [c.id, (c.title ?? '').trim()])),
      apps,
      students,
      installments: Array.isArray(paymentStatus.installments) ? paymentStatus.installments as Array<Record<string, unknown>> : [],
    });
    return { rows };
  }
}

function centreRow(
  c: CentreRecord,
  facts: { students: number; groups: StageGroup[]; revenue: number; expiry: string; today: string },
): DashboardCentreRow {
  const applications = facts.groups.reduce((s, g) => s + g._count.id, 0);
  const approved = facts.groups.reduce((s, g) => s + (pipelineStageOf(g) === 'enrolled' ? g._count.id : 0), 0);
  const daysLeft = facts.expiry ? daysBetween(facts.today, facts.expiry) : null;
  return {
    id: c.id,
    code: c.centre_id ?? '',
    name: (c.centre_name ?? '').trim(),
    state: stateName(c.state_id),
    status: c.status === ACTIVE ? 'active' : 'inactive',
    enrollments: facts.students,
    applications,
    approved,
    conversion: conversionPct(approved, applications),
    revenue: roundMoney(facts.revenue),
    wallet: roundMoney(money(c.wallet_balance)),
    affiliationExpiry: facts.expiry,
    daysLeft,
    affiliation: affiliationState(daysLeft),
  };
}
