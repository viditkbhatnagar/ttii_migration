import { randomBytes } from 'node:crypto';

import { hashPassword } from './password.js';
import { renderUserCreationEmail } from '../integrations/auth-emails.js';

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
  // Naji 2026-07-05 — the Lovable "User Creation" design (navy header, account
  // + credentials tables, Login to LMS CTA). Replaces the old purple wrapper.
  return renderUserCreationEmail({
    userFullName: ctx.name,
    userRole: ctx.roleLabel,
    emailId: ctx.email,
    temporaryPassword: tempPassword,
    loginUrl: ctx.loginUrl ?? 'https://admin.teachersindia.in',
  });
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
      subject: 'Your TTII LMS Account Has Been Created',
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
