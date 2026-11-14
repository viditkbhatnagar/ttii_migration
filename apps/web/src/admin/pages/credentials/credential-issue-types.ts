// Response contracts for the Credential Manager Ready + Issued pages. They mirror
// apps/api/src/operations/credential-eligibility-service.ts, credential-issued-read-service.ts
// and credential-issue-service.ts; keep in step with those.

export type EligibilityStatus = 'Ready' | 'On Hold' | 'Not Eligible' | 'In Progress';
export type DocTypeKey = 'certificate' | 'marksheet' | 'provisional';
export type IssuedStatus = 'valid' | 'revoked' | 'superseded';

/** What an API method returns: refusals (HTTP 200, status 0) come back as ok=false, never thrown. */
export interface CredResult<T> {
  ok: boolean;
  message: string;
  data: T | null;
  notSetUp: boolean;
}

export interface ReadyRow {
  enrolId: number;
  learner: string;
  enrolmentNo: string;
  course: string;
  courseId: number;
  offeringId: number;
  batch: string;
  centre: string;
  centreId: number | null;
  completionDate: string;
  examSession: string;
  status: EligibilityStatus;
  percent: number;
  failure: string;
  cgpa: string;
  grade: string;
  daysWaiting: number;
  nameConfirmed: boolean;
  printedName: string;
  address: string;
  holdReason: string;
  heldSince: string;
  hasOverride: boolean;
  issuedTypes: string[];
}

export interface ReadyList {
  rows: ReadyRow[];
  counts: Record<EligibilityStatus, number>;
  readyDays: number;
  holdReasons: string[];
}

export interface Criterion {
  id: string;
  label: string;
  required: string;
  actual: string;
  met: boolean;
  mandatory: boolean;
  source: string;
}

export interface SubjectRow {
  code: string;
  title: string;
  credits: number | null;
  internal: number | null;
  theory: number | null;
  practical: number | null;
  total: number;
  points: number;
  grade: string;
  result: 'Pass' | 'Fail';
}

export interface EligibilityDetail {
  row: ReadyRow;
  ruleVersion: number | null;
  criteria: Criterion[];
  holds: Array<{ id: number; reason: string; remarks: string; placedBy: string; placedAt: string; releasedBy: string; releasedAt: string }>;
  history: Array<{ id: number; action: string; reason: string; user: string; at: string }>;
  subjects: SubjectRow[];
}

export interface IssuedDoc { id: number; enrolId: number; docType: string; documentNo: string; verificationId: string; learner: string }
export interface IssueResult { issued: IssuedDoc[]; pdfFailures: number; emailsSent: number }

export interface IssuedRow {
  id: number;
  documentNo: string;
  verificationId: string;
  docType: string;
  docTypeLabel: string;
  version: number;
  learner: string;
  enrolmentNo: string;
  enrolId: number;
  course: string;
  batch: string;
  centre: string;
  centreId: number | null;
  offeringId: number | null;
  issueDate: string;
  status: IssuedStatus;
  issuedBy: string;
  deliveryStatus: string;
  scanCount: number;
  lastScanned: string;
  replacesId: number | null;
  replacedById: number | null;
  hasPdf: boolean;
}

export interface IssuedDetail {
  row: IssuedRow;
  versions: IssuedRow[];
  linked: IssuedRow[];
  events: Array<{ id: number; action: string; copyType: string; reason: string; user: string; at: string; before: string; after: string }>;
  scans: Array<{ id: number; at: string; country: string; city: string; device: string; method: string; status: string }>;
  deliveryHistory: Array<{ id: number; at: string; user: string; action: string; before: string; after: string; reason: string }>;
  fields: Record<string, string>;
  publicUrl: string;
}

export interface CredentialPermissions {
  access: boolean;
  revoke: boolean;
  override: boolean;
  settings: boolean;
  reports: boolean;
}
