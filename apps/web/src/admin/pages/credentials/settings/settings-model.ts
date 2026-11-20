import { asNumber, asString } from '../../../shared/utils/admin-data-utils.js';

// Credential Manager → Settings: types, labels and payload builders for the
// seven tabs (spec §1.7). The server validates; this only shapes data.

export type SettingTab = 'rule' | 'template' | 'number_series' | 'signatory' | 'grading' | 'hold_reason' | 'courier';

export const SETTING_TABS: ReadonlyArray<{ id: SettingTab; label: string; noun: string }> = [
  { id: 'rule', label: 'Completion Rules', noun: 'Rule' },
  { id: 'template', label: 'Templates', noun: 'Template' },
  { id: 'number_series', label: 'Number Series', noun: 'Series' },
  { id: 'signatory', label: 'Signatories', noun: 'Signatory' },
  { id: 'grading', label: 'Grading Schemes', noun: 'Scheme' },
  { id: 'hold_reason', label: 'Hold Reasons', noun: 'Reason' },
  { id: 'courier', label: 'Courier Partners', noun: 'Courier' },
];

export const DOC_TYPES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'certificate', label: 'Certificate' },
  { value: 'marksheet', label: 'Marksheet' },
  { value: 'provisional', label: 'Provisional Certificate' },
  { value: 'transcript', label: 'Consolidated Transcript' },
];
export const docTypeLabel = (v: string): string => DOC_TYPES.find((d) => d.value === v)?.label ?? v;

export const LEVELS = ['Certificate', 'Diploma', 'PG Diploma', 'Degree'] as const;
export const DELIVERY_MODE_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'digital', label: 'Digital only' },
  { value: 'via_centre', label: 'Via centre' },
  { value: 'courier_learner', label: 'Courier to learner' },
  { value: 'office_collection', label: 'Office collection' },
];
export const PRINT_FIELDS = [
  'Learner name', 'Enrolment no.', 'Programme title', 'Level', 'Duration', 'Credits', 'CGPA', 'Grade',
  'Exam month/year', 'Document no.', 'Issue date', 'Photo', 'QR', 'Signatories',
] as const;
export const COMPONENT_TYPES = [
  'Assignments', 'Exams', 'Internal assessment', 'Attendance', 'Course progress',
  'Fees cleared', 'Admission documents verified', 'Feedback submitted', 'Result published', 'Project/practicum approved',
] as const;
export const BINARY_COMPONENTS: readonly string[] = ['Fees cleared', 'Admission documents verified', 'Feedback submitted', 'Result published', 'Project/practicum approved'];
export const RULE_PRESETS = ['Assignment only', 'Exam only', 'Assignment + Exam (all subjects)', 'Self-paced auto-issue', 'Custom'] as const;
export const PASS_RULES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'every_mandatory_subject', label: 'Pass every mandatory subject' },
  { value: 'overall', label: 'Pass overall' },
  { value: 'theory_practical_separately', label: 'Pass theory and practical separately' },
];
export const CGPA_METHODS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'credit_weighted', label: 'Credit-weighted average' },
  { value: 'simple_average', label: 'Simple average' },
];
export const passRuleLabel = (v: string): string => PASS_RULES.find((p) => p.value === v)?.label ?? v;
export const cgpaLabel = (v: string): string => CGPA_METHODS.find((p) => p.value === v)?.label ?? v;

export interface ConfigRow {
  id: number; name: string; offeringId: number | null; version: number; effectiveFrom: string; active: boolean;
  data: Record<string, unknown>;
}
export interface SeriesRow { id: number; docType: string; prefix: string; year: number; padding: number; nextNumber: number; resetYearly: boolean; example: string }
export interface OfferingOption { id: number; title: string; course: string; level: string | null }

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function toConfigRows(raw: unknown): ConfigRow[] {
  return (Array.isArray(raw) ? raw : []).map((r) => {
    const o = rec(r);
    return {
      id: asNumber(o.id), name: asString(o.name), offeringId: o.offeringId === null || o.offeringId === undefined ? null : asNumber(o.offeringId),
      version: asNumber(o.version) || 1, effectiveFrom: asString(o.effectiveFrom), active: o.active === true, data: rec(o.data),
    };
  });
}
export function toSeriesRows(raw: unknown): SeriesRow[] {
  return (Array.isArray(raw) ? raw : []).map((r) => {
    const o = rec(r);
    return {
      id: asNumber(o.id), docType: asString(o.docType), prefix: asString(o.prefix), year: asNumber(o.year), padding: asNumber(o.padding),
      nextNumber: asNumber(o.nextNumber), resetYearly: o.resetYearly === true, example: asString(o.example),
    };
  });
}
export function toOfferingOptions(raw: unknown): OfferingOption[] {
  return (Array.isArray(raw) ? raw : []).map((r) => {
    const o = rec(r);
    return { id: asNumber(o.id), title: asString(o.title), course: asString(o.course), level: o.level ? asString(o.level) : null };
  });
}

