import { Prisma, type PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';
import type { IntegrationRegistry, PaymentGateway } from '../integrations/contracts.js';
import { createIntegrationRegistry } from '../integrations/registry.js';

type SqlRow = Record<string, unknown>;

const EASEBUZZ_PAYMENT_URL = 'https://project.trogon.info/easebuzz/index.php';

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
  if (Array.isArray(subjects)) {
    return subjects.map((entry) => toInteger(entry)).filter((entry) => entry > 0);
  }

  if (typeof subjects === 'string') {
    const normalized = subjects.trim();
    if (normalized === '') {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => toInteger(entry)).filter((entry) => entry > 0);
      }
    } catch {
      return [];
    }
  }

  return [];
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

function isValidOrderBinding(orderDetails: SqlRow, userId: number, courseId: number): boolean {
  const orderUserId = toInteger(orderDetails.user_id);
  const orderCourseId = toInteger(orderDetails.course_id);
  const orderStatus = toStringValue(orderDetails.order_status);

  if (orderUserId !== userId) {
    return false;
  }

  if (orderCourseId !== courseId) {
    return false;
  }

  return orderStatus === 'pending';
}

interface CommerceServiceDependencies {
  prisma?: PrismaClient;
  integrations?: Pick<IntegrationRegistry, 'payment'>;
}

export interface CreateOrderInput {
  courseId: number;
  receipt: string;
  currency: string;
}

export interface CompleteOrderInput {
  courseId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface ApplyCouponInput {
  courseId: number;
  packageId: number;
  couponCode: string;
}

export interface GeneratePaymentLinkInput {
  packageId: number;
  subjects: unknown;
  platform: 'app' | 'web';
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

  private async queryMany(sql: Prisma.Sql): Promise<SqlRow[]> {
    return this.prisma.$queryRaw<SqlRow[]>(sql);
  }

  private async queryOne(sql: Prisma.Sql): Promise<SqlRow | null> {
    const rows = await this.queryMany(sql);
    return rows[0] ?? null;
  }

