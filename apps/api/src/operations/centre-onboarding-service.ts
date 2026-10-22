import type { Prisma, PrismaClient } from '@prisma/client';

import {
  VERIFICATION_SECTIONS, isOnboardingStage, istTodayYmd, normaliseCentreApplication,
  type CentreApplication, type OnboardingStage, type VerificationSection,
} from '@ttii/shared-types';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';
import { renderCentreChangesRequestedEmail, renderCentreFormLinkEmail } from '../integrations/centre-onboarding-emails.js';
import { isCentreCodeTaken, nextCentreCode } from './centre-code.js';
import { loadAgreementView, loadCertificateView, type AgreementView, type CertificateView } from './centre-affiliation-reads.js';
import {
  CHANGED_MESSAGE, NOT_SET_UP_MESSAGE, Refusal, SECTION_TITLE, allSectionsVerified, fail, findDuplicates, formLinkUrl,
  formToken, iso, isLinkOpen, isMissingTable, isUniqueViolation, leadErrorMessage, linkExpiresAt, nextLinkSentAt, ok,
  onboardingRef, parseLeadInput, parseVerification, text, tokenHash,
  type DuplicateHit, type DuplicateSource, type LeadInput, type Outcome, type Verification,
} from './centre-onboarding-model.js';

// Centres v2 — Centre Onboarding, admin side (Naji 2026-10-22,
// CentreOnboardingModule). Admin / Subadmin only (the routes guard it).
//
// Every stage change is CLAIM-FIRST inside a transaction: a guarded updateMany
// on the stage the action expects, and nothing else is written unless exactly
// one row was claimed. A losing request throws (Refusal) so the transaction
// rolls back — a callback that merely returns would still COMMIT.
// Until the 2026-10-22 migration runs (Prisma P2021) reads answer ready:false
// with empty data and writes refuse with NOT_SET_UP_MESSAGE.

type Db = PrismaClient | Prisma.TransactionClient;

export type EmailSender = (message: { to: string; subject: string; html: string }) => Promise<void>;

export interface CentreOnboardingDeps {
  prisma?: PrismaClient;
  /** HMAC key for the public form token (an existing server secret). */
  secret?: string;
  now?: () => Date;
  sendEmail?: EmailSender;
}

export interface OnboardingListRow {
  id: number;
  refNo: string;
  centreName: string;
  contactName: string;
  mobile: string;
  email: string;
  country: string;
  state: string;
  district: string;
  source: string;
  notes: string;
  stage: OnboardingStage;
  stageSince: string;
  createdAt: string;
  linkSentAt: string;
  linkExpired: boolean;
  formSubmittedAt: string;
  centreCode: string;
  centreId: number | null;
}

export interface OnboardingEvent {
  id: number;
  type: string;
  message: string;
  at: string;
  by: string;
}

export interface OnboardingDetail {
  ready: true;
  today: string;
  record: OnboardingListRow & {
    remarks: string;
    rejectReason: string;
    rejectedAt: string;
    verification: Verification;
  };
  form: CentreApplication | null;
  link: { url: string; open: boolean; expiresAt: string } | null;
  agreement: AgreementView | null;
  certificate: CertificateView | null;
  events: OnboardingEvent[];
  duplicates: DuplicateHit[];
  /** An LMS login already uses this email: Issue & Complete would refuse. */
  loginClash: string;
}

const LIST_SELECT = {
  id: true, ref_no: true, centre_name: true, contact_name: true, mobile: true, email: true, country: true, state: true,
  district: true, source: true, notes: true, stage: true, stage_since: true, created_at: true, link_sent_at: true,
  link_expired: true, form_submitted_at: true, centre_code: true, centre_id: true,
} as const;

type ListRecord = Prisma.centre_onboardingGetPayload<{ select: typeof LIST_SELECT }>;

