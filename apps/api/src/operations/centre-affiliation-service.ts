import { randomBytes } from 'node:crypto';

import type { Prisma, PrismaClient } from '@prisma/client';

import {
  AGREEMENT_TERM_YEARS, addAgreementTerm, istTodayYmd, isValidYmd, utcDateToYmd, ymdToUtcDate,
} from '@ttii/shared-types';

import { getPrismaClient } from '../data/prisma-client.js';
import { env } from '../env.js';
import { renderAffiliationCertificatePdf } from '../integrations/affiliation-certificate-pdf.js';
import type { StorageProvider } from '../integrations/contracts.js';
import { isCentreCodeTaken } from './centre-code.js';
import { createCentreInTx, emailCentreCredentials } from './centre-create.js';
import { toAgreementView, toCertificateView, type AgreementView, type CertificateView } from './centre-affiliation-reads.js';
import {
  CHANGED_MESSAGE, NOT_SET_UP_MESSAGE, Refusal, agreementUploadFolder, fail, intId, isMissingTable, isSignedUpload,
  isUniqueViolation, nextSequenceNo, ok, splitMobile, text, uploadSignature, type Outcome,
} from './centre-onboarding-model.js';
import { parseStoredForm } from './centre-onboarding-service.js';

// Centres v2 — Affiliation & Agreements, and the last two onboarding steps
// (Naji 2026-10-22): Upload Signed Agreement (Agreement Pending → Certificate
// Pending) and Generate Affiliation Certificate → "Issue & Complete
// Onboarding" (Certificate Pending → Onboarded, which creates the centre, its
// KYC row and its role-7 login in ONE claim-first transaction).
//
// The certificate PDF is rendered and stored AFTER that transaction commits:
// a storage hiccup must not roll back a centre that now exists. When it fails
// the certificate keeps file_url NULL and the admin gets "Regenerate PDF".
// Credentials are emailed after commit too (emailCentreCredentials).

type Db = PrismaClient | Prisma.TransactionClient;

export interface CentreAffiliationDeps {
  prisma?: PrismaClient;
  /** Signs the signed-agreement upload URLs (an existing server secret). */
  secret?: string;
  storage?: StorageProvider;
  now?: () => Date;
  emailCredentials?: typeof emailCentreCredentials;
  renderPdf?: typeof renderAffiliationCertificatePdf;
}

export interface AffiliationAgreementRow extends AgreementView {
  centreName: string;
  centreCode: string;
  inOnboarding: boolean;
}

export interface AffiliationCertificateRow extends CertificateView {
  centreName: string;
  centreCode: string;
  inOnboarding: boolean;
  agreementNo: string;
}

export interface CompleteOnboardingResult {
  centreId: number;
  centreCode: string;
  certificateId: number;
  certificateNo: string;
  pdfReady: boolean;
  emailDelivered: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-22" → "22 Oct 2026". */
export function longYmd(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  return m ? `${m[3]} ${MONTHS[Number(m[2]) - 1] ?? ''} ${m[1]}` : '';
}

async function addEvent(db: Db, onboardingId: number, type: string, message: string, actor: number | null, at: Date): Promise<void> {
  await db.centre_onboarding_events.create({
    data: { onboarding_id: onboardingId, event_type: type, message: message.slice(0, 500), actor_user_id: actor, created_at: at },
  });
}

export async function nextNumber(db: Db, prefix: 'AGR' | 'AFC', year: number): Promise<string> {
  const head = `${prefix}-${year}-`;
  const used = prefix === 'AGR'
    ? (await db.centre_agreements.findMany({ where: { agreement_no: { startsWith: head } }, select: { agreement_no: true } })).map((r) => r.agreement_no)
    : (await db.centre_affiliation_certificates.findMany({ where: { certificate_no: { startsWith: head } }, select: { certificate_no: true } })).map((r) => r.certificate_no);
  return nextSequenceNo(prefix, year, used);
}

async function loginClashOf(db: Db, email: string): Promise<string> {
  const e = email.trim().toLowerCase();
  if (!e) return '';
  const user = await db.users.findFirst({ where: { deleted_at: null, OR: [{ user_email: e }, { email: e }] }, select: { id: true, name: true } });
  return user ? (user.name?.trim() || `User #${user.id}`) : '';
}

export class CentreAffiliationService {
  private readonly prisma: PrismaClient;
  private readonly secret: string;
  private readonly storage: StorageProvider | undefined;
  private readonly now: () => Date;
  private readonly emailCredentials: typeof emailCentreCredentials;
  private readonly renderPdf: typeof renderAffiliationCertificatePdf;

