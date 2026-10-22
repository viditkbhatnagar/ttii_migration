import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import {
  applicationPaymentInstalments, buildApplicationPayments, type ApplicationPaymentsInput, type PaymentStatusLoader,
} from './centre-application-payments.js';
import { roundMoney } from './centre-dashboard-model.js';
import {
  NO_CENTRE, buildLedger, collectionTotals, isCollectionKey, ok, pendingTopUps, refuse, sortInstalments,
  toCollectionRow, toFundRequestView, toInstalment,
  type CollectionInstalment, type CollectionRow, type CollectionTotals, type FundRequestView, type Outcome, type WalletLedger,
} from './centre-portal-money-model.js';

// Centre portal → Wallet & Payment (Naji's centre login design, 2026-10-22).
// READ-ONLY: every query is scoped to the CALLER's centre (users.centre_id of
// the logged-in centre user) — a centre id from the client is never read.
// Fund requests are still raised through the existing POST /centre/wallet/add.
//
// Student fee collections reuse the Fees → Payment Status computation
// (OperationsService.listPaymentStatus) narrowed to this centre's students
// (users.added_under_centre) and applications (applications.added_under_centre),
// and the SAME attribution as the admin Application Payments tab
// (centre-application-payments.ts), so the centre and TTII see one number.

const STUDENT_ROLE_ID = 2;
const CENTRE_ROLE_ID = 7;

export interface CentreRef {
  id: number;
  code: string;
  name: string;
  walletBalance: string | null;
}

export interface WalletLedgerView extends WalletLedger {
  centre: { id: number; code: string; name: string };
  fundRequests: FundRequestView[];
  pendingTopUps: { count: number; amount: number };
}

export interface CollectionsView {
  rows: CollectionRow[];
  totals: CollectionTotals;
}

export interface CollectionDetail {
  row: CollectionRow;
  email: string;
  phone: string;
  instalments: CollectionInstalment[];
}

export interface CentrePortalMoneyDeps {
  prisma?: PrismaClient;
  /** The Fees → Payment Status computation (OperationsService.listPaymentStatus), narrowed to a scope. */
  loadPaymentStatus: PaymentStatusLoader;
}

type AppRecord = ApplicationPaymentsInput['apps'][number] & { user_email: string | null; phone: string | null };
type StudentRecord = ApplicationPaymentsInput['students'][number] & { user_email: string | null; phone: string | null };

