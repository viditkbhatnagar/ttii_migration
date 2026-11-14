// Learner email: "your credential is ready" (Credential Manager, Naji 2026-11-14). Navy Lovable shell.

import { MUTED, FONT, PARA, ctaButton, detailsCard, esc, orDash, shell } from './lovable-email-shell.js';

export const CREDENTIAL_PORTAL_URL = 'https://learn.teachersindia.in/student/certificates';

export interface CredentialReadyEmailData {
  learnerFirstName: string;
  programme: string;
  documents: Array<{ label: string; documentNo: string }>;
  issueDate: string;
  /** Resend: the same message, flagged as a reminder. */
  resend?: boolean;
}

export const CREDENTIAL_EMAIL_SUBJECT = (resend: boolean): string =>
  resend ? 'Your TTII credential download link' : 'Your TTII credential is ready';

export function renderCredentialReadyEmail(data: CredentialReadyEmailData): string {
  const list = data.documents.map((d) => `${d.label} (${d.documentNo})`).join(', ');
  const bodyInner = `
    <p style="margin:0 0 22px;${PARA}">Dear ${orDash(data.learnerFirstName)},</p>
    <p style="margin:0 0 22px;${PARA}">
      ${data.resend ? 'Here is the link to your credential again.' : 'Congratulations. Your credential has been issued.'}
      You can download it from your learner portal.
    </p>
    ${detailsCard('Credential Details', [
      { label: 'Programme', value: data.programme },
      { label: 'Documents', value: list },
      { label: 'Issue date', value: data.issueDate },
    ])}
    ${ctaButton('Open My Certificates', CREDENTIAL_PORTAL_URL)}
    <p style="margin:24px 0 0;font-family:${FONT};font-size:13px;line-height:21px;color:${MUTED};">
      Anyone can verify a TTII credential by scanning the QR code printed on it. Need assistance? Write to
      <a href="mailto:support@teachersindia.in">support@teachersindia.in</a>.
    </p>`;
  return shell({
    title: esc(CREDENTIAL_EMAIL_SUBJECT(data.resend === true)),
    preheader: 'Your TTII credential is available in your learner portal.',
    bodyInner,
  });
}
