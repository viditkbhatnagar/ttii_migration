import { dialCodeFor, districtsFor, statesFor } from '@/lib/location-tree';
import { asRecord } from '../../shared/utils/admin-data-utils.js';
import type { CentreProfile } from './centre-profile-model.js';

// Add / Edit Centre form (Naji 2026-10-22, AddCentreDialog). Same rules as the
// server (apps/api/src/operations/centre-profile-model.ts validateCentre):
//  - PIN is 6 digits only for India; the mobile is /^[6-9]\d{9}$/ only for +91,
//    otherwise 7–15 digits;
//  - Aadhaar/Passport and PAN (numbers and documents) are required on ADD only
//    — the live centres have none, and their edits must not be blocked;
//  - before the 2026-10-22 migration (kycReady=false) the legal, identity, tax
//    and bank sections cannot be saved, so they are hidden and not required.
// Uploads store the file URL from POST /admin/upload, not just a file name.

export const ENTITY_TYPES = ['Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'Trust', 'Society', 'Other'] as const;
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const UPLOAD_ACCEPT = '.pdf,.png,.jpg,.jpeg';

export interface CentreForm {
  centreId: string;
  name: string;
  legalEntity: string;
  entityType: string;
  registrationDoc: string;
  affiliationExpiry: string;
  address1: string;
  country: string;
  state: string;
  district: string;
  city: string;
  pin: string;
  contactName: string;
  designation: string;
  mobile: string;
  email: string;
  idNumber: string;
  idDoc: string;
  pan: string;
  panDoc: string;
  gstin: string;
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bank: string;
  branch: string;
}

export type FormKey = keyof CentreForm;
export type FormErrors = Partial<Record<FormKey, string>>;

export const EMPTY_FORM: CentreForm = {
  centreId: '', name: '', legalEntity: '', entityType: '', registrationDoc: '', affiliationExpiry: '',
  address1: '', country: 'India', state: '', district: '', city: '', pin: '',
  contactName: '', designation: '', mobile: '', email: '',
  idNumber: '', idDoc: '', pan: '', panDoc: '', gstin: '',
  accountName: '', accountNumber: '', ifsc: '', bank: '', branch: '',
};

/** Form key → API field (snake_case, centre-profile-model CENTRE_FIELDS). */
export const API_FIELD: Record<FormKey, string> = {
  centreId: 'centre_code', name: 'centre_name', legalEntity: 'legal_entity_name', entityType: 'entity_type',
  registrationDoc: 'registration_doc', affiliationExpiry: 'affiliation_expiry', address1: 'address', country: 'country',
  state: 'state', district: 'district', city: 'city', pin: 'pincode', contactName: 'contact_person',
  designation: 'designation', mobile: 'phone', email: 'email', idNumber: 'id_number', idDoc: 'id_doc', pan: 'pan',
  panDoc: 'pan_doc', gstin: 'gstin', accountName: 'bank_account_name', accountNumber: 'bank_account_number',
  ifsc: 'bank_ifsc', bank: 'bank_name', branch: 'bank_branch',
};

/** Stored in centre_kyc: hidden (and not sent) before the 2026-10-22 migration. */
export const KYC_KEYS: readonly FormKey[] = [
  'legalEntity', 'entityType', 'city', 'pin', 'idNumber', 'idDoc', 'pan', 'panDoc', 'gstin',
  'accountName', 'accountNumber', 'ifsc', 'bank', 'branch',
];

const ALWAYS_REQUIRED: readonly FormKey[] = [
  'centreId', 'name', 'legalEntity', 'entityType', 'address1', 'country', 'state', 'district', 'city', 'pin',
  'contactName', 'designation', 'mobile', 'email',
];
const ADD_ONLY_REQUIRED: readonly FormKey[] = ['idNumber', 'idDoc', 'pan', 'panDoc'];

export interface FormMode {
  mode: 'add' | 'edit';
  kycReady: boolean;
}

export function isRequired(key: FormKey, m: FormMode): boolean {
  if (!m.kycReady && KYC_KEYS.includes(key)) return false;
  return ALWAYS_REQUIRED.includes(key) || (m.mode === 'add' && ADD_ONLY_REQUIRED.includes(key));
}

const isIndia = (country: string) => country.trim().toLowerCase() === 'india';

/** Field → message; empty when the form can be sent. Mirrors the server. */
export function validateForm(f: CentreForm, m: FormMode): FormErrors {
  const e: FormErrors = {};
  (Object.keys(f) as FormKey[]).forEach((k) => {
    if (isRequired(k, m) && !f[k].trim()) e[k] = 'Required';
  });
  const india = isIndia(f.country);
  const dial = dialCodeFor(f.country);
  const states = statesFor(f.country);
  if (f.state && states.length > 0 && !states.includes(f.state)) e.state = 'Select a state from the list';
  const districts = districtsFor(f.country, f.state);
  if (f.district && districts.length > 0 && !districts.includes(f.district)) e.district = 'Select a district from the list';
  if (m.kycReady && f.pin && !e.pin) {
    if (india ? !/^\d{6}$/.test(f.pin) : !/^[A-Za-z0-9][A-Za-z0-9 -]{1,11}$/.test(f.pin)) e.pin = india ? 'Enter a 6-digit PIN' : 'Enter a valid postal code';
  }
  const mobile = f.mobile.replace(/[\s-]/g, '');
  if (mobile && !e.mobile) {
    const indianMobile = dial === '+91' || (!dial && india);
    if (indianMobile ? !/^[6-9]\d{9}$/.test(mobile) : !/^\d{7,15}$/.test(mobile)) {
      e.mobile = indianMobile ? 'Enter a valid 10-digit mobile' : 'Enter a valid mobile (7–15 digits)';
    }
  }
  if (f.email && !e.email) {
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email';
    else if (f.email.trim().length > 50) e.email = 'At most 50 characters';
  }
  if (f.centreId.trim().length > 30) e.centreId = 'At most 30 characters';
  if (f.affiliationExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(f.affiliationExpiry)) e.affiliationExpiry = 'Enter a valid date';
  if (m.kycReady) {
    if (f.pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(f.pan.toUpperCase())) e.pan = 'Invalid PAN format';
    if (f.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(f.gstin.toUpperCase())) e.gstin = 'Invalid GSTIN format';
    if (f.accountNumber && !/^\d{9,18}$/.test(f.accountNumber.replace(/[\s-]/g, ''))) e.accountNumber = '9–18 digits';
    if (f.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(f.ifsc.toUpperCase())) e.ifsc = 'Invalid IFSC format';
    if (f.idNumber.trim().length > 40) e.idNumber = 'At most 40 characters';
  }
  return e;
}

/** The request body for POST /admin/centres/save (KYC fields only when they can be stored). */
export function toPayload(f: CentreForm, m: FormMode, centreId?: string): Record<string, string> {
  const body: Record<string, string> = centreId ? { id: centreId } : {};
  (Object.keys(API_FIELD) as FormKey[]).forEach((k) => {
    if (!m.kycReady && KYC_KEYS.includes(k)) return;
    const raw = f[k].trim();
    body[API_FIELD[k]] = k === 'pan' || k === 'gstin' || k === 'ifsc' || k === 'centreId' ? raw.toUpperCase() : raw;
  });
  body.country_code = dialCodeFor(f.country);
  return body;
}

/** Server field errors (snake_case) as form errors. */
export function fromApiErrors(data: Record<string, unknown>): FormErrors {
  const raw = asRecord(data.errors) ?? {};
  const byApi = new Map(Object.entries(API_FIELD).map(([k, api]) => [api, k as FormKey]));
  const out: FormErrors = {};
  for (const [api, message] of Object.entries(raw)) {
    const key = api === 'country_code' ? 'mobile' : byApi.get(api);
    if (key && typeof message === 'string' && !out[key]) out[key] = message;
  }
  return out;
}

/** Edit: the form pre-filled from the profile (GET /admin/centres/profile). */
export function formFromProfile(p: CentreProfile): CentreForm {
  const c = p.centre;
  const k = p.kyc;
  return {
    ...EMPTY_FORM,
    centreId: c.code,
    name: c.name,
    registrationDoc: c.registrationDoc,
    affiliationExpiry: c.affiliationExpiry,
    address1: c.address,
    // Legacy centres carry no country name; their states are Indian.
    country: c.country || (c.state && statesFor('India').includes(c.state) ? 'India' : c.country),
    state: c.state,
    district: c.district,
    contactName: c.contactPerson,
    designation: c.designation,
    mobile: c.phone,
    email: c.email,
    ...(k ? {
      legalEntity: k.legalEntity, entityType: k.entityType, city: k.city, pin: k.pin, idNumber: k.idNumber, idDoc: k.idDoc,
      pan: k.pan, panDoc: k.panDoc, gstin: k.gstin, accountName: k.accountName, accountNumber: k.accountNumber,
      ifsc: k.ifsc, bank: k.bank, branch: k.branch,
    } : {}),
  };
}

/** Cascading pickers: changing the country clears state + district; changing the state clears district. */
export function setLocation(f: CentreForm, key: 'country' | 'state' | 'district', value: string): CentreForm {
  if (key === 'country') return value === f.country ? f : { ...f, country: value, state: '', district: '' };
  if (key === 'state') return value === f.state ? f : { ...f, state: value, district: '' };
  return { ...f, district: value };
}

/** The last path segment of an uploaded file URL ("aadhaar.pdf"). */
export function fileLabel(url: string): string {
  const clean = url.split(/[?#]/)[0] ?? '';
  const last = clean.split('/').filter(Boolean).pop() ?? '';
  try { return decodeURIComponent(last); } catch { return last; }
}
