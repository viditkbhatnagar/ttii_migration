import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { PrismaClient } from '@prisma/client';

// Naji 2026-08-27 — "One of the students has received the Registration Fee
// Payment Link through SMS only. The student has not received the payment link
// via email and the counsellor has also not received the acknowledgement mail
// too."
//
// Traced from the access log: all three links the student was sent came from
// /admin/applications/instalment_payment_link, NOT the payment-link/generate
// route. generateInstalmentPaymentLink created the Razorpay link and stopped —
// no email, no counsellor CC — and Razorpay's own email is deliberately
// suppressed (notify.email=false, so students never receive two), which left
// SMS as the only channel that ever fired.
//
// These lock the email in place, because nothing else does: the sibling route
// has always emailed and this one silently did not, and that difference was
// invisible until a student complained.

const sendEmail = vi.fn(() => Promise.resolve({ id: 'msg-1' }));
const createPaymentLink = vi.fn(() =>
  Promise.resolve({ shortUrl: 'https://rzp.io/rzp/8IbimnP', paymentLinkId: 'plink_test' }),
);

vi.mock('../../src/integrations/registry.js', () => ({
  createIntegrationRegistry: () => ({
    payment: { createPaymentLink },
    email: { sendEmail },
  }),
}));

const { OperationsService } = await import('../../src/operations/operations-service.js');

const APP_ID = 241;
const COUNSELLOR_ID = 9;
const STUDENT_EMAIL = 'student@example.com';
const COUNSELLOR_EMAIL = 'counsellor@teachersindia.in';

/** An instalment plan whose registration row is already settled. */
function paymentPlan(): string {
  return JSON.stringify({
    mode: 'installment',
    installments: [
      { label: 'Registration Fee', amountMinor: 400000 },
      { label: 'Instalment 2', amountMinor: 400000, dueDate: '2026-09-30' },
    ],
  });
}

function makeService(): { service: InstanceType<typeof OperationsService>; events: Record<string, unknown>[] } {
  const events: Record<string, unknown>[] = [];

  const prisma = {
    applications: {
      findFirst: () => Promise.resolve({
        id: APP_ID,
        application_id: 'TTIIAPP0241',
        name: 'Shameema V Y',
        user_email: STUDENT_EMAIL,
        phone: '9800000000',
        payment_plan: paymentPlan(),
        // 'paid' synthesises an approved index 0, which is what unlocks index 1.
        payment_status: 'paid',
        student_id: null,
        course_id: 16,
        stage: 'payment',
        is_converted: 0,
        offering_id: 4,
        pipeline_user: COUNSELLOR_ID,
      }),
      update: () => Promise.resolve({ id: APP_ID }),
    },
    course: { findFirst: () => Promise.resolve({ title: 'Nursery Teacher Training' }) },
    offerings: { findFirst: () => Promise.resolve({ title: 'September 2026' }) },
    users: {
      findFirst: ({ where }: { where: { id?: number } }) =>
        Promise.resolve(
          where.id === COUNSELLOR_ID
            ? { user_email: COUNSELLOR_EMAIL, email: null, role_id: 9 }
            : { user_email: 'admin@teachersindia.in', email: null, role_id: 1 },
        ),
    },
    application_events: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        events.push(data);
        return Promise.resolve({ id: 1, ...data });
      },
    },
  } as unknown as PrismaClient;

  return { service: new OperationsService(prisma), events };
}

beforeEach(() => {
  sendEmail.mockClear();
  createPaymentLink.mockClear();
  sendEmail.mockImplementation(() => Promise.resolve({ id: 'msg-1' }));
});

describe('instalment payment link', () => {
  test('emails the student and CCs the counsellor', async () => {
    const { service } = makeService();

    const result = await service.generateInstalmentPaymentLink('1', String(APP_ID), 1);

    expect(result.status).toBe(1);
    // The load-bearing assertion: an email actually goes out. Before this fix
    // the link was created and nothing was ever sent.
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const sent = sendEmail.mock.calls[0]?.[0] as unknown as {
      to: string; cc?: string[]; subject: string; html: string;
    };
    expect(sent.to).toBe(STUDENT_EMAIL);
    // The counsellor's "acknowledgement mail" is this CC.
    expect(sent.cc).toEqual([COUNSELLOR_EMAIL]);
    expect(sent.subject).toContain('Instalment 2');
    // The actual payment link has to be in the body, or the email is pointless.
    expect(sent.html).toContain('https://rzp.io/rzp/8IbimnP');
  });

  test('reports delivery honestly when the mail fails, and still returns the link', async () => {
    const { service, events } = makeService();
    sendEmail.mockImplementation(() => Promise.reject(new Error('MsGraph 503')));

    const result = await service.generateInstalmentPaymentLink('1', String(APP_ID), 1);

    // The link was created, so it must still be returned — losing it would be
    // worse than a missing email.
    expect(result.status).toBe(1);
    expect((result.data as Record<string, unknown>).payment_link_url).toBe('https://rzp.io/rzp/8IbimnP');

    // ...but nobody may be told it was emailed when it was not.
    expect((result.data as Record<string, unknown>).email_delivered).toBe(false);
    expect(String(result.message)).toMatch(/email could not be sent/i);
    expect(String(events[0]?.description)).toMatch(/email delivery failed/i);
  });

  test('the first instalment is refused — that is the registration link route', async () => {
    const { service } = makeService();

    const result = await service.generateInstalmentPaymentLink('1', String(APP_ID), 0);

    expect(result.status).toBe(0);
    expect(String(result.message)).toMatch(/registration payment link/i);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('the instalment email template', () => {
  test('states the one instalment being collected, not the whole course fee', async () => {
    const { renderInstalmentPaymentEmail } = await import('../../src/integrations/payment-emails.js');

    const html = renderInstalmentPaymentEmail({
      studentFirstName: 'Shameema',
      courseName: 'Nursery Teacher Training',
      offeringName: 'September 2026',
      instalmentLabel: 'Instalment 2',
      amountPayable: 4000,
      paymentLink: 'https://rzp.io/rzp/8IbimnP',
      paymentDueDate: '30 Sep 2026',
    });

    expect(html).toContain('Instalment 2');
    expect(html).toContain('4,000');
    expect(html).toContain('https://rzp.io/rzp/8IbimnP');
    expect(html).toContain('30 Sep 2026');

    // renderFullPaymentEmail was deliberately NOT reused: it presents Total
    // Course Fee / Discount / Total Amount Payable, which would misstate what
    // the student owes right now on a single instalment.
    expect(html).not.toContain('Total Course Fee');
    expect(html).not.toContain('Total Amount Payable');
  });

  test('escapes the label rather than injecting it raw', async () => {
    const { renderInstalmentPaymentEmail } = await import('../../src/integrations/payment-emails.js');

    const html = renderInstalmentPaymentEmail({
      studentFirstName: 'A',
      courseName: 'C',
      offeringName: 'O',
      instalmentLabel: '<script>x</script>',
      amountPayable: 100,
      paymentLink: 'https://rzp.io/rzp/x',
    });

    expect(html).not.toContain('<script>x</script>');
  });
});
