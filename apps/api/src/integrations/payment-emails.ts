// Lovable-designed transactional payment emails (Naji 2026-07-04).
//
// These reproduce the three "Ready in Lovable" templates from the
// "TTII New LMS Details" sheet 1:1 (navy gradient header + white wordmark,
// orange Pay-Now CTA, Inter/Arial type):
//   1. Payment Plan     — counsellor "Send Payment link" against Reg Fee
//   2. Full Payment     — counsellor "Send Payment link" against Full Course Fee
//   3. Payment Approval  — counsellor records a Manual Payment (to Finance)
//
// Kept separate from the general renderBrandedEmail() wrapper on purpose:
// that wrapper is the TTII purple system used for auth/welcome/status mail;
// these three follow the distinct navy Lovable payment design Naji signed off.
//
// Email-client compatibility: inline styles only, <table> layout, PNG logo
// (SVG fails on Outlook desktop) — same constraints as email-template.ts.

const NAVY = '#0B2758';
const NAVY_GRADIENT = 'linear-gradient(135deg,#0B2758 0%,#1E4D9B 100%)';
const ORANGE = '#F47C2C';
const INK = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const SOFT = '#F8FAFC';

// White wordmark on the navy header (rsvg-converted from ttii-full-white.svg,
// served from the static /logos folder alongside ttii-full-color.png).
const LOGO_URL_WHITE = 'https://learn.teachersindia.in/logos/ttii-full-white.png';
const DEFAULT_SUPPORT_EMAIL = 'info@teachersindia.in';
const DEFAULT_SUPPORT_PHONE = '+91 984 740 0222';
const FONT = "'Inter',Arial,sans-serif";

export interface PaymentPlanInstalmentRow {
  /** Row description, e.g. "Registration Fee" / "Instalment 2". */
  title: string;
  /** Pre-formatted display date, e.g. "15 Jul 2026". Blank renders as "—". */
  dueDate: string;
  /** Amount in rupees (major units). */
  amount: number;
}

export interface PaymentPlanEmailData {
  studentFirstName: string;
  courseName: string;
  offeringName: string;
  instalments: PaymentPlanInstalmentRow[];
  /** Total course fee in rupees. */
  totalFee: number;
  /** Amount payable now (first/registration instalment) in rupees. */
  payNowAmount: number;
  paymentLink: string;
  /** Pre-formatted display date; omitted → the deadline line is dropped. */
  paymentExpiryDate?: string;
  counsellorEmail?: string;
  counsellorPhone?: string;
  /** Currency symbol prefix. Default "₹". */
  currency?: string;
}

export interface FullPaymentEmailData {
  studentFirstName: string;
  courseName: string;
  offeringName: string;
  totalCourseFee: number;
  discountAmount: number;
  totalAmountPayable: number;
  paymentLink: string;
  paymentDueDate?: string;
  supportEmail?: string;
  supportPhone?: string;
  currency?: string;
}

