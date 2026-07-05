// Lovable-designed account/auth emails (Naji 2026-07-05), from the
// "TTII New LMS Details" sheet — Users module:
//   1. User Creation      — when a user is created (Users/Counsellors/Instructors)
//   2. Password Reset OTP  — when a user requests a password reset
//
// Same navy Lovable shell as the payment emails (integrations/payment-emails.ts)
// but self-contained here to avoid touching that live file. The shared shell is
// worth extracting into a lovable-email-shell.ts once a third consumer lands.
//
// Email-client compatibility: inline styles only, <table> layout, PNG logo
// (SVG fails on Outlook desktop).

const NAVY = '#0B2758';
const NAVY_GRADIENT = 'linear-gradient(135deg,#0B2758 0%,#1E4D9B 100%)';
const ORANGE = '#F47C2C';
const INK = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const SOFT = '#F8FAFC';
const FONT = "'Inter',Arial,sans-serif";

// White wordmark on the navy header (served from the static /logos folder).
const LOGO_URL_WHITE = 'https://learn.teachersindia.in/logos/ttii-full-white.png';
// The Lovable body "Need assistance?" blocks show support@; the footer uses info@.
const BODY_SUPPORT_EMAIL = 'support@teachersindia.in';

export interface UserCreationEmailData {
  userFullName: string;
  userRole: string;
  /** Login username = the user's email. */
  emailId: string;
  temporaryPassword: string;
  loginUrl: string;
}

