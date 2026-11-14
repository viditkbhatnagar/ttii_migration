import {
  BINARY_COMPONENTS, COMPONENT_TYPES, DELIVERY_MODES, DOC_TYPES, LEVELS, PRINT_FIELDS, RULE_PRESETS,
  type ComponentType, type CourierData, type DeliveryMode, type DeliverySettingsData, type DocType, type GradeBand,
  type GradingData, type RuleComponent, type RuleData, type RulePreset, type SignatoryData, type TemplateData,
} from './credential-types.js';

// Credential Manager → Settings: pure parsing + validation (spec §1.7.1). Every
// parser returns either the cleaned value or a refusal message, never throws.

export type Parsed<T> = { ok: true; value: T } | { ok: false; message: string };
const fail = <T>(message: string): Parsed<T> => ({ ok: false, message });
const ok = <T>(value: T): Parsed<T> => ({ ok: true, value });

type Raw = Record<string, unknown>;

export const SETTINGS_FILE_PREFIX = 'credentials/settings/';
export const SETTINGS_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PASS_RULES = ['every_mandatory_subject', 'overall', 'theory_practical_separately'] as const;
export const CGPA_METHODS = ['credit_weighted', 'simple_average'] as const;

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}
function num(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(str(value) === '' ? Number.NaN : str(value));
  return Number.isFinite(n) ? n : Number.NaN;
}
function bool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return fallback;
}
function obj(value: unknown): Raw {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Raw) : {};
}
function inList<T extends string>(list: readonly T[], value: unknown): T | null {
  const v = str(value);
  return (list as readonly string[]).includes(v) ? (v as T) : null;
}

/** Strict YYYY-MM-DD, a real calendar day. */
export function isYmd(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}
export function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}
export function dateToYmd(date: Date | null | undefined): string {
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : '';
}

// ── Completion rules ─────────────────────────────────────────────────────────
function defaultComponent(type: ComponentType, minimum = 40, mandatory = true): RuleComponent {
  return {
    componentType: type, subject: '', minimum: BINARY_COMPONENTS.includes(type) ? 0 : minimum, mandatory,
    coverage: 'All', count: 1, thresholdMode: 'Overall', examRequirement: 'All', theory: 0, practical: 0,
  };
}

/** Components a preset starts with (spec section 3). */
export function presetComponents(preset: RulePreset): RuleComponent[] {
  switch (preset) {
    case 'Assignment only': return [defaultComponent('Assignments')];
    case 'Exam only': return [defaultComponent('Exams')];
    case 'Assignment + Exam (all subjects)': return [defaultComponent('Assignments'), defaultComponent('Exams')];
    case 'Self-paced auto-issue': return [defaultComponent('Course progress', 100)];
    default: return [];
  }
}

export interface RuleInput { offeringId: number; effectiveFrom: string; active: boolean; data: RuleData }

export function parseRuleInput(raw: Raw): Parsed<RuleInput> {
  const offeringId = Math.trunc(num(raw.offering_id));
  if (!Number.isInteger(offeringId) || offeringId <= 0) return fail('Select a TTII course offering.');
  const effectiveFrom = str(raw.effective_from);
  if (!isYmd(effectiveFrom)) return fail('Enter an effective-from date.');
  const d = obj(raw.data);
  const componentsRaw = Array.isArray(d.components) ? d.components : [];
  if (componentsRaw.length === 0) return fail('Add at least one completion component.');
  const components: RuleComponent[] = [];
  for (const c of componentsRaw) {
    const o = obj(c);
    const type = inList(COMPONENT_TYPES, o.componentType);
    if (!type) return fail('Choose a component type for every criterion.');
    const coverage = inList(['All', 'Count'] as const, o.coverage) ?? 'All';
    const count = num(o.count ?? 1);
    const pct = [num(o.minimum ?? 0), num(o.theory ?? 0), num(o.practical ?? 0)];
    const pctBad = pct.some((p) => !Number.isFinite(p) || p < 0 || p > 100);
    const countBad = type === 'Assignments' && coverage === 'Count' && (!Number.isInteger(count) || count < 1);
    if (pctBad || countBad) return fail('Minimum percentages must be 0–100 and assignment counts must be positive whole numbers.');
    components.push({
      componentType: type, subject: str(o.subject).slice(0, 60), minimum: pct[0] as number, mandatory: bool(o.mandatory, true),
      coverage, count: Number.isInteger(count) && count >= 1 ? count : 1,
      thresholdMode: inList(['Each', 'Overall'] as const, o.thresholdMode) ?? 'Overall',
      examRequirement: inList(['All', 'Per subject', 'Overall'] as const, o.examRequirement) ?? 'All',
      theory: pct[1] as number, practical: pct[2] as number,
    });
  }
  const data: RuleData = {
    ruleType: inList(RULE_PRESETS, d.ruleType) ?? 'Custom',
    reattempt: inList(['Best', 'Latest'] as const, d.reattempt) ?? 'Best',
    autoIssue: bool(d.autoIssue, false),
    components,
  };
  return ok({ offeringId, effectiveFrom, active: bool(raw.active, true), data });
}

