import { asString } from '../../shared/utils/admin-data-utils.js';
import { stageLabel } from './application-list-model.js';

// Application profile view model (TTII 2026-10-12, Naji's ApplicationProfile).
// Pure logic lifted out of the old ViewApplicationPage so it can be tested:
// which stage actions show, the verification gate, the saved payment plan and
// its per-instalment ledger, and the pipeline progress / stage history built
// from the real Lead History events.

// Naji 2026-05-08 — until the applicant submits the form, the profile shows only
// what was captured at Add Lead.
export const LEAD_STAGES = new Set(['lead', 'payment_pending', 'paid', 'form_pending']);

export function isLeadStage(stage: string): boolean {
  return LEAD_STAGES.has(stage);
}

// ── Verification gate (Naji UAT 2026-05-31) ─────────────────────────────────
export const VERIFY_SECTION_KEYS = ['basic', 'qualification', 'documents'] as const;

export interface ApplicationDocument {
  name?: string;
  label?: string;
  url?: string;
  document_type_id?: string | null;
}

export function readDocuments(app: Record<string, unknown>): ApplicationDocument[] {
  return Array.isArray(app.documents) ? (app.documents as ApplicationDocument[]) : [];
}

export function readVerified(app: Record<string, unknown>): Set<string> {
  const v = (app.verification as { verified?: unknown } | undefined)?.verified;
  return new Set(Array.isArray(v) ? v.map((k) => String(k)) : []);
}

/** Approval is gated until every section AND every document is verified. */
export function allVerified(verified: Set<string>, documentCount: number): boolean {
  if (!VERIFY_SECTION_KEYS.every((k) => verified.has(k))) return false;
  for (let i = 0; i < documentCount; i += 1) {
    if (!verified.has(`doc:${i}`)) return false;
  }
  return true;
}

// ── Stage actions (Naji 2026-05-07: contextual by stage) ───────────────────
export type StageAction =
  | 'generate_plan' // lead: Generate Payment Link / Edit-Resend (primary)
  | 'resend_plan' // payment_pending..form_pending: Edit / Resend Payment Plan
  | 'mark_paid'
  | 'send_form_link'
  | 'resend_form_link'
  | 'admin_approve'
  | 'reject'
  | 'mark_approved'
  | 'download_pdf';

export function stageActions(
  stage: string,
  status: string,
  opts: { isAdmin: boolean },
): StageAction[] {
  const out: StageAction[] = [];
  if (stage === 'lead') out.push('generate_plan');
  if (stage === 'payment_pending' || stage === 'paid' || stage === 'form_pending') out.push('resend_plan');
  if (stage === 'payment_pending') out.push('mark_paid');
  if (stage === 'paid') out.push('send_form_link');
  if (stage === 'form_pending') out.push('resend_form_link');
  // Admin Approve & Enrol for approval_waiting and legacy form_submitted.
  if ((stage === 'approval_waiting' || stage === 'form_submitted') && opts.isAdmin) out.push('admin_approve');
  // Reject only once the applicant has submitted something.
  if (stage !== 'rejected' && stage !== 'enrolled' && !isLeadStage(stage) && opts.isAdmin) out.push('reject');
  if (status !== 'approved' && stage === 'enrolled') out.push('mark_approved');
  if (stage === 'form_submitted' || stage === 'approval_waiting' || stage === 'enrolled' || stage === 'rejected') out.push('download_pdf');
  return out;
}

// ── Saved payment plan ──────────────────────────────────────────────────────
export interface PlanRow {
  label: string;
  amountMinor?: number;
  dueDate?: string;
  amount_minor?: number;
  due_date?: string;
  gstPercent?: number;
  gst_percent?: number;
}

export interface LedgerEntry {
  index?: number;
  status?: string;
  amount_minor?: number | null;
  mode?: string;
  reference?: string;
  receipt_url?: string | null;
  paid_date?: string | null;
  marked_at?: string;
}

export interface SavedPlan {
  mode?: string;
  total_amount_minor?: number;
  registration_fee_minor?: number | null;
  installments?: PlanRow[];
  manual_payment?: { mode?: string; reference?: string; receipt_url?: string; note?: string; marked_at?: string };
  instalment_payments?: LedgerEntry[];
}

