// Credential Manager — the shared contract (Naji 2026-11-14 Lovable export).
// Every builder reads and writes these shapes; the JSON payloads live in
// credential_config.data (see deploy/migrations/2026-11-15-credential-manager.sql).
// Parsers never throw: bad or missing JSON degrades to safe defaults.

export const DOC_TYPES = ['certificate', 'marksheet', 'provisional', 'transcript'] as const;
export type DocType = typeof DOC_TYPES[number];
export const DOC_TYPE_LABEL: Record<DocType, string> = {
  certificate: 'Certificate',
  marksheet: 'Marksheet',
  provisional: 'Provisional Certificate',
  transcript: 'Consolidated Transcript',
};
/** Issuable today (the prototype cannot generate a Consolidated Transcript either). */
export const ISSUABLE_DOC_TYPES: readonly DocType[] = ['certificate', 'marksheet', 'provisional'];

export type DocumentStatus = 'valid' | 'revoked' | 'superseded';
export type DocumentAction = 'Issue' | 'Download' | 'Print' | 'Duplicate' | 'Revoke' | 'Restore' | 'Resend' | 'Correction';

/** Computed per enrolment, never stored. */
export type EligibilityStatus = 'Ready' | 'On Hold' | 'Not Eligible' | 'In Progress' | 'Issued';

export const DELIVERY_MODES = ['digital', 'via_centre', 'courier_learner', 'office_collection'] as const;
export type DeliveryMode = typeof DELIVERY_MODES[number];
export const DELIVERY_MODE_LABEL: Record<DeliveryMode, string> = {
  digital: 'Digital only',
  via_centre: 'Via centre',
  courier_learner: 'Courier to learner',
  office_collection: 'Office collection',
};

export const ITEM_STATUSES = [
  'print_queued', 'printed', 'packed', 'dispatched', 'in_transit', 'delivered',
  'collected', 'handed_over', 'returned', 'address_issue', 'lost',
] as const;
export type ItemStatus = typeof ITEM_STATUSES[number];

export type ConfigCategory = 'rule' | 'template' | 'signatory' | 'grading' | 'hold_reason' | 'courier' | 'delivery';

// ── Completion rules (category 'rule'; credential_config.offering_id = the TTII offering) ──
export const COMPONENT_TYPES = [
  'Assignments', 'Exams', 'Internal assessment', 'Attendance', 'Course progress',
  'Fees cleared', 'Admission documents verified', 'Feedback submitted', 'Result published', 'Project/practicum approved',
] as const;
export type ComponentType = typeof COMPONENT_TYPES[number];
export const BINARY_COMPONENTS: readonly ComponentType[] = [
  'Fees cleared', 'Admission documents verified', 'Feedback submitted', 'Result published', 'Project/practicum approved',
];
export const RULE_PRESETS = ['Assignment only', 'Exam only', 'Assignment + Exam (all subjects)', 'Self-paced auto-issue', 'Custom'] as const;
export type RulePreset = typeof RULE_PRESETS[number];

export interface RuleComponent {
  componentType: ComponentType;
  /** Optional subject code: the criterion then applies to that subject only. */
  subject: string;
  /** 0–100, numeric components only. */
  minimum: number;
  mandatory: boolean;
  /** Assignments: 'All' | 'Count'. */
  coverage: 'All' | 'Count';
  count: number;
  /** Assignments: minimum applies to 'Each' assignment or 'Overall'. */
  thresholdMode: 'Each' | 'Overall';
  /** Exams: 'All' | 'Per subject' | 'Overall'. */
  examRequirement: 'All' | 'Per subject' | 'Overall';
  theory: number;
  practical: number;
}
export interface RuleData {
  ruleType: RulePreset;
  reattempt: 'Best' | 'Latest';
  autoIssue: boolean;
  components: RuleComponent[];
}

// ── Templates (category 'template'; offering_id = course-bound, else by level) ──
export const PRINT_FIELDS = [
  'Learner name', 'Enrolment no.', 'Programme title', 'Level', 'Duration', 'Credits', 'CGPA', 'Grade',
  'Exam month/year', 'Document no.', 'Issue date', 'Photo', 'QR', 'Signatories',
] as const;
export const LEVELS = ['Certificate', 'Diploma', 'PG Diploma', 'Degree'] as const;
export interface TemplateData {
  docType: DocType;
  level: string | null;
  fields: string[];
  signatoryIds: number[];
  backContent: string;
  /** Storage key of the front background image (PNG/JPG). */
  backgroundKey: string | null;
}

// ── Signatories (category 'signatory') ──
export interface SignatoryData {
  designation: string;
  validFrom: string; // YYYY-MM-DD
  validTo: string | null;
  /** Storage key of the signature image (PNG/JPG). */
  signatureKey: string | null;
}

// ── Grading schemes (category 'grading') ──
export interface GradeBand { min: number; max: number; grade: string; points: number }
export interface GradingData {
  scaleMax: number;
  passMinimum: number;
  passRule: 'every_mandatory_subject' | 'overall' | 'theory_practical_separately';
  cgpaMethod: 'credit_weighted' | 'simple_average';
  offeringIds: number[];
  bands: GradeBand[];
}

// ── Couriers (category 'courier') ──
export interface CourierData { trackingUrlPattern: string }

// ── Delivery settings (category 'delivery', single row) ──
export interface DeliverySettingsData {
  overdueDays: number;
  readyDays: number;
  /** centre id (string key) → delivery mode override. */
  centreModes: Record<string, DeliveryMode>;
}

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettingsData = { overdueDays: 10, readyDays: 3, centreModes: {} };

/** Parse credential_config.data; never throws. */
export function parseConfigData<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw) as unknown;
    return value && typeof value === 'object' ? { ...fallback, ...(value as object) } as T : fallback;
  } catch {
    return fallback;
  }
}

/** Grade band for a percentage, or null when none matches. */
export function gradeFor(percent: number, bands: readonly GradeBand[]): GradeBand | null {
  return bands.find((b) => percent >= b.min && percent <= b.max) ?? null;
}

export const NOT_SET_UP_MESSAGE = 'The Credential Manager is not set up yet. Please contact the administrator.';

/** Prisma P2021 = table does not exist (before the 2026-11-15 migration runs). */
export function isMissingTable(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === 'P2021';
}
