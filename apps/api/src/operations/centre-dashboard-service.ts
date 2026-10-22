import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import {
  AFFILIATION_NOT_SET_UP, PIPELINE_STAGES, affiliationState, conversionPct, dateYmd, daysBetween, feePeriod, feeStatus,
  inWindow, isCredit, isInProgress, isMissingTable, istYmd, laterYmd, looseYmd, money, parsePeriod, periodWindow,
  pipelineStageOf, roundMoney, stateName, toPositiveInt, trendMonths,
  type AffiliationState, type DashboardPeriod, type FeeStatus, type PipelineStage,
} from './centre-dashboard-model.js';
import { buildActivity, type ActivityInput, type DashboardActivity } from './centre-dashboard-activity.js';
import { buildApplicationPayments, type ApplicationPaymentRow, type PaymentStatusLoader } from './centre-application-payments.js';

export type { DashboardActivity } from './centre-dashboard-activity.js';
export type { ApplicationPaymentRow, PaymentStatusLoader } from './centre-application-payments.js';

// Centres v2 (Naji 2026-10-22): the Centre Dashboard and the money tabs of
// Wallet & Payment, on real data only. READ-ONLY — every read is a Prisma
// query builder call; nothing here writes.
//
// What the prototype fabricated and what is read instead:
//  - "Collected from Centres": centres pay TTII nothing per application today,
//    so it is wallet top-ups credited (wallet_transactions credits) plus
//    affiliation fees recorded paid (centre_agreements.fee_paid_on), both in
//    the period;
//  - revenue trend: the same two sources by IST month — no baseline;
//  - pipeline: centre applications (applications.added_under_centre) by their
//    REAL stage;
//  - affiliation expiry: the later of centres.date_of_expiry and the newest
//    live centre_agreements.expiry_date.
// centre_agreements / centre_onboarding* do not exist until
// 2026-10-22-centre-onboarding-affiliation.sql runs: those reads answer empty
// (affiliationReady = false), never a 500.

const STUDENT_ROLE_ID = 2;
const LOW_WALLET_UNDER = 5000;
const RENEWALS_SHOWN = 5;

export interface DashboardCentreOption { id: number; code: string; name: string }

export interface DashboardKpis {
  totalCentres: number;
  activeCentres: number;
  inactiveCentres: number;
  enrollments: number;
  inProgress: number;
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
}

export interface CentreDashboardDeps {
  prisma?: PrismaClient;
  /** The Fees → Payment Status computation (OperationsService.listPaymentStatus). */
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
          fee_amount: true, fee_paid: true, fee_paid_on: true,
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

  /** The newest onboarding events, with their lead ([] before the migration). */
  private async loadOnboardingEvents(centreId: number | null): Promise<ActivityInput['onboarding']> {
    try {
      const events = await this.prisma.centre_onboarding_events.findMany({
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take: 20,
        select: { id: true, onboarding_id: true, message: true, created_at: true },
      });
      const leadIds = [...new Set(events.map((e) => e.onboarding_id))];
      const leads = leadIds.length > 0
        ? await this.prisma.centre_onboarding.findMany({
          where: { id: { in: leadIds } },
          select: { id: true, centre_name: true, ref_no: true, centre_id: true },
        })
        : [];
      const leadMap = new Map(leads.map((l) => [l.id, l]));
      return events.flatMap((e) => {
        const lead = leadMap.get(e.onboarding_id);
        if (!lead || (centreId !== null && lead.centre_id !== centreId)) return [];
        return [{ id: e.id, at: e.created_at, name: lead.centre_name, ref: lead.ref_no ?? '', message: e.message }];
      });
    } catch (error: unknown) {
      if (isMissingTable(error)) return [];
      throw error;
    }
  }

