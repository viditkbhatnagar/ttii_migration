import type { PrismaClient } from '@prisma/client';

import {
  istYmdOf, normaliseCentreApplication, validateCentreApplication,
  type CentreApplication, type CentreApplicationErrors, type CentreDocKey,
} from '@ttii/shared-types';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';
import {
  CHANGED_MESSAGE, NOT_SET_UP_MESSAGE, Refusal, fail, formUploadFolder, isLinkOpen, isMissingTable, isSignedUpload,
  linkExpiresAt, looksLikeToken, ok, onboardingRef, tokenHash, tokenMatches, uploadSignature, type Outcome,
} from './centre-onboarding-model.js';
import { parseStoredForm } from './centre-onboarding-service.js';

// Centres v2 — the PUBLIC centre application form (/centre-form/{token}),
// replacing the prototype's "Simulate centre submission". No login: the token
// in the link is the credential. Only its sha256 is stored; the token is looked
// up by that hash and re-derived from (id, link_sent_at) with the server
// secret before anything is shown. The GET answers ONLY this lead's prefill.
//
// Submit is claim-first: stage 'lead' + this token's hash + not expired +
// the same link_sent_at, so a resend (new link), Mark Expired or a second
// submit in another tab can never double-submit.

export type FormClosedReason = 'invalid' | 'expired' | 'submitted' | 'unavailable';

export type FormState =
  | { state: 'open'; ref: string; centreName: string; expiresAt: string; remarks: string; prefill: CentreApplication }
  | { state: 'closed'; reason: FormClosedReason; message: string };

const CLOSED: Record<FormClosedReason, string> = {
  invalid: 'This link is not valid. Please use the latest link TTII sent you, or ask TTII for a new one.',
  expired: 'This link has expired. Please ask TTII to send you a new one.',
  submitted: 'This application has already been submitted. TTII will be in touch with you.',
  unavailable: 'The centre application form is not available right now. Please try again later.',
};

const closed = (reason: FormClosedReason): FormState => ({ state: 'closed', reason, message: CLOSED[reason] });

interface TokenRow {
  id: number;
  stage: string;
  link_sent_at: Date | null;
  link_expired: boolean;
  link_token_hash: string | null;
  centre_name: string;
  contact_name: string;
  mobile: string;
  email: string;
  country: string | null;
  state: string | null;
  district: string | null;
  remarks: string | null;
  ref_no: string | null;
  form_json: string | null;
}

export interface CentreFormPublicDeps {
  prisma?: PrismaClient;
  secret?: string;
  now?: () => Date;
}

export class CentreFormPublicService {
  private readonly prisma: PrismaClient;
  private readonly secret: string;
  private readonly now: () => Date;

  constructor(deps: CentreFormPublicDeps = {}) {
    this.prisma = deps.prisma ?? getPrismaClient();
    this.secret = deps.secret ?? env.PASSWORD_RESET_TOKEN_KEY;
    this.now = deps.now ?? (() => new Date());
  }

  /** The record behind a token, or why the form is closed. */
  private async resolve(token: string): Promise<{ row: TokenRow } | { closed: FormState }> {
    if (!looksLikeToken(token)) return { closed: closed('invalid') };
    let row: TokenRow | null;
    try {
      row = await this.prisma.centre_onboarding.findFirst({
        where: { link_token_hash: tokenHash(token), deleted_at: null },
        select: {
          id: true, stage: true, link_sent_at: true, link_expired: true, link_token_hash: true, centre_name: true, contact_name: true,
          mobile: true, email: true, country: true, state: true, district: true, remarks: true, ref_no: true, form_json: true,
        },
      });
    } catch (error: unknown) {
      if (isMissingTable(error)) return { closed: closed('unavailable') };
      throw error;
    }
    if (!row || !row.link_sent_at || !tokenMatches(this.secret, row.id, row.link_sent_at, token)) return { closed: closed('invalid') };
    if (row.stage !== 'lead') return { closed: closed('submitted') };
    if (!isLinkOpen(row, this.now())) return { closed: closed('expired') };
    return { row };
  }

