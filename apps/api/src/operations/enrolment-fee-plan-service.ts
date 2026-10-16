import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import {
  CHECKOUT_HOLD_MS,
  checkoutRowIdsFromNotes,
  classifyScheduleRow,
  computePayable,
  isFreeByPricing,
  resolveFeePrefill,
  validateEnrolmentPlan,
  type OfferingPricing,
  type PackagePricing,
  type PlanInput,
  type ScheduleRow,
} from './enrolment-fee-model.js';
import { buildStudentPaymentRowsFromPlan } from './operations-service.js';

// Per-enrolment payment plans for ADDITIONAL enrolments (TTII 2026-10-16).
//
// VIDHYA SHANKAR KS (users.id 228) was given course 25 through Add Enrolment.
// The admin "Generate / Edit Payment Plan" edits the student's ORIGINAL
// application (one course), so the added course had no way to get a fee: the
// portal called it Free and Pay Now had nothing to charge. This service plans
// such an enrolment directly in student_payments (user_id = users.id,
// course_id) — the rows Pay Now charges and every fee view reads. The original
// course keeps its application-wide plan; it is refused here.

type Db = PrismaClient | Prisma.TransactionClient;

class PlanRefusal extends Error {}

interface StudentRef {
  id: number;
  name: string | null;
  user_email: string | null;
  application_id: number | null;
}

export interface EnrolmentApplication {
  id: number;
  applicationCode: string;
  courseId: number;
  offeringId: number | null;
  combinationId: number | null;
  finalFee: number | null;
  paymentPlan: string | null;
  paymentStatus: string | null;
  paymentLinkUrl: string | null;
}

export interface CoursePricing {
  application: EnrolmentApplication | null;
  enrolmentOffering: OfferingPricing | null;
  combinationId: number | null;
  combinationGst: number | null;
  courseOfferings: OfferingPricing[];
  courseFee: { base_fee: number | null; discount: number | null } | null;
  course: { title: string; total_amount: number | null; sale_price: number | null } | null;
}

export interface SaveEnrolmentPlanInput {
  enrolId: string;
  plan: PlanInput;
}

const toNum = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toPositiveInt = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? Math.trunc(v) : Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const ymd = (v: unknown): string => {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  if (typeof v === 'string') {
    const s = v.trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) && !s.startsWith('0000') ? s : '';
  }
  return '';
};

const str = (v: unknown): string => {
  if (typeof v === 'string') return v;
  return typeof v === 'number' || typeof v === 'bigint' || typeof v === 'boolean' ? String(v) : '';
};

/**
 * The application the Student View treats as the student's own (the one its
 * application-wide plan edits): users.application_id, else the latest
 * application with the student's email — exactly getStudentDetail's lookup.
 */
export async function retainedApplication(db: Db, student: StudentRef): Promise<{ id: number; course_id: number | null } | null> {
  if (student.application_id) {
    return db.applications.findFirst({
      where: { id: student.application_id, deleted_at: null },
      select: { id: true, course_id: true },
    });
  }
  if (student.user_email) {
    return db.applications.findFirst({
      where: { user_email: student.user_email, deleted_at: null },
      orderBy: { created_at: 'desc' },
      select: { id: true, course_id: true },
    });
  }
  return null;
}

/**
 * Pricing facts per enrolled course: the student's own application for the
 * course (linked by student_id, by users.application_id, or — for Add
 * Enrolment rows, which carry no student_id — by email on an enrolled
 * application), its offering and packages, and every offering of the course.
 * `withCourseFacts` also loads the legacy course fee and combination GST.
 */
