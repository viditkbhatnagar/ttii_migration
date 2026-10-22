import { renderBrandedEmail } from './email-template.js';

// Centres v2 — Centre Onboarding emails (Naji 2026-10-22). The purple TTII
// wrapper the student application-form link uses (renderBrandedEmail), so a
// centre receives the same look as a student does for the same kind of step.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function longDate(value: Date): string {
  return value.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

export interface CentreFormLinkEmailInput {
  contactName: string;
  centreName: string;
  link: string;
  expiresAt: Date;
}

export function renderCentreFormLinkEmail(input: CentreFormLinkEmailInput): { subject: string; html: string } {
  const html = renderBrandedEmail({
    heading: 'Your TTII centre application',
    preheader: `Complete the TTII affiliation application for ${input.centreName}.`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(input.contactName || 'there')},</p>
      <p style="margin:0 0 12px;">Thank you for your interest in becoming an affiliated centre of Teachers' Training Institute of India. Please fill in the centre application for <strong>${escapeHtml(input.centreName)}</strong>.</p>
      <p style="margin:0;">The form asks for your centre and entity details, address, contact and identity details (Aadhaar / Passport and PAN uploads) and, optionally, bank details. Keep the documents ready as a PDF or a photo.</p>
    `,
    cta: { label: 'Open Centre Application', href: input.link },
    footerNote: `This link expires on ${longDate(input.expiresAt)}. Please do not forward it.`,
  });
  return { subject: 'TTII centre affiliation — complete your application', html };
}

export interface CentreChangesEmailInput extends CentreFormLinkEmailInput {
  remarks: string;
}

export function renderCentreChangesRequestedEmail(input: CentreChangesEmailInput): { subject: string; html: string } {
  const remarks = escapeHtml(input.remarks).replace(/\n/g, '<br />');
  const html = renderBrandedEmail({
    heading: 'Changes needed in your centre application',
    preheader: `TTII reviewed the application for ${input.centreName} and needs a few changes.`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(input.contactName || 'there')},</p>
      <p style="margin:0 0 12px;">We reviewed the centre application for <strong>${escapeHtml(input.centreName)}</strong>. Please make these changes and submit it again:</p>
      <div style="margin:0 0 12px;padding:12px 14px;border-radius:8px;background:#fff7ed;color:#7c2d12;">${remarks}</div>
      <p style="margin:0;">Your previous answers are already filled in, so you only need to update what is asked.</p>
    `,
    cta: { label: 'Update Centre Application', href: input.link },
    footerNote: `This link expires on ${longDate(input.expiresAt)}. Earlier links no longer work.`,
  });
  return { subject: 'TTII centre affiliation — changes requested', html };
}
