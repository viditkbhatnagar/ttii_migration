import type { Prisma, PrismaClient } from '@prisma/client';

import {
  CHECKOUT_HOLD_MS,
  agreedPayableOf,
  checkoutRowIdsFromNotes,
  isFreeByPricing,
  resolveFeePrefill,
  type FeePrefill,
  type OfferingPricing,
  type PackagePricing,
  type ScheduleRow,
} from './enrolment-fee-model.js';

// Reads behind per-enrolment fees (TTII 2026-10-16), shared by the admin plan
// service, the admin fee views, the student Payments API and checkout. Selects
// never hydrate a legacy date column of student_payments, create_order or
// payment_info: those can hold '0000-00-00', which crashes Prisma's findMany.
// Depends only on the pure model, so operations-service can import it without
// a cycle.

export type Db = PrismaClient | Prisma.TransactionClient;

export interface StudentRef {
  id: number;
  name?: string | null;
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
  paymentLinkId: string | null;
  paymentLinkExpiresAt: Date | null;
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

const toNum = (v: unknown): number | null => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
 * The application `users.application_id` names — the only one whose plan can
 * be the authority for a course. Never the newest application by email: Add
 * Enrolment and Edit Enrolment create applications for ADDED courses.
 */
export async function originalApplication(
  db: Db,
  student: Pick<StudentRef, 'application_id'>,
): Promise<{ id: number; course_id: number | null; payment_plan: string | null } | null> {
  if (!student.application_id) return null;
  return db.applications.findFirst({
    where: { id: student.application_id, deleted_at: null },
    select: { id: true, course_id: true, payment_plan: true },
  });
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
        // An email match never takes an application already linked to ANOTHER
        // student (user_email is not unique). Add Enrolment rows carry no
        // student_id, so they still match (TTII 2026-10-17 review).
        ...(email ? [{ user_email: email, student_id: null, OR: [{ stage: 'enrolled' }, { is_converted: 1 }] }] : []),
      ],
    },
    orderBy: { id: 'desc' },
    select: {
      id: true, application_id: true, course_id: true, student_id: true, offering_id: true, certificate_combination_id: true,
      application_final_fee: true, payment_plan: true, payment_status: true, payment_link_url: true, payment_link_id: true,
      payment_link_expires_at: true,
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
            paymentLinkId: app.payment_link_id,
            paymentLinkExpiresAt: app.payment_link_expires_at,
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

export function prefillFor(p: CoursePricing): FeePrefill {
  return resolveFeePrefill({
    enrolmentOffering: p.enrolmentOffering,
    combinationId: p.combinationId,
    combinationGst: p.combinationGst,
    courseOfferings: p.courseOfferings,
    courseFee: p.courseFee,
    course: p.course,
  });
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

/**
 * The AGREED payable per course: the payable the per-enrolment plan tool saved,
 * else the fee entered on the enrolment's application — both are
 * application_final_fee. Null when none is recorded; a list price is never
 * used, so with no agreed fee the schedule alone is the fee.
 */
export async function agreedPayableByCourse(
  db: Db,
  student: Pick<StudentRef, 'id' | 'user_email' | 'application_id'>,
  courseIds: number[],
): Promise<Map<number, number | null>> {
  const pricing = await loadCoursePricing(db, student, courseIds, { withCourseFacts: false });
  return new Map([...pricing].map(([courseId, p]) => [courseId, agreedPayableOf(p.application?.finalFee)]));
}

/**
 * agreedPayableByCourse for many students in ONE query (the admin Fee Summary
 * lists every enrolment). Each enrolment's application is the one
 * loadCoursePricing picks — linked to the student, else the one
 * users.application_id names, else an enrolled/converted application under the
 * student's email; the newest within a rank — so every screen reads the agreed
 * fee from the application the plan tool writes it to. Keyed
 * `${userId}:${courseId}`; absent = no application.
 */
export async function agreedPayableByStudentCourse(
  db: Db,
  students: ReadonlyArray<Pick<StudentRef, 'id' | 'user_email' | 'application_id'>>,
  courseIds: number[],
): Promise<Map<string, number | null>> {
  const out = new Map<string, number | null>();
  if (students.length === 0 || courseIds.length === 0) return out;
  const emailKey = (v: string | null): string => (v ?? '').trim().toLowerCase();
  const appIds = [...new Set(students.map((s) => s.application_id ?? 0).filter((v) => v > 0))];
  const emails = [...new Set(students.map((s) => (s.user_email ?? '').trim()).filter((e) => e !== ''))];
  const apps = await db.applications.findMany({
    where: {
      deleted_at: null,
      course_id: { in: courseIds },
      OR: [
        { student_id: { in: students.map((s) => s.id) } },
        ...(appIds.length > 0 ? [{ id: { in: appIds } }] : []),
        // Same rule as above: an email match never takes another student's application.
        ...(emails.length > 0 ? [{ user_email: { in: emails }, student_id: null, OR: [{ stage: 'enrolled' }, { is_converted: 1 }] }] : []),
      ],
    },
    orderBy: { id: 'desc' },
    select: { id: true, course_id: true, student_id: true, user_email: true, stage: true, is_converted: true, application_final_fee: true },
  });
  type App = (typeof apps)[number];
  const byStudent = new Map<number, App[]>();
  const byId = new Map<number, App>();
  const byEmail = new Map<string, App[]>();
  for (const a of apps) {
    if (a.student_id != null) byStudent.set(a.student_id, [...(byStudent.get(a.student_id) ?? []), a]);
    byId.set(a.id, a);
    const enrolled = (a.stage ?? '').trim().toLowerCase() === 'enrolled' || Number(a.is_converted) === 1;
    const key = emailKey(a.user_email);
    // Only unlinked applications match by email — as in the query — since a
    // row fetched for its student_id may share another student's email.
    if (enrolled && key !== '' && a.student_id == null) byEmail.set(key, [...(byEmail.get(key) ?? []), a]);
  }
  for (const s of students) {
    const original = s.application_id ? byId.get(s.application_id) : undefined;
    const ranked: Array<{ app: App; rank: number }> = [
      ...(byStudent.get(s.id) ?? []).map((app) => ({ app, rank: 0 })),
      ...(original ? [{ app: original, rank: 1 }] : []),
      ...(emailKey(s.user_email) !== '' ? (byEmail.get(emailKey(s.user_email)) ?? []).map((app) => ({ app, rank: 2 })) : []),
    ];
    const best = new Map<number, { app: App; rank: number }>();
    for (const c of ranked) {
      if (c.app.course_id == null) continue;
      const cur = best.get(c.app.course_id);
      if (!cur || c.rank < cur.rank || (c.rank === cur.rank && c.app.id > cur.app.id)) best.set(c.app.course_id, c);
    }
    for (const [courseId, { app }] of best) out.set(`${s.id}:${courseId}`, agreedPayableOf(toNum(app.application_final_fee)));
  }
  return out;
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
export async function readSchedule(db: Db, userId: number, courseId: number, lock: boolean): Promise<ScheduleRow[]> {
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
export async function checkoutHeldRowIds(db: Db, userId: number, courseId: number, now: Date): Promise<Set<number>> {
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

/** The same check as a LOCKING read, which sees orders committed after the
 *  transaction's snapshot — used just before a plan save commits. */
export async function checkoutHeldRowIdsNow(db: Db, userId: number, courseId: number, now: Date): Promise<Set<number>> {
  const since = new Date(now.getTime() - CHECKOUT_HOLD_MS);
  const orders = await db.$queryRaw<Array<{ notes: string | null }>>`
    SELECT notes FROM create_order
    WHERE user_id = ${userId} AND course_id = ${courseId} AND deleted_at IS NULL
      AND (order_status = 'completed' OR (order_status = 'pending' AND created_at >= ${since}))
    LOCK IN SHARE MODE`;
  return checkoutRowIdsFromNotes(orders.map((o) => o.notes));
}

/** Live checkout payments (payment_info) for the course, each Razorpay payment
 *  counted once. Only the amount and payment id are read. */
export async function onlinePaidTotal(db: Db, userId: number, courseId: number): Promise<number> {
  const rows = await db.payment_info.findMany({
    where: { user_id: userId, course_id: courseId, deleted_at: null },
    select: { amount_paid: true, razorpay_payment_id: true },
  });
  const seen = new Set<string>();
  let total = 0;
  for (const r of rows) {
    const paymentId = (r.razorpay_payment_id ?? '').trim();
    if (paymentId !== '') {
      if (seen.has(paymentId)) continue;
      seen.add(paymentId);
    }
    const amount = Number(r.amount_paid ?? 0);
    if (Number.isFinite(amount) && amount > 0) total += amount;
  }
  return total;
}
