import { randomBytes } from 'node:crypto';

import { hashPassword } from './password.js';

/**
 * Issues a one-time credential bundle for a newly-created admin-side user
 * (Admin / Counsellor / Associate / Instructor / Centre).
 *
 * Why this exists: every "Add ___" flow on the admin portal used to take an
 * admin-supplied password (or a hardcoded fallback like "Centre@1234"). Per
 * Naji's QA round (2026-04-30), no admin should type passwords any more —
 * the system generates a secure temp password, stores its hash, and emails
 * the plain text to the new user. They sign in with email + temp password
 * and (per legacy /login/update_password) get prompted to change it.
 */

const TEMP_PASSWORD_LENGTH = 14;
const TEMP_PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';

export type CredentialEmailContext = {
  /** Display name to greet the user with in the email. */
  name: string;
  /** Email to send to and the user's login identifier. */
  email: string;
  /** Human-readable role label (e.g. "Counsellor", "Centre admin"). */
  roleLabel: string;
  /** URL where the user can sign in. Defaults to https://admin.teachersindia.in. */
  loginUrl?: string;
};

export type IssueCredentialsResult = {
  /** Hashed password to persist on `users.password`. */
  hashedPassword: string;
  /** Plain-text temp password — only available in this scope. Do NOT log. */
  tempPassword: string;
  /** True when the email provider accepted the message. False on transient
   * failure — caller still keeps the user record so admin can resend. */
  emailDelivered: boolean;
  /** Error message when emailDelivered === false. */
  emailError?: string;
};

function generateTempPassword(): string {
  const buf = randomBytes(TEMP_PASSWORD_LENGTH);
  let out = '';
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    out += TEMP_PASSWORD_ALPHABET[buf[i]! % TEMP_PASSWORD_ALPHABET.length];
  }
  return out;
}

function buildEmailHtml(ctx: CredentialEmailContext, tempPassword: string): string {
  const loginUrl = ctx.loginUrl ?? 'https://admin.teachersindia.in';
  return `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1f2937; line-height: 1.6;">
  <div style="max-width: 560px; margin: 0 auto; padding: 24px;">
    <h2 style="color: #8F2774; margin: 0 0 8px;">Welcome to TTII LMS</h2>
    <p>Hi ${escapeHtml(ctx.name)},</p>
    <p>An account has been created for you on the TTII LMS as <strong>${escapeHtml(ctx.roleLabel)}</strong>. Use the credentials below to sign in.</p>
    <table role="presentation" style="margin: 16px 0; border-collapse: collapse;">
      <tr>
        <td style="padding: 6px 12px; background: #F3F6F9; border-radius: 4px 0 0 4px;"><strong>Email</strong></td>
        <td style="padding: 6px 12px; background: #F3F6F9; border-radius: 0 4px 4px 0;">${escapeHtml(ctx.email)}</td>
      </tr>
      <tr><td style="height: 4px;"></td></tr>
      <tr>
        <td style="padding: 6px 12px; background: #F3F6F9; border-radius: 4px 0 0 4px;"><strong>Temporary password</strong></td>
        <td style="padding: 6px 12px; background: #F3F6F9; border-radius: 0 4px 4px 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">${escapeHtml(tempPassword)}</td>
      </tr>
    </table>
    <p><a href="${loginUrl}" style="display: inline-block; padding: 10px 20px; background: #8F2774; color: #ffffff; text-decoration: none; border-radius: 4px;">Sign in to your account</a></p>
    <p style="color: #6b7280; font-size: 13px;">For security, please change your password the first time you sign in. If you did not expect this email, contact <a href="mailto:info@teachersindia.in">info@teachersindia.in</a>.</p>
    <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">— Teachers' Training Institute of India</p>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function issueAndEmailCredentials(
  ctx: CredentialEmailContext,
): Promise<IssueCredentialsResult> {
  const tempPassword = generateTempPassword();
  const hashedPassword = await hashPassword(tempPassword);

  let emailDelivered = false;
  let emailError: string | undefined;

  try {
    const { createIntegrationRegistry } = await import('../integrations/registry.js');
    const registry = createIntegrationRegistry();
    await registry.email.sendEmail({
      to: ctx.email,
      subject: 'Your TTII LMS account is ready',
      html: buildEmailHtml(ctx, tempPassword),
    });
    emailDelivered = true;
  } catch (err) {
    emailError = err instanceof Error ? err.message : String(err);
  }

  const result: IssueCredentialsResult = {
    hashedPassword,
    tempPassword,
    emailDelivered,
  };
  if (emailError !== undefined) {
    result.emailError = emailError;
  }
  return result;
}
