import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { matchesSearch, sortRows, type SortDir } from '../cohorts/list-model.js';

// Centre Directory + Wallet Status view models (TTII 2026-10-12, Naji's
// CentreDirectoryModule / WalletStatusModule). Rows come from
// GET /admin/centres/index (listCentres) and GET /admin/wallet/index
// (listAdminWalletStatus). Every filter runs HERE on the loaded rows:
//  - the old directory compared `row.state` / `row.status` against text, but the
//    API returns `state_id` and an Int `status`, so picking a State or Status
//    emptied the table;
//  - the old Wallet Status sent `centre_id` to the server, which compares it to
//    the Int primary key and 500s on any non-numeric code ("TTC0001").

export type CentreStatus = 'active' | 'inactive';

export interface CentreRow {
  /** centres.id — what the view/edit/delete routes take. */
  id: string;
  /** centres.centre_id — the human code ("TTC0001", "28"). */
  code: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  state: string;
  status: CentreStatus;
  students: number;
  walletBalance: number;
  /** The role-7 login that owns the centre ('' when none is wired). */
  linkedUserId: string;
  linkedUserEmail: string;
}

export interface FundRequestTally {
  total: number;
  pending: number;
}

export interface CentreFilters {
  search: string;
  code: string;
  name: string;
  contact: string;
  phone: string;
  state: string;
  status: '' | CentreStatus;
}

export const EMPTY_CENTRE_FILTERS: CentreFilters = { search: '', code: '', name: '', contact: '', phone: '', state: '', status: '' };

export type CentreSortKey = 'name' | 'students' | 'fundRequests' | 'walletBalance';

/** centres.status is an Int (1 = active). Text values from older payloads are honoured too. */
export function centreStatusOf(value: unknown): CentreStatus {
  const s = asString(value).toLowerCase();
  return s === '0' || s === 'inactive' ? 'inactive' : 'active';
}

/** A state NAME, or '' — legacy rows keep a numeric state_id that names nothing. */
function stateOf(r: Record<string, unknown>): string {
  const named = asString(r.state);
  if (named) return named;
  const legacy = asString(r.state_id);
  return legacy && !/^\d+$/.test(legacy) ? legacy : '';
}

export function toCentreRow(r: Record<string, unknown>): CentreRow {
  return {
    id: asString(r.id),
    code: asString(r.centre_id),
    name: asString(r.centre_name),
    contact: asString(r.contact_person),
    phone: asString(r.phone),
    email: asString(r.email),
    state: stateOf(r),
    status: centreStatusOf(r.status),
    students: asNumber(r.students_count),
    walletBalance: asNumber(r.wallet_balance),
    linkedUserId: asString(r.linked_user_id),
    linkedUserEmail: asString(r.linked_user_email),
  };
}

export function toCentreRows(data: unknown): CentreRow[] {
  return Array.isArray(data)
    ? data.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object').map(toCentreRow).filter((c) => c.id)
    : [];
}

/** Fund requests per centres.id, from the Centre Payments feed. */
export function tallyFundRequests(fundRequests: Record<string, unknown>[]): Map<string, FundRequestTally> {
  const map = new Map<string, FundRequestTally>();
  for (const fr of fundRequests) {
    const centreId = asString(fr.centre_id);
    if (!centreId) continue;
    const t = map.get(centreId) ?? { total: 0, pending: 0 };
    map.set(centreId, {
      total: t.total + 1,
      pending: t.pending + (asString(fr.status).toLowerCase() === 'pending' ? 1 : 0),
    });
  }
  return map;
}

const has = (value: string, needle: string) => value.toLowerCase().includes(needle.trim().toLowerCase());

export function filterCentres(rows: CentreRow[], f: CentreFilters): CentreRow[] {
  return rows.filter((c) => {
    if (f.code.trim() && !has(c.code, f.code)) return false;
    if (f.name.trim() && !has(c.name, f.name)) return false;
    if (f.contact.trim() && !has(c.contact, f.contact)) return false;
    if (f.phone.trim() && !has(c.phone, f.phone)) return false;
    if (f.state && c.state !== f.state) return false;
    if (f.status && c.status !== f.status) return false;
    return matchesSearch(f.search, [c.name, c.code, c.email, c.contact, c.phone]);
  });
}

export function sortCentres(
  rows: CentreRow[],
  key: CentreSortKey,
  dir: SortDir,
  tallies: Map<string, FundRequestTally> = new Map(),
): CentreRow[] {
  const pick = (c: CentreRow): string | number => {
    if (key === 'fundRequests') return tallies.get(c.id)?.total ?? 0;
    return c[key];
  };
  return sortRows(rows, pick, dir);
}

/** Distinct state names present in the loaded rows, A–Z. */
export function stateOptions(rows: CentreRow[]): string[] {
  return [...new Set(rows.map((c) => c.state).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function centreCsvRows(rows: CentreRow[], tallies: Map<string, FundRequestTally>): Array<Array<string | number>> {
  return [
    ['Centre ID', 'Centre Name', 'Contact Person', 'Contact No', 'Email', 'State', 'Status', 'Total Students', 'Fund Requests', 'Pending Fund Requests', 'Wallet Balance'],
    ...rows.map((c) => {
      const t = tallies.get(c.id);
      return [
        c.code, c.name, c.contact, c.phone, c.email, c.state, c.status === 'active' ? 'Active' : 'Inactive',
        c.students, t?.total ?? 0, t?.pending ?? 0, c.walletBalance,
      ];
    }),
  ];
}

// ─── Wallet Status ──────────────────────────────────────────────────────────

export interface WalletRow {
  id: string;
  code: string;
  name: string;
  balance: number;
  transactions: number;
  phone: string;
  email: string;
}

export interface WalletFilters {
  search: string;
  code: string;
  name: string;
}

export const EMPTY_WALLET_FILTERS: WalletFilters = { search: '', code: '', name: '' };

export type WalletSortKey = 'code' | 'name' | 'balance' | 'transactions';

export function toWalletRows(data: unknown): WalletRow[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => ({
      id: asString(r.id),
      code: asString(r.centre_id),
      name: asString(r.centre_name),
      balance: asNumber(r.wallet_balance),
      transactions: asNumber(r.transaction_count),
      phone: asString(r.phone),
      email: asString(r.email),
    }))
    .filter((w) => w.id);
}

export function filterWallets(rows: WalletRow[], f: WalletFilters): WalletRow[] {
  return rows.filter((w) => {
    if (f.code.trim() && !has(w.code, f.code)) return false;
    if (f.name.trim() && !has(w.name, f.name)) return false;
    return matchesSearch(f.search, [w.name, w.code, w.email, w.phone]);
  });
}

export function sortWallets(rows: WalletRow[], key: WalletSortKey, dir: SortDir): WalletRow[] {
  return sortRows(rows, (w) => w[key], dir);
}

export function walletCsvRows(rows: WalletRow[]): Array<Array<string | number>> {
  return [
    ['Centre ID', 'Centre Name', 'Wallet Balance', 'Transactions', 'Phone', 'Email'],
    ...rows.map((w) => [w.code, w.name, w.balance, w.transactions, w.phone, w.email]),
  ];
}

/** "₹75,000.00" — the en-IN money format used across the admin. */
export function rupees(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