  async open(token: string): Promise<FormState> {
    const found = await this.resolve(token);
    if ('closed' in found) return found.closed;
    const r = found.row;
    // A centre sent back for changes sees its previous answers; the lead's own
    // identity fields (which an admin may have corrected) win over them.
    const base = parseStoredForm(r.form_json) ?? normaliseCentreApplication({});
    const prefill: CentreApplication = {
      ...base,
      centreName: r.centre_name,
      contactName: r.contact_name,
      mobile: r.mobile || base.mobile,
      email: r.email,
      country: r.country || base.country || 'India',
      state: r.state || base.state,
      district: r.district || base.district,
    };
    return {
      state: 'open',
      ref: r.ref_no ?? onboardingRef(r.id),
      centreName: r.centre_name,
      expiresAt: istYmdOf(linkExpiresAt(r.link_sent_at as Date)),
      remarks: r.remarks ?? '',
      prefill,
    };
  }

  /** The signature the upload endpoint returns with a stored file's URL. */
  signUpload(onboardingId: number, url: string): string {
    return uploadSignature(this.secret, onboardingId, url);
  }

  /** The onboarding id a public upload may store under, or why not. */
  async uploadTarget(token: string): Promise<Outcome<{ onboardingId: number }>> {
    const found = await this.resolve(token);
    if ('closed' in found) return fail(found.closed.state === 'closed' ? found.closed.message : CLOSED.invalid);
    return ok('ok', { onboardingId: found.row.id });
  }

  async submit(token: string, body: Record<string, unknown>): Promise<Outcome<{ ref: string; errors?: CentreApplicationErrors }>> {
    const found = await this.resolve(token);
    if ('closed' in found) return fail(found.closed.state === 'closed' ? found.closed.message : CLOSED.invalid);
    const row = found.row;
    const form = normaliseCentreApplication(body.form);
    const errors = validateCentreApplication(form, body.declaration === true);
    // Documents must be files this lead uploaded through /centre-form/{token}/upload (signed by it).
    for (const key of ['registrationDoc', 'idDoc', 'panDoc'] as CentreDocKey[]) {
      const doc = form[key];
      if (doc && !isSignedUpload(this.secret, row.id, formUploadFolder(row.id), doc.url, doc.sig)) errors[key] = 'Upload the document again';
    }
    if (Object.keys(errors).length > 0) {
      return { status: 0, message: 'Please fix the highlighted fields.', data: { ref: row.ref_no ?? onboardingRef(row.id), errors } };
    }
    const now = this.now();
    try {
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.centre_onboarding.updateMany({
          where: {
            id: row.id, deleted_at: null, stage: 'lead', link_token_hash: row.link_token_hash, link_expired: false, link_sent_at: row.link_sent_at,
          },
          data: {
            form_json: JSON.stringify(form),
            form_submitted_at: now,
            stage: 'under_review',
            stage_since: now,
            verification_json: null,
            remarks: null,
            // The centre's own answers become the record's identity fields
            // (an admin can still correct them with Edit before onboarding).
            centre_name: form.centreName,
            contact_name: form.contactName,
            mobile: form.mobile,
            email: form.email.toLowerCase(),
            country: form.country || null,
            state: form.state || null,
            district: form.district || null,
            updated_at: now,
          },
        });
        if (claimed.count !== 1) throw new Refusal(CHANGED_MESSAGE);
        await tx.centre_onboarding_events.create({
          data: { onboarding_id: row.id, event_type: 'form_submitted', message: 'Application form submitted', actor_user_id: null, created_at: now },
        });
      });
    } catch (error: unknown) {
      if (error instanceof Refusal) return fail(CLOSED.submitted);
      if (isMissingTable(error)) return fail(NOT_SET_UP_MESSAGE);
      throw error;
    }
    return ok('Application submitted', { ref: row.ref_no ?? onboardingRef(row.id) });
  }
}