// ── Templates ────────────────────────────────────────────────────────────────
export interface TemplateInput { name: string; offeringId: number | null; effectiveFrom: string; active: boolean; data: TemplateData }

function keyOrNull(value: unknown): Parsed<string | null> {
  const v = str(value);
  if (!v) return ok(null);
  if (!v.startsWith(SETTINGS_FILE_PREFIX) || v.includes('..')) return fail('Upload the image again.');
  return ok(v);
}

export function parseTemplateInput(raw: Raw): Parsed<TemplateInput> {
  const name = str(raw.name).slice(0, 200);
  if (!name) return fail('Enter a name.');
  const d = obj(raw.data);
  const docType = inList(DOC_TYPES, d.docType);
  if (!docType) return fail('Choose a document type.');
  const offeringId = Math.trunc(num(raw.offering_id));
  const hasOffering = Number.isInteger(offeringId) && offeringId > 0;
  const level = inList(LEVELS, d.level);
  if (!hasOffering && !level) return fail('Apply the template to a course offering or a level.');
  const effectiveFrom = str(raw.effective_from);
  if (!isYmd(effectiveFrom)) return fail('Enter an effective-from date.');
  const fields = (Array.isArray(d.fields) ? d.fields : []).map(str).filter((f): f is typeof PRINT_FIELDS[number] => (PRINT_FIELDS as readonly string[]).includes(f));
  if (fields.length === 0) return fail('Select at least one field to print.');
  const background = keyOrNull(d.backgroundKey);
  if (!background.ok) return background;
  const signatoryIds = (Array.isArray(d.signatoryIds) ? d.signatoryIds : []).map((v) => Math.trunc(num(v))).filter((n) => Number.isInteger(n) && n > 0);
  return ok({
    name, offeringId: hasOffering ? offeringId : null, effectiveFrom, active: bool(raw.active, true),
    data: {
      docType, level: hasOffering ? null : level, fields: [...new Set(fields)], signatoryIds: [...new Set(signatoryIds)],
      backContent: str(d.backContent).slice(0, 5000), backgroundKey: background.value,
    },
  });
}

// ── Number series ────────────────────────────────────────────────────────────
export interface SeriesInput { docType: DocType; prefix: string; year: number; padding: number; nextNumber: number; resetYearly: boolean }

export function parseSeriesInput(raw: Raw): Parsed<SeriesInput> {
  const docType = inList(DOC_TYPES, raw.doc_type);
  if (!docType) return fail('Choose a document type.');
  const prefix = str(raw.prefix);
  const year = num(raw.year);
  const padding = num(raw.padding);
  const nextNumber = num(raw.next_number);
  const valid = prefix.length > 0 && prefix.length <= 60 && Number.isInteger(year) && year >= 2000 && year <= 9999
    && Number.isInteger(padding) && padding >= 1 && padding <= 12 && Number.isInteger(nextNumber) && nextNumber >= 1;
  if (!valid) return fail('Use a prefix, a whole year, padding of 1–12, and a positive whole next number.');
  return ok({ docType, prefix, year, padding, nextNumber, resetYearly: bool(raw.reset_yearly, true) });
}

/** `{prefix}/{year}/{padded next}` — the example shown in the table and editor. */
export function numberExample(s: { prefix: string; year: number; padding: number; nextNumber: number }): string {
  return `${s.prefix}/${s.year}/${String(s.nextNumber).padStart(s.padding, '0')}`;
}

// ── Signatories ──────────────────────────────────────────────────────────────
export interface SignatoryInput { name: string; active: boolean; data: SignatoryData }

export function parseSignatoryInput(raw: Raw): Parsed<SignatoryInput> {
  const name = str(raw.name).slice(0, 200);
  if (!name) return fail('Enter a name.');
  const d = obj(raw.data);
  const designation = str(d.designation).slice(0, 200);
  if (!designation) return fail('Enter a designation.');
  const validFrom = str(d.validFrom);
  if (!isYmd(validFrom)) return fail('Enter a valid-from date.');
  const validToRaw = str(d.validTo);
  if (validToRaw && !isYmd(validToRaw)) return fail('Enter a valid-to date.');
  if (validToRaw && validToRaw < validFrom) return fail('Valid to must not be before valid from.');
  const signature = keyOrNull(d.signatureKey);
  if (!signature.ok) return signature;
  if (!signature.value) return fail('Upload a signature image.');
  return ok({ name, active: bool(raw.active, true), data: { designation, validFrom, validTo: validToRaw || null, signatureKey: signature.value } });
}