export function parseSavedPlan(raw: unknown): SavedPlan | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'object') return raw as SavedPlan;
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as SavedPlan) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export interface PlanLine {
  label: string;
  amount: number;
  gstPercent: number;
  inclusive: number;
  dueDate: string;
}

export function planLines(plan: SavedPlan | null): PlanLine[] {
  const rows = Array.isArray(plan?.installments) ? plan.installments : [];
  return rows.map((r) => {
    const amount = Number(r.amountMinor ?? r.amount_minor ?? 0) / 100;
    const gstPercent = Number(r.gstPercent ?? r.gst_percent ?? 0);
    return {
      label: asString(r.label),
      amount,
      gstPercent,
      inclusive: amount + (amount * gstPercent) / 100,
      dueDate: asString(r.dueDate ?? r.due_date),
    };
  });
}

/** Totals from the saved rows (so they match the per-row amounts even after edits). */
export function planTotals(plan: SavedPlan | null): { excl: number; gst: number; total: number } {
  let excl = 0;
  let incl = 0;
  for (const l of planLines(plan)) { excl += l.amount; incl += l.inclusive; }
  const total = incl > 0 ? incl : (plan?.total_amount_minor ? Number(plan.total_amount_minor) / 100 : 0);
  return { excl, gst: incl - excl, total };
}

export interface RowPayment { mode: string; reference: string; date: string; receipt: string }

/** Per-row "Paid" chip (Naji 2026-07-09). A settled registration with no ledger row still counts as row 0. */
export function rowIsPaid(plan: SavedPlan | null, paymentStatus: string, i: number): boolean {
  const ledger = Array.isArray(plan?.instalment_payments) ? plan.instalment_payments : [];
  const e = ledger.find((x) => Number(x.index ?? -1) === i);
  if (e) return asString(e.status) === 'approved';
  return i === 0 && paymentStatus === 'paid';
}

export function rowPaymentInfo(plan: SavedPlan | null, paymentStatus: string, i: number): RowPayment | null {
  const ledger = Array.isArray(plan?.instalment_payments) ? plan.instalment_payments : [];
  const e = ledger.find((x) => Number(x.index ?? -1) === i);
  if (e && asString(e.status) === 'approved') {
    return {
      mode: asString(e.mode),
      reference: asString(e.reference),
      date: e.paid_date ? asString(e.paid_date) : asString(e.marked_at),
      receipt: asString(e.receipt_url),
    };
  }
  const manual = plan?.manual_payment;
  if (i === 0 && manual && (asString(manual.reference) || asString(manual.mode))) {
    return { mode: asString(manual.mode), reference: asString(manual.reference), date: asString(manual.marked_at), receipt: asString(manual.receipt_url) };
  }
  if (i === 0 && paymentStatus === 'paid') return { mode: '', reference: '', date: '', receipt: '' };
  return null;
}

export function paymentStatusLabel(status: string): string {
  if (status === 'pending_approval') return 'Pending Approval';
  if (status === 'payment_rejected') return 'Rejected';
  return status.replace(/_/g, ' ');
}

// ── Pipeline progress + stage history ──────────────────────────────────────
// The pipeline in order. `form_submitted` is a legacy stage that sits at the
// Approval Waiting step; `rejected` is a branch shown after the last step reached.
export const PIPELINE = ['lead', 'payment_pending', 'paid', 'form_pending', 'approval_waiting', 'enrolled'] as const;

function pipelineIndex(stage: string): number {
  if (stage === 'form_submitted') return PIPELINE.indexOf('approval_waiting');
  return (PIPELINE as readonly string[]).indexOf(stage);
}

export interface AppEvent { type: string; description: string; at: string; actor: string; metadata: Record<string, unknown> }