// ── Editor form (a superset; each category uses its own slice) ───────────────
export interface FormComponent {
  componentType: string; subject: string; minimum: string; mandatory: boolean; coverage: 'All' | 'Count'; count: string;
  thresholdMode: 'Each' | 'Overall'; examRequirement: 'All' | 'Per subject' | 'Overall'; theory: string; practical: string;
}
export interface FormBand { min: string; max: string; grade: string; points: string }
export interface SettingForm {
  name: string; active: boolean;
  // rule
  offeringId: string; effectiveFrom: string; ruleType: string; reattempt: 'Best' | 'Latest'; autoIssue: boolean; components: FormComponent[];
  // template
  docType: string; level: string; fields: string[]; signatoryIds: number[]; backContent: string; backgroundKey: string;
  // signatory
  designation: string; validFrom: string; validTo: string; signatureKey: string;
  // grading
  scaleMax: string; passMinimum: string; passRule: string; cgpaMethod: string; bands: FormBand[]; offeringIds: number[];
  // number series
  prefix: string; year: string; padding: string; nextNumber: string; resetYearly: boolean;
  // courier
  trackingUrlPattern: string;
}

export function newComponent(type = 'Assignments', minimum = 40): FormComponent {
  return {
    componentType: type, subject: '', minimum: BINARY_COMPONENTS.includes(type) ? '0' : String(minimum), mandatory: true, coverage: 'All', count: '1',
    thresholdMode: 'Overall', examRequirement: 'All', theory: '0', practical: '0',
  };
}
export function presetComponents(preset: string): FormComponent[] {
  switch (preset) {
    case 'Assignment only': return [newComponent('Assignments')];
    case 'Exam only': return [newComponent('Exams')];
    case 'Assignment + Exam (all subjects)': return [newComponent('Assignments'), newComponent('Exams')];
    case 'Self-paced auto-issue': return [newComponent('Course progress', 100)];
    default: return [];
  }
}

export const DEFAULT_BANDS: FormBand[] = [
  { min: '90', max: '100', grade: 'O', points: '10' }, { min: '80', max: '89.99', grade: 'A+', points: '9' },
  { min: '70', max: '79.99', grade: 'A', points: '8' }, { min: '60', max: '69.99', grade: 'B+', points: '7' },
  { min: '50', max: '59.99', grade: 'B', points: '6' }, { min: '40', max: '49.99', grade: 'C', points: '5' },
  { min: '0', max: '39.99', grade: 'F', points: '0' },
];