  async dashboard(query: { period?: unknown; centreId?: unknown }, now: Date = new Date()): Promise<CentreDashboard> {
    const period = parsePeriod(query.period);
    const window = periodWindow(period, now);
    const requested = toPositiveInt(query.centreId);
    const allCentres = await this.loadCentres();
    const centres = requested > 0 ? allCentres.filter((c) => c.id === requested) : allCentres;
    const ids = centres.map((c) => c.id);
    const none = ids.length === 0;

    const [students, apps, requests, txns, agreements, onboarding] = await Promise.all([
      none ? [] : this.prisma.users.groupBy({
        by: ['added_under_centre'],
        where: { role_id: STUDENT_ROLE_ID, deleted_at: null, added_under_centre: { in: ids } },
        _count: { id: true },
      }),
      none ? [] : this.prisma.applications.findMany({
        where: { deleted_at: null, added_under_centre: { in: ids } },
        select: {
          id: true, application_id: true, name: true, added_under_centre: true, stage: true, status: true,
          is_converted: true, created_at: true, converted_at: true,
        },
      }),
      none ? [] : this.prisma.centre_fund_requests.findMany({
        where: { deleted_at: null, centre_id: { in: ids } },
        select: { id: true, centre_id: true, amount: true, status: true, created_at: true, updated_at: true },
      }),
      none ? [] : this.prisma.wallet_transactions.findMany({
        where: { deleted_at: null, centre_id: { in: ids } },
        select: { id: true, centre_id: true, transaction_type: true, amount: true, remarks: true, created_at: true },
      }),
      this.loadAgreements(ids, requested === 0),
      this.loadOnboardingEvents(requested > 0 ? requested : null),
    ]);

    const today = window.toYmd;
    const studentCount = new Map<number, number>();
    for (const g of students) {
      if (g.added_under_centre !== null) studentCount.set(g.added_under_centre, g._count.id);
    }
    const staged = apps.map((a) => ({ ...a, pipelineStage: pipelineStageOf(a), createdYmd: istYmd(a.created_at) }));
    const credits = txns.filter((t) => isCredit(t.transaction_type));
    const paidFees = agreements.rows.filter((a) => a.fee_paid);
    const latestExpiry = new Map<number, string>();
    for (const a of agreements.rows) {
      if (a.centre_id === null) continue;
      latestExpiry.set(a.centre_id, laterYmd(latestExpiry.get(a.centre_id) ?? '', dateYmd(a.expiry_date)));
    }

    const rows = centres.map((c) => centreRow(c, {
      students: studentCount.get(c.id) ?? 0,
      apps: staged.filter((a) => a.added_under_centre === c.id),
      revenue: credits.filter((t) => t.centre_id === c.id).reduce((s, t) => s + money(t.amount), 0),
      expiry: laterYmd(looseYmd(c.date_of_expiry), latestExpiry.get(c.id) ?? ''),
      today,
    }));

    const inPeriod = staged.filter((a) => inWindow(a.createdYmd, window));
    const awaitingApproval = staged.filter((a) => a.pipelineStage === 'approval_waiting').length;
    const pendingTopUps = requests.filter((r) => r.status === 'pending').length;
    const collectedTopUps = roundMoney(credits.filter((t) => inWindow(istYmd(t.created_at), window)).reduce((s, t) => s + money(t.amount), 0));
    const collectedAffiliation = roundMoney(paidFees.filter((a) => inWindow(dateYmd(a.fee_paid_on), window)).reduce((s, a) => s + money(a.fee_amount), 0));
    const active = centres.filter((c) => c.status === 1).length;
    const dated = rows.filter((r): r is DashboardCentreRow & { daysLeft: number } => r.daysLeft !== null);

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
        inProgress: inPeriod.filter((a) => isInProgress(a.pipelineStage)).length,
        awaitingApproval,
        collected: roundMoney(collectedTopUps + collectedAffiliation),
        collectedTopUps,
        collectedAffiliation,
        walletTotal: roundMoney(rows.reduce((s, r) => s + r.wallet, 0)),
        pendingTopUps,
      },
      pipeline: PIPELINE_STAGES.map((stage) => ({ stage, count: inPeriod.filter((a) => a.pipelineStage === stage).length })),
      actions: {
        awaitingApproval,
        pendingTopUps,
        expiringSoon: dated.filter((r) => r.daysLeft >= 0 && r.daysLeft <= 60).length,
        expired: dated.filter((r) => r.daysLeft < 0).length,
      },
      trend: trendMonths(now).map((m) => ({
        ...m,
        topUps: roundMoney(credits.filter((t) => istYmd(t.created_at).startsWith(m.month)).reduce((s, t) => s + money(t.amount), 0)),
        affiliation: roundMoney(paidFees.filter((a) => dateYmd(a.fee_paid_on).startsWith(m.month)).reduce((s, a) => s + money(a.fee_amount), 0)),
      })),
      rows,
      renewals: [...dated].sort((a, b) => a.daysLeft - b.daysLeft || a.name.localeCompare(b.name)).slice(0, RENEWALS_SHOWN)
        .map((r) => ({ id: r.id, name: r.name, expiry: r.affiliationExpiry, daysLeft: r.daysLeft })),
      lowWallets: rows.filter((r) => r.wallet < LOW_WALLET_UNDER).sort((a, b) => a.wallet - b.wallet)
        .map((r) => ({ id: r.id, name: r.name, balance: r.wallet })),
      activity: buildActivity({
        centreNames: new Map(centres.map((c) => [c.id, (c.centre_name ?? '').trim()])),
        requests, txns, apps, onboarding,
      }),
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
    const [apps, students, paymentStatus] = await Promise.all([
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
      this.loadPaymentStatus(),
    ]);
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
  facts: { students: number; apps: Array<{ pipelineStage: PipelineStage }>; revenue: number; expiry: string; today: string },
): DashboardCentreRow {
  const approved = facts.apps.filter((a) => a.pipelineStage === 'enrolled').length;
  const daysLeft = facts.expiry ? daysBetween(facts.today, facts.expiry) : null;
  return {
    id: c.id,
    code: c.centre_id ?? '',
    name: (c.centre_name ?? '').trim(),
    state: stateName(c.state_id),
    status: c.status === 1 ? 'active' : 'inactive',
    enrollments: facts.students,
    applications: facts.apps.length,
    approved,
    conversion: conversionPct(approved, facts.apps.length),
    revenue: roundMoney(facts.revenue),
    wallet: roundMoney(money(c.wallet_balance)),
    affiliationExpiry: facts.expiry,
    daysLeft,
    affiliation: affiliationState(daysLeft),
  };
}
