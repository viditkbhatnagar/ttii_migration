import { randomInt } from 'node:crypto';

import type { SubjectRow } from './credential-eligibility-model.js';
import type { DocType, DocumentStatus } from './credential-types.js';

// Credential Manager — identifiers, snapshot, public projection and scan-alert rules (spec §4, §6). Pure.

// ── Numbers and verification IDs ─────────────────────────────────────────────
export const DEFAULT_SERIES_PREFIX: Record<DocType, string> = {
  certificate: 'TTII/CERT',
  marksheet: 'TTII/MARK',
  provisional: 'TTII/PROV',
  transcript: 'TTII/TRANS',
};

export function formatDocumentNo(prefix: string, year: number, next: number, padding: number): string {
  return `${prefix || 'TTII/DOC'}/${year}/${String(next).padStart(Math.min(Math.max(padding, 1), 12), '0')}`;
}

/** Correction number: the base number without any -R<n> suffix, plus -R<previous version>. */
export function correctionDocumentNo(documentNo: string, previousVersion: number): string {
  return `${documentNo.replace(/-R\d+$/, '')}-R${previousVersion}`;
}

/** Unambiguous uppercase alphabet: no 0, O, 1, I (and no L, to be safe on paper). */
export const VERIFICATION_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** TTII-XXXX-XXXX-XXXX (12 random characters). */
export function newVerificationId(random: (max: number) => number = randomInt): string {
  const chars = Array.from({ length: 12 }, () => VERIFICATION_ALPHABET[random(VERIFICATION_ALPHABET.length)] ?? 'A');
  return `TTII-${chars.slice(0, 4).join('')}-${chars.slice(4, 8).join('')}-${chars.slice(8).join('')}`;
}

/** Case-insensitive lookup form: trimmed, uppercased, at most 80 chars; a bare 16-char code gains its dashes. */
export function normaliseVerificationId(raw: string): string {
  const upper = raw.trim().toUpperCase().slice(0, 80);
  const bare = upper.replace(/[\s-]/g, '');
  if (/^TTII[A-Z0-9]{12}$/.test(bare)) return `TTII-${bare.slice(4, 8)}-${bare.slice(8, 12)}-${bare.slice(12)}`;
  return upper;
}

export const publicUrl = (verificationId: string, origin = 'https://learn.teachersindia.in'): string =>
  `${origin.replace(/\/+$/, '')}/v/${encodeURIComponent(verificationId)}`;

/** "••••1101" — the last four characters of the enrolment number. */
export const maskEnrolment = (enrolmentNo: string): string => `••••${enrolmentNo.slice(-4)}`;

// ── Snapshot (immutable) ─────────────────────────────────────────────────────
export interface CredentialSnapshot {
  learner: string;
  printedName: string;
  enrolmentNo: string;
  programme: string;
  batch: string;
  centre: string;
  level: string;
  durationText: string;
  creditsTotal: number | null;
  cgpa: string;
  grade: string;
  result: string;
  examSession: string;
  completionDate: string;
  subjects: SubjectRow[];
  gradingName: string;
  ruleVersion: number | null;
  template: { id: number | null; name: string; version: number | null; docType: string };
  signatoryIds: number[];
  issueDate: string;
  generatedAt: string;
}

export function parseSnapshot(raw: string): CredentialSnapshot | null {
  try {
    const v = JSON.parse(raw) as CredentialSnapshot;
    return v && typeof v === 'object' ? v : null;
  } catch { return null; }
}

// ── Public projection (spec §1.8, §4.3) ──────────────────────────────────────
export type PublicStatus = DocumentStatus | 'not_found';

export interface PublicResult {
  verificationId: string;
  status: PublicStatus;
  learner?: string;
  programme?: string;
  /** Revoked: the revocation date (DD-MM-YYYY source YYYY-MM-DD). */
  revokedAt?: string;
  /** Superseded: the newer version's verification ID. */
  replacedBy?: string;
  enrolment?: string;
  docType?: string;
  docTypeLabel?: string;
  documentNo?: string;
  issueDate?: string;
  credits?: number | null;
  cgpa?: string;
  grade?: string;
  examSession?: string;
  subjects?: SubjectRow[];
  result?: string;
  /** The matching Certificate/Marksheet of the same enrolment (valid only). */
  related?: { verificationId: string; docType: string; docTypeLabel: string };
  issuedBy?: string;
}

export interface PublicDocInput {
  verificationId: string;
  status: string;
  docType: string;
  documentNo: string;
  issueDate: string;
  revokedAt: string;
  replacedByVerificationId: string;
  snapshot: CredentialSnapshot;
}

const DOC_LABELS: Record<string, string> = { certificate: 'Certificate', marksheet: 'Marksheet', provisional: 'Provisional Certificate', transcript: 'Consolidated Transcript' };

/**
 * Only what may be public. Never phone, email, DOB, address, the full enrolment number,
 * the issuing user, reasons or the raw snapshot. Revoked pages carry no marks.
 */