export async function loadCoursePricing(
  db: Db,
  student: Pick<StudentRef, 'id' | 'user_email' | 'application_id'>,
  courseIds: number[],
  opts: { withCourseFacts: boolean },
): Promise<Map<number, CoursePricing>> {
  const out = new Map<number, CoursePricing>();
  if (courseIds.length === 0) return out;
  const email = (student.user_email ?? '').trim();
  const apps = await db.applications.findMany({
    where: {
      deleted_at: null,
      course_id: { in: courseIds },
      OR: [
        { student_id: student.id },
        ...(student.application_id ? [{ id: student.application_id }] : []),
        ...(email ? [{ user_email: email, OR: [{ stage: 'enrolled' }, { is_converted: 1 }] }] : []),
      ],
    },
    orderBy: { id: 'desc' },
    select: {
      id: true, application_id: true, course_id: true, student_id: true, offering_id: true, certificate_combination_id: true,
      application_final_fee: true, payment_plan: true, payment_status: true, payment_link_url: true,
    },
  });
  const rank = (a: (typeof apps)[number]): number => (a.student_id === student.id ? 0 : a.id === student.application_id ? 1 : 2);
  const appByCourse = new Map<number, (typeof apps)[number]>();
  for (const a of apps) {
    if (a.course_id == null) continue;
    const cur = appByCourse.get(a.course_id);
    if (!cur || rank(a) < rank(cur)) appByCourse.set(a.course_id, a);
  }

  const appOfferingIds = [...new Set([...appByCourse.values()].map((a) => a.offering_id).filter((v): v is number => v != null && v > 0))];
  const offerings = await db.offerings.findMany({
    where: { deleted_at: null, OR: [{ id: { in: appOfferingIds } }, { course_id: { in: courseIds } }] },
    select: { id: true, course_id: true, title: true, offering_code: true, fee_category: true, base_fee: true, discount: true, offered_fee: true, pricing_amount: true },
  });
  const packages = offerings.length > 0
    ? await db.offering_certificate_packages.findMany({
        where: { deleted_at: null, offering_id: { in: offerings.map((o) => o.id) } },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { offering_id: true, combination_id: true, fee_category: true, base_fee: true, discount: true, offered_fee: true, gst_percent: true },
      })
    : [];
  const packagesByOffering = new Map<number, PackagePricing[]>();
  for (const p of packages) {
    const list = packagesByOffering.get(p.offering_id) ?? [];
    list.push({
      combination_id: p.combination_id,
      fee_category: p.fee_category,
      base_fee: toNum(p.base_fee),
      discount: toNum(p.discount),
      offered_fee: toNum(p.offered_fee),
      gst_percent: toNum(p.gst_percent),
    });
    packagesByOffering.set(p.offering_id, list);
  }
  const pricingById = new Map<number, OfferingPricing>(offerings.map((o) => [o.id, {
    id: o.id,
    course_id: o.course_id,
    title: o.title ?? o.offering_code ?? '',
    fee_category: o.fee_category,
    base_fee: toNum(o.base_fee),
    discount: toNum(o.discount),
    offered_fee: toNum(o.offered_fee),
    pricing_amount: toNum(o.pricing_amount),
    packages: packagesByOffering.get(o.id) ?? [],
  }]));

  const combinationIds = opts.withCourseFacts
    ? [...new Set([...appByCourse.values()].map((a) => a.certificate_combination_id).filter((v): v is number => v != null && v > 0))]
    : [];
  const [courseFees, courses, combinations] = opts.withCourseFacts
    ? await Promise.all([
        db.course_fees.findMany({ where: { course_id: { in: courseIds }, deleted_at: null }, select: { course_id: true, base_fee: true, discount: true } }),
        db.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true, total_amount: true, sale_price: true } }),
        combinationIds.length > 0
          ? db.certificate_combinations.findMany({ where: { id: { in: combinationIds } }, select: { id: true, gst_applicable: true, gst_percent: true } })
          : Promise.resolve([]),
      ])
    : [[], [], []];

  for (const courseId of courseIds) {
    const app = appByCourse.get(courseId) ?? null;
    const own = app?.offering_id ? pricingById.get(app.offering_id) ?? null : null;
    const combo = app?.certificate_combination_id ? combinations.find((c) => c.id === app.certificate_combination_id) : undefined;
    const fee = courseFees.find((f) => f.course_id === courseId);
    const course = courses.find((c) => c.id === courseId);
    out.set(courseId, {
      application: app
        ? {
            id: app.id,
            applicationCode: app.application_id ?? '',
            courseId,
            offeringId: app.offering_id,
            combinationId: app.certificate_combination_id,
            finalFee: toNum(app.application_final_fee),
            paymentPlan: app.payment_plan,
            paymentStatus: app.payment_status,
            paymentLinkUrl: app.payment_link_url,
          }
        : null,
      enrolmentOffering: own,
      combinationId: app?.certificate_combination_id ?? null,
      combinationGst: combo ? (combo.gst_applicable ? toNum(combo.gst_percent) ?? 0 : 0) : null,
      courseOfferings: [...pricingById.values()].filter((o) => o.course_id === courseId),
      courseFee: fee ? { base_fee: toNum(fee.base_fee), discount: toNum(fee.discount) } : null,
      course: course ? { title: course.title ?? '', total_amount: toNum(course.total_amount), sale_price: toNum(course.sale_price) } : null,
    });
  }
  return out;
}

