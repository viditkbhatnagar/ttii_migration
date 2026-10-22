import type { Prisma } from '@prisma/client';

import { emailIssuedCredentials, issueCredentials } from '../auth/credentials-issuer.js';

// One way to create a centre and its role-7 login, shared by Add Centre (the
// Centre Directory dialog) and Centre Onboarding ("Issue & Complete
// Onboarding"). Centres v2, 2026-10-22.
//
// The caller owns the transaction: createCentreInTx writes the centres row,
// its centre_kyc row and the login user, and returns the temp password so the
// caller can email it ONLY AFTER the transaction commits. The old addCentre
// emailed inside the transaction, before the user row existed, so a rolled-back
// add still mailed a password that was never saved.
//
// The login email links to the centre portal (admissions.*). The old addCentre
// passed no loginUrl, so centre credentials pointed at the admin portal.

export const CENTRE_LOGIN_URL = 'https://admissions.teachersindia.in';
export const CENTRE_ROLE_ID = 7;

export interface CentreKycInput {
  legalEntityName?: string | null;
  entityType?: string | null;
  city?: string | null;
  pincode?: string | null;
  gstin?: string | null;
  pan?: string | null;
  idNumber?: string | null;
  idDoc?: string | null;
  panDoc?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  logo?: string | null;
}

export interface CreateCentreInput {
  /** Already validated as free (centre-code.ts isCentreCodeTaken). */
  centreCode: string;
  centreName: string;
  contactPerson: string;
  designation?: string | null;
  /** Dial code, e.g. "+91". */
  countryCode: string;
  phone: string;
  email: string;
  address?: string | null;
  /** NAMES, stored in the legacy Text columns country_id / state_id / district_id. */
  country?: string | null;
  state?: string | null;
  district?: string | null;
  /** Upload URL, stored in centres.registraion_certificate (sic). */
  registrationDoc?: string | null;
  /** YYYY-MM-DD */
  registrationDate?: string | null;
  /** YYYY-MM-DD — the "Affiliation Expiry". */
  expiryDate?: string | null;
  /** 1 active (default), 0 inactive. */
  status?: number;
  kyc?: CentreKycInput;
  actorUserId: number | null;
}

export interface CreatedCentre {
  centreId: number;
  centreCode: string;
  loginUserId: number;
  /** Plain-text temp password: pass to emailCentreCredentials after commit. Never log. */
  tempPassword: string;
}

const blankToNull = (value: string | null | undefined): string | null => {
  const s = (value ?? '').trim();
  return s === '' ? null : s;
};

/** centre_kyc columns from the input; blank strings become NULL. */
export function kycColumns(kyc: CentreKycInput | undefined): Omit<Prisma.centre_kycUncheckedCreateInput, 'centre_id'> {
  const k = kyc ?? {};
  return {
    legal_entity_name: blankToNull(k.legalEntityName),
    entity_type: blankToNull(k.entityType),
    city: blankToNull(k.city),
    pincode: blankToNull(k.pincode),
    gstin: blankToNull(k.gstin)?.toUpperCase() ?? null,
    pan: blankToNull(k.pan)?.toUpperCase() ?? null,
    id_number: blankToNull(k.idNumber),
    id_doc: blankToNull(k.idDoc),
    pan_doc: blankToNull(k.panDoc),
    bank_account_name: blankToNull(k.bankAccountName),
    bank_account_number: blankToNull(k.bankAccountNumber),
    bank_ifsc: blankToNull(k.bankIfsc)?.toUpperCase() ?? null,
    bank_name: blankToNull(k.bankName),
    bank_branch: blankToNull(k.bankBranch),
    logo: blankToNull(k.logo),
  };
}

/**
 * Create the centre, its centre_kyc row and its role-7 login inside the
 * caller's transaction. Requires the centre_kyc table (2026-10-22 migration):
 * callers check it exists first and refuse with a clear message if not.
 */
export async function createCentreInTx(tx: Prisma.TransactionClient, input: CreateCentreInput): Promise<CreatedCentre> {
  const now = new Date();
  const centre = await tx.centres.create({
    data: {
      centre_id: input.centreCode,
      centre_name: input.centreName,
      contact_person: input.contactPerson,
      contact_person_designation: blankToNull(input.designation),
      country_code: input.countryCode,
      phone: input.phone,
      whatsapp: input.phone,
      secondary_phone: '',
      email: input.email,
      address: blankToNull(input.address),
      country_id: blankToNull(input.country),
      state_id: blankToNull(input.state),
      district_id: blankToNull(input.district),
      registraion_certificate: blankToNull(input.registrationDoc),
      date_of_registration: blankToNull(input.registrationDate),
      date_of_expiry: blankToNull(input.expiryDate),
      wallet_balance: '0',
      status: input.status ?? 1,
      created_by: input.actorUserId,
      updated_by: input.actorUserId,
      created_at: now,
      updated_at: now,
    },
  });

  await tx.centre_kyc.create({
    data: { centre_id: centre.id, ...kycColumns(input.kyc), created_by: input.actorUserId, updated_by: input.actorUserId, created_at: now, updated_at: now },
  });

  const { tempPassword, hashedPassword } = await issueCredentials();
  const login = await tx.users.create({
    data: {
      name: input.centreName,
      user_email: input.email,
      country_code: input.countryCode,
      phone: input.phone,
      role_id: CENTRE_ROLE_ID,
      centre_id: String(centre.id),
      password: hashedPassword,
      status: 1,
      gender: '',
      dynamic_link: '',
      image: '',
      profile_picture: '',
      application_id: 0,
      created_by: input.actorUserId,
      updated_by: input.actorUserId,
      created_at: now,
      updated_at: now,
    },
    select: { id: true },
  });

  return { centreId: centre.id, centreCode: input.centreCode, loginUserId: login.id, tempPassword };
}

/** Email the centre its login AFTER the creating transaction committed. Never throws. */
export async function emailCentreCredentials(
  input: Pick<CreateCentreInput, 'contactPerson' | 'centreName' | 'email'>,
  tempPassword: string,
): Promise<{ emailDelivered: boolean; emailError?: string }> {
  return emailIssuedCredentials(
    { name: input.contactPerson || input.centreName, email: input.email, roleLabel: 'Centre admin', loginUrl: CENTRE_LOGIN_URL },
    tempPassword,
  );
}
