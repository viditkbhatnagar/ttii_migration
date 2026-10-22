import type { PrismaClient, centre_affiliation_certificates, centre_agreements, centre_kyc } from '@prisma/client';
import { istTodayYmd } from '@ttii/shared-types';

import { getPrismaClient } from '../data/prisma-client.js';
import { toLegacyFileUrl } from '../data/legacy-asset-url.js';
import { toAgreementView, toCertificateView, type AgreementView, type CertificateView } from './centre-affiliation-reads.js';
import { looseYmd, toPositiveInt } from './centre-dashboard-model.js';
import {
  affiliationSummary, buildDocumentRows, isCentreDocType, isCentreOwner, isCentreUploadUrl,
  type AffiliationSummary, type CentreActor, type DocumentRow,
} from './centre-portal-model.js';
import { NOT_SET_UP_MESSAGE, isMissingTable, locationName, text, type Outcome } from './centre-profile-model.js';

// Centre portal v2 (Naji 2026-10-22): the Profile page of the centre's OWN
// login — centre details, KYC / bank, affiliation agreements + certificates
// and documents — and the one write it allows: filing an uploaded document.
// Centre Login (role 7) ONLY: the profile carries Aadhaar / PAN / bank
// details. The centre is always the caller's users.centre_id; nothing from the
// client picks it. centres.password is never selected.
//
// Read-only in this phase: details are changed by TTII (admin Centre
// Profile). The 2026-10-22 tables may be missing: their reads degrade to
// empty (kycReady=false) and the document write refuses with NOT_SET_UP_MESSAGE.

const OWNER_ONLY = 'Only the centre login can open the centre profile.';
const NO_CENTRE = 'No centre is linked to this login. Please contact TTII support.';
const IST_OFFSET_MS = 330 * 60 * 1000;

export interface PortalCentreDetails {
  id: number;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  address: string;
  district: string;
  state: string;
  country: string;
  contactPerson: string;
  designation: string;
  countryCode: string;
  phone: string;
  email: string;
  registrationDate: string;
}

export interface PortalKyc {
  legalEntityName: string;
  entityType: string;
  city: string;
  pincode: string;
  gstin: string;
  pan: string;
  idNumber: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  bankBranch: string;
}

export type PortalAgreement = Omit<AgreementView, 'notes' | 'feeAmount' | 'feePaid' | 'feePaidOn' | 'onboardingId' | 'centreId'>;
export type PortalCertificate = Omit<CertificateView, 'onboardingId' | 'centreId'>;

export interface CentrePortalProfile {
  kycReady: boolean;
  today: string;
  centre: PortalCentreDetails;
  kyc: PortalKyc | null;
  affiliation: AffiliationSummary & { agreements: PortalAgreement[]; certificates: PortalCertificate[] };
  documents: DocumentRow[];
}

const istYmd = (value: Date | null | undefined): string =>
  (value instanceof Date && !Number.isNaN(value.getTime()) ? new Date(value.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10) : '');

/** Read a 2026-10-22 table; P2021 (not migrated) answers `fallback`. */
async function optional<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error: unknown) {
    if (isMissingTable(error)) return fallback;
    throw error;
  }
}

function kycOf(k: centre_kyc): PortalKyc {
  return {
    legalEntityName: text(k.legal_entity_name),
    entityType: text(k.entity_type),
    city: text(k.city),
    pincode: text(k.pincode),
    gstin: text(k.gstin),
    pan: text(k.pan),
    idNumber: text(k.id_number),
    bankAccountName: text(k.bank_account_name),
    bankAccountNumber: text(k.bank_account_number),
    bankIfsc: text(k.bank_ifsc),
    bankName: text(k.bank_name),
    bankBranch: text(k.bank_branch),
  };
}

function portalAgreement(a: centre_agreements, today: string): PortalAgreement {
  const { notes: _notes, feeAmount: _fee, feePaid: _paid, feePaidOn: _paidOn, onboardingId: _onb, centreId: _centre, ...rest } = toAgreementView(a, today);
  return { ...rest, fileUrl: toLegacyFileUrl(rest.fileUrl) };
}

function portalCertificate(c: centre_affiliation_certificates, today: string): PortalCertificate {
  const { onboardingId: _onb, centreId: _centre, ...rest } = toCertificateView(c, today);
  return { ...rest, fileUrl: toLegacyFileUrl(rest.fileUrl) };
}

export interface CentrePortalProfileDeps {
  prisma?: PrismaClient;
  now?: () => Date;
}

export class CentrePortalProfileService {
  private readonly prisma: PrismaClient;
  private readonly now: () => Date;

  constructor(deps: CentrePortalProfileDeps = {}) {
    this.prisma = deps.prisma ?? getPrismaClient();
    this.now = deps.now ?? (() => new Date());
  }

  /** The caller's centre id (users.centre_id), 0 when none is linked. */
  private async centreIdOf(actor: CentreActor): Promise<number> {
    const user = await this.prisma.users.findFirst({ where: { id: actor.userId, deleted_at: null }, select: { centre_id: true } });
    return toPositiveInt(user?.centre_id);
  }

