import { createHmac, randomUUID } from 'node:crypto';

import { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { resetAuthRateLimitersForTests } from '../../src/auth/auth-service.js';
import { hashPassword } from '../../src/auth/password.js';
import { buildApp } from '../../src/app.js';
import type {
  IntegrationRegistry,
  PaymentGateway,
  PaymentOrder,
  PaymentOrderRequest,
  PaymentSignatureVerificationInput,
  PaymentWebhookVerificationInput,
} from '../../src/integrations/contracts.js';
import { createIntegrationRegistry } from '../../src/integrations/registry.js';
import { prisma, resetParityTables } from '../data/test-db.js';

const COURSE_ID = 2101;
const TAMPER_COURSE_ID = 2102;
const PACKAGE_ID = 2201;
const PACKAGE_INACTIVE_ID = 2202;
const SUBJECT_PACKAGE_ID_ONE = 2301;
const SUBJECT_PACKAGE_ID_TWO = 2302;
const COUPON_SAVE_ID = 2401;
const COUPON_FREE_ID = 2402;
const PAYMENT_SIGNATURE_SECRET = 'phase08-signature-secret';

function dayOffset(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseJsonBody<T>(body: string): T {
  return JSON.parse(body) as T;
}

function createSignature(orderId: string, paymentId: string): string {
  return createHmac('sha256', PAYMENT_SIGNATURE_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
}

class DeterministicPaymentGateway implements PaymentGateway {
  readonly name = 'deterministic-payment';

  constructor(private readonly signatureSecret: string) {}

  createOrder(input: PaymentOrderRequest): Promise<PaymentOrder> {
    return Promise.resolve({
      orderId: `order_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      amountMinor: input.amountMinor,
      currency: input.currency.toUpperCase(),
      receipt: input.receipt,
      providerPayload: {
        notes: input.notes ?? {},
      },
    });
  }

  verifyPaymentSignature(input: PaymentSignatureVerificationInput): boolean {
    const expected = createHmac('sha256', this.signatureSecret).update(`${input.orderId}|${input.paymentId}`).digest('hex');
    return expected === input.signature.toLowerCase();
  }

  verifyWebhookSignature(input: PaymentWebhookVerificationInput): boolean {
    void input;
    return true;
  }
}

async function seedCommerceFixture(
  app: ReturnType<typeof buildApp>,
): Promise<{ authToken: string; intruderToken: string; userId: number; intruderId: number }> {
  const password = 'CommercePass#2026';
  const passwordHash = await hashPassword(password);

  const learner = await prisma.users.create({
    data: {
      name: 'Commerce Learner',
      email: 'commerce.learner@example.test',
      user_email: 'commerce.learner@example.test',
      phone: '9990001111',
      role_id: 2,
      password: passwordHash,
      status: 1,
    },
  });

  const intruder = await prisma.users.create({
    data: {
      name: 'Commerce Intruder',
      email: 'commerce.intruder@example.test',
      user_email: 'commerce.intruder@example.test',
      phone: '9990002222',
      role_id: 2,
      password: passwordHash,
      status: 1,
    },
  });

  const now = new Date().toISOString();

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO course (
      id,
      category_id,
      title,
      status,
      price,
      sale_price,
      total_amount,
      description,
      duration,
      is_free_course,
      created_at
    ) VALUES
      (
        ${COURSE_ID},
        1,
        ${'Commerce Mastery'},
        ${'active'},
        3000,
        1500,
        2000,
        ${'Commerce course'},
        ${'30 days'},
        0,
        ${now}
      ),
      (
        ${TAMPER_COURSE_ID},
        1,
        ${'Tamper Shield Course'},
        ${'active'},
        2500,
        1200,
        1600,
        ${'Tamper course'},
        ${'45 days'},
        0,
        ${now}
      )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO package (
      id,
      title,
      description,
      type,
      category_id,
      course_id,
      amount,
      discount,
      is_free,
      package_type,
      remarks,
      offline,
      start_date,
      end_date,
      duration,
      created_at
    ) VALUES
      (
        ${PACKAGE_ID},
        ${'Premium Plan'},
        ${'<li>Live sessions</li><p>Mentor support</p>'},
        1,
        1,
        ${COURSE_ID},
        3000,
        500,
        0,
        ${'online'},
        ${'Best value'},
        0,
        ${dayOffset(-1)},
        ${dayOffset(10)},
        30,
        ${now}
      ),
      (
        ${PACKAGE_INACTIVE_ID},
        ${'Old Plan'},
        ${'<li>Archived</li>'},
        1,
        1,
        ${COURSE_ID},
        1200,
        0,
        0,
        ${'online'},
        ${'Inactive'},
        0,
        ${dayOffset(-20)},
        ${dayOffset(-10)},
        30,
        ${now}
      )
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO subject_package (id, package_id, subject_id, amount, discount, created_at)
    VALUES
      (${SUBJECT_PACKAGE_ID_ONE}, ${PACKAGE_ID}, 901, 1200, 100, ${now}),
      (${SUBJECT_PACKAGE_ID_TWO}, ${PACKAGE_ID}, 902, 1100, 100, ${now})
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO coupon_code (
      id,
      code,
      package_id,
      user_id,
      discount_perc,
      total_no,
      per_user_no,
      validity,
      start_date,
      end_date,
      created_at
    ) VALUES
      (
        ${COUPON_SAVE_ID},
        ${'SAVE20'},
        ${PACKAGE_ID},
        0,
        20,
        5,
        2,
        1,
        ${dayOffset(-1)},
        ${dayOffset(7)},
        ${now}
      ),
      (
        ${COUPON_FREE_ID},
        ${'FREE100'},
        ${PACKAGE_ID},
        0,
        100,
        1,
        1,
        1,
        ${dayOffset(-1)},
        ${dayOffset(7)},
        ${now}
      )
  `);

  const loginLearner = await app.inject({
    method: 'GET',
    url: '/api/login/index',
    query: {
      email: 'commerce.learner@example.test',
      password,
      role_id: '2',
    },
  });

  const loginIntruder = await app.inject({
    method: 'GET',
    url: '/api/login/index',
    query: {
      email: 'commerce.intruder@example.test',
      password,
      role_id: '2',
    },
  });

  expect(loginLearner.statusCode).toBe(200);
  expect(loginIntruder.statusCode).toBe(200);

  return {
    authToken: parseJsonBody<{ userdata: { auth_token: string } }>(loginLearner.body).userdata.auth_token,
    intruderToken: parseJsonBody<{ userdata: { auth_token: string } }>(loginIntruder.body).userdata.auth_token,
    userId: learner.id,
    intruderId: intruder.id,
  };
}

describe('Phase 08 commerce and enrollment parity contracts', () => {
  const integrations: IntegrationRegistry = {
    ...createIntegrationRegistry(),
    payment: new DeterministicPaymentGateway(PAYMENT_SIGNATURE_SECRET),
  };
  const app = buildApp({ integrations });

  beforeEach(async () => {
    resetAuthRateLimitersForTests();
    await resetParityTables();
  });

  afterAll(async () => {
    await app.close();
  });

  it('keeps packages, payment-link generation, and coupon calculation parity', async () => {
    const fixture = await seedCommerceFixture(app);

    const unauthorizedPackages = await app.inject({
      method: 'GET',
      url: '/api/packages/index',
    });
    expect(unauthorizedPackages.statusCode).toBe(401);

    const packagesResponse = await app.inject({
      method: 'GET',
      url: '/api/packages/index',
      query: {
        auth_token: fixture.authToken,
        course_id: COURSE_ID,
      },
    });

    expect(packagesResponse.statusCode).toBe(200);
    const packagesPayload = parseJsonBody<{
      status: number;
      data: {
        packages: Array<{ id: number; features: string[] }>;
        logo: string;
      };
    }>(packagesResponse.body);

    expect(packagesPayload.status).toBe(1);
    expect(packagesPayload.data.packages.length).toBe(1);
    expect(packagesPayload.data.packages[0]?.id).toBe(PACKAGE_ID);
    expect(packagesPayload.data.packages[0]?.features).toEqual(['Live sessions', 'Mentor support']);
    expect(packagesPayload.data.logo).toContain('/uploads/logo/logo.png');

    const paymentLinkResponse = await app.inject({
      method: 'GET',
      url: '/api/payment/generate_payment',
      query: {
        auth_token: fixture.authToken,
        package_id: PACKAGE_ID,
        subjects: JSON.stringify([SUBJECT_PACKAGE_ID_ONE, SUBJECT_PACKAGE_ID_TWO]),
      },
    });

    expect(paymentLinkResponse.statusCode).toBe(200);
    const paymentLinkPayload = parseJsonBody<{ status: number; data: string }>(paymentLinkResponse.body);
    expect(paymentLinkPayload.status).toBe(1);

    const generatedUrl = new URL(paymentLinkPayload.data);
    expect(generatedUrl.searchParams.get('package_id')).toBe(String(PACKAGE_ID));
    expect(generatedUrl.searchParams.get('amount')).toBe('2100');
    expect(generatedUrl.searchParams.get('platform')).toBe('app');

    const couponResponse = await app.inject({
      method: 'GET',
      url: '/api/payment/apply_coupon',
      query: {
        auth_token: fixture.authToken,
        course_id: COURSE_ID,
        package_id: PACKAGE_ID,
        coupon_code: 'SAVE20',
      },
    });

    expect(couponResponse.statusCode).toBe(200);
    const couponPayload = parseJsonBody<{
      status: string;
      valid: number;
      is_free: number;
      offer_price: number;
      discount_applied: number;
    }>(couponResponse.body);

    expect(couponPayload.status).toBe('success');
    expect(couponPayload.valid).toBe(1);
    expect(couponPayload.is_free).toBe(0);
    expect(couponPayload.discount_applied).toBe(20);
    expect(couponPayload.offer_price).toBe(2000);

    const invalidCouponResponse = await app.inject({
      method: 'GET',
      url: '/api/payment/apply_coupon',
      query: {
        auth_token: fixture.authToken,
        course_id: COURSE_ID,
        package_id: PACKAGE_ID,
        coupon_code: 'INVALID',
      },
    });

    const invalidCouponPayload = parseJsonBody<{ valid: number; message: string }>(invalidCouponResponse.body);
    expect(invalidCouponPayload.valid).toBe(0);
    expect(invalidCouponPayload.message).toBe('Invalid Coupon Code!');
  });

  it('enforces signature validation, idempotency, and strict order binding on completion', async () => {
    const fixture = await seedCommerceFixture(app);

    const createOrderResponse = await app.inject({
      method: 'GET',
      url: '/api/payment/create_order',
      query: {
        auth_token: fixture.authToken,
        course_id: COURSE_ID,
      },
    });

    expect(createOrderResponse.statusCode).toBe(200);
    const createOrderPayload = parseJsonBody<{
      status: number;
      data: { order_id: string; amount: number; currency: string };
    }>(createOrderResponse.body);

    expect(createOrderPayload.status).toBe(1);
    expect(createOrderPayload.data.amount).toBe(150000);
    expect(createOrderPayload.data.currency).toBe('INR');

    const orderId = createOrderPayload.data.order_id;
    const firstPaymentId = 'pay_phase08_primary';
    const firstSignature = createSignature(orderId, firstPaymentId);

    const intruderTamper = await app.inject({
      method: 'GET',
      url: '/api/payment/complete_order',
      query: {
        auth_token: fixture.intruderToken,
        course_id: COURSE_ID,
        razorpay_order_id: orderId,
        razorpay_payment_id: firstPaymentId,
        razorpay_signature: firstSignature,
      },
    });

    const intruderPayload = parseJsonBody<{ status: number; message: string }>(intruderTamper.body);
    expect(intruderPayload.status).toBe(0);
    expect(intruderPayload.message).toBe('Payment verification failed.');

    const invalidSignatureResponse = await app.inject({
      method: 'GET',
      url: '/api/payment/complete_order',
      query: {
        auth_token: fixture.authToken,
        course_id: COURSE_ID,
        razorpay_order_id: orderId,
        razorpay_payment_id: firstPaymentId,
        razorpay_signature: 'wrong-signature',
      },
    });

    const invalidSignaturePayload = parseJsonBody<{ status: number; message: string }>(invalidSignatureResponse.body);
    expect(invalidSignaturePayload.status).toBe(0);
    expect(invalidSignaturePayload.message).toBe('Payment verification failed.');

    const completeOrderResponse = await app.inject({
      method: 'GET',
      url: '/api/payment/complete_order',
      query: {
        auth_token: fixture.authToken,
        course_id: COURSE_ID,
        razorpay_order_id: orderId,
        razorpay_payment_id: firstPaymentId,
        razorpay_signature: firstSignature,
      },
    });

    expect(completeOrderResponse.statusCode).toBe(200);
    const completeOrderPayload = parseJsonBody<{ status: number; message: string }>(completeOrderResponse.body);
    expect(completeOrderPayload.status).toBe(1);
    expect(completeOrderPayload.message).toBe('Payment success!');

    const paymentRows = await prisma.$queryRaw<Array<{ razorpay_payment_id: string; course_id: number }>>(Prisma.sql`
      SELECT razorpay_payment_id, course_id
      FROM payment_info
      WHERE user_id = ${fixture.userId}
      ORDER BY id ASC
    `);

    expect(paymentRows.length).toBe(1);
    expect(paymentRows[0]?.razorpay_payment_id).toBe(firstPaymentId);
    expect(paymentRows[0]?.course_id).toBe(COURSE_ID);

    const enrolRows = await prisma.$queryRaw<Array<{ course_id: number }>>(Prisma.sql`
      SELECT course_id
      FROM enrol
      WHERE user_id = ${fixture.userId}
        AND deleted_at IS NULL
    `);
    expect(enrolRows[0]?.course_id).toBe(COURSE_ID);

    const learnerCourse = await prisma.$queryRaw<Array<{ course_id: number }>>(Prisma.sql`
      SELECT course_id
      FROM users
      WHERE id = ${fixture.userId}
      LIMIT 1
    `);
    expect(learnerCourse[0]?.course_id).toBe(COURSE_ID);

    const secondOrderResponse = await app.inject({
      method: 'GET',
      url: '/api/payment/create_order',
      query: {
        auth_token: fixture.authToken,
        course_id: COURSE_ID,
      },
    });
    const secondOrderId = parseJsonBody<{ data: { order_id: string } }>(secondOrderResponse.body).data.order_id;

    const duplicateCompletion = await app.inject({
      method: 'GET',
      url: '/api/payment/complete_order',
      query: {
        auth_token: fixture.authToken,
        course_id: COURSE_ID,
        razorpay_order_id: secondOrderId,
        razorpay_payment_id: firstPaymentId,
        razorpay_signature: createSignature(secondOrderId, firstPaymentId),
      },
    });

    const duplicateCompletionPayload = parseJsonBody<{ status: number; message: string }>(duplicateCompletion.body);
    expect(duplicateCompletionPayload.status).toBe(0);
    expect(duplicateCompletionPayload.message).toBe('Payment already processed or invalid.');

    const tamperOrderResponse = await app.inject({
      method: 'GET',
      url: '/api/payment/create_order',
      query: {
        auth_token: fixture.authToken,
        course_id: COURSE_ID,
      },
    });
    const tamperOrderId = parseJsonBody<{ data: { order_id: string } }>(tamperOrderResponse.body).data.order_id;

    const orderCourseTamper = await app.inject({
      method: 'GET',
      url: '/api/payment/complete_order',
      query: {
        auth_token: fixture.authToken,
        course_id: TAMPER_COURSE_ID,
        razorpay_order_id: tamperOrderId,
        razorpay_payment_id: 'pay_phase08_tamper',
        razorpay_signature: createSignature(tamperOrderId, 'pay_phase08_tamper'),
      },
    });

    const orderCourseTamperPayload = parseJsonBody<{ status: number; message: string }>(orderCourseTamper.body);
    expect(orderCourseTamperPayload.status).toBe(0);
    expect(orderCourseTamperPayload.message).toBe('Payment verification failed.');
  });

  it('returns student fee ledger and payment details parity payloads', async () => {
    const fixture = await seedCommerceFixture(app);
    const now = new Date().toISOString();

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO enrol (
        user_id,
        course_id,
        enrollment_date,
        enrollment_status,
        mode_of_study,
        discount_perc,
        created_by,
        created_at
      ) VALUES (
        ${fixture.userId},
        ${COURSE_ID},
        ${dayOffset(-3)},
        ${'Active'},
        ${'Online'},
        10,
        ${fixture.userId},
        ${now}
      )
    `);

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO student_fee (user_id, course_id, amount, due_date, status, created_at)
      VALUES
        (${fixture.userId}, ${COURSE_ID}, 800, ${dayOffset(-10)}, ${'Paid'}, ${now}),
        (${fixture.userId}, ${COURSE_ID}, 600, ${dayOffset(-2)}, ${'Pending'}, ${now}),
        (${fixture.userId}, ${COURSE_ID}, 600, ${dayOffset(7)}, ${'Pending'}, ${now})
    `);

    const studentCoursesResponse = await app.inject({
      method: 'GET',
      url: '/api/payment/get_student_courses',
      query: {
        auth_token: fixture.authToken,
      },
    });

    expect(studentCoursesResponse.statusCode).toBe(200);
    const studentCoursesPayload = parseJsonBody<{
      status: number;
      data: Array<{
        total_fee: number;
        amount_paid: number;
        balance: number;
        payment_percentage: number;
        status: string;
        installments: unknown[];
      }>;
    }>(studentCoursesResponse.body);

    expect(studentCoursesPayload.status).toBe(1);
    expect(studentCoursesPayload.data.length).toBe(1);
    expect(studentCoursesPayload.data[0]?.total_fee).toBe(1800);
    expect(studentCoursesPayload.data[0]?.amount_paid).toBe(800);
    expect(studentCoursesPayload.data[0]?.balance).toBe(1200);
    expect(studentCoursesPayload.data[0]?.payment_percentage).toBe(40);
    expect(studentCoursesPayload.data[0]?.status).toBe('Overdue');
    expect(studentCoursesPayload.data[0]?.installments.length).toBe(3);

    const paymentDetailsResponse = await app.inject({
      method: 'GET',
      url: '/api/payment/get_payment_details',
      query: {
        auth_token: fixture.authToken,
        course_id: COURSE_ID,
      },
    });

    expect(paymentDetailsResponse.statusCode).toBe(200);
    const paymentDetailsPayload = parseJsonBody<{
      status: number;
      data: {
        total_fee: string;
        amount_paid: string;
        balance: string;
        payment_percentage: string;
        installments: unknown[];
      };
    }>(paymentDetailsResponse.body);

    expect(paymentDetailsPayload.status).toBe(1);
    expect(paymentDetailsPayload.data.total_fee).toBe('');
    expect(paymentDetailsPayload.data.amount_paid).toBe('');
    expect(paymentDetailsPayload.data.balance).toBe('');
    expect(paymentDetailsPayload.data.payment_percentage).toBe('');
    expect(paymentDetailsPayload.data.installments.length).toBe(3);
  });

  it('applies 100 percent coupons with enrollment and payment side effects', async () => {
    const fixture = await seedCommerceFixture(app);

    const freeCouponResponse = await app.inject({
      method: 'GET',
      url: '/api/payment/apply_coupon',
      query: {
        auth_token: fixture.authToken,
        course_id: COURSE_ID,
        package_id: PACKAGE_ID,
        coupon_code: 'FREE100',
      },
    });

    expect(freeCouponResponse.statusCode).toBe(200);
    const freeCouponPayload = parseJsonBody<{
      status: string;
      is_free: number;
      valid: number;
      message: string;
      offer_price: number;
    }>(freeCouponResponse.body);

    expect(freeCouponPayload.status).toBe('success');
    expect(freeCouponPayload.is_free).toBe(1);
    expect(freeCouponPayload.valid).toBe(1);
    expect(freeCouponPayload.message).toBe('Coupon code applied successfully!');
    expect(freeCouponPayload.offer_price).toBe(2500);

    const freePaymentRows = await prisma.$queryRaw<Array<{ coupon_id: number; package_id: number; course_id: number }>>(
      Prisma.sql`
        SELECT coupon_id, package_id, course_id
        FROM payment_info
        WHERE user_id = ${fixture.userId}
          AND coupon_id = ${COUPON_FREE_ID}
          AND deleted_at IS NULL
      `,
    );

    expect(freePaymentRows.length).toBe(1);
    expect(freePaymentRows[0]?.package_id).toBe(PACKAGE_ID);
    expect(freePaymentRows[0]?.course_id).toBe(COURSE_ID);

    const enrolRows = await prisma.$queryRaw<Array<{ course_id: number; package_id: number }>>(Prisma.sql`
      SELECT course_id, package_id
      FROM enrol
      WHERE user_id = ${fixture.userId}
        AND deleted_at IS NULL
    `);

    expect(enrolRows.length).toBe(1);
    expect(enrolRows[0]?.course_id).toBe(COURSE_ID);
    expect(enrolRows[0]?.package_id).toBe(PACKAGE_ID);
  });
});