export interface PasswordResetOtpEmailData {
  name: string;
  otpCode: string;
  /** Validity window in whole minutes. */
  otpValidityMinutes: number;
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

// Only allow http(s) links in a CTA href — blocks a javascript:/data: scheme
// ever riding in via a future caller. Falls back to the admin portal.
function safeUrl(url: string): string {
  const trimmed = (url ?? '').trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : 'https://admin.teachersindia.in';
}

function orDash(value: string | undefined): string {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? '—' : esc(trimmed);
}

const LABEL_ORANGE = `font-family:${FONT};font-size:12px;letter-spacing:0.8px;text-transform:uppercase;color:${ORANGE};font-weight:700;`;
const LABEL_NAVY = `font-family:${FONT};font-size:12px;letter-spacing:0.8px;text-transform:uppercase;color:${NAVY};font-weight:700;`;
const PARA = `font-family:${FONT};font-size:15px;line-height:24px;color:${INK};`;

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
    .details-table td { font-size: 12px !important; padding: 10px 8px !important; }
    .otp-code { font-size: 28px !important; letter-spacing: 8px !important; }
  }`;

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
                  <a href="mailto:info@teachersindia.in" style="margin:2px 0 0;font-family:${FONT};font-size:13px;color:#ffffff;text-decoration:none;font-weight:500;">info@teachersindia.in</a>
                </td>
                <td class="stack" width="34%" valign="top" style="padding:6px 0;">
                  <p style="margin:0;font-family:${FONT};font-size:12px;color:#CBD5E1;">Phone</p>
                  <p style="margin:2px 0 0;font-family:${FONT};font-size:13px;color:#ffffff;font-weight:500;">+91 984 740 0222</p>
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

/** Navy header (white logo) + white card + dark footer. These two templates carry no social row. */
function shell(opts: { title: string; preheader: string; bodyInner: string; extraStyle?: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${esc(opts.title)}</title>
<style>${SHARED_STYLE}${opts.extraStyle ?? ''}</style>
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
          ${footerBlock()}
          <tr><td style="height:20px;line-height:20px;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Two-row key/value details card (label + value), used for Account Details / Login Credentials. */
function detailsCard(sectionLabel: string, rows: Array<{ label: string; value: string }>): string {
  const trs = rows
    .map((r, i) => {
      const bg = i % 2 === 0 ? '#FFFFFF' : SOFT;
      return `<tr>
        <td style="padding:14px 12px;font-family:${FONT};font-size:14px;color:${MUTED};border:1px solid ${BORDER};background:${bg};vertical-align:top;width:50%;">${esc(r.label)}</td>
        <td style="padding:14px 12px;font-family:${FONT};font-size:14px;font-weight:600;color:${INK};border:1px solid ${BORDER};background:${bg};vertical-align:top;width:50%;">${orDash(r.value)}</td>
      </tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SOFT};border:1px solid ${BORDER};border-radius:12px;margin-bottom:24px;">
    <tr>
      <td class="px" style="padding:20px 24px;">
        <p style="margin:0 0 12px;${LABEL_ORANGE}">${esc(sectionLabel)}</p>
        <div class="table-wrap" style="display:block;">
          <table class="details-table" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
            ${trs}
          </table>
        </div>
      </td>
    </tr>
  </table>`;
}

export function renderUserCreationEmail(data: UserCreationEmailData): string {
  const bodyInner = `
    <p style="margin:0 0 22px;${PARA}">Dear ${orDash(data.userFullName)},</p>
    <p style="margin:0 0 22px;${PARA}">Welcome to Teachers' Training Institute of India.</p>
    <p style="margin:0 0 22px;${PARA}">Your Learning Management System account has been successfully created. You can now access the platform using the credentials provided below.</p>
    ${detailsCard('Account Details', [
      { label: 'Name', value: data.userFullName },
      { label: 'Role', value: data.userRole },
    ])}
    ${detailsCard('Login Credentials', [
      { label: 'Username', value: data.emailId },
      { label: 'Temporary Password', value: data.temporaryPassword },
    ])}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="left" style="margin-top:6px;margin-bottom:24px;">
      <tr>
        <td align="center" bgcolor="${ORANGE}" style="border-radius:12px;">
          <a href="${escAttr(safeUrl(data.loginUrl))}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;background:${ORANGE};">Login to LMS</a>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF4FF;border:1px solid ${BORDER};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td class="px" style="padding:24px 24px;">
          <p style="margin:0 0 12px;${LABEL_NAVY}">Getting Started</p>
          <p style="margin:0 0 12px;${PARA}">After logging in, we recommend that you:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="top" style="padding:6px 0 6px 4px;${PARA}">&bull;</td>
              <td valign="top" style="padding:6px 0;${PARA}">Change your temporary password immediately.</td>
            </tr>
            <tr>
              <td valign="top" style="padding:6px 0 6px 4px;${PARA}">&bull;</td>
              <td valign="top" style="padding:6px 0;${PARA}">Review your dashboard and assigned modules.</td>
            </tr>
            <tr>
              <td valign="top" style="padding:6px 0 6px 4px;${PARA}">&bull;</td>
              <td valign="top" style="padding:6px 0;${PARA}">Familiarize yourself with your role-specific features and responsibilities.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td class="px" style="padding:24px 24px;">
          <p style="margin:0 0 12px;font-family:${FONT};font-size:12px;letter-spacing:0.8px;text-transform:uppercase;color:#C2410C;font-weight:700;">Security Notice</p>
          <p style="margin:0 0 12px;${PARA}">Your login credentials are personal and must not be shared with anyone.</p>
          <p style="margin:0 0 12px;${PARA}">For security reasons, please change your password after your first login.</p>
          <p style="margin:0;${PARA}">If you suspect unauthorized access to your account, contact the System Administrator immediately.</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF4FF;border:1px solid ${BORDER};border-radius:12px;">
      <tr>
        <td class="px" style="padding:24px 24px;">
          <p style="margin:0 0 12px;${LABEL_NAVY}">Need Assistance?</p>
          <p style="margin:0 0 12px;${PARA}">If you experience any issues accessing your account or require technical support, please contact the LMS Support Team.</p>
          <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};">Email</p>
          <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:600;color:${INK};">${esc(BODY_SUPPORT_EMAIL)}</p>
        </td>
      </tr>
    </table>`;

  return shell({
    title: "Welcome to LMS — Teachers' Training Institute of India",
    preheader: 'Your LMS account has been successfully created at Teachers’ Training Institute of India.',
    bodyInner,
  });
}

export function renderPasswordResetOtpEmail(data: PasswordResetOtpEmailData): string {
  const validity = Number.isFinite(data.otpValidityMinutes) && data.otpValidityMinutes > 0
    ? String(Math.round(data.otpValidityMinutes))
    : '2';
  const bodyInner = `
    <p style="margin:0 0 22px;${PARA}">Dear ${orDash(data.name)},</p>
    <p style="margin:0 0 22px;${PARA}">We received a request to reset the password for your Teachers' Training Institute of India LMS account.</p>
    <p style="margin:0 0 22px;${PARA}">To continue with the password reset process, please use the One-Time Password (OTP) below.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF4FF;border:1px solid ${BORDER};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td class="px" align="center" style="padding:32px 24px;">
          <p style="margin:0 0 12px;${LABEL_NAVY}">Password Reset OTP</p>
          <p class="otp-code" style="margin:0;font-family:${FONT};font-size:36px;font-weight:700;letter-spacing:12px;color:${NAVY};">${orDash(data.otpCode)}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SOFT};border:1px solid ${BORDER};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td class="px" style="padding:24px 24px;">
          <p style="margin:0 0 12px;${LABEL_ORANGE}">OTP Validity</p>
          <p style="margin:0 0 12px;${PARA}">This OTP is valid for ${esc(validity)} minutes.</p>
          <p style="margin:0 0 12px;${PARA}">It can be used only once.</p>
          <p style="margin:0;${PARA}">For your security, do not share this code with anyone.</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td class="px" style="padding:24px 24px;">
          <p style="margin:0 0 12px;${PARA}">If you did not request a password reset, you can safely ignore this email. Your account will remain secure, and no changes will be made unless this OTP is used.</p>
          <p style="margin:0;${PARA}">If you continue to experience issues accessing your account, please contact our Support Team.</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF4FF;border:1px solid ${BORDER};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td class="px" style="padding:24px 24px;">
          <p style="margin:0 0 12px;${LABEL_NAVY}">Need assistance?</p>
          <p style="margin:0 0 4px;font-family:${FONT};font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:${MUTED};">Email</p>
          <p style="margin:0;font-family:${FONT};font-size:15px;font-weight:600;color:${INK};">${esc(BODY_SUPPORT_EMAIL)}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F5F9;border:1px solid ${BORDER};border-radius:12px;">
      <tr>
        <td class="px" style="padding:24px 24px;">
          <p style="margin:0 0 8px;font-family:${FONT};font-size:12px;letter-spacing:0.8px;text-transform:uppercase;color:${MUTED};font-weight:700;">System Notification</p>
          <p style="margin:0;font-family:${FONT};font-size:14px;line-height:22px;color:${MUTED};">This is an automated email. Please do not reply directly to this message.</p>
        </td>
      </tr>
    </table>`;

  return shell({
    title: "Password Reset — Teachers' Training Institute of India",
    preheader: 'Use the OTP below to reset your Teachers’ Training Institute of India LMS password.',
    bodyInner,
    extraStyle: '',
  });
}
