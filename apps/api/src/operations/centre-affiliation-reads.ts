import type { Prisma, PrismaClient, centre_affiliation_certificates, centre_agreements } from '@prisma/client';

import {
  agreementStatusOf, certificateStatusOf, istTodayYmd, utcDateToYmd,
  type AgreementStatus, type CertificateStatus,
} from '@ttii/shared-types';

import { fileNameFromUrl, iso } from './centre-onboarding-model.js';

// Centres v2 — agreement and affiliation-certificate rows as the admin pages
// show them (Centre Onboarding detail, Affiliation & Agreements). Statuses are
// DERIVED from the dates against today's IST day; only "revoked" is stored.

type Db = PrismaClient | Prisma.TransactionClient;

export interface AgreementView {
  id: number;
  agreementNo: string;
  centreId: number | null;
  onboardingId: number | null;
  effectiveDate: string;
  termYears: number;
  expiryDate: string;
  signedOn: string;
  ttiiSignatory: string;
  centreSignatory: string;
  fileUrl: string;
  fileName: string;
  feeAmount: number;
  feePaid: boolean;
  feePaidOn: string;
  notes: string;
  status: AgreementStatus;
  createdAt: string;
}

export interface CertificateView {
  id: number;
  certificateNo: string;
  centreId: number | null;
  agreementId: number | null;
  onboardingId: number | null;
  validFrom: string;
  validTo: string;
  fileUrl: string;
  status: CertificateStatus;
  createdAt: string;
}

export function toAgreementView(a: centre_agreements, today: string): AgreementView {
  const expiry = utcDateToYmd(a.expiry_date);
  return {
    id: a.id,
    agreementNo: a.agreement_no,
    centreId: a.centre_id,
    onboardingId: a.onboarding_id,
    effectiveDate: utcDateToYmd(a.effective_date),
    termYears: a.term_years,
    expiryDate: expiry,
    signedOn: utcDateToYmd(a.signed_on),
    ttiiSignatory: a.ttii_signatory ?? '',
    centreSignatory: a.centre_signatory ?? '',
    fileUrl: a.file_url,
    fileName: fileNameFromUrl(a.file_url),
    feeAmount: Number(a.fee_amount),
    feePaid: a.fee_paid,
    feePaidOn: utcDateToYmd(a.fee_paid_on),
    notes: a.notes ?? '',
    status: agreementStatusOf(expiry, today),
    createdAt: iso(a.created_at),
  };
}

export function toCertificateView(c: centre_affiliation_certificates, today: string): CertificateView {
  const validTo = utcDateToYmd(c.valid_to);
  return {
    id: c.id,
    certificateNo: c.certificate_no,
    centreId: c.centre_id,
    agreementId: c.agreement_id,
    onboardingId: c.onboarding_id,
    validFrom: utcDateToYmd(c.valid_from),
    validTo,
    fileUrl: c.file_url ?? '',
    status: certificateStatusOf(validTo, c.status, today),
    createdAt: iso(c.created_at),
  };
}

/** The latest live agreement of an onboarding record. */
export async function loadAgreementView(db: Db, by: { onboardingId: number }, now: Date): Promise<AgreementView | null> {
  const a = await db.centre_agreements.findFirst({ where: { onboarding_id: by.onboardingId, deleted_at: null }, orderBy: { id: 'desc' } });
  return a ? toAgreementView(a, istTodayYmd(now.getTime())) : null;
}

/** The latest live certificate of an onboarding record. */
export async function loadCertificateView(db: Db, by: { onboardingId: number }, now: Date): Promise<CertificateView | null> {
  const c = await db.centre_affiliation_certificates.findFirst({ where: { onboarding_id: by.onboardingId, deleted_at: null }, orderBy: { id: 'desc' } });
  return c ? toCertificateView(c, istTodayYmd(now.getTime())) : null;
}
