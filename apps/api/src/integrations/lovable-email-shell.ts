// Shared navy Lovable email shell.
//
// auth-emails.ts and payment-emails.ts each carry their own private copy of
// this shell, with a note that it is "worth extracting into a
// lovable-email-shell.ts once a third consumer lands". The exam emails
// (exam-emails.ts, Naji 2026-08-01) are that third consumer, so the shell lives
// here now. The two existing files are deliberately left untouched — they are
// live money/auth email paths and re-plumbing them belongs in its own change,
// not in a feature commit.
//
// Email-client compatibility: inline styles only, <table> layout, PNG logo
// (SVG fails on Outlook desktop).

export const NAVY = '#0B2758';
export const NAVY_GRADIENT = 'linear-gradient(135deg,#0B2758 0%,#1E4D9B 100%)';
export const ORANGE = '#F47C2C';
export const INK = '#0F172A';
export const MUTED = '#64748B';
export const BORDER = '#E2E8F0';
export const SOFT = '#F8FAFC';
export const FONT = "'Inter',Arial,sans-serif";

/** White wordmark on the navy header (served from the static /logos folder). */
const LOGO_URL_WHITE = 'https://learn.teachersindia.in/logos/ttii-full-white.png';

export const LABEL_ORANGE = `font-family:${FONT};font-size:12px;letter-spacing:0.8px;text-transform:uppercase;color:${ORANGE};font-weight:700;`;
export const LABEL_NAVY = `font-family:${FONT};font-size:12px;letter-spacing:0.8px;text-transform:uppercase;color:${NAVY};font-weight:700;`;
export const PARA = `font-family:${FONT};font-size:15px;line-height:24px;color:${INK};`;

export function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Only allow http(s) in a CTA href — blocks a javascript:/data: scheme ever
 * riding in via a future caller. Falls back to the student portal.
 */
export function safeUrl(url: string): string {
  const trimmed = (url ?? '').trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : 'https://learn.teachersindia.in';
}

export function orDash(value: string | undefined): string {
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
    .details-table td { font-size: 12px !important; padding: 10px 8px !important; }
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

/** Navy header (white logo) + white card + dark footer. */
export function shell(opts: {
  title: string;
  preheader: string;
  bodyInner: string;
  extraStyle?: string;
}): string {
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

/** Key/value details card (label + value) inside a soft panel. */
export function detailsCard(sectionLabel: string, rows: Array<{ label: string; value: string }>): string {
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

/** Primary orange CTA button. */
export function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
    <tr>
      <td align="center" bgcolor="${ORANGE}" style="border-radius:10px;">
        <a href="${safeUrl(href)}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(label)}</a>
      </td>
    </tr>
  </table>`;
}