export function publicProjection(doc: PublicDocInput): PublicResult {
  const base = { verificationId: doc.verificationId, learner: doc.snapshot.printedName || doc.snapshot.learner, programme: doc.snapshot.programme };
  if (doc.status === 'revoked') return { ...base, status: 'revoked', revokedAt: doc.revokedAt };
  if (doc.status === 'superseded') return { ...base, status: 'superseded', ...(doc.replacedByVerificationId ? { replacedBy: doc.replacedByVerificationId } : {}) };
  const credits = doc.snapshot.subjects.length > 0 && doc.snapshot.subjects.every((s) => s.credits !== null)
    ? doc.snapshot.subjects.reduce((sum, s) => sum + (s.credits ?? 0), 0)
    : doc.snapshot.creditsTotal;
  return {
    ...base,
    status: 'valid',
    enrolment: maskEnrolment(doc.snapshot.enrolmentNo),
    docType: doc.docType,
    docTypeLabel: DOC_LABELS[doc.docType] ?? doc.docType,
    documentNo: doc.documentNo,
    issueDate: doc.issueDate,
    credits,
    cgpa: doc.snapshot.cgpa,
    grade: doc.snapshot.grade,
    examSession: doc.snapshot.examSession,
    result: doc.snapshot.result,
    issuedBy: 'TTII',
    ...(doc.docType === 'marksheet' ? { subjects: doc.snapshot.subjects } : {}),
  };
}

// ── Scans and alerts (spec §6.1-6.2) ─────────────────────────────────────────
export type ScanStatus = DocumentStatus | 'not_found';

export function deviceClass(userAgent: string): string {
  if (!userAgent.trim()) return 'Unknown';
  if (/android/i.test(userAgent)) return 'Android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'iPhone / iPad';
  return 'Desktop';
}

export interface ScanLite {
  id: number;
  at: Date;
  documentId: number | null;
  status: ScanStatus;
  country: string | null;
  ip: string | null;
}

export interface AlertCandidate {
  key: string;
  type: 'revoked_scan' | 'superseded_scan' | 'multiple_countries' | 'not_found_attempts';
  details: string;
}

export const NOT_FOUND_ALERT_THRESHOLD = 20;
export const COUNTRY_ALERT_MIN = 3;
const WEEK_MS = 7 * 86_400_000;
const utcDay = (d: Date): string => d.toISOString().slice(0, 10);

/** Alerts raised by `scan`, given every scan seen so far (the new one included). New alerts dedupe on `key`. */
export function alertCandidates(scan: ScanLite, history: readonly ScanLite[], verificationId: string): AlertCandidate[] {
  const out: AlertCandidate[] = [];
  if (scan.status === 'revoked' || scan.status === 'superseded') {
    out.push({ key: `status:${scan.id}`, type: scan.status === 'revoked' ? 'revoked_scan' : 'superseded_scan', details: `${verificationId} showed ${scan.status === 'revoked' ? 'Revoked' : 'Superseded'}.` });
  }
  if (scan.documentId !== null) {
    const countries = [...new Set(history
      .filter((s) => s.documentId === scan.documentId && s.at.getTime() <= scan.at.getTime() && s.at.getTime() >= scan.at.getTime() - WEEK_MS)
      .map((s) => s.country ?? 'Unknown')
      .filter((c) => c !== 'Unknown'))];
    if (countries.length >= COUNTRY_ALERT_MIN) {
      out.push({ key: `countries:${scan.documentId}:${utcDay(scan.at)}`, type: 'multiple_countries', details: `${verificationId}: ${countries.length} countries within 7 days (${countries.join(', ')}).` });
    }
  }
  if (scan.status === 'not_found' && scan.ip) {
    const day = utcDay(scan.at);
    const count = history.filter((s) => s.status === 'not_found' && s.ip === scan.ip && utcDay(s.at) === day && s.at.getTime() <= scan.at.getTime()).length;
    if (count > NOT_FOUND_ALERT_THRESHOLD) {
      out.push({ key: `notfound:${scan.ip}:${day}`, type: 'not_found_attempts', details: `${count} not-found attempts from the same IP in one UTC day.` });
    }
  }
  return out;
}

// ── Version actions (spec §2.12, §4.2) ───────────────────────────────────────
export type VersionAction = 'duplicate' | 'print' | 'correction' | 'revoke' | 'restore' | 'resend';

/** The refusal for an action on a version in `status`, or null when allowed. */
export function actionRefusal(action: VersionAction, status: string, reason: string, extra: { correctedName?: string } = {}): string | null {
  if (action !== 'print' && action !== 'resend' && !reason.trim()) return 'A reason is required.';
  if (action === 'correction' && !(extra.correctedName ?? '').trim()) return 'Enter the corrected learner name.';
  if (action === 'restore') return status === 'revoked' ? null : 'Only a revoked document can be restored.';
  if (status === 'superseded') return 'This version has been replaced; use the newer version.';
  if (status !== 'valid') return 'Only a valid document can be used for this action.';
  return null;
}

/** Document types that can be issued today (not the consolidated transcript). */
export function isIssuableType(t: string): t is Exclude<DocType, 'transcript'> {
  return t === 'certificate' || t === 'marksheet' || t === 'provisional';
}
