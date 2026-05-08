// Shared TTII-branded email wrapper. Naji 2026-05-07: every transactional
// email (welcome, OTP, application status, payment, etc.) renders inside
// this template so the look is consistent and unmistakably TTII.
//
// Email-client compatibility notes:
// - Inline styles only (Gmail/Outlook strip <style> blocks).
// - `<table>` for layout — flexbox/grid don't work in email clients.
// - PNG logo (broadest support); SVG would fail on Outlook desktop.
// - Hosted at https://learn.teachersindia.in/logos/ — public, world-readable.

const BRAND = {
  primary: '#8F2774',
  primaryDark: '#6e1d59',
  secondary: '#F06543',
  textPrimary: '#1f2937',
  textMuted: '#6b7280',
  backgroundPage: '#f5f3f8',
  backgroundCard: '#ffffff',
  divider: '#e5e7eb',
  highlight: '#faf5fb',
};

// Naji 2026-05-09 — wordmark + institute name shown side-by-side so the
// brand reads at a glance, plus teachersindia.in as the primary site
// URL in the footer. hello@teachersindia.in is the team-facing inbox
// Naji wants surfaced. (Full-bleed PNG logo is a follow-up — Outlook
// strips SVGs so we keep the existing icon PNG for now and pair it
// with the wordmark text.)
const LOGO_URL = 'https://learn.teachersindia.in/logos/ttii-icon-color.png';
const SUPPORT_EMAIL = 'hello@teachersindia.in';
const SITE_URL = 'https://teachersindia.in';

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
    ? `<tr><td style="padding:24px 32px 8px;">
        <a href="${escapeAttr(opts.cta.href)}" style="display:inline-block;padding:12px 28px;background:${BRAND.primary};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;letter-spacing:0.2px;">${escapeEmailHtml(opts.cta.label)}</a>
       </td></tr>`
    : '';
  const footerNoteHtml = opts.footerNote
    ? `<tr><td style="padding:8px 32px 0;color:${BRAND.textMuted};font-size:12px;line-height:1.5;">${escapeEmailHtml(opts.footerNote)}</td></tr>`
    : '';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="https://www.w3.org/1999/xhtml" lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1.0" />
<meta name="x-apple-disable-message-reformatting" />
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.backgroundPage};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.textPrimary};">
<!-- Hidden preheader (shows in inbox preview) -->
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>` : ''}

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.backgroundPage};">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <!-- Card -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BRAND.backgroundCard};border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(143,39,116,0.08);">

        <!-- Brand bar -->
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.primaryDark} 100%);padding:24px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="vertical-align:middle;">
                  <img src="${LOGO_URL}" alt="TTII" width="48" height="48" style="display:inline-block;vertical-align:middle;border:0;border-radius:10px;background:#ffffff;padding:6px;" />
                  <span style="display:inline-block;vertical-align:middle;margin-left:14px;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">Teachers' Training Institute of India</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Heading + body -->
        <tr>
          <td style="padding:32px 32px 8px;">
            <h1 style="margin:0;font-size:22px;font-weight:700;color:${BRAND.textPrimary};line-height:1.3;">${heading}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 16px;color:${BRAND.textPrimary};font-size:15px;line-height:1.6;">
            ${opts.bodyHtml}
          </td>
        </tr>

        ${ctaHtml}

        <!-- Footer -->
        <tr><td style="padding:0 32px;"><div style="height:1px;background:${BRAND.divider};margin:16px 0 0;"></div></td></tr>
        ${footerNoteHtml}
        <tr>
          <td style="padding:16px 32px 28px;color:${BRAND.textMuted};font-size:12px;line-height:1.6;">
            <div>Need help? Reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.primary};text-decoration:none;">${SUPPORT_EMAIL}</a></div>
            <div style="margin-top:6px;">— Teachers' Training Institute of India · <a href="${SITE_URL}" style="color:${BRAND.textMuted};text-decoration:underline;">${SITE_URL.replace('https://', '')}</a></div>
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

/** Render a key/value table inside the email body (used for credential bundles, payment info, etc.). */
export function renderEmailFieldTable(rows: Array<{ label: string; value: string; mono?: boolean }>): string {
  const tr = rows
    .map(
      (r) => `<tr>
        <td style="padding:8px 14px;background:${BRAND.highlight};border-radius:8px 0 0 8px;color:${BRAND.textMuted};font-size:13px;font-weight:600;width:38%;">${escapeEmailHtml(r.label)}</td>
        <td style="padding:8px 14px;background:${BRAND.highlight};border-radius:0 8px 8px 0;color:${BRAND.textPrimary};font-size:14px;${r.mono ? 'font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;' : ''}">${escapeEmailHtml(r.value)}</td>
      </tr>
      <tr><td colspan="2" style="height:6px;line-height:6px;">&nbsp;</td></tr>`,
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:16px 0;border-collapse:separate;">${tr}</table>`;
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