function toListRow(r: ListRecord): OnboardingListRow {
  return {
    id: r.id,
    refNo: r.ref_no ?? onboardingRef(r.id),
    centreName: r.centre_name,
    contactName: r.contact_name,
    mobile: r.mobile,
    email: r.email,
    country: r.country ?? '',
    state: r.state ?? '',
    district: r.district ?? '',
    source: r.source ?? '',
    notes: r.notes ?? '',
    stage: isOnboardingStage(r.stage) ? r.stage : 'lead',
    stageSince: iso(r.stage_since),
    createdAt: iso(r.created_at) || iso(r.stage_since),
    linkSentAt: iso(r.link_sent_at),
    linkExpired: r.link_expired,
    formSubmittedAt: iso(r.form_submitted_at),
    centreCode: r.centre_code ?? '',
    centreId: r.centre_id,
  };
}

export function parseStoredForm(json: string | null | undefined): CentreApplication | null {
  if (!json) return null;
  try {
    return normaliseCentreApplication(JSON.parse(json) as unknown);
  } catch {
    return null;
  }
}

async function addEvent(db: Db, onboardingId: number, type: string, message: string, actor: number | null, at: Date): Promise<void> {
  await db.centre_onboarding_events.create({
    data: { onboarding_id: onboardingId, event_type: type, message: message.slice(0, 500), actor_user_id: actor, created_at: at },
  });
}

async function defaultSendEmail(message: { to: string; subject: string; html: string }): Promise<void> {
  const { createIntegrationRegistry } = await import('../integrations/registry.js');
  const result = await createIntegrationRegistry().email.sendEmail(message);
  if (!result.accepted) throw new Error('The email provider did not accept the message.');
}

export class CentreOnboardingService {
  private readonly prisma: PrismaClient;
  private readonly secret: string;
  private readonly now: () => Date;
  private readonly sendEmail: EmailSender;

  constructor(deps: CentreOnboardingDeps = {}) {
    this.prisma = deps.prisma ?? getPrismaClient();
    this.secret = deps.secret ?? env.PASSWORD_RESET_TOKEN_KEY;
    this.now = deps.now ?? (() => new Date());
    this.sendEmail = deps.sendEmail ?? defaultSendEmail;
  }

  /** Writes share one shape: run, map "not migrated" and refusals to a clear message. */
  private async guard<T>(fn: () => Promise<Outcome<T>>): Promise<Outcome<T>> {
    try {
      return await fn();
    } catch (error: unknown) {
      if (error instanceof Refusal) return fail(error.message);
      if (isMissingTable(error)) return fail(NOT_SET_UP_MESSAGE);
      throw error;
    }
  }

  async list(): Promise<{ ready: boolean; message: string; today: string; records: OnboardingListRow[] }> {
    const today = istTodayYmd(this.now().getTime());
    try {
      const rows = await this.prisma.centre_onboarding.findMany({ where: { deleted_at: null }, select: LIST_SELECT, orderBy: { id: 'asc' } });
      return { ready: true, message: '', today, records: rows.map(toListRow) };
    } catch (error: unknown) {
      if (isMissingTable(error)) return { ready: false, message: NOT_SET_UP_MESSAGE, today, records: [] };
      throw error;
    }
  }

  async detail(id: number): Promise<Outcome<OnboardingDetail | { ready: false; message: string }>> {
    try {
      const row = await this.prisma.centre_onboarding.findFirst({ where: { id, deleted_at: null } });
      if (!row) return fail('Centre onboarding record not found.');
      const now = this.now();
      const [agreement, certificate, events, duplicates, loginClash] = await Promise.all([
        loadAgreementView(this.prisma, { onboardingId: id }, now),
        loadCertificateView(this.prisma, { onboardingId: id }, now),
        this.loadEvents(id),
        this.duplicatesOf(row.id, row.centre_id, { email: row.email, mobile: row.mobile, gstin: parseStoredForm(row.form_json)?.gstin ?? '' }),
        row.stage === 'onboarded' ? Promise.resolve('') : this.loginClash(row.email),
      ]);
      const link = row.stage === 'lead' && row.link_sent_at
        ? {
          url: formLinkUrl(formToken(this.secret, row.id, row.link_sent_at)),
          open: isLinkOpen(row, now),
          expiresAt: iso(linkExpiresAt(row.link_sent_at)),
        }
        : null;
      return ok('success', {
        ready: true,
        today: istTodayYmd(now.getTime()),
        record: {
          ...toListRow(row),
          remarks: row.remarks ?? '',
          rejectReason: row.reject_reason ?? '',
          rejectedAt: iso(row.rejected_at),
          verification: parseVerification(row.verification_json),
        },
        form: parseStoredForm(row.form_json),
        link,
        agreement,
        certificate,
        events,
        duplicates,
        loginClash,
      });
    } catch (error: unknown) {
      if (isMissingTable(error)) return ok('success', { ready: false, message: NOT_SET_UP_MESSAGE });
      throw error;
    }
  }