/** Courses (of those given) whose enrolment is genuinely free for this student. */
export async function findFreeCourseIds(
  db: Db,
  student: Pick<StudentRef, 'id' | 'user_email' | 'application_id'>,
  courseIds: number[],
): Promise<Set<number>> {
  const pricing = await loadCoursePricing(db, student, courseIds, { withCourseFacts: false });
  const free = new Set<number>();
  for (const [courseId, p] of pricing) {
    if (isFreeByPricing({ enrolmentOffering: p.enrolmentOffering, combinationId: p.combinationId, courseOfferings: p.courseOfferings })) {
      free.add(courseId);
    }
  }
  return free;
}

interface RawScheduleRow {
  id: number;
  installment_details: string | null;
  amount: number | null;
  status: string | null;
  payment_mode: string | null;
  reference_number: string | null;
  receipt_url: string | null;
  due_date: Date | string | null;
  paid_date: Date | string | null;
}

/** The live schedule for (user, course). $queryRaw + NULLIF: legacy rows hold
 *  '0000-00-00' dates that crash Prisma's findMany. `lock` takes row locks for
 *  the save transaction. */
async function readSchedule(db: Db, userId: number, courseId: number, lock: boolean): Promise<ScheduleRow[]> {
  const rows = lock
    ? await db.$queryRaw<RawScheduleRow[]>`
        SELECT id, installment_details, amount, status, payment_mode, reference_number, receipt_url,
               NULLIF(due_date, '0000-00-00') AS due_date,
               NULLIF(paid_date, '0000-00-00') AS paid_date
        FROM student_payments
        WHERE user_id = ${userId} AND course_id = ${courseId} AND deleted_at IS NULL
        ORDER BY id ASC
        FOR UPDATE`
    : await db.$queryRaw<RawScheduleRow[]>`
        SELECT id, installment_details, amount, status, payment_mode, reference_number, receipt_url,
               NULLIF(due_date, '0000-00-00') AS due_date,
               NULLIF(paid_date, '0000-00-00') AS paid_date
        FROM student_payments
        WHERE user_id = ${userId} AND course_id = ${courseId} AND deleted_at IS NULL
        ORDER BY id ASC`;
  return rows.map((r) => ({
    id: Number(r.id),
    label: str(r.installment_details),
    amount: toNum(r.amount) ?? 0,
    status: str(r.status),
    dueDate: ymd(r.due_date),
    paidDate: ymd(r.paid_date),
    paymentMode: str(r.payment_mode),
    referenceNumber: str(r.reference_number),
    receiptUrl: str(r.receipt_url),
  }));
}

/** Rows a checkout is paying: a completed order, or a pending one young enough
 *  to still be paid. Only `notes` is read, so no legacy date is hydrated. */
async function checkoutHeldRowIds(db: Db, userId: number, courseId: number, now: Date): Promise<Set<number>> {
  const orders = await db.create_order.findMany({
    where: {
      user_id: userId,
      course_id: courseId,
      deleted_at: null,
      OR: [
        { order_status: 'completed' },
        { order_status: 'pending', created_at: { gte: new Date(now.getTime() - CHECKOUT_HOLD_MS) } },
      ],
    },
    select: { notes: true },
  });
  return checkoutRowIdsFromNotes(orders.map((o) => o.notes));
}

interface ApplicationReceipt {
  applicationCode: string;
  received: number;
  paid: boolean;
  pendingApproval: boolean;
  linkSent: boolean;
}

/**
 * Money recorded on the enrolment's own application (an Add Enrolment payment
 * link or a Finance-approved manual payment). Those flows never write
 * student_payments, so the plan must not be generated over them blind.
 */