  async profile(actor: CentreActor): Promise<Outcome<CentrePortalProfile>> {
    if (!isCentreOwner(actor)) return { status: 0, message: OWNER_ONLY };
    const centreId = await this.centreIdOf(actor);
    const centre = centreId > 0
      ? await this.prisma.centres.findFirst({
        where: { id: centreId, deleted_at: null },
        select: {
          id: true, centre_id: true, centre_name: true, status: true, address: true, country_id: true, state_id: true,
          district_id: true, contact_person: true, contact_person_designation: true, country_code: true, phone: true,
          email: true, date_of_registration: true, date_of_expiry: true, registraion_certificate: true, affiliation_document: true,
        },
      })
      : null;
    if (!centre) return { status: 0, message: NO_CENTRE };

    const missing = Symbol('missing');
    const kycOrMissing = await optional<centre_kyc | null | typeof missing>(
      () => this.prisma.centre_kyc.findUnique({ where: { centre_id: centre.id } }),
      missing,
    );
    const [agreements, certificates, uploaded] = await Promise.all([
      optional(() => this.prisma.centre_agreements.findMany({ where: { centre_id: centre.id, deleted_at: null }, orderBy: [{ effective_date: 'desc' }, { id: 'desc' }] }), []),
      optional(() => this.prisma.centre_affiliation_certificates.findMany({ where: { centre_id: centre.id, deleted_at: null }, orderBy: [{ valid_from: 'desc' }, { id: 'desc' }] }), []),
      optional(() => this.prisma.centre_documents.findMany({ where: { centre_id: centre.id, deleted_at: null }, orderBy: { id: 'desc' } }), []),
    ]);
    const kyc = kycOrMissing === missing ? null : kycOrMissing;
    const today = istTodayYmd(this.now().getTime());
    const agreementViews = agreements.map((a) => portalAgreement(a, today));
    const certificateViews = certificates.map((c) => portalCertificate(c, today));
    const summary = affiliationSummary(looseYmd(centre.date_of_expiry), agreementViews.map((a) => a.expiryDate), today);

    return {
      status: 1,
      message: 'success',
      data: {
        kycReady: kycOrMissing !== missing,
        today,
        centre: {
          id: centre.id,
          code: text(centre.centre_id),
          name: text(centre.centre_name),
          status: centre.status === 0 ? 'inactive' : 'active',
          address: text(centre.address),
          district: locationName(centre.district_id),
          state: locationName(centre.state_id),
          country: locationName(centre.country_id),
          contactPerson: text(centre.contact_person),
          designation: text(centre.contact_person_designation),
          countryCode: text(centre.country_code),
          phone: text(centre.phone),
          email: text(centre.email),
          registrationDate: looseYmd(centre.date_of_registration),
        },
        kyc: kyc ? kycOf(kyc) : null,
        affiliation: { ...summary, agreements: agreementViews, certificates: certificateViews },
        documents: buildDocumentRows({
          registrationDoc: toLegacyFileUrl(centre.registraion_certificate),
          idDoc: kyc ? toLegacyFileUrl(kyc.id_doc) : '',
          panDoc: kyc ? toLegacyFileUrl(kyc.pan_doc) : '',
          legacyAffiliationDoc: toLegacyFileUrl(centre.affiliation_document),
          uploaded: uploaded.map((d) => ({ id: d.id, title: text(d.title), docType: text(d.doc_type), url: toLegacyFileUrl(d.file_url), date: istYmd(d.created_at) })),
          agreements: agreementViews.map((a) => ({ id: a.id, agreementNo: a.agreementNo, url: a.fileUrl, date: a.signedOn || a.effectiveDate })),
          certificates: certificateViews.map((c) => ({ id: c.id, certificateNo: c.certificateNo, url: c.fileUrl, date: c.validFrom })),
        }),
      },
    };
  }

  /**
   * File a document the centre uploaded through /centre/upload under its OWN
   * centre (centre_documents). The type must be one of CENTRE_DOC_TYPES and the
   * link a /centre/upload file.
   */
  async addDocument(actor: CentreActor, payload: Record<string, unknown>): Promise<Outcome<{ id: number }>> {
    if (!isCentreOwner(actor)) return { status: 0, message: OWNER_ONLY };
    const docType = text(payload.doc_type);
    const fileUrl = text(payload.file_url);
    const title = text(payload.title) || docType;
    if (!isCentreDocType(docType)) return { status: 0, message: 'Pick what kind of document this is.' };
    if (title.length > 250) return { status: 0, message: 'The document name is too long (250 characters at most).' };
    if (!isCentreUploadUrl(fileUrl)) return { status: 0, message: 'Upload the file again: the file link is missing or invalid.' };
    const centreId = await this.centreIdOf(actor);
    const centre = centreId > 0 ? await this.prisma.centres.findFirst({ where: { id: centreId, deleted_at: null }, select: { id: true } }) : null;
    if (!centre) return { status: 0, message: NO_CENTRE };
    try {
      const row = await this.prisma.centre_documents.create({
        data: { centre_id: centre.id, title, doc_type: docType, file_url: fileUrl, created_by: actor.userId, created_at: this.now() },
        select: { id: true },
      });
      return { status: 1, message: 'Document uploaded', data: { id: row.id } };
    } catch (error: unknown) {
      if (isMissingTable(error)) return { status: 0, message: NOT_SET_UP_MESSAGE };
      throw error;
    }
  }
}