  private async loadEvents(onboardingId: number): Promise<OnboardingEvent[]> {
    const rows = await this.prisma.centre_onboarding_events.findMany({
      where: { onboarding_id: onboardingId },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    });
    const actorIds = [...new Set(rows.map((r) => r.actor_user_id).filter((v): v is number => typeof v === 'number' && v > 0))];
    const users = actorIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
      : [];
    const names = new Map(users.map((u) => [u.id, u.name ?? '']));
    return rows.map((r) => ({
      id: r.id,
      type: r.event_type,
      message: r.message,
      at: iso(r.created_at),
      by: r.actor_user_id ? names.get(r.actor_user_id) || `User #${r.actor_user_id}` : r.event_type === 'form_submitted' ? 'Centre' : 'System',
    }));
  }

  /** A live LMS login with this email ('' when none): the centre login created at onboarding would clash with it. */
  async loginClash(email: string): Promise<string> {
    const e = email.trim().toLowerCase();
    if (!e) return '';
    const user = await this.prisma.users.findFirst({
      where: { deleted_at: null, OR: [{ user_email: e }, { email: e }] },
      select: { id: true, name: true },
    });
    return user ? (user.name?.trim() || `User #${user.id}`) : '';
  }

  private async duplicatesOf(selfId: number, selfCentreId: number | null, target: { email: string; mobile: string; gstin: string }): Promise<DuplicateHit[]> {
    const [leads, centres, kyc] = await Promise.all([
      this.prisma.centre_onboarding.findMany({
        where: { deleted_at: null, id: { not: selfId } },
        select: { centre_name: true, email: true, mobile: true, form_json: true },
      }),
      this.prisma.centres.findMany({ where: { deleted_at: null }, select: { id: true, centre_name: true, email: true, phone: true } }),
      this.prisma.centre_kyc.findMany({ where: { gstin: { not: null } }, select: { centre_id: true, gstin: true } }).catch((error: unknown) => {
        if (isMissingTable(error)) return [];
        throw error;
      }),
    ]);
    const gstinOf = new Map(kyc.map((k) => [k.centre_id, k.gstin ?? '']));
    const sources: DuplicateSource[] = [
      ...centres.filter((c) => c.id !== selfCentreId).map((c) => ({
        kind: 'centre' as const, name: c.centre_name ?? '', email: c.email, mobile: c.phone, gstin: gstinOf.get(c.id) ?? '',
      })),
      ...leads.map((l) => ({
        kind: 'lead' as const, name: l.centre_name, email: l.email, mobile: l.mobile, gstin: parseStoredForm(l.form_json)?.gstin ?? '',
      })),
    ];
    return findDuplicates(target, sources);
  }

  /** Add / Edit Centre Lead: "This email already belongs to: {name}" (non-blocking). */
  async duplicatesFor(email: string, mobile: string, excludeId: number): Promise<{ ready: boolean; email: string; mobile: string }> {
    try {
      const hits = await this.duplicatesOf(excludeId, null, { email, mobile, gstin: '' });
      return {
        ready: true,
        email: hits.find((h) => h.field === 'Email')?.name ?? '',
        mobile: hits.find((h) => h.field === 'Mobile')?.name ?? '',
      };
    } catch (error: unknown) {
      if (isMissingTable(error)) return { ready: false, email: '', mobile: '' };
      throw error;
    }
  }

