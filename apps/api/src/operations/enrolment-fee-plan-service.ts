import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import {
  CHECKOUT_HOLD_MS,
  agreedPayableOf,
  classifyScheduleRow,
  computePayable,
  dueDateWindow,
  isFreeByPricing,
  istToday,
  planBlockReason,
  usesOwnFeePlan,
  validateEnrolmentPlan,
  type PlanInput,
  type ReceivedMoney,
  type ScheduleRow,
} from './enrolment-fee-model.js';
import {
  checkoutHeldRowIds,
  checkoutHeldRowIdsNow,
  loadCoursePricing,
  onlinePaidTotal,
  originalApplication,
  prefillFor,
  readSchedule,
  type CoursePricing,
  type EnrolmentApplication,
  type StudentRef,
} from './enrolment-fee-data.js';
import { buildStudentPaymentRowsFromPlan, readInstalmentLedger } from './operations-service.js';

// Per-enrolment payment plans (TTII 2026-10-16).
//
// VIDHYA SHANKAR KS (users.id 228) was given course 25 through Add Enrolment.
// The admin "Generate / Edit Payment Plan" edits the student's ORIGINAL
// application, so the added course had no way to get a fee: the portal called
// it Free and Pay Now had nothing to charge. This service plans an enrolment
// directly in student_payments (user_id = users.id, course_id) — the rows Pay
// Now charges and every fee view reads. It is refused only for the course of
// the application users.application_id names, while that application's plan
// has a schedule (the plan is the authority for that course).
//
// The save transaction runs database statements only — no network call — so
// the FOR UPDATE on student_payments (no index on user_id/course_id, so it
// locks broadly) is held for milliseconds.

class PlanRefusal extends Error {}

export interface SaveEnrolmentPlanInput {
  enrolId: string;
  plan: PlanInput;
}

