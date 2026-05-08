// Shared TTII-branded email wrapper. Naji 2026-05-09 — redesigned to a
// cleaner layout: white card on a soft tinted page, full-color wordmark
// in the header, generous spacing, friendlier footer with the three
// portal links.
//
// Email-client compatibility notes:
// - Inline styles only (Gmail/Outlook strip <style> blocks).
// - `<table>` for layout — flexbox/grid don't work in email clients.
// - PNG logo (broadest support); SVG would fail on Outlook desktop.

const BRAND = {
  primary: '#8F2774',
  primaryDark: '#6e1d59',
  primarySoft: '#faf5fb',
  secondary: '#F06543',
  textPrimary: '#1f2937',
  textMuted: '#6b7280',
  textSubtle: '#9ca3af',
  backgroundPage: '#f5f3f8',
  backgroundCard: '#ffffff',
  divider: '#e5e7eb',
};

// Full color wordmark — Naji 2026-05-09 (PNG converted from
// ttii-full-color.svg, served from the static logos folder).
const LOGO_URL = 'https://learn.teachersindia.in/logos/ttii-full-color.png';
const SUPPORT_EMAIL = 'hello@teachersindia.in';
const SITE_URL = 'https://teachersindia.in';
const PORTAL_LINKS: Array<{ label: string; href: string }> = [
  { label: 'Admin', href: 'https://admin.teachersindia.in' },
  { label: 'Learner', href: 'https://learn.teachersindia.in' },
  { label: 'Admissions', href: 'https://admissions.teachersindia.in' },
];

export interface BrandedEmailButton {
  label: string;
  href: string;
}

export interface RenderBrandedEmailOpts {
  /** Big heading shown directly under the brand bar. Keep short. */
  heading: string;
  /** Optional subtext below the heading (e.g. greeting line). */
  preheader?: string;
  /** Main body — HTML allowed. Use the helper builders below for tables / fields. */
  bodyHtml: string;
  /** Optional primary CTA button. */
  cta?: BrandedEmailButton;
  /** Optional small note rendered above the footer (e.g. expiry warning). */
  footerNote?: string;
}

/**
 * Render the TTII-branded HTML email. The output is a complete document
 * (DOCTYPE + html + body) ready to hand to `EmailProvider.sendEmail({ html })`.
 */
export function renderBrandedEmail(opts: RenderBrandedEmailOpts): string {
  const heading = escapeEmailHtml(opts.heading);
  const preheader = opts.preheader ? escapeEmailHtml(opts.preheader) : '';
  const ctaHtml = opts.cta
    ? `<tr><td align="center" style="padding:8px 40px 24px;">
        <a href="${escapeAttr(opts.cta.href)}" style="display:inline-block;padding:14px 32px;background:${BRAND.primary};color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;letter-spacing:0.2px;box-shadow:0 4px 12px rgba(143,39,116,0.25);">${escapeEmailHtml(opts.cta.label)}</a>
       </td></tr>`
    : '';
  const footerNoteHtml = opts.footerNote
    ? `<tr><td style="padding:0 40px 8px;color:${BRAND.textMuted};font-size:12px;line-height:1.6;text-align:center;">${escapeEmailHtml(opts.footerNote)}</td></tr>`
    : '';

  const portalLinksHtml = PORTAL_LINKS
    .map((p) => `<a href="${escapeAttr(p.href)}" style="color:${BRAND.primary};text-decoration:none;font-weight:500;">${escapeEmailHtml(p.label)}</a>`)
    .join(`<span style="color:${BRAND.divider};margin:0 10px;">·</span>`);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="https://www.w3.org/1999/xhtml" lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.backgroundPage};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.textPrimary};">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.backgroundPage};">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <!-- Card -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BRAND.backgroundCard};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(31,41,55,0.06);">

        <!-- Header — full color wordmark on white, with a thin TTII purple accent stripe -->
        <tr>
          <td align="center" style="padding:36px 40px 24px;background:#ffffff;">
            <img src="${LOGO_URL}" alt="Teachers' Training Institute of India" width="220" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:240px;" />
          </td>
        </tr>
        <tr>
          <td style="padding:0;">
            <div style="height:4px;background:linear-gradient(90deg,${BRAND.primary} 0%,${BRAND.primary} 65%,${BRAND.secondary} 100%);"></div>
          </td>
        </tr>

        <!-- Heading -->
        <tr>
          <td style="padding:32px 40px 4px;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:${BRAND.textPrimary};line-height:1.3;letter-spacing:-0.01em;">${heading}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:12px 40px 20px;color:${BRAND.textPrimary};font-size:15px;line-height:1.7;">
            ${opts.bodyHtml}
          </td>
        </tr>

        ${ctaHtml}

        <!-- Subtle divider -->
        <tr><td style="padding:0 40px;"><div style="height:1px;background:${BRAND.divider};margin:8px 0 0;"></div></td></tr>
        ${footerNoteHtml}

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:20px 40px 12px;color:${BRAND.textMuted};font-size:13px;line-height:1.6;">
            Need help? Write to <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">${SUPPORT_EMAIL}</a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:0 40px 18px;font-size:13px;line-height:1.6;">
            ${portalLinksHtml}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:0 40px 28px;color:${BRAND.textSubtle};font-size:11px;line-height:1.6;letter-spacing:0.02em;">
            © Teachers' Training Institute of India · <a href="${SITE_URL}" style="color:${BRAND.textSubtle};text-decoration:none;">${SITE_URL.replace('https://', '')}</a>
          </td>
        </tr>

      </table>
      <!-- /Card -->

    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Render a key/value table inside the email body (credentials, payment info, etc.). */
export function renderEmailFieldTable(rows: Array<{ label: string; value: string; mono?: boolean }>): string {
  const tr = rows
    .map(
      (r) => `<tr>
        <td style="padding:10px 14px;background:${BRAND.primarySoft};border-radius:8px 0 0 8px;color:${BRAND.textMuted};font-size:13px;font-weight:600;width:38%;vertical-align:top;">${escapeEmailHtml(r.label)}</td>
        <td style="padding:10px 14px;background:${BRAND.primarySoft};border-radius:0 8px 8px 0;color:${BRAND.textPrimary};font-size:14px;vertical-align:top;${r.mono ? 'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;' : ''}">${escapeEmailHtml(r.value)}</td>
      </tr>
      <tr><td colspan="2" style="height:8px;line-height:8px;font-size:8px;">&nbsp;</td></tr>`,
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:16px 0 8px;border-collapse:separate;">${tr}</table>`;
}

function escapeEmailHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;');
}