  private async count(sql: Prisma.Sql): Promise<number> {
    const row = await this.queryOne(sql);
    return toDbNumber(row?.count);
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

  private async getUserById(userId: number): Promise<SqlRow | null> {
    if (userId <= 0) {
      return null;
    }

    return this.queryOne(Prisma.sql`
      SELECT id, name, email, user_email, phone, course_id
      FROM users
      WHERE id = ${userId}
        AND deleted_at IS NULL
      LIMIT 1
    `);
  }

  private async couponAppliedCount(couponId: number, userId = 0): Promise<number> {
    if (couponId <= 0) {
      return 0;
    }

    if (userId > 0) {
      return this.count(Prisma.sql`
        SELECT COUNT(coupon_id) AS count
        FROM payment_info
        WHERE coupon_id = ${couponId}
          AND user_id = ${userId}
          AND deleted_at IS NULL
      `);
    }

    return this.count(Prisma.sql`
      SELECT COUNT(coupon_id) AS count
      FROM payment_info
      WHERE coupon_id = ${couponId}
        AND deleted_at IS NULL
    `);
  }

  private async getStudentFeeInstallments(userId: number, courseId: number): Promise<SqlRow[]> {
    if (userId <= 0 || courseId <= 0) {
      return [];
    }

    return this.queryMany(Prisma.sql`
      SELECT *
      FROM student_fee
      WHERE user_id = ${userId}
        AND course_id = ${courseId}
        AND deleted_at IS NULL
      ORDER BY due_date ASC, id ASC
    `);
  }

  private async ensureEnrolment(
    tx: Prisma.TransactionClient,
    userId: number,
    courseId: number,
    packageId: number | null,
    updateUserCourseWhenAlreadyEnrolled: boolean,
  ): Promise<void> {
    if (userId <= 0 || courseId <= 0) {
      return;
    }

    const existing = await tx.$queryRaw<Array<{ count: number | bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS count
      FROM enrol
      WHERE user_id = ${userId}
        AND course_id = ${courseId}
        AND deleted_at IS NULL
    `);

    const enrolmentExists = toDbNumber(existing[0]?.count) > 0;
    const now = new Date();
    const nowIso = now.toISOString();
    const today = toDateOnlyString(now);

    if (!enrolmentExists) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO enrol (
          user_id,
          course_id,
          package_id,
          enrollment_date,
          enrollment_status,
          mode_of_study,
          created_by,
          created_at
        ) VALUES (
          ${userId},
          ${courseId},
          ${packageId},
          ${today},
          ${'Active'},
          ${'Online'},
          ${userId},
          ${nowIso}
        )
      `);
    }

    if (!enrolmentExists || updateUserCourseWhenAlreadyEnrolled) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE users
        SET course_id = ${courseId},
            updated_by = ${userId},
            updated_at = ${nowIso}
        WHERE id = ${userId}
      `);
    }
  }

  private async formatPackageData(packageRow: SqlRow, user: SqlRow): Promise<Record<string, unknown>> {
    const packageId = toInteger(packageRow.id);
    const packageType = toInteger(packageRow.type);

    const purchasedCount =
      packageType !== 2
        ? await this.count(Prisma.sql`
            SELECT COUNT(*) AS count
            FROM payment_info
            WHERE package_id = ${packageId}
              AND user_id = ${toInteger(user.id)}
              AND deleted_at IS NULL
          `)
        : 0;

    const amount = toDbNumber(packageRow.amount);
    const discount = toDbNumber(packageRow.discount);
    const payableAmount = amount - discount;
    const actualAmount = discount === 0 ? amount : payableAmount;
    const discountPercentage = amount > 0 ? Math.round((discount / amount) * 100) : 0;

    return {
      id: packageId || '',
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

  async listPackages(userId: number, courseId = 0): Promise<Record<string, unknown>> {
    const user = await this.getUserById(userId);
    const packageData: { packages: Array<Record<string, unknown>>; logo?: string } = {
      packages: [],
    };

    if (!user) {
      return packageData;
    }

    const resolvedCourseId = courseId > 0 ? courseId : toInteger(user.course_id);
    if (resolvedCourseId <= 0) {
      return packageData;
    }

    const packageRows = await this.queryMany(Prisma.sql`
      SELECT *
      FROM package
      WHERE course_id = ${resolvedCourseId}
        AND deleted_at IS NULL
      ORDER BY id ASC
    `);

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

      packageData.packages.push(await this.formatPackageData(packageRow, user));
    }

    packageData.logo = this.toFileUrl('uploads/logo/logo.png');
    return packageData;
  }

  async generatePaymentLink(userId: number, input: GeneratePaymentLinkInput): Promise<string> {
    if (userId <= 0 || input.packageId <= 0) {
      return '';
    }

    const packageRow = await this.queryOne(Prisma.sql`
      SELECT *
      FROM package
      WHERE id = ${input.packageId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!packageRow) {
      return '';
    }

    const user = await this.getUserById(userId);
    const subjectIds = parseSubjects(input.subjects);

    let amount = toDbNumber(packageRow.amount) - toDbNumber(packageRow.discount);
    if (subjectIds.length > 0) {
      const subjectRows = await this.queryMany(Prisma.sql`
        SELECT id, amount, discount
        FROM subject_package
        WHERE package_id = ${input.packageId}
          AND id IN (${Prisma.join(subjectIds)})
          AND deleted_at IS NULL
      `);

      amount = subjectRows.reduce((total, subjectRow) => {
        return total + (toDbNumber(subjectRow.amount) - toDbNumber(subjectRow.discount));
      }, 0);
    }

    const duration = toInteger(packageRow.duration) > 0 ? toInteger(packageRow.duration) : 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + duration);