export function todayYmd(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function emptyForm(): SettingForm {
  return {
    name: '', active: true,
    offeringId: '', effectiveFrom: todayYmd(), ruleType: 'Assignment only', reattempt: 'Best', autoIssue: false, components: presetComponents('Assignment only'),
    docType: 'certificate', level: '', fields: PRINT_FIELDS.filter((f) => f !== 'Photo'), signatoryIds: [], backContent: '', backgroundKey: '',
    designation: '', validFrom: todayYmd(), validTo: '', signatureKey: '',
    scaleMax: '10', passMinimum: '40', passRule: 'every_mandatory_subject', cgpaMethod: 'credit_weighted', bands: DEFAULT_BANDS.map((b) => ({ ...b })), offeringIds: [],
    prefix: '', year: String(new Date().getFullYear()), padding: '6', nextNumber: '1', resetYearly: true,
    trackingUrlPattern: 'https://',
  };
}

const s = (v: unknown): string => asString(v);

export function formFromRow(tab: SettingTab, row: ConfigRow | SeriesRow): SettingForm {
  const base = emptyForm();
  if (tab === 'number_series') {
    const r = row as SeriesRow;
    return { ...base, docType: r.docType, prefix: r.prefix, year: String(r.year), padding: String(r.padding), nextNumber: String(r.nextNumber), resetYearly: r.resetYearly };
  }
  const r = row as ConfigRow;
  const d = r.data;
  const common = { ...base, name: r.name, active: r.active };
  switch (tab) {
    case 'rule': return {
      ...common, offeringId: r.offeringId === null ? '' : String(r.offeringId), effectiveFrom: r.effectiveFrom || base.effectiveFrom,
      ruleType: asString(d.ruleType) || 'Custom', reattempt: d.reattempt === 'Latest' ? 'Latest' : 'Best', autoIssue: d.autoIssue === true,
      components: (Array.isArray(d.components) ? d.components : []).map((c) => {
        const o = rec(c);
        return {
          componentType: asString(o.componentType), subject: asString(o.subject), minimum: s(o.minimum), mandatory: o.mandatory !== false,
          coverage: o.coverage === 'Count' ? 'Count' : 'All', count: s(o.count || 1), thresholdMode: o.thresholdMode === 'Each' ? 'Each' : 'Overall',
          examRequirement: o.examRequirement === 'Per subject' || o.examRequirement === 'Overall' ? o.examRequirement : 'All', theory: s(o.theory), practical: s(o.practical),
        } as FormComponent;
      }),
    };
    case 'template': return {
      ...common, offeringId: r.offeringId === null ? '' : String(r.offeringId), effectiveFrom: r.effectiveFrom || base.effectiveFrom,
      docType: asString(d.docType) || 'certificate', level: asString(d.level), fields: (Array.isArray(d.fields) ? d.fields : []).map(asString),
      signatoryIds: (Array.isArray(d.signatoryIds) ? d.signatoryIds : []).map(asNumber), backContent: asString(d.backContent), backgroundKey: asString(d.backgroundKey),
    };
    case 'signatory': return { ...common, designation: asString(d.designation), validFrom: asString(d.validFrom) || base.validFrom, validTo: asString(d.validTo), signatureKey: asString(d.signatureKey) };
    case 'grading': return {
      ...common, scaleMax: s(d.scaleMax), passMinimum: s(d.passMinimum), passRule: asString(d.passRule) || 'every_mandatory_subject', cgpaMethod: asString(d.cgpaMethod) || 'credit_weighted',
      offeringIds: (Array.isArray(d.offeringIds) ? d.offeringIds : []).map(asNumber),
      bands: (Array.isArray(d.bands) ? d.bands : []).map((b) => { const o = rec(b); return { min: s(o.min), max: s(o.max), grade: asString(o.grade), points: s(o.points) }; }),
    };
    case 'courier': return { ...common, trackingUrlPattern: asString(d.trackingUrlPattern) };
    default: return common;
  }
}

/** The save body for a tab (category is added by the API client). */
export function buildPayload(tab: SettingTab, f: SettingForm, id: number | null): Record<string, unknown> {
  const idPart = id ? { id } : {};
  switch (tab) {
    case 'rule': return {
      ...idPart, offering_id: Number(f.offeringId) || 0, effective_from: f.effectiveFrom, active: f.active,
      data: { ruleType: f.ruleType, reattempt: f.reattempt, autoIssue: f.autoIssue, components: f.components.map((c) => ({ ...c, minimum: Number(c.minimum), count: Number(c.count), theory: Number(c.theory), practical: Number(c.practical) })) },
    };
    case 'template': return {
      ...idPart, name: f.name, offering_id: f.offeringId ? Number(f.offeringId) : null, effective_from: f.effectiveFrom, active: f.active,
      data: { docType: f.docType, level: f.offeringId ? null : f.level || null, fields: f.fields, signatoryIds: f.signatoryIds, backContent: f.backContent, backgroundKey: f.backgroundKey || null },
    };
    case 'number_series': return { ...idPart, doc_type: f.docType, prefix: f.prefix, year: Number(f.year), padding: Number(f.padding), next_number: Number(f.nextNumber), reset_yearly: f.resetYearly };
    case 'signatory': return { ...idPart, name: f.name, active: f.active, data: { designation: f.designation, validFrom: f.validFrom, validTo: f.validTo || null, signatureKey: f.signatureKey } };
    case 'grading': return {
      ...idPart, name: f.name, active: f.active,
      data: {
        scaleMax: Number(f.scaleMax), passMinimum: Number(f.passMinimum), passRule: f.passRule, cgpaMethod: f.cgpaMethod, offeringIds: f.offeringIds,
        bands: f.bands.map((b) => ({ min: Number(b.min), max: Number(b.max), grade: b.grade.trim(), points: Number(b.points) })),
      },
    };
    case 'courier': return { ...idPart, name: f.name, active: f.active, data: { trackingUrlPattern: f.trackingUrlPattern.trim() } };
    default: return { ...idPart, name: f.name, active: f.active };
  }
}

/** Active-rule edit saves a NEW version (spec). */
export function savesNewVersion(tab: SettingTab, row: ConfigRow | SeriesRow | null): boolean {
  return tab === 'rule' && row !== null && (row as ConfigRow).active === true;
}

export function numberExample(f: Pick<SettingForm, 'prefix' | 'year' | 'padding' | 'nextNumber'>): string {
  const pad = Math.min(12, Math.max(1, Math.trunc(Number(f.padding)) || 1));
  return `${f.prefix || 'PREFIX'}/${f.year || 'YYYY'}/${String(Math.max(1, Math.trunc(Number(f.nextNumber)) || 1)).padStart(pad, '0')}`;
}

export function dmyOf(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}

/** A template background stored as the designer's PDF artwork (TTII 2026-11-20). */
export const isPdfKey = (key: string): boolean => key.toLowerCase().endsWith('.pdf');