function applicationReceipt(app: EnrolmentApplication | null, now: Date): ApplicationReceipt | null {
  if (!app) return null;
  // A dry run of the conversion mapping, only to total what was received.
  const rows = buildStudentPaymentRowsFromPlan(app.paymentPlan, app.paymentStatus, { studentUserId: 0, courseId: app.courseId, actorUserId: null, now });
  const received = rows.filter((r) => r.status === 'Paid').reduce((sum, r) => sum + (r.amount ?? 0), 0);
  return {
    applicationCode: app.applicationCode || `#${app.id}`,
    received,
    paid: received > 0 || (app.paymentStatus ?? '') === 'paid',
    pendingApproval: (app.paymentStatus ?? '') === 'pending_approval',
    linkSent: (app.paymentLinkUrl ?? '') !== '',
  };
}

interface PlanContext {
  enrol: { id: number; user_id: number; course_id: number; enrollment_id: string | null };
  student: StudentRef;
  pricing: CoursePricing;
}

export class EnrolmentFeePlanService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  private async loadContext(enrolId: string): Promise<{ ok: true; ctx: PlanContext } | { ok: false; message: string }> {
    const enrolPk = toPositiveInt(enrolId);
    if (!enrolPk) return { ok: false, message: 'Invalid enrolment id.' };
    const enrol = await this.prisma.enrol.findFirst({
      where: { id: enrolPk, deleted_at: null },
      select: { id: true, user_id: true, course_id: true, enrollment_id: true },
    });
    if (!enrol?.user_id || !enrol.course_id) return { ok: false, message: 'Enrolment not found.' };
    const student = await this.prisma.users.findFirst({
      where: { id: enrol.user_id, deleted_at: null, role_id: 2 },
      select: { id: true, name: true, user_email: true, application_id: true },
    });
    if (!student) return { ok: false, message: 'Student not found.' };
    const retained = await retainedApplication(this.prisma, student);
    if (retained && retained.course_id === enrol.course_id) {
      return {
        ok: false,
        message: "This is the student's original course. Its fee is planned with Generate / Edit Payment Plan on the student's application.",
      };
    }
    const pricing = (await loadCoursePricing(this.prisma, student, [enrol.course_id], { withCourseFacts: true })).get(enrol.course_id);
    if (!pricing) return { ok: false, message: 'Enrolment not found.' };
    return { ok: true, ctx: { enrol: { ...enrol, user_id: enrol.user_id, course_id: enrol.course_id }, student, pricing } };
  }

  /** Everything the plan dialog needs: the current schedule with each row's
   *  lock, the prefill, and any money recorded outside the schedule. */
  async getPlan(enrolId: string): Promise<Record<string, unknown>> {
    const loaded = await this.loadContext(enrolId);
    if (!loaded.ok) return { status: 0, message: loaded.message };
    const { enrol, student, pricing } = loaded.ctx;
    const now = new Date();
    const [rows, held] = await Promise.all([
      readSchedule(this.prisma, enrol.user_id, enrol.course_id, false),
      checkoutHeldRowIds(this.prisma, enrol.user_id, enrol.course_id, now),
    ]);
    const classified = rows.map((r) => classifyScheduleRow(r, held));
    const prefill = resolveFeePrefill({
      enrolmentOffering: pricing.enrolmentOffering,
      combinationId: pricing.combinationId,
      combinationGst: pricing.combinationGst,
      courseOfferings: pricing.courseOfferings,
      courseFee: pricing.courseFee,
      course: pricing.course,
    });
    const receipt = applicationReceipt(pricing.application, now);
    return {
      status: 1,
      message: 'success',
      data: {
        enrol_id: enrol.id,
        user_id: enrol.user_id,
        course_id: enrol.course_id,
        course_title: pricing.course?.title ?? '',
        enrollment_id: enrol.enrollment_id ?? '',
        student_name: student.name ?? '',
        prefill: {
          total_fee: prefill.totalFee,
          discount: prefill.discount,
          gst_percent: prefill.gstPercent,
          source: prefill.source,
          source_label: prefill.sourceLabel,
        },
        agreed_fee: pricing.application?.finalFee != null && pricing.application.finalFee > 0 ? pricing.application.finalFee : null,
        free_offering: isFreeByPricing({
          enrolmentOffering: pricing.enrolmentOffering,
          combinationId: pricing.combinationId,
          courseOfferings: pricing.courseOfferings,
        }),
        application_payment: receipt
          ? {
              application_code: receipt.applicationCode,
              received: receipt.received,
              paid: receipt.paid,
              pending_approval: receipt.pendingApproval,
              link_sent: receipt.linkSent,
            }
          : null,
        rows: classified.map((r) => ({
          id: r.id,
          label: r.label,
          amount: r.amount,
          due_date: r.dueDate,
          paid_date: r.paidDate,
          status: r.status,
          payment_mode: r.paymentMode,
          locked: r.locked,
          lock_reason: r.lockReason,
        })),
        checkout_hold_hours: CHECKOUT_HOLD_MS / 3_600_000,
      },
    };
  }

  /**
   * Save the plan in ONE transaction: lock the schedule, keep every Paid row
   * (and every row with a payment against it) exactly, refuse totals that do
   * not add up, soft-delete only the replaceable Pending rows (guarded, so a
   * row that changed meanwhile aborts the save) and insert the new rows.
   */
  async savePlan(actorUserId: string, input: SaveEnrolmentPlanInput): Promise<Record<string, unknown>> {
    const actor = toPositiveInt(actorUserId);
    if (!actor) return { status: 0, message: 'Invalid user.' };
    // Cheap input check before touching the database.
    const breakdown = computePayable(input.plan.totalFee, input.plan.discount, input.plan.gstPercent);
    if ('error' in breakdown) return { status: 0, message: breakdown.error };
    const loaded = await this.loadContext(input.enrolId);
    if (!loaded.ok) return { status: 0, message: loaded.message };
    const { enrol, pricing } = loaded.ctx;
    const userId = enrol.user_id;
    const courseId = enrol.course_id;
    const now = new Date();
    const receipt = applicationReceipt(pricing.application, now);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const rows = await readSchedule(tx, userId, courseId, true);
        const held = await checkoutHeldRowIds(tx, userId, courseId, now);
        const classified = rows.map((r) => classifyScheduleRow(r, held));
        const kept = classified.filter((r) => r.locked);
        const replaceable = classified.filter((r) => !r.locked);

        if (receipt?.paid && !kept.some((r) => r.lockReason === 'paid')) {
          const amount = receipt.received > 0 ? ` of ₹${receipt.received.toLocaleString('en-IN')}` : '';
          throw new PlanRefusal(
            `A payment${amount} is recorded on this enrolment's application (${receipt.applicationCode}) but is not in its fee schedule yet. `
            + 'Add it as a Paid instalment first (Payments → Add Instalment) so the student is not charged twice, then save the plan.',
          );
        }

        const plan = validateEnrolmentPlan(input.plan, kept);
        if (!plan.ok) throw new PlanRefusal(plan.message);
        if (replaceable.length === 0 && plan.rows.length === 0) {
          throw new PlanRefusal('Nothing to change: the kept instalments already cover the payable total.');
        }

        if (replaceable.length > 0) {
          const ids = replaceable.map((r) => r.id);
          const replaced = await tx.$executeRaw`
            UPDATE student_payments
            SET deleted_at = ${now}, deleted_by = ${actor}, updated_by = ${actor}, updated_at = ${now}
            WHERE id IN (${Prisma.join(ids)})
              AND user_id = ${userId}
              AND course_id = ${courseId}
              AND deleted_at IS NULL
              AND (status IS NULL OR LOWER(TRIM(status)) IN ('', 'pending', 'overdue', 'due'))
              AND NULLIF(paid_date, '0000-00-00') IS NULL
              AND COALESCE(TRIM(payment_mode), '') = ''
              AND COALESCE(TRIM(reference_number), '') = ''
              AND COALESCE(TRIM(receipt_url), '') = ''`;
          if (replaced !== ids.length) {
            throw new PlanRefusal('The fee schedule changed while you were editing it. Reload and try again.');
          }
        }

        if (plan.rows.length > 0) {
          await tx.student_payments.createMany({
            data: plan.rows.map((r) => ({
              user_id: userId,
              course_id: courseId,
              installment_details: r.label,
              amount: r.amount,
              due_date: r.dueDate,
              status: 'Pending',
              payment_mode: null,
              paid_date: null,
              reference_number: null,
              receipt_url: null,
              payment_to: 'ttii',
              created_by: actor,
              updated_by: actor,
              created_at: now,
              updated_at: now,
            })),
          });
        }
        return { created: plan.rows.length, replaced: replaceable.length, kept: kept.length, payable: plan.breakdown.payable };
      });
      return { status: 1, message: 'Payment plan saved.', data: result };
    } catch (err) {
      if (err instanceof PlanRefusal) return { status: 0, message: err.message };
      throw err;
    }
  }
}
