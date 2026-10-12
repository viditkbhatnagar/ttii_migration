import { asString, formatDate } from '../../shared/utils/admin-data-utils.js';
import type { Tone } from '../../shared/components/ui-tones.js';

// Applications list view model (TTII 2026-10-12, Naji's ApplicationsModule).
// Pure: the page feeds it the rows of /admin/applications/index and renders.

/** Pipeline stage ids as stored in `applications.stage`. */
export type StageTab = 'all' | 'lead' | 'payment_pending' | 'paid' | 'form_pending' | 'approval_waiting' | 'rejected';

// Naji 2026-05-07: no 'Enrolled' tab (enrolled rows move to Students) and 'All'
// sits at the end so the funnel reads left-to-right in pipeline order. There is
// no 'Form Submitted' tab: the counsellor-approve step was removed 2026-05-31,
// so submitted forms go straight to Approval Waiting.
export const STAGE_TABS: Array<{ id: StageTab; label: string }> = [
  { id: 'lead', label: 'Lead' },
  { id: 'payment_pending', label: 'Payment Pending' },
  { id: 'paid', label: 'Paid' },
  { id: 'form_pending', label: 'Form Pending' },
  { id: 'approval_waiting', label: 'Approval Waiting' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

// Labels for every stage a row can carry, including the legacy
// `form_submitted` and `enrolled` that have no tab of their own.
export const STAGE_LABEL: Record<string, string> = {
  lead: 'Lead',
  payment_pending: 'Payment Pending',
  paid: 'Paid',
  form_pending: 'Form Pending',
  form_submitted: 'Form Submitted',
  approval_waiting: 'Approval Waiting',
  enrolled: 'Enrolled',
  rejected: 'Rejected',
};

export const STAGE_TONE: Record<string, Tone> = {
  lead: 'blue',
  payment_pending: 'amber',
  paid: 'emerald',
  form_pending: 'slate',
  form_submitted: 'primary',
  approval_waiting: 'primary',
  enrolled: 'emerald',
  rejected: 'rose',
};

export function stageLabel(stage: string): string {
  return STAGE_LABEL[stage] ?? (stage ? stage.replace(/_/g, ' ') : 'Lead');
}

export function stageTone(stage: string): Tone {
  return STAGE_TONE[stage] ?? 'slate';
}

export interface ApplicationRow {
  id: string;
  applicationId: string;
  createdAt: string;
  /** dd/mm/yyyy of createdAt (local day) — what the table shows and sorts by. */
  dateLabel: string;
  name: string;
  location: string;
  course: string;
  offering: string;
  combination: string;
  phone: string;
  email: string;
  pipeline: string;
  pipelineUserId: string;
  owner: string;
  stage: string;
  image: string;
}

/** `users.email`-style legacy columns can hold a phone number — only show it when it looks like an email. */
export function displayEmail(row: Record<string, unknown>): string {
  const userEmail = asString(row.user_email).trim();
  if (userEmail) return userEmail;
  const legacy = asString(row.email).trim();
  return legacy.includes('@') ? legacy : '';
}

export function displayPhone(row: Record<string, unknown>): string {
  const phone = asString(row.phone).trim();
  if (!phone) return '';
  const code = asString(row.country_code).trim();
  return code ? `${code.startsWith('+') ? code : `+${code}`} ${phone}` : phone;
}

export function toApplicationRows(raw: Array<Record<string, unknown>>): ApplicationRow[] {
  return raw.map((r) => {
    const createdAt = asString(r.created_at);
    return {
      id: asString(r._id ?? r.id),
      applicationId: asString(r.application_id),
      createdAt,
      dateLabel: formatDate(createdAt),
      name: asString(r.name).trim(),
      location: [asString(r.district).trim(), asString(r.state).trim()].filter(Boolean).join(', '),
      course: asString(r.course_title),
      offering: asString(r.offering_title),
      combination: asString(r.combination_title),
      phone: displayPhone(r),
      email: displayEmail(r),
      pipeline: asString(r.pipeline),
      pipelineUserId: asString(r.pipeline_user),
      owner: asString(r.pipeline_user_name),
      stage: asString(r.stage) || 'lead',
      image: asString(r.image),
    };
  });
}

export interface ApplicationFilters {
  stage: StageTab;
  search: string;
  offering: string;
  pipelineUserId: string;
}

export const EMPTY_LIST_FILTERS: ApplicationFilters = { stage: 'lead', search: '', offering: '', pipelineUserId: '' };

/** Client-side filters on top of the server's date / course / pipeline / status filters. */
export function filterApplications(rows: ApplicationRow[], f: ApplicationFilters): ApplicationRow[] {
  const q = f.search.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  return rows.filter((r) => {
    if (f.stage !== 'all' && r.stage !== f.stage) return false;
    if (f.offering && r.offering !== f.offering) return false;
    if (f.pipelineUserId && r.pipelineUserId !== f.pipelineUserId) return false;
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q)
      || r.applicationId.toLowerCase().includes(q)
      || r.email.toLowerCase().includes(q)
      || r.phone.toLowerCase().includes(q)
      || (digits.length >= 3 && r.phone.replace(/\D/g, '').includes(digits))
    );
  });
}

/** Tab counts: every tab counts the rows the OTHER filters leave, so a pill never disagrees with its table. */
export function stageCounts(rows: ApplicationRow[]): Record<StageTab, number> {
  const counts: Record<StageTab, number> = {
    all: rows.length, lead: 0, payment_pending: 0, paid: 0, form_pending: 0, approval_waiting: 0, rejected: 0,
  };
  for (const r of rows) {
    if (r.stage in counts && r.stage !== 'all') counts[r.stage as StageTab] += 1;
  }
  return counts;
}

export type ApplicationSortKey =
  | 'applicationId' | 'date' | 'name' | 'course' | 'offering' | 'combination' | 'phone' | 'pipeline' | 'owner' | 'stage';

function sortValue(r: ApplicationRow, k: ApplicationSortKey): string {
  switch (k) {
    case 'date': return r.createdAt;
    case 'stage': return stageLabel(r.stage);
    default: return r[k];
  }
}

export function sortApplications(rows: ApplicationRow[], k: ApplicationSortKey, dir: 'asc' | 'desc'): ApplicationRow[] {
  return [...rows].sort((a, b) => {
    const cmp = sortValue(a, k).localeCompare(sortValue(b, k), undefined, { numeric: true, sensitivity: 'base' });
    return dir === 'asc' ? cmp : -cmp;
  });
}

export function exportTable(rows: ApplicationRow[]): Array<Array<string>> {
  return [
    ['Application ID', 'Application Date', 'Name', 'Course', 'Course Offering', 'Certificate Combination', 'Phone', 'E-mail', 'Pipeline', 'Pipeline User', 'Stage'],
    ...rows.map((r) => [r.applicationId, r.dateLabel, r.name, r.course, r.offering, r.combination, r.phone, r.email, r.pipeline, r.owner, stageLabel(r.stage)]),
  ];
}

/** YYYY-MM-DD of a local calendar day (never via toISOString — that is the UTC day). */
export function localYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export type DateRange = 'all' | '7' | '30' | '90' | 'custom';

/** The From date a preset range sends to the server ('' for All time / Custom). */
export function presetFromDate(range: DateRange, today: Date): string {
  if (range === 'all' || range === 'custom') return '';
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  d.setDate(d.getDate() - Number(range));
  return localYmd(d);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.map((p) => p[0]).join('').slice(0, 2) || '?').toUpperCase();
}
