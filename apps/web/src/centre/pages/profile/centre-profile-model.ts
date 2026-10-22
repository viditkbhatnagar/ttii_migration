// View model of the centre's own Profile page (Naji 2026-10-22): parses
// /centre/portal/profile, masks sensitive numbers, and decides the
// affiliation countdown, document rows and the change-password checks.
import { asRecord, num, rows, str } from '../../layout/centre-shell-model.js';

export interface ProfileCentre {
  code: string; name: string; active: boolean; address: string; district: string; state: string; country: string;
  contactPerson: string; designation: string; phone: string; email: string; registrationDate: string;
}
export interface ProfileKyc {
  legalEntityName: string; entityType: string; city: string; pincode: string; gstin: string; pan: string; idNumber: string;
  bankAccountName: string; bankAccountNumber: string; bankIfsc: string; bankName: string; bankBranch: string;
}
export type AffiliationStatus = 'Active' | 'Pending Renewal' | 'Expired';
export interface ProfileAgreement {
  id: number; agreementNo: string; effectiveDate: string; expiryDate: string; termYears: number; signedOn: string;
  fileUrl: string; fileName: string; status: AffiliationStatus;
}
export interface ProfileCertificate { id: number; certificateNo: string; validFrom: string; validTo: string; fileUrl: string; status: string }
export interface ProfileDocument {
  key: string; checklist: string; type: string; name: string; url: string; date: string; onFile: boolean; uploadable: boolean;
}
export interface ProfileData {
  kycReady: boolean;
  today: string;
  centre: ProfileCentre;
  kyc: ProfileKyc | null;
  affiliation: { expiry: string; daysLeft: number | null; agreements: ProfileAgreement[]; certificates: ProfileCertificate[] };
  documents: ProfileDocument[];
}

const AGREEMENT_STATUSES: readonly AffiliationStatus[] = ['Active', 'Pending Renewal', 'Expired'];

export function toProfileData(raw: unknown): ProfileData {
  const d = asRecord(raw);
  const c = asRecord(d.centre);
  const k = asRecord(d.kyc);
  const a = asRecord(d.affiliation);
  return {
    kycReady: d.kycReady === true,
    today: str(d.today),
    centre: {
      code: str(c.code), name: str(c.name), active: c.status !== 'inactive', address: str(c.address), district: str(c.district),
      state: str(c.state), country: str(c.country), contactPerson: str(c.contactPerson), designation: str(c.designation),
      phone: [str(c.countryCode), str(c.phone)].filter(Boolean).join(' '), email: str(c.email), registrationDate: str(c.registrationDate),
    },
    kyc: Object.keys(k).length === 0 ? null : {
      legalEntityName: str(k.legalEntityName), entityType: str(k.entityType), city: str(k.city), pincode: str(k.pincode),
      gstin: str(k.gstin), pan: str(k.pan), idNumber: str(k.idNumber), bankAccountName: str(k.bankAccountName),
      bankAccountNumber: str(k.bankAccountNumber), bankIfsc: str(k.bankIfsc), bankName: str(k.bankName), bankBranch: str(k.bankBranch),
    },
    affiliation: {
      expiry: str(a.expiry),
      daysLeft: typeof a.daysLeft === 'number' && Number.isFinite(a.daysLeft) ? a.daysLeft : null,
      agreements: rows(a.agreements).map((g) => ({
        id: num(g.id), agreementNo: str(g.agreementNo), effectiveDate: str(g.effectiveDate), expiryDate: str(g.expiryDate),
        termYears: num(g.termYears), signedOn: str(g.signedOn), fileUrl: str(g.fileUrl), fileName: str(g.fileName),
        status: AGREEMENT_STATUSES.find((s) => s === g.status) ?? 'Active',
      })),
      certificates: rows(a.certificates).map((g) => ({
        id: num(g.id), certificateNo: str(g.certificateNo), validFrom: str(g.validFrom), validTo: str(g.validTo), fileUrl: str(g.fileUrl), status: str(g.status),
      })),
    },
    documents: rows(d.documents).map((r) => ({
      key: str(r.key), checklist: str(r.checklist), type: str(r.type), name: str(r.name), url: str(r.url), date: str(r.date),
      onFile: r.onFile === true, uploadable: r.uploadable === true,
    })),
  };
}

/** "•••• •••• 4321": only the last four characters of a sensitive number; '' stays ''. */
export function maskNumber(value: string): string {
  const v = value.replace(/\s+/g, '');
  if (!v) return '';
  if (v.length <= 4) return '•'.repeat(v.length);
  return `${'•'.repeat(v.length - 4).replace(/(.{4})(?=.)/g, '$1 ')} ${v.slice(-4)}`.trim();
}

export interface Countdown { text: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }

/** "160 days left" / "Expired 12 days ago" for an agreement or certificate end day. */
export function countdown(daysLeft: number | null): Countdown {
  if (daysLeft === null) return { text: 'No expiry recorded', tone: 'neutral' };
  if (daysLeft < 0) {
    const ago = Math.abs(daysLeft);
    return { text: `Expired ${ago} day${ago === 1 ? '' : 's'} ago`, tone: 'danger' };
  }
  if (daysLeft === 0) return { text: 'Expires today', tone: 'warning' };
  return { text: `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`, tone: daysLeft <= 60 ? 'warning' : 'success' };
}

function ymdToDays(ymd: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return m ? Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86_400_000) : null;
}

/** Whole days from `fromYmd` to `toYmd` (calendar days, no timezone maths); null when either is unreadable. */
export function daysBetweenYmd(fromYmd: string, toYmd: string): number | null {
  const a = ymdToDays(fromYmd);
  const b = ymdToDays(toYmd);
  return a === null || b === null ? null : b - a;
}

/** How much of the agreement period has passed (0-100); null without usable dates. */
export function periodUsedPct(startYmd: string, endYmd: string, todayYmd: string): number | null {
  const total = daysBetweenYmd(startYmd, endYmd);
  const used = daysBetweenYmd(startYmd, todayYmd);
  if (total === null || used === null || total <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((used / total) * 100)));
}

/** The agreement the Affiliation tab leads with: the newest (the server sends them newest first). */
export function currentAgreement(p: ProfileData): ProfileAgreement | null {
  return p.affiliation.agreements[0] ?? null;
}

export const PASSWORD_MIN_LENGTH = 8;

/** Why a new password cannot be saved ('' when it can). */
export function passwordProblem(password: string, confirm: string): string {
  if (!password) return 'Enter a new password.';
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (password !== confirm) return 'The two passwords do not match.';
  return '';
}

/** Files the document upload accepts (mirrors /centre/upload). */
export const DOC_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.gif';
export const DOC_MAX_BYTES = 10 * 1024 * 1024;

export function fileProblem(file: { name: string; size: number }): string {
  if (!/\.(pdf|png|jpe?g|webp|gif)$/i.test(file.name)) return 'Upload a PDF or an image (PNG, JPG, WEBP, GIF).';
  if (file.size > DOC_MAX_BYTES) return 'The file is larger than 10 MB.';
  return '';
}

/** The checklist type a "missing" row files its upload under. */
export const CHECKLIST_DOC_TYPE: Readonly<Record<string, string>> = {
  registration: 'Registration Certificate', id: 'Aadhaar / Passport', pan: 'PAN Card', gst: 'GST Registration', bank: 'Bank Proof',
};

export function onFileCount(docs: readonly ProfileDocument[]): { onFile: number; total: number } {
  const checklist = docs.filter((d) => d.checklist !== '');
  return { onFile: checklist.filter((d) => d.onFile).length, total: checklist.length };
}
