import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';
import type { IntegrationRegistry, PaymentGateway } from '../integrations/contracts.js';
import { createIntegrationRegistry } from '../integrations/registry.js';

const EASEBUZZ_PAYMENT_URL = 'https://project.trogon.info/easebuzz/index.php';

// Razorpay rejects orders below ₹1 (100 paise) with
// "Order amount less than minimum amount allowed".
const RAZORPAY_MIN_ORDER_MINOR = 100;

function toIntId(id: string | number | null | undefined): number {
  if (typeof id === 'number') return id;
  if (!id) return 0;
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : 0;
}

function toNullableIntId(id: string | number | null | undefined): number | null {
  if (id === null || id === undefined || id === '') return null;
  if (typeof id === 'number') return id;
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : null;
}

function toDbNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function toInteger(value: unknown): number {
  return Math.trunc(toDbNumber(value));
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return '';
}

function toNullableString(value: unknown): string | null {
  const normalized = toStringValue(value).trim();
  return normalized === '' ? null : normalized;
}

function toDateOnlyString(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDateString(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const raw = toNullableString(value);
  if (!raw) {
    return '';
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().slice(0, 10);
}

function parseDescriptionItems(value: string): string[] {
  if (value.trim() === '') {
    return [];
  }

  const output: string[] = [];
  const stripHtml = (input: string) => input.replace(/<[^>]*>/g, '').trim();

  const listMatches = [...value.matchAll(/<li>(.*?)<\/li>/gis)];
  for (const match of listMatches) {
    const cleaned = stripHtml(match[1] ?? '');
    if (cleaned !== '') {
      output.push(cleaned);
    }
  }

  const paragraphMatches = [...value.matchAll(/<p>(.*?)<\/p>/gis)];
  for (const match of paragraphMatches) {
    const cleaned = stripHtml(match[1] ?? '');
    if (cleaned !== '') {
      output.push(cleaned);
    }
  }

  return output;
}

function parseSubjects(subjects: unknown): number[] {
  const raw: unknown[] = Array.isArray(subjects)
    ? subjects
    : typeof subjects === 'string' && subjects.trim() !== ''
      ? (() => {
          try {
            const parsed: unknown = JSON.parse(subjects);
            return Array.isArray(parsed) ? (parsed as unknown[]) : [];
          } catch {
            return [];
          }
        })()
      : [];

  const ids: number[] = [];
  for (const entry of raw) {
    const asString = String(entry);
    if (asString === '' || asString === '0') continue;
    const n = parseInt(asString, 10);
    if (Number.isFinite(n)) ids.push(n);
  }
  return ids;
}

function toSubjectsToken(subjects: unknown): string {
  if (typeof subjects === 'string') {
    return subjects;
  }

  if (Array.isArray(subjects)) {
    return JSON.stringify(subjects);
  }

  return '';
}

interface CommerceServiceDependencies {
  prisma?: PrismaClient;
  integrations?: Pick<IntegrationRegistry, 'payment'>;
}

export interface CreateOrderInput {
  courseId: string;
  receipt: string;
  currency: string;
}

export interface CompleteOrderInput {
  courseId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface ApplyCouponInput {
  courseId: string;
  packageId: string;
  couponCode: string;
}

export interface GeneratePaymentLinkInput {
  packageId: string;
  subjects: unknown;
  platform: 'app' | 'web';
}

// Type for Prisma interactive transaction client
type TxClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

interface CommerceUser {
  id: number;
  name: string | null;
  email: string | null;
  user_email: string | null;
  phone: string | null;
  course_id: number | null;
}

export class CommerceService {
  private readonly prisma: PrismaClient;
  private readonly paymentGateway: PaymentGateway;
  private readonly appBaseUrl = env.APP_BASE_URL.replace(/\/$/, '');

  constructor(dependencies: CommerceServiceDependencies = {}) {
    this.prisma = dependencies.prisma ?? getPrismaClient();
    const integrations = dependencies.integrations ?? createIntegrationRegistry();
    this.paymentGateway = integrations.payment;
  }

  private toFileUrl(path: unknown): string {
    const normalized = toNullableString(path);
    if (!normalized) {
      return '';
    }

    if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
      return normalized;
    }

    return `${this.appBaseUrl}/${normalized.replace(/^\/+/, '')}`;
  }

  private async getUserById(userId: string): Promise<CommerceUser | null> {
    const id = toIntId(userId);
    if (!id) {
      return null;
    }

    return this.prisma.users.findFirst({
      where: {
        id,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        user_email: true,
        phone: true,
        course_id: true,
      },
    });
  }

  private async couponAppliedCount(couponId: number, userId?: string): Promise<number> {
    if (!couponId) {
      return 0;
    }

    const userIntId = userId ? toIntId(userId) : null;

    return this.prisma.payment_info.count({
      where: {
        coupon_id: couponId,
        deleted_at: null,
        ...(userIntId ? { user_id: userIntId } : {}),
      },
    });
  }

  private async getStudentFeeInstallments(userId: string, courseId: string) {
    const userIntId = toIntId(userId);
    const courseIntId = toIntId(courseId);
    if (!userIntId || !courseIntId) {
      return [];
    }

    // Legacy student_payments rows store '0000-00-00' in due_date / paid_date,
    // which Prisma's MySQL driver refuses to hydrate. Read via $queryRaw with
    // NULLIF so those literals become NULL instead of crashing.
    return this.prisma.$queryRaw<
      Array<{
        id: number;
        installment_details: string | null;
        amount: number | null;
        payment_mode: string | null;
        payment_to: string | null;
        status: string | null;
        due_date: Date | null;
        paid_date: Date | null;
      }>
    >`
      SELECT id, installment_details, amount, payment_mode, payment_to, status,
             NULLIF(due_date, '0000-00-00') AS due_date,
             NULLIF(paid_date, '0000-00-00') AS paid_date
      FROM student_payments
      WHERE user_id = ${userIntId} AND course_id = ${courseIntId} AND deleted_at IS NULL
      ORDER BY due_date ASC, id ASC`;
  }

  /**
   * Next unpaid/overdue installment for (user, course) from the authoritative
   * student_payments ledger — the same table the Payments UI + get_installments
   * read. Oldest-due first (NULLIF ordering matches getStudentFeeInstallments),
   * so overdue installments are charged before upcoming ones. Returns the row id
   * (to mark paid on completion) and the amount in minor units. $queryRaw +
   * NULLIF because legacy rows store '0000-00-00' dates Prisma cannot hydrate.
   */
  private async getNextPayableInstallment(
    userIntId: number,
    courseIntId: number,
  ): Promise<{ id: number; amountMinor: number } | null> {
    if (!userIntId || !courseIntId) {
      return null;
    }

    const rows = await this.prisma.$queryRaw<Array<{ id: number; amount: number | null }>>`
      SELECT id, amount
      FROM student_payments
      WHERE user_id = ${userIntId}
        AND course_id = ${courseIntId}
        AND deleted_at IS NULL
        AND (status IS NULL OR LOWER(TRIM(status)) <> 'paid')
        AND NULLIF(paid_date, '0000-00-00') IS NULL
        AND amount IS NOT NULL AND amount >= 1
      ORDER BY NULLIF(due_date, '0000-00-00') ASC, id ASC
      LIMIT 1`;

    const row = rows[0];
    if (!row) {
      return null;
    }
    return { id: row.id, amountMinor: Math.round(toDbNumber(row.amount) * 100) };
  }

  private async ensureEnrolment(
    tx: TxClient,
    userId: string,
    courseId: string,
    packageId: number | null,
    updateUserCourseWhenAlreadyEnrolled: boolean,
  ): Promise<void> {
    const userIntId = toIntId(userId);
    const courseIntId = toIntId(courseId);
    if (!userIntId || !courseIntId) {
      return;
    }

    const existingCount = await tx.enrol.count({
      where: {
        user_id: userIntId,
        course_id: courseIntId,
        deleted_at: null,
      },
    });

    const enrolmentExists = existingCount > 0;
    const now = new Date();

    if (!enrolmentExists) {
      await tx.enrol.create({
        data: {
          user_id: userIntId,
          course_id: courseIntId,
          package_id: packageId,
          enrollment_date: toDateOnlyString(now),
          enrollment_status: 'Active',
          mode_of_study: 'Online',
          created_by: userIntId,
          created_at: now,
        },
      });
    }

    if (!enrolmentExists || updateUserCourseWhenAlreadyEnrolled) {
      await tx.users.update({
        where: { id: userIntId },
        data: {
          course_id: courseIntId,
          updated_by: userIntId,
          updated_at: now,
        },
      });
    }
  }

  private async formatPackageData(
    packageRow: {
      id: number;
      title: string | null;
      type: number | null;
      category_id: number | null;
      course_id: number | null;
      amount: number | null;
      discount: number | null;
      is_free: boolean | null;
      package_type: number | null;
      remarks: string | null;
      offline: number | null;
      description: string | null;
      start_date: Date | null;
      end_date: Date | null;
      duration: number | null;
      [key: string]: unknown;
    },
    user: CommerceUser,
  ): Promise<Record<string, unknown>> {
    const packageId = packageRow.id;
    const packageType = toInteger(packageRow.type);

    const purchasedCount =
      packageType !== 2
        ? await this.prisma.payment_info.count({
            where: {
              package_id: packageId,
              user_id: user.id,
              deleted_at: null,
            },
          })
        : 0;

    const amount = toDbNumber(packageRow.amount);
    const discount = toDbNumber(packageRow.discount);
    const payableAmount = amount - discount;
    const actualAmount = discount === 0 ? amount : payableAmount;
    const discountPercentage = amount > 0 ? Math.round((discount / amount) * 100) : 0;

    return {
      id: String(packageId),
      is_purchased: packageType !== 2 ? (purchasedCount > 0 ? 1 : 0) : 0,
      title: toStringValue(packageRow.title),
      type: packageRow.type ?? '',
      category_id: packageRow.category_id ?? '',
      course_id: packageRow.course_id ?? '',
      actual_amount: amount === actualAmount ? '' : amount,
      discount_percentage: discountPercentage,
      best_value: packageId === 1 ? 1 : 0,
      price_text: '',
      payable_amount: actualAmount,
      is_free: packageRow.is_free ?? '',
      package_type: packageRow.package_type ?? '',
      remarks: packageRow.remarks ?? '',
      offline: packageRow.offline ?? '',
      features: parseDescriptionItems(toStringValue(packageRow.description)),
      start_date: toDateString(packageRow.start_date),
      end_date: toDateString(packageRow.end_date),
      duration: '',
      name: toStringValue(user.name),
      phone: toStringValue(user.email),
      email: toStringValue(user.user_email),
      razorpay_api_key: env.PAYMENT_RAZORPAY_KEY_ID ?? '',
      razorpay_api_secret_key: env.PAYMENT_RAZORPAY_KEY_SECRET ?? '',
    };
  }

  async listPackages(userId: string, courseId?: string): Promise<Record<string, unknown>> {
    const user = await this.getUserById(userId);
    const packageData: { packages: Array<Record<string, unknown>>; logo?: string } = {
      packages: [],
    };

    if (!user) {
      return packageData;
    }

    const resolvedCourseId = courseId ? toIntId(courseId) : user.course_id;
    if (!resolvedCourseId) {
      return packageData;
    }

    const packageRows = await this.prisma.renamedpackage.findMany({
      where: {
        course_id: resolvedCourseId,
        deleted_at: null,
      },
      orderBy: { id: 'asc' },
    });

    if (packageRows.length === 0) {
      return packageData;
    }

    const currentDate = toDateOnlyString(new Date());
    for (const packageRow of packageRows) {
      const startDate = toDateString(packageRow.start_date);
      const endDate = toDateString(packageRow.end_date);

      if (!(startDate <= currentDate && endDate >= currentDate)) {
        continue;
      }

      packageData.packages.push(
        await this.formatPackageData(packageRow as Parameters<typeof this.formatPackageData>[0], user),
      );
    }

    packageData.logo = this.toFileUrl('uploads/logo/logo.png');
    return packageData;
  }

  async generatePaymentLink(userId: string, input: GeneratePaymentLinkInput): Promise<string> {
    const userIntId = toIntId(userId);
    const packageIntId = toIntId(input.packageId);
    if (!userIntId || !packageIntId) {
      return '';
    }

    const packageRow = await this.prisma.renamedpackage.findFirst({
      where: {
        id: packageIntId,
        deleted_at: null,
      },
    });

    if (!packageRow) {
      return '';
    }

    const user = await this.getUserById(userId);
    const subjectIds = parseSubjects(input.subjects);

    let amount = toDbNumber(packageRow.amount) - toDbNumber(packageRow.discount);
    if (subjectIds.length > 0) {
      // Filter via subject table scoped to this package's course
      const subjectRows = await this.prisma.subject.findMany({
        where: {
          id: { in: subjectIds },
          course_id: packageRow.course_id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });

      // subject table has no amount/discount in production; fall back to package amount multiplied by subject count
      // — retain original "sum per subject" semantic using package amount as unit.
      amount = subjectRows.length * (toDbNumber(packageRow.amount) - toDbNumber(packageRow.discount));
    }

    const duration = toInteger(packageRow.duration) > 0 ? toInteger(packageRow.duration) : 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + duration);

    const paymentQuery = new URLSearchParams({
      package_id: String(input.packageId),
      package_name: toStringValue(packageRow.title),
      user_id: String(userId),
      course_id: String(packageRow.course_id ?? ''),
      name: toStringValue(user?.name),
      phone: toStringValue(user?.phone),
      email: toStringValue(user?.user_email) || 'php.trogon@gmail.com',
      amount: String(amount),
      subjects: toSubjectsToken(input.subjects),
      platform: input.platform,
      expiry_date: toDateOnlyString(expiryDate),
    });

    return `${EASEBUZZ_PAYMENT_URL}?${paymentQuery.toString()}`;
  }

  async createOrder(userId: string, input: CreateOrderInput): Promise<Record<string, unknown>> {
    const userIntId = toIntId(userId);
    const courseIntId = toIntId(input.courseId);

    const course = await this.prisma.course.findFirst({
      where: {
        id: courseIntId,
        deleted_at: null,
      },
      select: {
        id: true,
        sale_price: true,
        title: true,
      },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    // Identify the payer in Razorpay (Naji 2026-07-09) — carry the student's
    // name + TTS code + course so the order is attributable, not just a number.
    // The Razorpay ORDER has no customer field, and order notes surface only in a
    // separate panel — so the payment's Email/Contact (which otherwise fall back
    // to "void@razorpay.com") can ONLY be set from the client-side Checkout
    // prefill. We therefore also RETURN the payer identity so the web + mobile
    // checkout can prefill name/email/contact (Naji 2026-07-10).
    const payer = userIntId
      ? await this.prisma.users.findFirst({
          where: { id: userIntId },
          select: { name: true, student_id: true, user_email: true, phone: true, whatsapp: true },
        })
      : null;
    // user_email is the real inbox; users.email sometimes holds a phone (project
    // gotcha), so do NOT fall back to it for the email prefill.
    const payerEmail = (payer?.user_email ?? '').trim();
    const payerContact = (payer?.phone ?? payer?.whatsapp ?? '').trim();

    const salePriceMinor = Math.round(toDbNumber(course.sale_price) * 100);
    let amountMinor = salePriceMinor;
    let targetInstallmentId: number | null = null;

    // The student's own instalment schedule ALWAYS wins over course.sale_price.
    //
    // Risha 2026-08-03 — a student owing a Rs.4,000 instalment on "Diploma in
    // Montessori Teacher Training" was sent to Razorpay for Rs.25,000: the
    // course carries sale_price=25000, and this used to consult the schedule
    // ONLY when sale_price fell below the Rs.1 minimum. So every instalment
    // student on a course that also has a sale_price was billed the whole
    // course fee — 75 students on course 16 alone. The portal showed
    // "Pay Rs.4,000" (from the schedule) while the order said Rs.25,000, which
    // is why it was invisible until a UPI app displayed the real amount.
    //
    // Resolved SERVER-SIDE; a client-supplied amount is never trusted.
    // course.sale_price now applies only to genuine full-payment courses —
    // i.e. where the student has no instalment schedule at all.
    const nextInstallment = await this.getNextPayableInstallment(userIntId, courseIntId);
    if (nextInstallment) {
      amountMinor = nextInstallment.amountMinor;
      targetInstallmentId = nextInstallment.id;
    } else if (salePriceMinor < RAZORPAY_MIN_ORDER_MINOR) {
      // No schedule AND no usable sale price — nothing legitimate to charge.
      throw new Error('No pending installment found to pay for this course.');
    }

    if (amountMinor < RAZORPAY_MIN_ORDER_MINOR) {
      // Fail with a clear message instead of a raw gateway 400 when a plan is
      // misconfigured (e.g. a ₹0 installment).
      throw new Error('Payable amount is below the ₹1 minimum. Please contact support to review your fee plan.');
    }
    const receipt = input.receipt.trim() === '' ? `receipt_${Date.now()}` : input.receipt.trim();
    const currency = input.currency.trim() === '' ? 'INR' : input.currency.trim().toUpperCase();

    const orderNotes: Record<string, string> = {
      user_id: String(userId),
      course_id: String(input.courseId),
      ...(payer?.name ? { student_name: payer.name } : {}),
      ...(payer?.student_id ? { student_id: String(payer.student_id) } : {}),
      ...(course.title ? { course: course.title } : {}),
    };

    const createdOrder = await this.paymentGateway.createOrder({
      amountMinor,
      currency,
      receipt,
      notes: orderNotes,
    });

    const now = new Date();

    await this.prisma.create_order.create({
      data: {
        order_id: createdOrder.orderId,
        amount: createdOrder.amountMinor / 100,
        user_id: userIntId,
        course_id: courseIntId,
        order_status: 'pending',
        notes: targetInstallmentId !== null
          ? JSON.stringify({ sp_id: targetInstallmentId })
          : JSON.stringify(createdOrder.providerPayload?.notes ?? createdOrder.providerPayload ?? {}),
        created_by: userIntId,
        created_at: now,
        datetime: now,
      },
    });

    return {
      order_id: createdOrder.orderId,
      amount: createdOrder.amountMinor,
      currency: createdOrder.currency,
      key: env.PAYMENT_RAZORPAY_KEY_ID ?? '',
      // Payer identity for the client to prefill Razorpay Checkout so the payment
      // shows the student (not void@razorpay.com), plus the attribution notes to
      // attach to the payment. The web checkout consumes these; the Flutter app
      // must do the same in its razorpay_flutter options.
      prefill_name: payer?.name ?? '',
      prefill_email: payerEmail,
      prefill_contact: payerContact,
      notes: orderNotes,
    };
  }

  async completeOrder(userId: string, input: CompleteOrderInput): Promise<boolean> {
    const userIntId = toIntId(userId);
    const courseIntId = toIntId(input.courseId);

    const course = await this.prisma.course.findFirst({
      where: {
        id: courseIntId,
        deleted_at: null,
      },
      select: {
        id: true,
        sale_price: true,
      },
    });

    const orderDetails = await this.prisma.create_order.findFirst({
      where: {
        order_id: input.razorpayOrderId,
        deleted_at: null,
      },
    });

    const user = await this.getUserById(userId);

    if (!course || !orderDetails || !user) {
      throw new Error('Unable to verify payment context');
    }

    if (
      orderDetails.user_id !== userIntId ||
      orderDetails.course_id !== courseIntId ||
      orderDetails.order_status !== 'pending'
    ) {
      throw new Error('Payment order verification failed');
    }

    const signatureValid = this.paymentGateway.verifyPaymentSignature({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    });

    if (!signatureValid) {
      throw new Error('Payment signature verification failed');
    }

    // This order may have been created to pay a specific installment (persisted
    // by createOrder as {"sp_id":<student_payments.id>}). Full-payment orders
    // carry no sp_id and leave the ledger untouched, exactly as today.
    let targetInstallmentId: number | null = null;
    try {
      const parsedNotes = JSON.parse(orderDetails.notes ?? '') as { sp_id?: unknown };
      const spId = Number(parsedNotes?.sp_id);
      if (Number.isInteger(spId) && spId > 0) {
        targetInstallmentId = spId;
      }
    } catch {
      // Non-JSON / legacy notes (e.g. {"status":"created"}) — no installment link.
    }

    const completed = await this.prisma.$transaction(async (tx) => {
      const duplicatePayment = await tx.payment_info.count({
        where: {
          razorpay_payment_id: input.razorpayPaymentId,
          deleted_at: null,
        },
      });

      if (duplicatePayment > 0) {
        return false;
      }

      const now = new Date();
      const amountPaid = toDbNumber(orderDetails.amount) > 0 ? toDbNumber(orderDetails.amount) : toDbNumber(course.sale_price);
      const userEmail = toNullableString(user.user_email) ?? toNullableString(user.email) ?? '';

      await tx.payment_info.create({
        data: {
          user_id: userIntId,
          amount_paid: Math.trunc(amountPaid),
          coupon_id: null,
          course_id: courseIntId,
          razorpay_payment_id: input.razorpayPaymentId,
          user_phone: toNullableString(user.phone),
          user_email: userEmail,
          razorpay_order_id: input.razorpayOrderId,
          razorpay_signature: input.razorpaySignature,
          payment_date: now,
          created_at: now,
          updated_at: now,
          created_by: userIntId,
          updated_by: userIntId,
        },
      });

      const updatedOrder = await tx.create_order.updateMany({
        where: {
          order_id: input.razorpayOrderId,
          order_status: 'pending',
          deleted_at: null,
        },
        data: {
          order_status: 'completed',
          payment_id_raz: toNullableIntId(input.razorpayPaymentId),
          updated_by: userIntId,
          updated_at: now,
        },
      });

      if (updatedOrder.count <= 0) {
        return false;
      }

      if (targetInstallmentId !== null) {
        // Mark exactly the installment this order was created to pay. Scoped by
        // (id, user, course) so it can only touch the caller's own row, and
        // guarded on not-already-paid so a re-fire — or an admin having marked
        // it meanwhile — can't double-apply. Raw SQL: student_payments carries
        // legacy zero-dates and NULL/mixed-case status.
        await tx.$executeRaw`
          UPDATE student_payments
          SET status = 'Paid', paid_date = ${toDateOnlyString(now)}, payment_mode = 'Online',
              updated_by = ${userIntId}, updated_at = ${now}
          WHERE id = ${targetInstallmentId}
            AND user_id = ${userIntId}
            AND course_id = ${courseIntId}
            AND deleted_at IS NULL
            AND (status IS NULL OR LOWER(TRIM(status)) <> 'paid')`;
      }

      await this.ensureEnrolment(tx, userId, input.courseId, null, false);
      return true;
    });

    return completed;
  }

  async applyCoupon(userId: string, input: ApplyCouponInput): Promise<Record<string, unknown>> {
    const invalidCoupon = {
      is_free: 0,
      valid: 0,
      message: 'Invalid Coupon Code!',
    };

    const expiredCoupon = {
      is_free: 0,
      valid: 0,
      message: 'Coupon Code Expired!',
    };

    const userIntId = toIntId(userId);
    const packageIntId = input.packageId ? toIntId(input.packageId) : 0;
    const courseIntId = toIntId(input.courseId);

    const packageRows = packageIntId
      ? await this.prisma.renamedpackage.findMany({
          where: {
            id: packageIntId,
            deleted_at: null,
          },
          orderBy: { id: 'asc' },
        })
      : await this.prisma.renamedpackage.findMany({
          where: {
            course_id: courseIntId,
            deleted_at: null,
          },
          orderBy: { id: 'asc' },
        });

    if (packageRows.length === 0) {
      return invalidCoupon;
    }

    const packageIds = packageRows.map((packageRow) => packageRow.id);

    const today = new Date(toDateOnlyString(new Date()));

    const coupon = await this.prisma.coupon_code.findFirst({
      where: {
        code: input.couponCode,
        OR: [
          { package_id: { in: packageIds } },
          { package_id: null },
        ],
        AND: [
          {
            OR: [
              { user_id: userIntId },
              { user_id: null },
            ],
          },
        ],
        validity: 1,
        start_date: { lte: today },
        end_date: { gte: today },
        deleted_at: null,
      },
    });

    if (!coupon) {
      return invalidCoupon;
    }

    const packageData = packageRows[0];
    const couponId = coupon.id;
    const totalAppliedCount = await this.couponAppliedCount(couponId);
    const userAppliedCount = await this.couponAppliedCount(couponId, userId);
    const totalAllowed = toInteger(coupon.total_no);
    const perUserAllowed = toInteger(coupon.per_user_no);

    if (!(totalAppliedCount < totalAllowed && userAppliedCount < perUserAllowed)) {
      return expiredCoupon;
    }

    const packagePrice = toDbNumber(packageData?.amount) - toDbNumber(packageData?.discount);
    const discountPercentage = toInteger(coupon.discount_perc);

    if (discountPercentage === 100) {
      const packageId: number | null = packageIntId || packageData?.id || null;
      const packageDuration = toInteger(packageData?.duration) > 0 ? toInteger(packageData?.duration) : 10;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + packageDuration);

      const user = await this.getUserById(userId);
      const derivedCourseId = packageData?.course_id ?? courseIntId;
      const userEmail = toNullableString(user?.user_email) ?? toNullableString(user?.email) ?? '';
      const userPhone = toNullableString(user?.phone);
      const now = new Date();

      await this.prisma.$transaction(async (tx) => {
        await tx.payment_info.create({
          data: {
            user_id: userIntId,
            package_id: packageId,
            amount_paid: 0,
            coupon_id: couponId,
            discount: Math.trunc(toDbNumber(packageData?.discount)),
            course_id: derivedCourseId,
            razorpay_payment_id: '',
            user_phone: userPhone,
            user_email: userEmail,
            payment_date: now,
            package_duration: packageDuration,
            expiry_date: expiryDate,
            code: `${toStringValue(coupon.code)}[${discountPercentage}%]`,
            created_at: now,
            updated_at: now,
            created_by: userIntId,
            updated_by: userIntId,
          },
        });

        await this.ensureEnrolment(
          tx,
          userId,
          String(derivedCourseId ?? ''),
          packageId,
          true,
        );
      });

      return {
        is_free: 1,
        offer_price: packagePrice,
        valid: 1,
        message: 'Coupon code applied successfully!',
      };
    }

    const offerPrice = packagePrice - Math.ceil((packagePrice * discountPercentage) / 100);

    return {
      price: packagePrice,
      coupon_id: couponId,
      discount_applied: discountPercentage,
      offer_price: offerPrice,
      is_free: 0,
      valid: 1,
      message: 'Coupon code applied successfully!',
    };
  }

  async getStudentCourses(userId: string): Promise<Array<Record<string, unknown>>> {
    const userIntId = toIntId(userId);
    if (!userIntId) {
      return [];
    }

    const enrolments = await this.prisma.enrol.findMany({
      where: {
        user_id: userIntId,
        deleted_at: null,
      },
      orderBy: { id: 'asc' },
    });

    if (enrolments.length === 0) {
      return [];
    }

    const courseIds = [
      ...new Set(enrolments.map((e) => e.course_id).filter((id): id is number => id !== null && id !== undefined)),
    ];
    const courses = await this.prisma.course.findMany({
      where: {
        id: { in: courseIds },
        deleted_at: null,
      },
      select: {
        id: true,
        title: true,
        total_amount: true,
      },
    });
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const userRecord = await this.prisma.users.findFirst({
      where: { id: userIntId },
      select: { id: true },
    });

    const currentDate = toDateOnlyString(new Date());
    const output: Array<Record<string, unknown>> = [];

    for (const enrolRow of enrolments) {
      const courseId = enrolRow.course_id;
      if (courseId === null || courseId === undefined) continue;
      const course = courseMap.get(courseId);
      if (!course) {
        continue;
      }

      // The clean (output-shaped) installments read is independent of the
      // fee-installments read for the same course — start it concurrently and
      // await it below instead of paying two serial round-trips. Perf 2026-07-04.
      const cleanInstallmentsPromise = this.getStudentInstallments(userId, String(courseId));
      // Guard the in-flight promise so a rejection of the fee read below (which
      // unwinds before we await this) can't surface as an unhandledRejection;
      // the value is still awaited (and any error re-thrown) at use-site.
      void cleanInstallmentsPromise.catch(() => undefined);
      const installments = await this.getStudentFeeInstallments(userId, String(courseId));
      const courseTotal = toDbNumber(course.total_amount);
      const discount = toDbNumber(enrolRow.discount_perc);
      const discountedPrice = courseTotal - (courseTotal * (discount / 100));

      let amountPaid = 0;
      let hasPendingOverdue = false;
      // Majida 2026-07-31 — "Course fee changed to 38000 but not reflected in
      // the course". Total came from course.total_amount (a COURSE-level price)
      // while Paid came from this student's own schedule, so the two halves of
      // the card disagreed the moment a student got a bespoke fee — an added
      // certificate combination, a discount, or any edited plan. Fameena's
      // schedule summed to 38,000 while course.total_amount was still 30,000.
      // The student's own student_payments rows are authoritative when they
      // exist; course.total_amount stays the fallback for students with no
      // schedule yet.
      let scheduleTotal = 0;

      for (const installment of installments) {
        const status = toStringValue(installment.status);
        const amount = toDbNumber(installment.amount);
        const dueDate = toDateString(installment.due_date);

        scheduleTotal += amount;

        if (status === 'Paid') {
          amountPaid += amount;
        }

        if (status === 'Pending' && dueDate !== '' && dueDate < currentDate) {
          hasPendingOverdue = true;
        }
      }

      const totalFee = scheduleTotal > 0 ? scheduleTotal : discountedPrice;
      // Clamped: a free course carrying a stray payment must not report a
      // negative balance (course 23 in Fameena's case).
      const balance = Math.max(0, totalFee - amountPaid);
      const paymentPercentage = totalFee > 0 ? Math.round(((amountPaid / totalFee) * 100) * 100) / 100 : 0;
      let status = 'completed';
      if (balance > 0) {
        status = hasPendingOverdue ? 'Overdue' : 'Pending';
      }

      // Output the sanitized installments shape (string dates, computed status)
      // instead of raw Prisma rows, which leak Date objects + internal columns
      // and break the Flutter parse.
      const cleanInstallments = await cleanInstallmentsPromise;
      output.push({
        user_id: enrolRow.user_id,
        course_id: courseId,
        id: userRecord?.id ?? '',
        title: toStringValue(course.title),
        enroled_on: toStringValue(enrolRow.created_at),
        total_fee: totalFee,
        installments: cleanInstallments,
        amount_paid: amountPaid,
        balance,
        payment_percentage: paymentPercentage,
        status,
      });
    }

    return output;
  }

  async getPaymentDetails(userId: string, courseId: string): Promise<Record<string, unknown>> {
    const installments = await this.getStudentInstallments(userId, courseId);

    return {
      total_fee: '',
      amount_paid: '',
      balance: '',
      payment_percentage: '',
      installments,
    };
  }

  async getPaymentHistory(userId: string, courseId?: string): Promise<Array<Record<string, unknown>>> {
    const userIntId = toIntId(userId);
    if (!userIntId) {
      return [];
    }

    const courseIntId = courseId ? toIntId(courseId) : 0;

    const payments = await this.prisma.payment_info.findMany({
      where: {
        user_id: userIntId,
        deleted_at: null,
        ...(courseIntId ? { course_id: courseIntId } : {}),
      },
      orderBy: { payment_date: 'desc' },
    });

    const courseIds = [
      ...new Set(payments.map((p) => p.course_id).filter((id): id is number => id !== null && id !== undefined)),
    ];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({
          where: { id: { in: courseIds }, deleted_at: null },
          select: { id: true, title: true },
        })
      : [];
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    return payments.map((p) => ({
      id: p.id,
      amount: toDbNumber(p.amount_paid),
      payment_date: toStringValue(p.payment_date),
      payment_mode: p.razorpay_payment_id ? 'Online' : (p.code ? 'Coupon' : 'Offline'),
      status: 'Success',
      razorpay_payment_id: toStringValue(p.razorpay_payment_id),
      course_title: toStringValue(p.course_id ? courseMap.get(p.course_id)?.title : ''),
      course_id: p.course_id,
    }));
  }

  async getStudentInstallments(userId: string, courseId?: string): Promise<Array<Record<string, unknown>>> {
    const userIntId = toIntId(userId);
    if (!userIntId) {
      return [];
    }

    const courseIntId = courseId ? toIntId(courseId) : 0;

    // Legacy student_payments rows store '0000-00-00' in due_date / paid_date,
    // which Prisma's MySQL driver refuses to hydrate. Read via $queryRaw with
    // NULLIF so those literals become NULL instead of crashing.
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: number;
        installment_details: string | null;
        amount: number | null;
        payment_mode: string | null;
        payment_to: string | null;
        status: string | null;
        due_date: Date | null;
        paid_date: Date | null;
      }>
    >`
      SELECT id, installment_details, amount, payment_mode, payment_to, status,
             NULLIF(due_date, '0000-00-00') AS due_date,
             NULLIF(paid_date, '0000-00-00') AS paid_date
      FROM student_payments
      WHERE user_id = ${userIntId} AND deleted_at IS NULL AND (${courseIntId} = 0 OR course_id = ${courseIntId})
      ORDER BY due_date ASC, id ASC`;

    const currentDate = toDateOnlyString(new Date());

    return rows.map((row, index) => {
      const status = toStringValue(row.status) || 'Pending';
      const dueDate = toDateString(row.due_date);
      let computedStatus = status;
      if (status === 'Pending' && dueDate !== '' && dueDate < currentDate) {
        computedStatus = 'Overdue';
      } else if (status === 'Pending' && dueDate !== '' && dueDate >= currentDate) {
        computedStatus = 'Due';
      }

      return {
        id: row.id,
        installment_no: index + 1,
        installment_details: toStringValue(row.installment_details) || `Installment ${index + 1}`,
        amount: toDbNumber(row.amount),
        due_date: dueDate,
        paid_date: toDateString(row.paid_date),
        payment_mode: toStringValue(row.payment_mode),
        payment_to: toStringValue(row.payment_to),
        status: computedStatus,
      };
    });
  }
}
