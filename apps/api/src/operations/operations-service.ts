import { Prisma } from '@prisma/client';
import type { PrismaClient, $Enums } from '@prisma/client';

import { hashPassword } from '../auth/password.js';
import { getPrismaClient } from '../data/prisma-client.js';
import { toLegacyFileUrl } from '../data/legacy-asset-url.js';
import { env } from '../env.js';

type SqlRow = Record<string, unknown>;

type ReportRange = {
  fromDate: string;
  toDate: string;
};

function toDbNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'bigint') {
    return Number(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function toInteger(value: unknown): number {
  return Math.trunc(toDbNumber(value));
}

function toStringValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return '';
}

function toNullableString(value: unknown): string | null {
  const normalized = toStringValue(value).trim();
  return normalized === '' ? null : normalized;
}

function toDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDate(value: string | undefined, fallback: Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }

  return toDateOnly(fallback);
}

function normalizeReportRange(fromDate?: string, toDate?: string): ReportRange {
  const today = new Date();
  const from = normalizeDate(fromDate, today);
  const to = normalizeDate(toDate, today);

  if (from <= to) {
    return { fromDate: from, toDate: to };
  }

  return { fromDate: to, toDate: from };
}

function toCsvCell(value: unknown): string {
  const raw = toStringValue(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }

  return raw;
}

function rowsToCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const lines: string[] = [headers.join(',')];

  for (const row of rows) {
    lines.push(headers.map((header) => toCsvCell(row[header])).join(','));
  }

  return `${lines.join('\n')}\n`;
}

/**
 * Map a UI status verb onto the stored `applications_status` enum.
 *
 * UAT 2026-07-27 — the Approve button posts `status: 'approved'`, but the enum
 * only has pending | converted | rejected (schema.prisma:2506). Prisma threw
 * PrismaClientValidationError on every such call, so "Mark Approved" returned a
 * 500 and had in fact NEVER worked. 'approved' is the UI's word for the state
 * the enum calls 'converted' (adminApproveApplication already stores
 * status:'converted' when it enrols the student), so accept it as an alias and
 * reject anything unrecognised with a readable message rather than a raw crash.
 */
function normaliseApplicationStatus(status: string): $Enums.applications_status | null {
  switch (status.trim().toLowerCase()) {
    case 'pending':
      return 'pending';
    case 'approved':
    case 'converted':
      return 'converted';
    case 'rejected':
      return 'rejected';
    default:
      return null;
  }
}

/**
 * Stages a rejected application may be reopened into. Excludes 'rejected'
 * itself (a no-op) and anything not on the counsellor pipeline, so a caller
 * cannot park an application in an arbitrary stage via the reopen endpoint.
 */
const REOPENABLE_STAGES = new Set([
  'lead',
  'payment_pending',
  'paid',
  'form_pending',
  'form_submitted',
  'approval_waiting',
  'enrolled',
]);

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// enrol.enrollment_date is a free-text String (legacy: 'YYYY-MM-DD',
// 'DD-MM-YYYY', ISO datetime, or junk); enrol.created_at is a DateTime.
// Return an ISO date (YYYY-MM-DD) for the My Enrollments table, '' when
// neither is usable. Parse date-only strings into LOCAL parts — never feed a
// bare 'YYYY-MM-DD' to `new Date(str)` (parsed as UTC midnight → IST day-shift).
function isoDateFromEnrolment(enrollmentDate: string | null | undefined, createdAt: Date | null | undefined): string {
  const raw = (enrollmentDate ?? '').trim();
  if (raw) {
    // YYYY-MM-DD (optionally with a time component we ignore for the day).
    const ymd = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (ymd && ymd[1] && ymd[2] && ymd[3]) {
      const [, y, m, d] = ymd;
      if (y !== '0000' && m !== '00' && d !== '00') {
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
    // DD-MM-YYYY or DD/MM/YYYY (legacy PHP).
    const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy && dmy[1] && dmy[2] && dmy[3]) {
      const [, d, m, y] = dmy;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  if (createdAt instanceof Date && !Number.isNaN(createdAt.getTime())) {
    const y = createdAt.getFullYear();
    const m = String(createdAt.getMonth() + 1).padStart(2, '0');
    const d = String(createdAt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

// Derive a per-student fee_status label from student_payments rows.
// Rule (per student, across all their instalment rows):
//   - no rows at all                          → 'Pending'
//   - every row is paid                       → 'Paid'
//   - at least one paid but not all           → 'Partial'
//   - none paid AND some past due_date        → 'Overdue'
//   - none paid AND nothing past due          → 'Pending'
// A row counts as paid when status='Paid' OR it carries a non-null paid_date
// (legacy zero-dates already NULLIF'd to NULL by the caller).
function deriveFeeStatusByUser(
  rows: Array<{ user_id: number; status: string | null; due_date: Date | null; paid_date: Date | null }>,
): Map<number, string> {
  type Acc = { total: number; paid: number; overdueUnpaid: number };
  const acc = new Map<number, Acc>();
  const now = new Date();
  for (const r of rows) {
    if (r.user_id === null || r.user_id === undefined) continue;
    const a = acc.get(r.user_id) ?? { total: 0, paid: 0, overdueUnpaid: 0 };
    a.total += 1;
    const isPaid = (r.status ?? '').toLowerCase() === 'paid' || r.paid_date !== null;
    if (isPaid) {
      a.paid += 1;
    } else {
      // The MariaDB driver may hand back $queryRaw DATE columns as strings (not
      // Date) — `instanceof Date` alone would silently never flag Overdue. Coerce
      // (same defensive pattern used elsewhere for due_date). Day-level precision
      // is fine for a past/future check.
      const rawDue = r.due_date as unknown;
      const due = rawDue instanceof Date ? rawDue : (rawDue ? new Date(rawDue as string) : null);
      if (due && !Number.isNaN(due.getTime()) && due.getTime() < now.getTime()) {
        a.overdueUnpaid += 1;
      }
    }
    acc.set(r.user_id, a);
  }
  const out = new Map<number, string>();
  for (const [userId, a] of acc) {
    let label: string;
    if (a.total === 0 || a.paid === 0) {
      label = a.overdueUnpaid > 0 ? 'Overdue' : 'Pending';
    } else if (a.paid >= a.total) {
      label = 'Paid';
    } else {
      label = 'Partial';
    }
    out.set(userId, label);
  }
  return out;
}

// Counsellor target type ⇄ int (the counsellor_target.type column is an Int).
// The Add Target form sends a label ('Applications' | 'Enrolments' | 'Revenue').
function targetTypeToInt(label: string): number {
  const s = (label ?? '').trim().toLowerCase();
  if (s.startsWith('enrol')) return 2; // enrolment / enrollment
  if (s.startsWith('rev')) return 3; // revenue
  if (s.startsWith('point')) return 4; // point / points
  return 1; // applications (default)
}

function targetTypeLabel(type: number | null | undefined): string {
  return type === 4 ? 'Points' : type === 2 ? 'Enrolments' : type === 3 ? 'Revenue' : 'Applications';
}

// Enrolment statuses that mean the seat is no longer active (e.g. the course
// fee was refunded / the enrolment cancelled) → its package points drop off the
// counsellor's Points target (Naji 2026-06-23: "if course fee is refunded, that
// point will be removed").
const INACTIVE_ENROLLMENT_STATUSES = new Set([
  'refunded', 'refund', 'cancelled', 'canceled', 'inactive', 'dropped', 'dropout', 'withdrawn',
]);

type CounsellorTargetApp = {
  created_at: Date | null;
  converted_at: Date | null;
  is_converted: number | null;
  stage: string | null;
  offering_id: number | null;
  certificate_combination_id: number | null;
  enrollment_status: string | null;
};

function isCounsellorEnrolment(a: { is_converted: number | null; stage: string | null }): boolean {
  return a.stage === 'enrolled' || a.is_converted === 1;
}

function isActiveCounsellorEnrolment(a: CounsellorTargetApp): boolean {
  return isCounsellorEnrolment(a)
    && !INACTIVE_ENROLLMENT_STATUSES.has((a.enrollment_status ?? '').trim().toLowerCase());
}

// Key into the offering+combination → associated-point map.
function packagePointKey(offeringId: number | null, combinationId: number | null): string {
  return `${offeringId ?? ''}:${combinationId ?? ''}`;
}

/**
 * "Achieved" for one counsellor target, computed from that counsellor's own
 * applications (already filtered to the counsellor):
 *   - Points (type 4): sum of the associated points of the packages the
 *     counsellor enrolled students into, dated by ENROLMENT date (converted_at,
 *     falling back to created_at for legacy rows), excluding refunded/cancelled
 *     enrolments.
 *   - Enrolments (type 2): count of enrolments in the window.
 *   - Applications / Revenue / default: count of applications in the window.
 */
function computeCounsellorTargetAchieved(
  target: { type: number | null; from_date: Date | null; to_date: Date | null },
  apps: CounsellorTargetApp[],
  packagePoints: Map<string, number>,
): number {
  const from = target.from_date;
  // to_date is a date-only (@db.Date) value Prisma reads as UTC midnight; take
  // the END of that day in UTC so the window is server-timezone independent
  // (setHours() would shift the boundary on a non-UTC host).
  const toEnd = target.to_date
    ? new Date(Date.UTC(
        target.to_date.getUTCFullYear(),
        target.to_date.getUTCMonth(),
        target.to_date.getUTCDate(),
        23, 59, 59, 999,
      ))
    : null;
  const inWindow = (d: Date | null): boolean => d != null && from != null && toEnd != null && d >= from && d <= toEnd;
  if (target.type === 4) {
    return apps
      .filter((a) => isActiveCounsellorEnrolment(a) && inWindow(a.converted_at ?? a.created_at))
      .reduce((sum, a) => sum + (packagePoints.get(packagePointKey(a.offering_id, a.certificate_combination_id)) ?? 0), 0);
  }
  if (target.type === 2) {
    return apps.filter((a) => isCounsellorEnrolment(a) && inWindow(a.created_at)).length;
  }
  return apps.filter((a) => inWindow(a.created_at)).length;
}

// Parse a "YYYY-MM-DD" (or empty) form value into a Date, or null. Guards
// against Invalid Date so Prisma never receives a bad value.
function toOptionalDate(value: string | undefined): Date | null {
  if (!value || !value.trim()) return null;
  const d = new Date(value.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

export type AdminApplicationFilters = {
  fromDate?: string;
  toDate?: string;
  pipelineRoleId?: number;
  courseId?: string;
  listBy?: string;
  centreId?: string;
  search?: string;
  status?: string;
  // Naji 2026-05-08 — actor's user id; counsellors (role 9) auto-scope
  // to their own pipeline rows so the counsellor portal Applications
  // list never leaks other counsellors' or admins' leads.
  actorUserId?: string;
};

export type AdminApplicationInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  aadharNo?: string;
  passportNo?: string;
  whatsappNo?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  permanentAddress?: string;
  correspondenceAddress?: string;
  highestQualification?: string;
  specialization?: string;
  institutionName?: string;
  yearOfPassing?: string;
  percentageOrCgpa?: string;
  workExperience?: string;
  currentOccupation?: string;
  employmentStatus?: string;
  courseId?: string;
  centreId?: string;
  batchId?: string;
  offeringId?: string;
  enrollmentDate?: string;
  modeOfStudy?: string;
  language?: string;
  pipeline?: string;
  pipelineUser?: string;
  discount?: string;
  gstApplicability?: string;
  leadSource?: string;
  applicationStatus?: string;
  notes?: string;
  crmTags?: string;
  photoUrl?: string;
  countryCode?: string;
  whatsappCountryCode?: string;
  certificateCombinationId?: string;
  applicationDate?: string;
  referenceStudentId?: string;
  discountType?: string;
  registrationFee?: string;
  gstPercent?: string;
  finalCourseFee?: string;
  installmentPlan?: string;
  documents?: string;
};

export type CentreApplicationInput = {
  applicationId?: string;
  name: string;
  countryCode: string;
  phone: string;
  email: string;
  courseId: string;
  pipeline: string;
  pipelineUser: string;
  status: string;
};

export type StudentFilters = {
  courseId?: string;
  centreId?: string;
  batchId?: string;
  search?: string;
  status?: string;
};

export type CentreInput = {
  centreName: string;
  contactPerson: string;
  countryCode: string;
  phone: string;
  email: string;
  address: string;
  registrationDate?: string;
  expiryDate?: string;
  /** @deprecated Centre admin password is now auto-generated and emailed.
   *  Field kept temporarily for back-compat with old clients still posting it. */
  password?: string;
  /** Profile photo URL (uploaded via /admin/upload). */
  image?: string;
};

export type CentrePlanInput = {
  centreId: string;
  courseId: string;
  assignedAmount: number;
  startDate: string;
  endDate: string;
};

export type CohortInput = {
  title: string;
  cohortCode?: string;
  courseId: string;
  subjectId: string;
  instructorId: string;
  startDate: string;
  endDate: string;
};

export type AddCohortStudentsInput = {
  cohortId: string;
  studentIds: string[];
};

export type LiveClassEntryInput = {
  sessionId: string;
  title: string;
  date: string;
  fromTime: string;
  toTime: string;
  isRepetitive: number;
  repeatDates: string[];
};

export type AddLiveClassInput = {
  cohortId: string;
  zoomId: string;
  password: string;
  entries: LiveClassEntryInput[];
  // QA Correction2 / Naji ask — Microsoft Teams support
  platform?: 'teams' | 'zoom' | 'manual' | 'other' | undefined;
  /** For platform === 'teams': which allowed host's calendar to create on. */
  teamsHostEmail?: string | undefined;
  /** For platform === 'manual' | 'other': trainer-supplied join URL. */
  manualJoinUrl?: string | undefined;
};

export type ResourceListInput = {
  folderId: string;
  centreId?: string;
};

export type AddFolderInput = {
  parentId: string;
  name: string;
  centreId?: string;
};

export type AddFileInput = {
  folderId: string;
  name: string;
  fileType: string;
  size: number;
  path: string;
  centreId?: string;
};

export type AddCentreFundRequestInput = {
  amount: number;
  date?: string;
  transactionReceipt?: string;
  description?: string;
  attachmentFile?: string;
};

export type UpdateSettingsInput = {
  system: Record<string, string>;
  frontend: Record<string, string>;
};

export type AppVersionInput = {
  appVersion: string;
  appVersionIos: string;
};

export type ReportSummaryInput = {
  fromDate?: string;
  toDate?: string;
};

export type ExportReportInput = {
  type: 'summary' | 'live_report';
  fromDate?: string;
  toDate?: string;
  liveId?: string;
  joinDate?: string;
};

export type BatchInput = {
  title: string;
  description?: string;
  status?: string;
};

export type BannerInput = {
  title?: string;
  image?: string;
  courseId?: string;
  status?: string;
  url?: string;
  isCourseBanner?: boolean;
};

export type FaqInput = {
  question: string;
  answer?: string;
  status?: string;
};

export type EventInput = {
  title?: string;
  image?: string;
  description?: string;
  instructorId?: string;
  eventDate?: string;
  fromTime?: string;
  toTime?: string;
  duration?: string;
  isRecordingAvailable?: number;
  numObjectives?: number;
};

export type FeedInput = {
  title?: string;
  image?: string;
  courseId?: string;
  instructorId?: string;
  description?: string;
};

export type LanguageInput = {
  title: string;
};

export type ReviewInput = {
  courseId?: string;
  userId?: string;
  rating?: string;
  review?: string;
};

export type AdminCohortFilters = {
  courseId?: string;
  subjectId?: string;
  centreId?: string;
  status?: string;
};

export type AdminCentrePaymentFilters = {
  fromDate?: string;
  toDate?: string;
  status?: string;
  type?: string;
};

export type AdminPaymentFilters = {
  fromDate?: string;
  toDate?: string;
  courseId?: string;
};

export type AdminWalletFilters = {
  centreId?: string;
  centreName?: string;
};

// ─── Phase D: Centres Feature Input Types ────────────────────────────────────

export type UpdateCentreInput = {
  centreName?: string;
  centreCode?: string;
  centreType?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  googleMapsLink?: string;
  affiliationNumber?: string;
  affiliationDate?: string;
  affiliationDocument?: string;
  recognitionStatus?: string;
  description?: string;
  status?: string;
  logo?: string;
  establishedDate?: string;
  registrationDate?: string;
  expiryDate?: string;
};

export type TrainingVideoInput = {
  title: string;
  category?: string;
  videoType?: string;
  videoUrl?: string;
  thumbnail?: string;
  description?: string;
  status?: string;
};

// ─── Phase 3: Operations & People Input Types ────────────────────────────────

export type AdminCohortInput = {
  title: string;
  cohortCode?: string;
  courseId?: string;
  subjectId?: string;
  centreId?: string;
  instructorId?: string;
  startDate: string;
  endDate: string;
  languageId?: string;
  offeringIds?: string[];
};

export type FeeInstallmentFilters = {
  courseId?: string;
  status?: string;
};

export type CohortAttendanceFilters = {
  cohortId?: string;
};

// ─── Phase 2: Exam & Assessment Input Types ──────────────────────────────────

export type QuestionBankFilters = {
  courseId?: string;
  subjectId?: string;
  lessonId?: string;
  qType?: number;
};

export type QuestionBankInput = {
  courseId: string;
  subjectId?: string;
  lessonId?: string;
  categoryId?: string;
  type?: number;
  qType?: number;
  title: string;
  titleFile?: string;
  hint?: string;
  hintFile?: string;
  solution?: string;
  solutionFile?: string;
  isEquation?: number;
  numberOfOptions?: number;
  options?: string;
  correctAnswers?: string;
  rangeFrom?: string;
  rangeTo?: string;
};

export type AdminExamFilters = {
  courseId?: string;
  subjectId?: string;
  batchId?: string;
  status?: string;
};

export type ExamInput = {
  title: string;
  description?: string;
  mark?: number;
  duration?: string;
  fromDate?: string;
  toDate?: string;
  fromTime?: string;
  toTime?: string;
  courseId: string;
  subjectId?: string;
  lessonId?: string;
  batchId?: string;
  free?: string;
  publishResult?: number;
  isPractice?: number;
  questionIds?: string[];
};

export type AdminAssignmentFilters = {
  courseId?: string;
  cohortId?: string;
};

export type AssignmentInput = {
  title: string;
  description?: string;
  totalMarks?: number;
  addedDate?: string;
  dueDate?: string;
  fromTime?: string;
  toTime?: string;
  instructions?: string;
  file?: string;
  courseId: string;
  cohortId?: string;
};

export type AdminExamResultFilters = {
  examId?: string;
  courseId?: string;
  batchId?: string;
};

export type AdminExamEvaluationFilters = {
  examId?: string;
  courseId?: string;
};

export type AdminReExamFilters = {
  courseId?: string;
  batchId?: string;
};

export type EntranceExamInput = {
  title: string;
  description?: string;
  totalMarks?: number;
  duration?: string;
  examDate?: string;
  fromTime?: string;
  toTime?: string;
  courseId: string;
  status?: string;
  questionIds?: string;
};

export type AddInstructorInput = {
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  status?: number;
  /** Profile photo URL (uploaded via /admin/upload). */
  image?: string;
  /** Highest academic qualification — stored on users.highest_qualification.
   *  The Add Instructor form has had this field for a while but the backend
   *  was silently dropping it; Naji UAT 2026-05-14 surfaced it as a column. */
  qualification?: string;
};

export type AddUserInput = {
  name: string;
  email: string;
  phone?: string;
  /** @deprecated Password is now auto-generated and emailed to the new
   *  user. Field kept for back-compat with older clients; ignored. */
  password?: string;
  roleId: number;
  /** Profile photo URL (uploaded via /admin/upload). */
  image?: string;
};

export type AddTargetInput = {
  userId: string;
  targetType: string;
  targetValue: number;
  periodFrom: string;
  periodTo: string;
  remarks?: string;
};

export type AddAssociateInput = {
  name: string;
  email: string;
  phone?: string;
  status?: number;
  /** Profile photo URL (uploaded via /admin/upload). */
  image?: string;
  // Optional counsellor profile detail (associates omit these). Persisted so
  // the Edit form pre-fills — they were previously dropped on save.
  gender?: string;
  dob?: string;
  languagesSpoken?: string;
  highestQualification?: string;
  doj?: string;
};

function normalizeSqlRow(row: SqlRow): SqlRow {
  const normalized: SqlRow = {};

  for (const [key, value] of Object.entries(row)) {
    normalized[key] = typeof value === 'bigint' ? Number(value) : value;
  }

  return normalized;
}

function toIntId(id: string | number | null | undefined): number {
  if (typeof id === 'number') return id;
  if (!id) return 0;
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : 0;
}

function toNullableIntId(id: string | number | null | undefined): number | null {
  if (id === null || id === undefined || id === '') return null;
  if (typeof id === 'number') return id;
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : null;
}

// Strict integer parse: returns null for non-numeric strings (e.g. "India"),
// empties, and zero. Used when a column may legitimately store either a
// numeric foreign key or a free-text fallback (legacy applications.country_id
// / .nationality / .preferred_language all do this).
function parseLooseInt(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^-?\d+$/.test(trimmed)) return null;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Per-instalment payment ledger ─────────────────────────────────────────
// Strict one-by-one instalment payments (Naji 2026-07-04). Lives inside the
// applications.payment_plan JSON (no schema change) under `instalment_payments`,
// index-aligned to `installments` (index 0 = registration). The legacy single
// `manual_payment` object is kept as a mirror of the latest entry; on read, when
// no ledger array exists we synthesise index 0 from it so old applications work.
type InstalmentLedgerStatus = 'pending_approval' | 'approved' | 'rejected';
interface InstalmentLedgerEntry {
  index: number;
  mode: string;
  reference: string;
  receipt_url: string;
  note: string;
  amount_minor: number | null;
  paid_date: string | null;
  marked_at: string;
  marked_by: number | null;
  status: InstalmentLedgerStatus;
  decided_at?: string;
  decided_by?: number;
  reject_reason?: string;
}

function readInstalmentLedger(
  plan: Record<string, unknown>,
  appPaymentStatus?: string,
): InstalmentLedgerEntry[] {
  const num = (v: unknown): number | null => (v == null || v === '' ? null : Number(v));
  const str = (v: unknown): string =>
    typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';
  const toStatus = (v: unknown): InstalmentLedgerStatus =>
    v === 'approved' || v === 'rejected' ? v : 'pending_approval';
  const raw = Array.isArray(plan.instalment_payments) ? (plan.instalment_payments as Record<string, unknown>[]) : [];
  if (raw.length > 0) {
    return raw
      .map((e): InstalmentLedgerEntry => ({
        index: Number(e.index ?? 0),
        mode: str(e.mode),
        reference: str(e.reference),
        receipt_url: str(e.receipt_url),
        note: str(e.note),
        amount_minor: num(e.amount_minor),
        paid_date: e.paid_date == null ? null : str(e.paid_date),
        marked_at: str(e.marked_at),
        marked_by: num(e.marked_by),
        status: toStatus(e.status),
        ...(e.decided_at == null ? {} : { decided_at: str(e.decided_at) }),
        ...(e.decided_by == null ? {} : { decided_by: Number(e.decided_by) }),
        ...(e.reject_reason == null ? {} : { reject_reason: str(e.reject_reason) }),
      }))
      .sort((a, b) => a.index - b.index);
  }
  const manual = plan.manual_payment as Record<string, unknown> | undefined;
  if (manual && (str(manual.reference) || str(manual.mode) || manual.amount_minor != null)) {
    const status: InstalmentLedgerStatus =
      appPaymentStatus === 'paid' ? 'approved' : appPaymentStatus === 'payment_rejected' ? 'rejected' : 'pending_approval';
    return [{
      index: 0,
      mode: str(manual.mode),
      reference: str(manual.reference),
      receipt_url: str(manual.receipt_url),
      note: str(manual.note),
      amount_minor: num(manual.amount_minor),
      paid_date: manual.paid_date == null ? null : str(manual.paid_date),
      marked_at: str(manual.marked_at),
      marked_by: num(manual.marked_by),
      status,
    }];
  }
  // A settled registration with NO recorded manual payment (e.g. paid online via
  // the Razorpay link) still counts as an approved index 0, so later instalments
  // can be recorded/gated correctly. Naji 2026-07-04.
  if (appPaymentStatus === 'paid') {
    return [{
      index: 0,
      mode: '',
      reference: '',
      receipt_url: '',
      note: '',
      amount_minor: null,
      paid_date: null,
      marked_at: '',
      marked_by: null,
      status: 'approved',
    }];
  }
  return [];
}

/** The coarse application-level payment_status rollup from the ledger. */
function rollupPaymentStatus(ledger: InstalmentLedgerEntry[]): 'pending_approval' | 'paid' | 'payment_rejected' | null {
  if (ledger.some((e) => e.status === 'pending_approval')) return 'pending_approval';
  const reg = ledger.find((e) => e.index === 0);
  if (reg && reg.status === 'approved') return 'paid';
  if (ledger.some((e) => e.status === 'rejected')) return 'payment_rejected';
  return null;
}

/** Parse 'YYYY-MM-DD' (or an ISO datetime's date prefix) into a UTC-midnight Date
 *  for @db.Date columns. Returns null for empty / '0000-00-00' / malformed input.
 *  Built in UTC so it never day-shifts back in IST (the date-only gotcha). */
function ymdToUtcDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || !mo || !d) return null; // guards '0000-00-00'
  return new Date(Date.UTC(y, mo - 1, d));
}

/** UTC-midnight Date for the Asia/Kolkata calendar day of a plain 'YYYY-MM-DD', an
 *  ISO datetime, or a Date. Plain dates are taken as-is (already IST-intended);
 *  datetimes (e.g. a ledger `decided_at` = toISOString()) are converted to their
 *  IST day first, so an approval timestamped before 05:30 IST doesn't get stored a
 *  day early. Returns null for empty/malformed input. */
function istCalendarDayUtc(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return ymdToUtcDate(value);
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? ymdToUtcDate(value) : null;
  // en-CA formats as YYYY-MM-DD; the timeZone option yields the IST calendar day.
  const ist = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
  return ymdToUtcDate(ist);
}

/** Build the student_payments rows that mirror an application-stage payment plan.
 *  Pure (no DB) so both the conversion write-path and the backfill script reuse
 *  the exact same mapping. One row per installments[] entry, index-aligned to the
 *  instalment ledger so each row's Paid/Pending status + paid metadata matches
 *  readInstalmentLedger() exactly. amountMinor (paise) -> whole INR, because
 *  student_payments.amount is stored in whole rupees (NOT minor units). */
export function buildStudentPaymentRowsFromPlan(
  paymentPlanJson: string | null | undefined,
  paymentStatus: string | null | undefined,
  ctx: { studentUserId: number; courseId: number; actorUserId: number | null; now: Date; settledAt?: Date | string | null },
): Prisma.student_paymentsCreateManyInput[] {
  if (!paymentPlanJson) return [];
  let planObj: Record<string, unknown>;
  try {
    planObj = JSON.parse(paymentPlanJson) as Record<string, unknown>;
  } catch {
    return [];
  }
  const rawInstallments = Array.isArray(planObj.installments)
    ? (planObj.installments as Array<Record<string, unknown>>)
    : [];
  // A full-payment plan (mode:'full') carries no installments[] — only a total.
  // Synthesize a single "Course Fee" row from the total so a full-fee student's
  // ledger isn't silently empty. Index 0 aligns with the registration/full ledger
  // entry, so its Paid/Pending status comes through correctly.
  const totalMinor = Number(planObj.total_amount_minor ?? 0);
  const installments: Array<Record<string, unknown>> = rawInstallments.length > 0
    ? rawInstallments
    : Number.isFinite(totalMinor) && totalMinor > 0
      ? [{ label: 'Course Fee', amountMinor: totalMinor, dueDate: '' }]
      : [];
  if (installments.length === 0) return [];
  const ledger = readInstalmentLedger(planObj, paymentStatus ?? undefined);
  const byIndex = new Map<number, InstalmentLedgerEntry>();
  for (const e of ledger) byIndex.set(e.index, e);
  const { studentUserId, courseId, actorUserId, now, settledAt } = ctx;
  return installments.map((inst, i): Prisma.student_paymentsCreateManyInput => {
    const amountMinor = Number(inst.amountMinor ?? inst.amount_minor ?? 0);
    const amountInr = Number.isFinite(amountMinor) && amountMinor > 0 ? Math.round(amountMinor / 100) : 0;
    const label = typeof inst.label === 'string' ? inst.label : '';
    const dueStr = typeof inst.dueDate === 'string' ? inst.dueDate : typeof inst.due_date === 'string' ? inst.due_date : '';
    const entry = byIndex.get(i);
    const isPaid = entry?.status === 'approved';
    // Prefer the ledger's own paid date, then its approval timestamp, then the
    // application's recorded payment moment, then the conversion moment — each
    // resolved to the IST calendar day so it never stores a day early.
    const paidDate = isPaid
      ? (istCalendarDayUtc(entry?.paid_date ?? entry?.decided_at ?? null)
        ?? istCalendarDayUtc(settledAt ?? null)
        ?? istCalendarDayUtc(now))
      : null;
    return {
      user_id: studentUserId,
      course_id: courseId,
      installment_details: label.slice(0, 200) || null,
      amount: amountInr,
      payment_mode: (entry?.mode || '').slice(0, 20) || null,
      status: isPaid ? 'Paid' : 'Pending',
      due_date: ymdToUtcDate(dueStr),
      paid_date: paidDate,
      reference_number: (entry?.reference || '').slice(0, 100) || null,
      receipt_url: (entry?.receipt_url || '').slice(0, 500) || null,
      payment_to: 'ttii',
      created_by: actorUserId,
      updated_by: actorUserId,
      created_at: now,
      updated_at: now,
    };
  });
}

/** Parse a Payment Approval queue row id: "<applicationId>" or "<applicationId>-<index>". */
function parseApprovalRowId(rowId: string): { applicationId: string; index: number } {
  const m = /^(\d+)(?:-(\d+))?$/.exec(rowId.trim());
  if (!m) return { applicationId: rowId, index: 0 };
  return { applicationId: m[1] ?? rowId, index: m[2] ? Number(m[2]) : 0 };
}

export class OperationsService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  private async currentUser(userId: string): Promise<SqlRow | null> {
    if (!userId) {
      return null;
    }

    const user = await this.prisma.users.findFirst({
      where: { id: toIntId(userId), deleted_at: null },
      select: { id: true, role_id: true, name: true, user_email: true, centre_id: true, course_id: true },
    });

    return user ? normalizeSqlRow(user as unknown as SqlRow) : null;
  }

  private async resolveActorCentreId(userId: string): Promise<string> {
    const user = await this.currentUser(userId);
    return toStringValue(user?.centre_id);
  }

  private async resolveSupportRecipientId(): Promise<string> {
    const admin = await this.prisma.users.findFirst({
      where: { role_id: 1, deleted_at: null },
      orderBy: { id: 'asc' },
      select: { id: true },
    });

    return admin ? String(admin.id) : '';
  }

  private async nextStudentCode(tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>): Promise<string> {
    // Allocate from the MAX numeric suffix across ALL TTS student codes, not
    // just the latest row (Naji 2026-07-09). Reading a single latest row would
    // collide after a bulk renumber or any out-of-order manual insert.
    const rows = await tx.users.findMany({
      where: {
        role_id: 2,
        deleted_at: null,
        student_id: { startsWith: 'TTS' },
      },
      select: { student_id: true },
    });

    let maxNumber = 0;
    for (const r of rows) {
      const match = toStringValue(r.student_id).match(/(\d+)$/);
      if (!match) continue;
      const n = Number.parseInt(match[1] ?? '0', 10);
      if (Number.isFinite(n) && n > maxNumber) maxNumber = n;
    }

    return `TTS${String(maxNumber + 1).padStart(4, '0')}`;
  }

  // Naji 2026-05-07: continue the legacy TTII26#### sequence rather
  // than minting APP-{timestamp} IDs. Year-prefixed (last two digits of
  // the current year) so the sequence resets cleanly each January and
  // matches the existing TTII26**** rows in production.
  private async nextApplicationId(): Promise<string> {
    const yy = String(new Date().getFullYear() % 100).padStart(2, '0');
    const prefix = `TTII${yy}`;
    const recent = await this.prisma.applications.findMany({
      where: { application_id: { startsWith: prefix } },
      select: { application_id: true },
      orderBy: { id: 'desc' },
      take: 500,
    });
    let maxSeq = 0;
    for (const row of recent) {
      const aid = row.application_id ?? '';
      if (!aid.startsWith(prefix)) continue;
      const n = Number.parseInt(aid.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
    }
    return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
  }

  async listPipelineUsers(roleId: number): Promise<SqlRow[]> {
    if (roleId <= 0) {
      return [];
    }

    const users = await this.prisma.users.findMany({
      where: { role_id: roleId, deleted_at: null },
      select: { id: true, name: true, user_email: true, phone: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return users as unknown as SqlRow[];
  }

  // Reassign ONLY pipeline + pipeline_user for an application/lead. Unlike
  // updateApplication (a ~30-column full-object overwrite that the Edit
  // Application form gates behind full-application validation — so it can't
  // be used to fix a bare lead), this is a surgical partial update: correct
  // a lead's owner without re-entering the whole application. Naji 2026-07-08.
  async reassignPipeline(
    actorUserId: string,
    applicationId: string,
    input: { pipeline: string; pipelineUser: string },
  ): Promise<Record<string, unknown>> {
    const id = toIntId(applicationId);
    if (!id) return { status: 0, message: 'Application ID is required.' };

    // Reassigning lead ownership is an admin action. Restrict to Super Admin
    // (1) and Admin (8) — counsellors (9) must not reassign leads, else a
    // counsellor could grab another counsellor's lead by id. (The list read
    // already silos leads per counsellor; this keeps the write path in step.)
    const actor = await this.prisma.users.findFirst({
      where: { id: toIntId(actorUserId), deleted_at: null },
      select: { role_id: true },
    });
    if (!actor || (actor.role_id !== 1 && actor.role_id !== 8)) {
      return { status: 0, message: 'You are not permitted to reassign pipelines.' };
    }

    // Pipeline label -> role_id. Mirrors the create-lead roleLabel map and
    // the admin form's PIPELINE_ROLE_MAP. Centre pipelines are out of scope.
    const PIPELINE_ROLE: Record<string, number> = { Admin: 8, Counsellor: 9, Associate: 10 };
    const pipeline = (input.pipeline || '').trim();
    const roleId = PIPELINE_ROLE[pipeline];
    if (!roleId) {
      return { status: 0, message: 'Invalid pipeline. Choose Admin, Counsellor, or Associate.' };
    }

    const pipelineUserId = toNullableIntId(input.pipelineUser);
    if (!pipelineUserId) return { status: 0, message: 'Pipeline user is required.' };

    // The chosen user must be an active member of the mapped role, so
    // pipeline_user can never point at a mismatched or deleted user.
    const user = await this.prisma.users.findFirst({
      where: { id: pipelineUserId, role_id: roleId, deleted_at: null },
      select: { id: true, name: true },
    });
    if (!user) {
      return { status: 0, message: `Selected user is not an active ${pipeline}.` };
    }

    const existing = await this.prisma.applications.findFirst({
      where: { id, deleted_at: null },
      select: { id: true },
    });
    if (!existing) return { status: 0, message: 'Application not found.' };

    await this.prisma.applications.update({
      where: { id },
      data: {
        pipeline,
        pipeline_user: pipelineUserId,
        updated_by: toIntId(actorUserId),
      },
    });

    return {
      status: 1,
      message: 'Pipeline reassigned.',
      data: { pipeline, pipeline_user: pipelineUserId, pipeline_user_name: user.name },
    };
  }

  async listAdminApplications(filters: AdminApplicationFilters): Promise<Record<string, unknown>> {
    const range = normalizeReportRange(filters.fromDate, filters.toDate);

    // Naji 2026-05-07: hide enrolled rows from this list — once an
    // application is enrolled, the source-of-truth row lives under
    // Students. Keeping it here would let admins approve/reject already-
    // enrolled rows by mistake.
    const where: Record<string, unknown> = {
      deleted_at: null,
      is_converted: 0,
      stage: { not: 'enrolled' },
    };

    if (filters.fromDate) {
      where.created_at = { ...(where.created_at as Record<string, unknown> ?? {}), gte: new Date(`${range.fromDate}T00:00:00Z`) };
    }
    if (filters.toDate) {
      where.created_at = { ...(where.created_at as Record<string, unknown> ?? {}), lte: new Date(`${range.toDate}T23:59:59Z`) };
    }
    if ((filters.pipelineRoleId ?? 0) > 0) {
      // `applications.pipeline` stores a MIX of encodings for the SAME role:
      // labels from createLead + the Add/Edit forms (mostly the singular
      // "Counsellor"/"Associate", but production data also has the plural
      // lowercase "associates"), and — when the form's pipeline was blank — the
      // numeric role-id string ("9"/"10"). Match every known variant for the
      // selected role so no lead silently vanishes from the pipeline filter
      // (Naji 2026-07-09; verified against the real production encodings).
      const rid = Number(filters.pipelineRoleId);
      const pipelineVariantsByRole: Record<number, string[]> = {
        1: ['Super Admin', 'Super Admins', 'super admin'],
        8: ['Admin', 'Admins', 'admin'],
        9: ['Counsellor', 'Counsellors', 'counsellor', 'counsellors'],
        10: ['Associate', 'Associates', 'associate', 'associates'],
      };
      const variants = pipelineVariantsByRole[rid] ?? [];
      where.pipeline = { in: [...variants, String(rid)] };
    }

    // Naji 2026-05-08 — Counsellor scoping: role 9 only sees their own
    // pipeline rows. Admins / Super Admins see everything.
    if (filters.actorUserId) {
      const actor = await this.prisma.users.findFirst({
        where: { id: toIntId(filters.actorUserId), deleted_at: null },
        select: { id: true, role_id: true },
      });
      if (actor?.role_id === 9) {
        where.pipeline_user = actor.id;
      }
    }
    if (filters.courseId) {
      where.course_id = toIntId(filters.courseId);
    }
    if ((filters.listBy ?? '').trim() !== '') {
      where.status = filters.listBy;
    }
    if ((filters.status ?? '').trim() !== '') {
      where.status = filters.status;
    }
    if (filters.centreId) {
      where.added_under_centre = toIntId(filters.centreId);
    }
    if ((filters.search ?? '').trim() !== '') {
      const q = filters.search!.trim();
      where.OR = [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
        { user_email: { contains: q } },
        { application_id: { contains: q } },
      ];
    }

    const apps = await this.prisma.applications.findMany({
      where: where as Prisma.applicationsWhereInput,
      orderBy: { id: 'desc' },
    });

    // LEFT JOIN: courses, users (pipeline), centres, offerings, combinations
    const courseIds = [...new Set(apps.map(a => a.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const pipelineUserIds = [...new Set(apps.map(a => a.pipeline_user).filter((x): x is number => x !== null && x !== undefined))];
    const centreIds = [...new Set(apps.map(a => a.added_under_centre).filter((x): x is number => x !== null && x !== undefined))];
    const offeringIds = [...new Set(apps.map(a => a.offering_id).filter((x): x is number => x !== null && x !== undefined))];
    const combinationIds = [...new Set(apps.map(a => a.certificate_combination_id).filter((x): x is number => x !== null && x !== undefined))];

    const [courses, pipelineUsers, centres, offerings, combinations, allCourses, allCentres] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } } }) : [],
      pipelineUserIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: pipelineUserIds } }, select: { id: true, name: true } }) : [],
      centreIds.length > 0 ? this.prisma.centres.findMany({ where: { id: { in: centreIds } }, select: { id: true, centre_name: true } }) : [],
      offeringIds.length > 0 ? this.prisma.offerings.findMany({ where: { id: { in: offeringIds } }, select: { id: true, title: true, offering_code: true } }) : [],
      combinationIds.length > 0 ? this.prisma.certificate_combinations.findMany({ where: { id: { in: combinationIds } }, select: { id: true, combination_code: true } }) : [],
      this.prisma.course.findMany({ where: { deleted_at: null }, select: { id: true, title: true }, orderBy: { title: 'asc' } }),
      this.prisma.centres.findMany({ where: { deleted_at: null }, select: { id: true, centre_name: true }, orderBy: { centre_name: 'asc' } }),
    ]);

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const pipelineUserMap = new Map(pipelineUsers.map(u => [u.id, u]));
    const centreMap = new Map(centres.map(c => [c.id, c]));
    const offeringMap = new Map(offerings.map((o: { id: number; title: string | null; offering_code: string | null }) => [o.id, o]));
    const combinationMap = new Map(combinations.map((c: { id: number; combination_code: string | null }) => [c.id, c]));

    const applications = apps.map(a => ({
      ...a,
      course_title: a.course_id ? courseMap.get(a.course_id)?.title ?? null : null,
      pipeline_user_name: a.pipeline_user ? pipelineUserMap.get(a.pipeline_user)?.name ?? null : null,
      centre_name: a.added_under_centre ? centreMap.get(a.added_under_centre)?.centre_name ?? null : null,
      offering_title: a.offering_id ? (offeringMap.get(a.offering_id)?.title ?? offeringMap.get(a.offering_id)?.offering_code ?? null) : null,
      combination_title: a.certificate_combination_id ? combinationMap.get(a.certificate_combination_id)?.combination_code ?? null : null,
    }));

    const rejectedCount = applications.filter((item) => toStringValue(item.status) === 'rejected').length;
    const pendingCount = applications.filter((item) => toStringValue(item.status) === 'pending').length;

    return {
      students: applications,
      rejected_count: rejectedCount,
      pending_count: pendingCount,
      courses: allCourses,
      centres: allCentres,
    };
  }

  async listCentreApplications(actorUserId: string, listBy?: string): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
      return {
        students: [],
        pending_count: 0,
        rejected_count: 0,
      };
    }

    const where: Record<string, unknown> = {
      deleted_at: null,
      is_converted: 0,
      OR: [
        { added_under_centre: toIntId(centreId) },
        { created_by: toIntId(actorUserId) },
      ],
    };

    if ((listBy ?? '').trim() !== '') {
      where.status = listBy;
    }

    const apps = await this.prisma.applications.findMany({
      where: where as Prisma.applicationsWhereInput,
      orderBy: { id: 'desc' },
    });

    // LEFT JOIN: courses
    const courseIds = [...new Set(apps.map(a => a.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));

    const applications = apps.map(a => ({
      ...a,
      course_title: a.course_id ? courseMap.get(a.course_id)?.title ?? null : null,
    }));

    let pendingCount = 0;
    let rejectedCount = 0;

    for (const item of applications) {
      const status = toStringValue(item.status);
      if (status === 'pending') {
        pendingCount += 1;
      }

      if (status === 'rejected') {
        rejectedCount += 1;
      }
    }

    return {
      students: applications,
      pending_count: pendingCount,
      rejected_count: rejectedCount,
    };
  }

  async getCentreDashboard(actorUserId: string): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
      return {
        students: 0,
        wallet_balance: 0,
        active_cohorts: 0,
        pending_applications: 0,
        recent_students: [],
      };
    }

    const centreIdNum = Number(centreId);

    const centreIdInt = toIntId(centreId);
    const [studentsCount, activeCohortsCount, pendingApplicationsCount, centre, recentStudentRows] = await Promise.all([
      this.prisma.users.count({ where: { role_id: 2, added_under_centre: centreIdNum, deleted_at: null } }),
      this.prisma.cohorts.count({ where: { centre_id: centreIdInt, deleted_at: null } }),
      this.prisma.applications.count({ where: { added_under_centre: centreIdNum, is_converted: 0, deleted_at: null } }),
      this.prisma.centres.findFirst({
        where: { id: centreIdInt, deleted_at: null },
        select: { id: true, centre_id: true, centre_name: true, wallet_balance: true },
      }),
      this.prisma.users.findMany({
        where: { role_id: 2, added_under_centre: centreIdNum, deleted_at: null },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take: 3,
        select: { id: true, student_id: true, name: true, created_at: true, course_id: true },
      }),
    ]);

    // LEFT JOIN courses for recent students
    const courseIds = [...new Set(recentStudentRows.map(s => s.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));

    return {
      students: studentsCount,
      wallet_balance: toDbNumber(centre?.wallet_balance),
      active_cohorts: activeCohortsCount,
      pending_applications: pendingApplicationsCount,
      recent_students: recentStudentRows.map((entry) => ({
        id: entry.id,
        student_id: toStringValue(entry.student_id),
        student_name: toStringValue(entry.name),
        course_name: entry.course_id ? courseMap.get(entry.course_id)?.title ?? '' : '',
        enrollment_date: toStringValue(entry.created_at),
      })),
      centre: centre
        ? {
            id: centre.id,
            centre_id: toInteger(centre.centre_id),
            centre_name: toStringValue(centre.centre_name),
          }
        : null,
    };
  }

  async listCentreCourses(actorUserId: string): Promise<SqlRow[]> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
      return [];
    }

    const plans = await this.prisma.centre_course_plans.findMany({
      where: { centre_id: toIntId(centreId), deleted_at: null },
      orderBy: { id: 'desc' },
    });

    const courseIds = [...new Set(plans.map(p => p.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, short_name: true, title: true } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));

    return plans.map(p => ({
      ...p,
      short_name: p.course_id ? courseMap.get(p.course_id)?.short_name ?? null : null,
      course_title: p.course_id ? courseMap.get(p.course_id)?.title ?? null : null,
    })) as unknown as SqlRow[];
  }

  async getCentreWallet(actorUserId: string): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
      return {
        list_items: null,
        credits: [],
        debits: [],
        fund_requests: [],
        summary: {
          total_credits: 0,
          total_debits: 0,
        },
      };
    }

    const centreIdInt = toIntId(centreId);
    const [centre, credits, debits, fundRequests] = await Promise.all([
      this.prisma.centres.findFirst({
        where: { id: centreIdInt, deleted_at: null },
        select: { id: true, centre_id: true, centre_name: true, wallet_balance: true },
      }),
      this.prisma.wallet_transactions.findMany({
        where: { centre_id: centreIdInt, transaction_type: 'credit', deleted_at: null },
        select: { id: true, amount: true, remarks: true, created_at: true },
        orderBy: { id: 'desc' },
      }),
      this.prisma.wallet_transactions.findMany({
        where: { centre_id: centreIdInt, transaction_type: 'debit', deleted_at: null },
        select: { id: true, amount: true, remarks: true, created_at: true },
        orderBy: { id: 'desc' },
      }),
      this.prisma.centre_fund_requests.findMany({
        where: { centre_id: centreIdInt, deleted_at: null },
        select: { id: true, amount: true, date: true, transaction_receipt: true, description: true, attachment_file: true, status: true, created_at: true },
        orderBy: { id: 'desc' },
      }),
    ]);

    const totalCredits = credits.reduce((sum: number, entry: { amount: string | null }) => sum + toDbNumber(entry.amount), 0);
    const totalDebits = debits.reduce((sum: number, entry: { amount: string | null }) => sum + toDbNumber(entry.amount), 0);

    return {
      list_items: centre
        ? {
            id: centre.id,
            centre_id: toInteger(centre.centre_id),
            centre_name: toStringValue(centre.centre_name),
            wallet_balance: toDbNumber(centre.wallet_balance),
          }
        : null,
      credits: credits.map((entry: { id: number; amount: string | null; remarks: string | null; created_at: Date | null }) => ({
        id: entry.id,
        amount: toDbNumber(entry.amount),
        remarks: toStringValue(entry.remarks),
        reference_id: '',
        created_at: toStringValue(entry.created_at),
      })),
      debits: debits.map((entry: { id: number; amount: string | null; remarks: string | null; created_at: Date | null }) => ({
        id: entry.id,
        amount: toDbNumber(entry.amount),
        remarks: toStringValue(entry.remarks),
        reference_id: '',
        created_at: toStringValue(entry.created_at),
      })),
      fund_requests: fundRequests.map((entry: { id: number; amount: string | null; date: Date | null; transaction_receipt: string | null; description: string | null; attachment_file: string | null; status: string | null; created_at: Date | null }) => ({
        id: entry.id,
        amount: toDbNumber(entry.amount),
        date: toStringValue(entry.date),
        transaction_receipt: toStringValue(entry.transaction_receipt),
        description: toStringValue(entry.description),
        attachment_file: toStringValue(entry.attachment_file),
        status: toStringValue(entry.status) || 'pending',
        created_at: toStringValue(entry.created_at),
      })),
      summary: {
        total_credits: totalCredits,
        total_debits: totalDebits,
      },
    };
  }

  async addCentreFundRequest(actorUserId: string, input: AddCentreFundRequestInput): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
      return {
        status: 0,
        message: 'Centre is not assigned for current user.',
      };
    }

    if (input.amount <= 0) {
      return {
        status: 0,
        message: 'Amount is required',
      };
    }

    const now = new Date();
    const date = normalizeDate(input.date, now);

    const created = await this.prisma.centre_fund_requests.create({
      data: {
        centre_id: toIntId(centreId),
        user_id: toNullableIntId(actorUserId),
        amount: String(input.amount),
        date: new Date(date),
        transaction_receipt: toNullableString(input.transactionReceipt),
        description: toNullableString(input.description),
        attachment_file: toNullableString(input.attachmentFile),
        status: 'pending',
        created_by: toNullableIntId(actorUserId),
        updated_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return {
      status: 1,
      message: 'Request Sent Sucessfully!',
      data: {
        fund_request_id: created.id,
      },
    };
  }

  async listCentreTrainingVideos(): Promise<SqlRow[]> {
    const rows = await this.prisma.training_videos.findMany({
      where: { deleted_at: null },
      select: { id: true, title: true, description: true, category: true, video_type: true, video_url: true, thumbnail: true, created_at: true },
      orderBy: { id: 'desc' },
    });

    if (rows.length > 0) {
      return rows.map((entry) => ({
        id: entry.id,
        title: toStringValue(entry.title),
        description: toStringValue(entry.description),
        category: toStringValue(entry.category) || 'Lectures',
        video_type: toStringValue(entry.video_type),
        video_url: toStringValue(entry.video_url),
        thumbnail: toStringValue(entry.thumbnail),
        created_at: toStringValue(entry.created_at),
      }));
    }

    const demoVideos = await this.prisma.demo_video.findMany({
      where: { deleted_at: null },
      select: { id: true, title: true, video_type: true, video_url: true, thumbnail: true, created_at: true },
      orderBy: { id: 'desc' },
    });

    return demoVideos.map((entry) => ({
      id: entry.id,
      title: toStringValue(entry.title),
      description: '',
      category: 'Lectures',
      video_type: toStringValue(entry.video_type),
      video_url: toStringValue(entry.video_url),
      thumbnail: toStringValue(entry.thumbnail),
      created_at: toStringValue(entry.created_at),
    }));
  }

  async getCentreSupportMessages(actorUserId: string): Promise<SqlRow[]> {
    if (!actorUserId) {
      return [];
    }

    const messages = await this.prisma.support_chat.findMany({
      where: {
        deleted_at: null,
        OR: [
          { chat_id: toIntId(actorUserId) },
          { sender_id: toIntId(actorUserId) },
        ],
      },
      select: { id: true, chat_id: true, sender_id: true, message: true, created_at: true, updated_at: true },
      orderBy: { id: 'asc' },
    });

    return messages as unknown as SqlRow[];
  }

  async submitCentreSupportMessage(actorUserId: string, message: string): Promise<Record<string, unknown>> {
    if (!actorUserId || message.trim() === '') {
      return {
        status: 0,
        message: 'something went wrong!',
      };
    }

    const now = new Date();
    const recipientId = await this.resolveSupportRecipientId();

    const created = await this.prisma.support_chat.create({
      data: {
        chat_id: toNullableIntId(recipientId),
        sender_id: toNullableIntId(actorUserId),
        message,
        created_at: now,
        created_by: toIntId(actorUserId),
        updated_at: now,
        updated_by: toIntId(actorUserId),
      },
    });

    return {
      status: created ? 1 : 0,
      message: created ? 'message send successfully' : 'something went wrong!',
    };
  }

  async addCentreApplication(actorUserId: string, input: CentreApplicationInput): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
      return {
        status: 0,
        message: 'Centre is not assigned for current user.',
      };
    }

    const email = `${input.countryCode}${input.phone}`;

    const duplicateCount = await this.prisma.applications.count({
      where: {
        deleted_at: null,
        OR: [
          { email },
          { user_email: input.email },
        ],
      },
    });

    if (duplicateCount > 0) {
      return {
        status: 0,
        message: 'Application with same phone or email already exists',
      };
    }

    const now = new Date();
    const applicationId = input.applicationId?.trim() ? input.applicationId : `APP-${Date.now()}`;

    const created = await this.prisma.applications.create({
      data: {
        application_id: applicationId,
        name: input.name,
        country_code: input.countryCode,
        phone: input.phone,
        email,
        user_email: input.email,
        course_id: toNullableIntId(input.courseId),
        pipeline: input.pipeline,
        pipeline_user: toNullableIntId(input.pipelineUser),
        status: input.status as $Enums.applications_status | null,
        added_under_centre: toIntId(centreId),
        whatsapp_no: 0,
        second_code: 0,
        second_phone: '',
        image: '',
        created_by: toIntId(actorUserId),
        updated_by: toIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return {
      status: 1,
      message: 'Application Added Successfully!',
      application_id: created.id,
    };
  }

  /** Materialize an application-stage payment_plan into student_payments rows —
   *  the post-conversion source of truth every payment view reads. Idempotent:
   *  no-ops when the (user, course) already has ANY payment row, so re-conversion
   *  and the one-off backfill can never double-insert. `client` may be a
   *  transaction handle or the base client. */
  private async materializePaymentPlanToStudentPayments(
    client: Prisma.TransactionClient,
    input: {
      paymentPlanJson: string | null | undefined;
      paymentStatus: string | null | undefined;
      studentUserId: number;
      courseId: number;
      actorUserId: number | null;
      now: Date;
      settledAt?: Date | string | null;
    },
  ): Promise<{ created: number; skipped: 'no-plan' | 'exists' | null }> {
    const { studentUserId, courseId } = input;
    if (!studentUserId || !courseId) return { created: 0, skipped: 'no-plan' };
    const rows = buildStudentPaymentRowsFromPlan(input.paymentPlanJson, input.paymentStatus, {
      studentUserId,
      courseId,
      actorUserId: input.actorUserId,
      now: input.now,
      settledAt: input.settledAt ?? null,
    });
    if (rows.length === 0) return { created: 0, skipped: 'no-plan' };
    const existing = await client.student_payments.count({
      where: { user_id: studentUserId, course_id: courseId, deleted_at: null },
    });
    if (existing > 0) return { created: 0, skipped: 'exists' };
    await client.student_payments.createMany({ data: rows });
    return { created: rows.length, skipped: null };
  }

  async convertApplication(actorUserId: string, applicationId: string): Promise<Record<string, unknown>> {
    if (!applicationId) {
      return {
        status: 0,
        message: 'Application not found',
      };
    }

    const scope = await this.applicationOwnerScope(actorUserId);
    const application = await this.prisma.applications.findFirst({
      where: { id: toIntId(applicationId), deleted_at: null, is_converted: 0, ...scope },
    });

    if (!application) {
      return {
        status: 0,
        message: 'Application not found',
      };
    }

    // Issue login credentials (a unique random password) and email them, matching
    // the admin Approve fan-out — a converted student must receive their own
    // sign-in details, not a shared hardcoded password (Naji 2026-07-09). Runs
    // before the transaction; the email send inside issueAndEmailCredentials is
    // best-effort and never throws.
    const applicationEmail = toNullableString(application.user_email) ?? toNullableString(application.email) ?? '';
    let issuedHashedPassword: string | null = null;
    if (applicationEmail) {
      const { issueAndEmailCredentials } = await import('../auth/credentials-issuer.js');
      const creds = await issueAndEmailCredentials({
        name: toStringValue(application.name) || applicationEmail,
        email: applicationEmail,
        roleLabel: 'Student',
      });
      issuedHashedPassword = creds.hashedPassword;
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const studentCode = await this.nextStudentCode(tx);
      const now = new Date();
      // Use the issued (emailed) password hash; fall back to a default only for
      // the rare application with no email on file.
      const hashedPassword = issuedHashedPassword ?? await hashPassword('Temp@1234');
      const courseIdNum = application.course_id;
      const enrolDate = toDateOnly(now);

      const student = await tx.users.create({
        data: {
          student_id: studentCode,
          name: toStringValue(application.name),
          country_code: toStringValue(application.country_code),
          phone: toStringValue(application.phone),
          email: toStringValue(application.email),
          user_email: applicationEmail,
          password: hashedPassword,
          role_id: 2,
          course_id: courseIdNum ?? null,
          added_under_centre: application.added_under_centre,
          status: 1,
          gender: '',
          dynamic_link: '',
          image: '',
          profile_picture: '',
          // Link the student back to the source application so post-conversion
          // reads (and the payment backfill) can resolve users.id <- application.
          application_id: application.id,
          created_by: toIntId(actorUserId),
          updated_by: toIntId(actorUserId),
          created_at: now,
          updated_at: now,
        },
      });

      if (courseIdNum) {
        await tx.enrol.create({
          data: {
            user_id: student.id,
            course_id: courseIdNum,
            enrollment_date: enrolDate,
            enrollment_status: toStringValue(application.enrollment_status) || 'Active',
            mode_of_study: toStringValue(application.mode_of_study) || 'Online',
            created_by: toIntId(actorUserId),
            updated_by: toIntId(actorUserId),
            created_at: now,
            updated_at: now,
          },
        });
      }

      await tx.applications.update({
        where: { id: toIntId(applicationId) },
        data: {
          is_converted: 1,
          status: 'converted',
          // Link the converted student back onto the application (legacy convert
          // never did this, which broke the app-scoped Payments reads).
          student_id: student.id,
          updated_by: toIntId(actorUserId),
          updated_at: now,
        },
      });

      return {
        studentUserId: student.id,
        studentCode,
      };
    });

    // Materialize the application-stage payment plan into student_payments so the
    // post-conversion payment views (Payment History, Payment Status) reflect it.
    // Idempotent + non-blocking — a failure here must never un-convert the student
    // (the one-off backfill is the safety net).
    if (application.course_id) {
      try {
        await this.materializePaymentPlanToStudentPayments(this.prisma, {
          paymentPlanJson: application.payment_plan,
          paymentStatus: application.payment_status,
          studentUserId: created.studentUserId,
          courseId: application.course_id,
          actorUserId: toNullableIntId(actorUserId),
          now: new Date(),
          settledAt: application.payment_marked_paid_at,
        });
      } catch (err) {
        console.error('[convertApplication] payment materialization failed:', err instanceof Error ? err.message : err);
      }
    }

    // Enrolment-confirmed email + audit trail (mirror the admin Approve fan-out).
    // Best-effort: a notification failure must never fail the conversion itself.
    try {
      await this.recordEvent(toIntId(applicationId), 'converted', 'Lead converted to enrolled student', actorUserId, { student_id: created.studentUserId });
      await this.notifyApplicationEvent(toIntId(applicationId), 'enrolment_confirmed');
    } catch (err) {
      console.error('[convertApplication] enrolment notification failed:', err instanceof Error ? err.message : err);
    }

    return {
      status: 1,
      message: 'Application converted successfully',
      data: {
        student_user_id: created.studentUserId,
        student_id: created.studentCode,
      },
    };
  }

  async listStudents(scope: 'admin' | 'centre', actorUserId: string, filters: StudentFilters): Promise<SqlRow[]> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : '';

    if (scope === 'centre' && !centreId) {
      return [];
    }

    const where: Record<string, unknown> = {
      deleted_at: null,
      role_id: 2,
    };

    if (filters.courseId) {
      where.course_id = toIntId(filters.courseId);
    }
    if (scope === 'centre') {
      where.added_under_centre = toIntId(centreId);
    }
    if (filters.centreId) {
      where.added_under_centre = toIntId(filters.centreId);
    }
    if (filters.status) {
      const statusNum = filters.status === 'Active' ? 1 : filters.status === 'Inactive' ? 0 : filters.status === 'Graduated' ? 2 : filters.status === 'Dropped' ? 3 : undefined;
      if (statusNum !== undefined) {
        where.status = statusNum;
      }
    }
    if (filters.search) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q } },
        { user_email: { contains: q } },
        { phone: { contains: q } },
        { student_id: { contains: q } },
      ];
    }

    // Counsellor scoping (Naji 2026-06-15): a counsellor (role 9) only sees
    // THEIR students. The primary link is the application: an application
    // carries `pipeline_user` = the owning counsellor, and the converted
    // student carries that application's id in `application_id`. Also include
    // any students directly created/referred/assigned to them. Admins (roles
    // 1/8) keep seeing all. Kept on `where.AND` so it composes with the search
    // `where.OR` above.
    if (scope === 'admin' && actorUserId) {
      const actor = await this.prisma.users.findFirst({
        where: { id: toIntId(actorUserId), deleted_at: null },
        select: { id: true, role_id: true },
      });
      if (actor?.role_id === 9) {
        const ownedApps = await this.prisma.applications.findMany({
          where: { pipeline_user: actor.id },
          select: { id: true },
        });
        const ownedAppIds = ownedApps.map((a) => a.id);
        where.AND = [{
          OR: [
            ...(ownedAppIds.length > 0 ? [{ application_id: { in: ownedAppIds } }] : []),
            { created_by: actor.id },
            { referred_by: actor.id },
            { counsellor_id: actor.id },
          ],
        }];
      }
    }

    const users = await this.prisma.users.findMany({
      where: where as Prisma.usersWhereInput,
      select: {
        id: true, student_id: true, name: true, user_email: true, phone: true,
        course_id: true, added_under_centre: true, status: true,
        image: true, profile_picture: true, email: true,
        disabled_at: true,
      },
      orderBy: { id: 'desc' },
    });

    // LEFT JOIN enrol and course
    const userIds = users.map(u => u.id);
    const enrolments = userIds.length > 0 ? await this.prisma.enrol.findMany({
      where: { user_id: { in: userIds }, deleted_at: null },
      select: { user_id: true, course_id: true, enrollment_status: true, enrollment_id: true, batch_id: true, enrollment_date: true, created_at: true },
      // Earliest-first so the per-user "enrolled_date" (first-row-wins below)
      // is the chronologically earliest enrolment, not arbitrary DB order.
      orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
    }) : [];

    // If batch filter, restrict to users who have enrolment in that batch
    let filteredUserIds: Set<number> | null = null;
    if (filters.batchId) {
      const batchIdNum = toIntId(filters.batchId);
      filteredUserIds = new Set(
        enrolments
          .filter(e => e.batch_id === batchIdNum && e.user_id !== null && e.user_id !== undefined)
          .map(e => e.user_id as number),
      );
    }

    const courseIds = [...new Set([
      ...users.map(u => u.course_id).filter((x): x is number => x !== null && x !== undefined),
      ...enrolments.map(e => e.course_id).filter((x): x is number => x !== null && x !== undefined),
    ])];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));

    // Fetch centres for display
    const centreNums = [...new Set(users.map(u => u.added_under_centre).filter((x): x is number => x !== null && x !== undefined))];
    const centres = centreNums.length > 0 ? await this.prisma.centres.findMany({ where: { deleted_at: null }, select: { id: true, centre_name: true } }) : [];

    // Fetch batches for display
    const batchIds = [...new Set(enrolments.map(e => e.batch_id).filter((x): x is number => x !== null && x !== undefined))];
    const batches = batchIds.length > 0 ? await this.prisma.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, title: true } }) : [];
    const batchMap = new Map(batches.map(b => [b.id, b]));

    // Counsellor My Enrollments table (Naji 2026-06-29) — three additive,
    // fully batched per-student fields: enrolled_date, fee_status, progress_pct.
    // No N+1: each is a single IN(...) query mapped by user_id / course_id.

    // (a) enrolled_date — earliest enrolment per user. enrol.enrollment_date
    //     is a free-text String (legacy) and enrol.created_at is a DateTime.
    //     Prefer the String date when it parses; else fall back to created_at.
    //     Return an ISO date (YYYY-MM-DD) string, '' when unknown. Never feed
    //     a bare date string to `new Date(str)` (UTC day-shift) — parse parts.
    const enrolledDateByUser = new Map<number, string>();
    for (const e of enrolments) {
      if (e.user_id === null || e.user_id === undefined) continue;
      if (enrolledDateByUser.has(e.user_id)) continue;
      const iso = isoDateFromEnrolment(e.enrollment_date, e.created_at);
      if (iso) enrolledDateByUser.set(e.user_id, iso);
    }

    // (b) fee_status — Paid / Partial / Pending / Overdue per student, derived
    //     from student_payments (user_id = users.id). Legacy rows store
    //     '0000-00-00' in due_date/paid_date which CRASHES Prisma findMany —
    //     read via $queryRaw with NULLIF so the sentinel becomes NULL. One
    //     batched query for all listed users.
    type FeeRow = { user_id: number; status: string | null; due_date: Date | null; paid_date: Date | null };
    const feePayments = userIds.length > 0
      ? await this.prisma.$queryRaw<FeeRow[]>`
          SELECT user_id, status,
                 NULLIF(due_date, '0000-00-00') AS due_date,
                 NULLIF(paid_date, '0000-00-00') AS paid_date
          FROM student_payments
          WHERE deleted_at IS NULL AND user_id IN (${Prisma.join(userIds)})`
      : [];
    const feeStatusByUser = deriveFeeStatusByUser(feePayments);

    // (c) progress_pct — completed lesson_files (video_progress_status.status=1)
    //     / total lesson_files for the student's enrolled course. Best-effort
    //     and fully batched (groupBy + IN), mirroring engagement-service. When
    //     a course has zero lesson_files (no content) the denominator is 0 and
    //     we return null for that student rather than a fabricated number.
    const progressCourseIds = [...new Set(
      enrolments.map(e => e.course_id).filter((x): x is number => x !== null && x !== undefined),
    )];
    const completedByUserCourse = userIds.length > 0 && progressCourseIds.length > 0
      ? await this.prisma.video_progress_status.groupBy({
          by: ['user_id', 'course_id'],
          where: { user_id: { in: userIds }, course_id: { in: progressCourseIds }, status: 1, deleted_at: null },
          _count: { id: true },
        })
      : [];
    const completedMap = new Map<string, number>();
    for (const c of completedByUserCourse) {
      if (c.user_id === null || c.course_id === null) continue;
      completedMap.set(`${c.user_id}|${c.course_id}`, c._count?.id ?? 0);
    }
    // Denominator: total lesson_files per course (via lesson → lesson_files).
    const progressLessons = progressCourseIds.length > 0
      ? await this.prisma.lesson.findMany({
          where: { course_id: { in: progressCourseIds }, deleted_at: null },
          select: { id: true, course_id: true },
        })
      : [];
    const lessonIdsByCourse = new Map<number, number[]>();
    for (const l of progressLessons) {
      if (l.course_id === null || l.course_id === undefined) continue;
      const arr = lessonIdsByCourse.get(l.course_id) ?? [];
      arr.push(l.id);
      lessonIdsByCourse.set(l.course_id, arr);
    }
    const progressLessonIds = progressLessons.map(l => l.id);
    const filesPerLessonRows = progressLessonIds.length > 0
      ? await this.prisma.lesson_files.groupBy({
          by: ['lesson_id'],
          where: { lesson_id: { in: progressLessonIds }, deleted_at: null },
          _count: { id: true },
        })
      : [];
    const filesPerLesson = new Map<number, number>();
    for (const f of filesPerLessonRows) {
      filesPerLesson.set(f.lesson_id, f._count?.id ?? 0);
    }
    const totalFilesByCourse = new Map<number, number>();
    for (const [cid, lessonIds] of lessonIdsByCourse) {
      let total = 0;
      for (const lid of lessonIds) total += filesPerLesson.get(lid) ?? 0;
      totalFilesByCourse.set(cid, total);
    }
    const progressFor = (userId: number, courseId: number | null | undefined): number | null => {
      if (courseId === null || courseId === undefined) return null;
      const total = totalFilesByCourse.get(courseId) ?? 0;
      if (total === 0) return null; // no content to measure against — don't fabricate
      const done = completedMap.get(`${userId}|${courseId}`) ?? 0;
      return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
    };

    const statusLabels: Record<number, string> = { 0: 'Inactive', 1: 'Active', 2: 'Graduated', 3: 'Dropped' };

    // Group enrolments per user once (avoids an O(n·m) find in the map below)
    // and derive a REAL enrolment count + a robust course. Naji 2026-07-09:
    // the "Enrollments" column was a hardcoded frontend `|| 1` and "Courses"
    // showed N/A whenever the enrol row's course_id didn't equal users.course_id.
    const enrolsByUser = new Map<number, typeof enrolments>();
    for (const e of enrolments) {
      if (e.user_id === null || e.user_id === undefined) continue;
      const arr = enrolsByUser.get(e.user_id) ?? [];
      arr.push(e);
      enrolsByUser.set(e.user_id, arr);
    }

    return users
      .filter(u => filteredUserIds === null || filteredUserIds.has(u.id))
      .map(u => {
        const userEnrols = enrolsByUser.get(u.id) ?? [];
        // Prefer an enrol row matching the user's own course; else the earliest.
        const enrol = userEnrols.find(e => e.course_id === u.course_id) ?? userEnrols[0] ?? null;
        // Real count of enrol rows; fall back to 1 when the student carries a
        // course on their user row but has no enrol row yet (legacy import).
        const enrolmentCount = userEnrols.length > 0 ? userEnrols.length : (u.course_id ? 1 : 0);
        const courseTitle = enrol?.course_id
          ? (courseMap.get(enrol.course_id)?.title ?? null)
          : (u.course_id ? (courseMap.get(u.course_id)?.title ?? null) : null);
        // Legacy data populates `profile_picture` for almost every student;
        // `image` is set on rows created by the new LMS. Surface both as
        // absolute URLs and let the frontend pick whichever is non-empty.
        const photo = toLegacyFileUrl(u.image) || toLegacyFileUrl(u.profile_picture);
        return {
          ...u,
          image: photo,
          profile_picture: toLegacyFileUrl(u.profile_picture),
          course_enrol_status: enrol?.enrollment_status ?? null,
          enrollment_id: enrol?.enrollment_id ?? null,
          batch_id: enrol?.batch_id ?? null,
          batch_title: enrol?.batch_id ? batchMap.get(enrol.batch_id)?.title ?? null : null,
          course_title: courseTitle,
          enrolment_count: enrolmentCount,
          centre_name: centres.find(c => u.added_under_centre !== null && u.added_under_centre !== undefined && c.id === u.added_under_centre)?.centre_name ?? null,
          status_label: u.status !== null && u.status !== undefined ? (statusLabels[u.status] ?? 'Unknown') : 'Unknown',
          enrolled_date: enrolledDateByUser.get(u.id) ?? '',
          fee_status: feeStatusByUser.get(u.id) ?? 'Pending',
          progress_pct: progressFor(u.id, enrol?.course_id ?? u.course_id),
        };
      }) as unknown as SqlRow[];
  }

  async listCentres(): Promise<SqlRow[]> {
    const allCentres = await this.prisma.centres.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });

    // Subquery: count students per centre
    const centreIds = allCentres.map(c => c.id);
    const studentCounts = centreIds.length > 0
      ? await this.prisma.users.groupBy({
          by: ['added_under_centre'],
          where: { role_id: 2, deleted_at: null, added_under_centre: { not: null } },
          _count: { id: true },
        })
      : [];

    const countMap = new Map(studentCounts.map(sc => [sc.added_under_centre, sc._count.id]));

    // Naji UAT 2026-05-15 — surface the linked Centre user (role_id=7)
    // so the directory can render a Resend Login Email row action that
    // flows through the existing resendLoginCredentials path (same
    // pattern as Instructors / Counsellors / Associates).
    //
    // The linkage lives on users.centre_id (text — historical PHP
    // quirk) pointing back at centres.id, NOT on centres.user_id.
    const centreIdsAsStr = centreIds.map(id => String(id));
    const centreUsers = centreIdsAsStr.length > 0
      ? await this.prisma.users.findMany({
          where: {
            role_id: 7,
            deleted_at: null,
            centre_id: { in: centreIdsAsStr },
          },
          select: { id: true, centre_id: true, user_email: true },
        })
      : [];
    const userByCentre = new Map<string, { id: number; user_email: string | null }>();
    for (const u of centreUsers) {
      if (u.centre_id && !userByCentre.has(u.centre_id)) {
        userByCentre.set(u.centre_id, { id: u.id, user_email: u.user_email });
      }
    }

    return allCentres.map(c => {
      const linked = userByCentre.get(String(c.id));
      return {
        ...c,
        students_count: countMap.get(c.id) ?? 0,
        linked_user_id: linked?.id ?? null,
        linked_user_email: linked?.user_email ?? c.email ?? null,
      };
    }) as unknown as SqlRow[];
  }

  async addCentre(actorUserId: string, input: CentreInput): Promise<Record<string, unknown>> {
    const now = new Date();

    const duplicateCount = await this.prisma.centres.count({
      where: {
        deleted_at: null,
        OR: [
          { country_code: input.countryCode, phone: input.phone },
          { email: input.email },
        ],
      },
    });

    if (duplicateCount > 0) {
      return {
        status: 0,
        message: 'Centre with same phone or email already exists',
      };
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const latestCentre = await tx.centres.findFirst({
        where: { deleted_at: null },
        orderBy: { id: 'desc' },
        select: { centre_id: true },
      });
      const nextCentreCode = toInteger(latestCentre?.centre_id) + 1;

      const centre = await tx.centres.create({
        data: {
          centre_id: String(nextCentreCode),
          centre_name: input.centreName,
          contact_person: input.contactPerson,
          country_code: input.countryCode,
          phone: input.phone,
          whatsapp: input.phone,
          secondary_phone: '',
          email: input.email,
          address: input.address,
          date_of_registration: toNullableString(input.registrationDate),
          date_of_expiry: toNullableString(input.expiryDate),
          wallet_balance: '0',
          created_by: toIntId(actorUserId),
          updated_by: toIntId(actorUserId),
          created_at: now,
          updated_at: now,
        },
      });

      // Generate a secure temp password and email it to the centre admin.
      // The admin-supplied password / "Centre@1234" fallback are no longer
      // used (per Naji's QA round 2026-04-30).
      const { issueAndEmailCredentials } = await import('../auth/credentials-issuer.js');
      const creds = await issueAndEmailCredentials({
        name: input.contactPerson || input.centreName,
        email: input.email,
        roleLabel: 'Centre admin',
      });

      await tx.users.create({
        data: {
          name: input.centreName,
          user_email: input.email,
          country_code: input.countryCode,
          phone: input.phone,
          role_id: 7,
          centre_id: String(centre.id),
          password: creds.hashedPassword,
          status: 1,
          gender: '',
          dynamic_link: '',
          image: input.image?.trim() ?? '',
          profile_picture: input.image?.trim() ?? '',
          application_id: 0,
          created_by: toIntId(actorUserId),
          updated_by: toIntId(actorUserId),
          created_at: now,
          updated_at: now,
        },
      });

      return {
        centreDbId: centre.id,
        centreCode: `TTC${String(nextCentreCode).padStart(4, '0')}`,
      };
    });

    return {
      status: 1,
      message: 'Centre Added Successfully!',
      data: {
        centre_id: created.centreDbId,
        centre_code: created.centreCode,
      },
    };
  }

  async assignCentrePlan(actorUserId: string, input: CentrePlanInput): Promise<Record<string, unknown>> {
    const centreIdInt = toIntId(input.centreId);
    const courseIdInt = toIntId(input.courseId);

    if (!centreIdInt || !courseIdInt) {
      return {
        status: 0,
        message: 'Centre or course is invalid',
      };
    }

    const duplicateCount = await this.prisma.centre_course_plans.count({
      where: { centre_id: centreIdInt, course_id: courseIdInt, deleted_at: null },
    });

    if (duplicateCount > 0) {
      return {
        status: 0,
        message: 'Already assigned to this course',
      };
    }

    const now = new Date();

    await this.prisma.centre_course_plans.create({
      data: {
        centre_id: centreIdInt,
        course_id: courseIdInt,
        assigned_amount: String(input.assignedAmount),
        start_date: new Date(input.startDate),
        end_date: new Date(input.endDate),
        created_by: toIntId(actorUserId),
        updated_by: toIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return {
      status: 1,
      message: 'Course Assigned Successfully!',
    };
  }

  async listCentreCohorts(actorUserId: string): Promise<SqlRow[]> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
      return [];
    }

    const cohorts = await this.prisma.cohorts.findMany({
      where: { deleted_at: null, centre_id: toIntId(centreId) },
      orderBy: { id: 'desc' },
    });

    const cohortIds = cohorts.map(c => c.id);
    const cohortIdStrs = cohorts.map(c => String(c.id));
    const subjectIds = [...new Set(cohorts.map(c => c.subject_id).filter((x): x is number => x !== null && x !== undefined))];
    const courseIds = [...new Set(cohorts.map(c => c.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const instructorIds = [...new Set(cohorts.map(c => c.instructor_id).filter((x): x is number => x !== null && x !== undefined))];

    const [subjects, courses, instructors, studentCounts, liveClassCounts] = await Promise.all([
      subjectIds.length > 0 ? this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, title: true } }) : [],
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      instructorIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: instructorIds } }, select: { id: true, name: true } }) : [],
      cohortIdStrs.length > 0 ? this.prisma.cohort_students.groupBy({ by: ['cohort_id'], where: { cohort_id: { in: cohortIdStrs }, deleted_at: null }, _count: { id: true } }) : [],
      cohortIds.length > 0 ? this.prisma.live_class.groupBy({ by: ['cohort_id'], where: { cohort_id: { in: cohortIds }, deleted_at: null }, _count: { id: true } }) : [],
    ]);

    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const courseMap = new Map(courses.map(c => [c.id, c]));
    const instructorMap = new Map(instructors.map(i => [i.id, i]));
    const studentCountMap = new Map(studentCounts.map((sc) => [sc.cohort_id, sc._count?.id ?? 0]));
    const liveCountMap = new Map(liveClassCounts.map((lc) => [lc.cohort_id, lc._count?.id ?? 0]));

    return cohorts.map((entry) => ({
      id: entry.id,
      subject_id: entry.subject_id,
      course_id: entry.course_id,
      language_id: entry.language_id,
      centre_id: entry.centre_id,
      cohort_id: toStringValue(entry.cohort_id),
      title: toStringValue(entry.title),
      start_date: toStringValue(entry.start_date),
      end_date: toStringValue(entry.end_date),
      instructor_id: entry.instructor_id,
      created_at: toStringValue(entry.created_at),
      updated_at: toStringValue(entry.updated_at),
      subject_name: entry.subject_id ? subjectMap.get(entry.subject_id)?.title ?? '' : '',
      course_name: entry.course_id ? courseMap.get(entry.course_id)?.title ?? '' : '',
      instructor_name: entry.instructor_id ? instructorMap.get(entry.instructor_id)?.name ?? '' : '',
      students_count: studentCountMap.get(String(entry.id)) ?? 0,
      lives_classes_count: liveCountMap.get(entry.id) ?? 0,
    }));
  }

  async addCentreCohort(actorUserId: string, input: CohortInput): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    if (!centreId) {
      return {
        success: false,
        message: 'Centre is not assigned for current user.',
      };
    }

    const courseIdInt = toIntId(input.courseId);
    const subjectIdInt = toIntId(input.subjectId);

    const duplicateCount = await this.prisma.cohorts.count({
      where: { deleted_at: null, centre_id: toIntId(centreId), course_id: courseIdInt, subject_id: subjectIdInt },
    });

    if (duplicateCount > 0) {
      return {
        success: false,
        message: 'Cohort with this subject already exists for this course!',
      };
    }

    const now = new Date();

    const created = await this.prisma.cohorts.create({
      data: {
        cohort_id: input.cohortCode?.trim() ? input.cohortCode : `COH-${Date.now()}`,
        title: input.title,
        course_id: courseIdInt,
        subject_id: subjectIdInt,
        instructor_id: toNullableIntId(input.instructorId),
        start_date: new Date(input.startDate),
        end_date: new Date(input.endDate),
        centre_id: toIntId(centreId),
        created_by: toNullableIntId(actorUserId),
        updated_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return {
      success: true,
      message: 'Cohort added successfully!',
      data: {
        cohort_id: created.id,
        subject_id: input.subjectId,
      },
    };
  }

  async addCentreCohortStudents(actorUserId: string, input: AddCohortStudentsInput): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    const cohortIdStr = String(input.cohortId);

    if (!centreId || !cohortIdStr) {
      return {
        success: false,
        message: 'Invalid cohort selection',
      };
    }

    const cohort = await this.prisma.cohorts.findFirst({
      where: { id: toIntId(cohortIdStr), centre_id: toIntId(centreId), deleted_at: null },
      select: { id: true },
    });

    if (!cohort) {
      return {
        success: false,
        message: 'Cohort not found for centre',
      };
    }

    const now = new Date();
    let inserted = 0;

    for (const studentId of input.studentIds) {
      const studentIdInt = toIntId(studentId);
      if (!studentIdInt) {
        continue;
      }

      const existing = await this.prisma.cohort_students.count({
        where: { cohort_id: cohortIdStr, user_id: studentIdInt, deleted_at: null },
      });

      if (existing > 0) {
        continue;
      }

      await this.prisma.cohort_students.create({
        data: {
          cohort_id: cohortIdStr,
          user_id: studentIdInt,
          created_by: toNullableIntId(actorUserId),
          updated_by: toNullableIntId(actorUserId),
          created_at: now,
          updated_at: now,
        },
      });

      inserted += 1;
    }

    return {
      success: true,
      message: inserted > 0 ? 'Learners added successfully!' : 'No new learners added',
      added_count: inserted,
    };
  }

  // ── Teams meeting host allowlist + creation helpers ─────────────

  private async createTeamsService() {
    const { createTeamsMeetingServiceFromEnv } = await import('../integrations/teams-scheduling.js');
    return createTeamsMeetingServiceFromEnv();
  }

  async listTeamsMeetingHosts(): Promise<SqlRow[]> {
    const rows = await this.prisma.teams_meeting_hosts.findMany({
      where: { deleted_at: null },
      orderBy: [{ is_active: 'desc' }, { teams_email: 'asc' }],
    });
    return rows as unknown as SqlRow[];
  }

  /** Auto-pick the first active Teams host with no live_class conflict across
   * every entry in the scheduling request. Returns { host: null, reason } when
   * the entire pool is busy for at least one entry's slot. Conflict check uses
   * the primary date + time window of each entry; repeat-date occurrences are
   * not yet considered (TODO when scheduler supports recurrence natively).
   */
  private async pickAvailableTeamsHost(
    entries: LiveClassEntryInput[],
  ): Promise<{ host: { teams_email: string } | null; reason?: string }> {
    // Shared with the instructor scheduling flow (Naji/Risha 2026-07-06).
    const { pickAvailableTeamsHost } = await import('../integrations/teams-scheduling.js');
    return pickAvailableTeamsHost(this.prisma, entries);
  }

  async addTeamsMeetingHost(
    actorUserId: string,
    input: { teamsEmail: string; displayName?: string | undefined; userId?: string | undefined; isActive?: boolean | undefined },
  ): Promise<Record<string, unknown>> {
    const email = input.teamsEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, message: 'Invalid email address.' };
    }
    const existing = await this.prisma.teams_meeting_hosts.findFirst({ where: { teams_email: email } });
    if (existing && !existing.deleted_at) {
      return { success: false, message: 'This trainer email is already in the allowlist.' };
    }
    const now = new Date();
    if (existing && existing.deleted_at) {
      // Reactivate a previously soft-deleted row
      await this.prisma.teams_meeting_hosts.update({
        where: { id: existing.id },
        data: {
          display_name: input.displayName ?? existing.display_name,
          user_id: input.userId ? toNullableIntId(input.userId) : existing.user_id,
          is_active: input.isActive === false ? 0 : 1,
          deleted_at: null,
          updated_by: toNullableIntId(actorUserId),
          updated_at: now,
          last_error: null,
        },
      });
      return { success: true, id: existing.id };
    }
    const created = await this.prisma.teams_meeting_hosts.create({
      data: {
        teams_email: email,
        display_name: input.displayName ?? null,
        user_id: input.userId ? toNullableIntId(input.userId) : null,
        is_active: input.isActive === false ? 0 : 1,
        created_by: toNullableIntId(actorUserId),
        updated_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });
    return { success: true, id: created.id };
  }

  async updateTeamsMeetingHost(
    actorUserId: string,
    id: string,
    input: { displayName?: string | undefined; isActive?: boolean | undefined },
  ): Promise<Record<string, unknown>> {
    const hostId = toIntId(id);
    const data: Record<string, unknown> = {
      updated_by: toNullableIntId(actorUserId),
      updated_at: new Date(),
    };
    if (input.displayName !== undefined) data.display_name = input.displayName;
    if (input.isActive !== undefined) data.is_active = input.isActive ? 1 : 0;
    await this.prisma.teams_meeting_hosts.update({ where: { id: hostId }, data });
    return { success: true };
  }

  async deleteTeamsMeetingHost(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    const hostId = toIntId(id);
    await this.prisma.teams_meeting_hosts.update({
      where: { id: hostId },
      data: {
        deleted_at: new Date(),
        is_active: 0,
        updated_by: toNullableIntId(actorUserId),
      },
    });
    return { success: true };
  }

  /** Probe: create a short test meeting, immediately return the result (don't save). */
  async testTeamsMeetingHost(id: string): Promise<Record<string, unknown>> {
    const hostId = toIntId(id);
    const host = await this.prisma.teams_meeting_hosts.findFirst({ where: { id: hostId, deleted_at: null } });
    if (!host) return { success: false, message: 'Host not found.' };
    const svc = await this.createTeamsService();
    if (!svc) return { success: false, message: 'Teams integration not configured (EMAIL_MSGRAPH_* env vars missing).' };
    const now = new Date();
    const start = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    const end = new Date(now.getTime() + 35 * 60 * 1000).toISOString();
    try {
      const meeting = await svc.createMeeting({
        hostEmail: host.teams_email,
        subject: 'TTII LMS — Teams policy verification (safe to ignore)',
        startDateTime: start,
        endDateTime: end,
      });
      await this.prisma.teams_meeting_hosts.update({
        where: { id: hostId },
        data: { policy_verified_at: new Date(), last_error: null },
      });
      return { success: true, joinUrl: meeting.joinUrl, meetingId: meeting.meetingId };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.prisma.teams_meeting_hosts.update({
        where: { id: hostId },
        data: { last_error: msg.substring(0, 1000) },
      });
      return { success: false, message: msg };
    }
  }

  async listLiveClasses(scope: 'admin' | 'centre', actorUserId: string): Promise<SqlRow[]> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : '';

    if (scope === 'centre' && !centreId) {
      return [];
    }

    // For centre scope, first find cohort IDs belonging to that centre
    let cohortFilter: number[] | undefined;
    if (scope === 'centre' && centreId) {
      const centreCohorts = await this.prisma.cohorts.findMany({
        where: { centre_id: toIntId(centreId), deleted_at: null },
        select: { id: true },
      });
      cohortFilter = centreCohorts.map(c => c.id);
    }

    const liveClasses = await this.prisma.live_class.findMany({
      where: {
        deleted_at: null,
        ...(cohortFilter ? { cohort_id: { in: cohortFilter } } : {}),
      },
      orderBy: { id: 'desc' },
    });

    // LEFT JOIN cohorts and courses
    const cohortIds = [...new Set(liveClasses.map(lc => lc.cohort_id).filter((x): x is number => x !== null && x !== undefined))];
    const cohorts = cohortIds.length > 0 ? await this.prisma.cohorts.findMany({ where: { id: { in: cohortIds } }, select: { id: true, title: true, course_id: true } }) : [];
    const cohortMap = new Map(cohorts.map(c => [c.id, c]));
    const courseIds = [...new Set(cohorts.map(c => c.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));

    return liveClasses.map(lc => {
      const cohort = lc.cohort_id ? cohortMap.get(lc.cohort_id) : null;
      return {
        ...lc,
        cohort_title: cohort?.title ?? null,
        course_title: cohort?.course_id ? courseMap.get(cohort.course_id)?.title ?? null : null,
      };
    }) as unknown as SqlRow[];
  }

  async addLiveClasses(
    scope: 'admin' | 'centre' | 'instructor',
    actorUserId: string,
    input: AddLiveClassInput,
  ): Promise<Record<string, unknown>> {
    const cohortIdStr = String(input.cohortId);
    if (!cohortIdStr || input.entries.length === 0) {
      return {
        success: false,
        message: 'No live class entries provided!',
      };
    }

    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : '';

    const cohortWhere: Record<string, unknown> = { id: toIntId(cohortIdStr), deleted_at: null };
    if (scope === 'centre' && centreId) {
      cohortWhere.centre_id = toIntId(centreId);
    }
    // Ownership: an instructor may only add sessions to cohorts assigned to them
    // (Naji/Risha 2026-07-06). A non-owned cohort simply won't match → the
    // "Instructor not set, Live class not added!" guard below returns cleanly.
    if (scope === 'instructor') {
      cohortWhere.instructor_id = toIntId(actorUserId);
    }

    const cohort = await this.prisma.cohorts.findFirst({
      where: cohortWhere as Prisma.cohortsWhereInput,
      select: { id: true, instructor_id: true, centre_id: true, course_id: true },
    });

    if (!cohort || !cohort.instructor_id) {
      return {
        success: false,
        message: 'Instructor not set, Live class not added!',
      };
    }

    const now = new Date();
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    const parseTime = (t: string): Date => {
      // Accept "HH:MM" or "HH:MM:SS" — stored as Time in DB but Prisma needs a Date
      const cleaned = /^\d{1,2}:\d{2}(:\d{2})?$/.test(t) ? (t.length === 5 ? `${t}:00` : t) : '00:00:00';
      return new Date(`1970-01-01T${cleaned}Z`);
    };

    // Platform dispatch: validate allowlist / resolve URLs up front so we can
    // fail fast with a clear message before creating DB rows.
    const platform = input.platform ?? 'zoom';

    // For Teams: auto-assign a free host from the pool. Per product decision
    // (Naji 2026-04-30): no manual override — system picks the first available
    // active host whose calendar has no overlapping live_class in the requested
    // window. If none free, hard-block with a clear warning.
    let teamsHostEmail: string | null = null;
    if (platform === 'teams') {
      const assignment = await this.pickAvailableTeamsHost(input.entries);
      if (!assignment.host) {
        return {
          success: false,
          message:
            assignment.reason ??
            'No faculty Teams account is free for the selected time slot. Pick a different time or add another host under Integrations → Teams Meeting Hosts.',
        };
      }
      teamsHostEmail = assignment.host.teams_email;
    }

    if (platform === 'manual' || platform === 'other') {
      if (!input.manualJoinUrl || !input.manualJoinUrl.trim()) {
        return { success: false, message: 'Manual/External platform selected but no meeting URL provided.' };
      }
    }

    // Lazy import to avoid loading MSAL unless we actually need it.
    const teamsService = platform === 'teams' ? await this.createTeamsService() : null;
    if (platform === 'teams' && !teamsService) {
      return {
        success: false,
        message: 'Teams meeting integration is not configured on the server (EMAIL_MSGRAPH_* env vars missing).',
      };
    }

    for (const entry of input.entries) {
      try {
        // Per-entry platform-specific meeting resolution
        let joinUrl: string | null = null;
        let externalMeetingId: string | null = null;
        let hostEmail: string | null = null;

        if (platform === 'teams' && teamsService && teamsHostEmail) {
          // Build ISO start/end from date + times (treat times as local; Graph accepts a Z suffix — we use UTC naively).
          const dateOnly = entry.date; // YYYY-MM-DD
          const start = new Date(`${dateOnly}T${entry.fromTime.length === 5 ? entry.fromTime + ':00' : entry.fromTime}Z`);
          const end = new Date(`${dateOnly}T${entry.toTime.length === 5 ? entry.toTime + ':00' : entry.toTime}Z`);
          try {
            const meeting = await teamsService.createMeeting({
              hostEmail: teamsHostEmail,
              subject: entry.title,
              startDateTime: start.toISOString(),
              endDateTime: end.toISOString(),
            });
            joinUrl = meeting.joinUrl;
            externalMeetingId = meeting.meetingId;
            hostEmail = teamsHostEmail;
            // Best-effort: mark host as policy-verified on first successful meeting
            await this.prisma.teams_meeting_hosts.updateMany({
              where: { teams_email: teamsHostEmail },
              data: { policy_verified_at: now, last_error: null },
            });
          } catch (err) {
            failedCount += 1;
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`Teams meeting creation failed for "${entry.title}": ${msg}`);
            // Persist the error against the host row so admins see why
            await this.prisma.teams_meeting_hosts.updateMany({
              where: { teams_email: teamsHostEmail },
              data: { last_error: msg.substring(0, 1000) },
            });
            continue;
          }
        } else if (platform === 'manual' || platform === 'other') {
          joinUrl = input.manualJoinUrl ?? null;
        }

        await this.prisma.live_class.create({
          data: {
            cohort_id: toIntId(cohortIdStr),
            session_id: entry.sessionId,
            title: entry.title,
            course_id: String(cohort.course_id ?? ''),
            date: new Date(entry.date),
            fromTime: parseTime(entry.fromTime),
            toTime: parseTime(entry.toTime),
            status: 'scheduled',
            repeat_dates: JSON.stringify(entry.repeatDates),
            platform,
            zoom_id: platform === 'zoom' ? input.zoomId : null,
            password: platform === 'zoom' ? input.password : null,
            join_url: joinUrl,
            external_meeting_id: externalMeetingId,
            host_email: hostEmail,
            is_repetitive: entry.isRepetitive,
            created_by: toNullableIntId(actorUserId),
            updated_by: toNullableIntId(actorUserId),
            created_at: now,
            updated_at: now,
          },
        });

        successCount += 1;
      } catch (err) {
        failedCount += 1;
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }

    if (successCount === 0) {
      return {
        success: false,
        message: errors.length > 0 ? `Failed to add live classes: ${errors[0]}` : 'Failed to add live classes!',
        errors,
      };
    }

    if (failedCount === 0) {
      return {
        success: true,
        message: `All ${successCount} live class(es) added successfully!`,
      };
    }

    return {
      success: true,
      message: `${successCount} live class(es) added successfully, ${failedCount} failed!`,
    };
  }

  async listResources(scope: 'admin' | 'centre', actorUserId: string, input: ResourceListInput): Promise<Record<string, unknown>> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : (input.centreId ? String(input.centreId) : '');
    const hasCentreScope = scope === 'centre' || !!centreId;
    const folderIdStr = input.folderId ? input.folderId : '';
    const folderIdInt = folderIdStr ? toIntId(folderIdStr) : null;
    const centreIdInt = centreId ? toNullableIntId(centreId) : null;

    const folderWhere: Record<string, unknown> = { deleted_at: null };
    if (hasCentreScope) {
      folderWhere.centre_id = centreIdInt;
    }

    const currentFolder = folderIdInt
      ? await this.prisma.folders.findFirst({
          where: { ...folderWhere, id: folderIdInt } as Prisma.foldersWhereInput,
          select: { id: true, name: true, parent_id: true, centre_id: true },
        })
      : null;

    const folders = await this.prisma.folders.findMany({
      where: { ...folderWhere, parent_id: folderIdInt ?? null } as Prisma.foldersWhereInput,
      select: { id: true, name: true, parent_id: true, centre_id: true },
      orderBy: { id: 'asc' },
    });

    const fileWhere: Record<string, unknown> = { deleted_at: null };
    if (folderIdInt) {
      fileWhere.folder_id = folderIdInt;
    }
    if (hasCentreScope) {
      fileWhere.centre_id = centreIdInt;
    }

    const files = folderIdInt
      ? await this.prisma.files.findMany({
          where: fileWhere as Prisma.filesWhereInput,
          select: { id: true, folder_id: true, name: true, type: true, size: true, path: true, centre_id: true, created_at: true },
          orderBy: { id: 'asc' },
        })
      : [];

    return {
      folder_id: folderIdStr || 0,
      current_folder: currentFolder,
      folders,
      files,
    };
  }

  async addFolder(scope: 'admin' | 'centre', actorUserId: string, input: AddFolderInput): Promise<Record<string, unknown>> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : (input.centreId ? String(input.centreId) : '');
    const now = new Date();

    const created = await this.prisma.folders.create({
      data: {
        name: input.name,
        parent_id: input.parentId ? toIntId(input.parentId) : null,
        centre_id: centreId ? toNullableIntId(centreId) : null,
        created_by: toNullableIntId(actorUserId),
        updated_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return {
      status: 1,
      message: 'Folder added successfully!',
      data: {
        folder_id: created.id,
      },
    };
  }

  async addFile(scope: 'admin' | 'centre', actorUserId: string, input: AddFileInput): Promise<Record<string, unknown>> {
    const centreId = scope === 'centre' ? await this.resolveActorCentreId(actorUserId) : (input.centreId ? String(input.centreId) : '');
    const now = new Date();

    const created = await this.prisma.files.create({
      data: {
        folder_id: input.folderId ? toIntId(input.folderId) : 0,
        name: input.name,
        type: input.fileType,
        size: typeof input.size === 'number' ? input.size : toInteger(input.size),
        path: input.path,
        centre_id: centreId ? toNullableIntId(centreId) : null,
        created_by: toNullableIntId(actorUserId),
        updated_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return {
      status: 1,
      message: 'File uploaded successfully!',
      data: {
        file_id: created.id,
      },
    };
  }

  async getSystemSettings(): Promise<Record<string, unknown>> {
    const [systemSettings, frontendSettings, appVersion] = await Promise.all([
      this.prisma.settings.findMany({
        where: { deleted_at: null },
        select: { key: true, value: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.frontend_settings.findMany({
        where: { deleted_at: null },
        select: { key: true, value: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.app_version.findFirst({
        where: { deleted_at: null },
        select: { id: true, app_version: true, app_version_ios: true },
        orderBy: { id: 'desc' },
      }),
    ]);

    return {
      system_settings: systemSettings,
      frontend_settings: frontendSettings,
      app_version: appVersion,
    };
  }

  async updateSystemSettings(actorUserId: string, input: UpdateSettingsInput): Promise<void> {
    const now = new Date();

    const actorInt = toNullableIntId(actorUserId);
    const nowSec = Math.floor(now.getTime() / 1000);

    for (const [key, value] of Object.entries(input.system)) {
      const existing = await this.prisma.settings.findFirst({ where: { key }, select: { id: true } });
      if (existing) {
        await this.prisma.settings.update({
          where: { id: existing.id },
          data: { value, updated_by: actorInt, updated_at: now },
        });
      } else {
        await this.prisma.settings.create({
          data: { key, value, created_by: actorInt, updated_by: actorInt, created_at: now, updated_at: now },
        });
      }
    }

    for (const [key, value] of Object.entries(input.frontend)) {
      const existing = await this.prisma.frontend_settings.findFirst({ where: { key }, select: { id: true } });
      if (existing) {
        await this.prisma.frontend_settings.update({
          where: { id: existing.id },
          data: { value, updated_by: actorInt, updated_at: nowSec },
        });
      } else {
        await this.prisma.frontend_settings.create({
          data: { key, value, created_by: actorInt, updated_by: actorInt, created_at: nowSec, updated_at: nowSec },
        });
      }
    }
  }

  async updateAppVersion(actorUserId: string, input: AppVersionInput): Promise<void> {
    const now = new Date();

    const existing = await this.prisma.app_version.findFirst({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.app_version.update({
        where: { id: existing.id },
        data: {
          app_version: input.appVersion,
          app_version_ios: input.appVersionIos,
          updated_by: toNullableIntId(actorUserId),
          updated_at: now,
        },
      });

      return;
    }

    await this.prisma.app_version.create({
      data: {
        app_version: input.appVersion,
        app_version_ios: input.appVersionIos,
        created_by: toNullableIntId(actorUserId),
        updated_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });
  }

  async listLiveReport(liveId: string, joinDate?: string): Promise<Record<string, unknown>> {
    const lives = await this.prisma.live_class.findMany({
      where: { deleted_at: null },
      select: { id: true, title: true, date: true },
      orderBy: { id: 'desc' },
    });

    const zhWhere: Record<string, unknown> = { deleted_at: null };
    if (liveId) {
      zhWhere.live_id = liveId;
    }
    if ((joinDate ?? '').trim() !== '') {
      zhWhere.join_date = new Date(joinDate!);
    }

    const zoomRows = await this.prisma.zoom_history.findMany({
      where: zhWhere as Prisma.zoom_historyWhereInput,
      orderBy: { id: 'desc' },
    });

    // LEFT JOIN users
    const userIds = [...new Set(zoomRows.map(z => z.user_id).filter((x): x is number => x !== null && x !== undefined))];
    const users = userIds.length > 0 ? await this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const rows = zoomRows.map(z => ({
      ...z,
      user_name: z.user_id ? userMap.get(z.user_id)?.name ?? null : null,
    }));

    return {
      lives,
      list_items: rows,
    };
  }

  async globalCalendar(fromDate?: string, toDate?: string): Promise<SqlRow[]> {
    const range = normalizeReportRange(fromDate, toDate);
    const dateFrom = new Date(`${range.fromDate}T00:00:00Z`);
    const dateTo = new Date(`${range.toDate}T23:59:59Z`);

    // UNION ALL via separate queries merged in JS
    const [liveClasses, exams, events] = await Promise.all([
      this.prisma.live_class.findMany({
        where: { deleted_at: null, date: { gte: dateFrom, lte: dateTo } },
        select: { id: true, title: true, date: true, fromTime: true, toTime: true },
      }),
      this.prisma.exam.findMany({
        where: { deleted_at: null, from_date: { gte: dateFrom, lte: dateTo } },
        select: { id: true, title: true, from_date: true, from_time: true, to_time: true },
      }),
      this.prisma.events.findMany({
        where: { deleted_at: null, event_date: { gte: dateFrom, lte: dateTo } },
        select: { id: true, title: true, event_date: true, from_time: true, to_time: true },
      }),
    ]);

    const combined: SqlRow[] = [
      ...liveClasses.map(lc => ({
        id: lc.id,
        title: lc.title,
        event_date: lc.date,
        event_type: 'live_class',
        from_time: lc.fromTime,
        to_time: lc.toTime,
      })),
      ...exams.map(e => ({
        id: e.id,
        title: e.title,
        event_date: e.from_date,
        event_type: 'exam',
        from_time: e.from_time,
        to_time: e.to_time,
      })),
      ...events.map(ev => ({
        id: ev.id,
        title: ev.title,
        event_date: ev.event_date,
        event_type: 'event',
        from_time: ev.from_time,
        to_time: ev.to_time,
      })),
    ];

    combined.sort((a, b) => {
      const dateA = toStringValue(a.event_date);
      const dateB = toStringValue(b.event_date);
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
      return toStringValue(a.id) < toStringValue(b.id) ? -1 : 1;
    });

    return combined;
  }

  async reportSummary(input: ReportSummaryInput): Promise<Record<string, unknown>> {
    const range = normalizeReportRange(input.fromDate, input.toDate);
    const dateFrom = new Date(`${range.fromDate}T00:00:00Z`);
    const dateTo = new Date(`${range.toDate}T23:59:59Z`);

    const appDateFilter = { deleted_at: null, created_at: { gte: dateFrom, lte: dateTo } };

    const [applicationsTotal, applicationsPending, applicationsRejected, studentsTotal, centresTotal, cohortsTotal, liveClassesTotal] = await Promise.all([
      this.prisma.applications.count({ where: appDateFilter as Prisma.applicationsWhereInput }),
      this.prisma.applications.count({ where: { ...appDateFilter, status: 'pending' } as Prisma.applicationsWhereInput }),
      this.prisma.applications.count({ where: { ...appDateFilter, status: 'rejected' } as Prisma.applicationsWhereInput }),
      this.prisma.users.count({ where: { role_id: 2, deleted_at: null } }),
      this.prisma.centres.count({ where: { deleted_at: null } }),
      this.prisma.cohorts.count({ where: { deleted_at: null } }),
      this.prisma.live_class.count({ where: { deleted_at: null } }),
    ]);

    return {
      report_window: range,
      applications_total: applicationsTotal,
      applications_pending: applicationsPending,
      applications_rejected: applicationsRejected,
      students_total: studentsTotal,
      centres_total: centresTotal,
      cohorts_total: cohortsTotal,
      live_classes_total: liveClassesTotal,
    };
  }

  async exportReport(input: ExportReportInput): Promise<{ filename: string; csv: string }> {
    if (input.type === 'live_report') {
      const liveReport = await this.listLiveReport(input.liveId ?? '', input.joinDate);
      const rows = (liveReport.list_items as SqlRow[]).map((entry) => ({
        user_name: toStringValue(entry.user_name),
        live_id: toInteger(entry.live_id),
        join_date: toStringValue(entry.join_date),
        join_time: toStringValue(entry.join_time),
        leave_time: toStringValue(entry.leave_time),
        duration: toStringValue(entry.duration),
      }));

      return {
        filename: 'live-report.csv',
        csv: rowsToCsv(['user_name', 'live_id', 'join_date', 'join_time', 'leave_time', 'duration'], rows),
      };
    }

    const summaryInput: ReportSummaryInput = {};

    if (typeof input.fromDate === 'string' && input.fromDate.trim() !== '') {
      summaryInput.fromDate = input.fromDate;
    }

    if (typeof input.toDate === 'string' && input.toDate.trim() !== '') {
      summaryInput.toDate = input.toDate;
    }

    const summary = await this.reportSummary(summaryInput);

    const reportWindow = summary.report_window as ReportRange;

    const rows = [
      {
        from_date: reportWindow.fromDate,
        to_date: reportWindow.toDate,
        applications_total: summary.applications_total,
        applications_pending: summary.applications_pending,
        applications_rejected: summary.applications_rejected,
        students_total: summary.students_total,
        centres_total: summary.centres_total,
        cohorts_total: summary.cohorts_total,
        live_classes_total: summary.live_classes_total,
      },
    ];

    return {
      filename: 'admin-operations-summary.csv',
      csv: rowsToCsv(
        [
          'from_date',
          'to_date',
          'applications_total',
          'applications_pending',
          'applications_rejected',
          'students_total',
          'centres_total',
          'cohorts_total',
          'live_classes_total',
        ],
        rows,
      ),
    };
  }

  // ─── Phase 1: Admin Dashboard ──────────────────────────────────────────────

  async getAdminDashboard(): Promise<Record<string, unknown>> {
    const range = normalizeReportRange(undefined, undefined);

    // Naji 2026-05-07 reskin: also surface 6-month enrolment trend,
    // 7-day sparkline data per metric, instructor + question counts,
    // and an enrolment progress distribution. Computed in parallel
    // so one extra round-trip doesn't dominate the request.
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const fourteenDaysAgo = new Date(todayUtc.getTime() - 13 * 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

    const [
      coursesCount,
      centresCount,
      studentsCount,
      instructorsCount,
      enrolmentsCount,
      questionsCount,
      paymentsAgg,
      recentStudentRows,
      upcomingEvents,
      enrolmentsLast14Days,
      studentsLast14Days,
      coursesLast14Days,
      enrolmentsLast6Months,
      videoProgressRows,
    ] = await Promise.all([
      this.prisma.course.count({ where: { deleted_at: null } }),
      this.prisma.centres.count({ where: { deleted_at: null } }),
      this.prisma.users.count({ where: { role_id: 2, deleted_at: null } }),
      this.prisma.users.count({ where: { role_id: 3, deleted_at: null } }),
      this.prisma.enrol.count({ where: { deleted_at: null } }),
      this.prisma.question.count({ where: { deleted_at: null } }),
      this.prisma.payment_info.aggregate({ where: { deleted_at: null }, _sum: { amount_paid: true } }),
      this.prisma.users.findMany({
        where: { role_id: 2, deleted_at: null },
        select: { id: true, student_id: true, name: true, email: true, phone: true, created_at: true },
        orderBy: { id: 'desc' },
        take: 10,
      }),
      this.prisma.events.findMany({
        where: { deleted_at: null, event_date: { gte: new Date(`${range.toDate}T00:00:00Z`) } },
        select: { id: true, title: true, event_date: true, from_time: true, to_time: true },
        orderBy: { event_date: 'asc' },
        take: 10,
      }),
      // Trend rows: last 14 days. We use 7d sparkline + diff vs prior 7d.
      this.prisma.enrol.findMany({
        where: { deleted_at: null, created_at: { gte: fourteenDaysAgo } },
        select: { created_at: true, course_id: true, user_id: true },
      }),
      this.prisma.users.findMany({
        where: { role_id: 2, deleted_at: null, created_at: { gte: fourteenDaysAgo } },
        select: { created_at: true },
      }),
      this.prisma.course.findMany({
        where: { deleted_at: null, created_at: { gte: fourteenDaysAgo } },
        select: { created_at: true },
      }),
      // Monthly enrolment counts for the trend chart.
      this.prisma.enrol.findMany({
        where: { deleted_at: null, created_at: { gte: sixMonthsAgo } },
        select: { created_at: true },
      }),
      // Video progress aggregated per user → bucket distribution.
      this.prisma.video_progress_status.findMany({
        where: { deleted_at: null },
        select: { user_id: true, status: true },
      }),
    ]);

    // Sparkline + trend % helper: bucket rows into 7 daily counts and
    // diff total vs the prior 7-day window.
    const bucketByDay = (rows: Array<{ created_at: Date | null }>): { sparkline: number[]; trendPercent: number; lastBucketTotal: number; priorBucketTotal: number } => {
      const sparkline = Array(7).fill(0) as number[];
      let priorTotal = 0;
      for (const row of rows) {
        if (!row.created_at) continue;
        const created = new Date(row.created_at);
        const diffDays = Math.floor((todayUtc.getTime() - Date.UTC(created.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate())) / (24 * 60 * 60 * 1000));
        if (diffDays < 0) continue;
        if (diffDays < 7) {
          sparkline[6 - diffDays] = (sparkline[6 - diffDays] ?? 0) + 1;
        } else if (diffDays < 14) {
          priorTotal += 1;
        }
      }
      const lastTotal = sparkline.reduce((s, v) => s + v, 0);
      const trendPercent = priorTotal === 0
        ? (lastTotal > 0 ? 100 : 0)
        : Math.round(((lastTotal - priorTotal) / priorTotal) * 100);
      return { sparkline, trendPercent, lastBucketTotal: lastTotal, priorBucketTotal: priorTotal };
    };

    const enrolTrend = bucketByDay(enrolmentsLast14Days);
    const studentTrend = bucketByDay(studentsLast14Days);
    const courseTrend = bucketByDay(coursesLast14Days);

    // 6-month enrolment trend grouped into monthly buckets. Iterate
    // exactly 6 buckets so the chart always has a full series.
    const monthlyTrend: Array<{ label: string; year: number; month: number; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      monthlyTrend.push({
        label: d.toLocaleString('en-US', { month: 'short' }),
        year: d.getUTCFullYear(),
        month: d.getUTCMonth(),
        count: 0,
      });
    }
    for (const row of enrolmentsLast6Months) {
      if (!row.created_at) continue;
      const d = new Date(row.created_at);
      const bucket = monthlyTrend.find((b) => b.year === d.getUTCFullYear() && b.month === d.getUTCMonth());
      if (bucket) bucket.count += 1;
    }

    // Student progress distribution. Each video_progress_status row
    // marks one watched item; we aggregate percent-watched per user
    // against the total video count and bucket users by completion %.
    const totalVideosCount = await this.prisma.lesson_files.count({
      where: { deleted_at: null, lesson_type: { in: ['video', 'youtube_video', 'vimeo_video'] } },
    });
    const userVideoCount = new Map<number, { watched: number; completed: number }>();
    for (const row of videoProgressRows) {
      if (row.user_id == null) continue;
      const cur = userVideoCount.get(row.user_id) ?? { watched: 0, completed: 0 };
      cur.watched += 1;
      if (row.status === 1) cur.completed += 1;
      userVideoCount.set(row.user_id, cur);
    }
    let progressLow = 0; // 0-25%
    let progressMid = 0; // 25-75%
    let progressHigh = 0; // 75-100%
    for (const stat of userVideoCount.values()) {
      const pct = totalVideosCount === 0 ? 0 : Math.round((stat.completed / totalVideosCount) * 100);
      if (pct < 25) progressLow += 1;
      else if (pct < 75) progressMid += 1;
      else progressHigh += 1;
    }
    // Treat enrolled-but-never-watched students as "0-25% Done" so the
    // chart total adds up to active enrolments, not just active viewers.
    const trackedUsers = userVideoCount.size;
    progressLow += Math.max(0, enrolmentsCount - trackedUsers);

    const upcomingClassesCount = upcomingEvents.length;

    // LEFT JOIN enrol + course for recent students
    const studentIds = recentStudentRows.map((s: { id: number }) => s.id);
    const enrolments = studentIds.length > 0 ? await this.prisma.enrol.findMany({ where: { user_id: { in: studentIds }, deleted_at: null }, select: { user_id: true, course_id: true } }) : [];
    const courseIds = [...new Set(enrolments.map(e => e.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));
    const enrolMap = new Map(enrolments.filter(e => e.user_id !== null).map(e => [e.user_id, e]));

    type RecentStudentRow = (typeof recentStudentRows)[number];
    const recentStudents = recentStudentRows.map((u: RecentStudentRow) => {
      const enrol = enrolMap.get(u.id);
      return {
        ...u,
        course_title: enrol?.course_id ? courseMap.get(enrol.course_id)?.title ?? null : null,
      };
    });

    return {
      courses_count: coursesCount,
      centres_count: centresCount,
      students_count: studentsCount,
      instructors_count: instructorsCount,
      enrolments_count: enrolmentsCount,
      questions_count: questionsCount,
      upcoming_classes_count: upcomingClassesCount,
      payments_total: paymentsAgg._sum.amount_paid ?? 0,
      recent_students: recentStudents,
      upcoming_events: upcomingEvents,
      // Naji 2026-05-07 reskin extras:
      students_trend: studentTrend,
      enrolments_trend: enrolTrend,
      courses_trend: courseTrend,
      classes_trend: { sparkline: Array(7).fill(0) as number[], trendPercent: 0, lastBucketTotal: upcomingClassesCount, priorBucketTotal: 0 },
      enrolment_monthly: monthlyTrend.map((b) => ({ label: b.label, count: b.count })),
      progress_distribution: {
        low: progressLow,
        mid: progressMid,
        high: progressHigh,
        total: progressLow + progressMid + progressHigh,
      },
    };
  }

  // ─── Phase 1: Batches (Intake) ────────────────────────────────────────────

  async listBatches(): Promise<SqlRow[]> {
    const batches = await this.prisma.batch.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });

    const batchIds = batches.map(b => b.id);
    const enrolCounts = batchIds.length > 0
      ? await this.prisma.enrol.groupBy({ by: ['batch_id'], where: { batch_id: { in: batchIds }, deleted_at: null }, _count: { id: true } })
      : [];
    const countMap = new Map(enrolCounts.map(ec => [ec.batch_id, ec._count.id]));

    return batches.map(b => ({
      ...b,
      student_count: countMap.get(b.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  async addBatch(actorUserId: string, input: BatchInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Title is required.' };
    }

    const now = new Date();
    const statusBool = input.status === undefined ? true : (input.status === 'active' || input.status === 'true' || (input.status as unknown) === true);
    await this.prisma.batch.create({
      data: { title: input.title, description: input.description ?? '', status: statusBool, created_by: toNullableIntId(actorUserId), created_at: now, updated_at: now },
    });

    return { status: 1, message: 'Batch Added Successfully!' };
  }

  async editBatch(actorUserId: string, batchId: string, input: BatchInput): Promise<Record<string, unknown>> {
    if (!batchId) {
      return { status: 0, message: 'Invalid batch ID.' };
    }

    const now = new Date();
    const statusBool = input.status === undefined ? true : (input.status === 'active' || input.status === 'true' || (input.status as unknown) === true);
    await this.prisma.batch.updateMany({
      where: { id: toIntId(batchId), deleted_at: null },
      data: { title: input.title, description: input.description ?? '', status: statusBool, updated_by: toNullableIntId(actorUserId), updated_at: now },
    });

    return { status: 1, message: 'Batch Updated Successfully!' };
  }

  async deleteBatch(actorUserId: string, batchId: string): Promise<Record<string, unknown>> {
    if (!batchId) {
      return { status: 0, message: 'Invalid batch ID.' };
    }

    const now = new Date();
    await this.prisma.batch.updateMany({
      where: { id: toIntId(batchId), deleted_at: null },
      data: { deleted_by: toNullableIntId(actorUserId), deleted_at: now },
    });

    return { status: 1, message: 'Batch Deleted Successfully!' };
  }

  // ─── Phase 1: Payments ────────────────────────────────────────────────────

  async listPayments(filters: AdminPaymentFilters): Promise<SqlRow[]> {
    const range = normalizeReportRange(filters.fromDate, filters.toDate);

    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.fromDate) {
      where.payment_date = { ...(where.payment_date as Record<string, unknown> ?? {}), gte: new Date(`${range.fromDate}T00:00:00Z`) };
    }
    if (filters.toDate) {
      where.payment_date = { ...(where.payment_date as Record<string, unknown> ?? {}), lte: new Date(`${range.toDate}T23:59:59Z`) };
    }
    if (filters.courseId) {
      where.course_id = toIntId(filters.courseId);
    }

    const payments = await this.prisma.payment_info.findMany({ where: where as Prisma.payment_infoWhereInput, orderBy: { id: 'desc' } });

    const userIds = [...new Set(payments.map(p => p.user_id).filter((x): x is number => x !== null && x !== undefined))];
    const courseIds = [...new Set(payments.map(p => p.course_id).filter((x): x is number => x !== null && x !== undefined))];

    const [users, courses] = await Promise.all([
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, student_id: true } }) : [],
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
    ]);

    const userMap = new Map(users.map(u => [u.id, u]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    return payments.map(p => ({
      ...p,
      user_name: p.user_id ? userMap.get(p.user_id)?.name ?? null : null,
      student_id: p.user_id ? userMap.get(p.user_id)?.student_id ?? null : null,
      course_title: p.course_id ? courseMap.get(p.course_id)?.title ?? null : null,
    })) as unknown as SqlRow[];
  }

  // ─── Phase 1: Admin Cohorts ───────────────────────────────────────────────

  async listAdminCohorts(filters: AdminCohortFilters): Promise<SqlRow[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) where.course_id = toIntId(filters.courseId);
    if (filters.subjectId) where.subject_id = toIntId(filters.subjectId);
    if (filters.centreId) where.centre_id = toIntId(filters.centreId);

    const cohorts = await this.prisma.cohorts.findMany({ where: where as Prisma.cohortsWhereInput, orderBy: { id: 'desc' } });

    const cohortIds = cohorts.map(c => c.id);
    const cohortIdStrs = cohorts.map(c => String(c.id));
    const courseIds = [...new Set(cohorts.map(c => c.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const subjectIds = [...new Set(cohorts.map(c => c.subject_id).filter((x): x is number => x !== null && x !== undefined))];
    const centreIds = [...new Set(cohorts.map(c => c.centre_id).filter((x): x is number => x !== null && x !== undefined))];
    const instructorIds = [...new Set(cohorts.map(c => c.instructor_id).filter((x): x is number => x !== null && x !== undefined))];
    const languageIds = [...new Set(cohorts.map(c => c.language_id).filter((x): x is number => x !== null && x !== undefined))];

    const [courses, subjects, centres, instructors, studentCounts, assignmentCounts, liveClassCounts, pivotRows, languageRows] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      subjectIds.length > 0 ? this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, title: true } }) : [],
      centreIds.length > 0 ? this.prisma.centres.findMany({ where: { id: { in: centreIds } }, select: { id: true, centre_name: true } }) : [],
      instructorIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: instructorIds } }, select: { id: true, name: true } }) : [],
      cohortIdStrs.length > 0 ? this.prisma.cohort_students.groupBy({ by: ['cohort_id'], where: { cohort_id: { in: cohortIdStrs }, deleted_at: null }, _count: { id: true } }) : [],
      cohortIds.length > 0 ? this.prisma.assignment.groupBy({ by: ['cohort_id'], where: { cohort_id: { in: cohortIds }, deleted_at: null }, _count: { id: true } }) : [],
      cohortIds.length > 0 ? this.prisma.live_class.groupBy({ by: ['cohort_id'], where: { cohort_id: { in: cohortIds }, deleted_at: null }, _count: { id: true } }) : [],
      cohortIds.length > 0 ? this.prisma.cohort_offerings.findMany({ where: { cohort_id: { in: cohortIds } }, select: { cohort_id: true, offering_id: true } }) : [],
      languageIds.length > 0 ? this.prisma.languages.findMany({ where: { id: { in: languageIds } }, select: { id: true, title: true } }) : [],
    ]);

    const offeringIds = [...new Set(pivotRows.map((p) => p.offering_id))];
    const offerings = offeringIds.length > 0
      ? await this.prisma.offerings.findMany({ where: { id: { in: offeringIds } }, select: { id: true, title: true } })
      : [];

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const centreMap = new Map(centres.map(c => [c.id, c]));
    const instructorMap = new Map(instructors.map(i => [i.id, i]));
    const languageMap = new Map(languageRows.map((l) => [l.id, l.title ?? '']));
    const offeringTitleMap = new Map(offerings.map((o) => [o.id, o.title ?? '']));
    const studentCountMap = new Map(studentCounts.map((sc) => [sc.cohort_id, sc._count?.id ?? 0]));
    const assignmentCountMap = new Map(assignmentCounts.map((ac) => [ac.cohort_id, ac._count?.id ?? 0]));
    const liveClassCountMap = new Map(liveClassCounts.map((lc) => [lc.cohort_id, lc._count?.id ?? 0]));

    const cohortPivotMap = new Map<number, { ids: number[]; titles: string[] }>();
    for (const p of pivotRows) {
      const entry = cohortPivotMap.get(p.cohort_id) ?? { ids: [], titles: [] };
      entry.ids.push(p.offering_id);
      entry.titles.push(offeringTitleMap.get(p.offering_id) ?? '');
      cohortPivotMap.set(p.cohort_id, entry);
    }

    // Derive status from start/end dates (Naji 2026-05-04): a cohort is
    // Active when today falls within [start_date, end_date]; Completed once
    // we are past end_date. Falls back to "active" when dates are missing.
    const todayMs = new Date().setHours(0, 0, 0, 0);
    const deriveStatus = (start: Date | null | undefined, end: Date | null | undefined): 'active' | 'completed' | 'upcoming' => {
      if (end && end.getTime() < todayMs) return 'completed';
      if (start && start.getTime() > todayMs) return 'upcoming';
      return 'active';
    };

    return cohorts.map(ch => {
      const pivot = cohortPivotMap.get(ch.id);
      return {
        ...ch,
        // Display-friendly cohort row id (used as the "Cohort ID" column).
        cohort_row_id: `C-${ch.id}`,
        course_title: ch.course_id ? courseMap.get(ch.course_id)?.title ?? null : null,
        subject_title: ch.subject_id ? subjectMap.get(ch.subject_id)?.title ?? null : null,
        centre_name: ch.centre_id ? centreMap.get(ch.centre_id)?.centre_name ?? null : null,
        instructor_name: ch.instructor_id ? instructorMap.get(ch.instructor_id)?.name ?? null : null,
        language_title: ch.language_id ? languageMap.get(ch.language_id) ?? '' : '',
        offering_ids: pivot?.ids ?? [],
        offering_titles: pivot?.titles ?? [],
        student_count: studentCountMap.get(String(ch.id)) ?? 0,
        assignment_count: assignmentCountMap.get(ch.id) ?? 0,
        live_class_count: liveClassCountMap.get(ch.id) ?? 0,
        derived_status: deriveStatus(ch.start_date, ch.end_date),
      };
    }) as unknown as SqlRow[];
  }

  // ─── Phase 1: Admin Centre Payments (Fund Requests + Wallet Txns) ─────────

  async listAdminCentrePayments(filters: AdminCentrePaymentFilters): Promise<Record<string, unknown>> {
    const range = normalizeReportRange(filters.fromDate, filters.toDate);

    const frWhere: Record<string, unknown> = { deleted_at: null };
    if (filters.fromDate) frWhere.date = { ...(frWhere.date as Record<string, unknown> ?? {}), gte: new Date(`${range.fromDate}T00:00:00Z`) };
    if (filters.toDate) frWhere.date = { ...(frWhere.date as Record<string, unknown> ?? {}), lte: new Date(`${range.toDate}T23:59:59Z`) };
    if (filters.status) frWhere.status = filters.status;

    const wtWhere: Record<string, unknown> = { deleted_at: null };
    if (filters.fromDate) wtWhere.created_at = { ...(wtWhere.created_at as Record<string, unknown> ?? {}), gte: new Date(`${range.fromDate}T00:00:00Z`) };
    if (filters.toDate) wtWhere.created_at = { ...(wtWhere.created_at as Record<string, unknown> ?? {}), lte: new Date(`${range.toDate}T23:59:59Z`) };

    const [frRows, wtRows] = await Promise.all([
      this.prisma.centre_fund_requests.findMany({ where: frWhere as Prisma.centre_fund_requestsWhereInput, orderBy: { id: 'desc' } }),
      this.prisma.wallet_transactions.findMany({ where: wtWhere as Prisma.wallet_transactionsWhereInput, orderBy: { id: 'desc' } }),
    ]);

    // LEFT JOINs
    const centreIds = [...new Set([...frRows.map((f) => f.centre_id), ...wtRows.map((w) => w.centre_id)])];
    const userIds = [...new Set(frRows.map((f) => f.user_id).filter((x): x is number => x !== null && x !== undefined))];
    const [centres, users] = await Promise.all([
      centreIds.length > 0 ? this.prisma.centres.findMany({ where: { id: { in: centreIds } }, select: { id: true, centre_name: true } }) : [],
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
    ]);
    const centreMap = new Map(centres.map(c => [c.id, c]));
    const userMap = new Map(users.map(u => [u.id, u]));

    const fundRequests = frRows.map((fr) => ({ ...fr, centre_name: centreMap.get(fr.centre_id)?.centre_name ?? null, user_name: fr.user_id ? (userMap.get(fr.user_id)?.name ?? null) : null }));
    const walletTransactions = wtRows.map((wt) => ({ ...wt, centre_name: centreMap.get(wt.centre_id)?.centre_name ?? null }));

    return { fund_requests: fundRequests, wallet_transactions: walletTransactions };
  }

  // ─── Phase 1: Admin Wallet Status ─────────────────────────────────────────

  async listAdminWalletStatus(filters: AdminWalletFilters): Promise<SqlRow[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.centreId) where.centre_id = toIntId(filters.centreId);
    if (filters.centreName) where.centre_name = { contains: filters.centreName };

    const centres = await this.prisma.centres.findMany({
      where: where as Prisma.centresWhereInput,
      select: { id: true, centre_id: true, centre_name: true, wallet_balance: true, phone: true, email: true },
      orderBy: { id: 'desc' },
    });

    const centreDbIds = centres.map(c => c.id);
    const txnCounts = centreDbIds.length > 0
      ? await this.prisma.wallet_transactions.groupBy({ by: ['centre_id'], where: { centre_id: { in: centreDbIds }, deleted_at: null }, _count: { id: true } })
      : [];
    const countMap = new Map(txnCounts.map((tc) => [tc.centre_id, tc._count?.id ?? 0]));

    return centres.map(ct => ({ ...ct, transaction_count: countMap.get(ct.id) ?? 0 })) as unknown as SqlRow[];
  }

  // ─── Phase 1: Admin Notifications ─────────────────────────────────────────

  async listAdminNotifications(): Promise<SqlRow[]> {
    const notifications = await this.prisma.notification.findMany({ where: { deleted_at: null }, orderBy: { id: 'desc' } });
    return notifications.map(n => ({ ...n, course_title: null })) as unknown as SqlRow[];
  }

  // ─── Phase 1: Banners ────────────────────────────────────────────────────

  async listBanners(): Promise<SqlRow[]> {
    const banners = await this.prisma.banners.findMany({ where: { deleted_at: null }, orderBy: { id: 'desc' } });
    const courseIds = [...new Set(banners.map(b => b.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const courses = courseIds.length > 0 ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [];
    const courseMap = new Map(courses.map(c => [c.id, c]));

    return banners.map(b => ({ ...b, course_title: b.course_id ? courseMap.get(b.course_id)?.title ?? null : null })) as unknown as SqlRow[];
  }

  async addBanner(actorUserId: string, input: BannerInput): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.banners.create({
      data: {
        title: input.title ?? '',
        image: input.image ?? '',
        course_id: input.courseId ? toNullableIntId(input.courseId) : null,
        created_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Banner Added Successfully!' };
  }

  async editBanner(actorUserId: string, bannerId: string, input: BannerInput): Promise<Record<string, unknown>> {
    const idInt = toIntId(bannerId);
    if (!idInt) {
      return { status: 0, message: 'Invalid banner ID.' };
    }

    const now = new Date();
    const result = await this.prisma.banners.updateMany({
      where: { id: idInt, deleted_at: null },
      data: {
        title: input.title ?? '',
        image: input.image ?? '',
        url: input.url ?? '',
        course_id: input.courseId ? toNullableIntId(input.courseId) : null,
        is_course_banner: input.isCourseBanner ? 1 : 0,
        updated_by: toNullableIntId(actorUserId),
        updated_at: now,
      },
    });
    if (result.count === 0) {
      return { status: 0, message: 'Banner not found.' };
    }

    return { status: 1, message: 'Banner Updated Successfully!' };
  }

  async deleteBanner(actorUserId: string, bannerId: string): Promise<Record<string, unknown>> {
    const idInt = toIntId(bannerId);
    if (!idInt) {
      return { status: 0, message: 'Invalid banner ID.' };
    }

    const now = new Date();
    await this.prisma.banners.updateMany({
      where: { id: idInt, deleted_at: null },
      data: { deleted_by: toNullableIntId(actorUserId), deleted_at: now },
    });

    return { status: 1, message: 'Banner Deleted Successfully!' };
  }

  // ─── Phase 1: FAQ ────────────────────────────────────────────────────────

  async listFaqs(): Promise<SqlRow[]> {
    const faqs = await this.prisma.faq.findMany({ where: { deleted_at: null }, orderBy: { id: 'desc' } });
    return faqs as unknown as SqlRow[];
  }

  async addFaq(actorUserId: string, input: FaqInput): Promise<Record<string, unknown>> {
    if (!input.question.trim()) {
      return { status: 0, message: 'Question is required.' };
    }

    const now = new Date();
    await this.prisma.faq.create({
      data: { question: input.question, answer: input.answer ?? '', created_by: toNullableIntId(actorUserId), created_at: now, updated_at: now },
    });

    return { status: 1, message: 'FAQ Added Successfully!' };
  }

  async editFaq(actorUserId: string, faqId: string, input: FaqInput): Promise<Record<string, unknown>> {
    const idInt = toIntId(faqId);
    if (!idInt) {
      return { status: 0, message: 'Invalid FAQ ID.' };
    }
    if (!input.question.trim()) {
      return { status: 0, message: 'Question is required.' };
    }

    const now = new Date();
    const result = await this.prisma.faq.updateMany({
      where: { id: idInt, deleted_at: null },
      data: { question: input.question, answer: input.answer ?? '', updated_by: toNullableIntId(actorUserId), updated_at: now },
    });
    if (result.count === 0) {
      return { status: 0, message: 'FAQ not found.' };
    }

    return { status: 1, message: 'FAQ Updated Successfully!' };
  }

  async deleteFaq(actorUserId: string, faqId: string): Promise<Record<string, unknown>> {
    const idInt = toIntId(faqId);
    if (!idInt) {
      return { status: 0, message: 'Invalid FAQ ID.' };
    }

    const now = new Date();
    await this.prisma.faq.updateMany({
      where: { id: idInt, deleted_at: null },
      data: { deleted_by: toNullableIntId(actorUserId), deleted_at: now },
    });

    return { status: 1, message: 'FAQ Deleted Successfully!' };
  }

  // ─── Phase 1: Contact Settings ────────────────────────────────────────────

  async getContactSettings(): Promise<SqlRow[]> {
    const contactKeys = ['contact_email', 'contact_phone', 'contact_address', 'support_email', 'support_phone', 'whatsapp_number'];
    const settings = await this.prisma.settings.findMany({
      where: { deleted_at: null, key: { in: contactKeys } },
      orderBy: { id: 'asc' },
    });
    return settings as unknown as SqlRow[];
  }

  async updateContactSettings(actorUserId: string, settings: Record<string, string>): Promise<void> {
    const now = new Date();
    const actorInt = toNullableIntId(actorUserId);

    for (const [key, value] of Object.entries(settings)) {
      const existing = await this.prisma.settings.findFirst({ where: { key }, select: { id: true } });
      if (existing) {
        await this.prisma.settings.update({
          where: { id: existing.id },
          data: { value, updated_by: actorInt, updated_at: now },
        });
      } else {
        await this.prisma.settings.create({
          data: { key, value, created_by: actorInt, created_at: now, updated_at: now },
        });
      }
    }
  }

  // ─── Phase 2: Question Bank ─────────────────────────────────────────────────

  async listQuestionBank(filters: QuestionBankFilters = {}): Promise<SqlRow[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) where.course_id = toIntId(filters.courseId);
    if (filters.subjectId) where.subject_id = toIntId(filters.subjectId);
    if (filters.lessonId) where.lesson_id = toIntId(filters.lessonId);
    if (filters.qType !== undefined && filters.qType >= 0) where.q_type = filters.qType;

    const questions = await this.prisma.question_bank.findMany({ where: where as Prisma.question_bankWhereInput, orderBy: { id: 'desc' } });

    const courseIds = [...new Set(questions.map(q => q.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const subjectIds = [...new Set(questions.map(q => q.subject_id).filter((x): x is number => x !== null && x !== undefined))];
    const lessonIds = [...new Set(questions.map(q => q.lesson_id).filter((x): x is number => x !== null && x !== undefined))];

    const [courses, subjects, lessons] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      subjectIds.length > 0 ? this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, title: true } }) : [],
      lessonIds.length > 0 ? this.prisma.lesson.findMany({ where: { id: { in: lessonIds } }, select: { id: true, title: true } }) : [],
    ]);

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const lessonMap = new Map(lessons.map(l => [l.id, l]));

    return questions.map(qb => ({
      ...qb,
      course_title: qb.course_id ? courseMap.get(qb.course_id)?.title ?? null : null,
      subject_title: qb.subject_id ? subjectMap.get(qb.subject_id)?.title ?? null : null,
      lesson_title: qb.lesson_id ? lessonMap.get(qb.lesson_id)?.title ?? null : null,
    })) as unknown as SqlRow[];
  }

  async addQuestion(actorUserId: string, input: QuestionBankInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Question title is required.' };
    }

    const now = new Date();

    await this.prisma.question_bank.create({
      data: {
        course_id: toNullableIntId(input.courseId),
        subject_id: toNullableIntId(input.subjectId),
        lesson_id: toNullableIntId(input.lessonId),
        category_id: toNullableIntId(input.categoryId),
        q_type: input.qType ?? 0,
        title: input.title,
        title_file: input.titleFile ?? null,
        hint: input.hint ?? null,
        hint_file: input.hintFile ?? null,
        solution: input.solution ?? null,
        solution_file: input.solutionFile ?? null,
        is_equation: input.isEquation === undefined ? null : !!input.isEquation,
        number_of_options: input.numberOfOptions ?? 4,
        options: input.options ?? '[]',
        correct_answers: input.correctAnswers ?? '[]',
        created_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Question added successfully.' };
  }

  async editQuestion(actorUserId: string, questionId: string, input: QuestionBankInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Question title is required.' };
    }

    const now = new Date();

    await this.prisma.question_bank.updateMany({
      where: { id: toIntId(questionId), deleted_at: null },
      data: {
        course_id: toNullableIntId(input.courseId),
        subject_id: toNullableIntId(input.subjectId),
        lesson_id: toNullableIntId(input.lessonId),
        category_id: toNullableIntId(input.categoryId),
        q_type: input.qType ?? 0,
        title: input.title,
        title_file: input.titleFile ?? null,
        hint: input.hint ?? null,
        hint_file: input.hintFile ?? null,
        solution: input.solution ?? null,
        solution_file: input.solutionFile ?? null,
        is_equation: input.isEquation === undefined ? null : !!input.isEquation,
        number_of_options: input.numberOfOptions ?? 4,
        options: input.options ?? '[]',
        correct_answers: input.correctAnswers ?? '[]',
        updated_by: toNullableIntId(actorUserId),
        updated_at: now,
      },
    });

    return { status: 1, message: 'Question updated successfully.' };
  }

  async deleteQuestion(actorUserId: string, questionId: string): Promise<Record<string, unknown>> {
    const now = new Date();

    await this.prisma.question_bank.updateMany({
      where: { id: toIntId(questionId), deleted_at: null },
      data: { deleted_by: toNullableIntId(actorUserId), deleted_at: now },
    });

    return { status: 1, message: 'Question deleted successfully.' };
  }

  // Risha UAT 2026-05-25 — bulk-delete every question for a subject from
  // the Question Bank list. Mirrors the listing's filter shape so the
  // delete is scoped to the same (subject, course) view the user sees.
  async deleteQuestionsBySubject(
    actorUserId: string,
    subjectId: string,
    courseId?: string,
  ): Promise<Record<string, unknown>> {
    const sid = toNullableIntId(subjectId);
    if (!sid) return { status: 0, message: 'Subject id is required.' };
    const where: Record<string, unknown> = { subject_id: sid, deleted_at: null };
    if (courseId) {
      const cid = toNullableIntId(courseId);
      if (cid) where.course_id = cid;
    }
    const result = await this.prisma.question_bank.updateMany({
      where: where as Prisma.question_bankWhereInput,
      data: { deleted_by: toNullableIntId(actorUserId), deleted_at: new Date() },
    });
    return {
      status: 1,
      message: `${result.count} question(s) deleted.`,
      data: { deleted: result.count },
    };
  }

  // Naji UAT 2026-05-18 — Question Bank rebuilt to group by Subject:
  // top-level list shows one row per subject with MCQ + Descriptive counts
  // and the courses the subject belongs to (course_subject pivot). The
  // detail page reuses the existing listQuestionBank with subject_id +
  // q_type to populate MCQ / Descriptive tabs.
  async listQuestionBankSubjects(filters: { courseId?: string; subjectId?: string } = {}): Promise<SqlRow[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) where.course_id = toIntId(filters.courseId);
    if (filters.subjectId) where.subject_id = toIntId(filters.subjectId);

    const counts = await this.prisma.question_bank.groupBy({
      by: ['subject_id', 'q_type'],
      where: where as Prisma.question_bankWhereInput,
      _count: { id: true },
    });

    const subjectCountMap = new Map<number, { mcq: number; descriptive: number }>();
    for (const row of counts) {
      if (row.subject_id == null) continue;
      const cur = subjectCountMap.get(row.subject_id) ?? { mcq: 0, descriptive: 0 };
      // q_type stored as nullable TinyInt: 0=MCQ, 1=Descriptive. Treat
      // null/unknown as MCQ for legacy rows (mirrors addQuestion default).
      if (row.q_type === 1) cur.descriptive += row._count.id;
      else cur.mcq += row._count.id;
      subjectCountMap.set(row.subject_id, cur);
    }

    const subjectIds = [...subjectCountMap.keys()];
    if (subjectIds.length === 0) return [];

    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds }, deleted_at: null },
      select: { id: true, title: true, subject_code: true },
      orderBy: { title: 'asc' },
    });

    const courseSubjects = await this.prisma.course_subject.findMany({
      where: { subject_id: { in: subjectIds }, deleted_at: null },
      select: { subject_id: true, course_id: true, position: true },
      orderBy: [{ position: 'asc' }, { course_id: 'asc' }],
    });
    const courseIds = [...new Set(courseSubjects.map((cs) => cs.course_id))];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({
          where: { id: { in: courseIds }, deleted_at: null },
          select: { id: true, title: true },
        })
      : [];
    const courseMap = new Map(courses.map((c) => [c.id, c.title ?? '']));

    const subjectCoursesMap = new Map<number, { id: number; title: string }[]>();
    for (const cs of courseSubjects) {
      const title = courseMap.get(cs.course_id) ?? '';
      if (!title) continue;
      const list = subjectCoursesMap.get(cs.subject_id) ?? [];
      list.push({ id: cs.course_id, title });
      subjectCoursesMap.set(cs.subject_id, list);
    }

    return subjects.map((s) => {
      const cnt = subjectCountMap.get(s.id) ?? { mcq: 0, descriptive: 0 };
      return {
        id: s.id,
        subject_code: s.subject_code ?? null,
        title: s.title ?? null,
        courses: subjectCoursesMap.get(s.id) ?? [],
        mcq_count: cnt.mcq,
        descriptive_count: cnt.descriptive,
        total_count: cnt.mcq + cnt.descriptive,
      };
    }) as unknown as SqlRow[];
  }

  // ─── Phase 2: Exams ────────────────────────────────────────────────────────

  async listAdminExams(filters: AdminExamFilters = {}): Promise<{
    exams: SqlRow[];
    summary: { total: number; upcoming: number; expired: number; practice: number };
  }> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) where.course_id = toIntId(filters.courseId);
    if (filters.batchId) where.batch_id = toIntId(filters.batchId);

    const examRows = await this.prisma.exam.findMany({ where: where as Prisma.examWhereInput, orderBy: { id: 'desc' } });

    const examIds = examRows.map(e => e.id);
    const courseIds = [...new Set(examRows.map(e => e.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const batchIds = [...new Set(examRows.map(e => e.batch_id).filter((x): x is number => x !== null && x !== undefined))];

    const [courses, batches, questionCounts, attemptCounts] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      batchIds.length > 0 ? this.prisma.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, title: true } }) : [],
      examIds.length > 0 ? this.prisma.exam_questions.groupBy({ by: ['exam_id'], where: { exam_id: { in: examIds }, deleted_at: null }, _count: { id: true } }) : [],
      examIds.length > 0 ? this.prisma.exam_attempt.groupBy({ by: ['exam_id'], where: { exam_id: { in: examIds }, submit_status: true, deleted_at: null }, _count: { id: true } }) : [],
    ]);

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const batchMap = new Map(batches.map(b => [b.id, b]));
    const qCountMap = new Map(questionCounts.map((qc) => [qc.exam_id, qc._count?.id ?? 0]));
    const aCountMap = new Map(attemptCounts.map((ac) => [ac.exam_id, ac._count?.id ?? 0]));

    const exams = examRows.map(e => ({
      ...e,
      course_title: e.course_id ? courseMap.get(e.course_id)?.title ?? null : null,
      subject_title: null,
      batch_title: e.batch_id ? batchMap.get(e.batch_id)?.title ?? null : null,
      question_count: qCountMap.get(e.id) ?? 0,
      attempt_count: aCountMap.get(e.id) ?? 0,
    })) as unknown as SqlRow[];

    const now = new Date().toISOString().slice(0, 10);
    let upcoming = 0;
    let expired = 0;
    let practice = 0;

    for (const exam of exams) {
      if (toInteger(exam.is_practice) === 1) practice++;
      const toDate = toStringValue(exam.to_date).slice(0, 10);
      const fromDate = toStringValue(exam.from_date).slice(0, 10);
      if (fromDate > now) upcoming++;
      else if (toDate < now) expired++;
    }

    return { exams, summary: { total: exams.length, upcoming, expired, practice } };
  }

  // Naji 2026-05-09 — new Exam Creation wizard. Step 1 saves a Draft
  // row with multi-course / multi-offering links and auto-generates an
  // exam_code on first save (TTIIEXM{YY}{####}). Subsequent steps will
  // attach scheduling rows, question setup, student allocation, and
  // instructions/notification — each via their own endpoint.
  private async nextExamCode(): Promise<string> {
    const yy = new Date().getFullYear() % 100;
    const prefix = `TTIIEXM${String(yy).padStart(2, '0')}`;
    const recent = await this.prisma.exam.findMany({
      where: { exam_code: { startsWith: prefix } },
      select: { exam_code: true },
      orderBy: { id: 'desc' },
      take: 500,
    });
    let maxSeq = 0;
    for (const row of recent) {
      const code = row.exam_code ?? '';
      if (!code.startsWith(prefix)) continue;
      const n = Number.parseInt(code.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
    }
    return `${prefix}${String(maxSeq + 1).padStart(5, '0')}`;
  }

  async saveExamDraft(
    actorUserId: string,
    input: {
      id?: string | null | undefined;
      title: string;
      courseIds: string[];
      offeringIds: string[];
      fromDate: string;
      toDate: string;
      fromTime: string;
      toTime: string;
      durationMinutes?: number | undefined;
      description?: string | undefined;
      // Risha UAT 2026-05-27 — admin toggle. true means each student
      // gets a random question order on attempt-start; false means
      // questions are served in their saved question_no order.
      shuffleQuestions?: boolean | undefined;
    },
  ): Promise<Record<string, unknown>> {
    const title = input.title.trim();
    if (!title) return { status: 0, message: 'Exam title is required.' };
    const courseIdsInt = input.courseIds.map((id) => toNullableIntId(id)).filter((v): v is number => v !== null);
    const offeringIdsInt = input.offeringIds.map((id) => toNullableIntId(id)).filter((v): v is number => v !== null);
    if (courseIdsInt.length === 0) return { status: 0, message: 'Pick at least one course.' };
    const actor = toNullableIntId(actorUserId);
    const now = new Date();
    const existingId = input.id ? toNullableIntId(input.id) : null;

    const data = {
      title,
      description: input.description ?? null,
      from_date: input.fromDate ? new Date(input.fromDate) : null,
      to_date: input.toDate ? new Date(input.toDate) : null,
      // Times are stored as a Date in the DB time-only column; we use a
      // synthetic 1970 date so Prisma accepts the value.
      from_time: input.fromTime ? new Date(`1970-01-01T${input.fromTime}:00`) : null,
      to_time: input.toTime ? new Date(`1970-01-01T${input.toTime}:00`) : null,
      duration: input.durationMinutes !== undefined && input.durationMinutes > 0 ? `${input.durationMinutes}` : null,
      // First picked course goes into the legacy single-course column so
      // existing list/edit pages keep working until they migrate.
      course_id: courseIdsInt[0] ?? null,
      status: 'draft',
      // Risha UAT 2026-05-27 — only persist when the admin explicitly
      // sent a value; otherwise leave the existing setting untouched.
      ...(input.shuffleQuestions !== undefined ? { shuffle_questions: input.shuffleQuestions } : {}),
      updated_at: now,
      updated_by: actor,
    } as const;

    let examId: number;
    if (existingId) {
      await this.prisma.exam.updateMany({
        where: { id: existingId, deleted_at: null },
        data,
      });
      examId = existingId;
    } else {
      const examCode = await this.nextExamCode();
      const created = await this.prisma.exam.create({
        data: {
          ...data,
          exam_code: examCode,
          created_at: now,
          created_by: actor,
        },
      });
      examId = created.id;
    }

    // Replace pivot rows so the multi-selects always reflect the current state.
    await this.prisma.exam_courses.deleteMany({ where: { exam_id: examId } });
    if (courseIdsInt.length > 0) {
      await this.prisma.exam_courses.createMany({
        data: courseIdsInt.map((course_id) => ({ exam_id: examId, course_id })),
        skipDuplicates: true,
      });
    }
    await this.prisma.exam_offerings.deleteMany({ where: { exam_id: examId } });
    if (offeringIdsInt.length > 0) {
      await this.prisma.exam_offerings.createMany({
        data: offeringIdsInt.map((offering_id) => ({ exam_id: examId, offering_id })),
        skipDuplicates: true,
      });
    }

    const row = await this.prisma.exam.findFirst({ where: { id: examId } });
    return {
      status: 1,
      message: existingId ? 'Draft updated.' : 'Draft saved.',
      data: {
        id: examId,
        exam_code: row?.exam_code ?? null,
        status: row?.status ?? 'draft',
      },
    };
  }

  async getExamDraft(id: string): Promise<Record<string, unknown>> {
    const examIdInt = toNullableIntId(id);
    if (!examIdInt) return { status: 0, message: 'Invalid exam id.' };
    const row = await this.prisma.exam.findFirst({ where: { id: examIdInt, deleted_at: null } });
    if (!row) return { status: 0, message: 'Exam not found.' };
    const [courseLinks, offeringLinks] = await Promise.all([
      this.prisma.exam_courses.findMany({ where: { exam_id: examIdInt }, select: { course_id: true } }),
      this.prisma.exam_offerings.findMany({ where: { exam_id: examIdInt }, select: { offering_id: true } }),
    ]);
    return {
      status: 1,
      data: {
        id: row.id,
        exam_code: row.exam_code,
        title: row.title,
        description: row.description,
        from_date: row.from_date,
        to_date: row.to_date,
        from_time: row.from_time,
        to_time: row.to_time,
        duration: row.duration,
        status: row.status,
        // Risha UAT 2026-05-27 — surface the shuffle setting so the
        // Edit Exam form can pre-fill the toggle.
        shuffle_questions: row.shuffle_questions,
        course_ids: courseLinks.map((c) => c.course_id),
        offering_ids: offeringLinks.map((o) => o.offering_id),
      },
    };
  }

  // Naji 2026-05-09 — Re-Examination overview + reschedule.
  // List exams with allocated students who don't have an attempt.
  async listReExaminationOverview(): Promise<Record<string, unknown>[]> {
    const exams = await this.prisma.exam.findMany({
      where: { deleted_at: null, status: 'published' },
      select: { id: true, exam_code: true, title: true, from_date: true },
      orderBy: { id: 'desc' },
    });
    if (exams.length === 0) return [];
    const examIds = exams.map((e) => e.id);
    const [allocs, attempts] = await Promise.all([
      this.prisma.exam_student_allocations.findMany({ where: { exam_id: { in: examIds } }, select: { exam_id: true, user_id: true } }),
      this.prisma.exam_attempt.findMany({ where: { exam_id: { in: examIds } }, select: { exam_id: true, user_id: true } }),
    ]);
    const allocByExam = new Map<number, Set<number>>();
    for (const a of allocs) {
      const set = allocByExam.get(a.exam_id) ?? new Set<number>();
      set.add(a.user_id);
      allocByExam.set(a.exam_id, set);
    }
    const attemptByExam = new Map<number, Set<number>>();
    for (const t of attempts) {
      if (t.exam_id === null || t.user_id === null) continue;
      const set = attemptByExam.get(t.exam_id) ?? new Set<number>();
      set.add(t.user_id);
      attemptByExam.set(t.exam_id, set);
    }
    return exams.map((e) => {
      const allocated = allocByExam.get(e.id) ?? new Set<number>();
      const attempted = attemptByExam.get(e.id) ?? new Set<number>();
      let missed = 0;
      for (const uid of allocated) if (!attempted.has(uid)) missed += 1;
      return {
        exam_id: e.id,
        exam_code: e.exam_code,
        title: e.title,
        from_date: e.from_date,
        allocated: allocated.size,
        attempted: attempted.size,
        missed,
      };
    }).filter((r) => r.missed > 0 || r.allocated > 0);
  }

  async getReExaminationDetail(examId: string): Promise<Record<string, unknown>> {
    const id = toNullableIntId(examId);
    if (!id) return { status: 0, message: 'Invalid exam id.' };
    const [exam, subjects, allocs, attempts, reExams] = await Promise.all([
      this.prisma.exam.findFirst({ where: { id }, select: { id: true, exam_code: true, title: true } }),
      this.prisma.exam_subjects.findMany({ where: { exam_id: id }, select: { id: true, subject_title: true, exam_date: true, start_time: true, end_time: true } }),
      this.prisma.exam_student_allocations.findMany({ where: { exam_id: id }, select: { user_id: true } }),
      this.prisma.exam_attempt.findMany({ where: { exam_id: id }, select: { user_id: true } }),
      this.prisma.exam_re_examinations.findMany({ where: { exam_id: id }, select: { exam_subject_id: true, user_id: true, new_date: true, new_start_time: true, new_end_time: true, status: true } }),
    ]);
    if (!exam) return { status: 0, message: 'Exam not found.' };
    const allocatedIds = allocs.map((a) => a.user_id);
    const attemptedSet = new Set(attempts.map((t) => t.user_id).filter((v): v is number => v !== null));
    const missedIds = allocatedIds.filter((uid) => !attemptedSet.has(uid));
    const users = missedIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: missedIds } }, select: { id: true, name: true, user_email: true, email: true, student_id: true } })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    return {
      status: 1,
      data: {
        exam,
        subjects: subjects.map((s) => ({ ...s })),
        missed_students: missedIds.map((uid) => {
          const u = userMap.get(uid);
          return {
            user_id: uid,
            student_id: u?.student_id ?? '',
            name: u?.name ?? '',
            email: u?.user_email ?? u?.email ?? '',
          };
        }),
        scheduled: reExams.map((r) => ({ ...r })),
      },
    };
  }

  async scheduleReExamination(
    actorUserId: string,
    input: { examId: string; examSubjectId?: number | null | undefined; userId: number; newDate: string; newStartTime: string; newEndTime: string; notes?: string | undefined },
  ): Promise<Record<string, unknown>> {
    const examIdInt = toNullableIntId(input.examId);
    if (!examIdInt) return { status: 0, message: 'Invalid exam id.' };
    if (!input.userId) return { status: 0, message: 'Student is required.' };
    if (!input.newDate || !input.newStartTime || !input.newEndTime) return { status: 0, message: 'Date and times are required.' };
    await this.prisma.exam_re_examinations.create({
      data: {
        exam_id: examIdInt,
        exam_subject_id: input.examSubjectId ?? null,
        user_id: input.userId,
        new_date: new Date(input.newDate),
        new_start_time: new Date(`1970-01-01T${input.newStartTime}:00`),
        new_end_time: new Date(`1970-01-01T${input.newEndTime}:00`),
        notes: input.notes ?? null,
        status: 'scheduled',
        created_by: toNullableIntId(actorUserId),
      },
    });
    return { status: 1, message: 'Re-exam scheduled.' };
  }

  // Naji 2026-05-09 — Evaluation drill-down (Exams → Subjects → Students)
  // + manual descriptive grading + exam-wise result publishing.
  async listEvaluationExams(): Promise<Record<string, unknown>[]> {
    const exams = await this.prisma.exam.findMany({
      where: { deleted_at: null, status: 'published' },
      select: { id: true, exam_code: true, title: true, from_date: true, result_published_at: true },
      orderBy: { id: 'desc' },
    });
    if (exams.length === 0) return [];
    const examIds = exams.map((e) => e.id);
    const [allocs, attempts] = await Promise.all([
      this.prisma.exam_student_allocations.groupBy({ by: ['exam_id'], where: { exam_id: { in: examIds } }, _count: { user_id: true } }),
      this.prisma.exam_attempt.groupBy({ by: ['exam_id'], where: { exam_id: { in: examIds } }, _count: { id: true } }),
    ]);
    const allocByExam = new Map(allocs.map((a) => [a.exam_id, a._count.user_id]));
    const attemptByExam = new Map(attempts.map((a) => [a.exam_id ?? 0, a._count.id]));
    return exams.map((e) => ({
      exam_id: e.id,
      exam_code: e.exam_code,
      title: e.title,
      from_date: e.from_date,
      allocated: allocByExam.get(e.id) ?? 0,
      attempted: attemptByExam.get(e.id) ?? 0,
      result_published: !!e.result_published_at,
      result_published_at: e.result_published_at,
    }));
  }

  async listEvaluationSubjects(examId: string): Promise<Record<string, unknown>[]> {
    const id = toNullableIntId(examId);
    if (!id) return [];
    const subjects = await this.prisma.exam_subjects.findMany({ where: { exam_id: id }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    if (subjects.length === 0) return [];
    // Count components for each subject (gives a rough "how much manual evaluation").
    const components = await this.prisma.exam_subject_components.findMany({ where: { exam_subject_id: { in: subjects.map((s) => s.id) } } });
    const compsBySubject = new Map<number, Array<{ component_type: string; num_questions: number | null }>>();
    for (const c of components) {
      const arr = compsBySubject.get(c.exam_subject_id) ?? [];
      arr.push({ component_type: c.component_type, num_questions: c.num_questions });
      compsBySubject.set(c.exam_subject_id, arr);
    }
    return subjects.map((s) => {
      const cs = compsBySubject.get(s.id) ?? [];
      const mcq = cs.filter((c) => c.component_type === 'mcq').reduce((acc, c) => acc + (c.num_questions ?? 0), 0);
      const desc = cs.filter((c) => c.component_type === 'descriptive').reduce((acc, c) => acc + (c.num_questions ?? 0), 0);
      return {
        exam_subject_id: s.id,
        subject_title: s.subject_title,
        exam_date: s.exam_date,
        total_marks: s.total_marks,
        pass_marks: s.pass_marks,
        mcq_questions: mcq,
        descriptive_questions: desc,
      };
    });
  }

  async listEvaluationStudents(examId: string): Promise<Record<string, unknown>[]> {
    const id = toNullableIntId(examId);
    if (!id) return [];
    const allocs = await this.prisma.exam_student_allocations.findMany({ where: { exam_id: id }, select: { user_id: true } });
    const userIds = allocs.map((a) => a.user_id);
    if (userIds.length === 0) return [];
    const [users, attempts] = await Promise.all([
      this.prisma.users.findMany({ where: { id: { in: userIds }, deleted_at: null }, select: { id: true, name: true, user_email: true, email: true, student_id: true } }),
      this.prisma.exam_attempt.findMany({ where: { exam_id: id, user_id: { in: userIds } }, select: { id: true, user_id: true, score: true, correct: true, incorrect: true, skip: true, submit_status: true } }),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const attemptByUser = new Map(attempts.map((t) => [t.user_id ?? 0, t]));
    // Pull descriptive grade counts per attempt (best-effort — schema has the table).
    const attemptIds = attempts.map((t) => t.id);
    const grades = attemptIds.length > 0
      ? await this.prisma.exam_descriptive_grades.findMany({ where: { attempt_id: { in: attemptIds } }, select: { attempt_id: true, score: true } })
      : [];
    const gradesByAttempt = new Map<number, number>();
    for (const g of grades) gradesByAttempt.set(g.attempt_id, (gradesByAttempt.get(g.attempt_id) ?? 0) + 1);
    return userIds.map((uid) => {
      const u = userMap.get(uid);
      const a = attemptByUser.get(uid) ?? null;
      return {
        user_id: uid,
        student_id: u?.student_id ?? '',
        name: u?.name ?? '',
        email: u?.user_email ?? u?.email ?? '',
        attempt_id: a?.id ?? null,
        attempted: !!a,
        submit_status: a?.submit_status ?? false,
        mcq_score: a?.score ?? 0,
        correct: a?.correct ?? 0,
        incorrect: a?.incorrect ?? 0,
        skip: a?.skip ?? 0,
        descriptive_graded: a ? gradesByAttempt.get(a.id) ?? 0 : 0,
      };
    });
  }

  async submitDescriptiveGrade(
    actorUserId: string,
    input: { attemptId: number; questionId: number; score: number; remarks?: string | undefined },
  ): Promise<Record<string, unknown>> {
    if (!input.attemptId || !input.questionId) return { status: 0, message: 'Invalid input.' };
    await this.prisma.exam_descriptive_grades.upsert({
      where: { attempt_id_question_id: { attempt_id: input.attemptId, question_id: input.questionId } },
      create: {
        attempt_id: input.attemptId,
        question_id: input.questionId,
        score: input.score,
        remarks: input.remarks ?? null,
        graded_by: toNullableIntId(actorUserId),
      },
      update: {
        score: input.score,
        remarks: input.remarks ?? null,
        graded_by: toNullableIntId(actorUserId),
        graded_at: new Date(),
      },
    });
    return { status: 1, message: 'Score saved.' };
  }

  async publishExamResults(actorUserId: string, examId: string): Promise<Record<string, unknown>> {
    const id = toNullableIntId(examId);
    if (!id) return { status: 0, message: 'Invalid exam id.' };
    const actor = toNullableIntId(actorUserId);
    const now = new Date();
    await this.prisma.exam.updateMany({
      where: { id, deleted_at: null },
      data: { result_published_at: now, result_published_by: actor, updated_at: now, updated_by: actor },
    });
    // Best-effort: notify all allocated students by email.
    try {
      const allocs = await this.prisma.exam_student_allocations.findMany({ where: { exam_id: id }, select: { user_id: true } });
      const userIds = allocs.map((a) => a.user_id);
      if (userIds.length > 0) {
        const students = await this.prisma.users.findMany({ where: { id: { in: userIds }, deleted_at: null }, select: { id: true, name: true, user_email: true, email: true } });
        const exam = await this.prisma.exam.findFirst({ where: { id }, select: { title: true, exam_code: true } });
        const { createIntegrationRegistry } = await import('../integrations/registry.js');
        const { renderBrandedEmail } = await import('../integrations/email-template.js');
        const registry = createIntegrationRegistry();
        for (const s of students) {
          const to = s.user_email ?? s.email ?? '';
          if (!to) continue;
          try {
            await registry.email.sendEmail({
              to,
              subject: `Results published — ${exam?.title ?? 'TTII'}`,
              html: renderBrandedEmail({
                heading: 'Your Exam Results Are Out',
                bodyHtml: `<p>Hi ${escapeHtmlText(s.name ?? 'there')},</p><p>Results for <strong>${escapeHtmlText(exam?.title ?? '')}</strong>${exam?.exam_code ? ` (${escapeHtmlText(exam.exam_code)})` : ''} have been published. Log in to your portal to see your score and feedback.</p>`,
                cta: { label: 'View My Results', href: 'https://learn.teachersindia.in/exams' },
              }),
            });
          } catch { /* best-effort */ }
        }
      }
    } catch { /* email phase swallowed */ }
    return { status: 1, message: 'Results published.' };
  }

  // Naji 2026-05-09 — Student Eligibility table.
  // Per-enrollment rows tagged Eligible / Completed / Not Eligible.
  //
  // Eligible: fee fully paid AND every assignment for the enrolment's
  //   course has at least one submission with marks (evaluated). Course
  //   duration check is TBD until we add a duration field on course.
  // Completed: every exam allocated to this student has an exam_attempt
  //   (any status — submitted counts as completed).
  // Not Eligible: every enrolment that's neither Eligible nor Completed.
  async listStudentEligibility(): Promise<Record<string, unknown>[]> {
    const enrolments = await this.prisma.enrol.findMany({
      where: { deleted_at: null },
      select: { id: true, user_id: true, course_id: true, enrollment_id: true, enrollment_date: true, enrollment_status: true },
      orderBy: { id: 'desc' },
    });
    if (enrolments.length === 0) return [];

    const userIds = Array.from(new Set(enrolments.map((e) => e.user_id).filter((v): v is number => v !== null)));
    const courseIds = Array.from(new Set(enrolments.map((e) => e.course_id).filter((v): v is number => v !== null)));

    const [users, courses, assignments] = await Promise.all([
      userIds.length > 0
        ? this.prisma.users.findMany({
            where: { id: { in: userIds }, deleted_at: null },
            select: { id: true, name: true, user_email: true, email: true, student_id: true, application_id: true },
          })
        : Promise.resolve([] as Array<{ id: number; name: string | null; user_email: string | null; email: string | null; student_id: number | null; application_id: number | null }>),
      courseIds.length > 0
        ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
        : Promise.resolve([] as Array<{ id: number; title: string | null }>),
      // Pull all assignments scoped to the involved courses (assignment.course_id).
      // assignment table doesn't have course_id directly — it ties through cohort.
      // We'll fetch via a left join; here use raw SQL because cohort→course is loose.
      // Naji UAT 2026-05-22 — also return cohort_id so we can restrict
      // "required assignments" to the cohorts each student is in, not
      // every cohort in the course. Two cohorts of the same course can
      // have different assignment sets, and Priya V (TTS0004) regressed
      // from Eligible to Not Eligible when a sibling cohort added a new
      // assignment she was never expected to submit.
      courseIds.length > 0
        ? this.prisma.$queryRaw<Array<{ id: number; cohort_id: number; course_id: number }>>`
            SELECT a.id, COALESCE(a.cohort_id, 0) AS cohort_id, c.course_id
            FROM assignment a
            LEFT JOIN cohorts c ON c.id = a.cohort_id
            WHERE c.course_id IN (${Prisma.join(courseIds)})
              AND (a.deleted_at IS NULL)
          `.catch(() => [])
        : Promise.resolve([] as Array<{ id: number; cohort_id: number; course_id: number }>),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const courseMap = new Map(courses.map((c) => [c.id, c.title ?? '']));
    // Map a (course_id) → list of {assignmentId, cohortId} so we can
    // intersect with the student's cohort memberships per-enrolment.
    const assignmentsByCourse = new Map<number, Array<{ id: number; cohortId: number }>>();
    for (const a of assignments) {
      const arr = assignmentsByCourse.get(a.course_id) ?? [];
      arr.push({ id: a.id, cohortId: a.cohort_id });
      assignmentsByCourse.set(a.course_id, arr);
    }

    // Per-user cohort membership. cohort_students.cohort_id is text in
    // the legacy schema; coerce to int for the lookup.
    const cohortMembershipByUser = new Map<number, Set<number>>();
    if (userIds.length > 0) {
      const memberships = await this.prisma.cohort_students.findMany({
        where: { user_id: { in: userIds }, deleted_at: null },
        select: { user_id: true, cohort_id: true },
      });
      for (const m of memberships) {
        if (m.user_id === null) continue;
        const cidNum = Number(m.cohort_id);
        if (!Number.isFinite(cidNum) || cidNum <= 0) continue;
        const set = cohortMembershipByUser.get(m.user_id) ?? new Set<number>();
        set.add(cidNum);
        cohortMembershipByUser.set(m.user_id, set);
      }
    }

    // Offering lookup: users.application_id -> applications.offering_id ->
    // offerings.title. Mirrors the pattern used by listEnrollments so the
    // Course Offering column on Student Eligibility matches the one on the
    // Enrollments page. Naji UAT 2026-05-22.
    const applicationIds = [...new Set(users.map((u) => u.application_id).filter((v): v is number => v !== null && v > 0))];
    const applicationRows = applicationIds.length > 0
      ? await this.prisma.applications.findMany({
          where: { id: { in: applicationIds }, deleted_at: null },
          select: { id: true, offering_id: true },
        })
      : [];
    const offeringIds = [...new Set(applicationRows.map((a) => a.offering_id).filter((v): v is number => !!v && v > 0))];
    const offeringRows = offeringIds.length > 0
      ? await this.prisma.offerings.findMany({
          where: { id: { in: offeringIds }, deleted_at: null },
          select: { id: true, title: true, offering_code: true },
        })
      : [];
    const offeringMap = new Map(offeringRows.map((o) => [o.id, o]));
    const appOfferingMap = new Map(applicationRows.map((a) => [a.id, a.offering_id ?? 0]));

    // All submission rows for these users — status = has marks.
    const submissions = userIds.length > 0
      ? await this.prisma.assignment_submissions.findMany({
          where: { deleted_at: null, user_id: { in: userIds }, assignment_id: { not: null } },
          select: { user_id: true, assignment_id: true, marks: true },
        })
      : [];
    // Set of (user_id|assignment_id) where marks is non-empty.
    const evaluatedKeys = new Set<string>();
    for (const s of submissions) {
      if (s.user_id === null || s.assignment_id === null) continue;
      if (s.marks !== null && s.marks !== undefined && String(s.marks).trim() !== '') {
        evaluatedKeys.add(`${s.user_id}:${s.assignment_id}`);
      }
    }

    // Fee paid per (user_id, course_id) — reuses the same raw-SQL aggregation
    // pattern as Fee Summary so legacy 0000-00-00 paid_date doesn't crash.
    type PayAgg = { user_id: number; course_id: number; total: number; paid: number };
    const payAggs = userIds.length > 0
      ? await this.prisma.$queryRaw<PayAgg[]>`
          SELECT user_id, course_id,
            COALESCE(SUM(amount), 0) AS total,
            COALESCE(SUM(CASE WHEN LOWER(status) = 'paid' THEN amount ELSE 0 END), 0) AS paid
          FROM student_payments
          WHERE deleted_at IS NULL AND user_id IN (${Prisma.join(userIds)})
          GROUP BY user_id, course_id
        `
      : [];
    const payByKey = new Map<string, PayAgg>();
    for (const r of payAggs) payByKey.set(`${Number(r.user_id)}:${Number(r.course_id)}`, { user_id: Number(r.user_id), course_id: Number(r.course_id), total: Number(r.total), paid: Number(r.paid) });

    // Exam allocations + attempts per user (Completed determination).
    const allocByUser = new Map<number, number[]>();
    if (userIds.length > 0) {
      const allocs = await this.prisma.exam_student_allocations.findMany({ where: { user_id: { in: userIds } }, select: { user_id: true, exam_id: true } });
      for (const a of allocs) {
        const arr = allocByUser.get(a.user_id) ?? [];
        arr.push(a.exam_id);
        allocByUser.set(a.user_id, arr);
      }
    }
    const attemptsByUser = new Map<number, Set<number>>();
    if (userIds.length > 0) {
      const attempts = await this.prisma.exam_attempt.findMany({ where: { user_id: { in: userIds } }, select: { user_id: true, exam_id: true } });
      for (const a of attempts) {
        if (a.user_id === null || a.exam_id === null) continue;
        const set = attemptsByUser.get(a.user_id) ?? new Set<number>();
        set.add(a.exam_id);
        attemptsByUser.set(a.user_id, set);
      }
    }

    return enrolments.map((e) => {
      const u = e.user_id ? userMap.get(e.user_id) : null;
      const courseTitle = e.course_id ? courseMap.get(e.course_id) ?? '' : '';
      const reasons: string[] = [];
      const offId = u?.application_id ? appOfferingMap.get(u.application_id) ?? 0 : 0;
      const offering = offId ? offeringMap.get(offId) : null;
      const offeringTitle = offering?.title ?? offering?.offering_code ?? '';

      // Fee
      const pay = e.user_id && e.course_id ? payByKey.get(`${e.user_id}:${e.course_id}`) : null;
      const feeOk = pay ? pay.paid >= pay.total && pay.total > 0 : false;
      if (!feeOk) reasons.push('Fee not fully paid');

      // Assignments — must have at least one assignment configured AND
      // all of them evaluated. A course with zero assignments cannot make
      // a student eligible, even if their fee is fully paid (Naji UAT
      // 2026-05-12).
      //
      // Naji UAT 2026-05-22 — assignments are scoped to the student's
      // cohort, NOT the entire course. Two cohorts of the same course
      // can have different assignment sets; counting both against any
      // student was making them look incomplete unfairly. We still fall
      // back to the full-course set when we have no cohort membership
      // on file (better than zero — preserves the eligibility signal
      // for legacy data that predates cohort assignment).
      const courseAssignments = e.course_id ? assignmentsByCourse.get(e.course_id) ?? [] : [];
      const myCohorts = e.user_id ? cohortMembershipByUser.get(e.user_id) ?? new Set<number>() : new Set<number>();
      const scopedAssignments = myCohorts.size > 0
        ? courseAssignments.filter((a) => a.cohortId > 0 && myCohorts.has(a.cohortId))
        : courseAssignments;
      const assignmentIds = scopedAssignments.map((a) => a.id);
      const totalAssignments = assignmentIds.length;
      const evaluatedCount = e.user_id ? assignmentIds.filter((aid) => evaluatedKeys.has(`${e.user_id}:${aid}`)).length : 0;
      const assignmentsOk = totalAssignments > 0 && evaluatedCount === totalAssignments;
      if (totalAssignments === 0) {
        reasons.push('No assignments configured for this cohort');
      } else if (evaluatedCount < totalAssignments) {
        reasons.push(`${totalAssignments - evaluatedCount} assignment(s) pending evaluation`);
      }

      // Completed = all allocated exams have an attempt
      const allocated = e.user_id ? allocByUser.get(e.user_id) ?? [] : [];
      const attempted = e.user_id ? attemptsByUser.get(e.user_id) ?? new Set<number>() : new Set<number>();
      const allCompleted = allocated.length > 0 && allocated.every((eid) => attempted.has(eid));

      let status: 'eligible' | 'completed' | 'not_eligible';
      if (allCompleted) status = 'completed';
      else if (feeOk && assignmentsOk) status = 'eligible';
      else status = 'not_eligible';

      return {
        enrol_id: e.id,
        enrollment_id: e.enrollment_id ?? '',
        user_id: e.user_id,
        student_id: u?.student_id ?? '',
        student_name: u?.name ?? '',
        email: u?.user_email ?? u?.email ?? '',
        course_id: e.course_id,
        course_title: courseTitle,
        offering_id: offId || null,
        course_offering: offeringTitle,
        enrollment_date: e.enrollment_date ?? '',
        enrollment_status: e.enrollment_status ?? '',
        status,
        fee_paid: pay?.paid ?? 0,
        fee_total: pay?.total ?? 0,
        assignments_total: totalAssignments,
        assignments_evaluated: evaluatedCount,
        exams_allocated: allocated.length,
        exams_attempted: attempted.size,
        reasons: reasons.join(' · '),
      };
    });
  }

  // Naji 2026-05-09 — bulk Question Bank upload, hardened 2026-05-25
  // after Risha hit "MCQ:1, Descriptive:1" on a 50-row CSV. The original
  // version had `catch { /* skip individual failures */ }` which swallowed
  // every DB error — so the user saw silent dedup. Now we collect each
  // row's error and surface it back to the UI. We also strip MCQ-only
  // fields server-side when q_type=1 so a Descriptive row carrying
  // leftover options can never persist orphan data.
  async bulkAddQuestions(
    actorUserId: string,
    rows: Array<{
      courseId?: string | undefined;
      subjectId?: string | undefined;
      lessonId?: string | undefined;
      qType: number; // 0 = MCQ, 1 = Descriptive
      title: string;
      options?: string[] | undefined;
      correctAnswers?: number[] | undefined; // indexes into options
      hint?: string | undefined;
      solution?: string | undefined;
    }>,
  ): Promise<Record<string, unknown>> {
    const actor = toNullableIntId(actorUserId);
    const valid = rows.filter((r) => r.title.trim().length > 0);
    if (valid.length === 0) return { status: 0, message: 'No valid rows to upload.' };
    const now = new Date();
    let created = 0;
    const failures: Array<{ row: number; title: string; error: string }> = [];
    for (let i = 0; i < valid.length; i++) {
      const r = valid[i];
      if (!r) continue;
      const isDescriptive = (r.qType ?? 0) === 1;
      const opts = isDescriptive ? [] : (r.options ?? []);
      const correct = isDescriptive ? [] : (r.correctAnswers ?? []);
      try {
        await this.prisma.question_bank.create({
          data: {
            course_id: toNullableIntId(r.courseId),
            subject_id: toNullableIntId(r.subjectId),
            lesson_id: toNullableIntId(r.lessonId),
            q_type: isDescriptive ? 1 : 0,
            title: r.title.trim(),
            number_of_options: opts.length,
            options: JSON.stringify(opts),
            correct_answers: JSON.stringify(correct),
            hint: r.hint ?? null,
            solution: r.solution ?? null,
            created_by: actor,
            created_at: now,
            updated_at: now,
          },
        });
        created += 1;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[bulkAddQuestions] row %d (%s) failed: %s', i + 1, r.title.slice(0, 60), message);
        failures.push({ row: i + 1, title: r.title.slice(0, 80), error: message });
      }
    }
    const ok = failures.length === 0;
    const summary = ok
      ? `${created} question(s) uploaded.`
      : `${created} of ${valid.length} uploaded — ${failures.length} failed.`;
    return { status: ok ? 1 : 0, message: summary, data: { created, attempted: valid.length, failures } };
  }

  // Naji 2026-05-09 — Step 2: scheduling-suggestions returns one row
  // per UNIQUE subject across the picked courses (subjects shared
  // across courses run as a single exam — Naji's option 'a').
  async getExamSchedulingSuggestions(examId: string): Promise<Record<string, unknown>[]> {
    const id = toNullableIntId(examId);
    if (!id) return [];
    const links = await this.prisma.exam_courses.findMany({ where: { exam_id: id }, select: { course_id: true } });
    const courseIds = links.map((l) => l.course_id);
    if (courseIds.length === 0) return [];
    const courses = await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true, structure_type: true } });
    const courseTitleMap = new Map(courses.map((c) => [c.id, c.title ?? '']));
    // Lesson-wise courses (structure_type=2) have no subjects — an exam attaches
    // to the WHOLE course (Naji 2026-06-23). Subject-wise courses still schedule
    // per subject via the course_subject pivot.
    const lessonWiseCourseIds = courses.filter((c) => c.structure_type === 2).map((c) => c.id);
    const subjectWiseCourseIds = courses.filter((c) => c.structure_type !== 2).map((c) => c.id);

    const pivot = subjectWiseCourseIds.length > 0
      ? await this.prisma.course_subject.findMany({
          where: { deleted_at: null, course_id: { in: subjectWiseCourseIds } },
          select: { subject_id: true, course_id: true },
        })
      : [];
    const subjectIds = Array.from(new Set(pivot.map((p) => p.subject_id)));
    const subjects = subjectIds.length > 0
      ? await this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, title: true } })
      : [];
    const subjectTitleMap = new Map(subjects.map((s) => [s.id, s.title ?? '']));
    const courseIdsBySubject = new Map<number, number[]>();
    for (const p of pivot) {
      const arr = courseIdsBySubject.get(p.subject_id) ?? [];
      arr.push(p.course_id);
      courseIdsBySubject.set(p.subject_id, arr);
    }
    const subjectRows = [...subjectIds].sort().map((sid) => {
      const courseIdList = courseIdsBySubject.get(sid) ?? [];
      const courseNames = courseIdList.map((cid) => courseTitleMap.get(cid) ?? '').filter(Boolean).join(', ');
      return {
        subject_id: sid,
        subject_title: subjectTitleMap.get(sid) ?? `Subject ${sid}`,
        course_ids: courseIdList.join(','),
        available_courses: courseNames,
      };
    });

    // One "whole course" schedulable unit per lesson-wise course (subject_id NULL).
    const lessonWiseRows = lessonWiseCourseIds.map((cid) => ({
      subject_id: null,
      subject_title: courseTitleMap.get(cid) || `Course ${cid}`,
      course_ids: String(cid),
      available_courses: courseTitleMap.get(cid) ?? '',
    }));

    return [...subjectRows, ...lessonWiseRows];
  }

  async getExamSchedule(examId: string): Promise<Record<string, unknown>[]> {
    const id = toNullableIntId(examId);
    if (!id) return [];
    const rows = await this.prisma.exam_subjects.findMany({ where: { exam_id: id }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    if (rows.length === 0) return [];
    // Resolve available course names from the stored CSV.
    const allCourseIds = Array.from(new Set(rows.flatMap((r) => (r.course_ids ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0))));
    const courses = allCourseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: allCourseIds } }, select: { id: true, title: true } })
      : [];
    const courseMap = new Map(courses.map((c) => [c.id, c.title ?? '']));
    return rows.map((r) => {
      const ids = (r.course_ids ?? '').split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n > 0);
      return {
        id: r.id,
        subject_id: r.subject_id,
        subject_title: r.subject_title,
        course_ids: r.course_ids,
        available_courses: ids.map((i) => courseMap.get(i) ?? '').filter(Boolean).join(', '),
        exam_date: r.exam_date,
        start_time: r.start_time,
        end_time: r.end_time,
        duration_minutes: r.duration_minutes,
        total_marks: r.total_marks,
        pass_marks: r.pass_marks,
        position: r.position,
      };
    });
  }

  async saveExamSchedule(
    actorUserId: string,
    examId: string,
    rows: Array<{
      id?: number | null | undefined;
      subjectId?: number | null | undefined;
      subjectTitle: string;
      courseIds: string;
      examDate?: string | undefined;
      startTime?: string | undefined;
      endTime?: string | undefined;
      durationMinutes?: number | undefined;
      totalMarks?: number | undefined;
      passMarks?: number | undefined;
    }>,
  ): Promise<Record<string, unknown>> {
    const id = toNullableIntId(examId);
    if (!id) return { status: 0, message: 'Invalid exam id.' };
    void actorUserId;
    // Replace strategy — delete existing rows then insert the submitted set.
    await this.prisma.exam_subjects.deleteMany({ where: { exam_id: id } });
    if (rows.length > 0) {
      await this.prisma.exam_subjects.createMany({
        data: rows.map((r, idx) => ({
          exam_id: id,
          subject_id: r.subjectId ?? null,
          subject_title: r.subjectTitle.trim(),
          course_ids: r.courseIds || null,
          exam_date: r.examDate ? new Date(r.examDate) : null,
          start_time: r.startTime ? new Date(`1970-01-01T${r.startTime}:00`) : null,
          end_time: r.endTime ? new Date(`1970-01-01T${r.endTime}:00`) : null,
          duration_minutes: r.durationMinutes ?? null,
          total_marks: r.totalMarks ?? null,
          pass_marks: r.passMarks ?? null,
          position: idx,
        })),
      });
    }
    return { status: 1, message: 'Schedule saved.' };
  }

  // Naji 2026-05-09 — Step 3: per-subject components (MCQ / Descriptive).
  async getExamComponents(examId: string): Promise<Record<string, unknown>[]> {
    const id = toNullableIntId(examId);
    if (!id) return [];
    const subjects = await this.prisma.exam_subjects.findMany({ where: { exam_id: id }, select: { id: true } });
    const subjectIds = subjects.map((s) => s.id);
    if (subjectIds.length === 0) return [];
    const rows = await this.prisma.exam_subject_components.findMany({ where: { exam_subject_id: { in: subjectIds } } });
    return rows.map((r) => ({
      id: r.id,
      exam_subject_id: r.exam_subject_id,
      component_type: r.component_type,
      num_questions: r.num_questions,
      marks_each: r.marks_each === null ? 0 : Number(r.marks_each),
      negative_marks: r.negative_marks === null ? 0 : Number(r.negative_marks),
      shuffle_questions: !!r.shuffle_questions,
      shuffle_options: !!r.shuffle_options,
      word_limit: r.word_limit,
    }));
  }

  async saveExamComponents(
    examId: string,
    rows: Array<{
      examSubjectId: number;
      componentType: 'mcq' | 'descriptive';
      numQuestions: number;
      marksEach: number;
      negativeMarks?: number | undefined;
      shuffleQuestions?: boolean | undefined;
      shuffleOptions?: boolean | undefined;
      wordLimit?: number | undefined;
    }>,
  ): Promise<Record<string, unknown>> {
    const id = toNullableIntId(examId);
    if (!id) return { status: 0, message: 'Invalid exam id.' };
    const subjects = await this.prisma.exam_subjects.findMany({ where: { exam_id: id }, select: { id: true } });
    const subjectIds = new Set(subjects.map((s) => s.id));
    if (subjectIds.size === 0) return { status: 0, message: 'Save the schedule (Step 2) first.' };
    await this.prisma.exam_subject_components.deleteMany({ where: { exam_subject_id: { in: [...subjectIds] } } });
    if (rows.length > 0) {
      await this.prisma.exam_subject_components.createMany({
        data: rows
          .filter((r) => subjectIds.has(r.examSubjectId))
          .map((r) => ({
            exam_subject_id: r.examSubjectId,
            component_type: r.componentType,
            num_questions: r.numQuestions ?? 0,
            marks_each: r.marksEach ?? 0,
            negative_marks: r.negativeMarks ?? 0,
            shuffle_questions: r.shuffleQuestions ? 1 : 0,
            shuffle_options: r.shuffleOptions ? 1 : 0,
            word_limit: r.wordLimit ?? null,
          })),
      });
    }
    return { status: 1, message: 'Components saved.' };
  }

  // Naji 2026-06-09 — Question assignment (the missing wizard step). The
  // component step (above) only stores planning metadata; the student player
  // serves questions exclusively from exam_questions and availability counts
  // exam_questions only — so without this an exam built in the wizard has
  // questionCount 0 and is never takeable. These three methods let the admin
  // pick real question_bank rows for the exam and persist exam_questions.

  // Candidate questions: every live question in the exam's course(s); a flag
  // marks those whose subject is one the exam is scheduled for.
  async listExamQuestionOptions(examId: string): Promise<Record<string, unknown>[]> {
    const id = toNullableIntId(examId);
    if (!id) return [];
    const links = await this.prisma.exam_courses.findMany({ where: { exam_id: id }, select: { course_id: true } });
    let courseIds = links.map((l) => l.course_id).filter((x): x is number => x !== null && x !== undefined);
    if (courseIds.length === 0) {
      const ex = await this.prisma.exam.findUnique({ where: { id }, select: { course_id: true } });
      if (ex?.course_id) courseIds = [ex.course_id];
    }
    if (courseIds.length === 0) return [];
    const scheduled = await this.prisma.exam_subjects.findMany({ where: { exam_id: id }, select: { subject_id: true } });
    const scheduledSubjects = new Set(scheduled.map((s) => s.subject_id).filter((x): x is number => x !== null && x !== undefined));
    const questions = await this.prisma.question_bank.findMany({
      where: { deleted_at: null, course_id: { in: courseIds } },
      select: { id: true, title: true, q_type: true, subject_id: true, course_id: true, number_of_options: true },
      orderBy: [{ subject_id: 'asc' }, { id: 'desc' }],
    });
    const subjectIds = [...new Set(questions.map((q) => q.subject_id).filter((x): x is number => x !== null && x !== undefined))];
    const subjects = subjectIds.length > 0
      ? await this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, title: true } })
      : [];
    const subjectMap = new Map(subjects.map((s) => [s.id, s.title ?? '']));
    return questions.map((q) => ({
      id: q.id,
      title: (q.title ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
      subject_id: q.subject_id,
      subject_title: q.subject_id !== null && q.subject_id !== undefined ? (subjectMap.get(q.subject_id) ?? '') : '',
      q_type: q.q_type,
      number_of_options: q.number_of_options,
      in_scheduled_subject: q.subject_id !== null && q.subject_id !== undefined && scheduledSubjects.has(q.subject_id),
    }));
  }

  async getExamQuestions(examId: string): Promise<Record<string, unknown>[]> {
    const id = toNullableIntId(examId);
    if (!id) return [];
    const rows = await this.prisma.exam_questions.findMany({
      where: { exam_id: id, deleted_at: null },
      orderBy: [{ question_no: 'asc' }, { id: 'asc' }],
      select: { id: true, question_id: true, question_no: true, mark: true },
    });
    return rows.map((r) => ({
      id: r.id,
      question_id: r.question_id,
      question_no: r.question_no,
      mark: r.mark === null ? 0 : Number(r.mark),
    }));
  }

  async saveExamQuestions(
    actorUserId: string,
    examId: string,
    questions: Array<{ questionId: number; mark: number }>,
  ): Promise<Record<string, unknown>> {
    const id = toNullableIntId(examId);
    if (!id) return { status: 0, message: 'Invalid exam id.' };
    const actor = toNullableIntId(actorUserId);
    const now = new Date();
    // Only keep ids that still point at a live question_bank row.
    const ids = questions.map((q) => q.questionId).filter((n) => Number.isInteger(n) && n > 0);
    const valid = ids.length > 0
      ? await this.prisma.question_bank.findMany({ where: { id: { in: ids }, deleted_at: null }, select: { id: true } })
      : [];
    const validSet = new Set(valid.map((v) => v.id));
    const finalRows = questions.filter((q) => validSet.has(q.questionId));
    // Replace strategy — matches schedule/components/allocations.
    await this.prisma.exam_questions.deleteMany({ where: { exam_id: id } });
    if (finalRows.length > 0) {
      await this.prisma.exam_questions.createMany({
        data: finalRows.map((q, idx) => ({
          exam_id: id,
          question_id: q.questionId,
          question_no: idx + 1,
          mark: Number.isFinite(q.mark) ? q.mark : 0,
          created_by: actor,
          created_at: now,
          updated_at: now,
        })),
      });
    }
    // Keep exam.mark in sync so the student exam list shows the right total.
    const totalMarks = finalRows.reduce((sum, q) => sum + (Number.isFinite(q.mark) ? q.mark : 0), 0);
    await this.prisma.exam.updateMany({ where: { id }, data: { mark: totalMarks, updated_at: now, updated_by: actor } });
    return { status: 1, message: 'Questions assigned.', data: { count: finalRows.length, totalMarks } };
  }

  // Naji 2026-05-09 — Step 4: eligible students = active enrolments in
  // the exam's picked courses. Default scoping until the new Student
  // Eligibility module's rules go live.
  async getExamEligibleStudents(examId: string): Promise<Record<string, unknown>[]> {
    const id = toNullableIntId(examId);
    if (!id) return [];
    const links = await this.prisma.exam_courses.findMany({ where: { exam_id: id }, select: { course_id: true } });
    const courseIds = links.map((l) => l.course_id);
    if (courseIds.length === 0) return [];
    const enrolments = await this.prisma.enrol.findMany({
      where: { deleted_at: null, course_id: { in: courseIds } },
      select: { user_id: true, course_id: true, enrollment_status: true },
    });
    const userIds = Array.from(new Set(enrolments.map((e) => e.user_id).filter((v): v is number => v !== null)));
    if (userIds.length === 0) return [];
    const [users, courses] = await Promise.all([
      this.prisma.users.findMany({ where: { id: { in: userIds }, deleted_at: null }, select: { id: true, name: true, user_email: true, email: true, student_id: true } }),
      this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const courseMap = new Map(courses.map((c) => [c.id, c.title ?? '']));
    // Build (user, courses) — one row per user with the courses they're enrolled in.
    const coursesByUser = new Map<number, string[]>();
    for (const e of enrolments) {
      if (!e.user_id || !e.course_id) continue;
      const arr = coursesByUser.get(e.user_id) ?? [];
      const t = courseMap.get(e.course_id);
      if (t && !arr.includes(t)) arr.push(t);
      coursesByUser.set(e.user_id, arr);
    }
    return [...coursesByUser.keys()].map((uid) => {
      const u = userMap.get(uid);
      return {
        user_id: uid,
        student_id: u?.student_id ?? '',
        name: u?.name ?? '',
        email: u?.user_email ?? u?.email ?? '',
        courses: (coursesByUser.get(uid) ?? []).join(', '),
      };
    }).sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  async getExamAllocations(examId: string): Promise<number[]> {
    const id = toNullableIntId(examId);
    if (!id) return [];
    const rows = await this.prisma.exam_student_allocations.findMany({ where: { exam_id: id }, select: { user_id: true } });
    return rows.map((r) => r.user_id);
  }

  async saveExamAllocations(examId: string, userIds: number[]): Promise<Record<string, unknown>> {
    const id = toNullableIntId(examId);
    if (!id) return { status: 0, message: 'Invalid exam id.' };
    await this.prisma.exam_student_allocations.deleteMany({ where: { exam_id: id } });
    if (userIds.length > 0) {
      await this.prisma.exam_student_allocations.createMany({
        data: userIds.map((user_id) => ({ exam_id: id, user_id })),
        skipDuplicates: true,
      });
    }
    return { status: 1, message: 'Allocations saved.' };
  }

  // Naji 2026-05-09 — Step 5: instruction templates library + publish.
  async listInstructionTemplates(): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.exam_instruction_templates.findMany({ where: { deleted_at: null }, orderBy: { id: 'desc' } });
    return rows.map((r) => ({ id: r.id, title: r.title, body: r.body, created_at: r.created_at }));
  }

  async createInstructionTemplate(actorUserId: string, input: { title: string; body: string }): Promise<Record<string, unknown>> {
    const title = input.title.trim();
    if (!title) return { status: 0, message: 'Title is required.' };
    const created = await this.prisma.exam_instruction_templates.create({
      data: { title, body: input.body ?? '', created_by: toNullableIntId(actorUserId) },
    });
    return { status: 1, message: 'Template saved.', data: { id: created.id } };
  }

  async deleteInstructionTemplate(id: string): Promise<Record<string, unknown>> {
    const tid = toNullableIntId(id);
    if (!tid) return { status: 0, message: 'Invalid template id.' };
    await this.prisma.exam_instruction_templates.updateMany({ where: { id: tid }, data: { deleted_at: new Date() } });
    return { status: 1, message: 'Template deleted.' };
  }

  async publishExam(
    actorUserId: string,
    examId: string,
    input: { instructions?: string | undefined; notifyEmail: boolean; notifyInapp: boolean },
  ): Promise<Record<string, unknown>> {
    const id = toNullableIntId(examId);
    const actor = toNullableIntId(actorUserId);
    if (!id || !actor) return { status: 0, message: 'Invalid input.' };
    const now = new Date();
    await this.prisma.exam.updateMany({
      where: { id, deleted_at: null },
      data: {
        instructions: input.instructions ?? null,
        notify_email: input.notifyEmail ? 1 : 0,
        notify_inapp: input.notifyInapp ? 1 : 0,
        status: 'published',
        published_at: now,
        published_by: actor,
        updated_at: now,
        updated_by: actor,
      },
    });
    // Notify allocated students (best-effort — failures don't block publish).
    if (input.notifyEmail) {
      try {
        const allocs = await this.prisma.exam_student_allocations.findMany({ where: { exam_id: id }, select: { user_id: true } });
        const userIds = allocs.map((a) => a.user_id);
        if (userIds.length > 0) {
          const students = await this.prisma.users.findMany({
            where: { id: { in: userIds }, deleted_at: null },
            select: { id: true, name: true, user_email: true, email: true },
          });
          const exam = await this.prisma.exam.findFirst({ where: { id }, select: { title: true, exam_code: true } });
          const { createIntegrationRegistry } = await import('../integrations/registry.js');
          const { renderBrandedEmail } = await import('../integrations/email-template.js');
          const registry = createIntegrationRegistry();
          for (const s of students) {
            const to = s.user_email ?? s.email ?? '';
            if (!to) continue;
            try {
              await registry.email.sendEmail({
                to,
                subject: `New exam scheduled — ${exam?.title ?? 'TTII'}`,
                html: renderBrandedEmail({
                  heading: 'New Exam Scheduled',
                  bodyHtml: `<p>Hi ${escapeHtmlText(s.name ?? 'there')},</p><p>You have been allocated to <strong>${escapeHtmlText(exam?.title ?? '')}</strong>${exam?.exam_code ? ` (${escapeHtmlText(exam.exam_code)})` : ''}. Please log in to your portal to view the schedule and instructions.</p>`,
                  cta: { label: 'Open My Exams', href: 'https://learn.teachersindia.in/exams' },
                }),
              });
            } catch { /* best-effort */ }
          }
        }
      } catch { /* email send phase failure doesn't block publish */ }
    }
    return { status: 1, message: 'Exam published.' };
  }

  async addExam(actorUserId: string, input: ExamInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Exam title is required.' };
    }

    const now = new Date();

    const exam = await this.prisma.exam.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        mark: input.mark ?? 0,
        duration: input.duration ?? null,
        from_date: input.fromDate ? new Date(input.fromDate) : null,
        to_date: input.toDate ? new Date(input.toDate) : null,
        from_time: input.fromTime ?? null,
        to_time: input.toTime ?? null,
        course_id: toNullableIntId(input.courseId),
        batch_id: toNullableIntId(input.batchId),
        free: input.free === undefined ? null : (input.free === '1' || input.free === 'true' || (input.free as unknown) === true),
        publish_result: !!input.publishResult,
        is_practice: input.isPractice ?? 0,
        created_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    if (exam.id && input.questionIds && input.questionIds.length > 0) {
      for (let i = 0; i < input.questionIds.length; i++) {
        const qId = input.questionIds[i];
        await this.prisma.exam_questions.create({
          data: {
            exam_id: exam.id,
            question_id: toNullableIntId(qId),
            question_no: i + 1,
            mark: (input.mark ?? 0) / input.questionIds.length,
            created_by: toNullableIntId(actorUserId),
            created_at: now,
            updated_at: now,
          },
        });
      }
    }

    return { status: 1, message: 'Exam created successfully.', data: { id: exam.id } };
  }

  async editExam(actorUserId: string, examId: string, input: ExamInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Exam title is required.' };
    }

    const now = new Date();

    await this.prisma.exam.updateMany({
      where: { id: toIntId(examId), deleted_at: null },
      data: {
        title: input.title,
        description: input.description ?? null,
        mark: input.mark ?? 0,
        duration: input.duration ?? null,
        from_date: input.fromDate ? new Date(input.fromDate) : null,
        to_date: input.toDate ? new Date(input.toDate) : null,
        from_time: input.fromTime ?? null,
        to_time: input.toTime ?? null,
        course_id: toNullableIntId(input.courseId),
        batch_id: toNullableIntId(input.batchId),
        free: input.free === undefined ? null : (input.free === '1' || input.free === 'true' || (input.free as unknown) === true),
        publish_result: !!input.publishResult,
        is_practice: input.isPractice ?? 0,
        updated_by: toNullableIntId(actorUserId),
        updated_at: now,
      },
    });

    return { status: 1, message: 'Exam updated successfully.' };
  }

  async deleteExam(actorUserId: string, examId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.exam.updateMany({ where: { id: toIntId(examId), deleted_at: null }, data: { deleted_by: toNullableIntId(actorUserId), deleted_at: now } });
    return { status: 1, message: 'Exam deleted successfully.' };
  }

  async publishExamResult(actorUserId: string, examId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.exam.updateMany({ where: { id: toIntId(examId), deleted_at: null }, data: { publish_result: true, updated_by: toNullableIntId(actorUserId), updated_at: now } });
    return { status: 1, message: 'Exam results published.' };
  }

  // ─── Phase 2: Assignments ──────────────────────────────────────────────────

  async listAdminAssignments(filters: AdminAssignmentFilters = {}): Promise<SqlRow[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) where.course_id = toIntId(filters.courseId);
    if (filters.cohortId) where.cohort_id = toIntId(filters.cohortId);

    const assignments = await this.prisma.assignment.findMany({ where: where as Prisma.assignmentWhereInput, orderBy: { id: 'desc' } });

    const assignmentIds = assignments.map(a => a.id);
    // Legacy quirk: assignment.course_id can be `0` instead of NULL when
    // an instructor only set the cohort. Treat 0 as "unset" so we fall
    // through to the cohort-course lookup.
    const directCourseIds = [...new Set(assignments
      .map(a => a.course_id)
      .filter((x): x is number => x !== null && x !== undefined && x > 0))];
    const cohortIds = [...new Set(assignments.map(a => a.cohort_id).filter((x): x is number => x !== null && x !== undefined))];

    // Naji UAT 2026-05-22 — Assignment Summary now surfaces Total
    // Students / Submissions / Evaluated counts per row so coordinators
    // can see grading progress at a glance. We also pull every
    // submission with its marks state so we can split "submitted" vs
    // "evaluated" client-side (the legacy table doesn't have an
    // evaluation_status column — marks present == evaluated).
    const [cohorts, submissionCounts, submissions, cohortStudentRows] = await Promise.all([
      cohortIds.length > 0 ? this.prisma.cohorts.findMany({ where: { id: { in: cohortIds } }, select: { id: true, title: true, course_id: true } }) : [],
      assignmentIds.length > 0 ? this.prisma.assignment_submissions.groupBy({ by: ['assignment_id'], where: { assignment_id: { in: assignmentIds }, deleted_at: null }, _count: { id: true } }) : [],
      assignmentIds.length > 0 ? this.prisma.assignment_submissions.findMany({
        where: { assignment_id: { in: assignmentIds }, deleted_at: null },
        select: { assignment_id: true, marks: true },
      }) : [],
      cohortIds.length > 0 ? this.prisma.cohort_students.groupBy({
        // cohort_students.cohort_id is stored as a string in the legacy
        // table; convert numeric cohort ids to strings for the IN clause.
        by: ['cohort_id'],
        where: { cohort_id: { in: cohortIds.map((id) => String(id)) }, deleted_at: null },
        _count: { id: true },
      }) : [],
    ]);

    // Pull every course we might need — those referenced directly by
    // assignments AND those referenced via cohorts. Without this second
    // pass an assignment with course_id=0 + cohort_id pointing at a
    // cohort whose course_id is 16 would render an empty Course column,
    // because course 16 was never in the original IN clause.
    const cohortCourseIds = cohorts.map((c) => c.course_id).filter((x): x is number => x != null && x > 0);
    const allCourseIds = [...new Set([...directCourseIds, ...cohortCourseIds])];
    const courses = allCourseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: allCourseIds } }, select: { id: true, title: true } })
      : [];

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const cohortMap = new Map(cohorts.map(c => [c.id, c]));
    const subCountMap = new Map(submissionCounts.map((sc) => [sc.assignment_id, sc._count?.id ?? 0]));

    // Build evaluated count per assignment (marks non-empty).
    const evaluatedMap = new Map<number, number>();
    for (const s of submissions) {
      if (s.assignment_id == null) continue;
      const hasMarks = s.marks != null && String(s.marks).trim() !== '';
      if (!hasMarks) continue;
      evaluatedMap.set(s.assignment_id, (evaluatedMap.get(s.assignment_id) ?? 0) + 1);
    }

    // cohort_students.cohort_id is text in the DB.
    const cohortStudentMap = new Map<number, number>();
    for (const cs of cohortStudentRows) {
      const cidNum = Number(cs.cohort_id);
      if (!Number.isFinite(cidNum)) continue;
      cohortStudentMap.set(cidNum, cs._count?.id ?? 0);
    }

    // If an assignment is tied to a cohort but not a course, surface the
    // cohort's course as a fallback so the Course column never reads "-".
    // Legacy course_id=0 is treated as unset (same as NULL).
    return assignments.map(a => {
      const hasDirectCourse = a.course_id != null && a.course_id > 0;
      const courseFromAssignment = hasDirectCourse ? courseMap.get(a.course_id as number)?.title ?? null : null;
      const courseFromCohort = a.cohort_id && courseFromAssignment == null
        ? (() => {
            const cohort = cohortMap.get(a.cohort_id);
            return cohort?.course_id ? courseMap.get(cohort.course_id)?.title ?? null : null;
          })()
        : null;
      const submissionCount = subCountMap.get(a.id) ?? 0;
      const evaluatedCount = evaluatedMap.get(a.id) ?? 0;
      const totalStudents = a.cohort_id ? cohortStudentMap.get(a.cohort_id) ?? 0 : 0;
      return {
        ...a,
        course_title: courseFromAssignment ?? courseFromCohort ?? null,
        cohort_title: a.cohort_id ? cohortMap.get(a.cohort_id)?.title ?? null : null,
        submission_count: submissionCount,
        evaluated_count: evaluatedCount,
        total_students: totalStudents,
      };
    }) as unknown as SqlRow[];
  }

  async addAssignment(actorUserId: string, input: AssignmentInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Assignment title is required.' };
    }

    const now = new Date();

    await this.prisma.assignment.create({
      data: {
        title: input.title,
        description: input.description ?? '',
        total_marks: input.totalMarks ?? 0,
        added_date: input.addedDate ? new Date(input.addedDate) : now,
        due_date: input.dueDate ? new Date(input.dueDate) : now,
        from_time: input.fromTime ?? null,
        to_time: input.toTime ?? null,
        instructions: input.instructions ?? null,
        file: input.file ?? '',
        course_id: toNullableIntId(input.courseId),
        cohort_id: toNullableIntId(input.cohortId),
        created_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Assignment created successfully.' };
  }

  async editAssignment(actorUserId: string, assignmentId: string, input: AssignmentInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Assignment title is required.' };
    }

    const now = new Date();

    await this.prisma.assignment.updateMany({
      where: { id: toIntId(assignmentId), deleted_at: null },
      data: {
        title: input.title,
        description: input.description ?? '',
        total_marks: input.totalMarks ?? 0,
        due_date: input.dueDate ? new Date(input.dueDate) : now,
        from_time: input.fromTime ?? null,
        to_time: input.toTime ?? null,
        instructions: input.instructions ?? null,
        file: input.file ?? '',
        course_id: toNullableIntId(input.courseId),
        cohort_id: toNullableIntId(input.cohortId),
        updated_by: toNullableIntId(actorUserId),
        updated_at: now,
      },
    });

    return { status: 1, message: 'Assignment updated successfully.' };
  }

  async deleteAssignment(actorUserId: string, assignmentId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.assignment.updateMany({ where: { id: toIntId(assignmentId), deleted_at: null }, data: { deleted_by: toNullableIntId(actorUserId), deleted_at: now } });
    return { status: 1, message: 'Assignment deleted successfully.' };
  }

  async listAssignmentSubmissions(assignmentId: string): Promise<SqlRow[]> {
    const subs = await this.prisma.assignment_submissions.findMany({ where: { assignment_id: toIntId(assignmentId), deleted_at: null }, orderBy: { id: 'desc' } });
    const userIds = [...new Set(subs.map(s => s.user_id).filter((x): x is number => x !== null && x !== undefined))];
    const users = userIds.length > 0 ? await this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, student_id: true } }) : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return subs.map(s => ({
      ...s,
      student_name: s.user_id ? userMap.get(s.user_id)?.name ?? null : null,
      student_id: s.user_id ? userMap.get(s.user_id)?.student_id ?? null : null,
      // Naji UAT 2026-05-18 — assignment_files is a JSON-encoded array of
      // relative paths; expose the first as a resolved URL the frontend can
      // link to. Mirrors listAssignmentSubmissionsAcrossCohorts below.
      submission_file: (() => {
        if (!s.assignment_files) return null;
        try {
          const arr = JSON.parse(s.assignment_files) as unknown;
          if (Array.isArray(arr) && arr.length > 0) return toLegacyFileUrl(String(arr[0]));
        } catch { /* not json */ }
        return toLegacyFileUrl(s.assignment_files);
      })(),
    })) as unknown as SqlRow[];
  }

  // Naji UAT 2026-05-13 — Cohort Edit page calls this from the
  // Assignments side-panel; the route was missing on the backend so the
  // Submissions tab always rendered "No submissions yet". Returns the
  // submitted rows plus the still-pending students (cohort roster minus
  // submitters), so the Unsubmitted Students tab also works.
  // Naji UAT 2026-05-14 — Cohort > Add Learner dialog. Returns the list
  // of students eligible to be added to this cohort:
  //   - role_id = 2 (Student), not deleted, not disabled (disabled_at NULL)
  //   - enrolled in the cohort's course via an active enrol row
  //     (enrollment_status = Active or On Hold or NULL fallback)
  //   - enrolled course must be cohort-based (course.course_type=1) and
  //     not self-study
  //   - the cohort's subject must be one of the course's configured
  //     subjects (course_subject pivot)
  //   - the student must not already be in this cohort OR any other
  //     cohort that shares the same subject
  async listAvailableCohortLearners(cohortId: string): Promise<SqlRow[]> {
    const cId = toIntId(cohortId);
    if (!cId) return [];

    const cohort = await this.prisma.cohorts.findFirst({
      where: { id: cId, deleted_at: null },
      select: { id: true, cohort_id: true, course_id: true, subject_id: true },
    });
    if (!cohort || !cohort.course_id) return [];

    // Course must be cohort-based (course_type=1). Self-study courses
    // (course_type != 1) are skipped per the eligibility rules.
    const course = await this.prisma.course.findFirst({
      where: { id: cohort.course_id },
      select: { id: true, title: true, course_type: true },
    });
    if (!course || course.course_type !== 1) return [];

    // Subject must be in the course's curriculum.
    if (cohort.subject_id) {
      const subjectInCourse = await this.prisma.course_subject.findFirst({
        where: { course_id: cohort.course_id, subject_id: cohort.subject_id, deleted_at: null },
        select: { course_id: true },
      });
      if (!subjectInCourse) return [];
    }

    // Pull enrolments for this course with the right status.
    const enrolments = await this.prisma.enrol.findMany({
      where: {
        course_id: cohort.course_id,
        deleted_at: null,
        OR: [
          { enrollment_status: { in: ['Active', 'On Hold', 'active', 'on hold'] } },
          { enrollment_status: null },
        ],
      },
      select: { user_id: true, course_id: true, enrollment_status: true },
    });
    const candidateUserIds = [...new Set(enrolments.map((e) => e.user_id).filter((x): x is number => x != null))];
    if (candidateUserIds.length === 0) return [];

    // Drop students who are already in this cohort OR any other cohort
    // sharing the same subject. cohort_students.cohort_id is a TEXT
    // column that may hold either the numeric pk or the legacy text
    // code; query for both.
    let excludedUserIds = new Set<number>();
    if (cohort.subject_id) {
      const cohortsSharingSubject = await this.prisma.cohorts.findMany({
        where: { subject_id: cohort.subject_id, deleted_at: null },
        select: { id: true, cohort_id: true },
      });
      const cohortKeys: string[] = [];
      for (const c of cohortsSharingSubject) {
        cohortKeys.push(String(c.id));
        if (c.cohort_id) cohortKeys.push(c.cohort_id);
      }
      if (cohortKeys.length > 0) {
        const enrolled = await this.prisma.cohort_students.findMany({
          where: { cohort_id: { in: cohortKeys }, deleted_at: null, user_id: { in: candidateUserIds } },
          select: { user_id: true },
        });
        excludedUserIds = new Set(enrolled.map((e) => e.user_id).filter((x): x is number => x != null));
      }
    } else {
      // No subject → only exclude users already in THIS cohort.
      const thisCohortKeys = [String(cohort.id)];
      if (cohort.cohort_id) thisCohortKeys.push(cohort.cohort_id);
      const enrolled = await this.prisma.cohort_students.findMany({
        where: { cohort_id: { in: thisCohortKeys }, deleted_at: null, user_id: { in: candidateUserIds } },
        select: { user_id: true },
      });
      excludedUserIds = new Set(enrolled.map((e) => e.user_id).filter((x): x is number => x != null));
    }

    const finalUserIds = candidateUserIds.filter((uid) => !excludedUserIds.has(uid));
    if (finalUserIds.length === 0) return [];

    const users = await this.prisma.users.findMany({
      where: { id: { in: finalUserIds }, deleted_at: null, disabled_at: null, role_id: 2 },
      select: {
        id: true, name: true, student_id: true, user_email: true, phone: true,
        image: true, profile_picture: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });

    return users.map((u) => ({
      id: u.id,
      _id: u.id,
      name: u.name,
      student_id: u.student_id,
      user_email: u.user_email,
      phone: u.phone,
      course_id: course.id,
      course_title: course.title,
      image: toLegacyFileUrl(u.image) || toLegacyFileUrl(u.profile_picture),
    })) as unknown as SqlRow[];
  }

  // Naji UAT 2026-05-14 — bulk-assign students to a cohort. Each row in
  // cohort_students stores cohort_id as a string (legacy schema quirk),
  // so we store the numeric pk as a string for the new entries.
  async addCohortLearners(actorUserId: string, cohortId: string, studentIds: string[]): Promise<Record<string, unknown>> {
    const cId = toIntId(cohortId);
    if (!cId) return { status: 0, message: 'Invalid cohort id.' };
    const ids = (studentIds || []).map((s) => toIntId(s)).filter((n) => n > 0);
    if (ids.length === 0) return { status: 0, message: 'Pick at least one student.' };

    const cohort = await this.prisma.cohorts.findFirst({
      where: { id: cId, deleted_at: null },
      select: { id: true, cohort_id: true },
    });
    if (!cohort) return { status: 0, message: 'Cohort not found.' };

    const cohortKey = String(cohort.id);
    const now = new Date();
    const actor = toIntId(actorUserId);

    // Skip students already in this cohort to avoid duplicate rows.
    const cohortKeys = [cohortKey];
    if (cohort.cohort_id) cohortKeys.push(cohort.cohort_id);
    const existing = await this.prisma.cohort_students.findMany({
      where: { cohort_id: { in: cohortKeys }, user_id: { in: ids }, deleted_at: null },
      select: { user_id: true },
    });
    const existingIds = new Set(existing.map((e) => e.user_id));
    const toInsert = ids.filter((id) => !existingIds.has(id));
    if (toInsert.length === 0) return { status: 1, message: 'All selected students are already in this cohort.' };

    await this.prisma.cohort_students.createMany({
      data: toInsert.map((uid) => ({
        cohort_id: cohortKey,
        user_id: uid,
        created_at: now,
        updated_at: now,
        created_by: actor,
        updated_by: actor,
      })),
    });

    return { status: 1, message: `${toInsert.length} student(s) added.`, data: { added: toInsert.length } };
  }

  async getCohortAssignmentSubmissions(assignmentId: string): Promise<{ submissions: SqlRow[]; unsubmitted: SqlRow[] }> {
    const aId = toIntId(assignmentId);
    if (!aId) return { submissions: [], unsubmitted: [] };
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: aId, deleted_at: null },
      select: { id: true, cohort_id: true },
    });
    if (!assignment) return { submissions: [], unsubmitted: [] };

    const subs = await this.prisma.assignment_submissions.findMany({
      where: { assignment_id: aId, deleted_at: null },
      orderBy: { id: 'desc' },
    });
    const submittedUserIds = new Set(subs.map((s) => s.user_id).filter((x): x is number => x != null));

    // Cohort roster — cohort_students.cohort_id is a TEXT column that
    // can hold either the numeric id or the legacy text code; match both.
    let rosterUserIds: number[] = [];
    if (assignment.cohort_id != null) {
      const cohort = await this.prisma.cohorts.findFirst({
        where: { id: assignment.cohort_id, deleted_at: null },
        select: { id: true, cohort_id: true },
      });
      const lookups: string[] = [];
      lookups.push(String(assignment.cohort_id));
      if (cohort?.cohort_id) lookups.push(cohort.cohort_id);
      const roster = await this.prisma.cohort_students.findMany({
        where: { cohort_id: { in: lookups }, deleted_at: null },
        select: { user_id: true },
      });
      rosterUserIds = [...new Set(roster.map((r) => r.user_id).filter((x): x is number => x != null))];
    }

    const allUserIds = [...new Set([...submittedUserIds, ...rosterUserIds])];
    const users = allUserIds.length > 0
      ? await this.prisma.users.findMany({
          where: { id: { in: allUserIds } },
          select: { id: true, name: true, student_id: true, user_email: true, image: true, profile_picture: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const submissions = subs.map((s) => {
      const u = s.user_id ? userMap.get(s.user_id) : null;
      return {
        ...s,
        student_name: u?.name ?? null,
        student_id: u?.student_id ?? null,
        user_email: u?.user_email ?? null,
        image: toLegacyFileUrl(u?.profile_picture) || toLegacyFileUrl(u?.image),
        // Naji UAT 2026-05-18 — same file-URL fix as listAssignmentSubmissions
        // so the Cohort Edit > Assignments side-panel Submissions tab also
        // produces a working View link.
        submission_file: (() => {
          if (!s.assignment_files) return null;
          try {
            const arr = JSON.parse(s.assignment_files) as unknown;
            if (Array.isArray(arr) && arr.length > 0) return toLegacyFileUrl(String(arr[0]));
          } catch { /* not json */ }
          return toLegacyFileUrl(s.assignment_files);
        })(),
        submitted_at: s.created_at,
      };
    }) as unknown as SqlRow[];

    const unsubmitted = rosterUserIds
      .filter((uid) => !submittedUserIds.has(uid))
      .map((uid) => {
        const u = userMap.get(uid);
        if (!u) return null;
        return {
          id: u.id,
          user_id: u.id,
          student_id: u.student_id,
          // Frontend reads both `name` (Unsubmitted Students table) and
          // `student_name` (Submissions table); expose both.
          name: u.name,
          student_name: u.name,
          user_email: u.user_email,
          image: toLegacyFileUrl(u.profile_picture) || toLegacyFileUrl(u.image),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null) as unknown as SqlRow[];

    return { submissions, unsubmitted };
  }

  async evaluateSubmission(
    actorUserId: string,
    submissionId: string,
    marks: string,
    remarks?: string,
  ): Promise<Record<string, unknown>> {
    const now = new Date();
    // Naji UAT 2026-05-22 — saving marks (re)opens verification:
    // verified_at is cleared so the row returns to Pending Verification.
    // Admin must explicitly click Verify to publish.
    await this.prisma.assignment_submissions.updateMany({
      where: { id: toIntId(submissionId), deleted_at: null },
      data: {
        marks,
        remarks: remarks ?? null,
        verified_at: null,
        verified_by: null,
        updated_by: toNullableIntId(actorUserId),
        updated_at: now,
      },
    });
    return { status: 1, message: 'Submission evaluated. Awaiting admin verification.' };
  }

  // Naji UAT 2026-05-22 — admin verification step. Flips a Pending
  // Verification row to Result Published by stamping verified_at/by.
  async verifySubmission(
    actorUserId: string,
    submissionId: string,
  ): Promise<Record<string, unknown>> {
    const id = toIntId(submissionId);
    const sub = await this.prisma.assignment_submissions.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, marks: true, verified_at: true },
    });
    if (!sub) return { status: 0, message: 'Submission not found.' };
    if (!sub.marks || String(sub.marks).trim() === '') {
      return { status: 0, message: 'Cannot verify a submission that has not been evaluated.' };
    }
    if (sub.verified_at) {
      return { status: 1, message: 'Submission was already verified.' };
    }
    const now = new Date();
    await this.prisma.assignment_submissions.update({
      where: { id },
      data: { verified_at: now, verified_by: toNullableIntId(actorUserId), updated_by: toNullableIntId(actorUserId), updated_at: now },
    });
    return { status: 1, message: 'Submission verified and published.' };
  }

  // Naji UAT 2026-05-13 — Assignment Evaluation page. Pulls every
  // submission with the enrichments needed by the four-tab table:
  // student, course, offering, subject, cohort, instructor, submitted-on,
  // marks, evaluated-on. Verification + return states are not yet
  // tracked on assignment_submissions, so for now: marks IS NULL =>
  // Pending Evaluation; marks IS NOT NULL => Result Published. The
  // Pending Verification / Returned tabs render empty until the
  // workflow is built (frontend renders the structure already).
  async listAdminAssignmentEvaluations(): Promise<SqlRow[]> {
    const subs = await this.prisma.assignment_submissions.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });
    if (subs.length === 0) return [];

    const userIds = [...new Set(subs.map((s) => s.user_id).filter((x): x is number => x != null))];
    const assignmentIds = [...new Set(subs.map((s) => s.assignment_id).filter((x): x is number => x != null))];
    const [users, assignments] = await Promise.all([
      userIds.length > 0
        ? this.prisma.users.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, student_id: true, user_email: true, image: true, profile_picture: true },
          })
        : Promise.resolve([]),
      assignmentIds.length > 0
        ? this.prisma.assignment.findMany({
            where: { id: { in: assignmentIds } },
            select: { id: true, title: true, total_marks: true, due_date: true, course_id: true, cohort_id: true, file: true },
          })
        : Promise.resolve([]),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const assignmentMap = new Map(assignments.map((a) => [a.id, a]));

    const cohortIds = [...new Set(assignments.map((a) => a.cohort_id).filter((x): x is number => x != null))];
    const courseIdsFromAssignment = [...new Set(assignments.map((a) => a.course_id).filter((x): x is number => x != null && x > 0))];
    const cohorts = cohortIds.length > 0
      ? await this.prisma.cohorts.findMany({
          where: { id: { in: cohortIds } },
          select: { id: true, title: true, cohort_id: true, course_id: true, instructor_id: true },
        })
      : [];
    const cohortMap = new Map(cohorts.map((c) => [c.id, c]));
    const cohortCourseIds = cohorts.map((c) => c.course_id).filter((x): x is number => x != null && x > 0);
    const allCourseIds = [...new Set([...courseIdsFromAssignment, ...cohortCourseIds])];

    const [courses, instructors, courseSubjects] = await Promise.all([
      allCourseIds.length > 0
        ? this.prisma.course.findMany({ where: { id: { in: allCourseIds } }, select: { id: true, title: true } })
        : Promise.resolve([]),
      cohorts.length > 0
        ? this.prisma.users.findMany({
            where: { id: { in: cohorts.map((c) => c.instructor_id).filter((x): x is number => x != null && x > 0) } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      allCourseIds.length > 0
        ? this.prisma.course_subject.findMany({
            where: { course_id: { in: allCourseIds }, deleted_at: null },
            select: { course_id: true, subject_id: true, position: true },
            orderBy: [{ course_id: 'asc' }, { position: 'asc' }],
          })
        : Promise.resolve([]),
    ]);
    const courseMap = new Map(courses.map((c) => [c.id, c.title ?? '']));
    const instructorMap = new Map(instructors.map((i) => [i.id, i.name ?? '']));

    const subjectIds = [...new Set(courseSubjects.map((cs) => cs.subject_id))];
    const subjects = subjectIds.length > 0
      ? await this.prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, title: true } })
      : [];
    const subjectMap = new Map(subjects.map((s) => [s.id, s.title ?? '']));
    const subjectsByCourse = new Map<number, { id: number; title: string }[]>();
    for (const cs of courseSubjects) {
      const t = subjectMap.get(cs.subject_id) ?? '';
      if (!t) continue;
      if (!subjectsByCourse.has(cs.course_id)) subjectsByCourse.set(cs.course_id, []);
      subjectsByCourse.get(cs.course_id)?.push({ id: cs.subject_id, title: t });
    }

    // Reuse the assignment-title -> subject matcher from getStudentDetail.
    const STOP = new Set(['and','or','the','of','in','a','an','to','for','with','on','at','assignment','assessment','test','exam']);
    const tokenize = (s: string): string[] => s.toLowerCase().replace(/&/g, ' and ').replace(/[''`]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
    const tokensMatch = (a: string, b: string): boolean => { if (a === b) return true; const n = Math.min(a.length, b.length, 5); return a.slice(0, n) === b.slice(0, n); };
    const pickSubject = (title: string, list: { title: string }[]): string | null => {
      const aTok = tokenize(title);
      if (aTok.length === 0) return null;
      let best: { title: string; score: number } | null = null;
      for (const sub of list) {
        const sTok = tokenize(sub.title);
        if (sTok.length === 0) continue;
        let hits = 0;
        for (const st of sTok) if (aTok.some((at) => tokensMatch(at, st))) hits += 1;
        const score = hits / sTok.length;
        if (score > 0 && (!best || score > best.score)) best = { title: sub.title, score };
      }
      return best && best.score >= 0.4 ? best.title : null;
    };

    // Offering lookup: applications carry offering_id; pull each
    // submitter's application offering name (best-effort) by joining
    // user -> application_id -> applications.offering_id -> offerings.
    const userIdsForOffering = [...new Set(subs.map((s) => s.user_id).filter((x): x is number => x != null))];
    const usersForApp = userIdsForOffering.length > 0
      ? await this.prisma.users.findMany({
          where: { id: { in: userIdsForOffering } },
          select: { id: true, application_id: true },
        })
      : [];
    const appIds = [...new Set(usersForApp.map((u) => u.application_id).filter((x): x is number => !!x && x > 0))];
    const applicationRows = appIds.length > 0
      ? await this.prisma.applications.findMany({
          where: { id: { in: appIds } },
          select: { id: true, offering_id: true },
        })
      : [];
    const offeringIds = [...new Set(applicationRows.map((a) => a.offering_id).filter((x): x is number => !!x && x > 0))];
    const offeringRows = offeringIds.length > 0
      ? await this.prisma.offerings.findMany({ where: { id: { in: offeringIds } }, select: { id: true, title: true, offering_code: true } })
      : [];
    const offeringMap = new Map(offeringRows.map((o) => [o.id, o.title ?? o.offering_code ?? '']));
    const userAppMap = new Map(usersForApp.map((u) => [u.id, u.application_id ?? 0]));
    const appOfferingMap = new Map(applicationRows.map((a) => [a.id, a.offering_id ?? 0]));

    return subs.map((s): SqlRow => {
      const user = s.user_id ? userMap.get(s.user_id) : undefined;
      const assignment = s.assignment_id ? assignmentMap.get(s.assignment_id) : undefined;
      const cohort = assignment?.cohort_id ? cohortMap.get(assignment.cohort_id) : undefined;
      const resolvedCourseId = (assignment?.course_id && assignment.course_id > 0)
        ? assignment.course_id
        : cohort?.course_id ?? null;
      const courseTitle = resolvedCourseId ? courseMap.get(resolvedCourseId) ?? null : null;
      const courseSubjectsForThis = resolvedCourseId ? subjectsByCourse.get(resolvedCourseId) ?? [] : [];
      const subjectTitle = assignment?.title ? pickSubject(assignment.title, courseSubjectsForThis) : null;
      const instructorName = cohort?.instructor_id ? instructorMap.get(cohort.instructor_id) ?? null : null;
      const appId = s.user_id ? userAppMap.get(s.user_id) ?? 0 : 0;
      const offId = appId ? appOfferingMap.get(appId) ?? 0 : 0;
      const offeringTitle = offId ? offeringMap.get(offId) ?? null : null;

      const marksStr = String(s.marks ?? '').trim();
      const evaluated = marksStr !== '';
      // Naji UAT 2026-05-22 — three-state workflow now powered by the
      // verified_at column. marks empty → Pending Evaluation; marks
      // present + not verified → Pending Verification; both → Result
      // Published. Returned isn't wired yet (lower-priority Naji ask).
      const verified = evaluated && s.verified_at !== null && s.verified_at !== undefined;
      let status: 'pending_evaluation' | 'pending_verification' | 'result_published' | 'returned';
      if (!evaluated) status = 'pending_evaluation';
      else if (!verified) status = 'pending_verification';
      else status = 'result_published';

      return {
        id: s.id,
        status,
        student_id: user?.student_id ?? null,
        student_name: user?.name ?? null,
        user_email: user?.user_email ?? null,
        image: toLegacyFileUrl(user?.profile_picture) || toLegacyFileUrl(user?.image),
        assignment_id: s.assignment_id,
        assignment_title: assignment?.title ?? null,
        assignment_file: toLegacyFileUrl(assignment?.file),
        submission_file: (() => {
          if (!s.assignment_files) return null;
          try {
            const arr = JSON.parse(s.assignment_files) as unknown;
            if (Array.isArray(arr) && arr.length > 0) return toLegacyFileUrl(String(arr[0]));
          } catch { /* not json */ }
          return toLegacyFileUrl(s.assignment_files);
        })(),
        course_id: resolvedCourseId,
        course_title: courseTitle,
        offering_title: offeringTitle,
        subject_title: subjectTitle,
        cohort_id: cohort?.id ?? null,
        cohort_code: cohort?.cohort_id ?? null,
        cohort_title: cohort?.title ?? null,
        instructor_name: instructorName,
        submitted_at: s.created_at,
        marks: s.marks,
        remarks: s.remarks,
        evaluated_at: evaluated ? s.updated_at : null,
        verified_at: s.verified_at ?? null,
        total_marks: assignment?.total_marks ?? null,
        due_date: assignment?.due_date ?? null,
      } as SqlRow;
    });
  }

  // ─── Phase 2: Exam Results ─────────────────────────────────────────────────

  async listAdminExamResults(filters: AdminExamResultFilters = {}): Promise<{ exams: SqlRow[]; results: SqlRow[] }> {
    const examWhere: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) examWhere.course_id = toIntId(filters.courseId);
    if (filters.batchId) examWhere.batch_id = toIntId(filters.batchId);

    const exams = await this.prisma.exam.findMany({ where: examWhere as Prisma.examWhereInput, select: { id: true, title: true, mark: true, course_id: true, batch_id: true }, orderBy: { title: 'asc' } });

    let results: SqlRow[] = [];
    if (filters.examId) {
      const examIdInt = toIntId(filters.examId);
      const attempts = await this.prisma.exam_attempt.findMany({ where: { exam_id: examIdInt, submit_status: true, deleted_at: null }, orderBy: { score: 'desc' } });
      const userIds = [...new Set(attempts.map(a => a.user_id).filter((x): x is number => x !== null && x !== undefined))];
      const [users, examRow] = await Promise.all([
        userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, student_id: true } }) : [],
        this.prisma.exam.findFirst({ where: { id: examIdInt }, select: { title: true, mark: true } }),
      ]);
      const userMap = new Map(users.map(u => [u.id, u]));
      results = attempts.map(ea => ({ ...ea, student_name: ea.user_id ? (userMap.get(ea.user_id)?.name ?? null) : null, student_id: ea.user_id ? (userMap.get(ea.user_id)?.student_id ?? null) : null, exam_title: examRow?.title ?? null, total_marks: examRow?.mark ?? null })) as unknown as SqlRow[];
    }

    return { exams: exams as unknown as SqlRow[], results };
  }

  // ─── Phase 2: Exam Evaluation ──────────────────────────────────────────────

  async listExamEvaluations(filters: AdminExamEvaluationFilters = {}): Promise<{ exams: SqlRow[]; pendingEvaluations: SqlRow[] }> {
    const examWhere: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) examWhere.course_id = toIntId(filters.courseId);

    const exams = await this.prisma.exam.findMany({ where: examWhere as Prisma.examWhereInput, select: { id: true, title: true, mark: true, course_id: true }, orderBy: { title: 'asc' } });

    const evalWhere: Record<string, unknown> = { submit_status: true, deleted_at: null };
    if (filters.examId) evalWhere.exam_id = toIntId(filters.examId);
    // For course filter, get matching exam IDs
    if (filters.courseId) {
      const courseExamIds = exams.map(e => e.id);
      if (courseExamIds.length > 0) evalWhere.exam_id = { in: courseExamIds };
      else return { exams: exams as unknown as SqlRow[], pendingEvaluations: [] };
    }

    const attempts = await this.prisma.exam_attempt.findMany({ where: evalWhere as Prisma.exam_attemptWhereInput, orderBy: { id: 'desc' } });
    const userIds = [...new Set(attempts.map(a => a.user_id).filter((x): x is number => x !== null && x !== undefined))];
    const examIds = [...new Set(attempts.map(a => a.exam_id).filter((x): x is number => x !== null && x !== undefined))];
    const [users, examDetails] = await Promise.all([
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, student_id: true } }) : [],
      examIds.length > 0 ? this.prisma.exam.findMany({ where: { id: { in: examIds } }, select: { id: true, title: true, mark: true } }) : [],
    ]);
    const userMap = new Map(users.map(u => [u.id, u]));
    const examMap = new Map(examDetails.map(e => [e.id, e]));

    const pendingEvaluations = attempts.map(ea => ({
      ...ea,
      student_name: ea.user_id ? (userMap.get(ea.user_id)?.name ?? null) : null,
      student_id: ea.user_id ? (userMap.get(ea.user_id)?.student_id ?? null) : null,
      exam_title: ea.exam_id ? (examMap.get(ea.exam_id)?.title ?? null) : null,
      total_marks: ea.exam_id ? (examMap.get(ea.exam_id)?.mark ?? null) : null,
    })) as unknown as SqlRow[];

    return { exams: exams as unknown as SqlRow[], pendingEvaluations };
  }

  async evaluateExamAttempt(actorUserId: string, attemptId: string, score: number): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.exam_attempt.updateMany({ where: { id: toIntId(attemptId), deleted_at: null }, data: { score, updated_by: toNullableIntId(actorUserId), updated_at: now } });
    return { status: 1, message: 'Exam attempt evaluated successfully.' };
  }

  // ─── Phase 2: Re-Examination ───────────────────────────────────────────────

  async listReExams(filters: AdminReExamFilters = {}): Promise<SqlRow[]> {
    const where: Record<string, unknown> = { deleted_at: null };
    if (filters.courseId) where.course_id = toIntId(filters.courseId);
    if (filters.batchId) where.batch_id = toIntId(filters.batchId);

    const examRows = await this.prisma.exam.findMany({ where: where as Prisma.examWhereInput, orderBy: { id: 'desc' } });
    const examIds = examRows.map(e => e.id);
    const courseIds = [...new Set(examRows.map(e => e.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const batchIds = [...new Set(examRows.map(e => e.batch_id).filter((x): x is number => x !== null && x !== undefined))];

    const [courses, batches, attemptCounts, allAttempts] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      batchIds.length > 0 ? this.prisma.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, title: true } }) : [],
      examIds.length > 0 ? this.prisma.exam_attempt.groupBy({ by: ['exam_id'], where: { exam_id: { in: examIds }, submit_status: true, deleted_at: null }, _count: { id: true } }) : [],
      examIds.length > 0 ? this.prisma.exam_attempt.findMany({ where: { exam_id: { in: examIds }, submit_status: true, deleted_at: null }, select: { exam_id: true, score: true } }) : [],
    ]);

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const batchMap = new Map(batches.map(b => [b.id, b]));
    const attemptCountMap = new Map(attemptCounts.map((ac) => [ac.exam_id, ac._count?.id ?? 0]));

    // Calculate failed counts in JS (score < mark * 0.4)
    const failedCountMap = new Map<number, number>();
    for (const e of examRows) {
      const threshold = (e.mark ?? 0) * 0.4;
      const failed = allAttempts.filter(a => a.exam_id === e.id && (a.score ?? 0) < threshold).length;
      failedCountMap.set(e.id, failed);
    }

    return examRows.map(e => ({
      ...e,
      course_title: e.course_id ? courseMap.get(e.course_id)?.title ?? null : null,
      batch_title: e.batch_id ? batchMap.get(e.batch_id)?.title ?? null : null,
      total_attempts: attemptCountMap.get(e.id) ?? 0,
      failed_count: failedCountMap.get(e.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  async grantReExam(actorUserId: string, examId: string, userIds: string[]): Promise<Record<string, unknown>> {
    if (userIds.length === 0) {
      return { status: 0, message: 'No students selected.' };
    }

    const now = new Date();
    for (const userId of userIds) {
      await this.prisma.exam_attempt.updateMany({
        where: { exam_id: toIntId(examId), user_id: toIntId(userId), submit_status: true, deleted_at: null },
        data: { deleted_by: toNullableIntId(actorUserId), deleted_at: now },
      });
    }

    return { status: 1, message: `Re-exam granted to ${userIds.length} student(s).` };
  }

  // ─── Phase 2: Entrance Exams ───────────────────────────────────────────────
  // TODO: entrance_exam / entrance_exam_registration / entrance_exam_result models
  // do not exist in MySQL schema. Stubbed until migration ports these tables.

  listEntranceExams(): Promise<SqlRow[]> {
    return Promise.resolve([]);
  }

  addEntranceExam(_actorUserId: string, _input: EntranceExamInput): Promise<Record<string, unknown>> {
    return Promise.resolve({ status: 0, message: 'Entrance exams feature not available.' });
  }

  editEntranceExam(_actorUserId: string, _examId: string, _input: EntranceExamInput): Promise<Record<string, unknown>> {
    return Promise.resolve({ status: 0, message: 'Entrance exams feature not available.' });
  }

  deleteEntranceExam(_actorUserId: string, _examId: string): Promise<Record<string, unknown>> {
    return Promise.resolve({ status: 0, message: 'Entrance exams feature not available.' });
  }

  listEntranceExamRegistrations(_examId?: string): Promise<SqlRow[]> {
    return Promise.resolve([]);
  }

  listEntranceExamResults(_examId?: string): Promise<SqlRow[]> {
    return Promise.resolve([]);
  }

  // ─── Phase 3: Operations & People ───────────────────────────────────────────

  async listInstructors(): Promise<SqlRow[]> {
    const instructors = await this.prisma.users.findMany({
      where: { role_id: 3, deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true, name: true, user_email: true, phone: true, status: true, image: true, profile_picture: true, created_at: true, disabled_at: true, highest_qualification: true },
    });

    const instructorIds = instructors.map(i => i.id);
    if (instructorIds.length === 0) return [] as unknown as SqlRow[];

    const [enrolments, cohortCounts] = await Promise.all([
      this.prisma.instructor_enrol.findMany({
        where: { instructor_id: { in: instructorIds }, deleted_at: null },
        select: { instructor_id: true, course_id: true },
      }),
      this.prisma.cohorts.groupBy({
        by: ['instructor_id'],
        where: { instructor_id: { in: instructorIds }, deleted_at: null },
        _count: { id: true },
      }),
    ]);

    const courseIds = [...new Set(enrolments.map(e => e.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: courseIds }, deleted_at: null }, select: { id: true, title: true } })
      : [];
    const courseMap = new Map(courses.map(c => [c.id, c.title]));

    const instructorCoursesMap = new Map<number, string[]>();
    for (const e of enrolments) {
      if (e.course_id === null || e.course_id === undefined || e.instructor_id === null || e.instructor_id === undefined) continue;
      const title = courseMap.get(e.course_id);
      if (title) {
        if (!instructorCoursesMap.has(e.instructor_id)) instructorCoursesMap.set(e.instructor_id, []);
        const arr = instructorCoursesMap.get(e.instructor_id)!;
        if (!arr.includes(title)) arr.push(title);
      }
    }

    const cohortCountMap = new Map(cohortCounts.map(c => [c.instructor_id, c._count.id]));

    return instructors.map(i => ({
      ...i,
      assigned_courses: instructorCoursesMap.get(i.id)?.join(',') ?? null,
      cohort_count: cohortCountMap.get(i.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  async listUsersByRole(roleId: number): Promise<SqlRow[]> {
    const users = await this.prisma.users.findMany({
      where: { role_id: roleId, deleted_at: null },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        name: true,
        user_email: true,
        phone: true,
        status: true,
        image: true,
        profile_picture: true,
        created_at: true,
        updated_at: true,
        disabled_at: true,
      },
    });
    return users as unknown as SqlRow[];
  }

  async addAdminCohort(actorUserId: string, input: AdminCohortInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Cohort title is required.' };
    }

    const cohortCode = input.cohortCode?.trim() || `COH-${Date.now()}`;
    const now = new Date();
    const actor = toNullableIntId(actorUserId);

    const created = await this.prisma.cohorts.create({
      data: {
        title: input.title,
        cohort_id: cohortCode,
        course_id: toNullableIntId(input.courseId),
        subject_id: toNullableIntId(input.subjectId),
        centre_id: toNullableIntId(input.centreId),
        instructor_id: toNullableIntId(input.instructorId),
        language_id: toNullableIntId(input.languageId),
        start_date: input.startDate ? new Date(input.startDate) : null,
        end_date: input.endDate ? new Date(input.endDate) : null,
        created_by: actor,
        created_at: now,
        updated_at: now,
      },
    });

    if (input.offeringIds && input.offeringIds.length > 0) {
      const pivotRows = input.offeringIds
        .map((oid) => toNullableIntId(oid))
        .filter((v): v is number => v !== null)
        .map((oid) => ({ cohort_id: created.id, offering_id: oid, created_by: actor, created_at: now }));
      if (pivotRows.length > 0) {
        await this.prisma.cohort_offerings.createMany({ data: pivotRows, skipDuplicates: true });
      }
    }

    return { status: 1, message: 'Cohort created successfully.', id: created.id };
  }

  async editAdminCohort(
    actorUserId: string,
    cohortId: string,
    input: AdminCohortInput,
  ): Promise<Record<string, unknown>> {
    const id = toIntId(cohortId);
    if (!id) return { status: 0, message: 'Invalid cohort id.' };
    const now = new Date();
    const actor = toNullableIntId(actorUserId);

    await this.prisma.cohorts.update({
      where: { id },
      data: {
        title: input.title,
        ...(input.cohortCode ? { cohort_id: input.cohortCode } : {}),
        course_id: toNullableIntId(input.courseId),
        subject_id: toNullableIntId(input.subjectId),
        centre_id: toNullableIntId(input.centreId),
        instructor_id: toNullableIntId(input.instructorId),
        language_id: toNullableIntId(input.languageId),
        start_date: input.startDate ? new Date(input.startDate) : null,
        end_date: input.endDate ? new Date(input.endDate) : null,
        updated_by: actor,
        updated_at: now,
      },
    });

    // Replace pivot rows
    await this.prisma.cohort_offerings.deleteMany({ where: { cohort_id: id } });
    if (input.offeringIds && input.offeringIds.length > 0) {
      const pivotRows = input.offeringIds
        .map((oid) => toNullableIntId(oid))
        .filter((v): v is number => v !== null)
        .map((oid) => ({ cohort_id: id, offering_id: oid, created_by: actor, created_at: now }));
      if (pivotRows.length > 0) {
        await this.prisma.cohort_offerings.createMany({ data: pivotRows, skipDuplicates: true });
      }
    }

    return { status: 1, message: 'Cohort updated successfully.' };
  }

  // Soft-delete a cohort. Naji 2026-05-04: the frontend has called
  // /admin/cohorts/delete since day one but the route + service were
  // never wired, so the Delete action in the cohort list silently 404'd.
  // Soft-delete only — keep the row for historical assignment / live
  // class lookups.
  async deleteAdminCohort(actorUserId: string, cohortId: string): Promise<Record<string, unknown>> {
    const id = toIntId(cohortId);
    if (!id) return { status: 0, message: 'Invalid cohort id.' };
    const existing = await this.prisma.cohorts.findFirst({
      where: { id, deleted_at: null },
      select: { id: true },
    });
    if (!existing) return { status: 0, message: 'Cohort not found.' };

    const now = new Date();
    await this.prisma.cohorts.update({
      where: { id },
      data: {
        deleted_at: now,
        deleted_by: toNullableIntId(actorUserId),
        updated_at: now,
      },
    });
    return { status: 1, message: 'Cohort deleted successfully.' };
  }

  async listCourseFees(): Promise<SqlRow[]> {
    const courses = await this.prisma.course.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true, title: true, price: true, sale_price: true },
    });

    const courseIds = courses.map(c => c.id);
    if (courseIds.length === 0) return [] as unknown as SqlRow[];

    // TODO: student_fee model does not exist in MySQL schema — omit fee-plan aggregates
    const paymentAggs = await this.prisma.payment_info.groupBy({
      by: ['course_id'],
      where: { course_id: { in: courseIds }, deleted_at: null },
      _count: { user_id: true },
      _sum: { amount_paid: true },
    });

    const paymentMap = new Map(paymentAggs.map((p) => [p.course_id, { payments_count: p._count?.user_id ?? 0, total_collected: p._sum?.amount_paid ?? 0 }]));

    return courses.map(c => {
      const payAgg = paymentMap.get(c.id);
      return {
        course_id: c.id,
        course_title: c.title,
        price: c.price,
        sale_price: c.sale_price,
        students_with_fees: 0,
        total_fee_amount: 0,
        paid_amount: 0,
        pending_amount: 0,
        payments_count: payAgg?.payments_count ?? 0,
        total_collected: payAgg?.total_collected ?? 0,
      };
    }) as unknown as SqlRow[];
  }

  /**
   * Per-student fee summary per Naji's correction doc:
   * # | Student ID | Student Name | Total Fee | Paid Amount | Pending Amount | Overdue Amount
   *
   * Aggregates from `student_payments` (planned installments) and `payment_info`
   * (actual payments). Pending = Total − Paid. Overdue = unpaid installments
   * with due_date in the past.
   */
  // Naji 2026-05-09 — Fee Summary rebuilt as a per-enrollment table.
  // Columns: Enrollment ID / Student / Course / Offering / Combination /
  // Course Fee (Inc GST when applicable) / Fee Paid / Balance / Fee Due
  // (overdue) / Course Status. Pricing comes from offering_certificate_
  // packages (the same source the Generate Payment Link dialog uses).
  // The student_payments aggregation runs as raw SQL because legacy
  // rows have invalid paid_date values (`0000-00-00`) that crash
  // Prisma's DateTime mapper.
  async listFeeSummary(): Promise<Record<string, unknown>[]> {
    const enrolments = await this.prisma.enrol.findMany({
      where: { deleted_at: null },
      select: {
        id: true,
        user_id: true,
        course_id: true,
        enrollment_id: true,
        enrollment_status: true,
        package_id: true,
      },
      orderBy: { id: 'desc' },
    });
    if (enrolments.length === 0) return [];

    const userIds = Array.from(new Set(enrolments.map((e) => e.user_id).filter((v): v is number => v !== null)));
    const courseIds = Array.from(new Set(enrolments.map((e) => e.course_id).filter((v): v is number => v !== null)));

    const [users, courses] = await Promise.all([
      userIds.length > 0
        ? this.prisma.users.findMany({
            where: { id: { in: userIds }, deleted_at: null },
            select: { id: true, name: true, student_id: true, user_email: true, email: true },
          })
        : Promise.resolve([] as Array<{ id: number; name: string | null; student_id: number | null; user_email: string | null; email: string | null }>),
      courseIds.length > 0
        ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
        : Promise.resolve([] as Array<{ id: number; title: string | null }>),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const courseMap = new Map(courses.map((c) => [c.id, c.title ?? '']));

    // Match each enrolment back to its source application via email +
    // course_id (applications doesn't carry user_id). Pick the most-
    // recent matching application per (email, course) — that's the
    // one carrying the offering+combination the student actually
    // enrolled for.
    const emails = users
      .map((u) => (u.user_email ?? u.email ?? '').toLowerCase())
      .filter((e) => e !== '');
    const applications = emails.length > 0 && courseIds.length > 0
      ? await this.prisma.applications.findMany({
          where: {
            deleted_at: null,
            user_email: { in: emails },
            course_id: { in: courseIds },
          },
          select: { id: true, user_email: true, course_id: true, offering_id: true, certificate_combination_id: true },
          orderBy: { id: 'desc' },
        })
      : [];

    const appByEmailCourse = new Map<string, { offering_id: number | null; combination_id: number | null }>();
    for (const a of applications) {
      const key = `${(a.user_email ?? '').toLowerCase()}:${a.course_id ?? 0}`;
      if (!appByEmailCourse.has(key)) {
        appByEmailCourse.set(key, { offering_id: a.offering_id, combination_id: a.certificate_combination_id });
      }
    }
    const appByUserCourse = new Map<string, { offering_id: number | null; combination_id: number | null }>();
    for (const u of users) {
      const e = (u.user_email ?? u.email ?? '').toLowerCase();
      if (!e) continue;
      for (const cid of courseIds) {
        const matched = appByEmailCourse.get(`${e}:${cid}`);
        if (matched) appByUserCourse.set(`${u.id}:${cid}`, matched);
      }
    }

    // Pull offering + combination titles + packages for the (offering, combination) pairs we'll need.
    const offeringIdSet = new Set<number>();
    const combinationIdSet = new Set<number>();
    for (const v of appByUserCourse.values()) {
      if (v.offering_id) offeringIdSet.add(v.offering_id);
      if (v.combination_id) combinationIdSet.add(v.combination_id);
    }

    const [offerings, combinations, packages] = await Promise.all([
      offeringIdSet.size > 0
        ? this.prisma.offerings.findMany({
            where: { id: { in: [...offeringIdSet] } },
            select: { id: true, title: true, offering_code: true, offered_fee: true, base_fee: true, pricing_amount: true },
          })
        : Promise.resolve([] as Array<{ id: number; title: string | null; offering_code: string | null; offered_fee: unknown; base_fee: unknown; pricing_amount: unknown }>),
      combinationIdSet.size > 0
        ? this.prisma.certificate_combinations.findMany({
            where: { id: { in: [...combinationIdSet] } },
            select: { id: true, combination_code: true },
          })
        : Promise.resolve([] as Array<{ id: number; combination_code: string | null }>),
      // Fetch ALL packages for each offering (not just exact (offering,
      // combination) pairs) so the fee can default to the offering's package
      // pricing when the held combination has no package under it — matching the
      // View Student Fee Summary resolution (Naji 2026-07-07 "Fee Information is
      // wrong in Fee Summary Module").
      offeringIdSet.size > 0
        ? this.prisma.offering_certificate_packages.findMany({
            where: { deleted_at: null, offering_id: { in: [...offeringIdSet] } },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            select: { offering_id: true, combination_id: true, fee_category: true, base_fee: true, discount: true, offered_fee: true, registration_fee: true, gst_percent: true },
          })
        : Promise.resolve([] as Array<{ offering_id: number; combination_id: number; fee_category: string; base_fee: unknown; discount: unknown; offered_fee: unknown; registration_fee: unknown; gst_percent: unknown }>),
    ]);

    const offeringMap = new Map(offerings.map((o) => [o.id, o]));
    const combinationMap = new Map(combinations.map((c) => [c.id, c.combination_code ?? '']));
    const packagesByOffering = new Map<number, typeof packages>();
    for (const p of packages) {
      const list = packagesByOffering.get(p.offering_id) ?? [];
      list.push(p);
      packagesByOffering.set(p.offering_id, list);
    }

    // student_payments aggregation via raw SQL — paid_date is unreadable
    // through Prisma due to legacy 0000-00-00 values. Use status='Paid'
    // as the paid signal; fall back to amount-summing.
    type PayAgg = { user_id: number; course_id: number; total: number; paid: number; overdue: number };
    const payAggs = userIds.length > 0
      ? await this.prisma.$queryRaw<PayAgg[]>`
          SELECT
            user_id,
            course_id,
            COALESCE(SUM(amount), 0) AS total,
            COALESCE(SUM(CASE WHEN LOWER(status) = 'paid' THEN amount ELSE 0 END), 0) AS paid,
            COALESCE(SUM(CASE WHEN LOWER(status) <> 'paid' AND due_date IS NOT NULL AND due_date < CURDATE() THEN amount ELSE 0 END), 0) AS overdue
          FROM student_payments
          WHERE deleted_at IS NULL
            AND user_id IN (${Prisma.join(userIds)})
          GROUP BY user_id, course_id
        `
      : [];
    const payByKey = new Map<string, PayAgg>();
    for (const r of payAggs) {
      payByKey.set(`${Number(r.user_id)}:${Number(r.course_id)}`, {
        user_id: Number(r.user_id),
        course_id: Number(r.course_id),
        total: Number(r.total),
        paid: Number(r.paid),
        overdue: Number(r.overdue),
      });
    }

    return enrolments.map((e) => {
      const u = e.user_id ? userMap.get(e.user_id) : null;
      const courseTitle = e.course_id ? courseMap.get(e.course_id) ?? '' : '';
      const app = appByUserCourse.get(`${e.user_id ?? 0}:${e.course_id ?? 0}`);
      const offeringId = app?.offering_id ?? null;
      const combinationId = app?.combination_id ?? null;
      const offering = offeringId ? offeringMap.get(offeringId) : null;
      const combinationTitle = combinationId ? combinationMap.get(combinationId) ?? '' : '';
      // Resolve the offering's package the SAME way the View Student Fee Summary
      // does: prefer 'paid' packages, match the held combination, else the
      // offering's first/default package (so the fee tracks the offering even
      // when the combination has no package under it).
      const offeringPkgs = offeringId ? packagesByOffering.get(offeringId) ?? [] : [];
      const paidPkgs = offeringPkgs.filter((p) => (p.fee_category ?? 'paid') === 'paid');
      const pickPkgs = paidPkgs.length > 0 ? paidPkgs : offeringPkgs;
      const pkg =
        (combinationId ? pickPkgs.find((p) => p.combination_id === combinationId) : undefined) ?? pickPkgs[0] ?? null;

      // Course Fee (Inc GST) — IDENTICAL formula to the View Student Fee Summary:
      // (offered_fee, else base-discount) + GST. Registration fee is a SEPARATE
      // charge and is NOT folded into the course fee (folding it in was the
      // reported discrepancy). Falls back to the offering's own scalar pricing.
      let courseFee = 0;
      if (pkg) {
        const base = Number(pkg.base_fee ?? 0);
        const discount = Number(pkg.discount ?? 0);
        // offered_fee != null (not > 0) so a genuinely-free (0) package reads 0,
        // exactly like studentFees.
        const exclGst = pkg.offered_fee != null ? Number(pkg.offered_fee) : Math.max(0, base - discount);
        const gstPct = Number(pkg.gst_percent ?? 0);
        courseFee = exclGst + Math.round((exclGst * gstPct) / 100);
      } else if (offering) {
        courseFee = Number(offering.offered_fee ?? offering.base_fee ?? offering.pricing_amount ?? 0);
      }

      const pay = e.user_id && e.course_id ? payByKey.get(`${e.user_id}:${e.course_id}`) : null;
      const paid = pay?.paid ?? 0;
      const overdue = pay?.overdue ?? 0;
      const balance = Math.max(0, courseFee - paid);

      return {
        enrol_id: e.id,
        enrollment_id: e.enrollment_id ?? '',
        user_id: e.user_id,
        student_id: u?.student_id ?? '',
        student_name: u?.name ?? '',
        email: u?.user_email ?? u?.email ?? '',
        course_id: e.course_id,
        course_title: courseTitle,
        offering_id: offeringId,
        offering_title: offering?.title ?? offering?.offering_code ?? '',
        combination_id: combinationId,
        combination_title: combinationTitle,
        course_fee_inc_gst: courseFee,
        fee_paid: paid,
        balance_fee: balance,
        fee_due: overdue,
        course_status: e.enrollment_status ?? '',
      };
    });
  }

  async listFeeInstallments(filters: FeeInstallmentFilters & { search?: string; centreId?: string; studentId?: string; paymentStatus?: string }): Promise<Record<string, unknown>> {
    // Mirrors the legacy PHP `installments()` controller: source rows are
    // distinct users that have at least one `student_payments` row. For each
    // user we sum the recorded payment amounts and compare against the
    // discounted total of their enrolled courses (course.total_amount minus
    // enrol.discount_perc).
    const courseIdFilter = filters.courseId ? toIntId(filters.courseId) : null;
    const userIdFilter = filters.studentId ? toIntId(filters.studentId) : null;

    const paymentSums = await this.prisma.student_payments.groupBy({
      by: ['user_id'],
      where: {
        deleted_at: null,
        ...(courseIdFilter ? { course_id: courseIdFilter } : {}),
        ...(userIdFilter ? { user_id: userIdFilter } : {}),
      },
      _sum: { amount: true },
    });

    const userIds = paymentSums.map(p => p.user_id).filter((x): x is number => x !== null && x !== undefined);
    if (userIds.length === 0) {
      return { counts: { fully_added: 0, partially_added: 0, not_added: 0 }, items: [] };
    }

    // Pull each user's first installment_details (lowest id, which legacy
    // typically renders — usually the registration fee row).
    const firstPayments = await this.prisma.student_payments.findMany({
      where: { deleted_at: null, user_id: { in: userIds } },
      select: { id: true, user_id: true, installment_details: true },
      orderBy: { id: 'asc' },
    });
    const firstDetailsByUser = new Map<number, string | null>();
    for (const p of firstPayments) {
      if (p.user_id == null) continue;
      if (!firstDetailsByUser.has(p.user_id)) firstDetailsByUser.set(p.user_id, p.installment_details);
    }

    const [users, enrolments] = await Promise.all([
      this.prisma.users.findMany({
        where: { id: { in: userIds }, deleted_at: null },
        select: { id: true, name: true, student_id: true, phone: true },
      }),
      this.prisma.enrol.findMany({
        where: { user_id: { in: userIds }, deleted_at: null },
        select: { user_id: true, course_id: true, discount_perc: true },
      }),
    ]);

    const courseIds = [...new Set(enrolments.map(e => e.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, title: true, total_amount: true },
        })
      : [];

    const userMap = new Map(users.map(u => [u.id, u]));
    const courseMap = new Map(courses.map(c => [c.id, c]));

    let items = paymentSums.map(p => {
      const uid = p.user_id;
      if (uid === null || uid === undefined) {
        return null;
      }
      const user = userMap.get(uid);
      const userEnrolments = enrolments.filter(e => e.user_id === uid);

      let totalFee = 0;
      const courseTitles: string[] = [];
      for (const e of userEnrolments) {
        if (e.course_id == null) continue;
        const course = courseMap.get(e.course_id);
        if (!course) continue;
        const base = Number(course.total_amount ?? 0);
        const discountPerc = e.discount_perc ? Number(e.discount_perc) : 0;
        const discounted = base - (base * (Number.isFinite(discountPerc) ? discountPerc : 0) / 100);
        totalFee += Number.isFinite(discounted) ? discounted : 0;
        if (course.title) courseTitles.push(course.title);
      }

      const addedAmount = Number(p._sum.amount ?? 0);
      let fee_plan_status: 'fully_added' | 'partially_added' | 'not_added';
      if (addedAmount === 0) fee_plan_status = 'not_added';
      else if (addedAmount >= totalFee) fee_plan_status = 'fully_added';
      else fee_plan_status = 'partially_added';

      return {
        id: uid,
        user_id: uid,
        student_id: user?.student_id ?? null,
        student_name: user?.name ?? null,
        phone: user?.phone ?? null,
        installment_details: firstDetailsByUser.get(uid) ?? null,
        course_title: courseTitles.join(', '),
        total_fee: totalFee,
        installments_added: addedAmount,
        fee_plan_status,
      };
    }).filter((i): i is NonNullable<typeof i> => i !== null);

    if (filters.status && filters.status !== 'all') {
      items = items.filter(i => i.fee_plan_status === filters.status);
    }

    if (filters.search) {
      const sl = filters.search.toLowerCase();
      items = items.filter(i => {
        const name = toStringValue(i.student_name).toLowerCase();
        const sid = toStringValue(i.student_id).toLowerCase();
        return name.includes(sl) || sid.includes(sl);
      });
    }

    const counts = { fully_added: 0, partially_added: 0, not_added: 0 };
    for (const i of items) {
      counts[i.fee_plan_status]++;
    }

    return { counts, items };
  }

  async listPaymentStatus(filters: AdminPaymentFilters & { centreId?: string; search?: string; paymentStatus?: string; dueDateFrom?: string; dueDateTo?: string }): Promise<Record<string, unknown>> {
    // student_payments rows in the legacy DB carry '0000-00-00' literals in
    // due_date / paid_date which Prisma's MySQL driver refuses to hydrate
    // into DateTime. Read via $queryRaw with NULLIF to convert the legacy
    // sentinel into NULL before Prisma sees it.
    const courseIdFilter = filters.courseId ? toIntId(filters.courseId) : null;
    type RawPayment = {
      id: number;
      user_id: number;
      course_id: number;
      installment_details: string | null;
      amount: number | null;
      payment_mode: string | null;
      payment_to: string | null;
      status: string | null;
      due_date: Date | null;
      paid_date: Date | null;
    };
    const installments = courseIdFilter
      ? await this.prisma.$queryRaw<RawPayment[]>`
          SELECT id, user_id, course_id, installment_details, amount, payment_mode, payment_to, status,
                 NULLIF(due_date, '0000-00-00') AS due_date,
                 NULLIF(paid_date, '0000-00-00') AS paid_date
          FROM student_payments
          WHERE deleted_at IS NULL AND course_id = ${courseIdFilter}
          ORDER BY NULLIF(due_date, '0000-00-00') ASC, id DESC`
      : await this.prisma.$queryRaw<RawPayment[]>`
          SELECT id, user_id, course_id, installment_details, amount, payment_mode, payment_to, status,
                 NULLIF(due_date, '0000-00-00') AS due_date,
                 NULLIF(paid_date, '0000-00-00') AS paid_date
          FROM student_payments
          WHERE deleted_at IS NULL
          ORDER BY NULLIF(due_date, '0000-00-00') ASC, id DESC`;

    const userIds = [...new Set(installments.map(i => i.user_id).filter((x): x is number => x !== null && x !== undefined))];
    const courseIds = [...new Set(installments.map(i => i.course_id).filter((x): x is number => x !== null && x !== undefined))];

    const [users, courses, enrolments] = await Promise.all([
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, student_id: true } }) : [],
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      // Naji UAT 2026-05-14 — surface enrolment status on each instalment
      // row so the team can see at a glance which payments belong to
      // active vs dropout/completed enrolments while triaging dues.
      userIds.length > 0 && courseIds.length > 0
        ? this.prisma.enrol.findMany({
            where: { user_id: { in: userIds }, course_id: { in: courseIds }, deleted_at: null },
            select: { user_id: true, course_id: true, enrollment_status: true },
          })
        : [],
    ]);
    const userMap = new Map(users.map(u => [u.id, u]));
    const courseMap = new Map(courses.map(c => [c.id, c.title]));
    const enrolmentStatusMap = new Map<string, string | null>();
    for (const e of enrolments) {
      enrolmentStatusMap.set(`${e.user_id}|${e.course_id}`, e.enrollment_status ?? null);
    }

    // Match legacy PHP month-year bucketing: previous months → overdue,
    // current month → due, future months → upcoming, status='Paid' → paid.
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const dueFrom = filters.dueDateFrom ? new Date(filters.dueDateFrom) : null;
    const dueTo = filters.dueDateTo ? new Date(filters.dueDateTo) : null;
    if (dueTo) dueTo.setHours(23, 59, 59, 999);

    // Naji UAT 2026-05-14 — `enriched` carries rows from BOTH
    // student_payments (id: number) and synthesised application-stage
    // rows (id: "app-N-IDX"). Use a wide row shape so the union types
    // compose cleanly without per-row casts.
    type PaymentRow = {
      id: number | string;
      user_id: number | null;
      course_id: number | null;
      installment_details: string | null;
      amount: number;
      payment_mode: string | null;
      payment_to: string | null;
      status: string | null;
      due_date: Date | null;
      paid_date: Date | null;
      reference_number?: string | null;
      receipt_url?: string | null;
      user_name: string | null;
      student_id: string | number | null;
      course_title: string | null;
      enrolment_status: string | null;
      computed_status: 'overdue' | 'due' | 'upcoming' | 'paid';
    };
    let enriched: PaymentRow[] = installments.map(inst => {
      const isPaid = (inst.status ?? '').toLowerCase() === 'paid';
      let computed_status: 'overdue' | 'due' | 'upcoming' | 'paid' = 'upcoming';
      if (isPaid) {
        computed_status = 'paid';
      } else if (inst.due_date) {
        const due = inst.due_date instanceof Date ? inst.due_date : new Date(inst.due_date);
        const dueMonth = due.getMonth();
        const dueYear = due.getFullYear();
        if (dueYear < currentYear || (dueYear === currentYear && dueMonth < currentMonth)) {
          computed_status = 'overdue';
        } else if (dueYear === currentYear && dueMonth === currentMonth) {
          computed_status = 'due';
        } else {
          computed_status = 'upcoming';
        }
      }
      const user = userMap.get(inst.user_id);
      const enrolment_status = inst.course_id
        ? enrolmentStatusMap.get(`${inst.user_id}|${inst.course_id}`) ?? null
        : null;
      return {
        ...inst,
        amount: inst.amount == null ? 0 : Number(inst.amount),
        user_name: user?.name ?? null,
        student_id: user?.student_id ?? null,
        course_title: inst.course_id ? courseMap.get(inst.course_id) ?? null : null,
        enrolment_status,
        computed_status,
      };
    });

    // Naji UAT 2026-05-14 — Payment details of enrolments which are in
    // the application stage (lead pipeline, not yet converted) need to
    // surface in this list too. They live in applications.payment_plan
    // JSON until adminApprove transfers them to student_payments. Tag
    // the synthesised rows with enrolment_status='Application' so the
    // table makes it obvious they are pre-enrolment payments.
    type ApplicationPlanInstallment = {
      label?: string;
      amountMinor?: number;
      dueDate?: string;
      gstPercent?: number;
    };
    type ApplicationPlanJson = {
      installments?: ApplicationPlanInstallment[];
      registration_fee_minor?: number | null;
    };
    const appCourseIdFilter = courseIdFilter
      ? { course_id: courseIdFilter }
      : {};
    const applicationsWithPlans = await this.prisma.applications.findMany({
      where: {
        payment_plan: { not: null },
        is_converted: 0,
        deleted_at: null,
        ...appCourseIdFilter,
      },
      select: {
        id: true,
        name: true,
        user_email: true,
        course_id: true,
        payment_plan: true,
        payment_status: true,
        payment_method: true,
        payment_marked_paid_at: true,
      },
    });
    const appCourseIds = [
      ...new Set(
        applicationsWithPlans
          .map((a) => a.course_id)
          .filter((x): x is number => x != null),
      ),
    ];
    if (appCourseIds.length > 0) {
      // Reuse the already-fetched courseMap when overlapping; merge in
      // any new course titles we haven't fetched yet.
      const missingCourseIds = appCourseIds.filter((id) => !courseMap.has(id));
      if (missingCourseIds.length > 0) {
        const extraCourses = await this.prisma.course.findMany({
          where: { id: { in: missingCourseIds } },
          select: { id: true, title: true },
        });
        for (const c of extraCourses) courseMap.set(c.id, c.title);
      }
    }
    const synthesisedRows = applicationsWithPlans.flatMap((app) => {
      let plan: ApplicationPlanJson | null = null;
      try {
        plan = app.payment_plan ? (JSON.parse(app.payment_plan) as ApplicationPlanJson) : null;
      } catch {
        plan = null;
      }
      const installments = Array.isArray(plan?.installments) ? plan.installments : [];
      if (installments.length === 0) return [];
      const courseTitle = app.course_id ? courseMap.get(app.course_id) ?? null : null;
      // Treat the first row (registration) as Paid when the application's
      // registration is settled. Use payment_marked_paid_at (set on approval and
      // never cleared) as well as payment_status so recording a LATER instalment
      // — which flips payment_status back to 'pending_approval' — does not make
      // the already-paid registration look unpaid. Naji 2026-07-04.
      const appPaidFirst =
        app.payment_marked_paid_at != null || (app.payment_status ?? '').toLowerCase() === 'paid';
      // Per-instalment ledger: a later row shows Paid once Finance approves it.
      const rowLedger = plan ? readInstalmentLedger(plan as unknown as Record<string, unknown>, app.payment_status ?? undefined) : [];
      const ledgerApproved = (i: number): boolean => rowLedger.some((e) => e.index === i && e.status === 'approved');
      return installments.map((row, idx) => {
        const amountInr = Number.isFinite(row.amountMinor) ? Number(row.amountMinor) / 100 : 0;
        const dueDate = typeof row.dueDate === 'string' && row.dueDate ? new Date(row.dueDate) : null;
        let computed_status: 'overdue' | 'due' | 'upcoming' | 'paid' = 'upcoming';
        if ((idx === 0 && appPaidFirst) || ledgerApproved(idx)) {
          computed_status = 'paid';
        } else if (dueDate) {
          const dm = dueDate.getMonth();
          const dy = dueDate.getFullYear();
          if (dy < currentYear || (dy === currentYear && dm < currentMonth)) computed_status = 'overdue';
          else if (dy === currentYear && dm === currentMonth) computed_status = 'due';
          else computed_status = 'upcoming';
        }
        return {
          id: `app-${app.id}-${idx}`,
          user_id: null,
          course_id: app.course_id,
          installment_details: row.label ?? `Installment ${idx + 1}`,
          amount: amountInr,
          payment_mode: idx === 0 && appPaidFirst ? app.payment_method ?? null : null,
          payment_to: 'ttii',
          status: computed_status === 'paid' ? 'Paid' : null,
          due_date: dueDate,
          paid_date: null,
          reference_number: null,
          receipt_url: null,
          user_name: app.name ?? null,
          student_id: app.user_email ?? null,
          course_title: courseTitle,
          enrolment_status: 'Application',
          computed_status,
        };
      });
    });

    enriched = [...enriched, ...synthesisedRows];

    if (dueFrom) enriched = enriched.filter(r => r.due_date && new Date(r.due_date) >= dueFrom);
    if (dueTo) enriched = enriched.filter(r => r.due_date && new Date(r.due_date) <= dueTo);

    if (filters.paymentStatus) {
      enriched = enriched.filter(r => r.computed_status === filters.paymentStatus);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      enriched = enriched.filter(r => {
        const name = toStringValue(r.user_name).toLowerCase();
        const sid = toStringValue(r.student_id).toLowerCase();
        return name.includes(searchLower) || sid.includes(searchLower);
      });
    }

    const counts = { overdue: 0, due: 0, upcoming: 0, paid: 0 };
    const amounts = { overdue: 0, due: 0, upcoming: 0, paid: 0 };
    for (const r of enriched) {
      counts[r.computed_status]++;
      amounts[r.computed_status] += Number(r.amount ?? 0);
    }

    return { counts, amounts, installments: enriched };
  }

  async listCohortAttendance(filters: CohortAttendanceFilters): Promise<SqlRow[]> {
    // If cohort filter is set, first find live_class IDs for that cohort
    let liveIdFilter: number[] | undefined;
    if (filters.cohortId) {
      const livesForCohort = await this.prisma.live_class.findMany({
        where: { cohort_id: toNullableIntId(filters.cohortId), deleted_at: null },
        select: { id: true },
      });
      liveIdFilter = livesForCohort.map(l => l.id);
      if (liveIdFilter.length === 0) return [] as unknown as SqlRow[];
    }

    const zhWhere: Record<string, unknown> = { deleted_at: null };
    if (liveIdFilter && liveIdFilter.length > 0) zhWhere.live_id = { in: liveIdFilter };

    const records = await this.prisma.zoom_history.findMany({
      where: zhWhere as Prisma.zoom_historyWhereInput,
      orderBy: [{ join_date: 'desc' }, { id: 'desc' }],
    });

    const userIds = [...new Set(records.map(r => r.user_id).filter((x): x is number => x !== null && x !== undefined))];
    const liveIds = [...new Set(records.map(r => r.live_id).filter((x): x is number => x !== null && x !== undefined))];

    const [users, liveClasses] = await Promise.all([
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, student_id: true } }) : [],
      liveIds.length > 0 ? this.prisma.live_class.findMany({ where: { id: { in: liveIds } }, select: { id: true, title: true, date: true, cohort_id: true } }) : [],
    ]);
    const userMap = new Map(users.map(u => [u.id, u]));
    const lcMap = new Map(liveClasses.map(l => [l.id, l]));

    const cohortIds = [...new Set(liveClasses.map(l => l.cohort_id).filter((x): x is number => x !== null && x !== undefined))];
    const cohorts = cohortIds.length > 0
      ? await this.prisma.cohorts.findMany({ where: { id: { in: cohortIds } }, select: { id: true, title: true, course_id: true } })
      : [];
    const cohortMap = new Map(cohorts.map(ch => [ch.id, ch]));

    const courseIds = [...new Set(cohorts.map(ch => ch.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
      : [];
    const courseMap = new Map(courses.map(c => [c.id, c.title]));

    return records.map(zh => {
      const lc = zh.live_id ? lcMap.get(zh.live_id) : undefined;
      const ch = lc?.cohort_id ? cohortMap.get(lc.cohort_id) : undefined;
      return {
        ...zh,
        student_name: zh.user_id ? (userMap.get(zh.user_id)?.name ?? null) : null,
        student_id: zh.user_id ? (userMap.get(zh.user_id)?.student_id ?? null) : null,
        session_title: lc?.title ?? null,
        session_date: lc?.date ?? null,
        cohort_title: ch?.title ?? null,
        course_title: ch?.course_id ? courseMap.get(ch.course_id) ?? null : null,
      };
    }) as unknown as SqlRow[];
  }

  async listScholarships(): Promise<SqlRow[]> {
    // TODO: course_package model does not exist in MySQL schema.
    const coupons = await this.prisma.coupon_code.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });

    return coupons.map(cc => ({
      ...cc,
      package_title: null,
    })) as unknown as SqlRow[];
  }

  // ─── Phase 4: CRM & Content ─────────────────────────────────────────────────

  async listCounsellors(): Promise<SqlRow[]> {
    const counsellors = await this.prisma.users.findMany({
      where: { role_id: 9, deleted_at: null },
      orderBy: { id: 'desc' },
      select: {
        id: true, name: true, user_email: true, phone: true, status: true, centre_id: true,
        image: true, profile_picture: true, created_at: true, disabled_at: true,
        // Profile detail so the Edit form pre-fills (Naji UAT 2026-06-23).
        gender: true, dob: true, languages_spoken: true, highest_qualification: true, date_of_joining: true,
      },
    });

    const counsellorIds = counsellors.map(c => c.id);
    if (counsellorIds.length === 0) return [] as unknown as SqlRow[];

    const centreIdInts = [...new Set(counsellors.map(c => toNullableIntId(c.centre_id)).filter((x): x is number => x !== null))];

    const [centres, referredCounts, convertedCounts] = await Promise.all([
      centreIdInts.length > 0 ? this.prisma.centres.findMany({ where: { id: { in: centreIdInts } }, select: { id: true, centre_name: true } }) : [],
      this.prisma.applications.groupBy({
        by: ['pipeline_user'],
        where: { pipeline_user: { in: counsellorIds }, deleted_at: null },
        _count: { id: true },
      }),
      this.prisma.applications.groupBy({
        by: ['pipeline_user'],
        where: { pipeline_user: { in: counsellorIds }, is_converted: 1, deleted_at: null },
        _count: { id: true },
      }),
    ]);

    const centreMap = new Map(centres.map(c => [c.id, c.centre_name]));
    const referredMap = new Map(referredCounts.map((r) => [r.pipeline_user, r._count?.id ?? 0]));
    const convertedMap = new Map(convertedCounts.map((r) => [r.pipeline_user, r._count?.id ?? 0]));

    return counsellors.map(u => {
      const centreIdNum = toNullableIntId(u.centre_id);
      // Resolve the stored photo to a full URL so the directory table can
      // render it directly (legacy rows hold relative `uploads/...` paths;
      // new uploads already hold absolute URLs — toLegacyFileUrl is a no-op
      // for those). Mirrors how listStudents serialises the avatar.
      const photo = toLegacyFileUrl(u.image) || toLegacyFileUrl(u.profile_picture);
      return {
        ...u,
        image: photo,
        profile_picture: toLegacyFileUrl(u.profile_picture),
        // The Edit form reads `doj`; the column is `date_of_joining`.
        doj: u.date_of_joining,
        centre_name: centreIdNum !== null ? centreMap.get(centreIdNum) ?? null : null,
        applications_referred: referredMap.get(u.id) ?? 0,
        applications_converted: convertedMap.get(u.id) ?? 0,
      };
    }) as unknown as SqlRow[];
  }

  /**
   * offering_id:combination_id → associated_point, for counsellor Points-target
   * maths. One bounded read of the (small) package table.
   */
  private async loadPackagePointMap(): Promise<Map<string, number>> {
    const pkgs = await this.prisma.offering_certificate_packages.findMany({
      where: { deleted_at: null },
      select: { offering_id: true, combination_id: true, associated_point: true },
    });
    return new Map(pkgs.map((p) => [packagePointKey(p.offering_id, p.combination_id), p.associated_point ?? 0]));
  }

  async listCounsellorTargets(): Promise<SqlRow[]> {
    const targets = await this.prisma.counsellor_target.findMany({
      where: { deleted_at: null },
      orderBy: [{ from_date: 'desc' }, { counsellor_target_id: 'desc' }],
    });

    const userIds = [...new Set(targets.map((t) => t.counsellor_id))];
    const needsPoints = targets.some((t) => t.type === 4);
    const [users, apps, packagePoints] = await Promise.all([
      userIds.length > 0
        ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, user_email: true } })
        : Promise.resolve([] as Array<{ id: number; name: string | null; user_email: string | null }>),
      userIds.length > 0
        ? this.prisma.applications.findMany({
            where: { pipeline_user: { in: userIds }, deleted_at: null },
            select: {
              pipeline_user: true, created_at: true, converted_at: true, is_converted: true, stage: true,
              offering_id: true, certificate_combination_id: true, enrollment_status: true,
            },
          })
        : Promise.resolve([] as Array<CounsellorTargetApp & { pipeline_user: number | null }>),
      needsPoints ? this.loadPackagePointMap() : Promise.resolve(new Map<string, number>()),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));

    return targets.map((t) => {
      // Real "Achieved" for this counsellor's target — Points targets sum the
      // associated points of the packages they enrolled students into; other
      // types count applications / enrolments (see computeCounsellorTargetAchieved).
      const from = t.from_date;
      const to = t.to_date;
      const mineApps = apps.filter((a) => a.pipeline_user === t.counsellor_id);
      const achieved = computeCounsellorTargetAchieved(t, mineApps, packagePoints);
      const isoFrom = from ? from.toISOString().slice(0, 10) : '';
      const isoTo = to ? to.toISOString().slice(0, 10) : '';

      return {
        ...t,
        id: t.counsellor_target_id,
        _id: t.counsellor_target_id,
        user_id: t.counsellor_id,
        counsellor_name: userMap.get(t.counsellor_id)?.name ?? null,
        counsellor_email: userMap.get(t.counsellor_id)?.user_email ?? null,
        // Frontend-aligned field names (the admin Counsellor-Target table reads these).
        target_type: targetTypeLabel(t.type),
        target_value: t.value,
        period: isoFrom && isoTo ? `${isoFrom} to ${isoTo}` : '',
        achieved_value: achieved,
      };
    }) as unknown as SqlRow[];
  }

  /**
   * Counsellor dashboard payload — KPIs, admissions trend, course performance
   * and a pipeline snapshot, all scoped to the logged-in counsellor via
   * applications.pipeline_user (same role_id=9 scoping used elsewhere).
   * Computed in JS from a single bounded applications fetch to avoid raw-SQL
   * date grouping. "Dropouts" uses the unambiguous drop_out_at timestamp.
   */
  async getCounsellorDashboard(counsellorId: number): Promise<Record<string, unknown>> {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [apps, targets, dropoutCount] = await Promise.all([
      this.prisma.applications.findMany({
        where: { pipeline_user: counsellorId, deleted_at: null },
        select: {
          id: true,
          application_id: true,
          name: true,
          course_id: true,
          stage: true,
          is_converted: true,
          created_at: true,
          // Needed for Points-target achievement (Naji 2026-06-23).
          converted_at: true,
          offering_id: true,
          certificate_combination_id: true,
          enrollment_status: true,
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.counsellor_target.findMany({
        where: { counsellor_id: counsellorId, deleted_at: null },
        orderBy: [{ from_date: 'desc' }, { counsellor_target_id: 'desc' }],
      }),
      this.prisma.users.count({
        where: {
          role_id: 2,
          deleted_at: null,
          drop_out_at: { not: null },
          OR: [
            { counsellor_id: counsellorId },
            { referred_by: counsellorId },
            { created_by: counsellorId },
            { pipeline_user: counsellorId },
          ],
        },
      }),
    ]);

    const isEnrolled = (a: { stage: string | null; is_converted: number | null }): boolean =>
      a.stage === 'enrolled' || a.is_converted === 1;
    const isRejected = (a: { stage: string | null }): boolean => a.stage === 'rejected';

    const totalApplications = apps.length;
    const totalEnrollments = apps.filter(isEnrolled).length;
    const pendingApplications = apps.filter((a) => !isEnrolled(a) && !isRejected(a)).length;
    const ytd = apps.filter((a) => a.created_at != null && a.created_at >= yearStart).length;

    // Active target window (covers today); else the most-recent target.
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const activeTarget = targets.find((t) => t.from_date <= today && t.to_date >= today) ?? targets[0] ?? null;
    let monthlyTargetPoint = 0;
    let targetAchieved = 0;
    if (activeTarget) {
      monthlyTargetPoint = activeTarget.value;
      // Same achievement rule as the admin Counsellor-Target table: Points
      // targets sum package associated-points by enrolment date; other types
      // count applications / enrolments (Naji 2026-06-23).
      const packagePoints = activeTarget.type === 4 ? await this.loadPackagePointMap() : new Map<string, number>();
      targetAchieved = computeCounsellorTargetAchieved(activeTarget, apps, packagePoints);
    }
    const achievementPct =
      monthlyTargetPoint > 0 ? Math.min(100, Math.round((targetAchieved / monthlyTargetPoint) * 100)) : 0;

    // Admissions trend — last 6 calendar months (applications + enrollments).
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendBuckets: { label: string; applications: number; enrollments: number }[] = [];
    const trendIndex = new Map<string, number>();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendIndex.set(`${d.getFullYear()}-${d.getMonth()}`, trendBuckets.length);
      trendBuckets.push({ label: monthLabels[d.getMonth()] ?? '', applications: 0, enrollments: 0 });
    }
    for (const a of apps) {
      if (a.created_at == null) continue;
      const idx = trendIndex.get(`${a.created_at.getFullYear()}-${a.created_at.getMonth()}`);
      if (idx === undefined) continue;
      const bucket = trendBuckets[idx];
      if (!bucket) continue;
      bucket.applications += 1;
      if (isEnrolled(a)) bucket.enrollments += 1;
    }

    // Course performance — group by course_id, resolve titles, top 6 by volume.
    const byCourse = new Map<number, { applications: number; enrollments: number }>();
    for (const a of apps) {
      if (a.course_id == null) continue;
      const entry = byCourse.get(a.course_id) ?? { applications: 0, enrollments: 0 };
      entry.applications += 1;
      if (isEnrolled(a)) entry.enrollments += 1;
      byCourse.set(a.course_id, entry);
    }
    const courseIds = [...byCourse.keys()];
    const courses =
      courseIds.length > 0
        ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
        : [];
    const courseMap = new Map<number, string>(courses.map((c) => [c.id, c.title ?? `Course #${c.id}`]));
    const courseTitle = (id: number | null): string =>
      id != null ? courseMap.get(id) ?? `Course #${id}` : '—';
    const coursePerformance = [...byCourse.entries()]
      .map(([courseId, v]) => ({
        courseId,
        courseTitle: courseTitle(courseId),
        applications: v.applications,
        enrollments: v.enrollments,
        conversionPct: v.applications > 0 ? Math.round((v.enrollments / v.applications) * 100) : 0,
      }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 6);

    // Pipeline snapshot — most recent rows per pending stage.
    const snapshotRow = (a: (typeof apps)[number]) => ({
      id: a.id,
      applicationId: a.application_id ?? `#${a.id}`,
      name: a.name ?? '—',
      course: courseTitle(a.course_id),
      date: a.created_at ? a.created_at.toISOString() : null,
      stage: a.stage ?? 'lead',
    });
    const byStage = (stage: string) => apps.filter((a) => a.stage === stage).slice(0, 5).map(snapshotRow);

    // Recent activity — latest events across the counsellor's applications
    // (created / link sent / marked paid / form submitted / approved / rejected).
    const appIds = apps.map((a) => a.id);
    const appNameById = new Map<number, string>(apps.map((a) => [a.id, a.name ?? '—']));
    const events =
      appIds.length > 0
        ? await this.prisma.application_events.findMany({
            where: { application_id: { in: appIds } },
            orderBy: { created_at: 'desc' },
            take: 8,
            select: { id: true, application_id: true, event_type: true, description: true, created_at: true },
          })
        : [];
    const recentActivity = events.map((e) => ({
      id: e.id,
      type: e.event_type ?? 'event',
      title: e.description ?? e.event_type ?? 'Activity',
      detail: appNameById.get(e.application_id) ?? '',
      createdAt: e.created_at ? e.created_at.toISOString() : null,
    }));

    // Month-over-month deltas (real, from created_at buckets) for the count KPIs.
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const inThisMonth = (d: Date | null): boolean => d != null && d >= thisMonthStart;
    const inLastMonth = (d: Date | null): boolean => d != null && d >= lastMonthStart && d < thisMonthStart;
    const pctChange = (cur: number, prev: number): number =>
      prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : cur > 0 ? 100 : 0;
    const appsThis = apps.filter((a) => inThisMonth(a.created_at));
    const appsLast = apps.filter((a) => inLastMonth(a.created_at));
    const isPending = (a: { stage: string | null; is_converted: number | null }): boolean =>
      !isEnrolled(a) && !isRejected(a);
    const deltas = {
      totalApplications: pctChange(appsThis.length, appsLast.length),
      totalEnrollments: pctChange(appsThis.filter(isEnrolled).length, appsLast.filter(isEnrolled).length),
      pendingApplications: pctChange(appsThis.filter(isPending).length, appsLast.filter(isPending).length),
    };

    // Rolling 30-day deltas (last 30 days vs the prior 30 days), bucketed on
    // applications.created_at — safe, no '0000-00-00' zero-date hazard. These
    // complement the calendar-month `deltas` above with a fixed-width window
    // and integer-percent rounding per the headline-KPI spec.
    const DAY_MS = 24 * 60 * 60 * 1000;
    const window30Start = new Date(now.getTime() - 30 * DAY_MS);
    const window60Start = new Date(now.getTime() - 60 * DAY_MS);
    const inCurrentWindow = (d: Date | null): boolean => d != null && d >= window30Start;
    const inPriorWindow = (d: Date | null): boolean =>
      d != null && d >= window60Start && d < window30Start;
    const deltaPct = (current: number, prior: number): number =>
      prior === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - prior) / prior) * 100);
    const appsCurrentWindow = apps.filter((a) => inCurrentWindow(a.created_at));
    const appsPriorWindow = apps.filter((a) => inPriorWindow(a.created_at));
    const applicationsDeltaPct = deltaPct(appsCurrentWindow.length, appsPriorWindow.length);
    const enrollmentsDeltaPct = deltaPct(
      appsCurrentWindow.filter(isEnrolled).length,
      appsPriorWindow.filter(isEnrolled).length,
    );
    const pendingDeltaPct = deltaPct(
      appsCurrentWindow.filter(isPending).length,
      appsPriorWindow.filter(isPending).length,
    );

    // Application funnel — counts per pipeline stage (Lead → Rejected) + overall conversion.
    const FUNNEL_STAGES: { key: string; label: string }[] = [
      { key: 'lead', label: 'Lead' },
      { key: 'payment_pending', label: 'Payment Pending' },
      { key: 'paid', label: 'Paid' },
      { key: 'form_pending', label: 'Form Pending' },
      { key: 'form_submitted', label: 'Form Submitted' },
      { key: 'approval_waiting', label: 'Approval Waiting' },
      { key: 'rejected', label: 'Rejected' },
    ];
    const funnel = FUNNEL_STAGES.map((s) => ({
      key: s.key,
      label: s.label,
      count: apps.filter((a) => a.stage === s.key).length,
    }));
    const overallConversionPct =
      totalApplications > 0 ? Math.round((totalEnrollments / totalApplications) * 1000) / 10 : 0;

    return {
      kpis: {
        totalApplications,
        totalEnrollments,
        pendingApplications,
        totalDropouts: dropoutCount,
        monthlyTargetPoint,
        targetAchieved,
        achievementPct,
        ytd,
        // Rolling 30-day MoM deltas (last 30 days vs prior 30 days),
        // integer percent. No revenue KPI on this dashboard, so no
        // revenueDeltaPct here.
        applicationsDeltaPct,
        enrollmentsDeltaPct,
        pendingDeltaPct,
      },
      deltas,
      funnel,
      overallConversionPct,
      admissionsTrend: {
        labels: trendBuckets.map((b) => b.label),
        applications: trendBuckets.map((b) => b.applications),
        enrollments: trendBuckets.map((b) => b.enrollments),
      },
      coursePerformance,
      pipelineSnapshot: {
        paymentPending: byStage('payment_pending'),
        formPending: byStage('form_pending'),
        approvalWaiting: byStage('approval_waiting'),
      },
      recentActivity,
    };
  }

  /**
   * Counsellor leaderboard — ranks every counsellor (role 9) by enrollments and
   * admissions, with target-achievement % and a tier. Real data so the
   * Performance page "Top Counsellors" board reflects the actual team.
   */
  async getCounsellorLeaderboard(counsellorId: number): Promise<Record<string, unknown>> {
    const counsellors = await this.prisma.users.findMany({
      where: { role_id: 9, deleted_at: null },
      select: { id: true, name: true },
    });
    if (counsellors.length === 0) return { leaderboard: [] };

    const ids = counsellors.map((c) => c.id);
    const [apps, targets] = await Promise.all([
      this.prisma.applications.findMany({
        where: { pipeline_user: { in: ids }, deleted_at: null },
        select: { pipeline_user: true, is_converted: true, stage: true },
      }),
      this.prisma.counsellor_target.findMany({
        where: { counsellor_id: { in: ids }, deleted_at: null },
        select: { counsellor_id: true, value: true },
      }),
    ]);

    const targetSum = new Map<number, number>();
    for (const t of targets) targetSum.set(t.counsellor_id, (targetSum.get(t.counsellor_id) ?? 0) + (t.value ?? 0));

    const agg = new Map<number, { admissions: number; enrollments: number }>();
    for (const a of apps) {
      if (a.pipeline_user == null) continue;
      const e = agg.get(a.pipeline_user) ?? { admissions: 0, enrollments: 0 };
      e.admissions += 1;
      if (a.stage === 'enrolled' || a.is_converted === 1) e.enrollments += 1;
      agg.set(a.pipeline_user, e);
    }

    const initialsOf = (name: string | null): string => {
      const t = (name ?? '').trim();
      if (t === '') return 'CN';
      return (
        t
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0] ?? '')
          .join('')
          .toUpperCase() || 'CN'
      );
    };
    const tierFor = (pct: number): string =>
      pct >= 100 ? 'Diamond' : pct >= 80 ? 'Platinum' : pct >= 60 ? 'Gold' : pct >= 40 ? 'Silver' : 'Bronze';

    const rows = counsellors
      .map((c) => {
        const a = agg.get(c.id) ?? { admissions: 0, enrollments: 0 };
        const tgt = targetSum.get(c.id) ?? 0;
        const achievementPct = tgt > 0 ? Math.min(100, Math.round((a.enrollments / tgt) * 100)) : 0;
        return {
          id: c.id,
          name: c.name ?? '—',
          initials: initialsOf(c.name),
          points: a.enrollments,
          admissions: a.admissions,
          enrollments: a.enrollments,
          achievementPct,
          tier: tierFor(achievementPct),
          isCurrentUser: c.id === counsellorId,
        };
      })
      .sort((x, y) => y.points - x.points || y.admissions - x.admissions)
      .map((r, i) => ({ ...r, rank: i + 1 }))
      .slice(0, 8);

    return { leaderboard: rows };
  }

  /**
   * Counsellor payments — per-application fee status (paid / pending / no link)
   * scoped to the counsellor's applications, plus a collection summary. Derived
   * from the applications table (pipeline_user) so it needs no payment_info join.
   */
  async getCounsellorPayments(counsellorId: number): Promise<Record<string, unknown>> {
    const apps = await this.prisma.applications.findMany({
      where: { pipeline_user: counsellorId, deleted_at: null },
      select: {
        id: true,
        application_id: true,
        name: true,
        course_id: true,
        application_final_fee: true,
        payment_status: true,
        payment_link_url: true,
        payment_marked_paid_at: true,
        stage: true,
        created_at: true,
      },
      orderBy: { id: 'desc' },
    });

    const courseIds = [...new Set(apps.map((a) => a.course_id).filter((x): x is number => x != null))];
    const courses =
      courseIds.length > 0
        ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
        : [];
    const courseMap = new Map<number, string>(courses.map((c) => [c.id, c.title ?? `Course #${c.id}`]));

    const PAID_STAGES = new Set(['paid', 'form_pending', 'form_submitted', 'approval_waiting', 'enrolled']);
    const isPaid = (a: {
      stage: string | null;
      payment_status: string | null;
      payment_marked_paid_at: Date | null;
    }): boolean =>
      a.payment_marked_paid_at != null ||
      (a.payment_status ?? '').toLowerCase() === 'paid' ||
      (a.stage != null && PAID_STAGES.has(a.stage));

    let collectedAmount = 0;
    let pendingAmount = 0;
    let paidCount = 0;
    let pendingCount = 0;

    const rows = apps.map((a) => {
      const fee = Number(a.application_final_fee ?? 0) || 0;
      const paid = isPaid(a);
      const hasLink = (a.payment_link_url ?? '') !== '';
      const state = paid ? 'paid' : hasLink || a.stage === 'payment_pending' ? 'pending' : 'no_link';
      if (paid) {
        collectedAmount += fee;
        paidCount += 1;
      } else if (state === 'pending') {
        pendingAmount += fee;
        pendingCount += 1;
      }
      return {
        id: a.id,
        applicationId: a.application_id ?? `#${a.id}`,
        name: a.name ?? '—',
        course: a.course_id != null ? courseMap.get(a.course_id) ?? `Course #${a.course_id}` : '—',
        fee,
        state,
        paymentLink: a.payment_link_url ?? '',
        paidAt: a.payment_marked_paid_at ? a.payment_marked_paid_at.toISOString() : null,
        createdAt: a.created_at ? a.created_at.toISOString() : null,
      };
    });

    return {
      summary: { collectedAmount, pendingAmount, paidCount, pendingCount, total: apps.length },
      rows,
    };
  }

  /**
   * Refer-a-friend rows joined with the referring user's name. The legacy
   * `refer_a_friend` table only stores name/phone/user_id; admins see all
   * rows, counsellors see only their own (rows where `user_id = caller`).
   * Counsellor scoping is applied at the router layer when we know who's
   * calling.
   */
  async listReferrals(scopedToUserId?: number | null): Promise<SqlRow[]> {
    const rows = await this.prisma.refer_a_friend.findMany({
      where: scopedToUserId != null ? { user_id: scopedToUserId } : {},
      orderBy: { id: 'desc' },
    });

    const userIds = [...new Set(rows.map((r) => r.user_id).filter((x): x is number => x != null))];
    const users = userIds.length > 0
      ? await this.prisma.users.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, user_email: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return rows.map((r) => ({
      id: r.id,
      student_name: r.name,
      phone: r.phone,
      status: r.status ? 'converted' : 'pending',
      referrer_id: r.user_id,
      referrer_name: r.user_id != null ? userMap.get(r.user_id)?.name ?? null : null,
      referrer_email: r.user_id != null ? userMap.get(r.user_id)?.user_email ?? null : null,
      created_at: null,
      course_name: null,
    })) as unknown as SqlRow[];
  }

  // ─── Associate CRM (role 10) — associate-scoped siblings of the counsellor
  // dashboard/payments/leaderboard/targets/referrals reads. Each returns the
  // SAME output shape as its counsellor counterpart so the reused counsellor
  // pages render unchanged, but every read is scoped to the ACTOR's own data
  // via the centre ownership OR-clause (added_under_centre = actor's centre OR
  // created_by = actor). NEVER uses pipeline_user / the role-9 scope, so an
  // associate can only ever see applications/students they referred or own.

  /** Applications owned by this associate — mirrors listCentreApplications'
   *  scoping. created_by always matches (addCentreApplication stamps it); the
   *  centre clause is only added when the associate has a centre so we never
   *  match centre-less rows via `added_under_centre = 0`. */
  private associateOwnershipOr(actorUserId: string, centreId: string): Prisma.applicationsWhereInput[] {
    const ownershipOr: Prisma.applicationsWhereInput[] = [{ created_by: toIntId(actorUserId) }];
    if (centreId) ownershipOr.push({ added_under_centre: toIntId(centreId) });
    return ownershipOr;
  }

  /**
   * Route-guard companion for the associate/centre per-application routes.
   * Returns true iff the application exists AND is owned by the actor
   * (created_by = actor OR added_under_centre = actor's centre). Never uses the
   * role-9 pipeline scope. Applied as a preHandler so an associate can only
   * read/act on applications they referred or own — and to close the shared
   * /centre/applications/convert IDOR for centre role 7 as well.
   */
  async actorOwnsAssociateApp(actorUserId: string, applicationId: string): Promise<boolean> {
    const id = toIntId(applicationId);
    if (!id) return false;
    const centreId = await this.resolveActorCentreId(actorUserId);
    const owned = await this.prisma.applications.findFirst({
      where: { id, deleted_at: null, OR: this.associateOwnershipOr(actorUserId, centreId) },
      select: { id: true },
    });
    return owned !== null;
  }

  /**
   * Route-guard companion for the associate/centre per-student routes. Returns
   * true iff the student (role 2) sits under the actor's centre OR is linked to
   * an application the actor owns (via applications.student_id back-ref or the
   * student's users.application_id). Never exposes arbitrary students.
   */
  async actorOwnsAssociateStudent(actorUserId: string, studentId: string): Promise<boolean> {
    const uid = toIntId(studentId);
    if (!uid) return false;
    const centreId = await this.resolveActorCentreId(actorUserId);
    const user = await this.prisma.users.findFirst({
      where: { id: uid, role_id: 2, deleted_at: null },
      select: { id: true, application_id: true, added_under_centre: true },
    });
    if (!user) return false;
    // Direct: the student's own record is under the associate's centre.
    if (centreId && user.added_under_centre === toIntId(centreId)) return true;
    // Otherwise: a linked application the associate owns.
    const appLinkOr: Prisma.applicationsWhereInput[] = [{ student_id: uid }];
    if (user.application_id) appLinkOr.push({ id: user.application_id });
    const owned = await this.prisma.applications.findFirst({
      where: {
        deleted_at: null,
        AND: [{ OR: appLinkOr }, { OR: this.associateOwnershipOr(actorUserId, centreId) }],
      },
      select: { id: true },
    });
    return owned !== null;
  }

  /**
   * Associate dashboard — same payload shape as getCounsellorDashboard, scoped
   * to the associate's own applications. Associates have no counsellor_target
   * rows, so the target/achievement KPIs are 0 (every key stays present).
   */
  async getAssociateDashboard(actorUserId: string): Promise<Record<string, unknown>> {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const centreId = await this.resolveActorCentreId(actorUserId);
    const ownershipOr = this.associateOwnershipOr(actorUserId, centreId);

    const [apps, dropoutCount] = await Promise.all([
      this.prisma.applications.findMany({
        where: { deleted_at: null, OR: ownershipOr },
        select: {
          id: true,
          application_id: true,
          name: true,
          course_id: true,
          stage: true,
          is_converted: true,
          created_at: true,
        },
        orderBy: { id: 'desc' },
      }),
      this.prisma.users.count({
        where: {
          role_id: 2,
          deleted_at: null,
          drop_out_at: { not: null },
          OR: centreId
            ? [{ added_under_centre: Number(centreId) }, { created_by: toIntId(actorUserId) }]
            : [{ created_by: toIntId(actorUserId) }],
        },
      }),
    ]);

    const isEnrolled = (a: { stage: string | null; is_converted: number | null }): boolean =>
      a.stage === 'enrolled' || a.is_converted === 1;
    const isRejected = (a: { stage: string | null }): boolean => a.stage === 'rejected';

    const totalApplications = apps.length;
    const totalEnrollments = apps.filter(isEnrolled).length;
    const pendingApplications = apps.filter((a) => !isEnrolled(a) && !isRejected(a)).length;
    const ytd = apps.filter((a) => a.created_at != null && a.created_at >= yearStart).length;

    // Associates carry no targets — keep the keys, zero the values.
    const monthlyTargetPoint = 0;
    const targetAchieved = 0;
    const achievementPct = 0;

    // Admissions trend — last 6 calendar months (applications + enrollments).
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendBuckets: { label: string; applications: number; enrollments: number }[] = [];
    const trendIndex = new Map<string, number>();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendIndex.set(`${d.getFullYear()}-${d.getMonth()}`, trendBuckets.length);
      trendBuckets.push({ label: monthLabels[d.getMonth()] ?? '', applications: 0, enrollments: 0 });
    }
    for (const a of apps) {
      if (a.created_at == null) continue;
      const idx = trendIndex.get(`${a.created_at.getFullYear()}-${a.created_at.getMonth()}`);
      if (idx === undefined) continue;
      const bucket = trendBuckets[idx];
      if (!bucket) continue;
      bucket.applications += 1;
      if (isEnrolled(a)) bucket.enrollments += 1;
    }

    // Course performance — group by course_id, resolve titles, top 6 by volume.
    const byCourse = new Map<number, { applications: number; enrollments: number }>();
    for (const a of apps) {
      if (a.course_id == null) continue;
      const entry = byCourse.get(a.course_id) ?? { applications: 0, enrollments: 0 };
      entry.applications += 1;
      if (isEnrolled(a)) entry.enrollments += 1;
      byCourse.set(a.course_id, entry);
    }
    const courseIds = [...byCourse.keys()];
    const courses =
      courseIds.length > 0
        ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
        : [];
    const courseMap = new Map<number, string>(courses.map((c) => [c.id, c.title ?? `Course #${c.id}`]));
    const courseTitle = (id: number | null): string =>
      id != null ? courseMap.get(id) ?? `Course #${id}` : '—';
    const coursePerformance = [...byCourse.entries()]
      .map(([courseId, v]) => ({
        courseId,
        courseTitle: courseTitle(courseId),
        applications: v.applications,
        enrollments: v.enrollments,
        conversionPct: v.applications > 0 ? Math.round((v.enrollments / v.applications) * 100) : 0,
      }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 6);

    // Pipeline snapshot — most recent rows per pending stage.
    const snapshotRow = (a: (typeof apps)[number]) => ({
      id: a.id,
      applicationId: a.application_id ?? `#${a.id}`,
      name: a.name ?? '—',
      course: courseTitle(a.course_id),
      date: a.created_at ? a.created_at.toISOString() : null,
      stage: a.stage ?? 'lead',
    });
    const byStage = (stage: string) => apps.filter((a) => a.stage === stage).slice(0, 5).map(snapshotRow);

    // Recent activity — latest events across the associate's applications.
    const appIds = apps.map((a) => a.id);
    const appNameById = new Map<number, string>(apps.map((a) => [a.id, a.name ?? '—']));
    const events =
      appIds.length > 0
        ? await this.prisma.application_events.findMany({
            where: { application_id: { in: appIds } },
            orderBy: { created_at: 'desc' },
            take: 8,
            select: { id: true, application_id: true, event_type: true, description: true, created_at: true },
          })
        : [];
    const recentActivity = events.map((e) => ({
      id: e.id,
      type: e.event_type ?? 'event',
      title: e.description ?? e.event_type ?? 'Activity',
      detail: appNameById.get(e.application_id) ?? '',
      createdAt: e.created_at ? e.created_at.toISOString() : null,
    }));

    // Month-over-month deltas (calendar month) for the count KPIs.
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const inThisMonth = (d: Date | null): boolean => d != null && d >= thisMonthStart;
    const inLastMonth = (d: Date | null): boolean => d != null && d >= lastMonthStart && d < thisMonthStart;
    const pctChange = (cur: number, prev: number): number =>
      prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : cur > 0 ? 100 : 0;
    const appsThis = apps.filter((a) => inThisMonth(a.created_at));
    const appsLast = apps.filter((a) => inLastMonth(a.created_at));
    const isPending = (a: { stage: string | null; is_converted: number | null }): boolean =>
      !isEnrolled(a) && !isRejected(a);
    const deltas = {
      totalApplications: pctChange(appsThis.length, appsLast.length),
      totalEnrollments: pctChange(appsThis.filter(isEnrolled).length, appsLast.filter(isEnrolled).length),
      pendingApplications: pctChange(appsThis.filter(isPending).length, appsLast.filter(isPending).length),
    };

    // Rolling 30-day deltas (last 30 days vs the prior 30 days).
    const DAY_MS = 24 * 60 * 60 * 1000;
    const window30Start = new Date(now.getTime() - 30 * DAY_MS);
    const window60Start = new Date(now.getTime() - 60 * DAY_MS);
    const inCurrentWindow = (d: Date | null): boolean => d != null && d >= window30Start;
    const inPriorWindow = (d: Date | null): boolean =>
      d != null && d >= window60Start && d < window30Start;
    const deltaPct = (current: number, prior: number): number =>
      prior === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - prior) / prior) * 100);
    const appsCurrentWindow = apps.filter((a) => inCurrentWindow(a.created_at));
    const appsPriorWindow = apps.filter((a) => inPriorWindow(a.created_at));
    const applicationsDeltaPct = deltaPct(appsCurrentWindow.length, appsPriorWindow.length);
    const enrollmentsDeltaPct = deltaPct(
      appsCurrentWindow.filter(isEnrolled).length,
      appsPriorWindow.filter(isEnrolled).length,
    );
    const pendingDeltaPct = deltaPct(
      appsCurrentWindow.filter(isPending).length,
      appsPriorWindow.filter(isPending).length,
    );

    // Application funnel — counts per pipeline stage (Lead → Rejected) + conversion.
    const FUNNEL_STAGES: { key: string; label: string }[] = [
      { key: 'lead', label: 'Lead' },
      { key: 'payment_pending', label: 'Payment Pending' },
      { key: 'paid', label: 'Paid' },
      { key: 'form_pending', label: 'Form Pending' },
      { key: 'form_submitted', label: 'Form Submitted' },
      { key: 'approval_waiting', label: 'Approval Waiting' },
      { key: 'rejected', label: 'Rejected' },
    ];
    const funnel = FUNNEL_STAGES.map((s) => ({
      key: s.key,
      label: s.label,
      count: apps.filter((a) => a.stage === s.key).length,
    }));
    const overallConversionPct =
      totalApplications > 0 ? Math.round((totalEnrollments / totalApplications) * 1000) / 10 : 0;

    return {
      kpis: {
        totalApplications,
        totalEnrollments,
        pendingApplications,
        totalDropouts: dropoutCount,
        monthlyTargetPoint,
        targetAchieved,
        achievementPct,
        ytd,
        applicationsDeltaPct,
        enrollmentsDeltaPct,
        pendingDeltaPct,
      },
      deltas,
      funnel,
      overallConversionPct,
      admissionsTrend: {
        labels: trendBuckets.map((b) => b.label),
        applications: trendBuckets.map((b) => b.applications),
        enrollments: trendBuckets.map((b) => b.enrollments),
      },
      coursePerformance,
      pipelineSnapshot: {
        paymentPending: byStage('payment_pending'),
        formPending: byStage('form_pending'),
        approvalWaiting: byStage('approval_waiting'),
      },
      recentActivity,
    };
  }

  /**
   * Associate payments — same shape as getCounsellorPayments ({ summary, rows }),
   * scoped to the associate's own applications.
   */
  async getAssociatePayments(actorUserId: string): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    const ownershipOr = this.associateOwnershipOr(actorUserId, centreId);
    const apps = await this.prisma.applications.findMany({
      where: { deleted_at: null, OR: ownershipOr },
      select: {
        id: true,
        application_id: true,
        name: true,
        course_id: true,
        application_final_fee: true,
        payment_status: true,
        payment_link_url: true,
        payment_marked_paid_at: true,
        stage: true,
        created_at: true,
      },
      orderBy: { id: 'desc' },
    });

    const courseIds = [...new Set(apps.map((a) => a.course_id).filter((x): x is number => x != null))];
    const courses =
      courseIds.length > 0
        ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
        : [];
    const courseMap = new Map<number, string>(courses.map((c) => [c.id, c.title ?? `Course #${c.id}`]));

    const PAID_STAGES = new Set(['paid', 'form_pending', 'form_submitted', 'approval_waiting', 'enrolled']);
    const isPaid = (a: {
      stage: string | null;
      payment_status: string | null;
      payment_marked_paid_at: Date | null;
    }): boolean =>
      a.payment_marked_paid_at != null ||
      (a.payment_status ?? '').toLowerCase() === 'paid' ||
      (a.stage != null && PAID_STAGES.has(a.stage));

    let collectedAmount = 0;
    let pendingAmount = 0;
    let paidCount = 0;
    let pendingCount = 0;

    const rows = apps.map((a) => {
      const fee = Number(a.application_final_fee ?? 0) || 0;
      const paid = isPaid(a);
      const hasLink = (a.payment_link_url ?? '') !== '';
      const state = paid ? 'paid' : hasLink || a.stage === 'payment_pending' ? 'pending' : 'no_link';
      if (paid) {
        collectedAmount += fee;
        paidCount += 1;
      } else if (state === 'pending') {
        pendingAmount += fee;
        pendingCount += 1;
      }
      return {
        id: a.id,
        applicationId: a.application_id ?? `#${a.id}`,
        name: a.name ?? '—',
        course: a.course_id != null ? courseMap.get(a.course_id) ?? `Course #${a.course_id}` : '—',
        fee,
        state,
        paymentLink: a.payment_link_url ?? '',
        paidAt: a.payment_marked_paid_at ? a.payment_marked_paid_at.toISOString() : null,
        createdAt: a.created_at ? a.created_at.toISOString() : null,
      };
    });

    return {
      summary: { collectedAmount, pendingAmount, paidCount, pendingCount, total: apps.length },
      rows,
    };
  }

  /**
   * Associate leaderboard — same shape as getCounsellorLeaderboard
   * ({ leaderboard: rows }). Associates don't compete on a shared board, so this
   * returns a single self-row computed from the associate's own applications
   * (empty ranking otherwise). Keys match the counsellor row exactly.
   */
  async getAssociateLeaderboard(actorUserId: string): Promise<Record<string, unknown>> {
    const centreId = await this.resolveActorCentreId(actorUserId);
    const ownershipOr = this.associateOwnershipOr(actorUserId, centreId);
    const [self, apps] = await Promise.all([
      this.prisma.users.findFirst({
        where: { id: toIntId(actorUserId), deleted_at: null },
        select: { id: true, name: true },
      }),
      this.prisma.applications.findMany({
        where: { deleted_at: null, OR: ownershipOr },
        select: { is_converted: true, stage: true },
      }),
    ]);
    if (!self) return { leaderboard: [] };

    const admissions = apps.length;
    const enrollments = apps.filter((a) => a.stage === 'enrolled' || a.is_converted === 1).length;

    const initialsOf = (name: string | null): string => {
      const t = (name ?? '').trim();
      if (t === '') return 'AS';
      return (
        t
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0] ?? '')
          .join('')
          .toUpperCase() || 'AS'
      );
    };
    const tierFor = (pct: number): string =>
      pct >= 100 ? 'Diamond' : pct >= 80 ? 'Platinum' : pct >= 60 ? 'Gold' : pct >= 40 ? 'Silver' : 'Bronze';

    return {
      leaderboard: [
        {
          id: self.id,
          name: self.name ?? '—',
          initials: initialsOf(self.name),
          points: enrollments,
          admissions,
          enrollments,
          achievementPct: 0,
          tier: tierFor(0),
          isCurrentUser: true,
          rank: 1,
        },
      ],
    };
  }

  /**
   * Associate targets — associates carry no targets, so this returns an empty
   * list with the same array typing as listCounsellorTargets. Distinct name
   * from the admin-facing listAssociateTargets() (which lists ALL associates_target
   * rows for the admin table).
   */
  listAssociateCrmTargets(_actorUserId: string): Promise<SqlRow[]> {
    return Promise.resolve([] as unknown as SqlRow[]);
  }

  /**
   * Refer-a-friend rows for this associate — reuses listReferrals scoped to the
   * associate's own user id (same output shape).
   */
  async listAssociateReferrals(actorUserId: string): Promise<SqlRow[]> {
    return this.listReferrals(toIntId(actorUserId));
  }

  /**
   * Application detail for the associate View page — same payload as
   * getApplication, but ONLY when the application is owned by the associate
   * (created_by / added_under_centre match). Never uses the role-9 scope.
   */
  async getAssociateApplication(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    if (!id) return { status: 0, message: 'Application ID is required.' };
    const centreId = await this.resolveActorCentreId(actorUserId);
    const ownershipOr = this.associateOwnershipOr(actorUserId, centreId);
    const owned = await this.prisma.applications.findFirst({
      where: { id: toIntId(id), deleted_at: null, OR: ownershipOr },
      select: { id: true },
    });
    if (!owned) return { status: 0, message: 'Application not found.' };
    // Ownership already verified above; getApplication's own scope is a no-op
    // for role 10 (applicationOwnerScope only narrows role 9), so it hydrates
    // the same rich detail the counsellor View page consumes.
    return this.getApplication(actorUserId, id);
  }

  /**
   * Associate-scoped status update — mirrors updateApplicationStatus but gated
   * by the associate ownership OR-clause instead of the role-9 scope, so an
   * associate can only transition applications they own. Does NOT widen the
   * admin path or touch applicationOwnerScope.
   */
  async updateAssociateApplicationStatus(
    actorUserId: string,
    id: string,
    status: string,
    rejectReason?: string,
  ): Promise<Record<string, unknown>> {
    if (!id) return { status: 0, message: 'Application ID is required.' };
    if (!status) return { status: 0, message: 'Status is required.' };
    const now = new Date();
    const centreId = await this.resolveActorCentreId(actorUserId);
    const ownershipOr = this.associateOwnershipOr(actorUserId, centreId);
    // Same fixes as updateApplicationStatus (UAT 2026-07-27): correct column
    // name, a validated/normalised status so 'approved' no longer 500s, and
    // `stage` written alongside `status` so a rejection is not left halfway.
    const normalised = normaliseApplicationStatus(status);
    if (!normalised) {
      return { status: 0, message: `Unsupported status "${status}". Expected pending, approved/converted or rejected.` };
    }
    const data: Prisma.applicationsUpdateManyMutationInput = {
      status: normalised,
      updated_by: toIntId(actorUserId),
      updated_at: now,
    };
    if (normalised === 'rejected') {
      data.stage = 'rejected';
      data.rejected_at = now;
      data.rejected_by = toIntId(actorUserId);
      if (rejectReason) data.rejection_reason = rejectReason;
    }
    const result = await this.prisma.applications.updateMany({
      where: { id: toIntId(id), deleted_at: null, OR: ownershipOr },
      data,
    });
    if (result.count === 0) return { status: 0, message: 'Application not found.' };
    return { status: 1, message: `Application ${status} successfully.` };
  }

  /**
   * Catalog-safe centres list for the associate portal reference dropdowns.
   * Selects ONLY the non-sensitive display fields — never the centre password
   * hash, wallet_balance, contact PII (phone/whatsapp/email/address), or the
   * registration/affiliation document paths that the admin-facing listCentres()
   * returns. (Security review 2026-07-09.)
   */
  async listCentresCatalog(): Promise<SqlRow[]> {
    const centres = await this.prisma.centres.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true, centre_id: true, centre_name: true },
    });
    return centres as unknown as SqlRow[];
  }

  /**
   * Redacted duplicate-student check for the associate Add-Lead flow. Reuses the
   * shared findDuplicateStudent() to decide EXISTENCE, but returns ONLY a masked
   * name + the match channel — never the raw email / phone / student_id / user id
   * of a match. Prevents cross-tenant PII enumeration while keeping the "already
   * exists" warning renderable. Shape-identical to findDuplicateStudent so the
   * existing frontend/bridge parser is unchanged. (Security review 2026-07-09.)
   */
  async findDuplicateStudentRedacted(input: { email?: string; phone?: string }): Promise<{
    matches: Array<{
      id: number;
      name: string | null;
      student_id: string | null;
      user_email: string | null;
      phone: string | null;
      match_via: 'email' | 'phone' | 'both';
    }>;
  }> {
    const raw = await this.findDuplicateStudent(input);
    const maskName = (name: string | null): string => {
      const trimmed = (name ?? '').trim();
      if (!trimmed) return 'Existing student';
      return trimmed
        .split(/\s+/)
        .map((w) => (w.length <= 1 ? w : `${w[0] ?? ''}${'*'.repeat(Math.min(4, w.length - 1))}`))
        .join(' ');
    };
    return {
      matches: raw.matches.map((m) => ({
        id: 0,
        name: maskName(m.name),
        student_id: null,
        user_email: null,
        phone: null,
        match_via: m.match_via,
      })),
    };
  }

  async listAssociates(): Promise<SqlRow[]> {
    const associates = await this.prisma.users.findMany({
      where: { role_id: 10, deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true, name: true, user_email: true, phone: true, status: true, centre_id: true, image: true, profile_picture: true, created_at: true, disabled_at: true },
    });

    const associateIds = associates.map(a => a.id);
    if (associateIds.length === 0) return [] as unknown as SqlRow[];

    const centreIdInts = [...new Set(associates.map(a => toNullableIntId(a.centre_id)).filter((x): x is number => x !== null))];

    const [centres, referredCounts, convertedCounts] = await Promise.all([
      centreIdInts.length > 0 ? this.prisma.centres.findMany({ where: { id: { in: centreIdInts } }, select: { id: true, centre_name: true } }) : [],
      this.prisma.applications.groupBy({
        by: ['pipeline_user'],
        where: { pipeline_user: { in: associateIds }, deleted_at: null },
        _count: { id: true },
      }),
      this.prisma.applications.groupBy({
        by: ['pipeline_user'],
        where: { pipeline_user: { in: associateIds }, is_converted: 1, deleted_at: null },
        _count: { id: true },
      }),
    ]);

    const centreMap = new Map(centres.map(c => [c.id, c.centre_name]));
    const referredMap = new Map(referredCounts.map((r) => [r.pipeline_user, r._count?.id ?? 0]));
    const convertedMap = new Map(convertedCounts.map((r) => [r.pipeline_user, r._count?.id ?? 0]));

    return associates.map(u => {
      const centreIdNum = toNullableIntId(u.centre_id);
      return {
        ...u,
        centre_name: centreIdNum !== null ? centreMap.get(centreIdNum) ?? null : null,
        applications_referred: referredMap.get(u.id) ?? 0,
        applications_converted: convertedMap.get(u.id) ?? 0,
      };
    }) as unknown as SqlRow[];
  }

  async listAssociateTargets(): Promise<SqlRow[]> {
    const targets = await this.prisma.associates_target.findMany({
      where: { deleted_at: null },
      orderBy: [{ from_date: 'desc' }, { associate_target_id: 'desc' }],
    });

    const userIds = [...new Set(targets.map(t => t.associate_id))];
    const users = userIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, user_email: true } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return targets.map(t => ({
      ...t,
      associate_name: userMap.get(t.associate_id)?.name ?? null,
      associate_email: userMap.get(t.associate_id)?.user_email ?? null,
    })) as unknown as SqlRow[];
  }

  // TODO: document_request model does not exist in MySQL schema — feature stubbed.
  listDocumentRequests(): Promise<SqlRow[]> {
    return Promise.resolve([]);
  }

  listDocumentsIssued(): Promise<SqlRow[]> {
    return Promise.resolve([]);
  }

  listDocumentsDelivery(): Promise<SqlRow[]> {
    return Promise.resolve([]);
  }

  async listAdminEvents(): Promise<SqlRow[]> {
    const events = await this.prisma.events.findMany({
      where: { deleted_at: null },
      orderBy: [{ event_date: 'desc' }, { id: 'desc' }],
    });

    const instructorIds = [...new Set(events.map(e => e.instructor_id).filter((x): x is number => x !== null && x !== undefined))];
    const eventIds = events.map(e => e.id);

    const [instructors, regCounts] = await Promise.all([
      instructorIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: instructorIds } }, select: { id: true, name: true } }) : [],
      eventIds.length > 0 ? this.prisma.event_registration.groupBy({
        by: ['event_id'],
        where: { event_id: { in: eventIds }, deleted_at: null },
        _count: { id: true },
      }) : [],
    ]);

    const instructorMap = new Map(instructors.map(u => [u.id, u.name]));
    const regCountMap = new Map(regCounts.map((r) => [r.event_id, r._count?.id ?? 0]));

    return events.map(e => ({
      ...e,
      instructor_name: e.instructor_id ? instructorMap.get(e.instructor_id) ?? null : null,
      registration_count: regCountMap.get(e.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  // events.event_date is @db.Date and from_time/to_time are @db.Time(0). Prisma
  // needs Date objects for both. Mirror the parseTime approach in addLiveClasses:
  // wrap times in the 1970 epoch so MariaDB stores just the time component, and
  // build a UTC midnight for the date. Returns null for blank/invalid inputs so
  // the column stays NULL rather than throwing.
  private parseEventDate(value?: string): Date | null {
    const v = (value ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}/.test(v)) return null;
    const d = new Date(`${v.slice(0, 10)}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  private parseEventTime(value?: string): Date | null {
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec((value ?? '').trim());
    if (!m) return null;
    // Pad a single-digit hour ("9:00" → "09:00:00") so the ISO string parses;
    // an HTML <input type="time"> pads already, but other callers may not.
    const [, hh = '', mm = '', ss = '00'] = m;
    const d = new Date(`1970-01-01T${hh.padStart(2, '0')}:${mm}:${ss}Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  async addEvent(actorUserId: string, input: EventInput): Promise<Record<string, unknown>> {
    if (!(input.title ?? '').trim()) {
      return { status: 0, message: 'Title is required.' };
    }

    const now = new Date();
    await this.prisma.events.create({
      data: {
        title: input.title ?? '',
        image: input.image ?? '',
        description: input.description ?? '',
        instructor_id: toNullableIntId(input.instructorId),
        event_date: this.parseEventDate(input.eventDate),
        from_time: this.parseEventTime(input.fromTime),
        to_time: this.parseEventTime(input.toTime),
        duration: input.duration ?? '',
        is_recording_available: input.isRecordingAvailable ? 1 : 0,
        num_objectives: input.numObjectives ?? 0,
        created_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Event Added Successfully!' };
  }

  async editEvent(actorUserId: string, eventId: string, input: EventInput): Promise<Record<string, unknown>> {
    const idInt = toIntId(eventId);
    if (!idInt) {
      return { status: 0, message: 'Invalid event ID.' };
    }
    if (!(input.title ?? '').trim()) {
      return { status: 0, message: 'Title is required.' };
    }

    const now = new Date();
    const result = await this.prisma.events.updateMany({
      where: { id: idInt, deleted_at: null },
      data: {
        title: input.title ?? '',
        image: input.image ?? '',
        description: input.description ?? '',
        instructor_id: toNullableIntId(input.instructorId),
        event_date: this.parseEventDate(input.eventDate),
        from_time: this.parseEventTime(input.fromTime),
        to_time: this.parseEventTime(input.toTime),
        duration: input.duration ?? '',
        is_recording_available: input.isRecordingAvailable ? 1 : 0,
        num_objectives: input.numObjectives ?? 0,
        updated_by: toNullableIntId(actorUserId),
        updated_at: now,
      },
    });
    if (result.count === 0) {
      return { status: 0, message: 'Event not found.' };
    }

    return { status: 1, message: 'Event Updated Successfully!' };
  }

  async deleteEvent(actorUserId: string, eventId: string): Promise<Record<string, unknown>> {
    const idInt = toIntId(eventId);
    if (!idInt) {
      return { status: 0, message: 'Invalid event ID.' };
    }

    const now = new Date();
    await this.prisma.events.updateMany({
      where: { id: idInt, deleted_at: null },
      data: { deleted_by: toNullableIntId(actorUserId), deleted_at: now },
    });

    return { status: 1, message: 'Event Deleted Successfully!' };
  }

  // Circulars (notices) — sibling of events. Surface instructor_name for the
  // admin table the same way listAdminEvents does.
  async listCirculars(): Promise<SqlRow[]> {
    const circulars = await this.prisma.circular.findMany({
      where: { deleted_at: null },
      orderBy: [{ event_date: 'desc' }, { id: 'desc' }],
    });
    const instructorIds = [...new Set(circulars.map(c => c.instructor_id).filter((x): x is number => x !== null && x !== undefined))];
    const instructors = instructorIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: instructorIds } }, select: { id: true, name: true } })
      : [];
    const instructorMap = new Map(instructors.map(u => [u.id, u.name]));
    return circulars.map(c => ({
      ...c,
      instructor_name: c.instructor_id ? instructorMap.get(c.instructor_id) ?? null : null,
    })) as unknown as SqlRow[];
  }

  async addCircular(actorUserId: string, input: EventInput): Promise<Record<string, unknown>> {
    if (!(input.title ?? '').trim()) {
      return { status: 0, message: 'Title is required.' };
    }
    const now = new Date();
    await this.prisma.circular.create({
      data: {
        title: input.title ?? '',
        image: input.image ?? '',
        description: input.description ?? '',
        instructor_id: toNullableIntId(input.instructorId),
        event_date: this.parseEventDate(input.eventDate),
        from_time: this.parseEventTime(input.fromTime),
        to_time: this.parseEventTime(input.toTime),
        duration: input.duration ?? '',
        created_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, message: 'Circular Added Successfully!' };
  }

  async editCircular(actorUserId: string, circularId: string, input: EventInput): Promise<Record<string, unknown>> {
    const idInt = toIntId(circularId);
    if (!idInt) {
      return { status: 0, message: 'Invalid circular ID.' };
    }
    if (!(input.title ?? '').trim()) {
      return { status: 0, message: 'Title is required.' };
    }
    const now = new Date();
    const result = await this.prisma.circular.updateMany({
      where: { id: idInt, deleted_at: null },
      data: {
        title: input.title ?? '',
        image: input.image ?? '',
        description: input.description ?? '',
        instructor_id: toNullableIntId(input.instructorId),
        event_date: this.parseEventDate(input.eventDate),
        from_time: this.parseEventTime(input.fromTime),
        to_time: this.parseEventTime(input.toTime),
        duration: input.duration ?? '',
        updated_by: toNullableIntId(actorUserId),
        updated_at: now,
      },
    });
    if (result.count === 0) {
      return { status: 0, message: 'Circular not found.' };
    }
    return { status: 1, message: 'Circular Updated Successfully!' };
  }

  async deleteCircular(actorUserId: string, circularId: string): Promise<Record<string, unknown>> {
    const idInt = toIntId(circularId);
    if (!idInt) {
      return { status: 0, message: 'Invalid circular ID.' };
    }
    const now = new Date();
    const result = await this.prisma.circular.updateMany({
      where: { id: idInt, deleted_at: null },
      data: { deleted_by: toNullableIntId(actorUserId), deleted_at: now },
    });
    if (result.count === 0) {
      return { status: 0, message: 'Circular not found.' };
    }
    return { status: 1, message: 'Circular Deleted Successfully!' };
  }

  // TODO: mentorship_session model does not exist in MySQL schema — feature stubbed.
  listMentorshipHistory(): Promise<SqlRow[]> {
    return Promise.resolve([]);
  }

  mentorshipAnalysis(): Promise<Record<string, unknown>> {
    return Promise.resolve({
      totalSessions: 0,
      aiSessions: 0,
      humanSessions: 0,
      avgDuration: 0,
      avgRating: 0,
      topicBreakdown: [] as Array<{ topic: string; session_count: number; avg_duration: number; avg_rating: number }>,
    });
  }

  // ── Phase 5: Integrations & Polish ──────────────────────────────

  async listAdminSupportChats(): Promise<SqlRow[]> {
    const groups = await this.prisma.support_chat.groupBy({
      by: ['chat_id'],
      where: { deleted_at: null },
      _count: { id: true },
      _max: { created_at: true },
      _min: { created_at: true },
      orderBy: { _max: { created_at: 'desc' } },
    });

    const chatIds = groups.map((g) => g.chat_id).filter((x): x is number => x !== null && x !== undefined);
    const users = chatIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: chatIds } }, select: { id: true, name: true, user_email: true } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return groups.map((g) => ({
      chat_id: g.chat_id,
      user_name: g.chat_id ? (userMap.get(g.chat_id)?.name ?? null) : null,
      user_email: g.chat_id ? (userMap.get(g.chat_id)?.user_email ?? null) : null,
      message_count: g._count?.id ?? 0,
      last_message_at: g._max?.created_at ?? null,
      first_message_at: g._min?.created_at ?? null,
    })) as unknown as SqlRow[];
  }

  async listAdminTrainingVideos(): Promise<SqlRow[]> {
    const videos = await this.prisma.training_videos.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
      select: { id: true, title: true, description: true, category: true, video_type: true, video_url: true, thumbnail: true, created_at: true },
    });
    return videos as unknown as SqlRow[];
  }

  async listAdminEnrollments(): Promise<SqlRow[]> {
    const enrollments = await this.prisma.enrol.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });

    const userIds = [...new Set(enrollments.map(e => e.user_id).filter((x): x is number => x !== null && x !== undefined))];
    const courseIds = [...new Set(enrollments.map(e => e.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const batchIds = [...new Set(enrollments.map(e => e.batch_id).filter((x): x is number => x !== null && x !== undefined))];

    const [users, courses, batches] = await Promise.all([
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, user_email: true, application_id: true } }) : [],
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true, total_amount: true } }) : [],
      batchIds.length > 0 ? this.prisma.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, title: true } }) : [],
    ]);
    const userMap = new Map(users.map(u => [u.id, u]));
    const courseMap = new Map(courses.map(c => [c.id, c]));
    const batchMap = new Map(batches.map(b => [b.id, b.title]));

    // Enrich offering / combination / fee from the linked application row,
    // and progress from video_progress_status. Without this the columns
    // render as "-" / 0% (Naji UAT 2026-05-12).
    const applicationIds = [...new Set(users.map(u => u.application_id).filter((x): x is number => !!x && x > 0))];
    const applications = applicationIds.length > 0
      ? await this.prisma.applications.findMany({
          where: { id: { in: applicationIds } },
          select: {
            id: true,
            course_id: true,
            offering_id: true,
            certificate_combination_id: true,
            application_final_fee: true,
            payment_plan: true,
          },
        })
      : [];
    const appMap = new Map(applications.map(a => [a.id, a]));

    const offeringIds = [...new Set(applications.map(a => a.offering_id).filter((x): x is number => !!x && x > 0))];
    const combinationIds = [...new Set(applications.map(a => a.certificate_combination_id).filter((x): x is number => !!x && x > 0))];
    const [offerings, combinations, packages] = await Promise.all([
      offeringIds.length > 0
        ? this.prisma.offerings.findMany({
            where: { id: { in: offeringIds } },
            select: { id: true, title: true, offering_code: true, pricing_amount: true },
          })
        : Promise.resolve([]),
      combinationIds.length > 0
        ? this.prisma.certificate_combinations.findMany({
            where: { id: { in: combinationIds } },
            select: { id: true, combination_code: true },
          })
        : Promise.resolve([]),
      offeringIds.length > 0 && combinationIds.length > 0
        ? this.prisma.offering_certificate_packages.findMany({
            where: { offering_id: { in: offeringIds }, combination_id: { in: combinationIds }, deleted_at: null },
            select: { offering_id: true, combination_id: true, offered_fee: true, base_fee: true },
          })
        : Promise.resolve([]),
    ]);
    const offeringMap = new Map(offerings.map(o => [o.id, o]));
    const combinationMap = new Map(combinations.map(c => [c.id, c.combination_code]));
    const packageMap = new Map(packages.map(p => [`${p.offering_id}:${p.combination_id}`, p]));

    // Progress %: count completed lesson_files (status=1) over total for the
    // student's course. Keeps the loader to one groupBy call.
    const progressRows = userIds.length > 0 && courseIds.length > 0
      ? await this.prisma.video_progress_status.groupBy({
          by: ['user_id', 'course_id', 'status'],
          where: { user_id: { in: userIds }, course_id: { in: courseIds }, deleted_at: null },
          _count: { id: true },
        })
      : [];
    const courseLessonCounts = new Map<number, number>();
    if (courseIds.length > 0) {
      const lessonRows = await this.prisma.lesson.findMany({
        where: { course_id: { in: courseIds }, deleted_at: null },
        select: { id: true, course_id: true },
      });
      const lessonIdsByCourse = new Map<number, number[]>();
      for (const l of lessonRows) {
        if (l.course_id == null) continue;
        if (!lessonIdsByCourse.has(l.course_id)) lessonIdsByCourse.set(l.course_id, []);
        lessonIdsByCourse.get(l.course_id)?.push(l.id);
      }
      const allLessonIds = lessonRows.map(l => l.id);
      const filesPerLesson = allLessonIds.length > 0
        ? await this.prisma.lesson_files.groupBy({
            by: ['lesson_id'],
            where: { lesson_id: { in: allLessonIds }, deleted_at: null },
            _count: { id: true },
          })
        : [];
      const filesByLesson = new Map(filesPerLesson.map(f => [f.lesson_id, f._count?.id ?? 0]));
      for (const [courseId, lessonIds] of lessonIdsByCourse) {
        let total = 0;
        for (const lid of lessonIds) total += filesByLesson.get(lid) ?? 0;
        courseLessonCounts.set(courseId, total);
      }
    }

    const completedByUserCourse = new Map<string, number>();
    for (const row of progressRows) {
      if (row.user_id == null || row.course_id == null) continue;
      if (row.status !== 1) continue;
      const key = `${row.user_id}:${row.course_id}`;
      completedByUserCourse.set(key, (completedByUserCourse.get(key) ?? 0) + (row._count?.id ?? 0));
    }

    return enrollments.map(e => {
      const user = e.user_id ? userMap.get(e.user_id) : undefined;
      const application = user?.application_id ? appMap.get(user.application_id) : undefined;
      const offering = application?.offering_id ? offeringMap.get(application.offering_id) : undefined;
      const combinationCode = application?.certificate_combination_id
        ? combinationMap.get(application.certificate_combination_id) ?? null
        : null;
      const pkg = application?.offering_id && application?.certificate_combination_id
        ? packageMap.get(`${application.offering_id}:${application.certificate_combination_id}`)
        : undefined;
      const course = e.course_id ? courseMap.get(e.course_id) : undefined;
      const fee = pkg?.offered_fee != null
        ? Number(pkg.offered_fee)
        : application?.application_final_fee != null
          ? Number(application.application_final_fee)
          : offering?.pricing_amount != null
            ? Number(offering.pricing_amount)
            : course?.total_amount != null ? Number(course.total_amount) : 0;
      const totalFiles = e.course_id ? courseLessonCounts.get(e.course_id) ?? 0 : 0;
      const completedFiles = e.user_id && e.course_id
        ? completedByUserCourse.get(`${e.user_id}:${e.course_id}`) ?? 0
        : 0;
      const progressPercent = totalFiles > 0
        ? Math.min(100, Math.round((completedFiles / totalFiles) * 100))
        : 0;
      return {
        ...e,
        student_id: e.user_id ?? null,
        student_name: user?.name ?? null,
        student_email: user?.user_email ?? null,
        course_title: course?.title ?? null,
        batch_title: e.batch_id ? (batchMap.get(e.batch_id) ?? null) : null,
        course_offering: offering?.title ?? offering?.offering_code ?? null,
        combination_title: combinationCode,
        course_fee: Number.isFinite(fee) && fee > 0 ? Math.round(fee) : null,
        progress_percent: progressPercent,
      };
    }) as unknown as SqlRow[];
  }

  async listAdminFeeds(): Promise<SqlRow[]> {
    const feeds = await this.prisma.feed.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });

    const feedIds = feeds.map(f => f.id);
    const instructorIds = [...new Set(feeds.map(f => f.instructor_id).filter((x): x is number => x !== null && x !== undefined))];
    const courseIds = [...new Set(feeds.map(f => f.course_id).filter((x): x is number => x !== null && x !== undefined))];

    const [instructors, courses, watchCounts, likeCounts, commentCounts] = await Promise.all([
      instructorIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: instructorIds } }, select: { id: true, name: true } }) : [],
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      feedIds.length > 0 ? this.prisma.feed_watched.groupBy({
        by: ['feed_id'],
        where: { feed_id: { in: feedIds }, deleted_at: null },
        _count: { id: true },
      }) : [],
      feedIds.length > 0 ? this.prisma.feed_likes.groupBy({
        by: ['feed_id'],
        where: { feed_id: { in: feedIds }, deleted_at: null },
        _count: { id: true },
      }) : [],
      feedIds.length > 0 ? this.prisma.feed_comments.groupBy({
        by: ['feed_id'],
        where: { feed_id: { in: feedIds }, deleted_at: null },
        _count: { id: true },
      }) : [],
    ]);

    const instructorMap = new Map(instructors.map(u => [u.id, u.name]));
    const courseMap = new Map(courses.map(c => [c.id, c.title]));
    const watchMap = new Map(watchCounts.map((w) => [w.feed_id, w._count?.id ?? 0]));
    const likeMap = new Map(likeCounts.map((l) => [l.feed_id, l._count?.id ?? 0]));
    const commentMap = new Map(commentCounts.map((c) => [c.feed_id, c._count?.id ?? 0]));

    return feeds.map(f => ({
      ...f,
      // The Feeds page edits the body via row.description; the column is `content`.
      description: f.content ?? null,
      instructor_name: f.instructor_id ? instructorMap.get(f.instructor_id) ?? null : null,
      course_title: f.course_id ? courseMap.get(f.course_id) ?? null : null,
      watch_count: watchMap.get(f.id) ?? 0,
      like_count: likeMap.get(f.id) ?? 0,
      comment_count: commentMap.get(f.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  // The Feeds page sends `description` but the feed model stores the body in
  // `content` — map it here. course_id/instructor_id arrive as strings.
  async addFeed(actorUserId: string, input: FeedInput): Promise<Record<string, unknown>> {
    if (!(input.title ?? '').trim()) {
      return { status: 0, message: 'Title is required.' };
    }

    const now = new Date();
    await this.prisma.feed.create({
      data: {
        title: input.title ?? '',
        content: input.description ?? '',
        image: input.image ?? '',
        course_id: toNullableIntId(input.courseId),
        instructor_id: toNullableIntId(input.instructorId),
        created_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Feed Added Successfully!' };
  }

  async editFeed(actorUserId: string, feedId: string, input: FeedInput): Promise<Record<string, unknown>> {
    const idInt = toIntId(feedId);
    if (!idInt) {
      return { status: 0, message: 'Invalid feed ID.' };
    }
    if (!(input.title ?? '').trim()) {
      return { status: 0, message: 'Title is required.' };
    }

    const now = new Date();
    const result = await this.prisma.feed.updateMany({
      where: { id: idInt, deleted_at: null },
      data: {
        title: input.title ?? '',
        content: input.description ?? '',
        image: input.image ?? '',
        course_id: toNullableIntId(input.courseId),
        instructor_id: toNullableIntId(input.instructorId),
        updated_by: toNullableIntId(actorUserId),
        updated_at: now,
      },
    });
    if (result.count === 0) {
      return { status: 0, message: 'Feed not found.' };
    }

    return { status: 1, message: 'Feed Updated Successfully!' };
  }

  async deleteFeed(actorUserId: string, feedId: string): Promise<Record<string, unknown>> {
    const idInt = toIntId(feedId);
    if (!idInt) {
      return { status: 0, message: 'Invalid feed ID.' };
    }

    const now = new Date();
    await this.prisma.feed.updateMany({
      where: { id: idInt, deleted_at: null },
      data: { deleted_by: toNullableIntId(actorUserId), deleted_at: now },
    });

    return { status: 1, message: 'Feed Deleted Successfully!' };
  }

  async listIntegrationSettings(): Promise<SqlRow[]> {
    const keywords = ['api', 'provider', 'gateway', 'secret', 'smtp', 'firebase', 'zoom', 'razorpay', 'whatsapp', 'sms', 'email', 'payment'];
    const settings = await this.prisma.settings.findMany({
      where: {
        deleted_at: null,
        OR: keywords.map(kw => ({ key: { contains: kw } })),
      },
      orderBy: { key: 'asc' },
      select: { key: true, value: true },
    });
    return settings as unknown as SqlRow[];
  }

  async listAdminReviews(): Promise<SqlRow[]> {
    const reviews = await this.prisma.review.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'desc' },
    });

    const reviewIds = reviews.map(r => r.id);
    const userIds = [...new Set(reviews.map(r => r.user_id).filter((x): x is number => x !== null && x !== undefined))];
    const courseIds = [...new Set(reviews.map(r => r.course_id).filter((x): x is number => x !== null && x !== undefined))];

    const [users, courses, likeCounts] = await Promise.all([
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, user_email: true } }) : [],
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      reviewIds.length > 0 ? this.prisma.review_like.groupBy({
        by: ['review_id'],
        where: { review_id: { in: reviewIds }, deleted_at: null },
        _count: { id: true },
      }) : [],
    ]);

    const userMap = new Map(users.map(u => [u.id, u]));
    const courseMap = new Map(courses.map(c => [c.id, c.title]));
    const likeMap = new Map(likeCounts.map((l) => [l.review_id, l._count?.id ?? 0]));

    return reviews.map(r => ({
      ...r,
      user_name: r.user_id ? userMap.get(r.user_id)?.name ?? null : null,
      user_email: r.user_id ? userMap.get(r.user_id)?.user_email ?? null : null,
      course_title: r.course_id ? courseMap.get(r.course_id) ?? null : null,
      like_count: likeMap.get(r.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  // rating arrives as a string from the form; coerce to Float (null when blank).
  async addReview(actorUserId: string, input: ReviewInput): Promise<Record<string, unknown>> {
    const now = new Date();
    const ratingStr = (input.rating ?? '').trim();
    await this.prisma.review.create({
      data: {
        course_id: toNullableIntId(input.courseId),
        user_id: toNullableIntId(input.userId),
        rating: ratingStr ? Number(ratingStr) : null,
        review: input.review ?? '',
        created_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Review Added Successfully!' };
  }

  async editReview(actorUserId: string, reviewId: string, input: ReviewInput): Promise<Record<string, unknown>> {
    const idInt = toIntId(reviewId);
    if (!idInt) {
      return { status: 0, message: 'Invalid review ID.' };
    }

    const now = new Date();
    const ratingStr = (input.rating ?? '').trim();
    const result = await this.prisma.review.updateMany({
      where: { id: idInt, deleted_at: null },
      data: {
        course_id: toNullableIntId(input.courseId),
        user_id: toNullableIntId(input.userId),
        rating: ratingStr ? Number(ratingStr) : null,
        review: input.review ?? '',
        updated_by: toNullableIntId(actorUserId),
        updated_at: now,
      },
    });
    if (result.count === 0) {
      return { status: 0, message: 'Review not found.' };
    }

    return { status: 1, message: 'Review Updated Successfully!' };
  }

  async deleteReview(actorUserId: string, reviewId: string): Promise<Record<string, unknown>> {
    const idInt = toIntId(reviewId);
    if (!idInt) {
      return { status: 0, message: 'Invalid review ID.' };
    }

    const now = new Date();
    await this.prisma.review.updateMany({
      where: { id: idInt, deleted_at: null },
      data: { deleted_by: toNullableIntId(actorUserId), deleted_at: now },
    });

    return { status: 1, message: 'Review Deleted Successfully!' };
  }

  async listLanguages(): Promise<SqlRow[]> {
    const languages = await this.prisma.languages.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'asc' },
      select: { id: true, title: true, created_at: true },
    });
    return languages as unknown as SqlRow[];
  }

  // Writes to the `languages` master table (NOT the `language` translation table).
  async addLanguage(actorUserId: string, input: LanguageInput): Promise<Record<string, unknown>> {
    if (!input.title.trim()) {
      return { status: 0, message: 'Title is required.' };
    }

    const now = new Date();
    await this.prisma.languages.create({
      data: { title: input.title, created_by: toNullableIntId(actorUserId), created_at: now, updated_at: now },
    });

    return { status: 1, message: 'Language Added Successfully!' };
  }

  async editLanguage(actorUserId: string, languageId: string, input: LanguageInput): Promise<Record<string, unknown>> {
    const idInt = toIntId(languageId);
    if (!idInt) {
      return { status: 0, message: 'Invalid language ID.' };
    }
    if (!input.title.trim()) {
      return { status: 0, message: 'Title is required.' };
    }

    const now = new Date();
    const result = await this.prisma.languages.updateMany({
      where: { id: idInt, deleted_at: null },
      data: { title: input.title, updated_by: toNullableIntId(actorUserId), updated_at: now },
    });
    if (result.count === 0) {
      return { status: 0, message: 'Language not found.' };
    }

    return { status: 1, message: 'Language Updated Successfully!' };
  }

  async deleteLanguage(actorUserId: string, languageId: string): Promise<Record<string, unknown>> {
    const idInt = toIntId(languageId);
    if (!idInt) {
      return { status: 0, message: 'Invalid language ID.' };
    }

    const now = new Date();
    await this.prisma.languages.updateMany({
      where: { id: idInt, deleted_at: null },
      data: { deleted_by: toNullableIntId(actorUserId), deleted_at: now },
    });

    return { status: 1, message: 'Language Deleted Successfully!' };
  }

  // ─── Bucket C: admin list endpoints (page-load lists) ─────────────────────

  // Books library — id column is `book_id`. chapters_count is computed by
  // grouping books_chapters; the page filters on status==='published' and sums
  // chapters_count. Surface a string `id` so the table key resolves.
  async listBooks(): Promise<SqlRow[]> {
    const books = await this.prisma.books.findMany({ where: { deleted_at: null }, orderBy: { book_id: 'desc' } });
    const bookIds = books.map(b => b.book_id);
    const chapterCounts = bookIds.length > 0
      ? await this.prisma.books_chapters.groupBy({
          by: ['book_id'],
          where: { book_id: { in: bookIds }, deleted_at: null },
          _count: { id: true },
        })
      : [];
    const countMap = new Map(chapterCounts.map(c => [c.book_id, c._count?.id ?? 0]));

    return books.map(b => ({
      ...b,
      id: String(b.book_id),
      chapters_count: countMap.get(b.book_id) ?? 0,
    })) as unknown as SqlRow[];
  }

  // Enquiries page renders three tabs: general enquiries, course enquiries
  // (enquiry_form), and contact submissions (contact_form). Map remarks→message
  // and first/last name→name to match the columns the page reads.
  async listEnquiries(): Promise<Record<string, unknown>> {
    const [enquiries, courseEnquiries, contactForms] = await Promise.all([
      this.prisma.enquiry.findMany({ where: { deleted_at: null }, orderBy: { id: 'desc' } }),
      this.prisma.enquiry_form.findMany({ where: { deleted_at: null }, orderBy: { id: 'desc' } }),
      this.prisma.contact_form.findMany({ where: { deleted_at: null }, orderBy: { id: 'desc' } }),
    ]);

    // contact_form has a course_id FK; resolve titles for the Course column.
    const contactCourseIds = [...new Set(contactForms.map(c => c.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const contactCourses = contactCourseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: contactCourseIds } }, select: { id: true, title: true } })
      : [];
    const contactCourseMap = new Map(contactCourses.map(c => [c.id, c.title]));

    return {
      enquiries: enquiries.map(e => ({
        ...e,
        message: e.remarks ?? null,
      })),
      course_enquiries: courseEnquiries.map(f => ({
        ...f,
        name: [f.first_name, f.last_name].filter(Boolean).join(' ').trim() || null,
        email: f.email_id ?? null,
        course_title: null,
      })),
      contact_forms: contactForms.map(c => ({
        ...c,
        message: c.remarks ?? null,
        course_title: c.course_id ? contactCourseMap.get(c.course_id) ?? null : null,
      })),
    };
  }

  // Packages — model is mapped to the `package` table (Renamedpackage). The page
  // reads title/type/course_title/amount/discount/duration/status/features_count.
  // The table has no status column; derive it from is_free (free → 'inactive')
  // is misleading, so report all rows as 'active'. features_count is grouped.
  async listPackages(): Promise<SqlRow[]> {
    const packages = await this.prisma.renamedpackage.findMany({ where: { deleted_at: null }, orderBy: { id: 'desc' } });
    const packageIds = packages.map(p => p.id);
    const courseIds = [...new Set(packages.map(p => p.course_id).filter((x): x is number => x !== null && x !== undefined))];

    const [courses, featureCounts] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      packageIds.length > 0 ? this.prisma.package_features.groupBy({
        by: ['package_id'],
        where: { package_id: { in: packageIds } },
        _count: { id: true },
      }) : [],
    ]);

    const courseMap = new Map(courses.map(c => [c.id, c.title]));
    const featureMap = new Map(featureCounts.map(f => [f.package_id, f._count?.id ?? 0]));

    return packages.map(p => ({
      ...p,
      course_title: p.course_id ? courseMap.get(p.course_id) ?? null : null,
      status: 'active',
      features_count: featureMap.get(p.id) ?? 0,
    })) as unknown as SqlRow[];
  }

  // Short content page renders two tabs from short_videos and stories. The page
  // also reads views/category/duration (videos) and views/author (stories),
  // none of which exist on these tables — the frontend coerces missing keys to 0.
  async listShortContent(): Promise<Record<string, unknown>> {
    const [shortVideos, stories] = await Promise.all([
      this.prisma.short_videos.findMany({ where: { deleted_at: null }, orderBy: { id: 'desc' } }),
      this.prisma.stories.findMany({ where: { deleted_at: null }, orderBy: { id: 'desc' } }),
    ]);
    return { short_videos: shortVideos, stories };
  }

  // Testimonials — the legacy table has NO status/created_at/deleted_at columns,
  // so do not filter deleted_at; inject a constant status and null created_at to
  // satisfy the page's badge/date columns. course_id is resolved to a title.
  async listTestimonials(): Promise<SqlRow[]> {
    const testimonials = await this.prisma.testimonial.findMany({ orderBy: { id: 'desc' } });
    const courseIds = [...new Set(testimonials.map(t => t.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
      : [];
    const courseMap = new Map(courses.map(c => [c.id, c.title]));

    return testimonials.map(t => ({
      ...t,
      course_title: t.course_id ? courseMap.get(t.course_id) ?? null : null,
      status: 'active',
      created_at: null,
    })) as unknown as SqlRow[];
  }

  // Naji 2026-05-11 — Country list for the searchable Country / Nationality
  // dropdowns on Edit Student / Add Application. Source is the legacy
  // `country` table seeded with ISO names.
  async listCountries(): Promise<SqlRow[]> {
    const countries = await this.prisma.country.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, sortname: true },
    });
    return countries as unknown as SqlRow[];
  }

  // ─── Phase A: CRUD for Instructors, Users, Counsellors, Associates, Targets ──

  // Multi-role one-password-per-person: when adding a NEW role to an email that
  // already has an account, reuse that person's existing password so the new
  // role joins their single login + the post-login role switcher, instead of
  // minting a separate password they'd never use. Returns null for a brand-new
  // person (then a fresh credential is issued + emailed as before).
  private async findSharedPasswordForEmail(email: string): Promise<string | null> {
    const normalized = email.trim();
    if (!normalized) return null;
    const sibling = await this.prisma.users.findFirst({
      where: { deleted_at: null, password: { not: null }, OR: [{ user_email: normalized }, { email: normalized }] },
      orderBy: { id: 'asc' },
      select: { password: true },
    });
    const password = sibling?.password;
    return typeof password === 'string' && password.length > 0 ? password : null;
  }

  async addInstructor(actorUserId: string, input: AddInstructorInput): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    if (!input.email.trim()) return { status: 0, message: 'Email is required.' };

    // One email per role, but the same email may be reused across different
    // roles (Naji 2026-04-30). Scope the duplicate check to role_id=3 here.
    const existing = await this.prisma.users.findFirst({ where: { user_email: input.email.trim(), role_id: 3, deleted_at: null } });
    if (existing) return { status: 0, message: 'An Instructor with this email already exists.' };

    const email = input.email.trim();
    const sharedPassword = await this.findSharedPasswordForEmail(email);

    let passwordHash: string;
    let message: string;
    if (sharedPassword) {
      passwordHash = sharedPassword;
      message = 'Instructor role added to the existing account — they keep their current password and can switch to it from the role dropdown after logging in.';
    } else {
      const { issueAndEmailCredentials } = await import('../auth/credentials-issuer.js');
      const creds = await issueAndEmailCredentials({ name: input.name.trim(), email, roleLabel: 'Instructor' });
      passwordHash = creds.hashedPassword;
      message = creds.emailDelivered
        ? 'Instructor added. Login credentials have been emailed.'
        : `Instructor added, but the credentials email failed to send (${creds.emailError ?? 'unknown error'}). Resend from the user actions menu.`;
    }

    const now = new Date();
    const qualification = input.qualification?.trim() || null;
    await this.prisma.users.create({
      data: {
        name: input.name.trim(),
        user_email: email,
        email,
        phone: input.phone?.trim() || null,
        password: passwordHash,
        role_id: 3,
        status: input.status ?? 1,
        gender: '',
        dynamic_link: '',
        image: input.image?.trim() ?? '',
        profile_picture: input.image?.trim() ?? '',
        application_id: 0,
        highest_qualification: qualification,
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, message };
  }

  async editInstructor(actorUserId: string, id: string, input: AddInstructorInput): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    const now = new Date();
    const data: Record<string, unknown> = {
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      status: input.status ?? 1,
      updated_at: now,
    };
    if (input.qualification !== undefined) {
      data.highest_qualification = input.qualification.trim() || null;
    }
    await this.prisma.users.updateMany({
      where: { id: toIntId(id), deleted_at: null },
      data,
    });
    return { status: 1, message: 'Instructor updated successfully.' };
  }

  async deleteInstructor(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.users.updateMany({ where: { id: toIntId(id), deleted_at: null }, data: { deleted_by: toIntId(actorUserId), deleted_at: now } });
    return { status: 1, message: 'Instructor deleted successfully.' };
  }

  // Resend login credentials to any user. Generates a fresh temp password,
  // updates the stored hash, and emails the plain text. Works for every
  // role — the role label is derived from users.role_id so the email
  // greeting stays accurate.
  async resendLoginCredentials(_actorUserId: string, id: string): Promise<Record<string, unknown>> {
    void _actorUserId;
    const userIdInt = toIntId(id);
    if (!userIdInt) {
      return { status: 0, message: 'Invalid user id.' };
    }

    const user = await this.prisma.users.findFirst({
      where: { id: userIdInt, deleted_at: null },
      select: { id: true, name: true, user_email: true, email: true, role_id: true },
    });
    if (!user) {
      return { status: 0, message: 'User not found.' };
    }
    const targetEmail = (user.user_email ?? user.email ?? '').trim();
    if (!targetEmail) {
      return { status: 0, message: 'User has no email on file.' };
    }

    const roleLabelMap: Record<number, string> = {
      1: 'Super Admin',
      2: 'Student',
      3: 'Instructor',
      4: 'Centre',
      8: 'Admin',
      9: 'Counsellor',
      10: 'Associate',
    };
    const roleLabel = (user.role_id !== null && roleLabelMap[user.role_id]) || 'User';

    const { issueAndEmailCredentials } = await import('../auth/credentials-issuer.js');
    const creds = await issueAndEmailCredentials({
      name: (user.name ?? '').trim() || targetEmail,
      email: targetEmail,
      roleLabel,
    });

    await this.prisma.users.update({
      where: { id: userIdInt },
      data: { password: creds.hashedPassword, updated_at: new Date() },
    });

    if (!creds.emailDelivered) {
      return {
        status: 0,
        message: `Password reset, but the email failed to send (${creds.emailError ?? 'unknown error'}).`,
      };
    }
    return { status: 1, message: `Login credentials emailed to ${targetEmail}.` };
  }

  async addUser(actorUserId: string, input: AddUserInput): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    if (!input.email.trim()) return { status: 0, message: 'Email is required.' };

    const roleLabel = input.roleId === 1 ? 'Super Admin' : 'Admin';

    // One email per role; same email allowed across different roles
    // (Naji 2026-04-30). Scope the duplicate check by role_id.
    const existing = await this.prisma.users.findFirst({ where: { user_email: input.email.trim(), role_id: input.roleId, deleted_at: null } });
    if (existing) return { status: 0, message: `A ${roleLabel} with this email already exists.` };
    const { issueAndEmailCredentials } = await import('../auth/credentials-issuer.js');
    const creds = await issueAndEmailCredentials({
      name: input.name.trim(),
      email: input.email.trim(),
      roleLabel,
    });

    const now = new Date();
    await this.prisma.users.create({
      data: {
        name: input.name.trim(),
        user_email: input.email.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || null,
        password: creds.hashedPassword,
        role_id: input.roleId,
        status: 1,
        gender: '',
        dynamic_link: '',
        image: input.image?.trim() ?? '',
        profile_picture: input.image?.trim() ?? '',
        application_id: 0,
        created_at: now,
        updated_at: now,
      },
    });
    const message = creds.emailDelivered
      ? `${roleLabel} created. Login credentials have been emailed.`
      : `${roleLabel} created, but the credentials email failed to send (${creds.emailError ?? 'unknown error'}). Resend from the user actions menu.`;
    return { status: 1, message };
  }

  async editUser(
    actorUserId: string,
    id: string,
    input: { name: string; phone?: string; status?: number; image?: string },
  ): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    const now = new Date();
    const data: Record<string, unknown> = {
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      updated_by: toNullableIntId(actorUserId),
      updated_at: now,
    };
    if (input.status !== undefined) data.status = input.status;
    if (input.image !== undefined) {
      const trimmed = input.image.trim();
      data.image = trimmed;
      data.profile_picture = trimmed;
    }
    await this.prisma.users.updateMany({
      where: { id: toIntId(id), deleted_at: null },
      data,
    });
    return { status: 1, message: 'User updated successfully.' };
  }

  async deleteUser(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.users.updateMany({ where: { id: toIntId(id), deleted_at: null }, data: { deleted_by: toIntId(actorUserId), deleted_at: now } });
    return { status: 1, message: 'User deleted successfully.' };
  }

  async addAssociate(actorUserId: string, input: AddAssociateInput): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    if (!input.email.trim()) return { status: 0, message: 'Email is required.' };

    // Scope the duplicate-email check to Associates only (role_id=10) so
    // the same email can be reused as Counsellor / Admin / etc.
    const existing = await this.prisma.users.findFirst({ where: { user_email: input.email.trim(), role_id: 10, deleted_at: null } });
    if (existing) return { status: 0, message: 'An Associate with this email already exists.' };

    const { issueAndEmailCredentials } = await import('../auth/credentials-issuer.js');
    const creds = await issueAndEmailCredentials({
      name: input.name.trim(),
      email: input.email.trim(),
      roleLabel: 'Associate',
    });

    const now = new Date();
    await this.prisma.users.create({
      data: {
        name: input.name.trim(),
        user_email: input.email.trim(),
        email: input.email.trim(),
        phone: input.phone?.trim() || null,
        password: creds.hashedPassword,
        role_id: 10,
        status: input.status ?? 1,
        gender: '',
        dynamic_link: '',
        image: input.image?.trim() ?? '',
        profile_picture: input.image?.trim() ?? '',
        application_id: 0,
        created_at: now,
        updated_at: now,
      },
    });
    const message = creds.emailDelivered
      ? 'Associate added. Login credentials have been emailed.'
      : `Associate added, but the credentials email failed to send (${creds.emailError ?? 'unknown error'}). Resend from the user actions menu.`;
    return { status: 1, message };
  }

  async addCounsellorTarget(actorUserId: string, input: AddTargetInput): Promise<Record<string, unknown>> {
    if (!input.userId) return { status: 0, message: 'Counsellor is required.' };
    const now = new Date();
    await this.prisma.counsellor_target.create({
      data: {
        counsellor_id: toIntId(input.userId),
        type: targetTypeToInt(input.targetType),
        from_date: new Date(input.periodFrom),
        to_date: new Date(input.periodTo),
        value: input.targetValue,
        created_by: toIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, message: 'Target added successfully.' };
  }

  async editCounsellorTarget(actorUserId: string, id: string, input: AddTargetInput): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.counsellor_target.updateMany({
      where: { counsellor_target_id: toIntId(id), deleted_at: null },
      data: {
        counsellor_id: toIntId(input.userId),
        type: targetTypeToInt(input.targetType),
        from_date: new Date(input.periodFrom),
        to_date: new Date(input.periodTo),
        value: input.targetValue,
        updated_by: toIntId(actorUserId),
        updated_at: now,
      },
    });
    return { status: 1, message: 'Target updated successfully.' };
  }

  async deleteCounsellorTarget(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.counsellor_target.updateMany({ where: { counsellor_target_id: toIntId(id), deleted_at: null }, data: { deleted_by: toIntId(actorUserId), deleted_at: now } });
    return { status: 1, message: 'Target deleted successfully.' };
  }

  async addAssociateTarget(actorUserId: string, input: AddTargetInput): Promise<Record<string, unknown>> {
    if (!input.userId) return { status: 0, message: 'Associate is required.' };
    const now = new Date();
    await this.prisma.associates_target.create({
      data: {
        associate_id: toIntId(input.userId),
        type: 1,
        from_date: new Date(input.periodFrom),
        to_date: new Date(input.periodTo),
        value: input.targetValue,
        created_by: toIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, message: 'Target added successfully.' };
  }

  async editAssociateTarget(actorUserId: string, id: string, input: AddTargetInput): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.associates_target.updateMany({
      where: { associate_target_id: toIntId(id), deleted_at: null },
      data: {
        associate_id: toIntId(input.userId),
        type: 1,
        from_date: new Date(input.periodFrom),
        to_date: new Date(input.periodTo),
        value: input.targetValue,
        updated_by: toIntId(actorUserId),
        updated_at: now,
      },
    });
    return { status: 1, message: 'Target updated successfully.' };
  }

  async deleteAssociateTarget(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.associates_target.updateMany({ where: { associate_target_id: toIntId(id), deleted_at: null }, data: { deleted_by: toIntId(actorUserId), deleted_at: now } });
    return { status: 1, message: 'Target deleted successfully.' };
  }

  // ── Applications Phase B ────────────────────────────────────────────────────

  // Numeric coercion that returns null for empty/non-integer values.
  // Used by getApplication to decide whether to look up a country /
  // nationality / language by id, or treat the column as raw text.

  // Naji UAT 2026-05-31 — application documents live in the legacy
  // `biography` JSON column (`{ documents: [{ name, url, label?,
  // document_type_id? }], … }`). This is the single source of truth for
  // both the View page Documents tab AND the verification gate, so the
  // per-document key indices (`doc:0`, `doc:1`, …) line up between
  // getApplication and adminApproveApplication. URLs are rewritten to the
  // live host so the "View" link actually resolves.
  private parseApplicationDocuments(biography: string | null | undefined): Array<{
    name: string;
    label: string;
    url: string;
    document_type_id: string | null;
  }> {
    if (!biography) return [];
    let parsed: Record<string, unknown> | null = null;
    try {
      const obj: unknown = JSON.parse(biography);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) parsed = obj as Record<string, unknown>;
    } catch { return []; }
    const raw = parsed?.documents;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((d): d is Record<string, unknown> => !!d && typeof d === 'object')
      .map((d) => {
        const name = toStringValue(d.name);
        const label = toStringValue(d.label) || name;
        const docTypeId = toStringValue(d.document_type_id) || null;
        return {
          name,
          label,
          url: d.url ? toLegacyFileUrl(toStringValue(d.url)) : '',
          document_type_id: docTypeId,
        };
      });
  }

  // Parse applications.verification → `{ verified: string[] }`. Null /
  // malformed → empty set (backward compatible — applications predating
  // the verification gate behave as "nothing verified yet").
  private parseApplicationVerification(verification: string | null | undefined): { verified: string[] } {
    if (!verification) return { verified: [] };
    try {
      const obj: unknown = JSON.parse(verification);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const v = (obj as Record<string, unknown>).verified;
        if (Array.isArray(v)) {
          return { verified: v.map((k) => String(k)).filter((k) => k.length > 0) };
        }
      }
    } catch { /* malformed → empty */ }
    return { verified: [] };
  }

  // The full set of verification keys an application must have before it
  // can be approved: the three section keys plus one `doc:<index>` per
  // uploaded document.
  private requiredVerificationKeys(documentCount: number): string[] {
    const keys = ['basic', 'qualification', 'documents'];
    for (let i = 0; i < documentCount; i += 1) keys.push(`doc:${i}`);
    return keys;
  }

  async getApplication(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    if (!id) return { status: 0, message: 'Application ID is required.' };

    const scope = await this.applicationOwnerScope(actorUserId);
    const app = await this.prisma.applications.findFirst({ where: { id: toIntId(id), deleted_at: null, ...scope } });
    if (!app) return { status: 0, message: 'Application not found.' };

    // Resolve related records. Naji 2026-05-07: country / nationality /
    // preferred_language store numeric IDs (legacy form), so we look the
    // names up here so the View page can render text instead of "0".
    const countryIdInt = parseLooseInt(app.country_id);
    const nationalityIdInt = parseLooseInt(app.nationality);
    const languageIdInt = parseLooseInt(app.preferred_language);

    // Naji UAT 2026-05-16 — student_payments.paid_date stores a literal
    // '0000-00-00' for legacy rows; Prisma's MySQL driver throws "Value
    // out of range" when findMany() tries to hydrate that. Same fix
    // pattern as listPaymentStatus / getStudentDetail: read through
    // $queryRaw with NULLIF so the zero-date becomes NULL before it
    // reaches the driver.
    //
    // Naji UAT 2026-06-24 — CRITICAL FIX: student_payments.user_id is the
    // ENROLLED student's users.id, NOT applications.id. Filtering on the
    // application PK (toIntId(id)) leaked an unrelated student's payment
    // history whenever applications.id happened to equal some users.id
    // (both are independent auto-increment series, so collisions are
    // routine). A brand-new lead has applications.student_id = NULL and so
    // must show NO payment history. Filter on app.student_id; return [] when
    // the application has never been converted to an enrolled student.
    type RawStudentPayment = {
      id: number;
      user_id: number;
      course_id: number;
      installment_details: string | null;
      amount: number | null;
      payment_mode: string | null;
      payment_to: string | null;
      status: string | null;
      due_date: Date | null;
      paid_date: Date | null;
    };
    const studentUserIdInt = app.student_id ? toIntId(app.student_id) : 0;
    const studentPaymentsForApp = studentUserIdInt > 0
      ? this.prisma.$queryRaw<RawStudentPayment[]>`
          SELECT id, user_id, course_id, installment_details, amount,
                 payment_mode, payment_to, status,
                 NULLIF(due_date, '0000-00-00') AS due_date,
                 NULLIF(paid_date, '0000-00-00') AS paid_date
          FROM student_payments
          WHERE user_id = ${studentUserIdInt} AND deleted_at IS NULL
          ORDER BY id DESC
        `
      : Promise.resolve([] as RawStudentPayment[]);
    const [course, pipelineUser, centre, payments, countryRow, nationalityRow, languageRow, educationPathway, offering, combination] = await Promise.all([
      app.course_id ? this.prisma.course.findFirst({ where: { id: app.course_id } }) : null,
      app.pipeline_user ? this.prisma.users.findFirst({ where: { id: app.pipeline_user }, select: { id: true, name: true } }) : null,
      app.added_under_centre ? this.prisma.centres.findFirst({ where: { id: app.added_under_centre }, select: { id: true, centre_name: true } }) : null,
      studentPaymentsForApp,
      countryIdInt !== null ? this.prisma.country.findFirst({ where: { id: countryIdInt }, select: { id: true, name: true } }) : null,
      nationalityIdInt !== null ? this.prisma.country.findFirst({ where: { id: nationalityIdInt }, select: { id: true, name: true } }) : null,
      languageIdInt !== null ? this.prisma.languages.findFirst({ where: { id: languageIdInt }, select: { id: true, title: true } }) : null,
      this.prisma.application_education_pathway.findMany({
        where: { application_id: app.id },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
      }),
      app.offering_id ? this.prisma.offerings.findFirst({ where: { id: app.offering_id }, select: { id: true, title: true, offering_code: true } }) : null,
      app.certificate_combination_id
        ? this.prisma.certificate_combinations.findFirst({
            where: { id: app.certificate_combination_id },
            select: { id: true, combination_code: true },
          })
        : null,
    ]);

    // Resolve batch
    const batch = app.batch_id ? await this.prisma.batch.findFirst({ where: { id: app.batch_id } }) : null;

    // Country/nationality fall back to the raw text if the lookup misses
    // (older rows stored e.g. "India" directly). Same for language.
    const countryName = countryRow?.name ?? (countryIdInt === null ? toStringValue(app.country_id) : null);
    const nationalityName = nationalityRow?.name ?? (nationalityIdInt === null ? toStringValue(app.nationality) : null);
    const languageName = languageRow?.title ?? (languageIdInt === null ? toStringValue(app.preferred_language) : null);

    // Resolve a "Reference#<userId>" lead source to the referring student's
    // name so the UI shows "Referred by <name>" instead of the raw id
    // (Naji 2026-06-27). Non-Reference sources pass through unchanged.
    const rawSource = toStringValue(app.marketing_source) || toStringValue(app.lead_source);
    let marketingSourceDisplay = rawSource;
    const refMatch = /^Reference#(\d+)$/.exec(rawSource);
    if (refMatch) {
      const refUserId = Number(refMatch[1] ?? 0);
      const refUser = refUserId > 0
        ? await this.prisma.users.findFirst({ where: { id: refUserId }, select: { name: true, student_id: true } })
        : null;
      const refName = (refUser?.name ?? '').trim();
      const refSid = (refUser?.student_id ?? '').trim();
      marketingSourceDisplay = refName
        ? `Referred by ${refName}${refSid ? ` (${refSid})` : ''}`
        : 'Referred by an existing student';
    }
    // Resolve a "Network#{json}" source (referrer name/email captured on the
    // Add-Lead form, Naji 2026-06-30) to a readable label instead of raw JSON.
    const netMatch = /^Network#(.+)$/s.exec(rawSource);
    if (netMatch) {
      try {
        const parsed = JSON.parse(netMatch[1] ?? '{}') as { name?: unknown; email?: unknown };
        const detail = [toStringValue(parsed.name).trim(), toStringValue(parsed.email).trim()]
          .filter((s) => s !== '')
          .join(' · ');
        marketingSourceDisplay = detail ? `Network — ${detail}` : 'Network';
      } catch {
        marketingSourceDisplay = 'Network';
      }
    }

    return {
      status: 1,
      application: {
        ...app,
        // Human-readable lead source (resolves Reference#<id> → student name).
        marketing_source_display: marketingSourceDisplay,
        // Photo resolves through the same legacy-asset URL helper that other
        // student/centre payloads use.
        image: toLegacyFileUrl(app.image) || toLegacyFileUrl((app as Record<string, unknown>).profile_picture as string | null),
        course_title: course?.title ?? null,
        offering_title: offering?.title ?? offering?.offering_code ?? null,
        combination_title: combination?.combination_code ?? null,
        pipeline_user_name: pipelineUser?.name ?? null,
        centre_name: centre?.centre_name ?? null,
        batch_title: batch?.title ?? null,
        country_name: countryName,
        nationality_name: nationalityName,
        language_name: languageName,
        // Naji UAT 2026-05-16 — the legacy `whatsapp_no` Int column can't
        // hold a full phone number (overflows on 10+ digits), so we now
        // write the canonical value to `whatsapp` (VARCHAR) on save and
        // mirror it back onto `whatsapp_no` here so the ViewApplication
        // / EditStudent / AddApplication displays that still read
        // `whatsapp_no` continue to work without per-page changes.
        whatsapp_no: app.whatsapp || (app.whatsapp_no ? String(app.whatsapp_no) : null),
        // Naji UAT 2026-05-31 — surface the uploaded documents (parsed
        // from biography JSON) so the View page Documents tab can list
        // them, and the verification state so the Verify buttons can
        // reflect what's already been checked off.
        documents: this.parseApplicationDocuments(app.biography),
        verification: this.parseApplicationVerification(app.verification),
      },
      education_pathway: educationPathway,
      payments,
    };
  }

  // ─── Lead → Enrolment workflow (Naji 2026-05-05) ─────────────────
  // Step 1: Add Lead. Minimal capture — Name / Email / Phone / Course /
  // Offering / Combination / Source. The pipeline + pipeline_user_id are
  // auto-stamped from the logged-in user (no manual choice). Duplicate
  // handling per Naji's spec:
  //   - Same email + same course already a lead → block.
  //   - Same email already a Student in a different course → return
  //     `duplicate_student_other_course` so the UI can show the
  //     "enrol to second course" dialog.
  //   - Same email already a Student in the target course → block.
  // Naji UAT 2026-05-14 — duplicate-check used by the Add Lead form's
  // email/phone onBlur handler. Returns the matching Student row(s) so
  // the form can show a red banner with the student's name / id and
  // a deep-link into the existing record. Only role_id=2 (Student),
  // not deleted. Email is case-insensitive; phone is matched on the
  // last 10 digits to be tolerant of country-code formatting.
  async findDuplicateStudent(input: { email?: string; phone?: string }): Promise<{
    matches: Array<{
      id: number;
      name: string | null;
      student_id: string | null;
      user_email: string | null;
      phone: string | null;
      match_via: 'email' | 'phone' | 'both';
    }>;
  }> {
    const email = (input.email ?? '').trim().toLowerCase();
    const phoneDigits = (input.phone ?? '').replace(/\D/g, '');
    const phoneSuffix = phoneDigits.slice(-10);
    if (!email && !phoneSuffix) return { matches: [] };

    // Legacy data quirk: `users.email` column actually stores the phone
    // (the PHP LMS reused that column as a phone-with-country-code field),
    // and `users.user_email` is the real email. Match email only against
    // user_email; match phone against BOTH phone and email columns.
    const where: Prisma.usersWhereInput = { role_id: 2, deleted_at: null };
    const orConds: Prisma.usersWhereInput[] = [];
    if (email) {
      orConds.push({ user_email: { contains: email } });
    }
    if (phoneSuffix) {
      orConds.push({ phone: { endsWith: phoneSuffix } });
      orConds.push({ email: { endsWith: phoneSuffix } });
    }
    where.OR = orConds;

    const rows = await this.prisma.users.findMany({
      where,
      select: { id: true, name: true, student_id: true, user_email: true, email: true, phone: true },
      orderBy: { id: 'desc' },
      take: 10,
    });

    const matches = rows.map((r) => {
      const rowEmail = (r.user_email || '').toLowerCase();
      const rowPhone = (r.phone || '').replace(/\D/g, '');
      const rowLegacyPhone = (r.email || '').replace(/\D/g, '');
      const emailMatch = !!email && rowEmail === email;
      const phoneMatch = !!phoneSuffix && (rowPhone.endsWith(phoneSuffix) || rowLegacyPhone.endsWith(phoneSuffix));
      const via: 'email' | 'phone' | 'both' = emailMatch && phoneMatch
        ? 'both'
        : emailMatch
          ? 'email'
          : 'phone';
      return {
        id: r.id,
        name: r.name,
        student_id: r.student_id,
        user_email: r.user_email,
        phone: r.phone || r.email, // surface whichever holds the phone
        match_via: via,
      };
    });
    // Drop rows where neither check actually matched (shouldn't happen but defensive).
    const filtered = matches.filter((m) => m.match_via === 'email' || m.match_via === 'phone' || m.match_via === 'both');
    return { matches: filtered };
  }

  async addLead(
    actorUserId: string,
    input: {
      name: string;
      email: string;
      phone: string;
      countryCode?: string;
      courseId: string;
      offeringId?: string;
      combinationId?: string;
      source?: string;
    },
  ): Promise<Record<string, unknown>> {
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();
    const courseIdInt = toNullableIntId(input.courseId);
    const actor = await this.prisma.users.findFirst({
      where: { id: toIntId(actorUserId), deleted_at: null },
      select: { id: true, role_id: true, name: true },
    });
    if (!name) return { status: 0, message: 'Name is required.' };
    if (!email) return { status: 0, message: 'Email is required.' };
    if (!phone) return { status: 0, message: 'Phone is required.' };
    if (!courseIdInt) return { status: 0, message: 'Course is required.' };
    if (!actor) return { status: 0, message: 'Actor user not found.' };

    // 1) Already a lead for the same course?
    const existingLead = await this.prisma.applications.findFirst({
      where: {
        deleted_at: null,
        user_email: email,
        course_id: courseIdInt,
        stage: { not: 'enrolled' },
      },
      select: { id: true, stage: true },
    });
    if (existingLead) {
      return {
        status: 0,
        code: 'duplicate_lead_same_course',
        message: 'A lead with this email already exists for this course.',
      };
    }

    // 2) Already a Student? Match by email OR phone (last 10 digits) so
    //    the lead can't be re-entered with a slightly different email
    //    while reusing the same phone. Naji UAT 2026-05-14.
    const phoneDigits = phone.replace(/\D/g, '');
    const phoneSuffix = phoneDigits.slice(-10);
    const studentOrConds: Prisma.usersWhereInput[] = [
      { email }, { user_email: email },
    ];
    if (phoneSuffix.length >= 10) {
      studentOrConds.push({ phone: { endsWith: phoneSuffix } });
    }
    const studentUser = await this.prisma.users.findFirst({
      where: {
        deleted_at: null,
        role_id: 2,
        OR: studentOrConds,
      },
      select: { id: true, name: true, student_id: true },
    });
    if (studentUser) {
      const alreadyEnrolled = await this.prisma.enrol.findFirst({
        where: {
          user_id: studentUser.id,
          course_id: courseIdInt,
          deleted_at: null,
        },
        select: { id: true },
      });
      if (alreadyEnrolled) {
        return {
          status: 0,
          code: 'duplicate_student_same_course',
          message: 'This student is already enrolled in the selected course.',
        };
      }
      // Different course — surface the dialog so admin/counsellor can
      // confirm enrolling them to the second course.
      return {
        status: 2,
        code: 'duplicate_student_other_course',
        message: 'This email or phone already belongs to a student. Use Add Enrolment on their record instead of creating a new lead.',
        data: {
          existing_user_id: studentUser.id,
          existing_user_name: studentUser.name,
          existing_student_id: studentUser.student_id,
        },
      };
    }

    const roleLabel: Record<number, string> = {
      1: 'Super Admin',
      8: 'Admin',
      9: 'Counsellor',
      10: 'Associate',
    };
    const pipeline = (actor.role_id !== null && roleLabel[actor.role_id]) || 'Admin';

    const now = new Date();
    const applicationIdSeq = await this.nextApplicationId();
    const created = await this.prisma.applications.create({
      data: {
        application_id: applicationIdSeq,
        name,
        phone,
        email: phone, // legacy column quirk: `email` was reused for phone
        user_email: email,
        country_code: input.countryCode ? `+${input.countryCode.replace(/^\+/, '')}` : '+91',
        course_id: courseIdInt,
        offering_id: input.offeringId ? toNullableIntId(input.offeringId) : null,
        certificate_combination_id: input.combinationId ? toNullableIntId(input.combinationId) : null,
        marketing_source: input.source?.trim() || null,
        lead_source: input.source?.trim() || null,
        pipeline,
        pipeline_user: actor.id,
        stage: 'lead',
        image: '',
        second_code: 0,
        second_phone: '',
        whatsapp_no: 0,
        created_at: now,
        updated_at: now,
        created_by: actor.id,
      },
    });

    await this.recordEvent(created.id, 'lead_created', `Lead added by ${actor.name ?? 'staff'}`, actorUserId);

    return {
      status: 1,
      message: 'Lead added.',
      data: { application_id: created.id, stage: 'lead' },
    };
  }

  // Naji 2026-05-08 — Edit Lead. Used by the View page Edit button when
  // the application is still in an early stage (lead / payment_pending /
  // paid / form_pending). Updates only the fields captured at Add Lead;
  // qualification / personal info live on the public application form.
  async editLead(
    actorUserId: string,
    applicationId: string,
    input: {
      name: string;
      email: string;
      phone: string;
      countryCode?: string;
      courseId: string;
      offeringId?: string;
      combinationId?: string;
      source?: string;
    },
  ): Promise<Record<string, unknown>> {
    const id = toIntId(applicationId);
    if (!id) return { status: 0, message: 'Application ID is required.' };
    const existing = await this.prisma.applications.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, stage: true, user_email: true, course_id: true },
    });
    if (!existing) return { status: 0, message: 'Application not found.' };

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const phone = input.phone.trim();
    const courseIdInt = toNullableIntId(input.courseId);
    const actor = await this.prisma.users.findFirst({
      where: { id: toIntId(actorUserId), deleted_at: null },
      select: { id: true },
    });
    if (!name) return { status: 0, message: 'Name is required.' };
    if (!email) return { status: 0, message: 'Email is required.' };
    if (!phone) return { status: 0, message: 'Phone is required.' };
    if (!courseIdInt) return { status: 0, message: 'Course is required.' };
    if (!actor) return { status: 0, message: 'Actor user not found.' };

    // Re-check duplicate-lead-on-same-course only if the user changed
    // email or course — otherwise the existing row would self-match.
    const emailChanged = (existing.user_email ?? '').toLowerCase() !== email;
    const courseChanged = (existing.course_id ?? null) !== courseIdInt;
    if (emailChanged || courseChanged) {
      const dupLead = await this.prisma.applications.findFirst({
        where: {
          deleted_at: null,
          user_email: email,
          course_id: courseIdInt,
          stage: { not: 'enrolled' },
          NOT: { id },
        },
        select: { id: true },
      });
      if (dupLead) {
        return {
          status: 0,
          code: 'duplicate_lead_same_course',
          message: 'Another lead with this email already exists for this course.',
        };
      }
    }

    await this.prisma.applications.update({
      where: { id },
      data: {
        name,
        phone,
        email: phone, // legacy quirk — `email` column holds phone
        user_email: email,
        country_code: input.countryCode ? `+${input.countryCode.replace(/^\+/, '')}` : '+91',
        course_id: courseIdInt,
        offering_id: input.offeringId ? toNullableIntId(input.offeringId) : null,
        certificate_combination_id: input.combinationId ? toNullableIntId(input.combinationId) : null,
        marketing_source: input.source?.trim() || null,
        lead_source: input.source?.trim() || null,
        updated_by: actor.id,
        updated_at: new Date(),
      },
    });

    await this.recordEvent(id, 'lead_edited', 'Lead details edited', actorUserId);

    return { status: 1, message: 'Lead updated.', data: { id } };
  }

  // Student-initiated enrolment request from the "Other Courses" catalog.
  // Bypasses the duplicate-student-other-course block in addLead — the
  // student IS the user requesting, so flagging them as a duplicate would
  // block the very flow we want. Source is tagged so counsellors can see
  // it came from the student portal.
  async requestEnrolmentByStudent(
    studentUserId: string,
    courseId: string,
  ): Promise<Record<string, unknown>> {
    const courseIdInt = toNullableIntId(courseId);
    if (!courseIdInt) return { status: 0, message: 'Course is required.' };

    const student = await this.prisma.users.findFirst({
      where: { id: toIntId(studentUserId), deleted_at: null, role_id: 2 },
      select: { id: true, name: true, email: true, user_email: true, phone: true, country_code: true },
    });
    if (!student) return { status: 0, message: 'Student not found.' };

    const email = (student.user_email || student.email || '').trim().toLowerCase();
    const name = (student.name || '').trim();
    const phone = (student.phone || '').trim();
    if (!email) return { status: 0, message: 'Email is missing on your profile. Update it before requesting enrolment.' };
    if (!name) return { status: 0, message: 'Name is missing on your profile.' };
    if (!phone) return { status: 0, message: 'Phone is missing on your profile.' };

    const alreadyEnrolled = await this.prisma.enrol.findFirst({
      where: { user_id: student.id, course_id: courseIdInt, deleted_at: null },
      select: { id: true },
    });
    if (alreadyEnrolled) {
      return { status: 0, message: 'You are already enrolled in this course.' };
    }

    const existingLead = await this.prisma.applications.findFirst({
      where: {
        deleted_at: null,
        user_email: email,
        course_id: courseIdInt,
        stage: { not: 'enrolled' },
      },
      select: { id: true },
    });
    if (existingLead) {
      return { status: 0, message: 'You have already requested this course. A counsellor will reach out shortly.' };
    }

    const now = new Date();
    const applicationIdSeq = await this.nextApplicationId();
    const created = await this.prisma.applications.create({
      data: {
        application_id: applicationIdSeq,
        name,
        phone,
        email: phone,
        user_email: email,
        country_code: student.country_code ? `+${String(student.country_code).replace(/^\+/, '')}` : '+91',
        course_id: courseIdInt,
        offering_id: null,
        certificate_combination_id: null,
        marketing_source: 'student_self_request',
        lead_source: 'student_self_request',
        pipeline: 'Counsellor',
        pipeline_user: null,
        stage: 'lead',
        image: '',
        second_code: 0,
        second_phone: '',
        whatsapp_no: 0,
        created_at: now,
        updated_at: now,
        created_by: student.id,
      },
    });

    return {
      status: 1,
      message: 'Request received. A counsellor will reach out to you shortly.',
      data: { application_id: created.id },
    };
  }

  async listLeads(
    actorUserId: string,
    options?: { stage?: string | undefined; courseId?: string | undefined; search?: string | undefined },
  ): Promise<Record<string, unknown>[]> {
    const actor = await this.prisma.users.findFirst({
      where: { id: toIntId(actorUserId), deleted_at: null },
      select: { id: true, role_id: true },
    });
    if (!actor) return [];

    // Counsellor scoping (Naji 2026-05-05): counsellors see only their
    // own leads. Admin / Super Admin see everything.
    const where: Prisma.applicationsWhereInput = { deleted_at: null };
    if (actor.role_id === 9) where.pipeline_user = actor.id;
    // Naji UAT 2026-05-13 — drop already-converted / enrolled rows so the
    // per-stage tab counts (which use listAdminApplications) and the
    // table (which uses listLeads) agree. Once a lead converts, the
    // source-of-truth row lives under Students; surfacing it here lets
    // admins accidentally re-process it.
    if (options?.stage === 'enrolled') {
      where.stage = 'enrolled';
    } else {
      where.is_converted = 0;
      if (options?.stage) {
        where.stage = options.stage;
      } else {
        where.stage = { not: 'enrolled' };
      }
    }
    if (options?.courseId) {
      const cid = toNullableIntId(options.courseId);
      if (cid !== null) where.course_id = cid;
    }
    if (options?.search?.trim()) {
      const q = options.search.trim();
      where.OR = [{ name: { contains: q } }, { user_email: { contains: q } }, { phone: { contains: q } }];
    }

    const rows = await this.prisma.applications.findMany({
      where,
      orderBy: { id: 'desc' },
      take: 500,
    });
    const courseIds = [...new Set(rows.map((r) => r.course_id).filter((v): v is number => v !== null))];
    const userIds = [...new Set(rows.map((r) => r.pipeline_user).filter((v): v is number => v !== null))];
    const offeringIds = [...new Set(rows.map((r) => r.offering_id).filter((v): v is number => v !== null))];
    const combinationIds = [...new Set(rows.map((r) => r.certificate_combination_id).filter((v): v is number => v !== null))];
    const [courses, users, offerings, combinations] = await Promise.all([
      courseIds.length > 0 ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } }) : [],
      userIds.length > 0 ? this.prisma.users.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
      offeringIds.length > 0 ? this.prisma.offerings.findMany({ where: { id: { in: offeringIds } }, select: { id: true, title: true } }) : [],
      combinationIds.length > 0
        ? this.prisma.certificate_combinations.findMany({
            where: { id: { in: combinationIds } },
            select: { id: true, combination_code: true },
          })
        : [],
    ]);
    const courseMap = new Map(courses.map((c) => [c.id, c.title ?? '']));
    const userMap = new Map(users.map((u) => [u.id, u.name ?? '']));
    const offeringMap = new Map(offerings.map((o) => [o.id, o.title ?? '']));
    const combinationMap = new Map(
      combinations.map((c: { id: number; combination_code: string | null }) => [c.id, c.combination_code ?? '']),
    );

    return rows.map((r) => ({
      id: r.id,
      application_id: r.application_id,
      name: r.name,
      // Naji 2026-05-08 — Applications list reads `user_email` and
      // `combination_title`. The earlier payload only returned `email` and
      // `combination_id`, so both columns rendered blank for new leads.
      email: r.user_email,
      user_email: r.user_email,
      phone: r.phone,
      stage: r.stage ?? 'lead',
      course_id: r.course_id,
      course_title: r.course_id ? courseMap.get(r.course_id) ?? null : null,
      offering_id: r.offering_id,
      offering_title: r.offering_id ? offeringMap.get(r.offering_id) ?? null : null,
      combination_id: r.certificate_combination_id,
      combination_title: r.certificate_combination_id
        ? combinationMap.get(r.certificate_combination_id) ?? null
        : null,
      pipeline: r.pipeline,
      pipeline_user: r.pipeline_user,
      pipeline_user_name: r.pipeline_user ? userMap.get(r.pipeline_user) ?? null : null,
      source: r.lead_source ?? r.marketing_source,
      payment_status: r.payment_status,
      payment_link_url: r.payment_link_url,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));
  }

  // Naji 2026-05-09 — Lead History timeline. recordEvent() writes one
  // row per significant action on a lead. Read by /admin/applications/
  // :id/events for the View page Lead History tab. Best-effort: write
  // failures are logged (via console) but don't bubble into the caller.
  async recordEvent(
    applicationId: number,
    eventType: string,
    description: string,
    actorUserId: string | null,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      const actor = actorUserId ? toNullableIntId(actorUserId) : null;
      let actorRoleId: number | null = null;
      if (actor !== null) {
        const u = await this.prisma.users.findFirst({ where: { id: actor }, select: { role_id: true } });
        actorRoleId = u?.role_id ?? null;
      }
      await this.prisma.application_events.create({
        data: {
          application_id: applicationId,
          event_type: eventType,
          description,
          actor_user_id: actor,
          actor_role_id: actorRoleId,
          metadata: metadata ? JSON.stringify(metadata) : null,
        },
      });
    } catch (e) {
      // Don't break the action just because the audit row failed.
      console.warn('[recordEvent] failed', { applicationId, eventType, error: e instanceof Error ? e.message : e });
    }
  }

  async listApplicationEvents(applicationId: string): Promise<Record<string, unknown>[]> {
    const id = toIntId(applicationId);
    if (!id) return [];
    const rows = await this.prisma.application_events.findMany({
      where: { application_id: id },
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: 500,
    });
    if (rows.length === 0) return [];
    const actorIds = Array.from(new Set(rows.map((r) => r.actor_user_id).filter((v): v is number => v !== null)));
    const actors = actorIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } })
      : [];
    const actorMap = new Map(actors.map((a) => [a.id, a.name ?? '']));
    const ROLE_LABELS: Record<number, string> = { 1: 'Super Admin', 2: 'Student', 3: 'Instructor', 4: 'Centre', 8: 'Admin', 9: 'Counsellor', 10: 'Associate' };
    return rows.map((r) => ({
      id: r.id,
      event_type: r.event_type,
      description: r.description,
      actor_user_id: r.actor_user_id,
      actor_name: r.actor_user_id ? actorMap.get(r.actor_user_id) ?? null : null,
      actor_role_id: r.actor_role_id,
      actor_role_label: r.actor_role_id !== null && r.actor_role_id !== undefined ? (ROLE_LABELS[r.actor_role_id] ?? null) : null,
      metadata: r.metadata,
      created_at: r.created_at,
    }));
  }

  // Naji UAT 2026-05-31 — admin verification gate. Toggles a single
  // verification key on / off and persists the updated set back to
  // applications.verification. Keys are section names ("basic",
  // "qualification", "documents") or per-document keys ("doc:0", …).
  // Every toggle is journalled to the Lead History timeline.
  async setApplicationVerification(
    actorUserId: string,
    applicationId: string,
    key: string,
    verified: boolean,
  ): Promise<Record<string, unknown>> {
    const id = toIntId(applicationId);
    if (!id) return { status: 0, message: 'Application ID is required.' };
    const cleanKey = (key ?? '').trim();
    if (!cleanKey) return { status: 0, message: 'Verification key is required.' };
    const app = await this.prisma.applications.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, verification: true },
    });
    if (!app) return { status: 0, message: 'Application not found.' };

    const current = this.parseApplicationVerification(app.verification).verified;
    const set = new Set(current);
    if (verified) set.add(cleanKey);
    else set.delete(cleanKey);
    const next = Array.from(set);

    await this.prisma.applications.update({
      where: { id },
      data: {
        verification: JSON.stringify({ verified: next }),
        updated_at: new Date(),
        updated_by: toNullableIntId(actorUserId),
      },
    });

    await this.recordEvent(
      id,
      'verification_changed',
      `${verified ? 'Verified' : 'Unverified'} ${cleanKey}`,
      actorUserId,
      { key: cleanKey, verified },
    );

    return { status: 1, message: verified ? 'Marked as verified.' : 'Verification removed.', data: { verified: next } };
  }

  // Phase G (Naji 2026-05-05): notification dispatcher. Single entry
  // point so every stage transition in this file fires the right
  // emails to student / counsellor / admin per the locked spec.
  private async notifyApplicationEvent(
    applicationId: number,
    event:
      | 'payment_received'
      | 'form_submitted'
      | 'rejected'
      | 'enrolment_confirmed',
  ): Promise<void> {
    try {
      const app = await this.prisma.applications.findFirst({
        where: { id: applicationId, deleted_at: null },
        select: {
          id: true, name: true, user_email: true, course_id: true,
          pipeline_user: true, rejection_reason: true,
        },
      });
      if (!app) return;
      const courseTitle = app.course_id
        ? (await this.prisma.course.findFirst({ where: { id: app.course_id }, select: { title: true } }))?.title ?? ''
        : '';
      const counsellor = app.pipeline_user
        ? await this.prisma.users.findFirst({
            where: { id: app.pipeline_user, deleted_at: null },
            select: { id: true, name: true, user_email: true, email: true },
          })
        : null;
      const admins = await this.prisma.users.findMany({
        where: { deleted_at: null, role_id: { in: [1, 8] }, status: 1 },
        select: { id: true, name: true, user_email: true, email: true },
      });
      const { createIntegrationRegistry } = await import('../integrations/registry.js');
      const registry = createIntegrationRegistry();
      const studentEmail = app.user_email ?? '';
      const counsellorEmail = counsellor?.user_email ?? counsellor?.email ?? '';
      const adminEmails = admins
        .map((a) => a.user_email ?? a.email ?? '')
        .filter((e) => e !== '');

      const send = async (to: string, subject: string, body: string) => {
        if (!to) return;
        try {
          await registry.email.sendEmail({ to, subject, html: body });
        } catch (err) {
          // Best-effort delivery, but log the failure so silent MsGraph
          // bounces surface in pm2 logs. Naji UAT 2026-05-14.
          console.error(
            `[notifyApplicationEvent:${event}] email send failed → ${to}:`,
            err instanceof Error ? err.message : err,
          );
        }
      };

      const courseLine = courseTitle
        ? `<p style="margin:0 0 12px;"><strong>Course:</strong> ${escapeHtmlText(courseTitle)}</p>`
        : '';
      const { renderBrandedEmail } = await import('../integrations/email-template.js');
      const wrap = (heading: string, body: string) =>
        renderBrandedEmail({ heading, bodyHtml: body });

      switch (event) {
        case 'payment_received': {
          await send(studentEmail, 'Payment received',
            wrap('Payment received',
              `<p>Hi ${escapeHtmlText(app.name ?? 'there')},</p>${courseLine}<p>We have received your payment. Your counsellor will share the application form shortly.</p>`,
            ));
          if (counsellorEmail) {
            await send(counsellorEmail, 'Payment received from a lead',
              wrap('Payment received',
                `<p>${escapeHtmlText(app.name ?? '')} has paid the registration fee for ${escapeHtmlText(courseTitle)}. You can now send the application form.</p>`,
              ));
          }
          break;
        }
        case 'form_submitted': {
          await send(studentEmail, 'Application received',
            wrap('Application received',
              `<p>Hi ${escapeHtmlText(app.name ?? 'there')},</p>${courseLine}<p>Thank you. Your application has been submitted. We will email you once it has been reviewed.</p>`,
            ));
          if (counsellorEmail) {
            await send(counsellorEmail, 'Application form received from your lead',
              wrap('Application received',
                `<p>${escapeHtmlText(app.name ?? '')} has submitted their application for ${escapeHtmlText(courseTitle)}. Please review and approve.</p>`,
              ));
          }
          for (const admEmail of adminEmails) {
            await send(admEmail, 'Application awaiting admin approval',
              wrap('Awaiting admin approval',
                `<p>An application from ${escapeHtmlText(app.name ?? '')} for ${escapeHtmlText(courseTitle)} has been verified by the counsellor and is awaiting admin approval.</p>`,
              ));
          }
          break;
        }
        case 'rejected': {
          const reason = app.rejection_reason ? `<p><strong>Reason:</strong> ${escapeHtmlText(app.rejection_reason)}</p>` : '';
          await send(studentEmail, 'Application status update',
            wrap('Application not approved',
              `<p>Hi ${escapeHtmlText(app.name ?? 'there')},</p>${courseLine}<p>Unfortunately your application was not approved at this time.</p>${reason}<p>Please reach out to your counsellor if you have any questions.</p>`,
            ));
          if (counsellorEmail) {
            await send(counsellorEmail, 'Application rejected by Admin',
              wrap('Rejected by Admin',
                `<p>The application from ${escapeHtmlText(app.name ?? '')} for ${escapeHtmlText(courseTitle)} has been rejected by Admin.</p>${reason}`,
              ));
          }
          break;
        }
        case 'enrolment_confirmed': {
          await send(studentEmail, 'Welcome to TTII — your enrolment is confirmed',
            wrap('Enrolment confirmed',
              `<p>Hi ${escapeHtmlText(app.name ?? 'there')},</p>${courseLine}<p>Your enrolment is confirmed. You can sign in at <a href="https://learn.teachersindia.in">learn.teachersindia.in</a> with the credentials you received from us.</p><p>If you didn't receive credentials, please reply to this email and your counsellor will resend them.</p>`,
            ));
          if (counsellorEmail) {
            await send(counsellorEmail, 'Enrolment confirmed by Admin',
              wrap('Enrolment confirmed',
                `<p>${escapeHtmlText(app.name ?? '')} has been enrolled in ${escapeHtmlText(courseTitle)}.</p>`,
              ));
          }
          break;
        }
      }
    } catch {
      // silent: notifications are best-effort
    }
  }

  // Phase D (Naji 2026-05-05): magic-link application form. Counsellor
  // generates a tokenised URL the student can fill without logging in.
  async generateApplicationFormToken(
    actorUserId: string,
    applicationId: string,
    expiresInDays: number = 7,
  ): Promise<Record<string, unknown>> {
    const id = toIntId(applicationId);
    const actor = toNullableIntId(actorUserId);
    if (!id || !actor) return { status: 0, message: 'Invalid input.' };
    const app = await this.prisma.applications.findFirst({ where: { id, deleted_at: null }, select: { id: true, stage: true, user_email: true, name: true } });
    if (!app) return { status: 0, message: 'Application not found.' };
    if (app.stage !== 'paid' && app.stage !== 'form_pending') {
      return { status: 0, message: 'Application is not in a state that allows sending the form (must be Paid).' };
    }
    const token = (await import('node:crypto')).randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInDays * 86400 * 1000);
    await this.prisma.application_form_tokens.create({
      data: { application_id: id, token, expires_at: expiresAt, created_at: new Date() },
    });
    const now = new Date();
    await this.prisma.applications.update({
      where: { id },
      data: { stage: 'form_pending', updated_at: now, updated_by: actor },
    });
    await this.recordEvent(id, 'form_link_sent', `Application form link emailed to ${app.user_email ?? 'student'}`, actorUserId, {
      expires_at: expiresAt.toISOString(),
    });
    // Email the student the link.
    if (app.user_email) {
      try {
        const { createIntegrationRegistry } = await import('../integrations/registry.js');
        const { renderBrandedEmail } = await import('../integrations/email-template.js');
        const registry = createIntegrationRegistry();
        const url = `https://learn.teachersindia.in/apply/${token}`;
        const html = renderBrandedEmail({
          heading: 'Complete your application',
          preheader: 'Your registration is received — finish your application form to continue.',
          bodyHtml: `
            <p style="margin:0 0 12px;">Hi ${escapeHtmlText(app.name ?? 'there')},</p>
            <p style="margin:0 0 12px;">Thank you — your registration fee has been received. The next step is to fill in your full application details so the counsellor can review and confirm your enrolment.</p>
            <p style="margin:0;">The form takes about 5 minutes and lets you upload supporting documents.</p>
          `,
          cta: { label: 'Open Application Form', href: url },
          footerNote: `This link expires on ${expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`,
        });
        await registry.email.sendEmail({ to: app.user_email, subject: 'Complete your TTII application', html });
      } catch {
        // ignore; admin can resend
      }
    }
    return { status: 1, message: 'Application form link generated and emailed.', data: { token, expires_at: expiresAt.toISOString() } };
  }

  // Lightweight token lookup for the public upload endpoint. Returns
  // the raw row so the route can check expires_at / used_at without
  // re-running the full hydration.
  async findApplicationFormToken(token: string): Promise<{ id: number; application_id: number; expires_at: Date; used_at: Date | null } | null> {
    if (!token) return null;
    const row = await this.prisma.application_form_tokens.findFirst({
      where: { token },
      select: { id: true, application_id: true, expires_at: true, used_at: true },
    });
    return row;
  }

  async getApplicationByToken(token: string): Promise<Record<string, unknown>> {
    if (!token) return { status: 0, message: 'Invalid token.' };
    const row = await this.prisma.application_form_tokens.findFirst({
      where: { token },
      select: { id: true, application_id: true, expires_at: true, used_at: true, draft_data: true },
    });
    if (!row) return { status: 0, message: 'Token not found.' };
    if (row.used_at) return { status: 0, message: 'This application has already been submitted.' };
    if (row.expires_at < new Date()) return { status: 0, message: 'This link has expired.' };
    const app = await this.prisma.applications.findFirst({
      where: { id: row.application_id, deleted_at: null },
      select: {
        id: true, name: true, user_email: true, phone: true, country_code: true,
        date_of_birth: true, gender: true, nationality: true, marital_status: true,
        father_name: true, mother_name: true, guardian_name: true, aadhar_no: true, passport_no: true,
        address: true, native_address: true, country_id: true, state: true, district: true,
        highest_qualification: true, previous_school: true, year_of_passing: true,
        percentage_or_grade: true, teaching_experience: true, employment_status: true,
        organization_name: true, experience_years: true, designation: true,
        course_id: true, offering_id: true,
      },
    });
    if (!app) return { status: 0, message: 'Application missing.' };
    let draft: unknown = null;
    if (row.draft_data) {
      try { draft = JSON.parse(row.draft_data); } catch { draft = null; }
    }
    // Naji 2026-05-08 — also surface education_pathway so the public
    // form can prefill the editor on load.
    // Naji UAT 2026-05-31 — the public form must show the Course +
    // Offering read-only at the top, and drive the Documents section
    // from the course's required-documents config. Look up the course
    // title, offering title, and the per-course required document slots.
    const [educationPathway, course, offering, reqLinks, docTypes] = await Promise.all([
      this.prisma.application_education_pathway.findMany({
        where: { application_id: row.application_id },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
      }),
      app.course_id ? this.prisma.course.findFirst({ where: { id: app.course_id }, select: { id: true, title: true } }) : null,
      app.offering_id ? this.prisma.offerings.findFirst({ where: { id: app.offering_id }, select: { id: true, title: true, offering_code: true } }) : null,
      app.course_id
        ? this.prisma.course_required_documents.findMany({
            where: { course_id: app.course_id, deleted_at: null },
            orderBy: [{ position: 'asc' }, { document_type_id: 'asc' }],
          })
        : [],
      this.prisma.document_types.findMany({ where: { deleted_at: null }, select: { id: true, label: true } }),
    ]);
    const docTypeLabelById = new Map(docTypes.map((t) => [t.id, t.label]));
    const requiredDocuments = reqLinks.map((l) => ({
      document_type_id: l.document_type_id,
      label: docTypeLabelById.get(l.document_type_id) ?? `#${l.document_type_id}`,
      is_mandatory: Boolean(l.is_mandatory),
    }));
    return {
      status: 1,
      data: {
        application: app,
        draft,
        education_pathway: educationPathway,
        course: course ? { id: String(course.id), title: course.title ?? '' } : null,
        offering: offering ? { id: String(offering.id), title: offering.title ?? '', offering_code: offering.offering_code ?? '' } : null,
        required_documents: requiredDocuments,
      },
    };
  }

  async saveApplicationFormDraft(token: string, draftJson: string): Promise<Record<string, unknown>> {
    if (!token) return { status: 0, message: 'Invalid token.' };
    const row = await this.prisma.application_form_tokens.findFirst({ where: { token }, select: { id: true, used_at: true, expires_at: true } });
    if (!row) return { status: 0, message: 'Token not found.' };
    if (row.used_at) return { status: 0, message: 'Already submitted.' };
    if (row.expires_at < new Date()) return { status: 0, message: 'Link expired.' };
    await this.prisma.application_form_tokens.update({
      where: { id: row.id },
      data: { draft_data: draftJson },
    });
    return { status: 1, message: 'Draft saved.' };
  }

  async submitApplicationForm(
    token: string,
    formData: Record<string, unknown>,
    signature: string,
    documents?: Array<{ name: string; url: string; key?: string; size?: number; contentType?: string }>,
    educationPathway?: Array<{ qualification: string; specialization: string; institution: string; board: string; year_passed: string; marks: string }>,
  ): Promise<Record<string, unknown>> {
    if (!token) return { status: 0, message: 'Invalid token.' };
    const row = await this.prisma.application_form_tokens.findFirst({ where: { token }, select: { id: true, application_id: true, used_at: true, expires_at: true } });
    if (!row) return { status: 0, message: 'Token not found.' };
    if (row.used_at) return { status: 0, message: 'Already submitted.' };
    if (row.expires_at < new Date()) return { status: 0, message: 'Link expired.' };
    const f = formData;
    const fullName = `${toStringValue(f.first_name)} ${toStringValue(f.last_name)}`.trim();
    const now = new Date();
    let age: number | null = null;
    const dobStr = toStringValue(f.date_of_birth);
    if (dobStr) {
      const dob = new Date(dobStr);
      if (!Number.isNaN(dob.getTime())) {
        age = Math.floor((now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      }
    }
    // Stash uploaded documents on the legacy `biography` JSON column —
    // ViewStudentPage already reads documents from there. Preserves any
    // existing biography content.
    let biographyJson: string | null = null;
    if (documents && documents.length > 0) {
      const existing = await this.prisma.applications.findFirst({
        where: { id: row.application_id }, select: { biography: true },
      });
      let existingObj: Record<string, unknown> = {};
      if (existing?.biography) {
        try {
          const parsed: unknown = JSON.parse(existing.biography);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            existingObj = parsed as Record<string, unknown>;
          }
        } catch { /* not JSON, overwrite */ }
      }
      biographyJson = JSON.stringify({ ...existingObj, documents });
    }
    // Naji 2026-05-08 — public apply form was missing Contact section,
    // Specialization, and Education Pathway. Now persist them too.
    const emailIn = toStringValue(f.email);
    const phoneIn = toStringValue(f.phone);
    const altPhoneIn = toStringValue(f.alternate_phone);
    const whatsAppIn = toStringValue(f.whatsapp_no);
    const countryCodeIn = toStringValue(f.country_code).replace(/^\+/, '');
    const photoUrlIn = toStringValue(f.photo_url);
    const specializationIn = toStringValue(f.specialization);
    // Stash specialization in biography JSON (no top-level column for it).
    if (specializationIn) {
      const existing = await this.prisma.applications.findFirst({ where: { id: row.application_id }, select: { biography: true } });
      let bioObj: Record<string, unknown> = {};
      if (existing?.biography) {
        try {
          const parsed: unknown = JSON.parse(existing.biography);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) bioObj = parsed as Record<string, unknown>;
        } catch { /* ignore */ }
      }
      bioObj.specialization = specializationIn;
      // Re-stringify; merges with any documents we persisted above.
      const merged = JSON.stringify({
        ...bioObj,
        ...(documents && documents.length > 0 ? { documents } : {}),
      });
      biographyJson = merged;
    }

    await this.prisma.applications.update({
      where: { id: row.application_id },
      data: {
        ...(fullName ? { name: fullName } : {}),
        date_of_birth: dobStr ? new Date(dobStr) : null,
        age,
        gender: toNullableString(f.gender),
        nationality: toNullableString(f.nationality),
        marital_status: toNullableString(f.marital_status),
        father_name: toNullableString(f.father_name),
        mother_name: toNullableString(f.mother_name),
        guardian_name: toNullableString(f.guardian_name),
        aadhar_no: toNullableString(f.aadhar_no),
        passport_no: toNullableString(f.passport_no),
        ...(emailIn ? { user_email: emailIn } : {}),
        ...(phoneIn ? { phone: phoneIn } : {}),
        ...(countryCodeIn ? { country_code: `+${countryCodeIn}` } : {}),
        ...(altPhoneIn ? { second_phone: altPhoneIn } : {}),
        // Naji UAT 2026-05-16 — the legacy whatsapp_no Int column
        // overflows on 10+ digit phone numbers (max signed Int =
        // 2.1bn; Indian phone with cc = ~9.1bn). The canonical value
        // lives in the `whatsapp` VARCHAR column, and getApplication
        // / getStudentDetail mirror it onto `whatsapp_no` on read.
        // Keep the Int write at 0 so the public form submit stops
        // crashing with "Value out of range".
        ...(whatsAppIn ? { whatsapp: whatsAppIn, whatsapp_no: 0 } : {}),
        ...(photoUrlIn ? { image: photoUrlIn } : {}),
        address: toNullableString(f.address),
        native_address: toNullableString(f.native_address),
        state: toNullableString(f.state),
        district: toNullableString(f.district),
        highest_qualification: toNullableString(f.highest_qualification),
        previous_school: toNullableString(f.previous_school),
        year_of_passing: toNullableString(f.year_of_passing),
        percentage_or_grade: toNullableString(f.percentage_or_grade),
        teaching_experience: toNullableString(f.teaching_experience),
        employment_status: toNullableString(f.employment_status),
        organization_name: toNullableString(f.organization_name),
        experience_years: toNullableString(f.experience_years),
        designation: toNullableString(f.designation),
        signature_data: signature || null,
        ...(biographyJson !== null ? { biography: biographyJson } : {}),
        // Naji UAT 2026-05-31 — the counsellor-approve step is removed.
        // A submitted form goes straight to approval_waiting for Admin review.
        stage: 'approval_waiting',
        updated_at: now,
      },
    });
    // Naji 2026-05-08 — replace any existing pathway rows with the
    // submitted set. Idempotent across draft re-submits.
    if (educationPathway && educationPathway.length > 0) {
      await this.prisma.application_education_pathway.deleteMany({ where: { application_id: row.application_id } });
      await this.prisma.application_education_pathway.createMany({
        data: educationPathway.map((r, idx) => ({
          application_id: row.application_id,
          qualification: r.qualification,
          specialization: r.specialization || null,
          institution: r.institution || null,
          board: r.board || null,
          year_passed: r.year_passed || null,
          marks: r.marks || null,
          position: idx * 10,
          created_at: now,
          updated_at: now,
        })),
      });
    }

    await this.prisma.application_form_tokens.update({
      where: { id: row.id },
      data: { used_at: now },
    });
    await this.recordEvent(row.application_id, 'form_submitted', 'Applicant submitted the application form', null);
    await this.notifyApplicationEvent(row.application_id, 'form_submitted');
    return { status: 1, message: 'Application submitted.', data: { application_id: row.application_id } };
  }

  // Phase C (Naji 2026-05-05): Payment link generation. Builds the
  // payment plan (full or installment), calls Razorpay Payment Links
  // API, persists everything on the application row, transitions stage
  // to 'payment_pending', and emails the student the link + plan.
  // Keep only prior ledger entries that still map to the SAME instalment in a
  // rewritten plan (valid index AND matching amount). Guards against a
  // deleted/reordered row silently reattaching an "approved/Paid" status to a
  // different, unpaid instalment — which would also bypass the strict
  // one-by-one approval gate. Entries that no longer match are dropped (safe:
  // that instalment simply reverts to unpaid, same as the old full-wipe).
  private preserveLedgerEntries(
    prior: unknown,
    installments: Array<{ label?: string; amountMinor?: number; amount_minor?: number }>,
  ): unknown[] | undefined {
    if (!Array.isArray(prior)) return undefined;
    const kept = prior.filter((e) => {
      if (!e || typeof e !== 'object') return false;
      const idx = Number((e as { index?: unknown }).index);
      if (!Number.isInteger(idx) || idx < 0 || idx >= installments.length) return false;
      const row = installments[idx];
      if (!row) return false;
      const ledgerAmt = Number((e as { amount_minor?: unknown }).amount_minor);
      if (Number.isFinite(ledgerAmt) && ledgerAmt > 0) {
        const rowAmt = Number(row.amountMinor ?? row.amount_minor ?? 0);
        if (rowAmt !== ledgerAmt) return false;
      }
      return true;
    });
    return kept.length > 0 ? kept : undefined;
  }

  async generatePaymentLink(
    actorUserId: string,
    input: {
      applicationId: string;
      mode: 'full' | 'installment';
      registrationFee?: number; // installment only: amount due now (minor)
      totalAmount: number; // total course fee (minor)
      installments?: Array<{ label: string; amountMinor: number; dueDate: string; gstPercent?: number }>; // schedule for the plan PDF
      additionalDiscounts?: Array<{ description: string; amount: number }>; // audit trail of manual discount lines
      expiresInDays?: number; // payment-link expiry, default 7
    },
  ): Promise<Record<string, unknown>> {
    const id = toIntId(input.applicationId);
    const actor = toNullableIntId(actorUserId);
    if (!id || !actor) return { status: 0, message: 'Invalid input.' };

    const app = await this.prisma.applications.findFirst({
      where: { id, deleted_at: null },
      select: {
        id: true, application_id: true, name: true, user_email: true, phone: true, payment_plan: true,
        payment_status: true,
        student_id: true, course_id: true, offering_id: true, stage: true, is_converted: true, pipeline_user: true,
      },
    });
    if (!app) return { status: 0, message: 'Application not found.' };
    if (!app.user_email) return { status: 0, message: 'Application has no email.' };
    if (input.totalAmount <= 0) return { status: 0, message: 'Total amount must be > 0.' };

    // Anti double-bill (Naji 2026-07-09): both link modes charge the registration
    // / index-0 payment (full mode charges the whole fee; installment mode charges
    // plan[0] = reg). If reg is already settled — paid online via the link
    // (payment_status='paid' → synthetic approved index 0) or manual-approved (an
    // approved ledger entry at index 0) — issuing another link would re-charge the
    // student. Refuse and point at Save / Edit Plan (savePaymentPlan), which
    // updates the schedule WITHOUT a link. Later instalments use a separate path,
    // so this never blocks a legitimate next-instalment link.
    const priorPlanObj: Record<string, unknown> | null = app.payment_plan
      ? (() => { try { return JSON.parse(app.payment_plan) as Record<string, unknown>; } catch { return null; } })()
      : null;
    // NB: call readInstalmentLedger even when payment_plan is null/malformed — it
    // still synthesises an approved index 0 from payment_status='paid' alone, so a
    // legacy already-paid row with no JSON plan is still caught (fail-safe).
    const settledLedger = readInstalmentLedger(priorPlanObj ?? {}, app.payment_status ?? undefined);
    if (settledLedger.some((e) => e.index === 0 && e.status === 'approved')) {
      return {
        status: 0,
        message: 'Registration fee is already paid for this student. Use Save / Edit Plan to update the schedule without resending the payment link.',
      };
    }

    // Preserve enrolment: when this runs for an already-enrolled student (the
    // Generate / Edit Payment Plan action on the admin Student page), the plan +
    // link are (re)written but the application's stage/payment_status must NOT
    // regress back into the lead funnel (Naji 2026-07-05). Leads are unaffected.
    const alreadyEnrolled = app.stage === 'enrolled' || app.is_converted === 1;

    const amountMinor = input.mode === 'full'
      ? input.totalAmount
      : (input.registrationFee && input.registrationFee > 0 ? input.registrationFee : 0);
    if (amountMinor <= 0) return { status: 0, message: 'Payable amount must be > 0.' };

    const { createIntegrationRegistry } = await import('../integrations/registry.js');
    const registry = createIntegrationRegistry();
    if (typeof registry.payment.createPaymentLink !== 'function') {
      return { status: 0, message: 'Active payment provider does not support payment links.' };
    }

    const expireBy = Math.floor(Date.now() / 1000) + (input.expiresInDays ?? 7) * 86400;

    const courseTitle = app.course_id
      ? (await this.prisma.course.findFirst({ where: { id: app.course_id }, select: { title: true } }))?.title ?? ''
      : '';

    // Identify the payer in Razorpay (Naji 2026-07-09: the dashboard/app only
    // showed a payment id + void@razorpay.com, with no way to tell WHICH
    // student paid). Carry the student's TTS code (enrolled), the TTII
    // application reference, name, phone and course in the description + notes
    // so every payment is attributable in the Razorpay UI.
    const studentCode = app.student_id
      ? toStringValue((await this.prisma.users.findFirst({ where: { id: app.student_id }, select: { student_id: true } }))?.student_id)
      : '';
    const applicantRef = toStringValue(app.application_id) || `APP-${id}`;
    const payerRef = studentCode || applicantRef;
    const studentName = app.name ?? 'Student';
    // The specific instalment this link charges, for the Razorpay description +
    // notes — so Naji can tell "Registration Fee" vs "Reg Fee Balance" vs a course
    // instalment at a glance instead of a bare "installment" (Naji 2026-07-10).
    // This method always charges the due-now / index-0 row; match the charged
    // amount to a schedule row, else fall back to the first row's label.
    const chargedLabel = input.mode === 'full'
      ? 'Course fee (full payment)'
      : (input.installments?.find((r) => r.amountMinor === amountMinor)?.label
        || input.installments?.[0]?.label
        || 'Registration fee');
    const description = `${studentName} (${payerRef}) — ${courseTitle} — ${chargedLabel}`.slice(0, 250);

    let link;
    try {
      link = await registry.payment.createPaymentLink({
        amountMinor,
        currency: 'INR',
        description,
        customer: {
          name: studentName,
          email: app.user_email,
          ...(app.phone ? { phone: app.phone } : {}),
        },
        notes: {
          application_ref: applicantRef,
          student_name: studentName,
          ...(studentCode ? { student_id: studentCode } : {}),
          ...(app.phone ? { phone: app.phone } : {}),
          ...(courseTitle ? { course: courseTitle } : {}),
          // What this specific payment covers (Naji 2026-07-10) — e.g.
          // "Registration Fee — Due Now", "Course Fee Installment 1 of 5".
          installment: chargedLabel,
        },
        expireBy,
      });
    } catch (err) {
      return { status: 0, message: err instanceof Error ? err.message : 'Razorpay request failed.' };
    }

    // Preserve the per-instalment payment ledger + manual-payment record when
    // (re)writing the plan. Editing/resending a plan for a student who already
    // paid must NOT wipe their "Paid" status (Naji 2026-07-09). Entries stay
    // index-aligned to the installments array.
    const priorLedger: unknown = priorPlanObj?.instalment_payments;
    const priorManual: unknown = priorPlanObj?.manual_payment;
    const keptLedger = this.preserveLedgerEntries(priorLedger, input.installments ?? []);

    const planJson = JSON.stringify({
      mode: input.mode,
      total_amount_minor: input.totalAmount,
      registration_fee_minor: input.registrationFee ?? null,
      installments: input.installments ?? [],
      // Audit trail of any manual discount lines applied before sending the
      // link. Amounts are already baked into the totals above by the
      // frontend; this just records WHY the amount was reduced for Finance.
      additional_discounts: input.additionalDiscounts ?? [],
      ...(keptLedger ? { instalment_payments: keptLedger } : {}),
      ...(priorManual != null ? { manual_payment: priorManual } : {}),
    });

    const now = new Date();
    await this.prisma.applications.update({
      where: { id },
      data: {
        // Enrolled students keep their stage/payment_status; leads move into the
        // payment_pending funnel exactly as before.
        ...(alreadyEnrolled ? {} : { stage: 'payment_pending', payment_status: 'sent' }),
        payment_plan: planJson,
        payment_link_url: link.shortUrl,
        payment_link_id: link.paymentLinkId,
        payment_link_expires_at: new Date(expireBy * 1000),
        payment_method: 'razorpay',
        updated_at: now,
        updated_by: actor,
      },
    });
    // Email the student the link + plan summary. Razorpay also emails
    // its own checkout page when notify.email=true; this one carries
    // the human plan summary. Naji UAT 2026-05-14 — capture delivery
    // outcome and surface it in the response + event log; the previous
    // silent try/catch meant admins saw "emailed" even when MsGraph
    // bounced.
    let emailDelivered = false;
    let emailError: string | null = null;
    try {
      const { renderPaymentPlanEmail, renderFullPaymentEmail } = await import('../integrations/payment-emails.js');

      // Course Offering title — the select carries offering_id; resolve its
      // display title the same way the application read path does.
      const offeringTitle = app.offering_id
        ? (await this.prisma.offerings.findFirst({ where: { id: app.offering_id }, select: { title: true } }))?.title ?? ''
        : '';

      // Lead-owning counsellor — CC'd on the email so they keep a copy of
      // exactly what the student received, and shown as the contact on the
      // Payment Plan template (To: Lead, CC: Counsellor per Naji's sheet).
      const counsellor = app.pipeline_user
        ? await this.prisma.users.findFirst({
            where: { id: app.pipeline_user },
            select: { user_email: true, email: true, phone: true },
          })
        : null;
      const counsellorEmail = (counsellor?.user_email ?? counsellor?.email ?? '').trim();
      const counsellorPhone = (counsellor?.phone ?? '').trim();

      const firstName = (app.name ?? '').trim().split(/\s+/)[0] || 'there';
      const expiryDisplay = new Date(expireBy * 1000).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
      });

      let html: string;
      let subject: string;
      if (input.mode === 'installment') {
        html = renderPaymentPlanEmail({
          studentFirstName: firstName,
          courseName: courseTitle,
          offeringName: offeringTitle,
          instalments: (input.installments ?? []).map((i) => ({
            title: i.label,
            dueDate: i.dueDate,
            amount: i.amountMinor / 100,
          })),
          totalFee: input.totalAmount / 100,
          payNowAmount: amountMinor / 100,
          paymentLink: link.shortUrl,
          paymentExpiryDate: expiryDisplay,
          ...(counsellorEmail ? { counsellorEmail } : {}),
          ...(counsellorPhone ? { counsellorPhone } : {}),
        });
        subject = 'Your TTII payment plan';
      } else {
        // additionalDiscounts amounts are in rupees (audit lines already baked
        // into totalAmount by the frontend). Show them as the Discount row and
        // reconstruct the pre-discount course fee for the summary table.
        const discountAmount = (input.additionalDiscounts ?? []).reduce(
          (sum, d) => sum + (Number.isFinite(d.amount) && d.amount > 0 ? d.amount : 0),
          0,
        );
        html = renderFullPaymentEmail({
          studentFirstName: firstName,
          courseName: courseTitle,
          offeringName: offeringTitle,
          totalCourseFee: input.totalAmount / 100 + discountAmount,
          discountAmount,
          totalAmountPayable: input.totalAmount / 100,
          paymentLink: link.shortUrl,
          paymentDueDate: expiryDisplay,
        });
        subject = 'Complete your TTII payment';
      }

      await registry.email.sendEmail({
        to: app.user_email,
        ...(counsellorEmail ? { cc: [counsellorEmail] } : {}),
        subject,
        html,
      });
      emailDelivered = true;
    } catch (err) {
      emailError = err instanceof Error ? err.message : 'Unknown email error';
      // Log so the failure shows up in pm2 logs instead of disappearing.
      console.error(
        `[generatePaymentLink] email send failed for application ${id} → ${app.user_email}:`,
        emailError,
      );
    }

    await this.recordEvent(
      id,
      'payment_link_sent',
      emailDelivered
        ? `Payment link emailed to ${app.user_email} (${input.mode})`
        : `Payment link saved for ${app.user_email} (${input.mode}) — email delivery failed: ${emailError}`,
      actorUserId,
      {
        mode: input.mode,
        total_amount_minor: input.totalAmount,
        payment_link_url: link.shortUrl,
        email_delivered: emailDelivered,
        ...(emailError ? { email_error: emailError } : {}),
      },
    );

    return {
      status: 1,
      message: emailDelivered
        ? `Payment link generated and emailed to ${app.user_email}.`
        : `Payment link generated but the email to ${app.user_email} failed (${emailError}). Use Resend or check the address.`,
      data: {
        payment_link_url: link.shortUrl,
        payment_link_id: link.paymentLinkId,
        email_delivered: emailDelivered,
        ...(emailError ? { email_error: emailError } : {}),
      },
    };
  }

  /**
   * Naji 2026-07-29 — online payment link for instalment 2+ (the "Registration
   * Fee Balance" row and beyond). generatePaymentLink only ever charges the
   * index-0 registration amount and refuses once that row is settled, so there
   * was no way to collect the balance online.
   *
   * Deliberately a SEPARATE method rather than a flag on generatePaymentLink:
   * that one rewrites the whole plan and resets payment_status to 'sent', which
   * would wipe the index-0 "Paid" state (a registration paid online has no
   * explicit ledger row — readInstalmentLedger synthesises it from
   * payment_status='paid'). This method never touches the schedule, the stage
   * or payment_status; it only issues a link and tags it with the row it covers.
   *
   * Scoped to PRE-ENROLMENT on purpose. Once a student is enrolled the student
   * portal's own Pay Now derives the next unpaid instalment itself, so allowing
   * a second counsellor-issued link alongside it is a double-charge window.
   */
  async generateInstalmentPaymentLink(
    actorUserId: string,
    applicationId: string,
    instalmentIndex: number,
    expiresInDays = 7,
  ): Promise<Record<string, unknown>> {
    const id = toIntId(applicationId);
    const actor = toNullableIntId(actorUserId);
    if (!id || !actor) return { status: 0, message: 'Invalid input.' };
    const index = Math.trunc(instalmentIndex);
    if (!Number.isFinite(index) || index <= 0) {
      return { status: 0, message: 'Use the registration payment link for the first instalment.' };
    }

    const app = await this.prisma.applications.findFirst({
      where: { id, deleted_at: null },
      select: {
        id: true, application_id: true, name: true, user_email: true, phone: true,
        payment_plan: true, payment_status: true, student_id: true, course_id: true,
        stage: true, is_converted: true,
      },
    });
    if (!app) return { status: 0, message: 'Application not found.' };
    if (!app.user_email) return { status: 0, message: 'Application has no email.' };
    if (app.stage === 'rejected') {
      return { status: 0, message: 'This application is rejected. Reopen it before sending a payment link.' };
    }
    if (app.stage === 'enrolled' || app.is_converted === 1) {
      return {
        status: 0,
        message: 'This student is enrolled — they pay instalments themselves from the student portal (Payments → Pay Now). Use Record Payment to capture an offline payment.',
      };
    }

    let planObj: Record<string, unknown> = {};
    if (app.payment_plan) {
      try { planObj = JSON.parse(app.payment_plan) as Record<string, unknown>; } catch { planObj = {}; }
    }
    if (toStringValue(planObj.mode) !== 'installment') {
      return { status: 0, message: 'Payment links per instalment are only available on an instalment plan.' };
    }
    const rows = Array.isArray(planObj.installments) ? (planObj.installments as Record<string, unknown>[]) : [];
    const row = rows[index];
    if (!row) return { status: 0, message: 'That instalment does not exist on the plan.' };

    const amountMinor = Math.round(Number(row.amountMinor ?? row.amount_minor ?? 0));
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      return { status: 0, message: 'Payable amount must be > 0.' };
    }

    // Same strict one-by-one gate the UI shows and markApplicationPaidManual
    // enforces — a row is only payable once the one above it is approved.
    const ledger = readInstalmentLedger(planObj, app.payment_status ?? undefined);
    const prev = ledger.find((e) => e.index === index - 1);
    if (!prev || prev.status !== 'approved') {
      return { status: 0, message: 'The previous instalment must be paid and approved before this one can be collected.' };
    }
    const currentForIndex = ledger.find((e) => e.index === index);
    if (currentForIndex && currentForIndex.status !== 'rejected') {
      return {
        status: 0,
        message: currentForIndex.status === 'approved'
          ? 'This instalment is already paid.'
          : 'This instalment already has a payment awaiting Finance approval.',
      };
    }

    const { createIntegrationRegistry } = await import('../integrations/registry.js');
    const registry = createIntegrationRegistry();
    if (typeof registry.payment.createPaymentLink !== 'function') {
      return { status: 0, message: 'Active payment provider does not support payment links.' };
    }

    const courseTitle = app.course_id
      ? (await this.prisma.course.findFirst({ where: { id: app.course_id }, select: { title: true } }))?.title ?? ''
      : '';
    const studentCode = app.student_id
      ? toStringValue((await this.prisma.users.findFirst({ where: { id: app.student_id }, select: { student_id: true } }))?.student_id)
      : '';
    const applicantRef = toStringValue(app.application_id) || `APP-${id}`;
    const studentName = app.name ?? 'Student';
    const label = toStringValue(row.label) || `Instalment ${index + 1}`;
    const expireBy = Math.floor(Date.now() / 1000) + expiresInDays * 86400;

    let link;
    try {
      link = await registry.payment.createPaymentLink({
        amountMinor,
        currency: 'INR',
        description: `${studentName} (${studentCode || applicantRef}) — ${courseTitle} — ${label}`.slice(0, 250),
        customer: {
          name: studentName,
          email: app.user_email,
          ...(app.phone ? { phone: app.phone } : {}),
        },
        notes: {
          application_ref: applicantRef,
          student_name: studentName,
          ...(studentCode ? { student_id: studentCode } : {}),
          ...(app.phone ? { phone: app.phone } : {}),
          ...(courseTitle ? { course: courseTitle } : {}),
          installment: label,
          // The row this link settles. handleRazorpayWebhook reads this back to
          // mark the RIGHT instalment paid — without it a paid link just flips
          // payment_status and the balance row stays unpaid forever.
          instalment_index: String(index),
        },
        expireBy,
      });
    } catch (err) {
      return { status: 0, message: err instanceof Error ? err.message : 'Razorpay request failed.' };
    }

    // Record which row each issued link covers, keyed by link id. The webhook
    // prefers the note, but a link issued for row N overwrites
    // applications.payment_link_id, so this keeps older outstanding links
    // attributable instead of silently dropping their payment.
    const priorTargets = (planObj.link_targets && typeof planObj.link_targets === 'object')
      ? planObj.link_targets as Record<string, unknown>
      : {};
    planObj.link_targets = { ...priorTargets, [link.paymentLinkId]: index };

    const now = new Date();
    await this.prisma.applications.update({
      where: { id },
      data: {
        // NOTE: stage and payment_status are intentionally untouched.
        payment_plan: JSON.stringify(planObj),
        payment_link_url: link.shortUrl,
        payment_link_id: link.paymentLinkId,
        payment_link_expires_at: new Date(expireBy * 1000),
        updated_at: now,
        updated_by: actor,
      },
    });

    await this.recordEvent(
      id,
      'instalment_link_sent',
      `Payment link sent for ${label} (₹${(amountMinor / 100).toLocaleString('en-IN')})`,
      actorUserId,
      { instalment_index: index, amount_minor: amountMinor, link_id: link.paymentLinkId },
    );

    return {
      status: 1,
      message: `Payment link generated for ${label}.`,
      data: { payment_link_url: link.shortUrl, payment_link_id: link.paymentLinkId, instalment_index: index },
    };
  }

  // Naji 2026-05-08 — save the payment plan WITHOUT sending the link.
  // Used by the Save / Save & Close buttons in the Generate Payment Link
  // dialog so a counsellor can capture a draft plan and revisit it later
  // before emailing. Persists `payment_plan` JSON; does NOT create a
  // Razorpay link or change stage.
  async savePaymentPlan(
    actorUserId: string,
    applicationId: string,
    plan: {
      mode: 'full' | 'installment';
      totalAmountMinor: number;
      registrationFeeMinor?: number | null;
      installments?: Array<{ label: string; amountMinor: number; dueDate: string; gstPercent?: number }>;
      additionalDiscounts?: Array<{ description: string; amount: number }>;
    },
  ): Promise<Record<string, unknown>> {
    const id = toIntId(applicationId);
    const actor = toNullableIntId(actorUserId);
    if (!id || !actor) return { status: 0, message: 'Invalid input.' };
    const app = await this.prisma.applications.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, payment_plan: true },
    });
    if (!app) return { status: 0, message: 'Application not found.' };
    // Preserve the payment ledger + manual-payment record across a plan save,
    // so an already-paid instalment doesn't lose its "Paid" status (Naji
    // 2026-07-09). Index-aligned to the installments array.
    let priorLedger: unknown;
    let priorManual: unknown;
    if (app.payment_plan) {
      try {
        const prev = JSON.parse(app.payment_plan) as Record<string, unknown>;
        priorLedger = prev.instalment_payments;
        priorManual = prev.manual_payment;
      } catch { /* malformed prior plan — nothing to preserve */ }
    }
    const keptLedger = this.preserveLedgerEntries(priorLedger, plan.installments ?? []);
    const planJson = JSON.stringify({
      mode: plan.mode,
      total_amount_minor: plan.totalAmountMinor,
      registration_fee_minor: plan.registrationFeeMinor ?? null,
      installments: plan.installments ?? [],
      // Audit trail of manual discount lines (see generatePaymentLink). Totals
      // already reflect the reduction; this records the WHY for Finance.
      additional_discounts: plan.additionalDiscounts ?? [],
      saved_at: new Date().toISOString(),
      ...(keptLedger ? { instalment_payments: keptLedger } : {}),
      ...(priorManual != null ? { manual_payment: priorManual } : {}),
    });
    await this.prisma.applications.update({
      where: { id },
      data: {
        payment_plan: planJson,
        updated_at: new Date(),
        updated_by: actor,
      },
    });
    await this.recordEvent(id, 'payment_plan_saved', `Payment plan saved (${plan.mode})`, actorUserId, {
      mode: plan.mode,
      total_amount_minor: plan.totalAmountMinor,
    });
    return { status: 1, message: 'Payment plan saved.', data: { applicationId } };
  }

  // Manual mark-paid for cash / bank transfer / cheque / card.
  // Naji 2026-05-09 — captures structured Mode + Reference + Receipt
  // upload (URL). Reference + receipt URL are stashed inside the
  // payment_plan JSON under a `manual_payment` key (no schema change).
  async markApplicationPaidManual(
    actorUserId: string,
    applicationId: string,
    input: {
      mode?: string | undefined;
      reference?: string | undefined;
      receiptUrl?: string | undefined;
      note?: string | undefined;
      // Naji 2026-07-03 — the actual amount received for this manual payment
      // (rupees). Finance's Payment Approval shows this instead of the plan total.
      amount?: number | undefined;
      // Naji 2026-07-04 — the date the payment was actually received (YYYY-MM-DD).
      paidDate?: string | undefined;
      // Naji 2026-07-04 — which instalment this payment is for (0 = registration).
      // Strict one-by-one: index N is only accepted once N-1 is approved.
      installmentIndex?: number | undefined;
    } = {},
  ): Promise<Record<string, unknown>> {
    const id = toIntId(applicationId);
    const actor = toNullableIntId(actorUserId);
    if (!id || !actor) return { status: 0, message: 'Invalid input.' };
    const now = new Date();

    // Read existing payment_plan so we can stash manual_payment metadata
    // alongside the plan rows without losing them.
    const existing = await this.prisma.applications.findFirst({
      where: { id, deleted_at: null },
      select: { payment_plan: true, payment_status: true },
    });
    let planObj: Record<string, unknown> = {};
    if (existing?.payment_plan) {
      try { planObj = JSON.parse(existing.payment_plan) as Record<string, unknown>; }
      catch { planObj = {}; }
    }

    const index = input.installmentIndex != null && input.installmentIndex > 0 ? Math.trunc(input.installmentIndex) : 0;
    const ledger = readInstalmentLedger(planObj, existing?.payment_status ?? undefined);
    // Strict one-by-one gate (enforced server-side, not just the UI): a later
    // instalment can only be recorded once the previous one is approved.
    if (index > 0) {
      const prev = ledger.find((e) => e.index === index - 1);
      if (!prev || prev.status !== 'approved') {
        return { status: 0, message: 'The previous instalment must be approved by Finance before you can record this one.' };
      }
    }
    // A pending/approved payment already exists for this row → block a duplicate.
    const currentForIndex = ledger.find((e) => e.index === index);
    if (currentForIndex && currentForIndex.status !== 'rejected') {
      return {
        status: 0,
        message: currentForIndex.status === 'approved'
          ? 'This instalment is already paid.'
          : 'This instalment already has a payment awaiting Finance approval.',
      };
    }

    const entry: InstalmentLedgerEntry = {
      index,
      mode: input.mode ?? 'manual',
      reference: input.reference ?? '',
      receipt_url: input.receiptUrl ?? '',
      note: input.note ?? '',
      // Store the actual amount received in minor units (paise) to match the
      // rest of the plan JSON. Null when the recorder didn't supply one.
      amount_minor: input.amount != null && input.amount > 0 ? Math.round(input.amount * 100) : null,
      // The date the payment was actually received (YYYY-MM-DD). Null when not
      // supplied; Payment Approval falls back to the recorded date.
      paid_date: input.paidDate && /^\d{4}-\d{2}-\d{2}$/.test(input.paidDate) ? input.paidDate : null,
      marked_at: now.toISOString(),
      marked_by: actor,
      status: 'pending_approval',
    };
    // Upsert by index — never clobber sibling instalments' records.
    planObj.instalment_payments = [...ledger.filter((e) => e.index !== index), entry].sort((a, b) => a.index - b.index);
    // Legacy mirror (single object) so older readers keep rendering the latest.
    planObj.manual_payment = {
      mode: entry.mode,
      reference: entry.reference,
      receipt_url: entry.receipt_url,
      note: entry.note,
      amount_minor: entry.amount_minor,
      paid_date: entry.paid_date,
      marked_at: entry.marked_at,
      marked_by: entry.marked_by,
    };

    // Naji UAT 2026-05-31 — manual payments no longer reflect immediately.
    // They enter `pending_approval`; the Finance team approves them under
    // Fee Information → Payment Approval, and only then does the application
    // flip to paid + notify. Razorpay (auto) payments bypass this via the
    // webhook handler below. We deliberately DON'T touch `stage` or
    // `payment_marked_paid_at` here — those are set on approval.
    await this.prisma.applications.update({
      where: { id },
      data: {
        payment_status: 'pending_approval',
        payment_method: input.mode || 'manual',
        payment_plan: JSON.stringify(planObj),
        updated_at: now,
        updated_by: actor,
      },
    });

    // Notify Finance that a manual payment is awaiting approval (Naji 2026-07-04,
    // "Ready in Lovable — Payment Approval"). To: accounts mailbox, no CC.
    // Best-effort: a mail failure must never fail the record action, mirroring
    // generatePaymentLink's pattern.
    try {
      const [appInfo, actorUser] = await Promise.all([
        this.prisma.applications.findFirst({
          where: { id },
          select: { application_id: true, name: true, student_id: true, course_id: true, offering_id: true },
        }),
        this.prisma.users.findFirst({ where: { id: actor }, select: { name: true } }),
      ]);
      if (appInfo) {
        const [course, offering] = await Promise.all([
          appInfo.course_id
            ? this.prisma.course.findFirst({ where: { id: appInfo.course_id }, select: { title: true } })
            : Promise.resolve(null),
          appInfo.offering_id
            ? this.prisma.offerings.findFirst({ where: { id: appInfo.offering_id }, select: { title: true } })
            : Promise.resolve(null),
        ]);

        const installments = Array.isArray(planObj.installments)
          ? (planObj.installments as Record<string, unknown>[])
          : [];
        const instRow = installments[index];
        const instLabel =
          instRow && typeof instRow.label === 'string' && instRow.label.trim() !== ''
            ? instRow.label
            : index === 0 ? 'Registration' : `Instalment ${index}`;

        // Amount received: captured amount → that instalment's plan amount → plan total.
        const instMinor = instRow ? Number(instRow.amountMinor ?? instRow.amount_minor ?? 0) : 0;
        const totalMinor = Number(planObj.total_amount_minor ?? 0);
        const amountMinorForMail =
          entry.amount_minor && entry.amount_minor > 0
            ? entry.amount_minor
            : instMinor > 0
              ? instMinor
              : totalMinor > 0
                ? totalMinor
                : 0;

        const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const fmtYmd = (ymd: string): string => {
          const parts = ymd.split('-');
          const y = parts[0];
          const mo = Number(parts[1]);
          const d = Number(parts[2]);
          if (!y || !Number.isFinite(mo) || !Number.isFinite(d)) return ymd;
          return `${d} ${MONTHS[mo - 1] ?? ''} ${y}`;
        };
        const istYmd = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const paymentDate = entry.paid_date ? fmtYmd(entry.paid_date) : fmtYmd(istYmd);
        const recordedDateTime = now.toLocaleString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
        });

        const { renderPaymentApprovalEmail } = await import('../integrations/payment-emails.js');
        const { createIntegrationRegistry } = await import('../integrations/registry.js');
        const registry = createIntegrationRegistry();
        const html = renderPaymentApprovalEmail({
          studentName: appInfo.name ?? '',
          applicationId: appInfo.application_id ?? String(id),
          studentId: appInfo.student_id != null ? String(appInfo.student_id) : '',
          courseName: course?.title ?? '',
          offeringName: offering?.title ?? '',
          instalmentLabel: instLabel,
          amount: amountMinorForMail / 100,
          paymentMethod: entry.mode,
          paymentDate,
          transactionReference: entry.reference,
          recordedByName: actorUser?.name ?? '',
          recordedDateTime,
        });
        await registry.email.sendEmail({
          to: env.ACCOUNTS_EMAIL,
          subject: `Payment approval required — ${appInfo.name ?? appInfo.application_id ?? String(id)}`,
          html,
        });
      }
    } catch (err) {
      console.error(
        `[markApplicationPaidManual] finance approval notification failed for application ${id}:`,
        err instanceof Error ? err.message : err,
      );
    }

    await this.recordEvent(id, 'payment_pending_approval', `Manual payment recorded via ${input.mode || 'manual'}${input.reference ? ` (ref: ${input.reference})` : ''} — awaiting finance approval`, actorUserId, {
      mode: input.mode,
      reference: input.reference,
      receipt_url: input.receiptUrl,
    });
    return { status: 1, message: 'Manual payment recorded — pending finance approval.' };
  }

  // ── Payment Approval (Finance) ────────────────────────────────────────
  // Naji UAT 2026-05-31 — Finance reviews manual (Mark Paid) payments before
  // they reflect to the student. Razorpay payments never appear here.

  async listPaymentApprovals(actorUserId: string): Promise<Record<string, unknown>[]> {
    // Counsellors only see their own leads' pending approvals; admins see all.
    const scope = await this.applicationOwnerScope(actorUserId);
    const apps = await this.prisma.applications.findMany({
      where: { payment_status: 'pending_approval', deleted_at: null, ...scope },
      orderBy: { updated_at: 'desc' },
    });
    if (apps.length === 0) return [];
    const courseIds = [...new Set(apps.map((a) => a.course_id).filter((c): c is number => !!c))];
    const courses = courseIds.length
      ? await this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
      : [];
    const courseMap = new Map(courses.map((c) => [c.id, c.title ?? '']));
    // One queue row PER pending instalment payment (Naji 2026-07-04). A row id
    // is "<appId>" for the registration (index 0, backward compatible with the
    // old whole-application queue) and "<appId>-<index>" for later instalments.
    const rows: Record<string, unknown>[] = [];
    for (const a of apps) {
      let plan: Record<string, unknown> = {};
      if (a.payment_plan) {
        try { plan = JSON.parse(a.payment_plan) as Record<string, unknown>; }
        catch { plan = {}; }
      }
      const installments = Array.isArray(plan.installments) ? (plan.installments as Record<string, unknown>[]) : [];
      const totalMinor = Number(plan.total_amount_minor ?? 0);
      const ledger = readInstalmentLedger(plan, a.payment_status ?? undefined);
      const pending = ledger.filter((e) => e.status === 'pending_approval');
      for (const entry of pending) {
        // Amount: exact captured amount → that instalment's inc-GST amount
        // (gstPercent is 0 when GST is "included", correct under both treatments)
        // → plan total, so nothing renders blank.
        const receivedMinor = entry.amount_minor ?? 0;
        const instRow = installments[entry.index];
        let instalmentInr = 0;
        if (instRow) {
          const base = Number(instRow.amountMinor ?? instRow.amount_minor ?? 0) / 100;
          const gst = Number(instRow.gstPercent ?? instRow.gst_percent ?? 0);
          if (base > 0) instalmentInr = base + (base * gst) / 100;
        }
        const label = instRow ? toStringValue(instRow.label) : '';
        // Date of payment: captured paid_date → "Paid on YYYY-MM-DD" in the note
        // → the recorded date. Never blank.
        const paidOnNote = /Paid on (\d{4}-\d{2}-\d{2})/.exec(entry.note);
        const paidDate =
          (entry.paid_date ?? '')
          || (paidOnNote?.[1] ?? '')
          || entry.marked_at.slice(0, 10)
          || (a.updated_at ? new Date(a.updated_at).toISOString().slice(0, 10) : '');
        rows.push({
          id: entry.index > 0 ? `${a.id}-${entry.index}` : String(a.id),
          application_id: a.application_id ?? '',
          name: a.name ?? '',
          email: a.user_email ?? '',
          course_title: a.course_id ? courseMap.get(a.course_id) ?? '' : '',
          instalment: label || (entry.index === 0 ? 'Registration' : `Instalment ${entry.index}`),
          amount: receivedMinor > 0
            ? receivedMinor / 100
            : instalmentInr > 0
              ? instalmentInr
              : totalMinor > 0
                ? totalMinor / 100
                : null,
          mode: entry.mode || a.payment_method || 'manual',
          reference: entry.reference,
          receipt_url: entry.receipt_url ? toLegacyFileUrl(entry.receipt_url) : '',
          note: entry.note,
          paid_date: paidDate,
          marked_at: entry.marked_at,
          updated_at: a.updated_at,
        });
      }
    }
    return rows;
  }

  // rowId is "<appId>" (registration / legacy) or "<appId>-<index>" for a later
  // instalment (Naji 2026-07-04). Approving advances only that instalment.
  async approveManualPayment(actorUserId: string, rowId: string): Promise<Record<string, unknown>> {
    const { applicationId, index } = parseApprovalRowId(rowId);
    const id = toIntId(applicationId);
    const actor = toNullableIntId(actorUserId);
    if (!id || !actor) return { status: 0, message: 'Invalid input.' };
    const app = await this.prisma.applications.findFirst({
      where: { id, deleted_at: null },
      select: { payment_status: true, payment_plan: true, stage: true, is_converted: true },
    });
    if (!app) return { status: 0, message: 'Application not found.' };
    // An already-enrolled student's registration approval must NOT regress the
    // stage or re-fire the enrolment notification (Naji 2026-07-05).
    const alreadyEnrolled = app.stage === 'enrolled' || app.is_converted === 1;
    let planObj: Record<string, unknown> = {};
    if (app.payment_plan) { try { planObj = JSON.parse(app.payment_plan) as Record<string, unknown>; } catch { planObj = {}; } }
    const ledger = readInstalmentLedger(planObj, app.payment_status ?? undefined);
    const entry = ledger.find((e) => e.index === index);
    if (!entry || entry.status !== 'pending_approval') {
      return { status: 0, message: 'This payment is not awaiting approval.' };
    }
    const now = new Date();
    const nextLedger = ledger.map((e) =>
      e.index === index ? { ...e, status: 'approved' as const, decided_at: now.toISOString(), decided_by: actor } : e,
    );
    planObj.instalment_payments = nextLedger;

    if (index === 0 && !alreadyEnrolled) {
      // Registration approval keeps the existing behavior: the application flips
      // to paid and the payment_received notification fires (the enrolment trigger).
      await this.prisma.applications.update({
        where: { id },
        data: {
          stage: 'paid',
          payment_status: 'paid',
          payment_marked_paid_at: now,
          payment_marked_paid_by: actor,
          payment_plan: JSON.stringify(planObj),
          updated_at: now,
          updated_by: actor,
        },
      });
      await this.recordEvent(id, 'payment_approved', 'Registration payment approved by finance', actorUserId, {});
      await this.notifyApplicationEvent(id, 'payment_received');
    } else {
      // A later instalment — OR any approval for an already-enrolled student —
      // only advances the ledger + the coarse rollup; it must NOT re-flip stage
      // or re-fire the enrolment notification.
      const rollup = rollupPaymentStatus(nextLedger);
      await this.prisma.applications.update({
        where: { id },
        data: {
          ...(rollup ? { payment_status: rollup } : {}),
          payment_plan: JSON.stringify(planObj),
          updated_at: now,
          updated_by: actor,
        },
      });
      await this.recordEvent(id, 'payment_approved', `${index === 0 ? 'Registration' : `Instalment ${index}`} payment approved by finance`, actorUserId, { instalment_index: index });
    }
    return { status: 1, message: 'Payment approved.' };
  }

  async rejectManualPayment(actorUserId: string, rowId: string, reason: string): Promise<Record<string, unknown>> {
    const { applicationId, index } = parseApprovalRowId(rowId);
    const id = toIntId(applicationId);
    const actor = toNullableIntId(actorUserId);
    if (!id || !actor) return { status: 0, message: 'Invalid input.' };
    const app = await this.prisma.applications.findFirst({
      where: { id, deleted_at: null },
      select: { payment_status: true, payment_plan: true },
    });
    if (!app) return { status: 0, message: 'Application not found.' };
    let planObj: Record<string, unknown> = {};
    if (app.payment_plan) { try { planObj = JSON.parse(app.payment_plan) as Record<string, unknown>; } catch { planObj = {}; } }
    const ledger = readInstalmentLedger(planObj, app.payment_status ?? undefined);
    const entry = ledger.find((e) => e.index === index);
    if (!entry || entry.status !== 'pending_approval') {
      return { status: 0, message: 'This payment is not awaiting approval.' };
    }
    const now = new Date();
    const nextLedger = ledger.map((e) =>
      e.index === index
        ? { ...e, status: 'rejected' as const, decided_at: now.toISOString(), decided_by: actor, ...(reason ? { reject_reason: reason } : {}) }
        : e,
    );
    planObj.instalment_payments = nextLedger;
    // Registration reject → 'payment_rejected' (existing behavior). A later
    // instalment reject leaves the app paid (registration is already settled).
    const rollup = rollupPaymentStatus(nextLedger);
    await this.prisma.applications.update({
      where: { id },
      data: {
        payment_status: index === 0 ? 'payment_rejected' : (rollup ?? 'payment_rejected'),
        payment_plan: JSON.stringify(planObj),
        updated_at: now,
        updated_by: actor,
      },
    });
    await this.recordEvent(id, 'payment_rejected', `${index === 0 ? 'Registration' : `Instalment ${index}`} payment rejected by finance${reason ? `: ${reason}` : ''}`, actorUserId, { reason, instalment_index: index });
    return { status: 1, message: 'Payment rejected.' };
  }

  /**
   * Mark instalment `index` paid from a settled Razorpay link. Writes an
   * APPROVED ledger entry (the money is already in — there is nothing for
   * Finance to verify, unlike a manually recorded payment).
   *
   * Spreads readInstalmentLedger's output rather than the raw array on purpose:
   * a registration paid online has no explicit row, it is synthesised from
   * payment_status='paid'. Writing only the new entry would drop that synthetic
   * index-0 approval and make the registration look unpaid again.
   */
  private async settleInstalmentFromLink(
    applicationId: number,
    index: number,
    linkId: string,
    planJson: string | null,
    paymentStatus: string | null,
  ): Promise<void> {
    let planObj: Record<string, unknown> = {};
    if (planJson) {
      try { planObj = JSON.parse(planJson) as Record<string, unknown>; } catch { planObj = {}; }
    }
    const ledger = readInstalmentLedger(planObj, paymentStatus ?? undefined);
    const already = ledger.find((e) => e.index === index);
    if (already && already.status === 'approved') return; // idempotent: webhooks retry

    const rows = Array.isArray(planObj.installments) ? (planObj.installments as Record<string, unknown>[]) : [];
    const amountMinor = rows[index]
      ? Math.round(Number(rows[index]?.amountMinor ?? rows[index]?.amount_minor ?? 0)) || null
      : null;
    const now = new Date();
    const entry: InstalmentLedgerEntry = {
      index,
      mode: 'razorpay',
      reference: linkId,
      receipt_url: '',
      note: 'Paid online via payment link',
      amount_minor: amountMinor,
      // IST calendar day, not the server's UTC one — a payment made between
      // midnight and 05:30 IST would otherwise be dated to the previous day.
      paid_date: now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
      marked_at: now.toISOString(),
      marked_by: null,
      status: 'approved',
      decided_at: now.toISOString(),
    };
    planObj.instalment_payments = [...ledger.filter((e) => e.index !== index), entry]
      .sort((a, b) => a.index - b.index);

    await this.prisma.applications.update({
      where: { id: applicationId },
      data: { payment_plan: JSON.stringify(planObj), updated_at: now },
    });
    await this.recordEvent(
      applicationId,
      'instalment_paid_razorpay',
      `Instalment ${index + 1} paid via Razorpay`,
      null,
      { instalment_index: index, link_id: linkId, amount_minor: amountMinor },
    );
  }

  // Razorpay webhook handler — `payment_link.paid` flips paid + advances
  // to stage='paid'. Returns just status 1/0; route does signature verification.
  async handleRazorpayWebhook(eventName: string, payload: Record<string, unknown>): Promise<void> {
    if (eventName !== 'payment_link.paid') return;
    const ev = payload as { payload?: { payment_link?: { entity?: Record<string, unknown> } } };
    const link = ev.payload?.payment_link?.entity ?? null;
    if (!link) return;
    const linkId = typeof link.id === 'string' ? link.id : '';
    if (!linkId) return;
    const notes = (link.notes && typeof link.notes === 'object')
      ? link.notes as Record<string, unknown>
      : {};
    let app = await this.prisma.applications.findFirst({
      where: { payment_link_id: linkId, deleted_at: null },
      select: { id: true, stage: true, is_converted: true, payment_plan: true, payment_status: true },
    });
    // Issuing a link for a later instalment overwrites payment_link_id, so a
    // student paying an EARLIER link would no longer match on it. Fall back to
    // the application reference carried in the link's notes rather than
    // silently dropping a real payment (Naji 2026-07-29).
    if (!app) {
      const ref = toStringValue(notes.application_ref);
      if (!ref) return;
      app = await this.prisma.applications.findFirst({
        where: { application_id: ref, deleted_at: null },
        select: { id: true, stage: true, is_converted: true, payment_plan: true, payment_status: true },
      });
    }
    if (!app) return;

    // Which instalment did this link cover? Prefer the note written at issue
    // time; fall back to the plan's link_targets map for links whose notes were
    // stripped. Absent both, this is a legacy/registration link → index 0.
    let paidIndex = 0;
    const noteIndex = Number(toStringValue(notes.instalment_index));
    if (Number.isFinite(noteIndex) && noteIndex > 0) {
      paidIndex = Math.trunc(noteIndex);
    } else if (app.payment_plan) {
      try {
        const parsed = JSON.parse(app.payment_plan) as Record<string, unknown>;
        const targets = parsed.link_targets as Record<string, unknown> | undefined;
        const mapped = Number(targets?.[linkId]);
        if (Number.isFinite(mapped) && mapped > 0) paidIndex = Math.trunc(mapped);
      } catch { /* fall through to index 0 */ }
    }

    if (paidIndex > 0) {
      await this.settleInstalmentFromLink(app.id, paidIndex, linkId, app.payment_plan, app.payment_status);
      return;
    }
    // Don't regress an already-enrolled student's stage (or re-fire the enrolment
    // notification) when they pay a link generated from the Student page
    // Generate/Edit Payment Plan flow (Naji 2026-07-05). Leads are unaffected.
    const alreadyEnrolled = app.stage === 'enrolled' || app.is_converted === 1;
    const now = new Date();
    await this.prisma.applications.update({
      where: { id: app.id },
      data: {
        ...(alreadyEnrolled ? {} : { stage: 'paid' }),
        payment_status: 'paid',
        payment_method: 'razorpay',
        payment_marked_paid_at: now,
        updated_at: now,
      },
    });
    await this.recordEvent(app.id, 'payment_received_razorpay', 'Payment received via Razorpay', null, { link_id: linkId });
    if (!alreadyEnrolled) {
      await this.notifyApplicationEvent(app.id, 'payment_received');
    }
  }

  // Phase E (Naji 2026-05-05): approval + enrolment.
  // Counsellor verifies → counsellor_approve → stage='approval_waiting'.
  // Admin reviews → admin_approve → stage='enrolled', creates / reuses
  // a student `users` row + an `enrol` row + sends welcome email(s).
  // Reject is a separate path that sets stage='rejected'.

  async counsellorApproveApplication(actorUserId: string, applicationId: string): Promise<Record<string, unknown>> {
    const id = toIntId(applicationId);
    const actor = toNullableIntId(actorUserId);
    if (!id || !actor) return { status: 0, message: 'Invalid input.' };
    const app = await this.prisma.applications.findFirst({ where: { id, deleted_at: null }, select: { id: true, stage: true } });
    if (!app) return { status: 0, message: 'Application not found.' };
    if (app.stage !== 'form_submitted') {
      return { status: 0, message: 'Application is not in Form Submitted state.' };
    }
    const now = new Date();
    await this.prisma.applications.update({
      where: { id },
      data: {
        stage: 'approval_waiting',
        counsellor_approved_at: now,
        counsellor_approved_by: actor,
        updated_at: now,
        updated_by: actor,
      },
    });
    await this.recordEvent(id, 'counsellor_approved', 'Counsellor approved the application', actorUserId);
    return { status: 1, message: 'Approved by counsellor. Awaiting admin approval.' };
  }

  async adminApproveApplication(actorUserId: string, applicationId: string): Promise<Record<string, unknown>> {
    const id = toIntId(applicationId);
    const actor = toNullableIntId(actorUserId);
    if (!id || !actor) return { status: 0, message: 'Invalid input.' };
    const app = await this.prisma.applications.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, stage: true, name: true, user_email: true, phone: true, course_id: true, biography: true, verification: true, payment_plan: true, payment_status: true, payment_marked_paid_at: true },
    });
    if (!app) return { status: 0, message: 'Application not found.' };
    // Accept legacy 'form_submitted' too — the counsellor-approve step was
    // removed (Naji 2026-05-31), so older apps stuck at form_submitted can
    // still be approved directly by Admin.
    if (app.stage !== 'approval_waiting' && app.stage !== 'form_submitted') {
      return { status: 0, message: 'Application is not awaiting admin approval.' };
    }
    if (!app.user_email) return { status: 0, message: 'Application has no email — cannot enrol.' };
    if (!app.course_id) return { status: 0, message: 'Application has no course — cannot enrol.' };

    // Naji UAT 2026-05-31 — verification gate. Until the admin has verified
    // every section ("basic", "qualification", "documents") AND every
    // uploaded document ("doc:0".."doc:N-1"), the application cannot be
    // approved. The document set is derived from the SAME source the View
    // page Documents tab uses (biography JSON), so the indices line up.
    const documentCount = this.parseApplicationDocuments(app.biography).length;
    const requiredKeys = this.requiredVerificationKeys(documentCount);
    const verifiedSet = new Set(this.parseApplicationVerification(app.verification).verified);
    const allVerified = requiredKeys.every((k) => verifiedSet.has(k));
    if (!allVerified) {
      return { status: 0, message: 'Verify all sections and documents before approving.' };
    }

    // Find or create the student `users` row.
    let student = await this.prisma.users.findFirst({
      where: { deleted_at: null, role_id: 2, OR: [{ email: app.user_email }, { user_email: app.user_email }] },
      select: { id: true, name: true, user_email: true },
    });
    const isNew = !student;
    const now = new Date();

    let tempPasswordForEmail: string | null = null;
    if (!student) {
      const { issueAndEmailCredentials } = await import('../auth/credentials-issuer.js');
      const creds = await issueAndEmailCredentials({
        name: app.name ?? app.user_email,
        email: app.user_email,
        roleLabel: 'Student',
      });
      tempPasswordForEmail = creds.tempPassword;
      void tempPasswordForEmail;
      const created = await this.prisma.users.create({
        data: {
          name: app.name ?? '',
          user_email: app.user_email,
          email: app.user_email,
          phone: app.phone || '',
          password: creds.hashedPassword,
          role_id: 2,
          status: 1,
          gender: '',
          dynamic_link: '',
          image: '',
          profile_picture: '',
          application_id: id,
          created_at: now,
          updated_at: now,
        },
      });
      student = { id: created.id, name: created.name, user_email: created.user_email };
    }

    // Enrol if not already.
    const existingEnrol = await this.prisma.enrol.findFirst({
      where: { user_id: student.id, course_id: app.course_id, deleted_at: null },
      select: { id: true },
    });
    if (!existingEnrol) {
      await this.prisma.enrol.create({
        data: {
          user_id: student.id,
          course_id: app.course_id,
          enrollment_id: `TIDMTT${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(student.id).padStart(4, '0')}`,
          created_at: now,
          updated_at: now,
        },
      });
    }

    await this.prisma.applications.update({
      where: { id },
      data: {
        stage: 'enrolled',
        student_id: student.id,
        admin_approved_at: now,
        admin_approved_by: actor,
        is_converted: 1,
        converted_at: now,
        converted_by: actor,
        status: 'converted',
        updated_at: now,
        updated_by: actor,
      },
    });

    // Materialize the application-stage payment plan into student_payments so the
    // post-conversion payment views reflect it. Idempotent + non-blocking — a
    // failure must never block the enrolment (the backfill is the safety net).
    try {
      await this.materializePaymentPlanToStudentPayments(this.prisma, {
        paymentPlanJson: app.payment_plan,
        paymentStatus: app.payment_status,
        studentUserId: student.id,
        courseId: app.course_id,
        actorUserId: actor,
        now,
      });
    } catch (err) {
      console.error('[adminApproveApplication] payment materialization failed:', err instanceof Error ? err.message : err);
    }

    // Course welcome email — skipped here for the existing student
    // case; new students already received the credentials email above.
    // Phase G will plug the dedicated course welcome template into both
    // paths (new + existing) once the email integration test is wired.
    void isNew;

    await this.recordEvent(id, 'admin_approved_enrolled', isNew ? 'Admin approved & enrolled (new student)' : 'Admin approved & enrolled (existing student, new course)', actorUserId, { student_id: student.id });
    await this.notifyApplicationEvent(id, 'enrolment_confirmed');

    // Naji UAT 2026-05-15 — auto-email the filled application as a PDF
    // attachment so admins stop attaching it manually after every
    // approval. Render + send is fire-and-forget; render or delivery
    // failures get console.error'd but don't roll back the enrolment.
    try {
      const rendered = await this.renderApplicationFormPdf(actorUserId, applicationId);
      if (rendered.status === 1) {
        const { createIntegrationRegistry } = await import('../integrations/registry.js');
        const { renderBrandedEmail } = await import('../integrations/email-template.js');
        const registry = createIntegrationRegistry();
        const courseTitle = app.course_id
          ? (await this.prisma.course.findFirst({ where: { id: app.course_id }, select: { title: true } }))?.title ?? ''
          : '';
        const html = renderBrandedEmail({
          heading: 'Your application has been approved',
          preheader: `Welcome to ${courseTitle || "Teachers' Training Institute of India"}.`,
          bodyHtml: `
            <p style="margin:0 0 12px;">Hi ${escapeHtmlText(app.name ?? 'there')},</p>
            <p style="margin:0 0 8px;">Congratulations — your application for <strong>${escapeHtmlText(courseTitle)}</strong> has been approved and you have been enrolled.</p>
            <p style="margin:0 0 8px;">Your filled application form is attached for your records. Please keep it safe.</p>
            <p style="margin:0 0 8px;">If you haven't received your LMS sign-in credentials yet, check your inbox for a separate email titled <em>Welcome to TTII</em>.</p>
          `,
          footerNote: 'Reply to this email if anything in the attached form needs correcting.',
        });
        await registry.email.sendEmail({
          to: app.user_email,
          subject: 'Your TTII application — approved',
          html,
          attachments: [{
            filename: rendered.filename,
            content: rendered.buffer,
            contentType: 'application/pdf',
          }],
        });
      } else {
        console.error('[adminApproveApplication] PDF render failed:', (rendered as { message?: string }).message);
      }
    } catch (err) {
      console.error('[adminApproveApplication] application PDF email failed:', err instanceof Error ? err.message : err);
    }

    return {
      status: 1,
      message: isNew
        ? 'Student enrolled. LMS credentials + application form PDF emailed.'
        : 'Existing student enrolled to new course. Application form PDF emailed.',
      data: { student_id: student.id, application_id: id },
    };
  }

  /**
   * Render the filled application as a PDF and return the bytes plus a
   * suggested file name. Used by the admin download endpoint AND by
   * adminApproveApplication to attach it to the approval email. Naji
   * UAT 2026-05-15 — replaces the manual PDF send the team was doing.
   */
  async renderApplicationFormPdf(actorUserId: string, applicationId: string): Promise<{
    status: 1;
    buffer: Buffer;
    filename: string;
  } | { status: 0; message: string }> {
    const id = toIntId(applicationId);
    if (!id) return { status: 0, message: 'Invalid application id.' };
    // Owner-scoped through getApplication: a counsellor downloading via the
    // admin PDF endpoint only gets their own leads' PDFs; admins get any.
    const enriched = await this.getApplication(actorUserId, applicationId);
    if (enriched.status !== 1) {
      return { status: 0, message: (enriched as { message?: string }).message ?? 'Application not found.' };
    }
    const application = enriched.application as Record<string, unknown>;
    const educationPathway = Array.isArray(enriched.education_pathway)
      ? (enriched.education_pathway as Array<Record<string, unknown>>)
      : [];

    const str = (v: unknown): string => {
      if (v == null) return '';
      if (v instanceof Date) return v.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      if (typeof v === 'string') return v.trim();
      if (typeof v === 'number' || typeof v === 'boolean') return String(v);
      if (typeof v === 'bigint') return v.toString();
      return ''; // objects / arrays / fns don't belong in a label/value PDF row
    };
    const orDash = (v: unknown): string => str(v) || 'Not provided';

    // Resolve the signature image. Naji UAT 2026-05-17 — the signature
    // captured by the public form's SignaturePad is a base64 data URL
    // and lands in applications.signature_data (the dedicated column).
    // The previous implementation looked inside biography.signature
    // which is never populated by the submit path, so every PDF came
    // out with no signature. Try signature_data first; fall back to
    // biography.signature (legacy field that some seeded rows may
    // have set). renderApplicationPdf knows how to handle both data
    // URLs and HTTPS URLs.
    let signatureUrl: string | null = null;
    const sigData = (application.signature_data as string | null | undefined) ?? null;
    if (typeof sigData === 'string' && sigData.trim() !== '') {
      signatureUrl = sigData.startsWith('data:')
        ? sigData
        : toLegacyFileUrl(sigData);
    } else {
      const bioRaw = application.biography as string | null | undefined;
      if (typeof bioRaw === 'string' && bioRaw.trim() !== '') {
        try {
          const parsed = JSON.parse(bioRaw) as { signature?: string };
          if (typeof parsed.signature === 'string' && parsed.signature.trim() !== '') {
            signatureUrl = parsed.signature.startsWith('data:')
              ? parsed.signature
              : toLegacyFileUrl(parsed.signature);
          }
        } catch { /* ignore malformed biography JSON */ }
      }
    }

    const submittedAt = (application.created_at as Date | null | undefined) ?? new Date();
    const submittedOn = submittedAt instanceof Date
      ? submittedAt.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        + ' at ' + submittedAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
      : '';

    // Best qualification row to mirror what the sample shows. Falls back
    // to the application.highest_qualification column when education
    // pathway is empty.
    const topQual = educationPathway.length > 0
      ? educationPathway[educationPathway.length - 1] ?? null
      : null;

    const { renderApplicationPdf } = await import('../integrations/application-pdf.js');
    const buffer = await renderApplicationPdf({
      courseTitle: str(application.course_title) || str(application.course_id),
      batch: str(application.batch_title) || str(application.offering_title) || 'Not assigned',
      enrollmentDate: str(application.enrollment_date) || (submittedAt instanceof Date
        ? submittedAt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : ''),
      modeOfStudy: orDash(application.mode_of_study),
      preferredLanguage: orDash(application.language_name ?? application.preferred_language),
      personal: [
        { label: 'Full Name:', value: orDash(application.name) },
        { label: 'Date of Birth:', value: orDash(application.date_of_birth ?? application.dob) },
        { label: 'Gender:', value: orDash(application.gender) },
        { label: 'Nationality:', value: orDash(application.nationality_name ?? application.nationality) },
        { label: 'Marital Status:', value: orDash(application.marital_status) },
        { label: 'Passport Number:', value: orDash(application.passport_no) },
        { label: 'Aadhar Number:', value: orDash(application.aadhar_no) },
        { label: "Father's Name:", value: orDash(application.father_name) },
        { label: "Mother's Name:", value: orDash(application.mother_name) },
        { label: "Guardian's Name:", value: orDash(application.guardian_name) },
      ],
      contact: [
        { label: 'Phone Number:', value: orDash(application.phone) },
        { label: 'Alternative Phone:', value: orDash(application.second_phone) },
        { label: 'WhatsApp Number:', value: orDash(application.whatsapp) },
        { label: 'Email Address:', value: orDash(application.user_email) },
        { label: 'Country:', value: orDash(application.country_name ?? application.country_id) },
        { label: 'State:', value: orDash(application.state) },
        { label: 'District:', value: orDash(application.district) },
      ],
      addresses: [
        { label: 'Permanent Address:', value: orDash(application.address) },
        { label: 'Correspondence Address:', value: orDash(application.native_address ?? application.address) },
      ],
      qualification: [
        { label: 'Highest Qualification:', value: orDash(application.highest_qualification ?? (topQual?.qualification ?? null)) },
        { label: 'School/College:', value: orDash(application.previous_school ?? (topQual?.institution ?? null)) },
        { label: 'Year of Passing:', value: orDash(application.year_of_passing ?? (topQual?.year_passed ?? null)) },
        { label: 'Percentage/Grade:', value: orDash(application.percentage_or_grade ?? (topQual?.marks ?? null)) },
        { label: 'Teaching Experience:', value: orDash(application.teaching_experience) },
      ],
      declaration: [
        'I declare that all information provided in this application form is true and correct to the best of my knowledge and belief. I understand that any violation of this may result in cancellation of my admission by the organization.',
        "I agree to abide by all rules, regulations, and policies of the Teachers' Training Institute of India, and to maintain the required code of conduct, discipline, and academic standards.",
        'I acknowledge that the certificate will be issued only upon successful completion of all academic and attendance requirements, and I understand that the institute reserves the right to modify the course structure, schedule, or faculty as deemed necessary.',
        'I understand that fees once paid are strictly non-refundable and non-transferable under any circumstances.',
        'I consent to the institute contacting me via phone, email, or WhatsApp for academic and administrative purposes and authorize the use of my photograph and personal details for official, academic, or promotional purposes if required.',
      ],
      submittedOn,
      photoUrl: typeof application.image === 'string' ? application.image : null,
      signatureUrl,
    });

    const slug = (str(application.name) || `application-${id}`)
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const dateSlug = submittedAt instanceof Date
      ? submittedAt.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    return {
      status: 1,
      buffer,
      filename: `TTI_Application_${slug || `app_${id}`}_${dateSlug}.pdf`,
    };
  }

  async rejectApplication(actorUserId: string, applicationId: string, reason: string): Promise<Record<string, unknown>> {
    const id = toIntId(applicationId);
    const actor = toNullableIntId(actorUserId);
    if (!id || !actor) return { status: 0, message: 'Invalid input.' };
    // Capture the stage we are rejecting FROM, so reopenApplication can put the
    // application back exactly where it was (Naji 2026-07-29 — rejecting for
    // "registration fee not paid" used to be a one-way door: stage='rejected'
    // disables Send/Resend Link, so the applicant could never be asked to pay).
    const before = await this.prisma.applications.findFirst({
      where: { id },
      select: { stage: true },
    });
    const previousStage = toStringValue(before?.stage) || null;
    const now = new Date();
    await this.prisma.applications.update({
      where: { id },
      data: {
        stage: 'rejected',
        rejected_at: now,
        rejected_by: actor,
        rejection_reason: reason || null,
        status: 'rejected',
        updated_at: now,
        updated_by: actor,
      },
    });
    await this.recordEvent(
      id,
      'rejected',
      `Application rejected${reason ? ` — ${reason}` : ''}`,
      actorUserId,
      { reason, previous_stage: previousStage },
    );
    await this.notifyApplicationEvent(id, 'rejected');
    return { status: 1, message: 'Application rejected.' };
  }

  /**
   * Stage a rejected application should return to when reopened. Prefers the
   * stage recorded on the rejection event; for applications rejected before
   * that metadata existed, derives a safe stage from what we can still see.
   * Never returns 'rejected' (that would be a no-op reopen).
   */
  private async resolveReopenStage(id: number): Promise<string> {
    const rejectEvent = await this.prisma.application_events.findFirst({
      where: { application_id: id, event_type: 'rejected' },
      orderBy: { id: 'desc' },
      select: { metadata: true },
    });
    if (rejectEvent?.metadata) {
      try {
        const meta = JSON.parse(rejectEvent.metadata) as { previous_stage?: unknown };
        const recorded = toStringValue(meta.previous_stage);
        if (recorded && recorded !== 'rejected') return recorded;
      } catch {
        // Malformed metadata — fall through to derivation.
      }
    }

    const app = await this.prisma.applications.findFirst({
      where: { id },
      select: { is_converted: true, payment_status: true, payment_link_url: true, payment_plan: true },
    });
    if (!app) return 'lead';
    if (toInteger(app.is_converted) === 1) return 'enrolled';
    // An outstanding plan means money is still owed, so payment_pending is both
    // accurate and the stage where Send/Resend Link is available again.
    if (app.payment_plan || toStringValue(app.payment_link_url)) return 'payment_pending';
    if (toStringValue(app.payment_status) === 'paid') return 'paid';
    return 'lead';
  }

  /**
   * Undo a rejection. Clears the rejection fields and returns the application
   * to an active stage so the normal pipeline actions (notably Send/Resend
   * payment link) work again.
   */
  async reopenApplication(
    actorUserId: string,
    applicationId: string,
    targetStage?: string,
  ): Promise<Record<string, unknown>> {
    const id = toIntId(applicationId);
    const actor = toNullableIntId(actorUserId);
    if (!id || !actor) return { status: 0, message: 'Invalid input.' };

    const app = await this.prisma.applications.findFirst({
      where: { id, deleted_at: null },
      select: { stage: true },
    });
    if (!app) return { status: 0, message: 'Application not found.' };
    if (toStringValue(app.stage) !== 'rejected') {
      return { status: 0, message: 'Only a rejected application can be reopened.' };
    }

    const requested = toStringValue(targetStage);
    const stage = requested && REOPENABLE_STAGES.has(requested)
      ? requested
      : await this.resolveReopenStage(id);

    const now = new Date();
    await this.prisma.applications.update({
      where: { id },
      data: {
        stage,
        status: stage === 'enrolled' ? 'converted' : 'pending',
        rejected_at: null,
        rejected_by: null,
        rejection_reason: null,
        updated_at: now,
        updated_by: actor,
      },
    });
    await this.recordEvent(id, 'reopened', `Application reopened — moved back to ${stage}`, actorUserId, { stage });
    return { status: 1, message: 'Application reopened.', data: { stage } };
  }

  async createApplication(actorUserId: string, input: AdminApplicationInput): Promise<Record<string, unknown>> {
    if (!input.firstName.trim()) return { status: 0, message: 'First name is required.' };
    if (!input.email.trim()) return { status: 0, message: 'Email is required.' };
    if (!input.phone.trim()) return { status: 0, message: 'Phone is required.' };

    const email = input.email.trim();
    const phone = input.phone.trim();

    const duplicate = await this.prisma.applications.findFirst({
      where: {
        deleted_at: null,
        OR: [
          { email: phone },
          { user_email: email },
          { phone },
        ],
      },
    });
    if (duplicate) return { status: 0, message: 'Application with same phone or email already exists.' };

    // Application date is user-controlled; if omitted, falls back to now.
    // Backend stores it on `created_at` so we don't need a new column.
    const applicationDate = input.applicationDate ? new Date(input.applicationDate) : new Date();
    const now = applicationDate;
    const fullName = `${input.firstName.trim()} ${input.lastName?.trim() || ''}`.trim();

    // Auto-calculate age from DOB
    let age: number | null = null;
    if (input.dateOfBirth) {
      const dob = new Date(input.dateOfBirth);
      const ageDiff = now.getTime() - dob.getTime();
      age = Math.floor(ageDiff / (365.25 * 24 * 60 * 60 * 1000));
    }

    const applicationIdSeq = await this.nextApplicationId();
    const created = await this.prisma.applications.create({
      data: {
        application_id: applicationIdSeq,
        name: fullName,
        phone,
        email: phone,
        user_email: email,
        country_code: input.countryCode ? `+${input.countryCode.replace(/^\+/, '')}` : '+91',
        date_of_birth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        age,
        gender: input.gender || null,
        nationality: input.nationality || input.country || 'India',
        marital_status: input.maritalStatus || null,
        father_name: input.fatherName || null,
        mother_name: input.motherName || null,
        guardian_name: input.guardianName || null,
        aadhar_no: input.aadharNo || null,
        passport_no: input.passportNo || null,
        // The form sends a country-code-prefixed string ("+91 9544125503").
        // Naji UAT 2026-05-16 — whatsapp_no Int overflows for any 10+
        // digit phone; write 0 and rely on the `whatsapp` VARCHAR
        // column (mirrored back onto whatsapp_no in getApplication
        // / getStudentDetail).
        whatsapp: input.whatsappNo ? input.whatsappNo.trim() : null,
        whatsapp_no: 0,
        state: input.state || null,
        district: input.city || null,
        address: input.permanentAddress || (input.addressLine1 ? `${input.addressLine1}${input.addressLine2 ? ', ' + input.addressLine2 : ''}` : null),
        native_address: input.correspondenceAddress || null,
        second_code: 0,
        second_phone: input.alternatePhone || '',
        image: input.photoUrl || '',
        course_id: toNullableIntId(input.courseId),
        batch_id: toNullableIntId(input.batchId),
        offering_id: toNullableIntId(input.offeringId),
        certificate_combination_id: toNullableIntId(input.certificateCombinationId),
        enrollment_date: input.enrollmentDate || null,
        mode_of_study: input.modeOfStudy || null,
        preferred_language: input.language || null,
        marketing_source:
          input.leadSource === 'Reference' && input.referenceStudentId
            ? `Reference#${input.referenceStudentId}`
            : input.leadSource || null,
        application_discount: input.discount ? Number(input.discount) : null,
        application_gst_percent: input.gstPercent ? Number(input.gstPercent) : null,
        application_final_fee: input.finalCourseFee ? Number(input.finalCourseFee) : null,
        // Biography is free-text; until dedicated columns exist, stash the
        // installment plan, documents and discount type / registration fee
        // there as JSON. Read back via JSON.parse when surfacing on the
        // View Application page. Naji 2026-05-07 — also stash
        // specialization here since the schema doesn't have a top-level
        // column for it; getStudentDetail surfaces it back to View+Edit.
        biography: (input.installmentPlan || input.documents || input.registrationFee || input.discountType || input.specialization)
          ? JSON.stringify({
              discount_type: input.discountType || null,
              registration_fee: input.registrationFee || null,
              installment_plan: input.installmentPlan ? safeParseJson(input.installmentPlan) : null,
              documents: input.documents ? safeParseJson(input.documents) : null,
              specialization: input.specialization || null,
            })
          : null,
        pipeline_user: toNullableIntId(input.pipelineUser),
        pipeline: input.pipeline || (input.pipelineUser ? '9' : null),
        status: (input.applicationStatus as $Enums.applications_status | null) || 'pending',
        added_under_centre: toNullableIntId(input.centreId),
        created_by: toIntId(actorUserId),
        updated_by: toIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    // Store qualification if provided
    if (input.highestQualification || input.institutionName || input.specialization) {
      await this.prisma.qualification.create({
        data: {
          user_id: created.id,
          qualification: input.highestQualification || null,
          percentage: input.percentageOrCgpa ? Number.parseInt(input.percentageOrCgpa, 10) || null : null,
          created_by: toIntId(actorUserId),
          created_at: now,
          updated_at: now,
        },
      });
    }

    return { status: 1, message: 'Application created successfully.', application_id: created.id };
  }

  // Naji 2026-05-08: dedicated update path for the new EditApplicationPage.
  // Mirrors createApplication's field handling but applies a partial
  // update to an existing applications row. Biography JSON merges with
  // existing keys so we don't clobber installment_plan / documents /
  // discount_type set elsewhere.
  // IDOR guard (hardens the Naji 2026-05-08 per-counsellor siloing, 2026-07-09):
  // counsellors (role 9) may only read/mutate applications they OWN
  // (pipeline_user = themselves), mirroring the scoping already enforced on the
  // list read. Admins / Subadmins (roles 1, 8) stay unscoped. A scoped lookup
  // that misses returns the normal "not found", so a counsellor cannot even
  // probe another counsellor's lead by enumerating ids.
  private async applicationOwnerScope(actorUserId: string): Promise<Prisma.applicationsWhereInput> {
    const actor = await this.prisma.users.findFirst({
      where: { id: toIntId(actorUserId), deleted_at: null },
      select: { role_id: true },
    });
    return actor?.role_id === 9 ? { pipeline_user: toIntId(actorUserId) } : {};
  }

  // Route-guard companion to applicationOwnerScope: returns true if the actor
  // may act on this application. Admins / Subadmins (roles 1, 8) always may;
  // counsellors (role 9) only for leads they OWN (pipeline_user = themselves).
  // Applied as a preHandler across the counsellor-reachable /admin application
  // + lead routes to close the surface-wide IDOR-on-write/read (2026-07-09).
  async actorOwnsApplication(actorUserId: string, applicationId: string): Promise<boolean> {
    const id = toIntId(applicationId);
    if (!id) return false;
    const actor = await this.prisma.users.findFirst({
      where: { id: toIntId(actorUserId), deleted_at: null },
      select: { role_id: true },
    });
    if (!actor) return false;
    if (actor.role_id !== 9) return true; // admins / subadmins are unscoped
    const owned = await this.prisma.applications.findFirst({
      where: { id, deleted_at: null, pipeline_user: toIntId(actorUserId) },
      select: { id: true },
    });
    return owned !== null;
  }

  async updateApplication(
    actorUserId: string,
    applicationId: string,
    input: AdminApplicationInput,
  ): Promise<Record<string, unknown>> {
    const id = toIntId(applicationId);
    if (!id) return { status: 0, message: 'Application ID is required.' };
    const scope = await this.applicationOwnerScope(actorUserId);
    const existing = await this.prisma.applications.findFirst({
      where: { id, deleted_at: null, ...scope },
      select: { id: true, biography: true },
    });
    if (!existing) return { status: 0, message: 'Application not found.' };

    const fullName = `${input.firstName.trim()} ${input.lastName?.trim() || ''}`.trim();
    const now = new Date();
    let age: number | null = null;
    if (input.dateOfBirth) {
      const dob = new Date(input.dateOfBirth);
      const ageDiff = now.getTime() - dob.getTime();
      age = Math.floor(ageDiff / (365.25 * 24 * 60 * 60 * 1000));
    }

    // Merge biography JSON with existing.
    let bioParsed: Record<string, unknown> = {};
    if (existing.biography) {
      try { bioParsed = JSON.parse(existing.biography) as Record<string, unknown>; }
      catch { bioParsed = {}; }
    }
    const mergedBio: Record<string, unknown> = {
      ...bioParsed,
      ...(input.discountType !== undefined ? { discount_type: input.discountType || null } : {}),
      ...(input.registrationFee !== undefined ? { registration_fee: input.registrationFee || null } : {}),
      ...(input.installmentPlan !== undefined ? { installment_plan: input.installmentPlan ? safeParseJson(input.installmentPlan) : null } : {}),
      ...(input.documents !== undefined ? { documents: input.documents ? safeParseJson(input.documents) : null } : {}),
      ...(input.specialization !== undefined ? { specialization: input.specialization || null } : {}),
    };
    const bioHasContent = Object.values(mergedBio).some((v) => v !== null && v !== undefined && v !== '');

    await this.prisma.applications.update({
      where: { id },
      data: {
        name: fullName,
        phone: input.phone.trim(),
        email: input.phone.trim(),
        user_email: input.email.trim(),
        country_code: input.countryCode ? `+${input.countryCode.replace(/^\+/, '')}` : '+91',
        date_of_birth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        age,
        gender: input.gender || null,
        nationality: input.nationality || input.country || 'India',
        marital_status: input.maritalStatus || null,
        father_name: input.fatherName || null,
        mother_name: input.motherName || null,
        guardian_name: input.guardianName || null,
        aadhar_no: input.aadharNo || null,
        passport_no: input.passportNo || null,
        // Same fix as line 8390 — see Naji UAT 2026-05-16 note above.
        whatsapp: input.whatsappNo ? input.whatsappNo.trim() : null,
        whatsapp_no: 0,
        state: input.state || null,
        district: input.city || null,
        address: input.permanentAddress || null,
        native_address: input.correspondenceAddress || null,
        second_phone: input.alternatePhone || '',
        ...(input.photoUrl ? { image: input.photoUrl } : {}),
        course_id: toNullableIntId(input.courseId),
        offering_id: toNullableIntId(input.offeringId),
        certificate_combination_id: toNullableIntId(input.certificateCombinationId),
        enrollment_date: input.enrollmentDate || null,
        mode_of_study: input.modeOfStudy || null,
        preferred_language: input.language || null,
        marketing_source:
          input.leadSource === 'Reference' && input.referenceStudentId
            ? `Reference#${input.referenceStudentId}`
            : input.leadSource || null,
        application_discount: input.discount ? Number(input.discount) : null,
        application_gst_percent: input.gstPercent ? Number(input.gstPercent) : null,
        application_final_fee: input.finalCourseFee ? Number(input.finalCourseFee) : null,
        ...(bioHasContent ? { biography: JSON.stringify(mergedBio) } : {}),
        pipeline_user: toNullableIntId(input.pipelineUser),
        pipeline: input.pipeline || (input.pipelineUser ? '9' : null),
        ...(input.applicationStatus
          ? { status: input.applicationStatus as $Enums.applications_status }
          : {}),
        added_under_centre: toNullableIntId(input.centreId),
        updated_by: toIntId(actorUserId),
        updated_at: now,
      },
    });

    return { status: 1, message: 'Application updated successfully.', application_id: id };
  }

  async deleteApplication(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    if (!id) return { status: 0, message: 'Application ID is required.' };
    const now = new Date();
    const scope = await this.applicationOwnerScope(actorUserId);
    const result = await this.prisma.applications.updateMany({
      where: { id: toIntId(id), deleted_at: null, ...scope },
      data: { deleted_by: toIntId(actorUserId), deleted_at: now },
    });
    if (result.count === 0) return { status: 0, message: 'Application not found.' };
    return { status: 1, message: 'Application deleted successfully.' };
  }

  async updateApplicationStatus(actorUserId: string, id: string, status: string, rejectReason?: string): Promise<Record<string, unknown>> {
    if (!id) return { status: 0, message: 'Application ID is required.' };
    if (!status) return { status: 0, message: 'Status is required.' };
    const now = new Date();
    // Naji UAT 2026-07-27 — this wrote `reject_reason`, which is NOT a column on
    // `applications`; the real one is `rejection_reason` (schema.prisma:128).
    // The previous comment here assumed Prisma silently drops unknown keys — it
    // does not, it throws PrismaClientValidationError, so EVERY reject that
    // carried a reason failed with "Unknown argument `reject_reason`" (admin,
    // counsellor and associate portals all funnel through here). Approve was
    // unaffected because it never enters this branch.
    //
    // `data` is now properly typed instead of Record<string, unknown> + a cast,
    // so the compiler catches this class of typo instead of shipping it.
    const normalised = normaliseApplicationStatus(status);
    if (!normalised) {
      return { status: 0, message: `Unsupported status "${status}". Expected pending, approved/converted or rejected.` };
    }
    const data: Prisma.applicationsUpdateManyMutationInput = {
      status: normalised,
      updated_by: toIntId(actorUserId),
      updated_at: now,
    };
    // Keep `stage` consistent for any non-UI caller of this endpoint. The
    // Reject buttons now go through rejectApplication() (which also records the
    // timeline event and notifies), but this endpoint previously wrote `status`
    // WITHOUT `stage`, leaving applications half-rejected — visible everywhere
    // because every dashboard and pipeline counter keys off `stage`.
    if (normalised === 'rejected') {
      data.stage = 'rejected';
      data.rejected_at = now;
      data.rejected_by = toIntId(actorUserId);
      if (rejectReason) data.rejection_reason = rejectReason;
    }
    const scope = await this.applicationOwnerScope(actorUserId);
    const result = await this.prisma.applications.updateMany({
      where: { id: toIntId(id), deleted_at: null, ...scope },
      data,
    });
    if (result.count === 0) return { status: 0, message: 'Application not found.' };
    return { status: 1, message: `Application ${status} successfully.` };
  }

  // ─── Phase C: Student Detail & Actions ──────────────────────────────────────

  async getStudentDetail(studentId: string): Promise<Record<string, unknown>> {
    if (!studentId) return { status: 0, message: 'Student ID is required.' };
    const uid = toIntId(studentId);

    const user = await this.prisma.users.findFirst({
      where: { id: uid, role_id: 2, deleted_at: null },
    });
    if (!user) return { status: 0, message: 'Student not found.' };

    const enrolments = await this.prisma.enrol.findMany({
      where: { user_id: uid, deleted_at: null },
    });

    const courseIds = [...new Set(enrolments.map(e => e.course_id).filter((x): x is number => x !== null && x !== undefined))];
    const batchIds = [...new Set(enrolments.map(e => e.batch_id).filter((x): x is number => x !== null && x !== undefined))];

    // Personal + qualification fields live on `applications`, not `users`.
    // `users.application_id` is the canonical link; fall back to email match
    // for users seeded outside the application flow.
    const applicationLookup = user.application_id
      ? this.prisma.applications.findFirst({
          where: { id: user.application_id, deleted_at: null },
        })
      : user.user_email
        ? this.prisma.applications.findFirst({
            where: { user_email: user.user_email, deleted_at: null },
            orderBy: { created_at: 'desc' },
          })
        : Promise.resolve(null);

    // Legacy student_payments rows store '0000-00-00' in due_date / paid_date,
    // which Prisma's MySQL driver refuses to hydrate. Read via $queryRaw with
    // NULLIF (same fix as listPaymentStatus, line 5074+).
    type RawStudentPayment = {
      id: number;
      user_id: number;
      course_id: number;
      installment_details: string | null;
      amount: number | null;
      payment_mode: string | null;
      payment_to: string | null;
      status: string | null;
      due_date: Date | null;
      paid_date: Date | null;
    };

    const [courses, batches, courseFees, payments, videoProgress, assignmentSubs, application, studentPaymentSchedule, practiceAttempts, examAttempts, liveClassAttendance] = await Promise.all([
      courseIds.length > 0
        ? this.prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true, total_amount: true, fee_structure: true } })
        : Promise.resolve([]),
      batchIds.length > 0
        ? this.prisma.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, title: true } })
        : Promise.resolve([]),
      courseIds.length > 0
        ? this.prisma.course_fees.findMany({ where: { course_id: { in: courseIds }, deleted_at: null }, select: { course_id: true, base_fee: true, discount: true } })
        : Promise.resolve([]),
      this.prisma.payment_info.findMany({
        where: { user_id: uid, deleted_at: null },
        orderBy: { payment_date: 'desc' },
      }),
      this.prisma.video_progress_status.findMany({
        where: { user_id: uid, deleted_at: null },
      }),
      this.prisma.assignment_submissions.findMany({
        where: { user_id: uid, deleted_at: null },
      }),
      applicationLookup,
      this.prisma.$queryRaw<RawStudentPayment[]>`
        SELECT id, user_id, course_id, installment_details, amount, payment_mode, payment_to, status,
               NULLIF(due_date, '0000-00-00') AS due_date,
               NULLIF(paid_date, '0000-00-00') AS paid_date
        FROM student_payments
        WHERE deleted_at IS NULL AND user_id = ${uid}
        ORDER BY id ASC`,
      // Naji 2026-05-11 — Enrollment drill-down sub-tabs (Quiz / Examination
      // / Live Class) were placeholder text. Now wire to real tables.
      this.prisma.practice_attempt.findMany({
        where: { user_id: uid, deleted_at: null },
        orderBy: { id: 'desc' },
      }),
      this.prisma.exam_attempt.findMany({
        where: { user_id: uid, deleted_at: null },
        orderBy: { id: 'desc' },
      }),
      this.prisma.live_class_attendance.findMany({
        where: { user_id: uid },
        orderBy: { id: 'desc' },
      }),
    ]);

    // Naji 2026-05-11 — legacy student profile fields (DOB, gender, address,
    // father/mother, marital_status, aadhar, country_id, etc.) live in
    // `user_details` for the imported PHP-era students. The new
    // `applications` table didn't exist when these were created, so the
    // View was showing "-" for every personal field on those students.
    // Treat user_details as a secondary source — applications wins for
    // students who have both, user_details fills the gaps for everyone
    // else.
    const userDetails = await this.prisma.user_details.findFirst({
      where: { user_id: uid, deleted_at: null },
      orderBy: { id: 'desc' },
    });

    // Enrich attempts with parent-table titles so the Student View tables
    // show a human-readable label instead of just numeric IDs.
    const examIdsForAttempts = [...new Set(examAttempts.map((a) => a.exam_id).filter((x): x is number => x !== null && x !== undefined))];
    const liveClassIdsForAttendance = [...new Set(liveClassAttendance.map((a) => a.live_class_id))];
    const [examsForAttempts, liveClassesForAttendance] = await Promise.all([
      examIdsForAttempts.length > 0
        ? this.prisma.exam.findMany({
            where: { id: { in: examIdsForAttempts } },
            select: { id: true, title: true, exam_code: true, course_id: true, mark: true },
          })
        : Promise.resolve([]),
      liveClassIdsForAttendance.length > 0
        ? this.prisma.live_class.findMany({
            where: { id: { in: liveClassIdsForAttendance } },
            select: { id: true, title: true, date: true, fromTime: true, course_id: true, platform: true },
          })
        : Promise.resolve([]),
    ]);
    const examTitleMap = new Map(examsForAttempts.map((e) => [e.id, e]));
    const liveClassMap = new Map(liveClassesForAttendance.map((l) => [l.id, l]));
    const enrichedExamAttempts = examAttempts.map((a) => {
      const exam = a.exam_id != null ? examTitleMap.get(a.exam_id) : null;
      return {
        ...a,
        exam_title: exam?.title ?? null,
        exam_code: exam?.exam_code ?? null,
        max_marks: exam?.mark != null ? Number(exam.mark) : null,
      };
    });
    const enrichedAttendance = liveClassAttendance.map((a) => {
      const lc = liveClassMap.get(a.live_class_id);
      return {
        ...a,
        live_class_title: lc?.title ?? null,
        live_class_date: lc?.date ?? null,
        live_class_from_time: lc?.fromTime ?? null,
        platform: lc?.platform ?? null,
        // Prisma serialises Decimal as string — surface as number for UI.
        percent_attended: a.percent_attended != null ? Number(a.percent_attended) : null,
      };
    });
    // Practice attempts: lesson_id is a JSON-encoded array string. Decode to
    // first lesson ID so the UI can show something useful (full join with
    // the lesson table is overkill for now — show ID + score + status).
    const enrichedQuizAttempts = practiceAttempts.map((a) => {
      let lessonIdLabel: string | null = null;
      if (a.lesson_id) {
        try {
          const parsed = JSON.parse(a.lesson_id) as unknown;
          if (Array.isArray(parsed) && parsed.length > 0) lessonIdLabel = String(parsed[0]);
          else lessonIdLabel = a.lesson_id;
        } catch { lessonIdLabel = a.lesson_id; }
      }
      return {
        ...a,
        lesson_label: lessonIdLabel,
        completed: Boolean(a.submit_status),
      };
    });

    // Naji 2026-05-12 — enrich assignment_submissions with the parent
    // assignment row (title, total_marks, due_date) and the subject the
    // assignment belongs to via its course. Assignment table doesn't have
    // subject_id directly; cohort → subject via cohort_subjects is the
    // path, but a simpler proxy is course_id → first subject. For now
    // we look up assignment.title + total_marks + due_date and leave
    // Subject as the assignment's cohort or course title.
    const submissionAssignmentIds = [...new Set(assignmentSubs.map((s) => s.assignment_id).filter((x): x is number => x != null))];
    const submissionAssignmentRows = submissionAssignmentIds.length > 0
      ? await this.prisma.assignment.findMany({
          where: { id: { in: submissionAssignmentIds } },
          select: { id: true, title: true, total_marks: true, due_date: true, course_id: true, cohort_id: true },
        })
      : [];
    // Legacy assignments often have course_id=0; resolve via cohort.course_id
    // as a fallback so the subject lookup still works.
    const submissionCohortIds = [...new Set(submissionAssignmentRows
      .filter((a) => !a.course_id)
      .map((a) => a.cohort_id)
      .filter((x): x is number => x != null))];
    const submissionCohortRows = submissionCohortIds.length > 0
      ? await this.prisma.cohorts.findMany({
          where: { id: { in: submissionCohortIds } },
          select: { id: true, course_id: true },
        })
      : [];
    const cohortCourseMap = new Map(submissionCohortRows.map((c) => [c.id, c.course_id]));
    const resolvedCourseIdFor = (a: { course_id: number | null; cohort_id: number | null }): number | null => {
      if (a.course_id && a.course_id > 0) return a.course_id;
      if (a.cohort_id != null) return cohortCourseMap.get(a.cohort_id) ?? null;
      return null;
    };
    const submissionCourseIds = [...new Set(submissionAssignmentRows
      .map((a) => resolvedCourseIdFor(a))
      .filter((x): x is number => x != null && x > 0))];
    const [submissionCourseRows, submissionCourseSubjects] = await Promise.all([
      submissionCourseIds.length > 0
        ? this.prisma.course.findMany({
            where: { id: { in: submissionCourseIds } },
            select: { id: true, title: true },
          })
        : Promise.resolve([]),
      submissionCourseIds.length > 0
        ? this.prisma.course_subject.findMany({
            where: { course_id: { in: submissionCourseIds }, deleted_at: null },
            select: { course_id: true, subject_id: true, position: true },
            orderBy: [{ course_id: 'asc' }, { position: 'asc' }],
          })
        : Promise.resolve([]),
    ]);
    const submissionSubjectIds = [...new Set(submissionCourseSubjects.map((cs) => cs.subject_id))];
    const submissionSubjectRows = submissionSubjectIds.length > 0
      ? await this.prisma.subject.findMany({
          where: { id: { in: submissionSubjectIds } },
          select: { id: true, title: true },
        })
      : [];
    const submissionSubjectMap = new Map(submissionSubjectRows.map((s) => [s.id, s.title ?? '']));
    const subjectsByCourse = new Map<number, { id: number; title: string }[]>();
    for (const cs of submissionCourseSubjects) {
      const title = submissionSubjectMap.get(cs.subject_id) ?? '';
      if (!title) continue;
      if (!subjectsByCourse.has(cs.course_id)) subjectsByCourse.set(cs.course_id, []);
      subjectsByCourse.get(cs.course_id)?.push({ id: cs.subject_id, title });
    }
    const submissionCourseMap = new Map(submissionCourseRows.map((c) => [c.id, c.title]));
    const submissionAssignmentMap = new Map(submissionAssignmentRows.map((a) => [a.id, a]));
    // Token-overlap matcher: tolerates "&" vs "and", z/s spelling variants
    // ("organization" vs "organisation"), trailing words like "Assignment",
    // and apostrophes ("Practical's"). Picks the subject with the highest
    // share of significant tokens present in the assignment title.
    const STOP = new Set(['and','or','the','of','in','a','an','to','for','with','on','at','assignment','assessment','test','exam']);
    const tokenize = (s: string): string[] => s
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[''`]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w));
    const tokensMatch = (a: string, b: string): boolean => {
      if (a === b) return true;
      const n = Math.min(a.length, b.length, 5);
      return a.slice(0, n) === b.slice(0, n);
    };
    const pickSubject = (assignmentTitle: string, subjects: { title: string }[]): string | null => {
      const aTokens = tokenize(assignmentTitle);
      if (aTokens.length === 0) return null;
      let best: { title: string; score: number } | null = null;
      for (const sub of subjects) {
        const sTokens = tokenize(sub.title);
        if (sTokens.length === 0) continue;
        let hits = 0;
        for (const st of sTokens) {
          if (aTokens.some((at) => tokensMatch(at, st))) hits += 1;
        }
        const score = hits / sTokens.length;
        if (score > 0 && (!best || score > best.score)) best = { title: sub.title, score };
      }
      return best && best.score >= 0.4 ? best.title : null;
    };
    const enrichedAssignmentSubs = assignmentSubs.map((s) => {
      const assignment = s.assignment_id != null ? submissionAssignmentMap.get(s.assignment_id) : undefined;
      const resolvedCourseId = assignment ? resolvedCourseIdFor(assignment) : null;
      const courseSubjects = resolvedCourseId != null ? subjectsByCourse.get(resolvedCourseId) ?? [] : [];
      let subjectTitle: string | null = null;
      if (assignment?.title && courseSubjects.length > 0) {
        subjectTitle = pickSubject(assignment.title, courseSubjects);
      }
      if (!subjectTitle && resolvedCourseId != null) {
        subjectTitle = submissionCourseMap.get(resolvedCourseId) ?? null;
      }
      return {
        ...s,
        assignment_title: assignment?.title ?? null,
        total_marks: assignment?.total_marks ?? null,
        due_date: assignment?.due_date ?? null,
        subject_title: subjectTitle,
      };
    });

    // Offering lookup — applications carry the chosen offering_id; the
    // enrol row doesn't, so we surface the application's offering for all
    // enrolments under that course.
    const applicationOfferingId = application?.offering_id ?? null;
    const offering = applicationOfferingId
      ? await this.prisma.offerings.findFirst({
          where: { id: applicationOfferingId, deleted_at: null },
          // Pricing columns (base_fee / discount / offered_fee) let the Fee
          // Summary fall back to the OFFERING's own pricing when no
          // offering_certificate_packages row exists for the chosen
          // (offering, combination) pair — so the figures still track the
          // chosen offering instead of freezing on the legacy course_fee.
          // NB: offerings has no GST column (GST lives on the package).
          select: { id: true, title: true, offering_code: true, course_id: true, base_fee: true, discount: true, offered_fee: true },
        })
      : null;

    const courseMap = new Map(courses.map(c => [c.id, c]));
    const batchMap = new Map(batches.map(b => [b.id, b]));
    const courseFeeMap = new Map(courseFees.map(f => [f.course_id, f]));

    // Sum payments per course_id so we can compute pending per enrolment.
    // Naji UAT 2026-05-13 — Fee Paid was always ₹0 because payment_info is
    // razorpay-only and never populated for cash / installment payments.
    // The Payment History table reads from student_payments, so the
    // Fee Paid total must come from the same source: sum amount on rows
    // with status='Paid'. payment_info rows are added in as a fallback
    // for online-only payments that don't have a matching schedule row.
    const paidByCourse = new Map<number, number>();
    for (const sp of studentPaymentSchedule) {
      const courseId = Number(sp.course_id ?? 0);
      if (!courseId) continue;
      // Naji 2026-07-06 — count a row as paid when status='paid' OR it carries a
      // real paid_date, mirroring deriveFeeStatusByUser (~line 174) and the
      // documented convention. Previously status-only, which disagreed with the
      // row-level fee status and let a row recorded with a Paid Date but a
      // non-Paid status show as settled in Payment History yet add ₹0 to Fee
      // Paid. Robust against legacy '0000-00-00' whether paid_date is a Date,
      // a raw MariaDB date string, or null.
      const status = String(sp.status ?? '').trim().toLowerCase();
      const paidDateStr = sp.paid_date == null ? '' : String(sp.paid_date).trim();
      const hasPaidDate = paidDateStr !== '' && !paidDateStr.startsWith('0000-00-00');
      if (status !== 'paid' && !hasPaidDate) continue;
      const amt = Number(sp.amount ?? 0);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      paidByCourse.set(courseId, (paidByCourse.get(courseId) ?? 0) + amt);
    }
    for (const p of payments) {
      if (p.course_id == null) continue;
      const amt = Number(p.amount_paid ?? 0);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      paidByCourse.set(p.course_id, (paidByCourse.get(p.course_id) ?? 0) + amt);
    }

    // Video progress per course, used to compute Tab 2 progress %.
    const videoTotalByCourse = new Map<number, { total: number; completed: number }>();
    for (const vp of videoProgress) {
      if (vp.course_id == null) continue;
      const cur = videoTotalByCourse.get(vp.course_id) ?? { total: 0, completed: 0 };
      cur.total += 1;
      if (vp.status === 1) cur.completed += 1;
      videoTotalByCourse.set(vp.course_id, cur);
    }

    // Naji 2026-05-12 — enrich video progress with the subject + lesson
    // titles so the Learning Progress sub-tab can group lessons by subject
    // instead of showing a flat "Lesson 1, Lesson 2…" list.
    // video_progress_status.lesson_file_id → lesson_files.lesson_id →
    // lesson.subject_id → subject.title.
    const lessonFileIds = [...new Set(videoProgress.map((v) => v.lesson_file_id).filter((x): x is number => x != null))];
    const lessonFileRows = lessonFileIds.length > 0
      ? await this.prisma.lesson_files.findMany({
          where: { id: { in: lessonFileIds } },
          select: { id: true, lesson_id: true, title: true },
        })
      : [];
    const lessonIdsForProgress = [...new Set(lessonFileRows.map((lf) => lf.lesson_id))];
    const lessonRows = lessonIdsForProgress.length > 0
      ? await this.prisma.lesson.findMany({
          where: { id: { in: lessonIdsForProgress } },
          select: { id: true, title: true, subject_id: true },
        })
      : [];
    const subjectIdsForProgress = [...new Set(lessonRows.map((l) => l.subject_id).filter((x): x is number => x != null))];
    const subjectRowsForProgress = subjectIdsForProgress.length > 0
      ? await this.prisma.subject.findMany({
          where: { id: { in: subjectIdsForProgress } },
          select: { id: true, title: true, order: true },
        })
      : [];
    const lessonFileMap = new Map(lessonFileRows.map((lf) => [lf.id, lf]));
    const lessonMapForProgress = new Map(lessonRows.map((l) => [l.id, l]));
    const subjectMapForProgress = new Map(subjectRowsForProgress.map((s) => [s.id, s]));
    const enrichedVideoProgress = videoProgress.map((vp) => {
      const lf = vp.lesson_file_id != null ? lessonFileMap.get(vp.lesson_file_id) : undefined;
      const lesson = lf ? lessonMapForProgress.get(lf.lesson_id) : undefined;
      const subject = lesson?.subject_id != null ? subjectMapForProgress.get(lesson.subject_id) : undefined;
      return {
        ...vp,
        lesson_id: lesson?.id ?? null,
        lesson_title: lesson?.title ?? lf?.title ?? null,
        subject_id: subject?.id ?? null,
        subject_title: subject?.title ?? null,
        subject_order: subject?.order ?? null,
      };
    });

    // Resolve certificate combination once for the enrolment table column.
    const enrolmentCombination = application?.certificate_combination_id
      ? await this.prisma.certificate_combinations.findFirst({
          where: { id: application.certificate_combination_id },
          select: { id: true, combination_code: true },
        })
      : null;

    // Pricing package — Naji UAT 2026-05-12. The Payments sub-tab needs
    // base_fee / discount / course_fee / gst_percent / course_fee_inc_gst
    // pulled from offering_certificate_packages (the source of truth for
    // pricing once an offering + combination are picked).
    // Naji 2026-07-07 — resolve pricing from the offering's PACKAGE layer, not a
    // single exact (offering, combination) row. Package-priced offerings leave
    // the offering-level base_fee/offered_fee columns NULL, so when the admin
    // changes the offering and the old combination doesn't match a package for
    // the NEW offering (or is blank), the exact-pair lookup returned null and the
    // Fee Summary froze on the offering-independent legacy course fee. Fetch all
    // packages for the offering and pick the one matching the chosen combination,
    // else the offering's first/default package — so the fee tracks the offering.
    const offeringPackages = application?.offering_id
      ? await this.prisma.offering_certificate_packages.findMany({
          where: { offering_id: application.offering_id, deleted_at: null },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
          select: { combination_id: true, fee_category: true, base_fee: true, discount: true, offered_fee: true, gst_percent: true, registration_fee: true },
        })
      : [];
    // Prefer 'paid' packages so a free/scholarship row at position 0 can't make
    // the default show ₹0. Match the chosen combination first, else default to
    // the offering's first paid package.
    const paidPackages = offeringPackages.filter((p) => (p.fee_category ?? 'paid') === 'paid');
    const pickList = paidPackages.length > 0 ? paidPackages : offeringPackages;
    const enrolmentPackage =
      (application?.certificate_combination_id
        ? pickList.find((p) => p.combination_id === application.certificate_combination_id)
        : undefined) ?? pickList[0] ?? null;

    // Naji UAT 2026-05-15 — Cohort sub-tab under Enrollments needs to
    // surface every cohort this student is enrolled in, grouped by the
    // enrolment's course. cohort_students.cohort_id is a TEXT column
    // (legacy quirk) that holds either the numeric cohort id or the
    // human cohort_id code, so look both up.
    const cohortStudentRows = await this.prisma.cohort_students.findMany({
      where: { user_id: uid, deleted_at: null },
      select: { cohort_id: true },
    });
    const cohortKeys = [...new Set(cohortStudentRows.map(r => String(r.cohort_id ?? '')).filter(Boolean))];
    const cohortIntIds = cohortKeys
      .map(k => parseInt(k, 10))
      .filter(n => Number.isFinite(n) && n > 0);
    const studentCohorts = cohortKeys.length > 0
      ? await this.prisma.cohorts.findMany({
          where: {
            deleted_at: null,
            OR: [
              ...(cohortIntIds.length > 0 ? [{ id: { in: cohortIntIds } }] : []),
              { cohort_id: { in: cohortKeys } },
            ],
          },
        })
      : [];
    const cohortSubjectIds = [...new Set(studentCohorts.map(c => c.subject_id).filter((x): x is number => x != null))];
    const cohortInstructorIds = [...new Set(studentCohorts.map(c => c.instructor_id).filter((x): x is number => x != null))];
    const [cohortSubjects, cohortInstructors] = await Promise.all([
      cohortSubjectIds.length > 0
        ? this.prisma.subject.findMany({ where: { id: { in: cohortSubjectIds } }, select: { id: true, title: true } })
        : Promise.resolve([]),
      cohortInstructorIds.length > 0
        ? this.prisma.users.findMany({
            where: { id: { in: cohortInstructorIds } },
            select: { id: true, name: true, image: true, profile_picture: true },
          })
        : Promise.resolve([]),
    ]);
    const subjectTitleById = new Map(cohortSubjects.map(s => [s.id, s.title]));
    const instructorById = new Map(
      cohortInstructors.map(u => [u.id, {
        name: u.name ?? null,
        image: toLegacyFileUrl(u.profile_picture) || toLegacyFileUrl(u.image) || null,
      }]),
    );
    const todayDate = new Date();
    const cohortsByCourse = new Map<number, Array<{
      id: number;
      cohort_code: string | null;
      title: string | null;
      subject_id: number | null;
      subject_title: string | null;
      start_date: Date | null;
      end_date: Date | null;
      instructor_id: number | null;
      instructor_name: string | null;
      instructor_photo: string | null;
      status: 'In Progress' | 'Completed' | 'Upcoming' | 'Active';
    }>>();
    for (const c of studentCohorts) {
      if (c.course_id == null) continue;
      let status: 'In Progress' | 'Completed' | 'Upcoming' | 'Active' = 'Active';
      if (c.end_date && c.end_date < todayDate) status = 'Completed';
      else if (c.start_date && c.start_date > todayDate) status = 'Upcoming';
      else if (c.start_date && c.start_date <= todayDate) status = 'In Progress';
      const instr = c.instructor_id != null ? instructorById.get(c.instructor_id) : null;
      const arr = cohortsByCourse.get(c.course_id) ?? [];
      arr.push({
        id: c.id,
        cohort_code: c.cohort_id ?? null,
        title: c.title ?? null,
        subject_id: c.subject_id ?? null,
        subject_title: c.subject_id != null ? subjectTitleById.get(c.subject_id) ?? null : null,
        start_date: c.start_date ?? null,
        end_date: c.end_date ?? null,
        instructor_id: c.instructor_id ?? null,
        instructor_name: instr?.name ?? null,
        instructor_photo: instr?.image ?? null,
        status,
      });
      cohortsByCourse.set(c.course_id, arr);
    }

    const enrichedEnrolments = enrolments.map(e => {
      const course = e.course_id ? courseMap.get(e.course_id) : null;
      const fee = e.course_id ? courseFeeMap.get(e.course_id) : null;
      const baseFee = fee ? Number(fee.base_fee ?? 0) : Number(course?.total_amount ?? 0);
      const discountPerc = e.discount_perc ? Number(e.discount_perc) : 0;
      const courseFee = baseFee - (baseFee * (Number.isFinite(discountPerc) ? discountPerc : 0) / 100);
      const vp = e.course_id ? videoTotalByCourse.get(e.course_id) : null;
      const progress = vp && vp.total > 0 ? Math.round((vp.completed / vp.total) * 100) : 0;
      return {
        ...e,
        course_title: course?.title ?? null,
        offering_title: offering?.title ?? offering?.offering_code ?? null,
        // Naji 2026-05-12 — Certificate Combination column on the
        // enrolment table. Pulled from the application row since enrol
        // doesn't carry the combination itself.
        certificate_combination_code: enrolmentCombination?.combination_code ?? null,
        batch_title: e.batch_id ? batchMap.get(e.batch_id)?.title ?? null : null,
        course_fee: Math.round(courseFee),
        progress,
        status: e.enrollment_status ?? 'Active',
        cohorts: e.course_id ? cohortsByCourse.get(e.course_id) ?? [] : [],
      };
    });

    // Display-only enrolments (Naji 2026-07-09): when the student has NO real
    // `enrol` row, surface a single synthesized enrolment so the header count +
    // Enrolled Courses rail stop reading "0 courses". Course source: the
    // enrolled application, else the legacy `users.course_id` (a role-2 user
    // with a course IS a student on that course even without an enrol row).
    // Used ONLY for display — the Fee Summary (studentFees below) stays sourced
    // from real enrol rows, so its numbers are byte-identical for anyone who
    // already had an enrol row. Course-less orphans get an empty rail (nothing
    // to show), same as before.
    const appEnrolled = !!application && (application.stage === 'enrolled' || application.is_converted === 1);
    const synthCourseId = enrichedEnrolments.length === 0
      ? ((appEnrolled ? application?.course_id : null) ?? user.course_id ?? null)
      : null;
    const synthCourseTitle = synthCourseId
      ? (courseMap.get(synthCourseId)?.title
          ?? (await this.prisma.course.findFirst({ where: { id: synthCourseId }, select: { title: true } }))?.title
          ?? null)
      : null;
    const displayEnrolments: Array<Record<string, unknown>> = enrichedEnrolments.length > 0
      ? (enrichedEnrolments as unknown as Array<Record<string, unknown>>)
      : synthCourseId
        ? [{
            id: 0,
            user_id: uid,
            course_id: synthCourseId,
            enrollment_id: toStringValue(application?.application_id) || toStringValue(user.student_id),
            enrollment_status: 'Active',
            batch_id: null,
            course_title: synthCourseTitle,
            offering_title: appEnrolled ? (offering?.title ?? offering?.offering_code ?? null) : null,
            certificate_combination_code: enrolmentCombination?.combination_code ?? null,
            batch_title: null,
            course_fee: 0,
            progress: 0,
            status: 'Active',
            cohorts: [],
            synthesized: true,
          }]
        : [];

    // Per-enrolment fee aggregation for Tab 3 (Course Fee) + the
    // Payments sub-tab on the enrolment drill-down. Naji UAT 2026-05-12 —
    // expanded with the full pricing breakdown sourced from the
    // application's offering_certificate_package (base/discount/offered/
    // GST). Falls back to the legacy `course_fees` row when no package
    // is set (legacy enrolments).
    const studentFees = enrichedEnrolments.map(e => {
      const paid = e.course_id ? (paidByCourse.get(e.course_id) ?? 0) : 0;
      // Fee source priority: offering_certificate_packages (package row for the
      // chosen offering+combination) → the OFFERING's own pricing → legacy
      // course_fees. The offering fallback keeps the Fee Summary tracking the
      // chosen offering even when no package row exists for the pair, instead
      // of freezing on the offering-independent legacy course fee.
      // Branch on the whole ROW, not per field: use the package row when one
      // exists (preserving its original per-field defaults so a partial-NULL
      // package can't pull a phantom value off the offering), else the OFFERING
      // pricing — but ONLY for the enrolment on that offering's own course (so a
      // multi-course student's other courses keep their own legacy fee) — else
      // the legacy course_fees row.
      // Apply the offering's pricing ONLY to the enrolment on that offering's own
      // course (a multi-course student's other courses keep their own legacy
      // fee). Fee source priority: the resolved offering package → the offering's
      // own scalar pricing (only if it has no packages) → legacy course_fees.
      const onOfferingCourse = offering != null && e.course_id === offering.course_id;
      const offeringScalar =
        onOfferingCourse && offering && (offering.base_fee != null || offering.offered_fee != null) ? offering : null;
      const feeSrc = onOfferingCourse ? (enrolmentPackage ?? offeringScalar) : null;
      const baseFee = feeSrc?.base_fee != null ? Number(feeSrc.base_fee) : Number(e.course_fee ?? 0);
      const discount = feeSrc?.discount != null ? Number(feeSrc.discount) : 0;
      const courseFee = feeSrc?.offered_fee != null ? Number(feeSrc.offered_fee) : Math.max(0, baseFee - discount);
      // GST comes from the resolved package (offerings carry no GST column).
      const gstPercent = onOfferingCourse && enrolmentPackage?.gst_percent != null ? Number(enrolmentPackage.gst_percent) : 0;
      const gstAmount = Math.round((courseFee * gstPercent) / 100);
      const courseFeeIncGst = courseFee + gstAmount;
      return {
        enrollment_id: e.enrollment_id,
        course_title: e.course_title,
        offering_title: e.offering_title,
        combination_title: enrolmentCombination?.combination_code ?? null,
        base_fee: baseFee,
        discount,
        course_fee: courseFee,
        gst_percent: gstPercent,
        gst_amount: gstAmount,
        course_fee_inc_gst: courseFeeIncGst,
        total_fee: courseFeeIncGst,
        paid_amount: paid,
        pending_amount: Math.max(0, courseFeeIncGst - paid),
      };
    });

    // Profile completion uses only fields the users table actually carries,
    // plus key application-derived ones that the View page renders.
    const profileFields = [
      user.name, user.user_email, user.phone, user.profile_picture,
      user.dob, user.gender, application?.address, application?.father_name,
    ];
    const filled = profileFields.filter(Boolean).length;
    const profileCompletion = Math.round((filled / profileFields.length) * 100);

    // Photo: legacy rows populate `profile_picture`; new rows use `image`.
    const photo = toLegacyFileUrl(user.profile_picture) || toLegacyFileUrl(user.image);

    // Tab 1 needs an "Application Details" card; Tab 5 needs the fee
    // breakdown the application captured. Biography stashes the
    // installment plan + documents JSON until dedicated columns exist.
    const biographyParsed = (() => {
      if (!application?.biography) return null;
      try { return JSON.parse(application.biography) as Record<string, unknown>; }
      catch { return null; }
    })();
    const installmentPlan = biographyParsed?.installment_plan ?? [];
    // Naji 2026-05-11 — application documents are stored in biography JSON
    // with relative URLs from the legacy form. Rewrite to the live host so
    // the "View" link actually opens the file.
    const applicationDocuments = ((biographyParsed?.documents ?? []) as Array<{ name?: string; url?: string; document_type_id?: string }>)
      .map((d) => ({
        ...d,
        url: d.url ? toLegacyFileUrl(d.url) : '',
      }));
    const applicationFee = application
      ? {
          discount: application.application_discount != null ? Number(application.application_discount) : null,
          discount_type: (biographyParsed?.discount_type as string | undefined) ?? null,
          registration_fee: (biographyParsed?.registration_fee as string | undefined) ?? null,
          gst_percent: application.application_gst_percent != null ? Number(application.application_gst_percent) : null,
          final_fee: application.application_final_fee != null ? Number(application.application_final_fee) : null,
        }
      : null;

    // Pipeline user / lead source: surface as ids; the View page can call
    // back for full names if it needs them. Lead source uses the
    // "Reference#<student_id>" prefix when leadSource was Reference.
    const marketing = application?.marketing_source ?? null;
    let leadSource: string | null = null;
    let referenceStudentId: string | null = null;
    if (marketing) {
      if (marketing.startsWith('Reference#')) {
        leadSource = 'Reference';
        referenceStudentId = marketing.slice('Reference#'.length);
      } else if (marketing.startsWith('Network#')) {
        // Network referrer name/email is packed as Network#{json}; surface the
        // bare 'Network' label so the View/Edit Student pages don't show raw JSON.
        leadSource = 'Network';
      } else {
        leadSource = marketing;
      }
    }

    // Education pathway entries live on `application_education_pathway`
    // for new students. Legacy students (no application row) have their
    // qualifications in the older `qualification` table — fall back to
    // that. Naji 2026-05-12.
    let educationPathway = application
      ? await this.prisma.application_education_pathway.findMany({
          where: { application_id: application.id },
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
        })
      : [];
    if (educationPathway.length === 0) {
      const legacyQuals = await this.prisma.qualification.findMany({
        where: { user_id: uid, deleted_at: null },
        orderBy: { id: 'asc' },
      });
      educationPathway = legacyQuals.map((q, idx) => ({
        id: q.id,
        application_id: application?.id ?? 0,
        qualification: q.qualification ?? '',
        specialization: null,
        institution: null,
        year_passed: null,
        marks: q.percentage != null ? String(q.percentage) : null,
        board: q.board ?? null,
        position: idx,
        created_at: q.created_at,
        updated_at: q.updated_at,
        created_by: q.created_by,
        updated_by: q.updated_by,
      })) as typeof educationPathway;
    }

    // Naji 2026-05-11 — resolve country / nationality / language IDs to
    // human-readable names. Same pattern as getApplication (line 5948+).
    // The legacy form stores numeric IDs in mediumtext columns, so we
    // fall through to raw text when the value isn't a digit string.
    const countryIdInt = parseLooseInt(application?.country_id);
    const nationalityIdInt = parseLooseInt(application?.nationality);
    const languageIdInt = parseLooseInt(application?.preferred_language);
    const [countryRow, nationalityRow, languageRow, pipelineUserRow, combinationRow] = await Promise.all([
      countryIdInt !== null
        ? this.prisma.country.findFirst({ where: { id: countryIdInt }, select: { id: true, name: true } })
        : null,
      nationalityIdInt !== null
        ? this.prisma.country.findFirst({ where: { id: nationalityIdInt }, select: { id: true, name: true } })
        : null,
      languageIdInt !== null
        ? this.prisma.languages.findFirst({ where: { id: languageIdInt }, select: { id: true, title: true } })
        : null,
      // Naji 2026-05-11 — View was showing Pipeline User as the raw int id
      // (e.g. "193") instead of the user's name. Resolve like getApplication.
      application?.pipeline_user
        ? this.prisma.users.findFirst({ where: { id: application.pipeline_user }, select: { id: true, name: true } })
        : null,
      // Same for Certificate Combination — was showing "1" instead of code.
      application?.certificate_combination_id
        ? this.prisma.certificate_combinations.findFirst({
            where: { id: application.certificate_combination_id },
            select: { id: true, combination_code: true },
          })
        : null,
    ]);
    const countryName = countryRow?.name ?? (countryIdInt === null ? toStringValue(application?.country_id) : null);
    const nationalityName = nationalityRow?.name ?? (nationalityIdInt === null ? toStringValue(application?.nationality) : null);
    const languageName = languageRow?.title ?? (languageIdInt === null ? toStringValue(application?.preferred_language) : null);
    const pipelineUserName = pipelineUserRow?.name ?? null;
    const combinationCode = combinationRow?.combination_code ?? null;

    // If pipeline_user wasn't resolved from application, try from user_details.
    let pipelineUserNameResolved: string | null = pipelineUserName;
    if (!pipelineUserNameResolved && userDetails?.pipeline_user) {
      const row = await this.prisma.users.findFirst({
        where: { id: userDetails.pipeline_user },
        select: { name: true },
      });
      pipelineUserNameResolved = row?.name ?? null;
    }

    // Naji 2026-05-11 — Payment Plan + payment-link metadata captured on
    // the application during the Lead → Enrolment workflow. Mirrors the
    // Application View's "Payment Plan" card so admins can see the same
    // breakdown on the Student View.
    const applicationPaymentPlan = (() => {
      const raw = application?.payment_plan;
      if (!raw) return null;
      try { return JSON.parse(raw) as Record<string, unknown>; }
      catch { return null; }
    })();

    // Naji 2026-05-05: Bugs X1+X2 — surface ALL application-captured
    // fields on the student profile so View and Edit are consistent
    // and "age" / address / second-phone / emergency / biography
    // / signature don't go missing after a student is enrolled.
    // Gender format normalization (Naji 2026-05-07 — was showing "1" raw).
    // Legacy data has int-as-string ("1"/"2"/"3"); newer rows have text
    // ("Male"/"Female"/"Other"). Map known ints; pass everything else
    // through unchanged so unexpected values (e.g. "Prefer not to say")
    // don't get stripped.
    const normalizeGender = (raw: string | number | null | undefined): string | null => {
      if (raw == null) return null;
      const v = typeof raw === 'number' ? String(raw) : raw.trim();
      if (!v) return null;
      if (v === '1') return 'Male';
      if (v === '2') return 'Female';
      if (v === '3') return 'Other';
      return v;
    };

    // WhatsApp lives on multiple columns thanks to the legacy schema. Pull
    // from the first non-empty source — application.whatsapp (string) is
    // the canonical place after the 2026-05-07 fix; the int column is a
    // fallback for rows that pre-date the fix.
    const resolvedWhatsapp =
      ((application as Record<string, unknown> | null)?.whatsapp as string | null) ??
      ((user as unknown as Record<string, unknown>).whatsapp as string | null) ??
      ((user as unknown as Record<string, unknown>).whatsapp_phone as string | null) ??
      (application?.whatsapp_no != null && application.whatsapp_no !== 0
        ? String(application.whatsapp_no)
        : null);

    // Naji 2026-05-11 — country / nationality name resolution with
    // user_details fallback for the raw ID. Personal-field fallback (DOB,
    // address, etc.) is done inline in the studentWithPhoto block below.
    const countryRaw = application?.country_id ?? userDetails?.country_id ?? null;
    const nationalityRaw = application?.nationality ?? userDetails?.nationality ?? null;
    const countryRawIdInt = parseLooseInt(countryRaw);
    const nationalityRawIdInt = parseLooseInt(nationalityRaw);
    let countryNameResolved = countryName;
    let nationalityNameResolved = nationalityName;
    if (!countryNameResolved && countryRawIdInt !== null) {
      const row = await this.prisma.country.findFirst({ where: { id: countryRawIdInt }, select: { name: true } });
      countryNameResolved = row?.name ?? toStringValue(countryRaw);
    }
    if (!nationalityNameResolved && nationalityRawIdInt !== null) {
      const row = await this.prisma.country.findFirst({ where: { id: nationalityRawIdInt }, select: { name: true } });
      nationalityNameResolved = row?.name ?? toStringValue(nationalityRaw);
    }

    const studentWithPhoto = {
      ...user,
      image: photo,
      profile_picture: photo,
      date_of_birth: user.dob ?? application?.date_of_birth ?? userDetails?.date_of_birth ?? null,
      age: application?.age ?? userDetails?.age ?? null,
      // Naji 2026-05-11 — users.gender is NOT NULL in the legacy schema and
      // defaults to ''. `??` only short-circuits on null/undefined, not empty
      // string, so the wrong branch was being taken for any student whose
      // user row pre-dated the gender column being populated. Use truthy
      // check so empty string falls through.
      gender: normalizeGender((user.gender && user.gender.trim()) || application?.gender || userDetails?.gender),
      // Naji 2026-05-11 — applications.biography is hijacked by the Lead
      // workflow as a JSON stash (registration_fee / discount_type /
      // installment_plan / documents / specialization). Don't surface a
      // pure-stash JSON object as "Biography" — only show actual prose.
      biography: biographyParsed && typeof biographyParsed === 'object' ? null : (application?.biography ?? null),
      learning_disabilities: application?.learning_disabilities ?? userDetails?.learning_disabilities ?? null,
      accessibility_needs: application?.accessibility_needs ?? userDetails?.accessibility_needs ?? null,
      emergency_name: application?.emergency_name ?? userDetails?.emergency_name ?? null,
      emergency_relation: application?.emergency_relation ?? userDetails?.emergency_relation ?? null,
      emergency_phone: application?.emergency_phone ?? userDetails?.emergency_phone ?? null,
      second_phone: application?.second_phone || userDetails?.second_phone || null,
      second_code: application?.second_code ?? userDetails?.second_code ?? null,
      signature_data: application?.signature_data ?? null,
      address: application?.address ?? userDetails?.address ?? null,
      native_address: application?.native_address ?? userDetails?.native_address ?? null,
      father_name: application?.father_name ?? userDetails?.father_name ?? null,
      mother_name: application?.mother_name ?? userDetails?.mother_name ?? null,
      guardian_name: application?.guardian_name ?? userDetails?.guardian_name ?? null,
      aadhar_no: application?.aadhar_no ?? userDetails?.aadhar_no ?? null,
      passport_no: application?.passport_no ?? userDetails?.passport_no ?? null,
      country: countryRaw ? String(countryRaw) : null,
      country_name: countryNameResolved,
      state: application?.state ?? userDetails?.state ?? null,
      city: application?.district ?? userDetails?.district ?? null,
      whatsapp_no: resolvedWhatsapp ?? (userDetails?.whatsapp_no != null && userDetails.whatsapp_no !== 0 ? String(userDetails.whatsapp_no) : null),
      nationality: nationalityRaw ?? null,
      nationality_name: nationalityNameResolved,
      marital_status: application?.marital_status ?? userDetails?.marital_status ?? null,
      // Raw users.status int-as-string for the Edit dropdown ('1'/'0'/'2'/'3');
      // status_label is the badge-friendly version for the View page.
      status: user.status != null ? String(user.status) : null,
      status_label: user.status === 1 ? 'Active' : user.status === 0 ? 'Inactive' : user.status === 2 ? 'Graduated' : user.status === 3 ? 'Dropped' : null,
      // Risha UAT 2026-07-27 — the Students LIST treats disabled_at as the
      // authority for Active/Inactive but the detail page never received it,
      // so a disabled student still read "Active" on their own page. Return it
      // so both screens agree.
      disabled_at: user.disabled_at ?? null,
      // Qualification fields live on applications OR user_details (legacy).
      highest_qualification: user.highest_qualification ?? application?.highest_qualification ?? userDetails?.highest_qualification ?? null,
      institution_name: application?.previous_school ?? userDetails?.previous_school ?? null,
      year_of_passing: application?.year_of_passing ?? userDetails?.year_of_passing ?? null,
      percentage_or_grade: application?.percentage_or_grade ?? userDetails?.percentage_or_grade ?? null,
      employment_status: application?.employment_status ?? userDetails?.employment_status ?? null,
      current_occupation: application?.current_occupation ?? null,
      work_experience: application?.experience_years ?? application?.teaching_experience ?? userDetails?.experience_years ?? userDetails?.teaching_experience ?? null,
      // Naji 2026-05-07: specialization is stashed in biography JSON
      // (no top-level column on applications). Surface it here so View
      // and Edit can read it without parsing biography themselves.
      specialization: (biographyParsed?.specialization as string | null | undefined) ?? null,
      // Application metadata for the new "Application Details" card.
      application_id: application?.id ?? null,
      application_date: application?.created_at ?? null,
      application_status: application?.status ?? null,
      certificate_combination_id: application?.certificate_combination_id ?? null,
      // Naji 2026-05-11 — resolved combination_code so View shows the label
      // ("MTT-D" etc.) instead of the raw int id ("1").
      certificate_combination_code: combinationCode,
      offering_id: application?.offering_id ?? null,
      mode_of_study: application?.mode_of_study ?? null,
      preferred_language: application?.preferred_language ?? null,
      language_name: languageName,
      pipeline: application?.pipeline ?? userDetails?.pipeline ?? null,
      pipeline_user: application?.pipeline_user ?? userDetails?.pipeline_user ?? null,
      // Resolved Pipeline User name (was showing as raw int id, e.g. "193").
      pipeline_user_name: pipelineUserNameResolved,
      lead_source: leadSource,
      reference_student_id: referenceStudentId,
    };

    return {
      status: 1,
      message: 'success',
      student: studentWithPhoto,
      enrolments: displayEnrolments,
      payments,
      studentPaymentSchedule,
      studentFees,
      videoProgress: enrichedVideoProgress,
      materialProgress: [],
      assignmentSubmissions: enrichedAssignmentSubs,
      quizAttempts: enrichedQuizAttempts,
      examAttempts: enrichedExamAttempts,
      liveClassAttendance: enrichedAttendance,
      profileCompletion,
      educationPathway,
      applicationFee,
      applicationInstallments: installmentPlan,
      applicationDocuments,
      applicationPaymentPlan,
      paymentLinkUrl: application?.payment_link_url ?? null,
      paymentStatus: application?.payment_status ?? null,
      paymentLinkExpiresAt: application?.payment_link_expires_at ?? null,
    };
  }

  async getStudentAnalytics(studentId: string): Promise<Record<string, unknown>> {
    const uid = toIntId(studentId);
    if (!uid) return { status: 0, message: 'Invalid student id.' };

    const [
      documents,
      examAgg,
      practiceAgg,
      assignments,
      videoProgress,
      notificationReads,
      activityRows,
      // Naji 2026-05-11 — Activity Log now aggregates everything the
      // student does into a single chronological feed: auth events,
      // quiz / exam attempts, assignment submissions, videos watched,
      // live class attendance.
      activityQuizzes,
      activityExams,
      activityAssignmentSubs,
      activityVideos,
      activityLiveClasses,
    ] = await Promise.all([
      this.prisma.student_document.findMany({
        where: { student_id: uid, deleted_at: null },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.exam_attempt.aggregate({
        where: { user_id: uid, submit_status: true, deleted_at: null },
        _avg: { score: true },
        _count: { id: true },
      }),
      this.prisma.practice_attempt.aggregate({
        where: { user_id: uid, submit_status: true, deleted_at: null },
        _avg: { score: true },
        _count: { id: true },
      }),
      this.prisma.assignment_submissions.findMany({
        where: { user_id: uid, deleted_at: null },
        select: { id: true, marks: true, created_at: true },
      }),
      this.prisma.video_progress_status.findMany({
        where: { user_id: uid, deleted_at: null },
        select: { status: true },
      }),
      this.prisma.notification_read.findMany({
        where: { user_id: uid, deleted_at: null },
        orderBy: { created_at: 'desc' },
        take: 50,
      }),
      this.prisma.auth_audit_log.findMany({
        where: { user_id: uid },
        orderBy: { created_at: 'desc' },
        take: 100,
      }),
      this.prisma.practice_attempt.findMany({
        where: { user_id: uid, deleted_at: null },
        select: { id: true, lesson_file_id: true, score: true, submit_status: true, created_at: true, end_time: true },
        orderBy: { id: 'desc' },
        take: 50,
      }),
      this.prisma.exam_attempt.findMany({
        where: { user_id: uid, deleted_at: null },
        select: { id: true, exam_id: true, score: true, submit_status: true, created_at: true, end_time: true },
        orderBy: { id: 'desc' },
        take: 50,
      }),
      this.prisma.assignment_submissions.findMany({
        where: { user_id: uid, deleted_at: null },
        select: { id: true, assignment_id: true, course_id: true, marks: true, created_at: true },
        orderBy: { id: 'desc' },
        take: 50,
      }),
      this.prisma.video_progress_status.findMany({
        where: { user_id: uid, deleted_at: null, status: 1 },
        select: { id: true, lesson_file_id: true, course_id: true, updated_at: true, created_at: true },
        orderBy: { id: 'desc' },
        take: 50,
      }),
      this.prisma.live_class_attendance.findMany({
        where: { user_id: uid },
        select: { id: true, live_class_id: true, total_seconds: true, percent_attended: true, first_joined_at: true },
        orderBy: { id: 'desc' },
        take: 50,
      }),
    ]);

    // Resolve parent-table titles for the activity feed entries.
    const actExamIds = [...new Set(activityExams.map((e) => e.exam_id).filter((x): x is number => x != null))];
    const actAssignmentIds = [...new Set(activityAssignmentSubs.map((a) => a.assignment_id).filter((x): x is number => x != null))];
    const actLiveClassIds = [...new Set(activityLiveClasses.map((a) => a.live_class_id))];
    const [actExamRows, actAssignmentRows, actLiveClassRows] = await Promise.all([
      actExamIds.length > 0
        ? this.prisma.exam.findMany({ where: { id: { in: actExamIds } }, select: { id: true, title: true } })
        : Promise.resolve([]),
      actAssignmentIds.length > 0
        ? this.prisma.assignment.findMany({ where: { id: { in: actAssignmentIds } }, select: { id: true, title: true } })
        : Promise.resolve([]),
      actLiveClassIds.length > 0
        ? this.prisma.live_class.findMany({ where: { id: { in: actLiveClassIds } }, select: { id: true, title: true } })
        : Promise.resolve([]),
    ]);
    const actExamMap = new Map(actExamRows.map((r) => [r.id, r.title]));
    const actAssignmentMap = new Map(actAssignmentRows.map((r) => [r.id, r.title]));
    const actLiveClassMap = new Map(actLiveClassRows.map((r) => [r.id, r.title]));

    // Assignment average
    const assignmentScores: number[] = [];
    for (const a of assignments) {
      if (a.marks === null || a.marks === undefined) continue;
      const n = parseFloat(a.marks);
      if (Number.isFinite(n)) assignmentScores.push(n);
    }
    const assignmentAvg = assignmentScores.length > 0
      ? assignmentScores.reduce((s, v) => s + v, 0) / assignmentScores.length
      : 0;

    // Video completion
    const totalVideos = videoProgress.length;
    const videosCompleted = videoProgress.filter((v) => v.status === 1).length;
    const videoCompletionPct = totalVideos > 0 ? Math.round((videosCompleted / totalVideos) * 100) : 0;

    // Notifications: join to notification table
    const notificationIds = Array.from(new Set(notificationReads.map((n) => n.notification_id)));
    const notifications = notificationIds.length > 0
      ? await this.prisma.notification.findMany({
          where: { id: { in: notificationIds }, deleted_at: null },
          orderBy: { created_at: 'desc' },
        })
      : [];
    const notificationMap = new Map(notifications.map((n) => [n.id, n]));
    const comms: Record<string, unknown>[] = [];
    for (const nr of notificationReads) {
      const n = notificationMap.get(nr.notification_id);
      if (!n) continue;
      comms.push({
        id: String(nr.id),
        title: n.title,
        description: n.description,
        read_at: nr.status === 1 ? nr.updated_at ?? nr.created_at : null,
        sent_at: n.created_at,
        status: nr.status === 1 ? 'read' : 'unread',
      });
    }

    // Naji UAT 2026-05-14 — Documents tab needs to surface ALL doc slots
    // the student's enrolled courses require, not just the ones they
    // happen to have uploaded. Look up enrolled courses → required doc
    // types and cross-reference uploaded student_document rows by
    // case-insensitive label so admins can see what is still missing
    // and Upload directly.
    const enrolledCourseIds = await this.prisma.enrol.findMany({
      where: { user_id: uid, deleted_at: null },
      select: { course_id: true },
    }).then((rows) => [...new Set(rows.map((r) => r.course_id).filter((x): x is number => x != null))]);
    let requiredDocuments: Array<{
      document_type_id: number;
      label: string;
      course_id: number;
      course_title: string | null;
      is_mandatory: boolean;
      fulfilled: boolean;
      file: string | null;
      student_document_id: string | null;
    }> = [];
    if (enrolledCourseIds.length > 0) {
      const [reqLinks, reqTypes, reqCourses] = await Promise.all([
        this.prisma.course_required_documents.findMany({
          where: { course_id: { in: enrolledCourseIds }, deleted_at: null },
          orderBy: [{ position: 'asc' }, { document_type_id: 'asc' }],
        }),
        this.prisma.document_types.findMany({ where: { deleted_at: null } }),
        this.prisma.course.findMany({
          where: { id: { in: enrolledCourseIds } },
          select: { id: true, title: true },
        }),
      ]);
      const typeLabelById = new Map(reqTypes.map((t) => [t.id, t.label]));
      const courseTitleById = new Map(reqCourses.map((c) => [c.id, c.title ?? null]));
      const docsByLabel = new Map<string, typeof documents[number]>();
      for (const d of documents) {
        const key = (d.label ?? '').trim().toLowerCase();
        if (key && !docsByLabel.has(key)) docsByLabel.set(key, d);
      }
      requiredDocuments = reqLinks.map((l) => {
        const label = typeLabelById.get(l.document_type_id) ?? `#${l.document_type_id}`;
        const match = docsByLabel.get(label.trim().toLowerCase());
        return {
          document_type_id: l.document_type_id,
          label,
          course_id: l.course_id,
          course_title: courseTitleById.get(l.course_id) ?? null,
          is_mandatory: Boolean(l.is_mandatory),
          fulfilled: Boolean(match),
          file: match ? toLegacyFileUrl(match.file) : null,
          student_document_id: match ? String(match.student_document_id) : null,
        };
      });
    }

    return {
      status: 1,
      message: 'success',
      documents: documents.map((d) => ({
        id: String(d.student_document_id),
        label: d.label ?? '',
        // Naji 2026-05-11 — student_document.file stores relative paths
        // like "uploads/students_file/.../foo.pdf". Without rewriting, the
        // browser tries to fetch `admin.teachersindia.in/uploads/...`
        // which 404s. Resolve against the real legacy host.
        file: toLegacyFileUrl(d.file),
        uploaded_at: d.created_at,
      })),
      requiredDocuments,
      performance: {
        quiz_avg_score: examAgg._avg?.score ? Number(examAgg._avg.score) : 0,
        quiz_attempts: examAgg._count?.id ?? 0,
        practice_avg_score: practiceAgg._avg?.score ? Number(practiceAgg._avg.score) : 0,
        practice_attempts: practiceAgg._count?.id ?? 0,
        assignment_avg_score: Number(assignmentAvg.toFixed(2)),
        assignment_submissions: assignmentScores.length,
        video_completion_pct: videoCompletionPct,
        videos_watched: videosCompleted,
        total_videos: totalVideos,
      },
      certificates: [],
      communication: {
        notifications: comms,
        email_log: [],
        whatsapp_log: [],
      },
      // Naji 2026-05-11 — Unified activity feed: every student action we
      // can capture from the DB, merged into one chronological list so
      // the Activity Log tab actually shows what a student does.
      activity: (() => {
        type Entry = {
          id: string;
          event: string;
          description: string;
          identifier: string;
          success: boolean;
          ip_address: string;
          user_agent: string;
          created_at: Date | null;
        };
        const merged: Entry[] = [];

        // 1. Auth events (login / logout / SSO / password resets).
        for (const a of activityRows) {
          merged.push({
            id: `auth-${a.id}`,
            event: a.event,
            description: a.event.replace(/_/g, ' ').toLowerCase(),
            identifier: a.identifier ?? '',
            success: Boolean(a.success),
            ip_address: a.ip_address ?? '',
            user_agent: a.user_agent ?? '',
            created_at: a.created_at,
          });
        }

        // 2. Quiz attempts.
        for (const q of activityQuizzes) {
          const submitted = Boolean(q.submit_status);
          merged.push({
            id: `quiz-${q.id}`,
            event: submitted ? 'QUIZ_COMPLETED' : 'QUIZ_STARTED',
            description: submitted
              ? `Completed practice quiz${q.score != null ? ` (score ${Number(q.score)})` : ''}`
              : 'Started practice quiz',
            identifier: q.lesson_file_id ?? '',
            success: submitted,
            ip_address: '',
            user_agent: '',
            created_at: q.end_time ?? q.created_at ?? null,
          });
        }

        // 3. Exam attempts.
        for (const e of activityExams) {
          const submitted = Boolean(e.submit_status);
          const title = e.exam_id != null ? actExamMap.get(e.exam_id) : null;
          merged.push({
            id: `exam-${e.id}`,
            event: submitted ? 'EXAM_SUBMITTED' : 'EXAM_STARTED',
            description: submitted
              ? `Submitted exam${title ? `: ${title}` : ''}${e.score != null ? ` (score ${e.score})` : ''}`
              : `Started exam${title ? `: ${title}` : ''}`,
            identifier: title ?? (e.exam_id != null ? String(e.exam_id) : ''),
            success: submitted,
            ip_address: '',
            user_agent: '',
            created_at: e.end_time ?? e.created_at ?? null,
          });
        }

        // 4. Assignment submissions.
        for (const a of activityAssignmentSubs) {
          const title = a.assignment_id != null ? actAssignmentMap.get(a.assignment_id) : null;
          merged.push({
            id: `assignment-${a.id}`,
            event: 'ASSIGNMENT_SUBMITTED',
            description: `Submitted assignment${title ? `: ${title}` : ''}${a.marks ? ` (marks ${a.marks})` : ''}`,
            identifier: title ?? (a.assignment_id != null ? String(a.assignment_id) : ''),
            success: true,
            ip_address: '',
            user_agent: '',
            created_at: a.created_at ?? null,
          });
        }

        // 5. Videos completed.
        for (const v of activityVideos) {
          merged.push({
            id: `video-${v.id}`,
            event: 'VIDEO_COMPLETED',
            description: `Completed video lesson${v.lesson_file_id != null ? ` #${v.lesson_file_id}` : ''}`,
            identifier: v.lesson_file_id != null ? String(v.lesson_file_id) : '',
            success: true,
            ip_address: '',
            user_agent: '',
            created_at: v.updated_at ?? v.created_at ?? null,
          });
        }

        // 6. Live class attendance.
        for (const l of activityLiveClasses) {
          const title = actLiveClassMap.get(l.live_class_id);
          const mins = l.total_seconds ? Math.round(l.total_seconds / 60) : 0;
          merged.push({
            id: `liveclass-${l.id}`,
            event: 'LIVE_CLASS_ATTENDED',
            description: `Attended live class${title ? `: ${title}` : ''}${mins > 0 ? ` (${mins}m)` : ''}`,
            identifier: title ?? String(l.live_class_id),
            success: true,
            ip_address: '',
            user_agent: '',
            created_at: l.first_joined_at ?? null,
          });
        }

        // Sort newest first; entries without a date sink to the bottom.
        merged.sort((a, b) => {
          const at = a.created_at instanceof Date ? a.created_at.getTime() : 0;
          const bt = b.created_at instanceof Date ? b.created_at.getTime() : 0;
          return bt - at;
        });

        return merged;
      })(),
    };
  }

  async changeStudentUsername(actorUserId: string, studentId: string, newUsername: string): Promise<Record<string, unknown>> {
    if (!studentId) return { status: 0, message: 'Student ID is required.' };
    if (!newUsername.trim()) return { status: 0, message: 'Username is required.' };

    const existing = await this.prisma.users.findFirst({ where: { username: newUsername.trim(), deleted_at: null, id: { not: toIntId(studentId) } } });
    if (existing) return { status: 0, message: 'Username already taken.' };

    const now = new Date();
    await this.prisma.users.updateMany({
      where: { id: toIntId(studentId), deleted_at: null },
      data: { username: newUsername.trim(), updated_by: toIntId(actorUserId), updated_at: now },
    });

    return { status: 1, message: 'Username updated successfully.' };
  }

  async changeStudentPassword(actorUserId: string, studentId: string, newPassword: string): Promise<Record<string, unknown>> {
    if (!studentId) return { status: 0, message: 'Student ID is required.' };
    if (!newPassword || newPassword.length < 6) return { status: 0, message: 'Password must be at least 6 characters.' };

    const hashed = await hashPassword(newPassword);
    const now = new Date();
    await this.prisma.users.updateMany({
      where: { id: toIntId(studentId), deleted_at: null },
      data: { password: hashed, updated_by: toIntId(actorUserId), updated_at: now },
    });

    return { status: 1, message: 'Password updated successfully.' };
  }

  // Naji UAT 2026-05-13 — universal enable/disable toggle for any user
  // (Student, Admin, Counsellor, Associate, Instructor, Centre user).
  // Writes users.disabled_at so the change is reversible and the login
  // gate in AuthService blocks all roles consistently.
  async toggleUserStatus(actorUserId: string, userId: string, enabled: boolean): Promise<Record<string, unknown>> {
    if (!userId) return { status: 0, message: 'User ID is required.' };
    const id = toIntId(userId);
    if (!id) return { status: 0, message: 'Invalid user id.' };
    const actor = toIntId(actorUserId);
    if (id === actor) return { status: 0, message: 'You cannot disable your own account.' };

    const user = await this.prisma.users.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, name: true, disabled_at: true },
    });
    if (!user) return { status: 0, message: 'User not found.' };

    const now = new Date();
    await this.prisma.users.updateMany({
      where: { id, deleted_at: null },
      data: enabled
        ? { disabled_at: null, disabled_by: null, updated_by: actor, updated_at: now }
        : { disabled_at: now, disabled_by: actor, updated_by: actor, updated_at: now },
    });

    return { status: 1, message: enabled ? 'User enabled.' : 'User disabled.' };
  }

  async editStudentEnrollmentId(actorUserId: string, studentId: string, newEnrollmentId: string): Promise<Record<string, unknown>> {
    if (!studentId) return { status: 0, message: 'Student ID is required.' };
    if (!newEnrollmentId.trim()) return { status: 0, message: 'Enrollment ID is required.' };

    const now = new Date();
    const result = await this.prisma.enrol.updateMany({
      where: { user_id: toIntId(studentId), deleted_at: null },
      data: { enrollment_id: newEnrollmentId.trim(), updated_by: toIntId(actorUserId), updated_at: now },
    });

    if (result.count === 0) return { status: 0, message: 'No enrolment found for this student.' };
    return { status: 1, message: 'Enrollment ID updated successfully.' };
  }

  // Naji UAT 2026-05-12 — full Edit Enrolment dialog. Updates the enrol
  // row directly + offering/combination on the linked applications row.
  // For legacy students with users.application_id=0, creates a stamped
  // application row first (same pattern as editStudentInfo).
  // Naji UAT 2026-05-14 — "Add another enrolment to an existing student"
  // flow. Admin lands directly on stage='enrolled' with the enrol row
  // created in the same call; Counsellor / Associate / Centre create a
  // stage='approval_waiting' application that admin reviews + approves
  // through the existing approveApplication pipeline (which is what
  // creates the enrol row in that case).
  async addAdditionalEnrolment(actorUserId: string, studentId: string, input: {
    courseId: string;
    offeringId?: string;
    combinationId?: string;
    modeOfStudy?: string;
    preferredLanguage?: string;
    pipeline?: string;
    pipelineUser?: string;
    leadSource?: string;
    referenceStudentId?: string;
    registrationFee?: string;
    discount?: string;
    discountType?: string;
    gstPercent?: string;
    finalCourseFee?: string;
    paymentMode?: 'link' | 'manual' | 'draft';
    manualPaymentMode?: string;
    manualReference?: string;
  }): Promise<Record<string, unknown>> {
    const studentPk = toIntId(studentId);
    if (!studentPk) return { status: 0, message: 'Invalid student id.' };
    const courseIdInt = toNullableIntId(input.courseId);
    if (!courseIdInt) return { status: 0, message: 'Course is required.' };

    const actor = await this.prisma.users.findFirst({
      where: { id: toIntId(actorUserId), deleted_at: null },
      select: { id: true, role_id: true, name: true },
    });
    if (!actor) return { status: 0, message: 'Actor not found.' };

    // Admin-tier roles (Super Admin 1, Admin 8) finalise immediately;
    // others land in Approval Waiting.
    const isAdmin = actor.role_id === 1 || actor.role_id === 8;

    const student = await this.prisma.users.findFirst({
      where: { id: studentPk, deleted_at: null, role_id: 2 },
      select: {
        id: true, name: true, phone: true, user_email: true, country_code: true,
        image: true, profile_picture: true, application_id: true,
      },
    });
    if (!student) return { status: 0, message: 'Student not found.' };

    // Refuse if the student is already actively enrolled in the same course.
    const dup = await this.prisma.enrol.findFirst({
      where: { user_id: student.id, course_id: courseIdInt, deleted_at: null },
      select: { id: true, enrollment_id: true },
    });
    if (dup) {
      return {
        status: 0,
        code: 'already_enrolled_same_course',
        message: 'Student is already enrolled in this course.',
        data: { enrol_id: dup.id, enrollment_id: dup.enrollment_id },
      };
    }

    // Copy personal fields from the student's existing application row so
    // we don't re-collect anything.
    const sourceApp = student.application_id && student.application_id > 0
      ? await this.prisma.applications.findFirst({
          where: { id: student.application_id },
          select: {
            name: true, phone: true, country_code: true, user_email: true, image: true,
            second_code: true, second_phone: true, whatsapp_no: true, whatsapp: true,
            date_of_birth: true, age: true, gender: true, nationality: true,
            marital_status: true, father_name: true, mother_name: true, guardian_name: true,
            aadhar_no: true, passport_no: true, address: true, native_address: true,
            country_id: true, state: true, district: true,
            highest_qualification: true, previous_school: true, year_of_passing: true,
            percentage_or_grade: true, employment_status: true, current_occupation: true,
            experience_years: true,
            emergency_name: true, emergency_relation: true, emergency_phone: true,
            biography: true, learning_disabilities: true, accessibility_needs: true,
          },
        })
      : null;

    const now = new Date();
    const actorPk = actor.id;
    const offeringPk = input.offeringId ? toNullableIntId(input.offeringId) : null;
    const combinationPk = input.combinationId ? toNullableIntId(input.combinationId) : null;
    const pipelineUserPk = input.pipelineUser ? toNullableIntId(input.pipelineUser) : null;
    const finalFee = input.finalCourseFee ? Number(input.finalCourseFee) : null;
    const discountVal = input.discount ? Number(input.discount) : null;
    const gstVal = input.gstPercent ? Number(input.gstPercent) : null;

    const applicationIdSeq = await this.nextApplicationId();
    // Stage = enrolled for admins (gets created with is_converted=1 +
    // converted timestamps); approval_waiting for everyone else.
    const stage = isAdmin ? 'enrolled' : 'approval_waiting';
    const isConverted = isAdmin ? 1 : 0;

    const created = await this.prisma.applications.create({
      data: {
        application_id: applicationIdSeq,
        // Personal copy
        name: sourceApp?.name ?? student.name ?? '',
        phone: sourceApp?.phone ?? student.phone ?? '',
        country_code: sourceApp?.country_code ?? student.country_code ?? null,
        user_email: sourceApp?.user_email ?? student.user_email ?? '',
        image: sourceApp?.image || student.image || student.profile_picture || '',
        second_code: sourceApp?.second_code ?? 0,
        second_phone: sourceApp?.second_phone ?? '',
        whatsapp_no: sourceApp?.whatsapp_no ?? 0,
        whatsapp: sourceApp?.whatsapp ?? null,
        date_of_birth: sourceApp?.date_of_birth ?? null,
        age: sourceApp?.age ?? null,
        gender: sourceApp?.gender ?? null,
        nationality: sourceApp?.nationality ?? null,
        marital_status: sourceApp?.marital_status ?? null,
        father_name: sourceApp?.father_name ?? null,
        mother_name: sourceApp?.mother_name ?? null,
        guardian_name: sourceApp?.guardian_name ?? null,
        aadhar_no: sourceApp?.aadhar_no ?? null,
        passport_no: sourceApp?.passport_no ?? null,
        address: sourceApp?.address ?? null,
        native_address: sourceApp?.native_address ?? null,
        country_id: sourceApp?.country_id ?? null,
        state: sourceApp?.state ?? null,
        district: sourceApp?.district ?? null,
        highest_qualification: sourceApp?.highest_qualification ?? null,
        previous_school: sourceApp?.previous_school ?? null,
        year_of_passing: sourceApp?.year_of_passing ?? null,
        percentage_or_grade: sourceApp?.percentage_or_grade ?? null,
        employment_status: sourceApp?.employment_status ?? null,
        current_occupation: sourceApp?.current_occupation ?? null,
        experience_years: sourceApp?.experience_years ?? null,
        emergency_name: sourceApp?.emergency_name ?? null,
        emergency_relation: sourceApp?.emergency_relation ?? null,
        emergency_phone: sourceApp?.emergency_phone ?? null,
        biography: sourceApp?.biography ?? null,
        learning_disabilities: sourceApp?.learning_disabilities ?? null,
        accessibility_needs: sourceApp?.accessibility_needs ?? null,
        // Enrolment-specific (new) fields
        course_id: courseIdInt,
        offering_id: offeringPk,
        certificate_combination_id: combinationPk,
        mode_of_study: input.modeOfStudy || null,
        preferred_language: input.preferredLanguage || null,
        pipeline: input.pipeline || null,
        pipeline_user: pipelineUserPk,
        marketing_source: input.leadSource === 'Reference' && input.referenceStudentId
          ? `Reference#${input.referenceStudentId}`
          : (input.leadSource || null),
        application_discount: discountVal,
        application_gst_percent: gstVal,
        application_final_fee: finalFee,
        stage,
        status: isAdmin ? 'converted' : 'pending',
        is_converted: isConverted,
        converted_at: isAdmin ? now : null,
        converted_by: isAdmin ? actorPk : null,
        admin_approved_at: isAdmin ? now : null,
        admin_approved_by: isAdmin ? actorPk : null,
        created_at: now,
        updated_at: now,
        created_by: actorPk,
        updated_by: actorPk,
      },
      select: { id: true, application_id: true },
    });

    // Record the lifecycle event so the View page activity timeline picks
    // it up and the existing notifyApplicationEvent fan-out runs.
    await this.recordEvent(created.id, 'lead_created', `Additional enrolment created by ${actor.name ?? 'user'} (${actor.role_id})`, actorUserId, {
      student_id: student.id,
      via: 'add-additional-enrolment',
    });

    let enrolRow: { id: number; enrollment_id: string | null } | null = null;
    if (isAdmin) {
      // Admin path: create the enrol row immediately. Enrolment-id format
      // matches what approveApplication uses elsewhere.
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const enrollmentIdSeq = `TIDMTT${yy}${mm}${String(student.id).padStart(4, '0')}`;
      const enrol = await this.prisma.enrol.create({
        data: {
          user_id: student.id,
          course_id: courseIdInt,
          enrollment_id: enrollmentIdSeq,
          enrollment_status: 'Active',
          mode_of_study: input.modeOfStudy || null,
          preferred_language: input.preferredLanguage || null,
          pipeline: input.pipeline || null,
          pipeline_user: pipelineUserPk,
          discount_perc: discountVal != null ? String(discountVal) : null,
          created_at: now,
          updated_at: now,
          created_by: actorPk,
          updated_by: actorPk,
        },
        select: { id: true, enrollment_id: true },
      });
      enrolRow = enrol;
    }

    // Optional payment-link generation (admin + counsellor/associate
    // both supported — admin pays first, counsellor pays before approval).
    let paymentLinkUrl: string | null = null;
    if (input.paymentMode === 'link' && finalFee && finalFee > 0) {
      try {
        const linkResult = await this.generatePaymentLink(actorUserId, {
          applicationId: String(created.id),
          mode: 'full',
          totalAmount: Math.round(finalFee * 100),
        });
        if (linkResult.status === 1) {
          const linkData = (linkResult.data && typeof linkResult.data === 'object' ? linkResult.data : {}) as Record<string, unknown>;
          const url = linkData.short_url ?? linkData.payment_link_url ?? linkResult.payment_link_url;
          paymentLinkUrl = typeof url === 'string' && url.length > 0 ? url : null;
        }
      } catch { /* swallow — admin can re-trigger from the application view */ }
    }

    // Optional manual payment record. Segregation of duties: only an
    // admin/subadmin may record a payment as already Paid. A counsellor or
    // associate can log the collection, but it lands as Pending so Finance must
    // confirm receipt before it counts (recording != confirming) — otherwise a
    // commission-driven actor could fabricate self-confirmed "Paid" revenue.
    if (input.paymentMode === 'manual' && finalFee && finalFee > 0) {
      await this.prisma.student_payments.create({
        data: {
          user_id: student.id,
          course_id: courseIdInt,
          installment_details: 'Full course fee',
          amount: Math.round(finalFee),
          payment_mode: input.manualPaymentMode || 'Cash',
          status: isAdmin ? 'Paid' : 'Pending',
          due_date: now,
          paid_date: isAdmin ? now : null,
          created_by: actorPk,
          updated_by: actorPk,
          created_at: now,
          updated_at: now,
          payment_to: input.manualReference || 'ttii',
        },
      });
    }

    return {
      status: 1,
      message: isAdmin
        ? 'Additional enrolment created.'
        : 'Enrolment request submitted for admin approval.',
      data: {
        application_id: created.id,
        application_code: created.application_id,
        enrol_id: enrolRow?.id ?? null,
        enrollment_id: enrolRow?.enrollment_id ?? null,
        pending_admin_approval: !isAdmin,
        payment_link_url: paymentLinkUrl,
      },
    };
  }

  async updateEnrolment(actorUserId: string, input: {
    enrolId: string;
    enrollmentId?: string;
    enrollmentStatus?: string;
    modeOfStudy?: string;
    preferredLanguage?: string;
    offeringId?: string;
    combinationId?: string;
    pipeline?: string;
    pipelineUser?: string;
    leadSource?: string;
  }): Promise<Record<string, unknown>> {
    if (!input.enrolId) return { status: 0, message: 'Enrolment ID is required.' };
    const enrolPk = toIntId(input.enrolId);
    if (!enrolPk) return { status: 0, message: 'Invalid enrolment id.' };

    const enrol = await this.prisma.enrol.findFirst({
      where: { id: enrolPk, deleted_at: null },
      select: { id: true, user_id: true, course_id: true },
    });
    if (!enrol) return { status: 0, message: 'Enrolment not found.' };

    const actor = toIntId(actorUserId);
    const now = new Date();

    const pipelineUserPk = input.pipelineUser !== undefined ? toNullableIntId(input.pipelineUser) : undefined;

    const enrolFields: Record<string, unknown> = { updated_by: actor, updated_at: now };
    if (input.enrollmentId !== undefined && input.enrollmentId.trim() !== '') enrolFields.enrollment_id = input.enrollmentId.trim();
    if (input.enrollmentStatus !== undefined) enrolFields.enrollment_status = input.enrollmentStatus.trim();
    if (input.modeOfStudy !== undefined) enrolFields.mode_of_study = input.modeOfStudy.trim();
    if (input.preferredLanguage !== undefined) enrolFields.preferred_language = input.preferredLanguage.trim();
    if (input.pipeline !== undefined) enrolFields.pipeline = input.pipeline.trim() || null;
    if (input.pipelineUser !== undefined) enrolFields.pipeline_user = pipelineUserPk && pipelineUserPk > 0 ? pipelineUserPk : null;

    await this.prisma.enrol.updateMany({ where: { id: enrolPk }, data: enrolFields });

    // Offering, Combination, Pipeline, Pipeline User, Lead Source live on
    // applications. Apply them when provided; auto-create the application
    // row for legacy users (users.application_id=0).
    const wantsAppUpdate =
      input.offeringId !== undefined ||
      input.combinationId !== undefined ||
      input.pipeline !== undefined ||
      input.pipelineUser !== undefined ||
      input.leadSource !== undefined;
    if (wantsAppUpdate && enrol.user_id) {
      const offeringPk = input.offeringId !== undefined ? toNullableIntId(input.offeringId) : undefined;
      const combinationPk = input.combinationId !== undefined ? toNullableIntId(input.combinationId) : undefined;

      const appFields: Record<string, unknown> = {};
      // Treat a blank/untouched dropdown as "leave unchanged" — never null an
      // existing offering/combination id (nulling it forces enrolmentPackage=null
      // forever and freezes the Fee Summary on the legacy course_fee fallback).
      if (input.offeringId !== undefined && input.offeringId.trim() !== '' && offeringPk && offeringPk > 0) {
        appFields.offering_id = offeringPk;
      }
      if (input.combinationId !== undefined && input.combinationId.trim() !== '' && combinationPk && combinationPk > 0) {
        appFields.certificate_combination_id = combinationPk;
      }
      if (input.pipeline !== undefined) appFields.pipeline = input.pipeline.trim() || null;
      if (input.pipelineUser !== undefined) appFields.pipeline_user = pipelineUserPk && pipelineUserPk > 0 ? pipelineUserPk : null;
      if (input.leadSource !== undefined) appFields.lead_source = input.leadSource.trim() || null;

      const user = await this.prisma.users.findFirst({
        where: { id: enrol.user_id, deleted_at: null },
        select: { id: true, name: true, phone: true, user_email: true, country_code: true, image: true, profile_picture: true, application_id: true },
      });

      if (user) {
        if (user.application_id && user.application_id > 0) {
          appFields.updated_by = actor;
          appFields.updated_at = now;
          await this.prisma.applications.updateMany({
            where: { id: user.application_id, deleted_at: null },
            data: appFields,
          });
        } else {
          const yy = String(now.getFullYear()).slice(-2);
          const placeholderAppId = `TTII${yy}LEG${user.id}`;
          const created = await this.prisma.applications.create({
            data: {
              application_id: placeholderAppId,
              name: user.name ?? '',
              phone: user.phone ?? '',
              country_code: user.country_code ?? null,
              user_email: user.user_email ?? '',
              image: user.image || user.profile_picture || '',
              second_code: 0,
              second_phone: '',
              whatsapp_no: 0,
              stage: 'enrolled',
              is_converted: 1,
              converted_at: now,
              converted_by: actor,
              created_at: now,
              updated_at: now,
              created_by: actor,
              updated_by: actor,
              course_id: enrol.course_id ?? null,
              ...appFields,
            },
            select: { id: true },
          });
          await this.prisma.users.updateMany({
            where: { id: user.id, deleted_at: null },
            data: { application_id: created.id, updated_at: now, updated_by: actor },
          });
        }
      }
    }

    return { status: 1, message: 'Enrolment updated successfully.' };
  }

  async editStudentInfo(
    actorUserId: string,
    studentId: string,
    input: {
      name?: string;
      phone?: string;
      userEmail?: string;
      dateOfBirth?: string;
      gender?: string;
      nationality?: string;
      maritalStatus?: string;
      fatherName?: string;
      motherName?: string;
      guardianName?: string;
      aadharNo?: string;
      passportNo?: string;
      whatsappNo?: string;
      country?: string;
      state?: string;
      city?: string;
      address?: string;
      nativeAddress?: string;
      profilePicture?: string;
      image?: string;
      countryCode?: string;
      alternatePhone?: string;
      status?: string;
      // Qualification + employment fields (live on applications table).
      highestQualification?: string;
      specialization?: string;
      institutionName?: string;
      yearOfPassing?: string;
      percentageOrGrade?: string;
      employmentStatus?: string;
      currentOccupation?: string;
      experienceYears?: string;
      // Enrolment / pipeline / fee fields (mirror Add Application Tab 3-5).
      courseId?: string;
      offeringId?: string;
      certificateCombinationId?: string;
      modeOfStudy?: string;
      preferredLanguage?: string;
      pipeline?: string;
      pipelineUser?: string;
      leadSource?: string;
      referenceStudentId?: string;
      registrationFee?: string;
      gstPercent?: string;
      gstApplicability?: string;
      finalCourseFee?: string;
      discount?: string;
      discountType?: string;
      installmentPlan?: string; // JSON
      documents?: string;       // JSON
      // Naji 2026-05-05: application-captured fields the Edit form
      // now exposes — written to the applications row.
      age?: string;
      emergencyName?: string;
      emergencyRelation?: string;
      emergencyPhone?: string;
      biography?: string;
      learningDisabilities?: string;
      accessibilityNeeds?: string;
    } | string,
    legacyPhone?: string,
  ): Promise<Record<string, unknown>> {
    if (!studentId) return { status: 0, message: 'Student ID is required.' };

    // Backward-compat: old call sites pass (name, phone) as positional args.
    // The new call shape is an object covering the full edit-student form.
    // Personal / qualification fields live on `applications`, not `users` —
    // we update both rows in one shot.
    const userFields: Record<string, unknown> = {};
    const appFields: Record<string, unknown> = {};

    if (typeof input === 'string') {
      if (input.trim()) userFields.name = input.trim();
      if (legacyPhone && legacyPhone.trim()) userFields.phone = legacyPhone.trim();
    } else {
      // Columns that exist on `users`:
      if (input.name !== undefined) userFields.name = input.name.trim();
      if (input.phone !== undefined) userFields.phone = input.phone.trim();
      if (input.userEmail !== undefined) userFields.user_email = input.userEmail.trim();
      if (input.dateOfBirth !== undefined) userFields.dob = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
      if (input.gender !== undefined) userFields.gender = input.gender || '';
      if (input.profilePicture !== undefined) userFields.profile_picture = input.profilePicture || '';
      if (input.image !== undefined) userFields.image = input.image || '';
      if (input.countryCode !== undefined) userFields.country_code = input.countryCode || null;
      // WhatsApp lives on multiple columns: users.whatsapp_phone (legacy),
      // users.whatsapp, applications.whatsapp (string), applications.whatsapp_no
      // (int). Naji 2026-05-07 — write to all so any read path surfaces the
      // value. The int column gets digits-only.
      if (input.whatsappNo !== undefined) {
        userFields.whatsapp_phone = input.whatsappNo || null;
        userFields.whatsapp = input.whatsappNo || null;
      }
      if (input.status !== undefined) {
        const s = Number(input.status);
        if (Number.isFinite(s)) userFields.status = s;
      }

      // Columns that exist on `applications`:
      if (input.dateOfBirth !== undefined) appFields.date_of_birth = input.dateOfBirth ? new Date(input.dateOfBirth) : null;
      if (input.gender !== undefined) appFields.gender = input.gender || null;
      if (input.nationality !== undefined) appFields.nationality = input.nationality || null;
      if (input.maritalStatus !== undefined) appFields.marital_status = input.maritalStatus || null;
      if (input.fatherName !== undefined) appFields.father_name = input.fatherName || null;
      if (input.motherName !== undefined) appFields.mother_name = input.motherName || null;
      if (input.guardianName !== undefined) appFields.guardian_name = input.guardianName || null;
      if (input.aadharNo !== undefined) appFields.aadhar_no = input.aadharNo || null;
      if (input.passportNo !== undefined) appFields.passport_no = input.passportNo || null;
      // Naji UAT 2026-05-14 — country was declared in the input type but
      // never written to either users or applications, so every edit on
      // the Country dropdown silently vanished after save. applications
      // .country_id is MediumText, so it can carry either the legacy
      // numeric FK or the country name; the read path (getStudentDetail)
      // already handles both via parseLooseInt + countryRow lookup.
      if (input.country !== undefined) appFields.country_id = input.country || null;
      if (input.state !== undefined) appFields.state = input.state || null;
      if (input.city !== undefined) appFields.district = input.city || null;
      if (input.address !== undefined) appFields.address = input.address || null;
      if (input.nativeAddress !== undefined) appFields.native_address = input.nativeAddress || null;
      // Naji 2026-05-07 — also write WhatsApp to the applications row so
      // View can read it back without depending on the users table column.
      if (input.whatsappNo !== undefined) {
        appFields.whatsapp = input.whatsappNo || null;
        appFields.whatsapp_no = input.whatsappNo
          ? Number((input.whatsappNo.match(/\d+/g) ?? []).join('').slice(-15)) || 0
          : 0;
      }
      if (input.alternatePhone !== undefined) appFields.second_phone = input.alternatePhone || '';
      // Qualification + employment fields (the application form captured them).
      if (input.highestQualification !== undefined) appFields.highest_qualification = input.highestQualification || null;
      if (input.institutionName !== undefined) appFields.previous_school = input.institutionName || null;
      if (input.yearOfPassing !== undefined) appFields.year_of_passing = input.yearOfPassing || null;
      if (input.percentageOrGrade !== undefined) appFields.percentage_or_grade = input.percentageOrGrade || null;
      if (input.employmentStatus !== undefined) appFields.employment_status = input.employmentStatus || null;
      if (input.currentOccupation !== undefined) appFields.current_occupation = input.currentOccupation || null;
      if (input.experienceYears !== undefined) appFields.experience_years = input.experienceYears || null;
      // Naji 2026-05-05: round-trip the application-captured fields.
      if (input.age !== undefined) {
        const n = Number(input.age);
        appFields.age = Number.isFinite(n) && n > 0 ? n : null;
      }
      if (input.emergencyName !== undefined) appFields.emergency_name = input.emergencyName || null;
      if (input.emergencyRelation !== undefined) appFields.emergency_relation = input.emergencyRelation || null;
      if (input.emergencyPhone !== undefined) appFields.emergency_phone = input.emergencyPhone || null;
      if (input.biography !== undefined) appFields.biography = input.biography || null;
      if (input.learningDisabilities !== undefined) appFields.learning_disabilities = input.learningDisabilities || null;
      if (input.accessibilityNeeds !== undefined) appFields.accessibility_needs = input.accessibilityNeeds || null;
      // Mirror Highest Qualification onto users.highest_qualification too —
      // legacy code reads it from the user record in places (e.g. analytics).
      if (input.highestQualification !== undefined) userFields.highest_qualification = input.highestQualification || null;

      // Enrolment / pipeline fields (live on applications).
      if (input.courseId !== undefined) appFields.course_id = input.courseId ? Number(input.courseId) : null;
      if (input.offeringId !== undefined) appFields.offering_id = input.offeringId ? Number(input.offeringId) : null;
      if (input.certificateCombinationId !== undefined) appFields.certificate_combination_id = input.certificateCombinationId ? Number(input.certificateCombinationId) : null;
      if (input.modeOfStudy !== undefined) appFields.mode_of_study = input.modeOfStudy || null;
      if (input.preferredLanguage !== undefined) appFields.preferred_language = input.preferredLanguage || null;
      if (input.pipeline !== undefined) appFields.pipeline = input.pipeline || null;
      if (input.pipelineUser !== undefined) appFields.pipeline_user = input.pipelineUser ? Number(input.pipelineUser) : null;
      if (input.leadSource !== undefined) {
        // Reference#<id> encoding mirrors createApplication.
        appFields.marketing_source = input.leadSource === 'Reference' && input.referenceStudentId
          ? `Reference#${input.referenceStudentId}`
          : (input.leadSource || null);
      }
      // Fee fields: discount %, GST %, final fee. Discount type, registration
      // fee, instalment plan and document list are stashed in `biography`
      // until dedicated columns land — preserve any other JSON keys already
      // there (writing keys merge with existing).
      if (input.discount !== undefined) appFields.application_discount = input.discount ? Number(input.discount) : null;
      if (input.gstPercent !== undefined) appFields.application_gst_percent = input.gstPercent ? Number(input.gstPercent) : null;
      if (input.finalCourseFee !== undefined) appFields.application_final_fee = input.finalCourseFee ? Number(input.finalCourseFee) : null;

      const biographyKeys: Record<string, unknown> = {};
      if (input.registrationFee !== undefined) biographyKeys.registration_fee = input.registrationFee || null;
      if (input.discountType !== undefined) biographyKeys.discount_type = input.discountType || null;
      if (input.installmentPlan !== undefined) biographyKeys.installment_plan = safeParseJson(input.installmentPlan);
      if (input.documents !== undefined) biographyKeys.documents = safeParseJson(input.documents);
      // Naji 2026-05-07: stash specialization here too — schema has no
      // top-level column on applications, but this lets View round-trip it.
      if (input.specialization !== undefined) biographyKeys.specialization = input.specialization || null;
      if (Object.keys(biographyKeys).length > 0) {
        // Merge into existing biography JSON if present, else create a new
        // object. Stored as a string regardless.
        appFields._biographyMerge = biographyKeys;
      }
    }

    if (Object.keys(userFields).length === 0 && Object.keys(appFields).length === 0) {
      return { status: 0, message: 'No fields to update.' };
    }

    const now = new Date();
    const actor = toIntId(actorUserId);

    if (Object.keys(userFields).length > 0) {
      userFields.updated_by = actor;
      userFields.updated_at = now;
      await this.prisma.users.updateMany({
        where: { id: toIntId(studentId), deleted_at: null },
        data: userFields,
      });
    }

    if (Object.keys(appFields).length > 0) {
      const user = await this.prisma.users.findFirst({
        where: { id: toIntId(studentId), deleted_at: null },
        select: { application_id: true, user_email: true },
      });
      const applicationId = user?.application_id;

      // Merge biography JSON if requested.
      const biographyMerge = appFields._biographyMerge as Record<string, unknown> | undefined;
      delete appFields._biographyMerge;
      if (biographyMerge && applicationId) {
        const current = await this.prisma.applications.findFirst({
          where: { id: applicationId, deleted_at: null },
          select: { biography: true },
        });
        let parsed: Record<string, unknown> = {};
        if (current?.biography) {
          try { parsed = JSON.parse(current.biography) as Record<string, unknown>; }
          catch { parsed = {}; }
        }
        appFields.biography = JSON.stringify({ ...parsed, ...biographyMerge });
      }

      if (applicationId) {
        appFields.updated_by = actor;
        appFields.updated_at = now;
        await this.prisma.applications.updateMany({
          where: { id: applicationId, deleted_at: null },
          data: appFields,
        });
      } else if (user?.user_email) {
        // Seeded user without a linked application — pick the most recent
        // application by email, if any.
        const fallback = await this.prisma.applications.findFirst({
          where: { user_email: user.user_email, deleted_at: null },
          orderBy: { created_at: 'desc' },
          select: { id: true },
        });
        if (fallback) {
          appFields.updated_by = actor;
          appFields.updated_at = now;
          await this.prisma.applications.updateMany({
            where: { id: fallback.id, deleted_at: null },
            data: appFields,
          });
          // Backfill the link so subsequent edits find the row directly.
          await this.prisma.users.updateMany({
            where: { id: toIntId(studentId), deleted_at: null },
            data: { application_id: fallback.id, updated_at: now, updated_by: actor },
          });
        } else {
          // Naji 2026-05-11 — most legacy students (DIVYA, SARANYA, etc.)
          // were imported with users.application_id=0 and no matching
          // application row. Previously every edit to address / father /
          // mother / aadhar / etc. silently vanished because there was
          // nowhere to write them. Auto-create the applications row from
          // the user's basic info + the edited fields, mark it enrolled
          // (the user already has an enrol row), and link it back so the
          // next edit finds it directly.
          const fullUser = await this.prisma.users.findFirst({
            where: { id: toIntId(studentId), deleted_at: null },
            select: { name: true, phone: true, user_email: true, country_code: true, image: true, profile_picture: true },
          });
          if (fullUser) {
            // Generate a TTII-format application_id (matches the format used
            // by the Lead workflow's nextApplicationId — best-effort here:
            // a recognisable prefix that admins won't confuse with leads).
            const yy = String(now.getFullYear()).slice(-2);
            const placeholderAppId = `TTII${yy}LEG${toIntId(studentId)}`;
            const created = await this.prisma.applications.create({
              data: {
                application_id: placeholderAppId,
                name: fullUser.name ?? '',
                phone: fullUser.phone ?? '',
                country_code: fullUser.country_code ?? null,
                user_email: fullUser.user_email ?? '',
                image: fullUser.image || fullUser.profile_picture || '',
                second_code: 0,
                second_phone: '',
                whatsapp_no: 0,
                stage: 'enrolled',
                is_converted: 1,
                converted_at: now,
                converted_by: actor,
                created_at: now,
                updated_at: now,
                created_by: actor,
                updated_by: actor,
                ...appFields,
              },
              select: { id: true },
            });
            await this.prisma.users.updateMany({
              where: { id: toIntId(studentId), deleted_at: null },
              data: { application_id: created.id, updated_at: now, updated_by: actor },
            });
          }
        }
      }
    }

    return { status: 1, message: 'Student info updated successfully.' };
  }

  async listBatchStudents(batchId: string): Promise<SqlRow[]> {
    if (!batchId) return [];

    const enrols = await this.prisma.enrol.findMany({
      where: { batch_id: toIntId(batchId), deleted_at: null },
      select: { user_id: true, course_id: true, enrollment_id: true },
    });

    const userIds = [...new Set(enrols.map(e => e.user_id).filter((x): x is number => x !== null && x !== undefined))];
    if (userIds.length === 0) return [];

    const users = await this.prisma.users.findMany({
      where: { id: { in: userIds }, deleted_at: null },
      select: { id: true, name: true, user_email: true, phone: true, student_id: true, status: true },
    });

    const statusLabels: Record<number, string> = { 0: 'Inactive', 1: 'Active', 2: 'Graduated', 3: 'Dropped' };
    const enrolMap = new Map(enrols.filter(e => e.user_id !== null && e.user_id !== undefined).map(e => [e.user_id as number, e]));

    return users.map(u => ({
      ...u,
      enrollment_id: enrolMap.get(u.id)?.enrollment_id ?? null,
      status_label: u.status !== null && u.status !== undefined ? statusLabels[u.status] ?? 'Unknown' : 'Unknown',
    })) as unknown as SqlRow[];
  }

  // ─── Phase D: Centres Feature ─────────────────────────────────────────────

  async getCentre(centreId: string): Promise<Record<string, unknown>> {
    const centre = await this.prisma.centres.findFirst({
      where: { id: toIntId(centreId), deleted_at: null },
    });

    if (!centre) {
      return { status: 0, message: 'Centre not found' };
    }

    const coursePlans = await this.prisma.centre_course_plans.findMany({
      where: { centre_id: toIntId(centreId), deleted_at: null },
    });

    const courseIds = [...new Set(coursePlans.map(cp => cp.course_id))];
    const courses = courseIds.length > 0
      ? await this.prisma.course.findMany({
          where: { id: { in: courseIds }, deleted_at: null },
          select: { id: true, title: true },
        })
      : [];
    const courseMap = new Map(courses.map(c => [c.id, c.title]));

    const fundRequestCount = await this.prisma.centre_fund_requests.count({
      where: { centre_id: toIntId(centreId), deleted_at: null },
    });

    const studentCount = centre.id
      ? await this.prisma.users.count({
          where: { added_under_centre: centre.id, role_id: { equals: 2 }, deleted_at: null },
        })
      : 0;

    return {
      status: 1,
      message: 'success',
      data: {
        centre: {
          ...centre,
          students_count: studentCount,
          fund_request_count: fundRequestCount,
        },
        course_plans: coursePlans.map(cp => ({
          ...cp,
          course_title: courseMap.get(cp.course_id) ?? null,
        })),
      },
    };
  }

  async updateCentre(actorUserId: string, centreId: string, input: UpdateCentreInput): Promise<Record<string, unknown>> {
    const now = new Date();

    const existing = await this.prisma.centres.findFirst({
      where: { id: toIntId(centreId), deleted_at: null },
    });
    if (!existing) {
      return { status: 0, message: 'Centre not found' };
    }

    await this.prisma.centres.update({
      where: { id: toIntId(centreId) },
      data: {
        ...(input.centreName ? { centre_name: input.centreName } : {}),
        ...(input.contactPerson !== undefined ? { contact_person: input.contactPerson } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.affiliationDocument !== undefined ? { affiliation_document: input.affiliationDocument } : {}),
        ...(input.registrationDate ? { date_of_registration: input.registrationDate } : {}),
        ...(input.expiryDate ? { date_of_expiry: input.expiryDate } : {}),
        updated_by: toIntId(actorUserId),
        updated_at: now,
      },
    });

    return { status: 1, message: 'Centre updated successfully.' };
  }

  async deleteCentre(actorUserId: string, centreId: string): Promise<Record<string, unknown>> {
    const now = new Date();

    const existing = await this.prisma.centres.findFirst({
      where: { id: toIntId(centreId), deleted_at: null },
    });
    if (!existing) {
      return { status: 0, message: 'Centre not found' };
    }

    await this.prisma.centres.update({
      where: { id: toIntId(centreId) },
      data: { deleted_at: now, deleted_by: toIntId(actorUserId), updated_at: now },
    });

    return { status: 1, message: 'Centre deleted successfully.' };
  }

  async approveFundRequest(actorUserId: string, requestId: string): Promise<Record<string, unknown>> {
    const now = new Date();

    const request = await this.prisma.centre_fund_requests.findFirst({
      where: { id: toIntId(requestId), deleted_at: null },
    });
    if (!request) {
      return { status: 0, message: 'Fund request not found' };
    }
    if (request.status !== 'pending') {
      return { status: 0, message: 'Fund request is already ' + request.status };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.centre_fund_requests.update({
        where: { id: toIntId(requestId) },
        data: { status: 'approved', updated_by: toIntId(actorUserId), updated_at: now },
      });

      await tx.wallet_transactions.create({
        data: {
          centre_id: request.centre_id,
          transaction_type: 'credit',
          amount: request.amount,
          remarks: `Fund request approved #${requestId}`,
          created_by: toIntId(actorUserId),
          created_at: now,
          updated_at: now,
        },
      });

      const centreRow = await tx.centres.findFirst({ where: { id: request.centre_id } });
      const currentBalance = Number(centreRow?.wallet_balance ?? '0') || 0;
      const addAmount = Number(request.amount) || 0;
      await tx.centres.update({
        where: { id: request.centre_id },
        data: {
          wallet_balance: String(currentBalance + addAmount),
          updated_by: toIntId(actorUserId),
          updated_at: now,
        },
      });
    });

    return { status: 1, message: 'Fund request approved and wallet credited.' };
  }

  async rejectFundRequest(actorUserId: string, requestId: string): Promise<Record<string, unknown>> {
    const now = new Date();

    const request = await this.prisma.centre_fund_requests.findFirst({
      where: { id: toIntId(requestId), deleted_at: null },
    });
    if (!request) {
      return { status: 0, message: 'Fund request not found' };
    }
    if (request.status !== 'pending') {
      return { status: 0, message: 'Fund request is already ' + request.status };
    }

    await this.prisma.centre_fund_requests.update({
      where: { id: toIntId(requestId) },
      data: { status: 'rejected', updated_by: toIntId(actorUserId), updated_at: now },
    });

    return { status: 1, message: 'Fund request rejected.' };
  }

  /**
   * Returns the recording storage key for a live session so the calling
   * route can mint a short-lived signed download URL. Returns null when no
   * recording has been synced yet.
   */
  async getLiveSessionRecordingStorageKey(liveClassId: string): Promise<string | null> {
    const liveClassIdInt = toIntId(liveClassId);
    if (!liveClassIdInt) return null;
    const row = await this.prisma.live_class.findFirst({
      where: { id: liveClassIdInt, deleted_at: null },
      select: { recording_storage_key: true },
    });
    return row?.recording_storage_key ?? null;
  }

  // Returns either a storage key (we sign it) or an absolute URL (we hand
  // back as-is). Legacy sessions stored Vimeo / Graph URLs directly in
  // recording_url; the new pipeline uploads to Spaces and writes
  // recording_storage_key. Both should play from the same admin button.
  async getLiveSessionRecordingTarget(
    liveClassId: string,
  ): Promise<{ kind: 'key'; key: string } | { kind: 'url'; url: string } | null> {
    const liveClassIdInt = toIntId(liveClassId);
    if (!liveClassIdInt) return null;
    const row = await this.prisma.live_class.findFirst({
      where: { id: liveClassIdInt, deleted_at: null },
      select: { recording_storage_key: true, recording_url: true, video_url: true },
    });
    if (!row) return null;
    if (row.recording_storage_key) return { kind: 'key', key: row.recording_storage_key };
    const fallback = row.recording_url || row.video_url;
    if (fallback && /^https?:\/\//i.test(fallback)) return { kind: 'url', url: fallback };
    return null;
  }

  // Persist an externally-hosted recording link (e.g. a Vimeo URL) for a live
  // session. Writing to recording_url lets getLiveSessionRecordingTarget hand it
  // back as a kind:'url' target, so the admin "View Recording" button opens it.
  async updateLiveSessionRecording(
    actorUserId: string,
    sessionId: string,
    recordingUrl: string,
  ): Promise<Record<string, unknown>> {
    const liveClassIdInt = toIntId(sessionId);
    if (!liveClassIdInt) {
      return { status: 0, message: 'Invalid session id.' };
    }
    const url = (recordingUrl ?? '').trim();
    if (!url) {
      return { status: 0, message: 'Recording link is required.' };
    }
    if (!/^https?:\/\//i.test(url)) {
      return { status: 0, message: 'Enter a valid link starting with http:// or https://' };
    }
    const session = await this.prisma.live_class.findFirst({
      where: { id: liveClassIdInt, deleted_at: null },
      select: { id: true },
    });
    if (!session) {
      return { status: 0, message: 'Live session not found.' };
    }
    await this.prisma.live_class.update({
      where: { id: liveClassIdInt },
      data: {
        recording_url: url,
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });
    return {
      status: 1,
      message: 'Recording link saved.',
      data: { id: String(liveClassIdInt), recording_url: url },
    };
  }

  // Soft-delete a cohort live session. Every live-class list (cohort detail,
  // calendar, counts) filters `deleted_at: null`, so stamping deleted_at hides
  // the session everywhere while keeping its attendance/recording history intact
  // and making the action reversible at the DB level.
  async deleteLiveSession(
    actorUserId: string,
    sessionId: string,
  ): Promise<Record<string, unknown>> {
    const liveClassIdInt = toIntId(sessionId);
    if (!liveClassIdInt) {
      return { status: 0, message: 'Invalid session id.' };
    }
    const session = await this.prisma.live_class.findFirst({
      where: { id: liveClassIdInt, deleted_at: null },
      select: { id: true },
    });
    if (!session) {
      return { status: 0, message: 'Live session not found.' };
    }
    const now = new Date();
    await this.prisma.live_class.update({
      where: { id: liveClassIdInt },
      data: {
        deleted_at: now,
        deleted_by: toNullableIntId(actorUserId),
        updated_at: now,
        updated_by: toNullableIntId(actorUserId),
      },
    });
    return {
      status: 1,
      message: 'Live session deleted.',
      data: { id: String(liveClassIdInt) },
    };
  }

  // Soft-remove a learner from a cohort. cohort_students.cohort_id is a TEXT
  // column that historically stored either the numeric cohorts.id (stringified)
  // or the legacy text cohort code, so match against both keys — mirrors the
  // dual-key logic in addCohortLearners.
  async removeCohortLearner(
    actorUserId: string,
    cohortId: string,
    studentId: string,
  ): Promise<Record<string, unknown>> {
    const cId = toIntId(cohortId);
    if (!cId) return { status: 0, message: 'Invalid cohort id.' };
    const userIdInt = toIntId(studentId);
    if (!userIdInt) return { status: 0, message: 'Invalid student id.' };

    const cohort = await this.prisma.cohorts.findFirst({
      where: { id: cId, deleted_at: null },
      select: { id: true, cohort_id: true },
    });
    if (!cohort) return { status: 0, message: 'Cohort not found.' };

    const cohortKeys = [String(cohort.id)];
    if (cohort.cohort_id) cohortKeys.push(cohort.cohort_id);

    const now = new Date();
    const actor = toNullableIntId(actorUserId);
    const result = await this.prisma.cohort_students.updateMany({
      where: { cohort_id: { in: cohortKeys }, user_id: userIdInt, deleted_at: null },
      data: { deleted_at: now, deleted_by: actor, updated_at: now, updated_by: actor },
    });
    if (result.count === 0) {
      return { status: 0, message: 'Learner not found in cohort.' };
    }

    return { status: 1, message: 'Learner removed from cohort.', data: {} };
  }

  // Soft-delete an assignment submission row. Every submission list filters
  // `deleted_at: null`, so stamping deleted_at hides it everywhere while keeping
  // the marks/file history intact and the action reversible at the DB level.
  async deleteAssignmentSubmission(
    actorUserId: string,
    submissionId: string,
  ): Promise<Record<string, unknown>> {
    const subIdInt = toIntId(submissionId);
    if (!subIdInt) {
      return { status: 0, message: 'Invalid submission id.' };
    }
    const submission = await this.prisma.assignment_submissions.findFirst({
      where: { id: subIdInt, deleted_at: null },
      select: { id: true },
    });
    if (!submission) {
      return { status: 0, message: 'Submission not found.' };
    }
    const now = new Date();
    await this.prisma.assignment_submissions.update({
      where: { id: subIdInt },
      data: {
        deleted_at: now,
        deleted_by: toNullableIntId(actorUserId),
        updated_at: now,
        updated_by: toNullableIntId(actorUserId),
      },
    });
    return {
      status: 1,
      message: 'Submission deleted.',
      data: { id: String(subIdInt) },
    };
  }

  async getLiveSessionAttendance(liveClassId: string): Promise<Record<string, unknown>> {
    const liveClassIdInt = toIntId(liveClassId);
    if (!liveClassIdInt) {
      return { status: 0, message: 'Invalid live class id' };
    }

    const session = await this.prisma.live_class.findFirst({
      where: { id: liveClassIdInt, deleted_at: null },
      select: {
        id: true,
        title: true,
        date: true,
        fromTime: true,
        toTime: true,
        platform: true,
        recording_url: true,
        recording_fetched_at: true,
        recording_fetch_error: true,
        attendance_fetched_at: true,
        attendance_fetch_error: true,
      },
    });
    if (!session) {
      return { status: 0, message: 'Live session not found' };
    }

    const attendance = await this.prisma.live_class_attendance.findMany({
      where: { live_class_id: liveClassIdInt },
      orderBy: [{ percent_attended: 'desc' }, { email: 'asc' }],
    });

    // Enrich with users table name/student_id where user_id matched
    const userIds = attendance
      .map((a) => a.user_id)
      .filter((x): x is number => x !== null && x !== undefined);
    const users = userIds.length > 0
      ? await this.prisma.users.findMany({
          where: { id: { in: userIds }, deleted_at: null },
          select: { id: true, name: true, student_id: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    return {
      status: 1,
      data: {
        session,
        attendance: attendance.map((a) => {
          const user = a.user_id ? userMap.get(a.user_id) : null;
          return {
            id: a.id,
            email: a.email,
            display_name: a.display_name,
            role: a.role,
            total_seconds: a.total_seconds,
            percent_attended: a.percent_attended === null ? null : Number(a.percent_attended),
            first_joined_at: a.first_joined_at,
            last_left_at: a.last_left_at,
            user_id: a.user_id,
            user_name: user?.name ?? null,
            student_id: user?.student_id ?? null,
          };
        }),
      },
    };
  }

  async getCohortDetail(cohortId: string): Promise<Record<string, unknown>> {
    const cohortIdInt = toIntId(cohortId);
    const cohort = await this.prisma.cohorts.findFirst({
      where: { id: cohortIdInt, deleted_at: null },
    });
    if (!cohort) {
      return { status: 0, message: 'Cohort not found' };
    }

    // Fetch related names
    const [course, subject, centre, instructor, language] = await Promise.all([
      cohort.course_id ? this.prisma.course.findFirst({ where: { id: cohort.course_id }, select: { id: true, title: true } }) : null,
      cohort.subject_id ? this.prisma.subject.findFirst({ where: { id: cohort.subject_id }, select: { id: true, title: true, short_name: true } }) : null,
      cohort.centre_id ? this.prisma.centres.findFirst({ where: { id: cohort.centre_id }, select: { id: true, centre_name: true } }) : null,
      cohort.instructor_id
        ? this.prisma.users.findFirst({ where: { id: cohort.instructor_id }, select: { id: true, name: true, image: true, profile_picture: true } })
        : null,
      cohort.language_id ? this.prisma.languages.findFirst({ where: { id: cohort.language_id }, select: { id: true, title: true } }) : null,
    ]);

    // Learners — students linked to this cohort. Surface profile photos via
    // the legacy-asset-url shim so the View page renders them.
    const cohortStudents = await this.prisma.cohort_students.findMany({
      where: { cohort_id: cohortId, deleted_at: null },
    });
    const studentUserIds = cohortStudents.map(cs => cs.user_id).filter((x): x is number => x !== null && x !== undefined);
    const [studentUsers, studentEnrolments] = await Promise.all([
      studentUserIds.length > 0
        ? this.prisma.users.findMany({
            where: { id: { in: studentUserIds }, deleted_at: null },
            select: { id: true, name: true, student_id: true, status: true, image: true, profile_picture: true, course_id: true },
          })
        : Promise.resolve([]),
      studentUserIds.length > 0
        ? this.prisma.enrol.findMany({
            where: { user_id: { in: studentUserIds }, deleted_at: null },
            select: { user_id: true, course_id: true, enrollment_id: true },
          })
        : Promise.resolve([]),
    ]);
    const learnerCourseIds = [...new Set(studentEnrolments.map(e => e.course_id).filter((x): x is number => x !== null))];
    const learnerCourses = learnerCourseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: learnerCourseIds } }, select: { id: true, title: true } })
      : [];
    const learnerCourseMap = new Map(learnerCourses.map(c => [c.id, c.title]));
    const enrolByUser = new Map<number, { course_id: number | null; enrollment_id: string | null }>();
    for (const e of studentEnrolments) {
      if (e.user_id != null && !enrolByUser.has(e.user_id)) {
        enrolByUser.set(e.user_id, { course_id: e.course_id, enrollment_id: e.enrollment_id });
      }
    }

    const statusLabels: Record<number, string> = { 0: 'Inactive', 1: 'Active', 2: 'Graduated', 3: 'Dropped' };
    const learners = studentUsers.map(u => {
      const photo = toLegacyFileUrl(u.profile_picture) || toLegacyFileUrl(u.image);
      const enrol = enrolByUser.get(u.id);
      return {
        ...u,
        image: photo,
        profile_picture: photo,
        enrollment_id: enrol?.enrollment_id ?? u.student_id,
        course_title: enrol?.course_id ? learnerCourseMap.get(enrol.course_id) ?? null : null,
        status_label: (u.status !== null && u.status !== undefined ? statusLabels[u.status] : undefined) ?? 'Unknown',
      };
    });

    // Live sessions
    const liveSessions = await this.prisma.live_class.findMany({
      where: { cohort_id: cohortIdInt, deleted_at: null },
      orderBy: { date: 'desc' },
    });

    // Assignments — surface absolute file URL so the View page link works.
    const assignments = await this.prisma.assignment.findMany({
      where: { cohort_id: cohortIdInt, deleted_at: null },
      orderBy: { due_date: 'desc' },
    });
    const assignmentIds = assignments.map(a => a.id);
    const submissionCounts = assignmentIds.length > 0
      ? await this.prisma.assignment_submissions.groupBy({
          by: ['assignment_id'],
          where: { assignment_id: { in: assignmentIds }, deleted_at: null },
          _count: { id: true },
        })
      : [];
    const subCountMap = new Map(submissionCounts.map((sc) => [sc.assignment_id, sc._count?.id ?? 0]));

    const assignmentsWithCounts = assignments.map(a => ({
      ...a,
      file: toLegacyFileUrl(a.file),
      submissions_count: subCountMap.get(a.id) ?? 0,
    }));

    // Announcements — cohort_announcements.cohort_id is the numeric cohorts.id.
    // The View page (AnnouncementsTab) renders title/content/description, so
    // surface those plus the audit timestamps for ordering/display.
    const announcementRows = await this.prisma.cohort_announcements.findMany({
      where: { cohort_id: cohortIdInt, deleted_at: null },
      orderBy: { id: 'desc' },
    });
    const announcements = announcementRows.map((a) => ({
      id: String(a.id),
      cohort_id: a.cohort_id,
      title: a.title,
      content: a.content,
      description: a.description,
      status: a.status,
      created_at: a.created_at,
      updated_at: a.updated_at,
    }));

    const instructorPhoto = instructor
      ? toLegacyFileUrl(instructor.profile_picture) || toLegacyFileUrl(instructor.image)
      : '';

    return {
      status: 1,
      message: 'success',
      cohort: {
        ...cohort,
        course_title: course?.title ?? null,
        subject_title: subject?.title ?? null,
        subject_short_name: subject?.short_name ?? null,
        centre_name: centre?.centre_name ?? null,
        instructor_name: instructor?.name ?? null,
        instructor_image: instructorPhoto,
        language: language?.title ?? null,
        language_title: language?.title ?? null,
      },
      learners,
      live_sessions: liveSessions,
      assignments: assignmentsWithCounts,
      announcements,
    };
  }

  async deleteResource(actorUserId: string, resourceId: string, resourceType: 'file' | 'folder'): Promise<Record<string, unknown>> {
    const now = new Date();

    if (resourceType === 'folder') {
      await this.prisma.folders.updateMany({
        where: { id: toIntId(resourceId), deleted_at: null },
        data: { deleted_at: now, deleted_by: toNullableIntId(actorUserId) },
      });
    } else {
      await this.prisma.files.updateMany({
        where: { id: toIntId(resourceId), deleted_at: null },
        data: { deleted_at: now, deleted_by: toNullableIntId(actorUserId) },
      });
    }

    return { status: 1, message: `${resourceType === 'folder' ? 'Folder' : 'File'} deleted successfully.` };
  }

  async renameResource(actorUserId: string, resourceId: string, resourceType: 'file' | 'folder', newName: string): Promise<Record<string, unknown>> {
    const now = new Date();

    if (resourceType === 'folder') {
      await this.prisma.folders.updateMany({
        where: { id: toIntId(resourceId), deleted_at: null },
        data: { name: newName, updated_by: toNullableIntId(actorUserId), updated_at: now },
      });
    } else {
      await this.prisma.files.updateMany({
        where: { id: toIntId(resourceId), deleted_at: null },
        data: { name: newName, updated_by: toNullableIntId(actorUserId), updated_at: now },
      });
    }

    return { status: 1, message: `${resourceType === 'folder' ? 'Folder' : 'File'} renamed successfully.` };
  }

  async addTrainingVideo(actorUserId: string, input: TrainingVideoInput): Promise<Record<string, unknown>> {
    const now = new Date();

    await this.prisma.training_videos.create({
      data: {
        title: input.title,
        description: toNullableString(input.description),
        category: toStringValue(input.category) || 'Lectures',
        video_type: toStringValue(input.videoType),
        video_url: toStringValue(input.videoUrl),
        thumbnail: toNullableString(input.thumbnail),
        created_by: toNullableIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });

    return { status: 1, message: 'Training video added successfully.' };
  }

  async editTrainingVideo(actorUserId: string, videoId: string, input: TrainingVideoInput): Promise<Record<string, unknown>> {
    const now = new Date();

    await this.prisma.training_videos.updateMany({
      where: { id: toIntId(videoId), deleted_at: null },
      data: {
        title: input.title,
        description: toNullableString(input.description),
        category: toStringValue(input.category) || 'Lectures',
        video_type: toStringValue(input.videoType),
        video_url: toStringValue(input.videoUrl),
        thumbnail: toNullableString(input.thumbnail),
        updated_by: toNullableIntId(actorUserId),
        updated_at: now,
      },
    });

    return { status: 1, message: 'Training video updated successfully.' };
  }

  async deleteTrainingVideo(actorUserId: string, videoId: string): Promise<Record<string, unknown>> {
    const now = new Date();

    await this.prisma.training_videos.updateMany({
      where: { id: toIntId(videoId), deleted_at: null },
      data: { deleted_at: now, deleted_by: toNullableIntId(actorUserId), updated_at: now },
    });

    return { status: 1, message: 'Training video deleted successfully.' };
  }

  async editCentre(actorUserId: string, centreId: string, input: UpdateCentreInput): Promise<Record<string, unknown>> {
    return this.updateCentre(actorUserId, centreId, input);
  }

  // ── Phase F: Payment Actions ──────────────────────────────────

  // Naji UAT 2026-05-14 — Documents tab needs a Replace action on
  // existing rows + an Upload button on required-but-missing slots.
  // Both flow through this single upsert: matching by (student_id,
  // case-insensitive label) updates the row's file; non-existing
  // rows get inserted.
  async upsertStudentDocument(
    actorUserId: string,
    input: { studentId: string; label: string; file: string },
  ): Promise<Record<string, unknown>> {
    const sid = toIntId(input.studentId);
    const label = input.label.trim();
    const file = input.file.trim();
    if (!sid) return { status: 0, message: 'Invalid student id.' };
    if (!label) return { status: 0, message: 'Label is required.' };
    if (!file) return { status: 0, message: 'File URL is required.' };

    const actor = toNullableIntId(actorUserId);
    const now = new Date();
    // MariaDB's default collation (utf8mb4_unicode_ci) is already case
    // insensitive, so a plain `equals` match handles "Aadar" / "AADAR"
    // dedup; no Prisma `mode` flag needed (and the MySQL provider doesn't
    // support it anyway).
    const existing = await this.prisma.student_document.findFirst({
      where: {
        student_id: sid,
        deleted_at: null,
        label,
      },
      select: { student_document_id: true },
    });
    if (existing) {
      await this.prisma.student_document.update({
        where: { student_document_id: existing.student_document_id },
        data: { file, updated_by: actor, updated_at: now },
      });
      return { status: 1, message: 'Document replaced.', data: { id: String(existing.student_document_id) } };
    }
    const created = await this.prisma.student_document.create({
      data: {
        student_id: sid,
        label,
        file,
        created_by: actor,
        created_at: now,
        updated_by: actor,
        updated_at: now,
      },
    });
    return { status: 1, message: 'Document uploaded.', data: { id: String(created.student_document_id) } };
  }

  async markInstallmentPaid(
    actorUserId: string,
    installmentId: string,
    extras?: {
      paidDate?: string;
      paymentMode?: string;
      referenceNumber?: string;
      receiptUrl?: string;
    },
  ): Promise<Record<string, unknown>> {
    // Naji UAT 2026-05-14 — Mark Paid on Payment Status used to be a one-
    // click "set status=Paid". Naji asked for the same rich capture the
    // Application flow has: paid date (defaults to today, editable),
    // mode, reference number, and an uploaded receipt. We accept all of
    // them via the extras bag so the legacy callers (one-click confirms)
    // still work without arguments.
    const now = new Date();
    const data: Record<string, unknown> = {
      status: 'Paid',
      paid_date: extras?.paidDate ? new Date(extras.paidDate) : now,
      updated_by: toNullableIntId(actorUserId),
      updated_at: now,
    };
    if (extras?.paymentMode !== undefined) {
      const mode = extras.paymentMode.trim();
      if (mode) data.payment_mode = mode;
    }
    if (extras?.referenceNumber !== undefined) {
      const ref = extras.referenceNumber.trim();
      if (ref) data.reference_number = ref;
    }
    if (extras?.receiptUrl !== undefined) {
      const url = extras.receiptUrl.trim();
      if (url) data.receipt_url = url;
    }
    await this.prisma.student_payments.updateMany({
      where: { id: toIntId(installmentId), deleted_at: null },
      data,
    });
    return { status: 1, message: 'Installment marked as paid.' };
  }

  // Naji UAT 2026-05-12 — admin row-level edit on an installment row.
  // Allows changing label, amount, due/paid dates, mode, and status.
  async updateInstallment(actorUserId: string, input: {
    installmentId: string;
    installmentDetails?: string;
    amount?: string;
    paymentMode?: string;
    status?: string;
    dueDate?: string;
    paidDate?: string;
  }): Promise<Record<string, unknown>> {
    if (!input.installmentId) return { status: 0, message: 'Installment ID is required.' };
    const id = toIntId(input.installmentId);
    if (!id) return { status: 0, message: 'Invalid installment id.' };

    const row = await this.prisma.student_payments.findFirst({
      where: { id, deleted_at: null },
      select: { id: true },
    });
    if (!row) return { status: 0, message: 'Installment not found.' };

    const now = new Date();
    const data: Record<string, unknown> = { updated_by: toNullableIntId(actorUserId), updated_at: now };
    if (input.installmentDetails !== undefined) data.installment_details = input.installmentDetails.trim();
    if (input.amount !== undefined) {
      const n = Number(input.amount);
      if (Number.isFinite(n) && n >= 0) data.amount = Math.round(n);
    }
    if (input.paymentMode !== undefined) data.payment_mode = input.paymentMode.trim() || null;
    if (input.status !== undefined) data.status = input.status.trim() || null;
    if (input.dueDate !== undefined) {
      const d = input.dueDate.trim();
      data.due_date = d ? new Date(d) : null;
    }
    if (input.paidDate !== undefined) {
      const d = input.paidDate.trim();
      data.paid_date = d ? new Date(d) : null;
    }

    await this.prisma.student_payments.updateMany({ where: { id }, data });
    return { status: 1, message: 'Installment updated successfully.' };
  }

  // Naji 2026-07-06 — holistic schedule editing: admins can add an ad-hoc
  // installment to a student's plan (e.g. an extra collection) and delete a
  // wrong row. user_id is users.id (NOT applications.id) and course_id scopes
  // the row to one enrolment, so the Fee Summary + Payment History stay in sync.
  async addInstallment(actorUserId: string, input: {
    userId: string;
    courseId: string;
    installmentDetails?: string;
    amount?: string;
    paymentMode?: string;
    status?: string;
    dueDate?: string;
    paidDate?: string;
  }): Promise<Record<string, unknown>> {
    const userId = toIntId(input.userId);
    const courseId = toIntId(input.courseId);
    if (!userId) return { status: 0, message: 'Student is required.' };
    if (!courseId) return { status: 0, message: 'Course is required to add an installment.' };

    const amountN = Number(input.amount);
    const dueRaw = (input.dueDate ?? '').trim();
    const paidRaw = (input.paidDate ?? '').trim();
    await this.prisma.student_payments.create({
      data: {
        user_id: userId,
        course_id: courseId,
        // VarChar(200) — slice defensively so an overlong label can't surface a
        // raw driver error to the admin UI (the UI also caps the input at 200).
        installment_details: (input.installmentDetails ?? '').trim().slice(0, 200) || null,
        amount: Number.isFinite(amountN) && amountN >= 0 ? Math.round(amountN) : 0,
        payment_mode: (input.paymentMode ?? '').trim() || null,
        status: (input.status ?? '').trim() || 'Pending',
        due_date: dueRaw ? new Date(dueRaw) : null,
        paid_date: paidRaw ? new Date(paidRaw) : null,
        created_by: toNullableIntId(actorUserId),
        created_at: new Date(),
      },
    });
    return { status: 1, message: 'Installment added successfully.' };
  }

  async deleteInstallment(actorUserId: string, installmentId: string): Promise<Record<string, unknown>> {
    const id = toIntId(installmentId);
    if (!id) return { status: 0, message: 'Invalid installment id.' };
    const row = await this.prisma.student_payments.findFirst({
      where: { id, deleted_at: null },
      select: { id: true },
    });
    if (!row) return { status: 0, message: 'Installment not found.' };
    const now = new Date();
    await this.prisma.student_payments.updateMany({
      where: { id },
      data: { deleted_at: now, deleted_by: toNullableIntId(actorUserId), updated_at: now },
    });
    return { status: 1, message: 'Installment deleted successfully.' };
  }

  async sendPaymentReminder(_actorUserId: string, installmentId: string): Promise<Record<string, unknown>> {
    const installment = await this.prisma.student_payments.findFirst({
      where: { id: toIntId(installmentId), deleted_at: null },
    });
    if (!installment) {
      return { status: 0, message: 'Installment not found.' };
    }
    await this.prisma.payment_reminders.create({
      data: {
        payment_id: installment.id,
        user_id: installment.user_id,
        // payment_reminders_reminder_type enum has no 'manual' value — use closest existing ('day_7')
        reminder_type: 'day_7',
        sent_at: new Date(),
        created_at: new Date(),
      },
    });
    return { status: 1, message: 'Payment reminder sent successfully.' };
  }

  // ── Phase F: Chat Support ─────────────────────────────────────

  async listAdminConversations(): Promise<Record<string, unknown>> {
    const groups = await this.prisma.support_chat.groupBy({
      by: ['chat_id'],
      where: { deleted_at: null },
      _count: { id: true },
      _max: { created_at: true },
      _min: { created_at: true },
      orderBy: { _max: { created_at: 'desc' } },
    });

    const chatIds = groups.map(g => g.chat_id).filter((x): x is number => x !== null && x !== undefined);
    if (chatIds.length === 0) return { conversations: [] };

    const lastMessages = await Promise.all(
      chatIds.map(chatId =>
        this.prisma.support_chat.findFirst({
          where: { chat_id: chatId, deleted_at: null },
          orderBy: { created_at: 'desc' },
          select: { message: true, sender_id: true, created_at: true },
        })
      )
    );
    const lastMsgMap = new Map<number, typeof lastMessages[number]>();
    chatIds.forEach((id, idx) => { lastMsgMap.set(id, lastMessages[idx] ?? null); });

    const users = await this.prisma.users.findMany({
      where: { id: { in: chatIds } },
      select: { id: true, name: true, user_email: true, role_id: true, profile_picture: true },
    });
    const userMap = new Map(users.map(u => [u.id, u]));

    const conversations = groups.map(g => {
      const chatIdNum = g.chat_id;
      const user = chatIdNum !== null && chatIdNum !== undefined ? userMap.get(chatIdNum) : undefined;
      const lastMsg = chatIdNum !== null && chatIdNum !== undefined ? lastMsgMap.get(chatIdNum) : undefined;
      return {
        chat_id: g.chat_id,
        user_name: user?.name ?? 'Unknown',
        user_email: user?.user_email ?? null,
        user_photo: user?.profile_picture ?? null,
        role_id: user?.role_id ?? null,
        message_count: g._count.id,
        last_message: lastMsg?.message ?? null,
        last_message_at: g._max.created_at,
        first_message_at: g._min.created_at,
      };
    });

    return { conversations };
  }

  async getConversationMessages(chatId: string): Promise<Record<string, unknown>> {
    const chatIdNum = toIntId(chatId);
    const messages = await this.prisma.support_chat.findMany({
      where: { chat_id: chatIdNum, deleted_at: null },
      orderBy: { created_at: 'asc' },
      select: { id: true, sender_id: true, message: true, created_at: true },
    });

    const senderIds = [...new Set(messages.map(m => m.sender_id).filter((x): x is number => x !== null && x !== undefined))];
    const senders = senderIds.length > 0
      ? await this.prisma.users.findMany({ where: { id: { in: senderIds } }, select: { id: true, name: true, profile_picture: true } })
      : [];
    const senderMap = new Map(senders.map(s => [s.id, s]));

    return {
      messages: messages.map(m => ({
        id: m.id,
        sender_id: m.sender_id,
        sender_name: m.sender_id !== null && m.sender_id !== undefined ? senderMap.get(m.sender_id)?.name ?? 'Unknown' : 'Unknown',
        sender_photo: m.sender_id !== null && m.sender_id !== undefined ? senderMap.get(m.sender_id)?.profile_picture ?? null : null,
        message: m.message,
        created_at: m.created_at,
        is_admin: m.sender_id !== chatIdNum,
      })),
    };
  }

  async sendAdminMessage(actorUserId: string, chatId: string, messageText: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.support_chat.create({
      data: {
        chat_id: toNullableIntId(chatId),
        sender_id: toNullableIntId(actorUserId),
        message: messageText,
        created_by: toIntId(actorUserId),
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, message: 'Message sent.' };
  }

  // ── Counsellor CRUD ─────────────────────────────────────────────

  async addCounsellor(actorUserId: string, input: AddAssociateInput): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    if (!input.email.trim()) return { status: 0, message: 'Email is required.' };

    // Scope the duplicate-email check to Counsellors only (role_id=9) so
    // the same email can be reused as Associate / Admin / etc.
    const existing = await this.prisma.users.findFirst({ where: { user_email: input.email.trim(), role_id: 9, deleted_at: null } });
    if (existing) return { status: 0, message: 'A Counsellor with this email already exists.' };

    const email = input.email.trim();
    const sharedPassword = await this.findSharedPasswordForEmail(email);

    let passwordHash: string;
    let message: string;
    if (sharedPassword) {
      passwordHash = sharedPassword;
      message = 'Counsellor role added to the existing account — they keep their current password and can switch to it from the role dropdown after logging in.';
    } else {
      const { issueAndEmailCredentials } = await import('../auth/credentials-issuer.js');
      const creds = await issueAndEmailCredentials({ name: input.name.trim(), email, roleLabel: 'Counsellor' });
      passwordHash = creds.hashedPassword;
      message = creds.emailDelivered
        ? 'Counsellor added. Login credentials have been emailed.'
        : `Counsellor added, but the credentials email failed to send (${creds.emailError ?? 'unknown error'}). Resend from the user actions menu.`;
    }

    const now = new Date();
    await this.prisma.users.create({
      data: {
        name: input.name.trim(),
        user_email: email,
        email,
        phone: input.phone?.trim() || null,
        password: passwordHash,
        role_id: 9,
        status: input.status ?? 1,
        // Persist the profile detail so the Edit form pre-fills (was dropped).
        gender: input.gender?.trim() ?? '',
        dob: toOptionalDate(input.dob),
        languages_spoken: input.languagesSpoken?.trim() || null,
        highest_qualification: input.highestQualification?.trim() || null,
        date_of_joining: toOptionalDate(input.doj),
        dynamic_link: '',
        image: input.image?.trim() ?? '',
        profile_picture: input.image?.trim() ?? '',
        application_id: 0,
        created_at: now,
        updated_at: now,
      },
    });
    return { status: 1, message };
  }

  async editCounsellor(
    actorUserId: string,
    id: string,
    input: {
      name: string;
      email?: string;
      phone?: string;
      status?: number;
      gender?: string;
      dob?: string;
      languagesSpoken?: string;
      highestQualification?: string;
      doj?: string;
      image?: string;
    },
  ): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    const counsellorId = toIntId(id);
    if (!counsellorId) return { status: 0, message: 'Invalid counsellor id.' };

    const now = new Date();
    const data: Record<string, unknown> = { name: input.name.trim(), phone: input.phone?.trim() || null, updated_at: now };
    if (input.status !== undefined) data.status = input.status;
    // Persist the profile detail so the next Edit pre-fills (was dropped).
    if (input.gender !== undefined) data.gender = input.gender.trim();
    if (input.dob !== undefined) data.dob = toOptionalDate(input.dob);
    if (input.languagesSpoken !== undefined) data.languages_spoken = input.languagesSpoken.trim() || null;
    if (input.highestQualification !== undefined) data.highest_qualification = input.highestQualification.trim() || null;
    if (input.doj !== undefined) data.date_of_joining = toOptionalDate(input.doj);
    // Persist the uploaded profile photo (was dropped on edit, so a new photo
    // never stuck). Only overwrite when a value is provided.
    if (input.image !== undefined && input.image.trim() !== '') {
      data.image = input.image.trim();
      data.profile_picture = input.image.trim();
    }

    // Email is the counsellor's login identity. Allow changing it, but guard
    // uniqueness against OTHER counsellors (role_id=9) — same scoping as
    // addCounsellor — and keep both legacy columns (user_email + email) in sync.
    const email = input.email?.trim();
    if (email) {
      const clash = await this.prisma.users.findFirst({
        where: { user_email: email, role_id: 9, deleted_at: null, id: { not: counsellorId } },
        select: { id: true },
      });
      if (clash) return { status: 0, message: 'A Counsellor with this email already exists.' };
      data.user_email = email;
      data.email = email;
    }

    const result = await this.prisma.users.updateMany({ where: { id: counsellorId, deleted_at: null }, data });
    if (result.count === 0) return { status: 0, message: 'Counsellor not found.' };
    return { status: 1, message: 'Counsellor updated successfully.' };
  }

  async deleteCounsellor(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.users.updateMany({ where: { id: toIntId(id), deleted_at: null }, data: { deleted_by: toIntId(actorUserId), deleted_at: now } });
    return { status: 1, message: 'Counsellor deleted successfully.' };
  }

  // ── Associate Edit/Delete ───────────────────────────────────────

  async editAssociate(actorUserId: string, id: string, input: { name: string; phone?: string; status?: number }): Promise<Record<string, unknown>> {
    if (!input.name.trim()) return { status: 0, message: 'Name is required.' };
    const now = new Date();
    const data: Record<string, unknown> = { name: input.name.trim(), phone: input.phone?.trim() || null, updated_at: now };
    if (input.status !== undefined) data.status = input.status;
    await this.prisma.users.updateMany({ where: { id: toIntId(id), deleted_at: null }, data });
    return { status: 1, message: 'Associate updated successfully.' };
  }

  async deleteAssociate(actorUserId: string, id: string): Promise<Record<string, unknown>> {
    const now = new Date();
    await this.prisma.users.updateMany({ where: { id: toIntId(id), deleted_at: null }, data: { deleted_by: toIntId(actorUserId), deleted_at: now } });
    return { status: 1, message: 'Associate deleted successfully.' };
  }
}