    const paymentQuery = new URLSearchParams({
      package_id: String(input.packageId),
      package_name: toStringValue(packageRow.title),
      user_id: String(userId),
      course_id: String(toInteger(packageRow.course_id)),
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

  async createOrder(userId: number, input: CreateOrderInput): Promise<Record<string, unknown>> {
    const course = await this.queryOne(Prisma.sql`
      SELECT id, sale_price
      FROM course
      WHERE id = ${input.courseId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!course) {
      throw new Error('Course not found');
    }

    const amountMinor = Math.round(toDbNumber(course.sale_price) * 100);
    const receipt = input.receipt.trim() === '' ? `receipt_${Date.now()}` : input.receipt.trim();
    const currency = input.currency.trim() === '' ? 'INR' : input.currency.trim().toUpperCase();

    const createdOrder = await this.paymentGateway.createOrder({
      amountMinor,
      currency,
      receipt,
      notes: {
        user_id: String(userId),
        course_id: String(input.courseId),
      },
    });

    const now = new Date().toISOString();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO create_order (
        order_id,
        amount,
        user_id,
        course_id,
        order_status,
        notes,
        created_by,
        created_at,
        datetime
      ) VALUES (
        ${createdOrder.orderId},
        ${createdOrder.amountMinor / 100},
        ${userId},
        ${input.courseId},
        ${'pending'},
        ${JSON.stringify(createdOrder.providerPayload?.notes ?? createdOrder.providerPayload ?? {})},
        ${userId},
        ${now},
        ${now}
      )
    `);

    return {
      order_id: createdOrder.orderId,
      amount: createdOrder.amountMinor,
      currency: createdOrder.currency,
      key: env.PAYMENT_RAZORPAY_KEY_ID ?? '',
    };
  }

  async completeOrder(userId: number, input: CompleteOrderInput): Promise<boolean> {
    const course = await this.queryOne(Prisma.sql`
      SELECT id, sale_price
      FROM course
      WHERE id = ${input.courseId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    const orderDetails = await this.queryOne(Prisma.sql`
      SELECT *
      FROM create_order
      WHERE order_id = ${input.razorpayOrderId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    const user = await this.getUserById(userId);

    if (!course || !orderDetails || !user) {
      throw new Error('Unable to verify payment context');
    }

    if (!isValidOrderBinding(orderDetails, userId, input.courseId)) {
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

    const completed = await this.prisma.$transaction(async (tx) => {
      const duplicatePayment = await tx.$queryRaw<Array<{ count: number | bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM payment_info
        WHERE razorpay_payment_id = ${input.razorpayPaymentId}
          AND deleted_at IS NULL
      `);

      if (toDbNumber(duplicatePayment[0]?.count) > 0) {
        return false;
      }

      const now = new Date().toISOString();
      const amountPaid = toDbNumber(orderDetails.amount) > 0 ? toDbNumber(orderDetails.amount) : toDbNumber(course.sale_price);
      const userEmail = toNullableString(user.user_email) ?? toNullableString(user.email) ?? '';

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO payment_info (
          user_id,
          amount_paid,
          coupon_id,
          course_id,
          razorpay_payment_id,
          user_phone,
          user_email,
          razorpay_order_id,
          razorpay_signature,
          payment_date,
          created_at,
          updated_at,
          created_by,
          updated_by
        ) VALUES (
          ${userId},
          ${amountPaid},
          0,
          ${input.courseId},
          ${input.razorpayPaymentId},
          ${toNullableString(user.phone)},
          ${userEmail},
          ${input.razorpayOrderId},
          ${input.razorpaySignature},
          ${now},
          ${now},
          ${now},
          ${userId},
          ${userId}
        )
      `);

      const updatedOrderCount = await tx.$executeRaw(Prisma.sql`
        UPDATE create_order
        SET order_status = ${'completed'},
            payment_id_raz = ${input.razorpayPaymentId},
            updated_by = ${userId},
            updated_at = ${now}
        WHERE order_id = ${input.razorpayOrderId}
          AND order_status = ${'pending'}
          AND deleted_at IS NULL
      `);

      if (updatedOrderCount <= 0) {
        return false;
      }

      await this.ensureEnrolment(tx, userId, input.courseId, null, false);
      return true;
    });

    return completed;
  }

  async applyCoupon(userId: number, input: ApplyCouponInput): Promise<Record<string, unknown>> {
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

    const packageRows = input.packageId > 0
      ? await this.queryMany(Prisma.sql`
          SELECT *
          FROM package
          WHERE id = ${input.packageId}
            AND deleted_at IS NULL
          ORDER BY id ASC
        `)
      : await this.queryMany(Prisma.sql`
          SELECT *
          FROM package
          WHERE course_id = ${input.courseId}
            AND deleted_at IS NULL
          ORDER BY id ASC
        `);

    if (packageRows.length === 0) {
      return invalidCoupon;
    }

    const packageIds = packageRows
      .map((packageRow) => toInteger(packageRow.id))
      .filter((packageId) => packageId > 0);
    packageIds.push(0);

    const coupon = await this.queryOne(Prisma.sql`
      SELECT *
      FROM coupon_code
      WHERE code = ${input.couponCode}
        AND package_id IN (${Prisma.join(packageIds)})
        AND user_id IN (${Prisma.join([userId, 0])})
        AND validity = 1
        AND start_date <= ${toDateOnlyString(new Date())}
        AND end_date >= ${toDateOnlyString(new Date())}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    if (!coupon) {
      return invalidCoupon;
    }

    const packageData = packageRows[0];
    const couponId = toInteger(coupon.id);
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
      const packageId = input.packageId > 0 ? input.packageId : toInteger(packageData?.id);
      const packageDuration = toInteger(packageData?.duration) > 0 ? toInteger(packageData?.duration) : 10;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + packageDuration);
      const expiryDateString = toDateOnlyString(expiryDate);

      const user = await this.getUserById(userId);
      const courseId = toInteger(packageData?.course_id);
      const userEmail = toNullableString(user?.user_email) ?? toNullableString(user?.email) ?? '';
      const userPhone = toNullableString(user?.phone);
      const now = new Date().toISOString();

      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO payment_info (
            user_id,
            package_id,
            amount_paid,
            coupon_id,
            discount,
            course_id,
            razorpay_payment_id,
            user_phone,
            user_email,
            payment_date,
            package_duration,
            expiry_date,
            code,
            created_at,
            updated_at,
            created_by,
            updated_by
          ) VALUES (
            ${userId},
            ${packageId > 0 ? packageId : null},
            0,
            ${couponId},
            ${toDbNumber(packageData?.discount)},
            ${courseId},
            ${''},
            ${userPhone},
            ${userEmail},
            ${now},
            ${packageDuration},
            ${expiryDateString},
            ${`${toStringValue(coupon.code)}[${discountPercentage}%]`},
            ${now},
            ${now},
            ${userId},
            ${userId}
          )
        `);

        await this.ensureEnrolment(
          tx,
          userId,
          courseId,
          packageId > 0 ? packageId : null,
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

  async getStudentCourses(userId: number): Promise<Array<Record<string, unknown>>> {
    if (userId <= 0) {
      return [];
    }

    const rows = await this.queryMany(Prisma.sql`
      SELECT
        enrol.user_id,
        enrol.course_id,
        users.id,
        course.title,
        enrol.discount_perc,
        course.total_amount,
        enrol.created_at AS enroled_on
      FROM enrol
      LEFT JOIN users ON users.id = enrol.user_id
      LEFT JOIN course ON course.id = enrol.course_id
      WHERE enrol.user_id = ${userId}
        AND course.deleted_at IS NULL
        AND enrol.deleted_at IS NULL
      ORDER BY enrol.id ASC
    `);

    const currentDate = toDateOnlyString(new Date());
    const output: Array<Record<string, unknown>> = [];

    for (const row of rows) {
      const courseId = toInteger(row.course_id);
      const installments = await this.getStudentFeeInstallments(userId, courseId);
      const totalFee = toDbNumber(row.total_amount);
      const discount = toDbNumber(row.discount_perc);
      const discountedPrice = totalFee - (totalFee * (discount / 100));

      let amountPaid = 0;
      let hasPendingOverdue = false;

      for (const installment of installments) {
        const status = toStringValue(installment.status);
        const amount = toDbNumber(installment.amount);
        const dueDate = toDateString(installment.due_date);

        if (status === 'Paid') {
          amountPaid += amount;
        }

        if (status === 'Pending' && dueDate !== '' && dueDate < currentDate) {
          hasPendingOverdue = true;
        }
      }

      const balance = totalFee - amountPaid;
      const paymentPercentage = totalFee > 0 ? Math.round(((amountPaid / totalFee) * 100) * 100) / 100 : 0;
      let status = 'completed';
      if (balance > 0) {
        status = hasPendingOverdue ? 'Overdue' : 'Pending';
      }

      output.push({
        user_id: toInteger(row.user_id),
        course_id: courseId,
        id: toInteger(row.id),
        title: toStringValue(row.title),
        enroled_on: toStringValue(row.enroled_on),
        total_fee: discountedPrice,
        installments,
        amount_paid: amountPaid,
        balance,
        payment_percentage: paymentPercentage,
        status,
      });
    }

    return output;
  }

  async getPaymentDetails(userId: number, courseId: number): Promise<Record<string, unknown>> {
    const installments = await this.getStudentFeeInstallments(userId, courseId);

    return {
      total_fee: '',
      amount_paid: '',
      balance: '',
      payment_percentage: '',
      installments,
    };
  }
}