// ── Grading schemes ──────────────────────────────────────────────────────────
export interface GradingInput { name: string; active: boolean; data: GradingData }

export function bandsOverlap(bands: readonly GradeBand[]): boolean {
  const sorted = [...bands].sort((a, b) => a.min - b.min);
  return sorted.some((b, i) => i > 0 && b.min <= (sorted[i - 1] as GradeBand).max);
}

export function parseGradingInput(raw: Raw): Parsed<GradingInput> {
  const name = str(raw.name).slice(0, 200);
  if (!name) return fail('Enter a name.');
  const d = obj(raw.data);
  const scaleMax = num(d.scaleMax);
  const passMinimum = num(d.passMinimum);
  if (!Number.isFinite(scaleMax) || scaleMax < 1 || scaleMax > 100) return fail('Scale maximum must be between 1 and 100.');
  if (!Number.isFinite(passMinimum) || passMinimum < 0 || passMinimum > 100) return fail('Pass minimum must be between 0 and 100.');
  const bandsRaw = Array.isArray(d.bands) ? d.bands : [];
  const bands: GradeBand[] = bandsRaw.map((b) => {
    const o = obj(b);
    return { min: num(o.min), max: num(o.max), grade: str(o.grade), points: num(o.points) };
  });
  const bandBad = bands.length === 0 || bands.some((b) => !Number.isFinite(b.min) || !Number.isFinite(b.max) || !Number.isFinite(b.points)
    || b.min < 0 || b.max > 100 || b.min > b.max || b.points < 0 || b.points > scaleMax || !b.grade);
  if (bandBad) return fail('Check each band, grade and grade point against the scale.');
  if (bandsOverlap(bands)) return fail('Grade bands must not overlap.');
  const offeringIds = [...new Set((Array.isArray(d.offeringIds) ? d.offeringIds : []).map((v) => Math.trunc(num(v))).filter((n) => Number.isInteger(n) && n > 0))];
  return ok({
    name, active: bool(raw.active, true),
    data: {
      scaleMax, passMinimum,
      passRule: inList(PASS_RULES, d.passRule) ?? 'every_mandatory_subject',
      cgpaMethod: inList(CGPA_METHODS, d.cgpaMethod) ?? 'credit_weighted',
      offeringIds, bands,
    },
  });
}

// ── Hold reasons and couriers ────────────────────────────────────────────────
export function parseNameOnly(raw: Raw): Parsed<{ name: string; active: boolean }> {
  const name = str(raw.name).slice(0, 200);
  return name ? ok({ name, active: bool(raw.active, true) }) : fail('Enter a name.');
}

/** HTTPS and a literal {AWB} placeholder; nothing that could smuggle a different scheme. */
export function isValidTrackingUrl(url: string): boolean {
  if (!url.startsWith('https://') || !url.includes('{AWB}') || url.length > 500 || /\s/.test(url)) return false;
  try { return new URL(url.replace(/\{AWB\}/g, 'X')).protocol === 'https:'; } catch { return false; }
}

export function parseCourierInput(raw: Raw): Parsed<{ name: string; active: boolean; data: CourierData }> {
  const base = parseNameOnly(raw);
  if (!base.ok) return base;
  const trackingUrlPattern = str(obj(raw.data).trackingUrlPattern);
  if (!isValidTrackingUrl(trackingUrlPattern)) return fail('Use an HTTPS tracking URL containing {AWB}.');
  return ok({ ...base.value, data: { trackingUrlPattern } });
}

// ── Delivery settings ────────────────────────────────────────────────────────
export function parseDeliverySettings(raw: Raw): Parsed<DeliverySettingsData> {
  const overdueDays = num(raw.overdue_days ?? raw.overdueDays);
  const readyDays = num(raw.ready_days ?? raw.readyDays);
  if (!Number.isInteger(overdueDays) || overdueDays < 1 || overdueDays > 365) return fail('Overdue days must be a whole number from 1 to 365.');
  if (!Number.isInteger(readyDays) || readyDays < 1 || readyDays > 365) return fail('Ready-waiting days must be a whole number from 1 to 365.');
  const centreModes: Record<string, DeliveryMode> = {};
  for (const [centre, mode] of Object.entries(obj(raw.centre_modes ?? raw.centreModes))) {
    const m = inList(DELIVERY_MODES, mode);
    if (/^\d{1,10}$/.test(centre) && m) centreModes[centre] = m;
  }
  return ok({ overdueDays, readyDays, centreModes });
}

export function isDeliveryMode(value: unknown): value is DeliveryMode {
  return inList(DELIVERY_MODES, value) !== null;
}
export function isLevel(value: unknown): boolean {
  return inList(LEVELS, value) !== null;
}