interface CollectionData {
  rows: CollectionRow[];
  members: Map<string, Array<Record<string, unknown>>>;
  apps: AppRecord[];
  students: StudentRecord[];
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export class CentrePortalMoneyService {
  private readonly prisma: PrismaClient;
  private readonly loadPaymentStatus: PaymentStatusLoader;

  constructor(deps: CentrePortalMoneyDeps) {
    this.prisma = deps.prisma ?? getPrismaClient();
    this.loadPaymentStatus = deps.loadPaymentStatus;
  }

  /** The caller's own centre: a live centre login (role 7) whose users.centre_id names a live centre. */
  async centreOf(actorUserId: number | null): Promise<CentreRef | null> {
    if (!actorUserId) return null;
    const user = await this.prisma.users.findFirst({
      where: { id: actorUserId, role_id: CENTRE_ROLE_ID, deleted_at: null },
      select: { centre_id: true },
    });
    const centreId = positiveInt(user?.centre_id);
    if (!centreId) return null;
    const centre = await this.prisma.centres.findFirst({
      where: { id: centreId, deleted_at: null },
      select: { id: true, centre_id: true, centre_name: true, wallet_balance: true },
    });
    if (!centre) return null;
    return {
      id: centre.id,
      code: (centre.centre_id ?? '').trim(),
      name: (centre.centre_name ?? '').trim(),
      walletBalance: centre.wallet_balance,
    };
  }

  /** Wallet balance, credits / debits (with a running balance only when they reconcile) and top-up requests. */
  async ledger(actorUserId: number | null): Promise<Outcome<WalletLedgerView>> {
    const centre = await this.centreOf(actorUserId);
    if (!centre) return refuse(NO_CENTRE);
    const [txns, requests] = await Promise.all([
      this.prisma.wallet_transactions.findMany({
        where: { centre_id: centre.id, deleted_at: null },
        select: { id: true, transaction_type: true, amount: true, remarks: true, created_at: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.centre_fund_requests.findMany({
        where: { centre_id: centre.id, deleted_at: null },
        select: { id: true, amount: true, date: true, transaction_receipt: true, description: true, attachment_file: true, status: true, created_at: true },
        orderBy: { id: 'desc' },
      }),
    ]);
    const fundRequests = requests.map((r) => toFundRequestView({ ...r, status: r.status === null ? null : String(r.status) }));
    return ok({
      ...buildLedger(txns, centre.walletBalance),
      centre: { id: centre.id, code: centre.code, name: centre.name },
      fundRequests,
      pendingTopUps: pendingTopUps(fundRequests),
    });
  }

  /** Fee / received / balance per centre application or student, plus the totals for the Overview. */
  async collections(actorUserId: number | null): Promise<Outcome<CollectionsView>> {
    const centre = await this.centreOf(actorUserId);
    if (!centre) return refuse(NO_CENTRE);
    const { rows } = await this.loadCollections(centre);
    return ok({ rows, totals: collectionTotals(rows) });
  }

  /** One row of the collections with its instalments — only when the row belongs to the caller's centre. */
  async collectionDetail(actorUserId: number | null, key: string): Promise<Outcome<CollectionDetail>> {
    if (!isCollectionKey(key)) return refuse('Payment record not found.');
    const centre = await this.centreOf(actorUserId);
    if (!centre) return refuse(NO_CENTRE);
    const data = await this.loadCollections(centre);
    const row = data.rows.find((r) => r.key === key);
    if (!row) return refuse('Payment record not found.');
    const members = data.members.get(key) ?? [];
    const ledgerIds = members.map((m) => m.id).filter((id): id is number => typeof id === 'number' && Number.isInteger(id));
    // Only reference / receipt columns: student_payments dates can hold '0000-00-00', which Prisma cannot read.
    const extras = ledgerIds.length > 0
      ? await this.prisma.student_payments.findMany({
        where: { id: { in: ledgerIds } },
        select: { id: true, reference_number: true, receipt_url: true },
      })
      : [];
    const extraById = new Map(extras.map((e) => [e.id, e]));
    const instalments = sortInstalments(members.map((m) => {
      const extra = typeof m.id === 'number' ? extraById.get(m.id) : undefined;
      return toInstalment(m, { reference: extra?.reference_number ?? null, receipt: extra?.receipt_url ?? null });
    }));
    return ok({ row, ...this.contactOf(key, data), instalments });
  }

  private contactOf(key: string, data: CollectionData): { email: string; phone: string } {
    const clean = (v: string | null | undefined) => (v ?? '').trim();
    const app = /^app-(\d+)$/.exec(key);
    if (app) {
      const record = data.apps.find((a) => a.id === Number(app[1]));
      const student = record?.student_id ? data.students.find((s) => s.id === record.student_id) : undefined;
      return {
        email: clean(student?.user_email) || clean(record?.user_email),
        phone: clean(student?.phone) || clean(record?.phone),
      };
    }
    const user = /^user-(\d+)-/.exec(key);
    const student = user ? data.students.find((s) => s.id === Number(user[1])) : undefined;
    return { email: clean(student?.user_email), phone: clean(student?.phone) };
  }

  private async loadCollections(centre: CentreRef): Promise<CollectionData> {
    const [apps, students] = await Promise.all([
      this.prisma.applications.findMany({
        where: { deleted_at: null, added_under_centre: centre.id },
        select: {
          id: true, application_id: true, name: true, added_under_centre: true, course_id: true, stage: true,
          status: true, is_converted: true, student_id: true, created_at: true, user_email: true, phone: true,
        },
      }),
      this.prisma.users.findMany({
        where: { role_id: STUDENT_ROLE_ID, deleted_at: null, added_under_centre: centre.id },
        select: {
          id: true, name: true, student_id: true, course_id: true, application_id: true, added_under_centre: true,
          created_at: true, user_email: true, phone: true,
        },
      }),
    ]);
    const appRecords = apps.map((a) => ({ ...a, status: a.status === null ? null : String(a.status) })) as AppRecord[];
    const studentRecords = students as StudentRecord[];
    if (appRecords.length === 0 && studentRecords.length === 0) {
      return { rows: [], members: new Map(), apps: appRecords, students: studentRecords };
    }
    const userIds = [...new Set([
      ...studentRecords.map((s) => s.id),
      ...appRecords.map((a) => a.student_id).filter((id): id is number => typeof id === 'number' && id > 0),
    ])];
    const paymentStatus = await this.loadPaymentStatus({ userIds, applicationIds: appRecords.map((a) => a.id) });
    const courseIds = [...new Set(
      [...appRecords.map((a) => a.course_id), ...studentRecords.map((s) => s.course_id)]
        .filter((x): x is number => typeof x === 'number' && x > 0),
    )];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
      : [];
    const input: ApplicationPaymentsInput = {
      centreNames: new Map([[centre.id, centre.name]]),
      courseTitles: new Map(courses.map((c) => [c.id, (c.title ?? '').trim()])),
      apps: appRecords,
      students: studentRecords,
      installments: Array.isArray(paymentStatus.installments) ? paymentStatus.installments as Array<Record<string, unknown>> : [],
    };
    const members = applicationPaymentInstalments(input);
    const rows = buildApplicationPayments(input).map((r) => toCollectionRow(
      { ...r, fee: roundMoney(r.fee), paid: roundMoney(r.paid), balance: roundMoney(r.balance) },
      (members.get(r.key) ?? []).map((m) => toInstalment(m)),
    ));
    return { rows, members, apps: appRecords, students: studentRecords };
  }
}
