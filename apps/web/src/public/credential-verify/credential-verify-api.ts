// Public credential verification calls (/api/credentials/public/verify).
// No login. Refusals come back as HTTP 200 with status 0 and a message.

const API_BASE = '/api';
const MANUAL_LOOKUP_KEY = 'credential-manual-lookup';

export type VerifyStatus = 'valid' | 'revoked' | 'superseded' | 'not_found';

export interface VerifySubject {
  code: string;
  title: string;
  credits: number | null;
  internal: number | null;
  theory: number | null;
  practical: number | null;
  total: number | null;
  points: number | null;
  grade: string | null;
  result: string | null;
}

export interface VerifyResult {
  verificationId: string;
  status: VerifyStatus;
  learner: string;
  programme: string;
  revokedAt: string | null;
  replacedBy: string | null;
  enrolment: string;
  docTypeLabel: string;
  documentNo: string;
  issueDate: string | null;
  credits: number | null;
  cgpa: number | null;
  grade: string | null;
  examSession: string | null;
  subjects: VerifySubject[] | null;
  result: string | null;
  related: { verificationId: string; docTypeLabel: string } | null;
  issuedBy: string;
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
function strOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}
function numOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toSubject(raw: unknown): VerifySubject {
  const r = rec(raw);
  return {
    code: str(r.code),
    title: str(r.title),
    credits: numOrNull(r.credits),
    internal: numOrNull(r.internal),
    theory: numOrNull(r.theory),
    practical: numOrNull(r.practical),
    total: numOrNull(r.total),
    points: numOrNull(r.points),
    grade: strOrNull(r.grade),
    result: strOrNull(r.result),
  };
}

function toResult(data: Record<string, unknown>): VerifyResult {
  const status = data.status;
  const related = rec(data.related);
  return {
    verificationId: str(data.verificationId),
    status: status === 'valid' || status === 'revoked' || status === 'superseded' ? status : 'not_found',
    learner: str(data.learner),
    programme: str(data.programme),
    revokedAt: strOrNull(data.revokedAt),
    replacedBy: strOrNull(data.replacedBy),
    enrolment: str(data.enrolment),
    docTypeLabel: str(data.docTypeLabel),
    documentNo: str(data.documentNo),
    issueDate: strOrNull(data.issueDate),
    credits: numOrNull(data.credits),
    cgpa: numOrNull(data.cgpa),
    grade: strOrNull(data.grade),
    examSession: strOrNull(data.examSession),
    subjects: Array.isArray(data.subjects) ? data.subjects.map(toSubject) : null,
    result: strOrNull(data.result),
    related: str(related.verificationId) ? { verificationId: str(related.verificationId), docTypeLabel: str(related.docTypeLabel) } : null,
    issuedBy: str(data.issuedBy) || 'TTII',
  };
}

export async function verifyCredential(id: string, method: 'qr' | 'manual', signal?: AbortSignal): Promise<VerifyResult> {
  const url = `${API_BASE}/credentials/public/verify?id=${encodeURIComponent(id)}&method=${method}`;
  const res = await fetch(url, signal ? { signal } : {});
  if (res.status === 429) throw new Error('Too many lookups. Please wait a minute and try again.');
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) throw new Error(`Something went wrong (${res.status}). Please try again.`);
  const body = rec(await res.json());
  if (body.status !== 1) throw new Error(str(body.message) || 'The credential could not be verified.');
  return toResult(rec(body.data));
}

/** True once per manual submit: the /v/<id> mount that follows must not record a second scan. */
export function markManualLookup(id: string): void {
  try {
    sessionStorage.setItem(MANUAL_LOOKUP_KEY, id.toUpperCase());
  } catch {
    // storage unavailable: the lookup is simply recorded as QR
  }
}

export function consumeManualLookup(id: string): boolean {
  try {
    const manual = sessionStorage.getItem(MANUAL_LOOKUP_KEY) === id.toUpperCase();
    sessionStorage.removeItem(MANUAL_LOOKUP_KEY);
    return manual;
  } catch {
    return false;
  }
}

/** DD-MM-YYYY from a YYYY-MM-DD string; empty string when absent. */
export function dmy(value: string | null): string {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

export function utcStamp(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(now.getUTCDate())}-${p(now.getUTCMonth() + 1)}-${now.getUTCFullYear()}, ${p(now.getUTCHours())}:${p(now.getUTCMinutes())} UTC`;
}