  constructor(deps: CentreAffiliationDeps = {}) {
    this.prisma = deps.prisma ?? getPrismaClient();
    this.secret = deps.secret ?? env.PASSWORD_RESET_TOKEN_KEY;
    this.storage = deps.storage;
    this.now = deps.now ?? (() => new Date());
    this.emailCredentials = deps.emailCredentials ?? emailCentreCredentials;
    this.renderPdf = deps.renderPdf ?? renderAffiliationCertificatePdf;
  }

  private async guard<T>(fn: () => Promise<Outcome<T>>): Promise<Outcome<T>> {
    try {
      return await fn();
    } catch (error: unknown) {
      if (error instanceof Refusal) return fail(error.message);
      if (isMissingTable(error)) return fail(NOT_SET_UP_MESSAGE);
      throw error;
    }
  }

  private year(): number {
    return Number(istTodayYmd(this.now().getTime()).slice(0, 4));
  }

  /** The numbers the two dialogs preview; the server assigns the real one when it saves. */
  async nextNumbers(): Promise<{ ready: boolean; message: string; agreementNo: string; certificateNo: string }> {
    try {
      const year = this.year();
      return { ready: true, message: '', agreementNo: await nextNumber(this.prisma, 'AGR', year), certificateNo: await nextNumber(this.prisma, 'AFC', year) };
    } catch (error: unknown) {
      if (isMissingTable(error)) return { ready: false, message: NOT_SET_UP_MESSAGE, agreementNo: '', certificateNo: '' };
      throw error;
    }
  }

  /** The signature returned with an uploaded signed-agreement URL (checked by uploadAgreement). */
  signAgreementUpload(onboardingId: number, url: string): string {
    return uploadSignature(this.secret, onboardingId, url);
  }

  /** Signed agreement PDFs are uploaded only while the record waits for one. */
  async canUploadAgreement(onboardingId: number): Promise<Outcome> {
    return this.guard(async () => {
      const row = await this.prisma.centre_onboarding.findFirst({ where: { id: onboardingId, deleted_at: null }, select: { stage: true } });
      if (!row) return fail('Centre onboarding record not found.');
      if (row.stage !== 'agreement_pending') return fail('The signed agreement is uploaded at Agreement Pending.');
      return ok('ok');
    });
  }