  async createLead(actor: number | null, payload: Record<string, unknown>): Promise<Outcome<{ id: number; refNo: string }>> {
    const parsed = parseLeadInput(payload);
    if ('errors' in parsed) return fail(leadErrorMessage(parsed.errors));
    const lead = parsed.lead;
    return this.guard(async () => {
      const now = this.now();
      const created = await this.prisma.$transaction(async (tx) => {
        const row = await tx.centre_onboarding.create({
          data: { ...leadColumns(lead), stage: 'lead', stage_since: now, created_by: actor, updated_by: actor, created_at: now, updated_at: now },
          select: { id: true },
        });
        const refNo = onboardingRef(row.id);
        await tx.centre_onboarding.update({ where: { id: row.id }, data: { ref_no: refNo } });
        await addEvent(tx, row.id, 'lead_added', 'Lead added', actor, now);
        return { id: row.id, refNo };
      });
      return ok('Centre lead added', created);
    });
  }

  async updateLead(actor: number | null, id: number, payload: Record<string, unknown>): Promise<Outcome> {
    const parsed = parseLeadInput(payload);
    if ('errors' in parsed) return fail(leadErrorMessage(parsed.errors));
    const lead = parsed.lead;
    return this.guard(async () => {
      const now = this.now();
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.centre_onboarding.updateMany({
          where: { id, deleted_at: null, stage: { not: 'onboarded' } },
          data: { ...leadColumns(lead), updated_by: actor, updated_at: now },
        });
        if (claimed.count !== 1) throw new Refusal(await this.whyNot(id, 'This centre is already onboarded: edit it in the Centre Directory.'));
        await addEvent(tx, id, 'lead_updated', 'Lead details updated', actor, now);
      });
      return ok('Lead updated');
    });
  }

  /** The reason a claim found no row: missing, or in another stage. */
  private async whyNot(id: number, wrongStage: string): Promise<string> {
    const row = await this.prisma.centre_onboarding.findFirst({ where: { id, deleted_at: null }, select: { id: true } });
    return row ? wrongStage : 'Centre onboarding record not found.';
  }

  /**
   * Send (or resend) the application form link: a new link_sent_at, so every
   * earlier link stops working. `via` "email" mails it; "copy" only returns it
   * for the admin to share.
   */
  async sendLink(actor: number | null, id: number, via: 'email' | 'copy'): Promise<Outcome<{ link: string; emailDelivered: boolean | null }>> {
    return this.guard<{ link: string; emailDelivered: boolean | null }>(async () => {
      const row = await this.prisma.centre_onboarding.findFirst({
        where: { id, deleted_at: null },
        select: { id: true, stage: true, link_sent_at: true, centre_name: true, contact_name: true, email: true },
      });
      if (!row) return fail('Centre onboarding record not found.');
      if (row.stage !== 'lead') return fail('Only a lead can be sent the application form.');
      const now = this.now();
      const sentAt = nextLinkSentAt(now, row.link_sent_at);
      const token = formToken(this.secret, id, sentAt);
      const resend = row.link_sent_at !== null;
      const channel = via === 'email' ? 'Email' : 'Copy link';
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.centre_onboarding.updateMany({
          where: { id, deleted_at: null, stage: 'lead', link_sent_at: row.link_sent_at },
          data: { link_sent_at: sentAt, link_token_hash: tokenHash(token), link_expired: false, updated_by: actor, updated_at: now },
        });
        if (claimed.count !== 1) throw new Refusal(CHANGED_MESSAGE);
        await addEvent(tx, id, resend ? 'link_resent' : 'link_sent', `${resend ? 'Form link resent' : 'Application form link sent'} via ${channel}`, actor, now);
      });
      const link = formLinkUrl(token);
      if (via === 'copy') return ok(`Form link ${resend ? 'resent' : 'sent'} via Copy link`, { link, emailDelivered: null });
      const delivered = await this.mail(id, row.email, renderCentreFormLinkEmail({
        contactName: row.contact_name, centreName: row.centre_name, link, expiresAt: linkExpiresAt(sentAt),
      }), actor);
      return ok(
        delivered ? `Form link ${resend ? 'resent' : 'sent'} via Email` : 'The link was created, but the email could not be sent. Use Copy Link to share it.',
        { link, emailDelivered: delivered },
      );
    });
  }

  /** Best-effort email AFTER the write committed; a failure is recorded on the timeline, never thrown. */
  private async mail(id: number, to: string, message: { subject: string; html: string }, actor: number | null): Promise<boolean> {
    try {
      await this.sendEmail({ to, ...message });
      return true;
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : String(error);
      await addEvent(this.prisma, id, 'email_failed', `Email to ${to} could not be sent: ${reason}`, actor, this.now()).catch(() => undefined);
      return false;
    }
  }

  async expireLink(actor: number | null, id: number): Promise<Outcome> {
    return this.guard(async () => {
      const now = this.now();
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.centre_onboarding.updateMany({
          where: { id, deleted_at: null, stage: 'lead', link_sent_at: { not: null }, link_expired: false },
          data: { link_expired: true, updated_by: actor, updated_at: now },
        });
        if (claimed.count !== 1) throw new Refusal(await this.whyNot(id, 'This form link is already expired or no longer open.'));
        await addEvent(tx, id, 'link_expired', 'Form link marked expired', actor, now);
      });
      return ok('Link marked expired');
    });
  }

  /** Verify / Flag one section of a submitted application (Under Review only). */
  async setVerification(actor: number | null, id: number, section: string, state: string): Promise<Outcome<{ verification: Verification }>> {
    if (!(VERIFICATION_SECTIONS as readonly string[]).includes(section)) return fail('Unknown section.');
    if (state !== 'verified' && state !== 'flagged') return fail('Choose Verify or Flag.');
    const key = section as VerificationSection;
    return this.guard(async () => {
      // Optimistic: two admins verifying different sections at once must both land.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const row = await this.prisma.centre_onboarding.findFirst({ where: { id, deleted_at: null }, select: { stage: true, verification_json: true } });
        if (!row) return fail('Centre onboarding record not found.');
        if (row.stage !== 'under_review') return fail('Sections can only be verified while the application is Under Review.');
        const next: Verification = { ...parseVerification(row.verification_json), [key]: state };
        const now = this.now();
        const landed = await this.prisma.$transaction(async (tx) => {
          const claimed = await tx.centre_onboarding.updateMany({
            where: { id, deleted_at: null, stage: 'under_review', verification_json: row.verification_json },
            data: { verification_json: JSON.stringify(next), updated_by: actor, updated_at: now },
          });
          if (claimed.count !== 1) return false;
          await addEvent(tx, id, state === 'verified' ? 'section_verified' : 'section_flagged', `${SECTION_TITLE[key]} section ${state}`, actor, now);
          return true;
        });
        if (landed) return ok(state === 'verified' ? 'Section verified' : 'Section flagged', { verification: next });
      }
      return fail(CHANGED_MESSAGE);
    });
  }

  /** Approve: all five sections verified; reserve the centre code; Under Review → Agreement Pending. */
  async approve(actor: number | null, id: number): Promise<Outcome<{ centreCode: string }>> {
    return this.guard(async () => {
      const row = await this.prisma.centre_onboarding.findFirst({
        where: { id, deleted_at: null },
        select: { stage: true, verification_json: true, centre_code: true },
      });
      if (!row) return fail('Centre onboarding record not found.');
      if (row.stage !== 'under_review') return fail('Only an application Under Review can be approved.');
      if (!allSectionsVerified(parseVerification(row.verification_json))) return fail('Verify every section first.');
      let code = row.centre_code && !(await isCentreCodeTaken(this.prisma, row.centre_code, { onboardingId: id }))
        ? row.centre_code
        : await nextCentreCode(this.prisma);
      // The UNIQUE index on centre_onboarding.centre_code is the race guard:
      // two approvals that computed the same code cannot both keep it.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const now = this.now();
          const reserved = code;
          await this.prisma.$transaction(async (tx) => {
            const claimed = await tx.centre_onboarding.updateMany({
              where: { id, deleted_at: null, stage: 'under_review', verification_json: row.verification_json },
              data: { stage: 'agreement_pending', stage_since: now, centre_code: reserved, updated_by: actor, updated_at: now },
            });
            if (claimed.count !== 1) throw new Refusal(CHANGED_MESSAGE);
            await addEvent(tx, id, 'approved', `Application approved — centre code ${reserved} assigned — awaiting signed agreement`, actor, now);
          });
          return ok('Application approved', { centreCode: reserved });
        } catch (error: unknown) {
          if (!isUniqueViolation(error)) throw error;
          if (attempt > 0) return fail(CHANGED_MESSAGE);
          code = await nextCentreCode(this.prisma);
        }
      }
      return fail(CHANGED_MESSAGE);
    });
  }

  /** Request Changes: back to Lead with a fresh link, the remarks emailed to the centre. */
  async requestChanges(actor: number | null, id: number, remarksRaw: unknown): Promise<Outcome<{ link: string; emailDelivered: boolean }>> {
    const remarks = text(remarksRaw);
    if (!remarks) return fail('Tell the centre what to change.');
    if (remarks.length > 2000) return fail('Keep the remarks under 2000 characters.');
    return this.guard(async () => {
      const row = await this.prisma.centre_onboarding.findFirst({
        where: { id, deleted_at: null },
        select: { stage: true, link_sent_at: true, centre_name: true, contact_name: true, email: true },
      });
      if (!row) return fail('Centre onboarding record not found.');
      if (row.stage !== 'under_review') return fail('Changes can only be requested while the application is Under Review.');
      const now = this.now();
      const sentAt = nextLinkSentAt(now, row.link_sent_at);
      const token = formToken(this.secret, id, sentAt);
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.centre_onboarding.updateMany({
          where: { id, deleted_at: null, stage: 'under_review' },
          data: {
            stage: 'lead', stage_since: now, remarks, link_sent_at: sentAt, link_token_hash: tokenHash(token), link_expired: false,
            updated_by: actor, updated_at: now,
          },
        });
        if (claimed.count !== 1) throw new Refusal(CHANGED_MESSAGE);
        await addEvent(tx, id, 'changes_requested', `Changes requested: ${remarks}`, actor, now);
      });
      const link = formLinkUrl(token);
      const delivered = await this.mail(id, row.email, renderCentreChangesRequestedEmail({
        contactName: row.contact_name, centreName: row.centre_name, link, expiresAt: linkExpiresAt(sentAt), remarks,
      }), actor);
      return ok(
        delivered ? 'Sent back to centre for changes' : 'Sent back for changes, but the email could not be sent. Use Copy Link to share the form.',
        { link, emailDelivered: delivered },
      );
    });
  }

  async reject(actor: number | null, id: number, reasonRaw: unknown): Promise<Outcome> {
    const reason = text(reasonRaw);
    if (!reason) return fail('A reason is required.');
    if (reason.length > 2000) return fail('Keep the reason under 2000 characters.');
    return this.guard(async () => {
      const now = this.now();
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.centre_onboarding.updateMany({
          where: { id, deleted_at: null, stage: 'under_review' },
          data: { stage: 'rejected', stage_since: now, reject_reason: reason, rejected_at: now, rejected_by: actor, updated_by: actor, updated_at: now },
        });
        if (claimed.count !== 1) throw new Refusal(await this.whyNot(id, 'Only an application Under Review can be rejected.'));
        await addEvent(tx, id, 'rejected', `Rejected: ${reason}`, actor, now);
      });
      return ok('Rejected');
    });
  }

  /** Reopen as Lead. The old form link stays dead: the admin sends a fresh one. */
  async reopen(actor: number | null, id: number): Promise<Outcome> {
    return this.guard(async () => {
      const now = this.now();
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.centre_onboarding.updateMany({
          where: { id, deleted_at: null, stage: 'rejected' },
          data: {
            stage: 'lead', stage_since: now, reject_reason: null, rejected_at: null, rejected_by: null,
            link_sent_at: null, link_token_hash: null, link_expired: false, updated_by: actor, updated_at: now,
          },
        });
        if (claimed.count !== 1) throw new Refusal(await this.whyNot(id, 'Only a rejected centre can be reopened.'));
        await addEvent(tx, id, 'reopened', 'Reopened as lead', actor, now);
      });
      return ok('Reopened as lead');
    });
  }
}

function leadColumns(lead: LeadInput) {
  return {
    centre_name: lead.centreName,
    contact_name: lead.contactName,
    email: lead.email,
    mobile: lead.mobile,
    country: lead.country || null,
    state: lead.state || null,
    district: lead.district || null,
    source: lead.source || null,
    notes: lead.notes || null,
  };
}