export interface PaymentApprovalEmailData {
  studentName: string;
  applicationId: string;
  /** Enrolled student id, blank when not yet enrolled. */
  studentId?: string;
  courseName: string;
  offeringName: string;
  /** e.g. "Registration", "Instalment 2", or "Full Payment". */
  instalmentLabel: string;
  /** Amount received in rupees. */
  amount: number;
  paymentMethod: string;
  /** Pre-formatted display date. */
  paymentDate: string;
  transactionReference?: string;
  recordedByName: string;
  /** Pre-formatted display datetime. */
  recordedDateTime: string;
  currency?: string;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(value: string): string {
  return value.replace(/"/g, '&quot;');
}

function money(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return safe.toLocaleString('en-IN');
}

function orDash(value: string | undefined): string {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? '—' : esc(trimmed);
}

const SHARED_STYLE = `
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; display: block; }
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${SOFT}; font-family: ${FONT}; color: ${INK}; }
  a { color: ${NAVY}; text-decoration: none; }
  @media screen and (max-width: 640px) {
    .container { width: 100% !important; }
    .px { padding-left: 20px !important; padding-right: 20px !important; }
    .stack { display: block !important; width: 100% !important; max-width: 100% !important; }
    .table-wrap { display: block !important; overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }
    .data-table th, .data-table td { font-size: 12px !important; padding: 10px 8px !important; }
  }`;

const SOCIAL_LINKS: Array<{ href: string; label: string; size: string }> = [
  { href: 'https://facebook.com/teachersindia', label: 'f', size: '16px' },
  { href: 'https://instagram.com/teachersindia', label: 'IG', size: '14px' },
  { href: 'https://linkedin.com/company/teachersindia', label: 'in', size: '13px' },
  { href: 'https://youtube.com/@teachersindia', label: 'YT', size: '13px' },
];

function socialBlock(): string {
  const cells = SOCIAL_LINKS
    .map(
      (s) => `<td style="padding:0 6px;">
        <a href="${escAttr(s.href)}" style="display:inline-block;width:40px;height:40px;line-height:40px;text-align:center;background:${NAVY};color:#ffffff;border-radius:50%;font-family:Arial,sans-serif;font-size:${s.size};font-weight:700;text-decoration:none;">${s.label}</a>
      </td>`,
    )
    .join('');
  return `<tr>
    <td align="center" style="padding:32px 16px 24px;">
      <p style="margin:0 0 14px;font-family:${FONT};font-size:14px;color:${MUTED};">Stay connected for updates and learning tips.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>
    </td>
  </tr>`;
}

function footerBlock(): string {
  return `<tr>
    <td style="background:#0F172A;border-radius:14px;padding:36px 36px 28px;" class="px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <p style="margin:0;font-family:${FONT};font-size:18px;font-weight:700;color:#ffffff;">Teachers' Training Institute of India</p>
            <p style="margin:6px 0 0;font-family:${FONT};font-size:13px;color:#CBD5E1;">Empower. Educate. Evolve</p>
          </td>
        </tr>
        <tr><td style="height:22px;line-height:22px;">&nbsp;</td></tr>
        <tr>
          <td>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="stack" width="33%" valign="top" style="padding:6px 0;">
                  <p style="margin:0;font-family:${FONT};font-size:12px;color:#CBD5E1;">Email</p>
                  <a href="mailto:${DEFAULT_SUPPORT_EMAIL}" style="margin:2px 0 0;font-family:${FONT};font-size:13px;color:#ffffff;text-decoration:none;font-weight:500;">${DEFAULT_SUPPORT_EMAIL}</a>
                </td>
                <td class="stack" width="34%" valign="top" style="padding:6px 0;">
                  <p style="margin:0;font-family:${FONT};font-size:12px;color:#CBD5E1;">Phone</p>
                  <p style="margin:2px 0 0;font-family:${FONT};font-size:13px;color:#ffffff;font-weight:500;">${DEFAULT_SUPPORT_PHONE}</p>
                </td>
                <td class="stack" width="33%" valign="top" style="padding:6px 0;">
                  <p style="margin:0;font-family:${FONT};font-size:12px;color:#CBD5E1;letter-spacing:0.6px;text-transform:uppercase;">Website</p>
                  <a href="https://teachersindia.in" target="_blank" style="margin:2px 0 0;font-family:${FONT};font-size:13px;color:#ffffff;text-decoration:none;font-weight:500;">teachersindia.in</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="padding:22px 0 0;"><div style="height:1px;background:${NAVY};line-height:1px;font-size:0;">&nbsp;</div></td></tr>
        <tr>
          <td align="center" style="padding-top:18px;">
            <p style="margin:0;font-family:${FONT};font-size:12px;color:#CBD5E1;">© 2026 Teachers' Training Institute of India. All Rights Reserved.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

/** Wrap card-body HTML in the shared Lovable shell (navy header + white logo + social + footer). */
function lovableShell(opts: { title: string; preheader: string; bodyInner: string; withSocial?: boolean }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${esc(opts.title)}</title>
<style>${SHARED_STYLE}</style>
</head>
<body style="margin:0;padding:0;background-color:${SOFT};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${SOFT};opacity:0;">${esc(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${SOFT}">
    <tr>
      <td align="center" style="padding: 24px 12px;">
        <table role="presentation" class="container" width="650" cellpadding="0" cellspacing="0" border="0" style="width:650px;max-width:650px;">
          <tr>
            <td align="center" style="background:${NAVY};background:${NAVY_GRADIENT};border-radius:14px 14px 0 0;padding:40px 28px 36px;">
              <img src="${LOGO_URL_WHITE}" alt="Teachers' Training Institute of India" width="240" style="display:block;border:0;outline:none;text-decoration:none;max-width:80%;height:auto;margin:0 auto;" />
            </td>
          </tr>
          <tr>
            <td style="background:${SOFT};padding:24px 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid ${BORDER};border-radius:14px;box-shadow:0 4px 14px rgba(26,46,38,0.05);">
                <tr><td class="px" style="padding: 32px 36px;">${opts.bodyInner}</td></tr>
              </table>
            </td>
          </tr>
          ${opts.withSocial === false ? '' : socialBlock()}
          ${footerBlock()}
          <tr><td style="height:20px;line-height:20px;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const SECTION_LABEL = `font-family:${FONT};font-size:12px;letter-spacing:0.8px;text-transform:uppercase;color:${ORANGE};font-weight:700;`;
const PARA = `font-family:${FONT};font-size:15px;line-height:24px;color:${INK};`;

/** Programme details card (Course / Course Offering) shared by plan + full-payment. */
function programmeDetails(courseName: string, offeringName: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SOFT};border:1px solid ${BORDER};border-radius:12px;margin-bottom:24px;">
    <tr>
      <td class="px" style="padding:20px 24px;">
        <p style="margin:0 0 12px;${SECTION_LABEL}">Programme Details</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="stack" width="50%" valign="top" style="padding:8px 0;">
              <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};">Course</p>
              <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:600;color:${INK};">${orDash(courseName)}</p>
            </td>
            <td class="stack" width="50%" valign="top" style="padding:8px 0;">
              <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};">Course Offering</p>
              <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:600;color:${INK};">${orDash(offeringName)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

function payNowButton(paymentLink: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left" style="margin-top:22px;">
    <tr>
      <td align="center" bgcolor="${ORANGE}" style="border-radius:12px;">
        <a href="${escAttr(paymentLink)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;background:${ORANGE};">Pay Now &rarr;</a>
      </td>
    </tr>
  </table>`;
}

export function renderPaymentPlanEmail(data: PaymentPlanEmailData): string {
  const currency = data.currency ?? '₹';
  const rows = data.instalments
    .map((row, index) => {
      const bg = index % 2 === 0 ? '#FFFFFF' : SOFT;
      const isLast = index === data.instalments.length - 1;
      const cellBase = `padding:14px 12px;font-family:${FONT};font-size:14px;color:${INK};${isLast ? '' : `border-bottom:1px solid ${BORDER};`}background:${bg};`;
      return `<tr>
        <td align="left" style="${cellBase}">${index + 1}</td>
        <td align="left" style="${cellBase}">${orDash(row.title)}</td>
        <td align="left" style="${cellBase}">${orDash(row.dueDate)}</td>
        <td align="right" style="${cellBase}font-weight:600;white-space:nowrap;">${esc(currency)}${money(row.amount)}</td>
      </tr>`;
    })
    .join('');

  const th = `background:${NAVY};padding:14px 12px;font-family:${FONT};font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#ffffff;font-weight:600;border-bottom:1px solid ${BORDER};`;

  const expiryLi = data.paymentExpiryDate
    ? `<li style="margin-bottom:8px;">Please complete the payment before <strong>${esc(data.paymentExpiryDate)}</strong>.</li>`
    : '';

  const contactEmail = orDash(data.counsellorEmail);
  const contactPhone = orDash(data.counsellorPhone);

  const bodyInner = `
    <p style="margin:0 0 22px;${PARA}">Dear ${orDash(data.studentFirstName)},</p>
    <p style="margin:0 0 22px;${PARA}">We are delighted to inform you that your admission process has progressed successfully. Your payment plan has now been generated for the following programme.</p>
    ${programmeDetails(data.courseName, data.offeringName)}
    <p style="margin:0 0 12px;${SECTION_LABEL}">Payment Plan</p>
    <div class="table-wrap" style="display:block;">
      <table class="data-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
        <tr>
          <th align="left" style="${th}">Installment</th>
          <th align="left" style="${th}">Description</th>
          <th align="left" style="${th}">Due Date</th>
          <th align="right" style="${th}">Amount</th>
        </tr>
        ${rows}
      </table>
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
      <tr>
        <td style="background:${NAVY};background:${NAVY_GRADIENT};border-radius:12px;padding:20px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td class="stack" width="50%" valign="top" style="padding:6px 0;">
                <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#D6E4FF;">Total Course Fee</p>
                <p style="margin:0;font-family:${FONT};font-size:20px;line-height:26px;font-weight:700;color:#ffffff;">${esc(currency)}${money(data.totalFee)}</p>
              </td>
              <td class="stack" width="50%" valign="top" style="padding:6px 0;">
                <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;letter-spacing:0.6px;text-transform:uppercase;color:#D6E4FF;">Amount Payable Now</p>
                <p style="margin:0;font-family:${FONT};font-size:20px;line-height:26px;font-weight:700;color:#ffffff;">${esc(currency)}${money(data.payNowAmount)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;${PARA}">To continue your admission process, please complete the payment for the amount shown above.</p>
    ${payNowButton(data.paymentLink)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:28px;line-height:28px;font-size:0;">&nbsp;</td></tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;background:${SOFT};border:1px solid ${BORDER};border-radius:12px;">
      <tr>
        <td class="px" style="padding:22px 24px;">
          <p style="margin:0 0 12px;font-family:${FONT};font-size:14px;font-weight:700;color:${INK};">Important Information:</p>
          <ul style="margin:0;padding:0 0 0 18px;font-family:${FONT};font-size:14px;line-height:22px;color:${INK};">
            ${expiryLi}
            <li style="margin-bottom:8px;">Once your payment is successfully received and verified, your application will automatically move to the next stage of the admission process.</li>
            <li style="margin-bottom:8px;">A payment confirmation email and receipt will be sent after successful payment.</li>
            <li>If you require any assistance, our admissions team will be happy to help.</li>
          </ul>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
            <tr>
              <td class="stack" width="50%" valign="top" style="padding:6px 0;">
                <p style="margin:0;font-family:${FONT};font-size:13px;color:${MUTED};">Email</p>
                <p style="margin:2px 0 0;font-family:${FONT};font-size:14px;font-weight:600;color:${INK};">${contactEmail}</p>
              </td>
              <td class="stack" width="50%" valign="top" style="padding:6px 0;">
                <p style="margin:0;font-family:${FONT};font-size:13px;color:${MUTED};">Phone</p>
                <p style="margin:2px 0 0;font-family:${FONT};font-size:14px;font-weight:600;color:${INK};">${contactPhone}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:22px 0 0;${PARA}">We look forward to welcoming you to Teachers' Training Institute of India.</p>`;

  return lovableShell({
    title: "Payment Plan — Teachers' Training Institute of India",
    preheader: 'Your payment plan has been generated. Complete the payment to continue your admission.',
    bodyInner,
  });
}

export function renderFullPaymentEmail(data: FullPaymentEmailData): string {
  const currency = data.currency ?? '₹';
  const supportEmail = (data.supportEmail ?? DEFAULT_SUPPORT_EMAIL).trim() || DEFAULT_SUPPORT_EMAIL;
  const supportPhone = (data.supportPhone ?? DEFAULT_SUPPORT_PHONE).trim() || DEFAULT_SUPPORT_PHONE;
  const dueLi = data.paymentDueDate
    ? `<li style="margin-bottom:8px;">Please complete the payment on or before <strong>${esc(data.paymentDueDate)}</strong>.</li>`
    : '';

  const rowBase = `padding:14px 12px;font-family:${FONT};font-size:14px;color:${INK};border-bottom:1px solid ${BORDER};`;
  const th = `background:${NAVY};padding:14px 12px;font-family:${FONT};font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#ffffff;font-weight:600;border-bottom:1px solid ${BORDER};`;

  const bodyInner = `
    <p style="margin:0 0 22px;${PARA}">Dear ${orDash(data.studentFirstName)},</p>
    <p style="margin:0 0 22px;${PARA}">Thank you for choosing Teachers' Training Institute of India.</p>
    <p style="margin:0 0 22px;${PARA}">Your application has been successfully initiated, please review your programme details below and complete the payment to proceed with your admission.</p>
    ${programmeDetails(data.courseName, data.offeringName)}
    <p style="margin:0 0 12px;${SECTION_LABEL}">Payment Summary</p>
    <div class="table-wrap" style="display:block;">
      <table class="data-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
        <tr>
          <th align="left" style="${th}">Description</th>
          <th align="right" style="${th}">Amount</th>
        </tr>
        <tr>
          <td align="left" style="${rowBase}background:#FFFFFF;">Total Course Fee</td>
          <td align="right" style="${rowBase}background:#FFFFFF;font-weight:600;white-space:nowrap;">${esc(currency)}${money(data.totalCourseFee)}</td>
        </tr>
        <tr>
          <td align="left" style="${rowBase}background:${SOFT};">Discount</td>
          <td align="right" style="${rowBase}background:${SOFT};font-weight:600;white-space:nowrap;">${esc(currency)}${money(data.discountAmount)}</td>
        </tr>
        <tr>
          <td align="left" style="padding:14px 12px;font-family:${FONT};font-size:14px;font-weight:700;color:${INK};background:#FFFFFF;">Total Amount Payable</td>
          <td align="right" style="padding:14px 12px;font-family:${FONT};font-size:14px;font-weight:700;color:${INK};background:#FFFFFF;white-space:nowrap;">${esc(currency)}${money(data.totalAmountPayable)}</td>
        </tr>
      </table>
    </div>
    <p style="margin:24px 0 0;${PARA}">Please complete the payment to confirm your admission and move your application to the next stage.</p>
    ${payNowButton(data.paymentLink)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:28px;line-height:28px;font-size:0;">&nbsp;</td></tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;background:${SOFT};border:1px solid ${BORDER};border-radius:12px;">
      <tr>
        <td class="px" style="padding:22px 24px;">
          <p style="margin:0 0 12px;font-family:${FONT};font-size:14px;font-weight:700;color:${INK};">Important Information:</p>
          <ul style="margin:0;padding:0 0 0 18px;font-family:${FONT};font-size:14px;line-height:22px;color:${INK};">
            ${dueLi}
            <li style="margin-bottom:8px;">Once your payment is successfully received and verified, your admission process will automatically continue.</li>
            <li style="margin-bottom:8px;">A payment confirmation email and receipt will be sent immediately after successful payment.</li>
            <li>If you have any questions or require assistance, please contact our Admissions Team.</li>
          </ul>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
            <tr>
              <td class="stack" width="50%" valign="top" style="padding:6px 0;">
                <p style="margin:0;font-family:${FONT};font-size:13px;color:${MUTED};">Email</p>
                <p style="margin:2px 0 0;font-family:${FONT};font-size:14px;font-weight:600;color:${INK};">${esc(supportEmail)}</p>
              </td>
              <td class="stack" width="50%" valign="top" style="padding:6px 0;">
                <p style="margin:0;font-family:${FONT};font-size:13px;color:${MUTED};">Phone</p>
                <p style="margin:2px 0 0;font-family:${FONT};font-size:14px;font-weight:600;color:${INK};">${esc(supportPhone)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:22px 0 0;${PARA}">We look forward to welcoming you to Teachers' Training Institute of India.</p>`;

  return lovableShell({
    title: "Complete Your Payment — Teachers' Training Institute of India",
    preheader: 'Complete your payment to confirm your admission and continue your application.',
    bodyInner,
  });
}

export function renderPaymentApprovalEmail(data: PaymentApprovalEmailData): string {
  const currency = data.currency ?? '₹';
  const dCellLabel = `padding:14px 12px;font-family:${FONT};font-size:14px;color:${MUTED};border:1px solid ${BORDER};vertical-align:top;`;
  const dCellValue = `padding:14px 12px;font-family:${FONT};font-size:14px;font-weight:600;color:${INK};border:1px solid ${BORDER};vertical-align:top;`;

  const paymentRows: Array<{ label: string; value: string; nowrap?: boolean }> = [
    { label: 'Payment Installment', value: orDash(data.instalmentLabel) },
    { label: 'Amount Received', value: `${esc(currency)}${money(data.amount)}`, nowrap: true },
    { label: 'Payment Method', value: orDash(data.paymentMethod) },
    { label: 'Payment Date', value: orDash(data.paymentDate) },
    { label: 'Reference No.', value: orDash(data.transactionReference) },
    { label: 'Recorded By', value: orDash(data.recordedByName) },
    { label: 'Recorded On', value: orDash(data.recordedDateTime) },
  ];
  const paymentTable = paymentRows
    .map((r, i) => {
      const bg = i % 2 === 0 ? '#FFFFFF' : SOFT;
      return `<tr>
        <td style="${dCellLabel}background:${bg};">${esc(r.label)}</td>
        <td style="${dCellValue}background:${bg};${r.nowrap ? 'white-space:nowrap;' : ''}">${r.value}</td>
      </tr>`;
    })
    .join('');

  const bodyInner = `
    <p style="margin:0 0 22px;${PARA}">Dear Finance Team,</p>
    <p style="margin:0 0 22px;${PARA}">A payment has been recorded in the LMS and is awaiting your verification and approval.</p>
    <p style="margin:0 0 22px;${PARA}">Please review the payment details below.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SOFT};border:1px solid ${BORDER};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td class="px" style="padding:20px 24px;">
          <p style="margin:0 0 12px;${SECTION_LABEL}">Student Details</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td class="stack" width="50%" valign="top" style="padding:8px 0;">
                <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};">Student Name</p>
                <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:600;color:${INK};">${orDash(data.studentName)}</p>
              </td>
              <td class="stack" width="50%" valign="top" style="padding:8px 0;">
                <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};">Application ID</p>
                <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:600;color:${INK};">${orDash(data.applicationId)}</p>
              </td>
            </tr>
            <tr>
              <td class="stack" width="100%" valign="top" style="padding:8px 0;" colspan="2">
                <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};">Student ID</p>
                <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:600;color:${INK};">${orDash(data.studentId)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SOFT};border:1px solid ${BORDER};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td class="px" style="padding:20px 24px;">
          <p style="margin:0 0 12px;${SECTION_LABEL}">Programme Details</p>
          <div class="table-wrap" style="display:block;">
            <table class="data-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
              <tr>
                <td style="${dCellLabel}background:#FFFFFF;width:50%;">Course</td>
                <td style="${dCellValue}background:#FFFFFF;width:50%;">${orDash(data.courseName)}</td>
              </tr>
              <tr>
                <td style="${dCellLabel}background:${SOFT};width:50%;">Course Offering</td>
                <td style="${dCellValue}background:${SOFT};width:50%;">${orDash(data.offeringName)}</td>
              </tr>
            </table>
          </div>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SOFT};border:1px solid ${BORDER};border-radius:12px;">
      <tr>
        <td class="px" style="padding:20px 24px;">
          <p style="margin:0 0 12px;${SECTION_LABEL}">Payment Details</p>
          <div class="table-wrap" style="display:block;">
            <table class="data-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
              ${paymentTable}
            </table>
          </div>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;${PARA}">Please verify the payment details and approve or reject the transaction.</p>`;

  return lovableShell({
    title: "Payment Approval Required — Teachers' Training Institute of India",
    preheader: 'A payment has been recorded in the LMS and is awaiting your verification and approval.',
    bodyInner,
  });
}