  /** Upload Signed Agreement: Agreement Pending → Certificate Pending, the agreement row numbered AGR-YYYY-###. */
  async uploadAgreement(actor: number | null, p: Record<string, unknown>): Promise<Outcome<{ agreementId: number; agreementNo: string }>> {
    const id = intId(p.id);
    const effective = text(p.effective_date);
    const term = Number(text(p.term_years));
    const signedOn = text(p.signed_on);
    const ttiiSignatory = text(p.ttii_signatory);
    const centreSignatory = text(p.centre_signatory);
    const feeText = text(p.fee_amount);
    const fee = Number(feeText);
    const feePaid = p.fee_paid === true || p.fee_paid === 'true' || p.fee_paid === 1 || p.fee_paid === '1';
    const feePaidOn = text(p.fee_paid_on);
    const fileUrl = text(p.file_url);
    const fileSig = text(p.file_sig);
    const notes = text(p.notes);
    const today = istTodayYmd(this.now().getTime());

    if (!id) return fail('Centre onboarding record not found.');
    if (!isValidYmd(effective)) return fail('Effective Date: Required');
    if (!(AGREEMENT_TERM_YEARS as readonly number[]).includes(term)) return fail('Term: choose 1, 2, 3 or 5 years');
    if (signedOn && !isValidYmd(signedOn)) return fail('Signed on: enter a valid date');
    if (signedOn && signedOn > today) return fail('Signed on cannot be in the future');
    if (ttiiSignatory.length > 150 || centreSignatory.length > 150) return fail('Signatory names must be 150 characters or fewer');
    if (!feeText || !Number.isFinite(fee) || fee < 0 || fee > 9_999_999_999) return fail('Affiliation Fee (₹): Required');
    if (feePaid && !isValidYmd(feePaidOn)) return fail('Paid on: enter the date the fee was paid');
    if (feePaid && feePaidOn > today) return fail('Paid on cannot be in the future');
    if (!fileUrl) return fail('Upload the signed PDF');
    if (!isSignedUpload(this.secret, id, agreementUploadFolder(id), fileUrl, fileSig)) return fail('Upload the signed PDF again.');
    if (notes.length > 2000) return fail('Notes must be 2000 characters or fewer');
    const expiry = addAgreementTerm(effective, term);

    return this.guard(async () => {
      let agreementNo = await nextNumber(this.prisma, 'AGR', this.year());
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const now = this.now();
          const no = agreementNo;
          const created = await this.prisma.$transaction(async (tx) => {
            const claimed = await tx.centre_onboarding.updateMany({
              where: { id, deleted_at: null, stage: 'agreement_pending' },
              data: { stage: 'certificate_pending', stage_since: now, updated_by: actor, updated_at: now },
            });
            if (claimed.count !== 1) throw new Refusal(await this.whyNot(tx, id, 'The signed agreement is uploaded at Agreement Pending.'));
            const row = await tx.centre_agreements.create({
              data: {
                agreement_no: no,
                onboarding_id: id,
                effective_date: ymdToUtcDate(effective) as Date,
                term_years: term,
                expiry_date: ymdToUtcDate(expiry) as Date,
                signed_on: signedOn ? ymdToUtcDate(signedOn) : null,
                ttii_signatory: ttiiSignatory || null,
                centre_signatory: centreSignatory || null,
                file_url: fileUrl,
                fee_amount: fee.toFixed(2),
                fee_paid: feePaid,
                fee_paid_on: feePaid ? ymdToUtcDate(feePaidOn) : null,
                notes: notes || null,
                created_by: actor,
                updated_by: actor,
                created_at: now,
                updated_at: now,
              },
              select: { id: true },
            });
            await addEvent(tx, id, 'agreement_uploaded', `Signed agreement uploaded (${no})`, actor, now);
            return row;
          });
          return ok('Signed agreement uploaded', { agreementId: created.id, agreementNo: no });
        } catch (error: unknown) {
          if (!isUniqueViolation(error)) throw error;
          if (attempt > 0) return fail(CHANGED_MESSAGE);
          agreementNo = await nextNumber(this.prisma, 'AGR', this.year());
        }
      }
      return fail(CHANGED_MESSAGE);
    });
  }

  private async whyNot(db: Db, id: number, wrongStage: string): Promise<string> {
    const row = await db.centre_onboarding.findFirst({ where: { id, deleted_at: null }, select: { stage: true } });
    if (!row) return 'Centre onboarding record not found.';
    return row.stage === 'onboarded' ? 'This centre is already onboarded.' : wrongStage;
  }

  /**
   * Issue & Complete Onboarding. One transaction: claim Certificate Pending →
   * Onboarded, create the centre (reserved code) + centre_kyc + role-7 login,
   * link the onboarding record and its agreement to the new centre, insert the
   * certificate. Then, after commit: the certificate PDF and the credentials email.
   */
  async completeOnboarding(actor: number | null, id: number): Promise<Outcome<CompleteOnboardingResult>> {
    return this.guard(async () => {
      const row = await this.prisma.centre_onboarding.findFirst({ where: { id, deleted_at: null } });
      if (!row) return fail('Centre onboarding record not found.');
      if (row.stage === 'onboarded') return fail('This centre is already onboarded.');
      if (row.stage !== 'certificate_pending') return fail('The certificate is issued at Certificate Pending.');
      const agreement = await this.prisma.centre_agreements.findFirst({ where: { onboarding_id: id, deleted_at: null }, orderBy: { id: 'desc' } });
      if (!agreement) return fail('Upload the signed agreement first.');
      const validFrom = utcDateToYmd(agreement.effective_date);
      const validTo = utcDateToYmd(agreement.expiry_date);
      if (!validFrom || !validTo) return fail('Agreement dates are missing');
      const code = row.centre_code ?? '';
      if (!code) return fail('No centre code was reserved for this centre.');
      const form = parseStoredForm(row.form_json);
      if (!form) return fail('The centre has not submitted the application form.');
      // centre_kyc must exist (P2021 here answers "not set up yet" via guard).
      await this.prisma.centre_kyc.findFirst({ select: { centre_id: true } });
      const clash = await loginClashOf(this.prisma, row.email);
      if (clash) return fail(`${row.email} is already the email of an LMS login (${clash}). Change the centre email with Edit before completing onboarding.`);
      if (await isCentreCodeTaken(this.prisma, code, { onboardingId: id })) return fail(`Centre code ${code} is already used by another centre.`);
      const country = row.country || form.country || 'India';
      const { countryCode, phone } = splitMobile(row.mobile || form.mobile, country);
      if (phone.length < 6 || phone.length > 15) return fail('The centre mobile number is not valid. Edit the lead and try again.');

      let certificateNo = await nextNumber(this.prisma, 'AFC', this.year());
      let done: { centreId: number; certificateId: number; tempPassword: string } | null = null;
      for (let attempt = 0; attempt < 2 && !done; attempt += 1) {
        try {
          const now = this.now();
          const no = certificateNo;
          done = await this.prisma.$transaction(async (tx) => {
            const claimed = await tx.centre_onboarding.updateMany({
              where: { id, deleted_at: null, stage: 'certificate_pending' },
              data: { stage: 'onboarded', stage_since: now, updated_by: actor, updated_at: now },
            });
            if (claimed.count !== 1) throw new Refusal(await this.whyNot(tx, id, CHANGED_MESSAGE));
            if (await loginClashOf(tx, row.email)) throw new Refusal(`${row.email} is already the email of an LMS login. Change the centre email with Edit before completing onboarding.`);
            const created = await createCentreInTx(tx, {
              centreCode: code,
              centreName: row.centre_name,
              contactPerson: row.contact_name,
              designation: form.designation,
              countryCode,
              phone,
              email: row.email,
              address: form.address1,
              country,
              state: row.state || form.state,
              district: row.district || form.district,
              registrationDoc: form.registrationDoc?.url ?? null,
              registrationDate: validFrom,
              expiryDate: validTo,
              status: 1,
              kyc: {
                legalEntityName: form.legalEntity,
                entityType: form.entityType,
                city: form.city,
                pincode: form.pin,
                gstin: form.gstin,
                pan: form.pan,
                idNumber: form.idNumber,
                idDoc: form.idDoc?.url ?? null,
                panDoc: form.panDoc?.url ?? null,
                bankAccountName: form.accountName,
                bankAccountNumber: form.accountNumber,
                bankIfsc: form.ifsc,
                bankName: form.bank,
                bankBranch: form.branch,
              },
              actorUserId: actor,
            });
            await tx.centre_onboarding.update({ where: { id }, data: { centre_id: created.centreId } });
            await tx.centre_agreements.update({ where: { id: agreement.id }, data: { centre_id: created.centreId, updated_by: actor, updated_at: now } });
            const cert = await tx.centre_affiliation_certificates.create({
              data: {
                certificate_no: no,
                centre_id: created.centreId,
                agreement_id: agreement.id,
                onboarding_id: id,
                valid_from: ymdToUtcDate(validFrom) as Date,
                valid_to: ymdToUtcDate(validTo) as Date,
                file_url: null,
                status: 'valid',
                created_by: actor,
                created_at: now,
                updated_at: now,
              },
              select: { id: true },
            });
            await addEvent(tx, id, 'certificate_issued', `Affiliation certificate ${no} issued — onboarding completed`, actor, now);
            return { centreId: created.centreId, certificateId: cert.id, tempPassword: created.tempPassword };
          }, { timeout: 20_000 });
        } catch (error: unknown) {
          // A unique index refused a row: most likely the certificate number
          // (another issue in the same moment). Re-check the code and the
          // login before the one retry; a second refusal is reported, not a 500.
          if (!isUniqueViolation(error)) throw error;
          if (attempt > 0) return fail(CHANGED_MESSAGE);
          if (await isCentreCodeTaken(this.prisma, code, { onboardingId: id })) return fail(`Centre code ${code} is already used by another centre.`);
          const clashNow = await loginClashOf(this.prisma, row.email);
          if (clashNow) return fail(`${row.email} is already the email of an LMS login (${clashNow}). Change the centre email with Edit before completing onboarding.`);
          certificateNo = await nextNumber(this.prisma, 'AFC', this.year());
        }
      }
      if (!done) return fail(CHANGED_MESSAGE);

      const pdfReady = await this.storeCertificatePdf(done.certificateId, actor).then((url) => url !== '').catch(() => false);
      const sent = await this.emailCredentials({ contactPerson: row.contact_name, centreName: row.centre_name, email: row.email }, done.tempPassword);
      return ok(`${row.centre_name} onboarded — added to Centre Directory`, {
        centreId: done.centreId,
        centreCode: code,
        certificateId: done.certificateId,
        certificateNo,
        pdfReady,
        emailDelivered: sent.emailDelivered,
      });
    });
  }

  /** Render the certificate PDF, store it, save its URL. '' when no storage is configured. Throws on a render/upload failure. */
  private async storeCertificatePdf(certificateId: number, actor: number | null): Promise<string> {
    if (!this.storage) return '';
    const cert = await this.prisma.centre_affiliation_certificates.findFirst({ where: { id: certificateId, deleted_at: null } });
    if (!cert) return '';
    const [centre, agreement, onboarding] = await Promise.all([
      cert.centre_id ? this.prisma.centres.findFirst({ where: { id: cert.centre_id }, select: { centre_name: true, centre_id: true, district_id: true, state_id: true } }) : null,
      cert.agreement_id ? this.prisma.centre_agreements.findFirst({ where: { id: cert.agreement_id }, select: { agreement_no: true } }) : null,
      cert.onboarding_id ? this.prisma.centre_onboarding.findFirst({ where: { id: cert.onboarding_id }, select: { centre_name: true, centre_code: true, district: true, state: true } }) : null,
    ]);
    const pdf = await this.renderPdf({
      certificateNo: cert.certificate_no,
      centreName: centre?.centre_name || onboarding?.centre_name || '',
      location: [centre?.district_id || onboarding?.district, centre?.state_id || onboarding?.state].filter((v) => v && v.trim()).join(', '),
      centreCode: centre?.centre_id || onboarding?.centre_code || '',
      validFrom: longYmd(utcDateToYmd(cert.valid_from)),
      validTo: longYmd(utcDateToYmd(cert.valid_to)),
      agreementNo: agreement?.agreement_no ?? '',
      issuedOn: longYmd(istTodayYmd((cert.created_at ?? this.now()).getTime())),
    });
    const key = `centre-certificates/${cert.certificate_no}-${randomBytes(16).toString('hex')}.pdf`;
    const stored = await this.storage.uploadObject({ key, body: pdf, contentType: 'application/pdf', publicRead: true });
    await this.prisma.centre_affiliation_certificates.update({ where: { id: cert.id }, data: { file_url: stored.location, updated_at: this.now() } });
    if (cert.onboarding_id) await addEvent(this.prisma, cert.onboarding_id, 'certificate_pdf', `Certificate PDF generated (${cert.certificate_no})`, actor, this.now());
    return stored.location;
  }

  /** "Regenerate PDF" for a certificate whose PDF could not be stored at issue time. */
  async regenerateCertificatePdf(actor: number | null, certificateId: number): Promise<Outcome<{ fileUrl: string }>> {
    return this.guard(async () => {
      if (!this.storage) return fail('File storage is not configured on this server.');
      const cert = await this.prisma.centre_affiliation_certificates.findFirst({ where: { id: certificateId, deleted_at: null }, select: { status: true } });
      if (!cert) return fail('Certificate not found.');
      if (cert.status === 'revoked') return fail('This certificate is revoked.');
      try {
        const fileUrl = await this.storeCertificatePdf(certificateId, actor);
        return ok('Certificate PDF generated', { fileUrl });
      } catch (error: unknown) {
        if (isMissingTable(error)) throw error;
        return fail(`The certificate PDF could not be generated: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  /** Every live agreement and certificate, onboarding ones (no centre yet) included. */
  async list(): Promise<{ ready: boolean; message: string; today: string; agreements: AffiliationAgreementRow[]; certificates: AffiliationCertificateRow[] }> {
    const today = istTodayYmd(this.now().getTime());
    try {
      const [agreements, certificates] = await Promise.all([
        this.prisma.centre_agreements.findMany({ where: { deleted_at: null }, orderBy: { id: 'asc' } }),
        this.prisma.centre_affiliation_certificates.findMany({ where: { deleted_at: null }, orderBy: { id: 'asc' } }),
      ]);
      const centreIds = [...new Set([...agreements, ...certificates].map((r) => r.centre_id).filter((v): v is number => typeof v === 'number'))];
      const onboardingIds = [...new Set([...agreements, ...certificates].map((r) => r.onboarding_id).filter((v): v is number => typeof v === 'number'))];
      const [centres, leads] = await Promise.all([
        centreIds.length ? this.prisma.centres.findMany({ where: { id: { in: centreIds } }, select: { id: true, centre_name: true, centre_id: true } }) : [],
        onboardingIds.length ? this.prisma.centre_onboarding.findMany({ where: { id: { in: onboardingIds } }, select: { id: true, centre_name: true, centre_code: true } }) : [],
      ]);
      const centreById = new Map(centres.map((c) => [c.id, c]));
      const leadById = new Map(leads.map((l) => [l.id, l]));
      const who = (centreId: number | null, onboardingId: number | null) => {
        const c = centreId ? centreById.get(centreId) : undefined;
        const l = onboardingId ? leadById.get(onboardingId) : undefined;
        return {
          centreName: c?.centre_name || l?.centre_name || '',
          centreCode: c?.centre_id || l?.centre_code || '',
          inOnboarding: centreId === null,
        };
      };
      const agreementNo = new Map(agreements.map((a) => [a.id, a.agreement_no]));
      return {
        ready: true,
        message: '',
        today,
        agreements: agreements.map((a) => ({ ...toAgreementView(a, today), ...who(a.centre_id, a.onboarding_id) })),
        certificates: certificates.map((c) => ({
          ...toCertificateView(c, today),
          ...who(c.centre_id, c.onboarding_id),
          agreementNo: c.agreement_id ? agreementNo.get(c.agreement_id) ?? '' : '',
        })),
      };
    } catch (error: unknown) {
      if (isMissingTable(error)) return { ready: false, message: NOT_SET_UP_MESSAGE, today, agreements: [], certificates: [] };
      throw error;
    }
  }

  /** Record an affiliation fee paid after the agreement was uploaded (claim-first on fee_paid = 0). */
  async markFeePaid(actor: number | null, agreementId: number, paidOnRaw: unknown): Promise<Outcome> {
    const today = istTodayYmd(this.now().getTime());
    const paidOn = text(paidOnRaw) || today;
    if (!agreementId) return fail('Agreement not found.');
    if (!isValidYmd(paidOn)) return fail('Paid on: enter a valid date');
    if (paidOn > today) return fail('Paid on cannot be in the future');
    return this.guard(async () => {
      const now = this.now();
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.centre_agreements.updateMany({
          where: { id: agreementId, deleted_at: null, fee_paid: false },
          data: { fee_paid: true, fee_paid_on: ymdToUtcDate(paidOn), updated_by: actor, updated_at: now },
        });
        if (claimed.count !== 1) {
          const row = await tx.centre_agreements.findFirst({ where: { id: agreementId, deleted_at: null }, select: { id: true } });
          throw new Refusal(row ? 'This affiliation fee is already marked paid.' : 'Agreement not found.');
        }
        const row = await tx.centre_agreements.findFirst({ where: { id: agreementId }, select: { agreement_no: true, onboarding_id: true } });
        if (row?.onboarding_id) await addEvent(tx, row.onboarding_id, 'fee_paid', `Affiliation fee marked paid (${row.agreement_no}, paid on ${longYmd(paidOn)})`, actor, now);
      });
      return ok('Affiliation fee marked paid');
    });
  }
}
