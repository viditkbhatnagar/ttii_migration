import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';
import type { IntegrationRegistry, PaymentGateway } from '../integrations/contracts.js';
import { createIntegrationRegistry } from '../integrations/registry.js';

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

function parseSubjects(subjects: unknown): string[] {
  if (Array.isArray(subjects)) {
    return subjects.map((entry) => String(entry)).filter((entry) => entry !== '' && entry !== '0');
  }

  if (typeof subjects === 'string') {
    const normalized = subjects.trim();
    if (normalized === '') {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry)).filter((entry) => entry !== '' && entry !== '0');
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

  private async getUserById(userId: string) {
    if (!userId) {
      return null;
    }

    return this.prisma.users.findFirst({
      where: {
        id: userId,
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

  private async couponAppliedCount(couponId: string, userId?: string): Promise<number> {
    if (!couponId) {
      return 0;
    }

    const where: Record<string, unknown> = {
      coupon_id: couponId,
      deleted_at: null,
    };

    if (userId) {
      where.user_id = userId;
    }

    return this.prisma.payment_info.count({ where });
  }

  private async getStudentFeeInstallments(userId: string, courseId: string) {
    if (!userId || !courseId) {
      return [];
    }

    return this.prisma.student_fee.findMany({
      where: {
        user_id: userId,
        course_id: courseId,
        deleted_at: null,
      },
      orderBy: [{ due_date: 'asc' }, { id: 'asc' }],
    });
  }

  private async ensureEnrolment(
    tx: TxClient,
    userId: string,
    courseId: string,
    packageId: string | null,
    updateUserCourseWhenAlreadyEnrolled: boolean,
  ): Promise<void> {
    if (!userId || !courseId) {
      return;
    }

    const existingCount = await tx.enrol.count({
      where: {
        user_id: userId,
        course_id: courseId,
        deleted_at: null,
      },
    });

    const enrolmentExists = existingCount > 0;
    const now = new Date();

    if (!enrolmentExists) {
      await tx.enrol.create({
        data: {
          user_id: userId,
          course_id: courseId,
          package_id: packageId,
          enrollment_date: now,
          enrollment_status: 'Active',
          mode_of_study: 'Online',
          created_by: userId,
          created_at: now,
        },
      });
    }

    if (!enrolmentExists || updateUserCourseWhenAlreadyEnrolled) {
      await tx.users.update({
        where: { id: userId },
        data: {
          course_id: courseId,
          updated_by: userId,
          updated_at: now,
        },
      });
    }
  }

  private async formatPackageData(
    packageRow: {
      id: string;
      title: string | null;
      type: number | null;
      category_id: string | null;
      course_id: string | null;
      amount: number | null;
      discount: number | null;
      is_free: number | null;
      package_type: string | null;
      remarks: string | null;
      offline: number | null;
      description: string | null;
      start_date: Date | null;
      end_date: Date | null;
      [key: string]: unknown;
    },
    user: { id: string; name: string | null; email: string | null; user_email: string | null; phone: string | null },
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
      id: packageId || '',
      is_purchased: packageType !== 2 ? (purchasedCount > 0 ? 1 : 0) : 0,
      title: toStringValue(packageRow.title),
      type: packageRow.type ?? '',
      category_id: packageRow.category_id ?? '',
      course_id: packageRow.course_id ?? '',
      actual_amount: amount === actualAmount ? '' : amount,
      discount_percentage: discountPercentage,
      best_value: packageId === '1' ? 1 : 0,
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

    const resolvedCourseId = courseId || user.course_id;
    if (!resolvedCourseId) {
      return packageData;
    }

    const packageRows = await this.prisma.course_package.findMany({
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
    if (!userId || !input.packageId) {
      return '';
    }

    const packageRow = await this.prisma.course_package.findFirst({
      where: {
        id: input.packageId,
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
      const subjectRows = await this.prisma.subject_package.findMany({
        where: {
          package_id: input.packageId,
          id: { in: subjectIds },
          deleted_at: null,
        },
        select: {
          id: true,
          amount: true,
          discount: true,
        },
      });

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
    const course = await this.prisma.course.findFirst({
      where: {
        id: input.courseId,
        deleted_at: null,
      },
      select: {
        id: true,
        sale_price: true,
      },
    });

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

    const now = new Date();

    await this.prisma.create_order.create({
      data: {
        order_id: createdOrder.orderId,
        amount: createdOrder.amountMinor / 100,
        user_id: userId,
        course_id: input.courseId,
        order_status: 'pending',
        notes: JSON.stringify(createdOrder.providerPayload?.notes ?? createdOrder.providerPayload ?? {}),
        created_by: userId,
        created_at: now,
        datetime: now,
      },
    });

    return {
      order_id: createdOrder.orderId,
      amount: createdOrder.amountMinor,
      currency: createdOrder.currency,
      key: env.PAYMENT_RAZORPAY_KEY_ID ?? '',
    };
  }

  async completeOrder(userId: string, input: CompleteOrderInput): Promise<boolean> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: input.courseId,
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

    // Validate order binding
    if (
      orderDetails.user_id !== userId ||
      orderDetails.course_id !== input.courseId ||
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
          user_id: userId,
          amount_paid: amountPaid,
          coupon_id: null,
          course_id: input.courseId,
          razorpay_payment_id: input.razorpayPaymentId,
          user_phone: toNullableString(user.phone),
          user_email: userEmail,
          razorpay_order_id: input.razorpayOrderId,
          razorpay_signature: input.razorpaySignature,
          payment_date: now,
          created_at: now,
          updated_at: now,
          created_by: userId,
          updated_by: userId,
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
          payment_id_raz: input.razorpayPaymentId,
          updated_by: userId,
          updated_at: now,
        },
      });

      if (updatedOrder.count <= 0) {
        return false;
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

    const packageRows = input.packageId
      ? await this.prisma.course_package.findMany({
          where: {
            id: input.packageId,
            deleted_at: null,
          },
          orderBy: { id: 'asc' },
        })
      : await this.prisma.course_package.findMany({
          where: {
            course_id: input.courseId,
            deleted_at: null,
          },
          orderBy: { id: 'asc' },
        });

    if (packageRows.length === 0) {
      return invalidCoupon;
    }

    const packageIds = packageRows
      .map((packageRow) => packageRow.id)
      .filter((id) => !!id);

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
              { user_id: userId },
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
      const packageId = input.packageId || packageData?.id || null;
      const packageDuration = toInteger(packageData?.duration) > 0 ? toInteger(packageData?.duration) : 10;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + packageDuration);

      const user = await this.getUserById(userId);
      const courseId = packageData?.course_id ?? '';
      const userEmail = toNullableString(user?.user_email) ?? toNullableString(user?.email) ?? '';
      const userPhone = toNullableString(user?.phone);
      const now = new Date();

      await this.prisma.$transaction(async (tx) => {
        await tx.payment_info.create({
          data: {
            user_id: userId,
            package_id: packageId,
            amount_paid: 0,
            coupon_id: couponId,
            discount: toDbNumber(packageData?.discount),
            course_id: courseId,
            razorpay_payment_id: '',
            user_phone: userPhone,
            user_email: userEmail,
            payment_date: now,
            package_duration: packageDuration,
            expiry_date: expiryDate,
            code: `${toStringValue(coupon.code)}[${discountPercentage}%]`,
            created_at: now,
            updated_at: now,
            created_by: userId,
            updated_by: userId,
          },
        });

        await this.ensureEnrolment(
          tx,
          userId,
          courseId,
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
    if (!userId) {
      return [];
    }

    // Fetch enrolments for this user
    const enrolments = await this.prisma.enrol.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
      },
      orderBy: { id: 'asc' },
    });

    if (enrolments.length === 0) {
      return [];
    }

    // Collect course IDs and batch-fetch courses
    const courseIds = [...new Set(enrolments.map((e) => e.course_id))];
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

    // Fetch the user record for id field
    const userRecord = await this.prisma.users.findFirst({
      where: { id: userId },
      select: { id: true },
    });

    const currentDate = toDateOnlyString(new Date());
    const output: Array<Record<string, unknown>> = [];

    for (const enrolRow of enrolments) {
      const courseId = enrolRow.course_id;
      const course = courseMap.get(courseId);
      if (!course) {
        continue; // Skip enrolments where the course has been deleted
      }

      const installments = await this.getStudentFeeInstallments(userId, courseId);
      const totalFee = toDbNumber(course.total_amount);
      const discount = toDbNumber(enrolRow.discount_perc);
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
        user_id: enrolRow.user_id,
        course_id: courseId,
        id: userRecord?.id ?? '',
        title: toStringValue(course.title),
        enroled_on: toStringValue(enrolRow.created_at),
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

  async getPaymentDetails(userId: string, courseId: string): Promise<Record<string, unknown>> {
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