export function toEvents(raw: Array<Record<string, unknown>>): AppEvent[] {
  return raw.map((ev) => {
    let metadata: Record<string, unknown> = {};
    const m = ev.metadata;
    if (m && typeof m === 'object') metadata = m as Record<string, unknown>;
    else if (typeof m === 'string' && m) {
      try { const p: unknown = JSON.parse(m); if (p && typeof p === 'object') metadata = p as Record<string, unknown>; } catch { /* free text */ }
    }
    const name = asString(ev.actor_name);
    const role = asString(ev.actor_role_label);
    return {
      type: asString(ev.event_type),
      description: asString(ev.description),
      at: asString(ev.created_at),
      actor: name ? `${name}${role ? ` (${role})` : ''}` : '',
      metadata,
    };
  });
}

/** The stage an event moved the application INTO, or '' when it is not a stage change. */
export function eventStage(ev: AppEvent): string {
  switch (ev.type) {
    case 'lead_created': return 'lead';
    case 'payment_link_sent': return 'payment_pending';
    case 'payment_received_razorpay': return 'paid';
    case 'payment_approved': {
      const idx = Number(ev.metadata.instalment_index ?? 0);
      return idx === 0 ? 'paid' : '';
    }
    case 'form_link_sent': return 'form_pending';
    case 'form_submitted': return 'approval_waiting';
    case 'admin_approved_enrolled':
    case 'converted': return 'enrolled';
    case 'rejected': return 'rejected';
    case 'reopened': return asString(ev.metadata.stage);
    default: return '';
  }
}

export interface StageStep {
  stage: string;
  label: string;
  state: 'done' | 'current' | 'upcoming';
  /** When the stage was first reached ('' when no event recorded it — legacy rows). */
  at: string;
  by: string;
}

/**
 * Pipeline steps for the progress bar and Stage History. Steps before the
 * current one are done; for a rejected application, the steps up to the
 * furthest one its events show it reached are done and a Rejected step is current.
 */
export function stageSteps(stage: string, events: AppEvent[]): StageStep[] {
  const chronological = [...events].sort((a, b) => a.at.localeCompare(b.at));
  const firstAt = new Map<string, { at: string; by: string }>();
  for (const ev of chronological) {
    const s = eventStage(ev);
    if (s && !firstAt.has(s)) firstAt.set(s, { at: ev.at, by: ev.actor });
  }
  const rejected = stage === 'rejected';
  let reached = pipelineIndex(stage);
  if (rejected) {
    reached = 0; // every application starts as a lead
    for (const s of firstAt.keys()) reached = Math.max(reached, pipelineIndex(s));
  }
  const steps: StageStep[] = PIPELINE.map((s, i) => {
    const state: StageStep['state'] = rejected
      ? (i <= reached ? 'done' : 'upcoming')
      : i < reached ? 'done' : i === reached ? 'current' : 'upcoming';
    const hit = firstAt.get(s);
    // A legacy form_submitted application sits on the Approval Waiting step under its own name.
    const shown = state === 'current' && stage === 'form_submitted' ? 'form_submitted' : s;
    return { stage: shown, label: stageLabel(shown), state, at: hit?.at ?? '', by: hit?.by ?? '' };
  });
  if (rejected) {
    const latest = [...chronological].reverse().find((e) => e.type === 'rejected');
    // Nothing after the rejection point happened: drop the unreached tail so the
    // Rejected step follows the last step the application got to.
    const kept = steps.filter((st) => st.state === 'done');
    return [...kept, { stage: 'rejected', label: 'Rejected', state: 'current', at: latest?.at ?? '', by: latest?.actor ?? '' }];
  }
  return steps;
}

/**
 * dd/mm/yyyy of a DATE-ONLY value (`@db.Date` / plan due dates), read straight
 * from its YYYY-MM-DD digits. Prisma sends these as `YYYY-MM-DDT00:00:00.000Z`;
 * going through `new Date()` would show the previous day in a browser behind UTC.
 * Anything that does not start with YYYY-MM-DD is returned as-is ('' for empty).
 */
export function formatDateOnly(value: unknown): string {
  const s = asString(value).trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

/** dd/mm/yyyy, hh:mm am/pm in the viewer's local time ('' when unparseable). */
export function formatDateTime(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}, ${String(h % 12 || 12).padStart(2, '0')}:${min} ${h < 12 ? 'am' : 'pm'}`;
}
