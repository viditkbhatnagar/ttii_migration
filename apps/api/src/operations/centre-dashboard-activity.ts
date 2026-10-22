import { approvedRequestIdOf, fundRequestNo, isCredit, money } from './centre-dashboard-model.js';

// Centre Dashboard → "Recent activity": REAL events only, newest first (the
// prototype flattened a fake log in array order). Sources: top-up requests
// (requested / approved / rejected), wallet transactions, centre applications
// (created / enrolled) and, once its table exists, Centre Onboarding events.
// An approval is dated by the wallet credit it wrote ("Fund request approved
// #id"); a legacy approval with no such credit falls back to updated_at.
// The service passes only the newest few rows of each source (orderBy + take),
// which always contains the overall newest events.

export type ActivityKind =
  | 'topup_requested' | 'topup_approved' | 'topup_rejected' | 'wallet_credit' | 'wallet_debit'
  | 'application_created' | 'application_enrolled' | 'onboarding';

export interface DashboardActivity {
  id: string;
  kind: ActivityKind;
  /** ISO instant. */
  at: string;
  /** Centre name (money events, onboarding) or student name (applications). */
  who: string;
  /** FR-12 / the application id / the onboarding ref. */
  ref: string;
  amount: number | null;
  /** Wallet remarks, the centre of an application, or the onboarding message. */
  note: string;
}

export interface ActivityInput {
  centreNames: Map<number, string>;
  requests: Array<{ id: number; centre_id: number; amount: string; status: string; created_at: Date; updated_at: Date | null }>;
  txns: Array<{ id: number; centre_id: number; transaction_type: string; amount: string; remarks: string | null; created_at: Date | null }>;
  apps: Array<{
    id: number; application_id: string | null; name: string | null; added_under_centre: number | null;
    created_at: Date | null; converted_at: Date | null;
  }>;
  onboarding: Array<{ id: number; at: Date; name: string; ref: string; message: string }>;
  /** Approved requests whose wallet credit exists (anywhere, not just in `txns`). */
  creditedRequestIds?: Set<number>;
}

export const ACTIVITY_SHOWN = 6;

function iso(value: Date | null | undefined): string {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString() : '';
}

function moneyEvents(input: ActivityInput): DashboardActivity[] {
  const centre = (id: number) => input.centreNames.get(id) ?? '';
  const out: DashboardActivity[] = [];
  const creditedRequests = new Set<number>(input.creditedRequestIds ?? []);
  for (const t of input.txns) {
    const requestId = approvedRequestIdOf(t.remarks);
    const credit = isCredit(t.transaction_type);
    if (credit && requestId !== null) creditedRequests.add(requestId);
    out.push({
      id: `txn-${t.id}`,
      kind: credit && requestId !== null ? 'topup_approved' : credit ? 'wallet_credit' : 'wallet_debit',
      at: iso(t.created_at),
      who: centre(t.centre_id),
      ref: requestId !== null ? fundRequestNo(requestId) : `#${t.id}`,
      amount: money(t.amount),
      note: (t.remarks ?? '').trim(),
    });
  }
  for (const r of input.requests) {
    const base = { who: centre(r.centre_id), ref: fundRequestNo(r.id), amount: money(r.amount), note: '' };
    out.push({ ...base, id: `fr-${r.id}`, kind: 'topup_requested', at: iso(r.created_at) });
    if (r.status === 'rejected') out.push({ ...base, id: `fr-${r.id}-rejected`, kind: 'topup_rejected', at: iso(r.updated_at ?? r.created_at) });
    if (r.status === 'approved' && !creditedRequests.has(r.id)) {
      out.push({ ...base, id: `fr-${r.id}-approved`, kind: 'topup_approved', at: iso(r.updated_at ?? r.created_at) });
    }
  }
  return out;
}

function applicationEvents(input: ActivityInput): DashboardActivity[] {
  return input.apps.flatMap((a) => {
    const base = {
      who: (a.name ?? '').trim(),
      ref: (a.application_id ?? '').trim() || `#${a.id}`,
      amount: null,
      note: a.added_under_centre !== null ? input.centreNames.get(a.added_under_centre) ?? '' : '',
    };
    const created: DashboardActivity = { ...base, id: `app-${a.id}`, kind: 'application_created', at: iso(a.created_at) };
    return a.converted_at
      ? [created, { ...base, id: `app-${a.id}-enrolled`, kind: 'application_enrolled' as const, at: iso(a.converted_at) }]
      : [created];
  });
}

/** The newest `limit` events across every source; undated events are dropped. */
export function buildActivity(input: ActivityInput, limit: number = ACTIVITY_SHOWN): DashboardActivity[] {
  const onboarding: DashboardActivity[] = input.onboarding.map((e) => ({
    id: `onb-${e.id}`, kind: 'onboarding', at: iso(e.at), who: e.name.trim(), ref: e.ref, amount: null, note: e.message.trim(),
  }));
  return [...moneyEvents(input), ...applicationEvents(input), ...onboarding]
    .filter((e) => e.at !== '')
    .sort((a, b) => (a.at === b.at ? b.id.localeCompare(a.id) : b.at.localeCompare(a.at)))
    .slice(0, limit);
}
