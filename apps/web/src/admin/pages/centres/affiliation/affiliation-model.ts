import type { AgreementStatus, CertificateStatus } from '@ttii/shared-types';

import type { Tone } from '../../../shared/components/ui-tones.js';

// Centres v2 — Affiliation & Agreements view model (Naji 2026-10-22,
// AffiliationAgreementsModule). Statuses come from the server, DERIVED from
// the dates (Active / Pending Renewal within 60 days / Expired; Valid /
// Expired / Revoked) — the prototype stored them and could show an expired
// agreement as Active.

export type SortDir = 'asc' | 'desc';

function str(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}
function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(str(value));
  return Number.isFinite(n) ? n : 0;
}
function recs(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map((v) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})) : [];
}

interface CentreRef {
  centreName: string;
  centreCode: string;
  /** Still in Centre Onboarding (no centre yet): the lead's name and its reserved code. */
  inOnboarding: boolean;
  onboardingId: string;
}

export interface AgreementRow extends CentreRef {
  id: string;
  agreementNo: string;
  effectiveDate: string;
  expiryDate: string;
  termYears: number;
  status: AgreementStatus;
  fileUrl: string;
  fileName: string;
  feeAmount: number;
  feePaid: boolean;
  feePaidOn: string;
}

export interface CertificateRow extends CentreRef {
  id: string;
  certificateNo: string;
  validFrom: string;
  validTo: string;
  status: CertificateStatus;
  fileUrl: string;
  agreementNo: string;
}

export interface AffiliationData {
  ready: boolean;
  message: string;
  today: string;
  agreements: AgreementRow[];
  certificates: CertificateRow[];
}

function centreRef(r: Record<string, unknown>): CentreRef {
  return {
    centreName: str(r.centreName),
    centreCode: str(r.centreCode),
    inOnboarding: r.inOnboarding === true,
    onboardingId: r.onboardingId === null || r.onboardingId === undefined ? '' : str(r.onboardingId),
  };
}

export function toAffiliation(raw: Record<string, unknown>): AffiliationData {
  return {
    ready: raw.ready !== false,
    message: str(raw.message),
    today: str(raw.today),
    agreements: recs(raw.agreements).map((a) => {
      const status = str(a.status);
      return {
        ...centreRef(a),
        id: str(a.id),
        agreementNo: str(a.agreementNo),
        effectiveDate: str(a.effectiveDate),
        expiryDate: str(a.expiryDate),
        termYears: num(a.termYears),
        status: status === 'Expired' || status === 'Pending Renewal' ? status : 'Active',
        fileUrl: str(a.fileUrl),
        fileName: str(a.fileName),
        feeAmount: num(a.feeAmount),
        feePaid: a.feePaid === true,
        feePaidOn: str(a.feePaidOn),
      };
    }),
    certificates: recs(raw.certificates).map((c) => {
      const status = str(c.status);
      return {
        ...centreRef(c),
        id: str(c.id),
        certificateNo: str(c.certificateNo),
        validFrom: str(c.validFrom),
        validTo: str(c.validTo),
        status: status === 'Expired' || status === 'Revoked' ? status : 'Valid',
        fileUrl: str(c.fileUrl),
        agreementNo: str(c.agreementNo),
      };
    }),
  };
}

export const AGREEMENT_PILLS = ['All', 'Active', 'Pending Renewal', 'Expired'] as const;
export const CERTIFICATE_PILLS = ['All', 'Valid', 'Expired', 'Revoked'] as const;

/** Counts per pill over ALL rows. */
export function statusCounts<S extends string>(rows: Array<{ status: string }>, pills: readonly S[]): Record<S, number> {
  return Object.fromEntries(pills.map((p) => [p, p === 'All' ? rows.length : rows.filter((r) => r.status === p).length])) as Record<S, number>;
}

export function statusTone(status: AgreementStatus | CertificateStatus): Tone {
  if (status === 'Active' || status === 'Valid') return 'emerald';
  if (status === 'Pending Renewal') return 'amber';
  if (status === 'Expired') return 'rose';
  return 'slate';
}

export function termLabel(years: number): string {
  return `${years} Year${years === 1 ? '' : 's'}`;
}

export interface AffiliationFilters {
  status: string;
  search: string;
  centre: string;
}

export const DEFAULT_AFFILIATION_FILTERS: AffiliationFilters = { status: 'All', search: '', centre: '' };

function filterBy<T extends CentreRef & { status: string }>(rows: T[], no: (r: T) => string, f: AffiliationFilters): T[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) =>
    (f.status === 'All' || r.status === f.status)
    && (!f.centre || r.centreName === f.centre)
    && (!q || `${no(r)} ${r.centreName} ${r.centreCode}`.toLowerCase().includes(q)));
}

export function filterAgreements(rows: AgreementRow[], f: AffiliationFilters): AgreementRow[] {
  return filterBy(rows, (r) => r.agreementNo, f);
}

export function filterCertificates(rows: CertificateRow[], f: AffiliationFilters): CertificateRow[] {
  return filterBy(rows, (r) => r.certificateNo, f);
}

export function centreOptions(rows: CentreRef[]): Array<{ value: string; label: string }> {
  return [...new Set(rows.map((r) => r.centreName).filter(Boolean))].sort((a, b) => a.localeCompare(b)).map((c) => ({ value: c, label: c }));
}

export type AgreementSortKey = 'no' | 'centre' | 'effective' | 'expiry' | 'term' | 'status';
export type CertificateSortKey = 'no' | 'centre' | 'from' | 'to' | 'status';

function cmp(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function sortAgreements(rows: AgreementRow[], key: AgreementSortKey, dir: SortDir): AgreementRow[] {
  const pick = (r: AgreementRow): string | number => ({
    no: r.agreementNo, centre: r.centreName, effective: r.effectiveDate, expiry: r.expiryDate, term: r.termYears, status: r.status,
  })[key];
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * cmp(pick(a), pick(b)) || cmp(a.agreementNo, b.agreementNo));
}

export function sortCertificates(rows: CertificateRow[], key: CertificateSortKey, dir: SortDir): CertificateRow[] {
  const pick = (r: CertificateRow): string => ({ no: r.certificateNo, centre: r.centreName, from: r.validFrom, to: r.validTo, status: r.status })[key];
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * cmp(pick(a), pick(b)) || cmp(a.certificateNo, b.certificateNo));
}