const toPositiveInt = (v: string | number | null | undefined): number => {
  const n = typeof v === 'number' ? Math.trunc(v) : Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const sumPaid = (rows: ReadonlyArray<{ amount: number; lockReason: string | null }>): number =>
  rows.filter((r) => r.lockReason === 'paid').reduce((sum, r) => sum + r.amount, 0);

/**
 * Money on the enrolment's own application: Finance-approved payments (as the
 * conversion mapping would record them), a payment awaiting approval, and a
 * payment link that can still be paid. None of these write student_payments
 * for an enrolled student (approveManualPayment and the link webhook update
 * only the application).
 */
export function applicationMoney(app: EnrolmentApplication | null, now: Date): Omit<ReceivedMoney, 'online'> {
  if (!app) {
    return { application: 0, applicationPaidUnknown: false, applicationCode: '', pendingApproval: false, linkOutstanding: false, linkExpiresOn: '' };
  }
  let plan: Record<string, unknown> = {};
  if (app.paymentPlan) {
    try {
      const parsed: unknown = JSON.parse(app.paymentPlan);
      if (parsed && typeof parsed === 'object') plan = parsed as Record<string, unknown>;
    } catch {
      plan = {};
    }
  }
  const ledger = readInstalmentLedger(plan, app.paymentStatus ?? undefined);
  const received = buildStudentPaymentRowsFromPlan(app.paymentPlan, app.paymentStatus, { studentUserId: 0, courseId: app.courseId, actorUserId: null, now })
    .filter((r) => r.status === 'Paid')
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);
  // The link charges the instalment its link_targets entry names, else index 0.
  const targets = plan.link_targets && typeof plan.link_targets === 'object' ? (plan.link_targets as Record<string, unknown>) : {};
  const targetIndex = app.paymentLinkId ? Number(targets[app.paymentLinkId]) : Number.NaN;
  const linkIndex = Number.isInteger(targetIndex) && targetIndex > 0 ? targetIndex : 0;
  const linkSettled = ledger.some((e) => e.index === linkIndex && e.status === 'approved');
  const expires = app.paymentLinkExpiresAt;
  const linkLive = (app.paymentLinkUrl ?? '').trim() !== '' && (!expires || expires.getTime() > now.getTime());
  return {
    application: received,
    applicationPaidUnknown: received === 0 && ((app.paymentStatus ?? '') === 'paid' || ledger.some((e) => e.status === 'approved')),
    applicationCode: app.applicationCode || `#${app.id}`,
    pendingApproval: (app.paymentStatus ?? '') === 'pending_approval' || ledger.some((e) => e.status === 'pending_approval'),
    linkOutstanding: linkLive && !linkSettled,
    linkExpiresOn: expires ? istToday(expires) : '',
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
    const original = await originalApplication(this.prisma, student);
    if (!usesOwnFeePlan(enrol.course_id, original)) {
      return {
        ok: false,
        message: "This is the student's original course and its application payment plan has a schedule. Plan its fee with Generate / Edit Payment Plan on the student's application.",
      };
    }
    const pricing = (await loadCoursePricing(this.prisma, student, [enrol.course_id], { withCourseFacts: true })).get(enrol.course_id);
    if (!pricing) return { ok: false, message: 'Enrolment not found.' };
    return { ok: true, ctx: { enrol: { ...enrol, user_id: enrol.user_id, course_id: enrol.course_id }, student, pricing } };
  }

  /** Everything the plan dialog needs: the current schedule with each row's
   *  lock, the prefill, the money recorded outside the schedule and whether it
   *  blocks a save. */
  async getPlan(enrolId: string): Promise<Record<string, unknown>> {
    const loaded = await this.loadContext(enrolId);
    if (!loaded.ok) return { status: 0, message: loaded.message };
    const { enrol, student, pricing } = loaded.ctx;
    const now = new Date();
    const [rows, held, online] = await Promise.all([
      readSchedule(this.prisma, enrol.user_id, enrol.course_id, false),
      checkoutHeldRowIds(this.prisma, enrol.user_id, enrol.course_id, now),
      onlinePaidTotal(this.prisma, enrol.user_id, enrol.course_id),
    ]);
    const classified = rows.map((r) => classifyScheduleRow(r, held));
    const paidRowsTotal = sumPaid(classified);
    const money = { ...applicationMoney(pricing.application, now), online };
    const prefill = prefillFor(pricing);
    const today = istToday(now);
    const window = dueDateWindow(today);
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
        // The agreed fee (application_final_fee: the last saved plan, else the
        // fee entered on the application); has_application says whether a
        // save can record one.
        agreed_fee: agreedPayableOf(pricing.application?.finalFee),
        has_application: pricing.application !== null,
        free_offering: isFreeByPricing({
          enrolmentOffering: pricing.enrolmentOffering,
          combinationId: pricing.combinationId,
          courseOfferings: pricing.courseOfferings,
        }),
        money: {
          application_code: money.applicationCode,
          application: money.application,
          online: money.online,
          schedule_paid: paidRowsTotal,
          pending_approval: money.pendingApproval,
          link_outstanding: money.linkOutstanding,
          link_expires_on: money.linkExpiresOn,
        },
        block_reason: planBlockReason(money, paidRowsTotal),
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
        today,
        due_from: window.from,
        due_to: window.to,
        checkout_hold_hours: CHECKOUT_HOLD_MS / 3_600_000,
      },
    };
  }

  /**
   * Save the plan in ONE transaction: lock the schedule; refuse while money
   * recorded outside it (checkout, application payments) is not covered by Paid
   * rows or is still in flight; keep every Paid row (and every row with a
   * payment against it) exactly; refuse totals that do not add up; soft-delete
   * only the replaceable Pending rows (guarded, so a row that changed aborts
   * the save); insert the new rows; and, last, refuse if a checkout started on
   * a replaced row meanwhile.
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
    const appMoney = applicationMoney(pricing.application, now);
    const app = pricing.application;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const rows: ScheduleRow[] = await readSchedule(tx, userId, courseId, true);
        const held = await checkoutHeldRowIds(tx, userId, courseId, now);
        const online = await onlinePaidTotal(tx, userId, courseId);
        const classified = rows.map((r) => classifyScheduleRow(r, held));
        const kept = classified.filter((r) => r.locked);
        const replaceable = classified.filter((r) => !r.locked);

        const blocked = planBlockReason({ ...appMoney, online }, sumPaid(classified));
        if (blocked) throw new PlanRefusal(blocked);

        const plan = validateEnrolmentPlan(input.plan, kept, istToday(now));
        if (!plan.ok) throw new PlanRefusal(plan.message);
        // The plan's payable becomes the AGREED fee on the enrolment's
        // application (application_final_fee) — the only figure that can show a
        // balance still to be scheduled, so a save can always set or correct it
        // (TTII 2026-10-17). With no application there is nowhere to keep it,
        // and no balance is ever inferred.
        const agreedChanges = app !== null && agreedPayableOf(app.finalFee) !== plan.breakdown.payable;
        if (replaceable.length === 0 && plan.rows.length === 0 && !agreedChanges) {
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

        if (app && agreedChanges) {
          await tx.applications.updateMany({
            where: { id: app.id, deleted_at: null },
            data: { application_final_fee: plan.breakdown.payable, updated_by: actor, updated_at: now },
          });
        }

        // Last statement before commit: a checkout started on a replaced row
        // while this ran could no longer be recorded against it. A LOCKING read
        // sees orders committed after this transaction's snapshot.
        if (replaceable.length > 0) {
          const heldNow = await checkoutHeldRowIdsNow(tx, userId, courseId, now);
          if (replaceable.some((r) => heldNow.has(r.id))) {
            throw new PlanRefusal('A payment for one of the instalments being replaced started while the plan was saving. Nothing was changed; reload and try again.');
          }
        }
        return {
          created: plan.rows.length,
          replaced: replaceable.length,
          kept: kept.length,
          payable: plan.breakdown.payable,
          agreed_fee_saved: app !== null && agreedChanges,
        };
      });
      return { status: 1, message: 'Payment plan saved.', data: result };
    } catch (err) {
      if (err instanceof PlanRefusal) return { status: 0, message: err.message };
      throw err;
    }
  }
}
