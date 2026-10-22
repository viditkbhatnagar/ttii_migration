import { describe, expect, test } from 'vitest';

import {
  AFFILIATION_STATUSES, APP_PAYMENT_STATUSES, TOPUP_STATUSES, filterLedger, filterOptions, isLedgerFiltered, nextTabIndex,
  panelId, parseWalletLink, requestNo, sortLedger, statusPills, statusTone, tabId, toAffiliationFees, toAppPaymentRows,
  toCentreWalletRows, toTopUpRows, topUpStatus,
} from '../src/admin/pages/wallet/wallet-payment-model';
import { moneyOf, toWalletTxnRows } from '../src/admin/pages/centres/centre-payments-model';
import { AFFILIATION_SPEC, APP_PAYMENT_SPEC, TOPUP_SPEC, WALLET_SPEC } from '../src/admin/pages/wallet/wallet-columns';

const topUps = toTopUpRows([
  { id: 7, centre_id: 28, centre_name: 'upCarrera Education', user_name: 'upCarrera', transaction_receipt: '5as2das5d6da', amount: '25000', date: '2026-01-19T00:00:00.000Z', status: 'approved', attachment_file: null, description: 'NEFT' },
  { id: 9, centre_id: 1, centre_name: 'TTC Bepur svk', user_name: 'TTC', transaction_receipt: '', amount: '100', date: '2025-12-05T00:00:00.000Z', status: 'pending', attachment_file: 'https://cdn.example.com/r.jpg', description: 'gpay' },
  { id: 10, centre_id: 1, centre_name: 'TTC Bepur svk', amount: '15000', date: '2025-12-06T00:00:00.000Z', status: 'rejected', description: '' },
]);

const wallets = toCentreWalletRows([
  { id: 1, centre_id: 'TTC0001', centre_name: 'TTC Bepur svk ', wallet_balance: '3201', transaction_count: 7, phone: '99', email: 'a@x.in', status: 1 },
  { id: 30, centre_id: '30', centre_name: 'Hanahadhi', wallet_balance: '0', transaction_count: 0, phone: '', email: '', status: 0 },
  { centre_id: 'no id' },
]);

const apps = toAppPaymentRows({
  rows: [
    { key: 'app-101', applicationId: 'APP-101', studentName: 'Anu', studentCode: '', centreName: 'TTC Bepur svk', course: 'Diploma', fee: 20000, paid: 5000, balance: 15000, date: '2026-10-20', status: 'partial' },
    { key: 'user-502-16', applicationId: '', studentName: 'Sana', studentCode: 'TTS0102', centreName: 'TTC Bepur svk', course: 'PG Diploma', fee: 0, paid: 0, balance: 0, date: '2026-08-01', status: 'no_plan' },
    { key: 'app-103', applicationId: 'APP-103', studentName: 'Riya', studentCode: 'TTS0101', centreName: 'upCarrera Education', course: 'Diploma', fee: 20000, paid: 20000, balance: 0, date: '2026-10-01', status: 'paid' },
  ],
});

const fees = toAffiliationFees({
  ready: true,
  message: '',
  rows: [
    { id: 1, recordNo: 'AGR-2026-101', centreName: 'upCarrera Education', onboarding: false, period: '2026–29', amount: 30000, dueDate: '2026-04-01', paidOn: '2026-04-15', status: 'paid' },
    { id: 4, recordNo: 'AGR-2026-104', centreName: 'Thrissur Academy', onboarding: true, period: '2026–27', amount: 12000, dueDate: '2026-11-10', paidOn: '', status: 'due_soon' },
    { id: 5, recordNo: 'AGR-2026-105', centreName: 'Kochi', onboarding: false, period: '2026', amount: 0, dueDate: '2026-01-01', paidOn: '', status: 'no_fee' },
  ],
});

describe('payload mapping', () => {
  test('top-ups keep the raw receipt for "Txn / Ref No" and the FR- request number', () => {
    expect(topUps.map((r) => r.receipt)).toEqual(['5as2das5d6da', '', '']);
    expect(topUps.map((r) => requestNo(r.id))).toEqual(['FR-7', 'FR-9', 'FR-10']);
    expect(topUps.map(topUpStatus)).toEqual(['Approved', 'Pending', 'Rejected']);
  });

  test('centre wallets carry Active / Inactive from centres.status', () => {
    expect(wallets).toEqual([
      { id: '1', code: 'TTC0001', name: 'TTC Bepur svk', balance: 3201, transactions: 7, phone: '99', email: 'a@x.in', status: 'Active' },
      { id: '30', code: '30', name: 'Hanahadhi', balance: 0, transactions: 0, phone: '', email: '', status: 'Inactive' },
    ]);
  });

  test('application payments and affiliation fees get display statuses', () => {
    expect(apps.map((r) => r.status)).toEqual(['Partial', 'No plan', 'Paid']);
    expect(apps[0]).toMatchObject({ applicationId: 'APP-101', student: 'Anu', fee: 20000, paid: 5000, balance: 15000, ymd: '2026-10-20' });
    expect(fees.ready).toBe(true);
    expect(fees.rows.map((r) => r.status)).toEqual(['Paid', 'Due Soon', 'No fee']);
    expect(fees.rows[1]).toMatchObject({ onboarding: true, paidYmd: '', dueYmd: '2026-11-10' });
    expect(toAffiliationFees({ ready: false, message: 'Affiliation records are not set up yet.', rows: [] }))
      .toEqual({ ready: false, message: 'Affiliation records are not set up yet.', rows: [] });
  });
});

describe('ledger filtering', () => {
  const none = { status: '', search: '', filters: {} };

  test('status pill, centre filter and free-text search combine', () => {
    expect(filterLedger(topUps, { ...none, status: 'Pending' }, TOPUP_SPEC).map((r) => r.id)).toEqual(['9']);
    expect(filterLedger(topUps, { ...none, filters: { centre: 'TTC Bepur svk' } }, TOPUP_SPEC).map((r) => r.id)).toEqual(['9', '10']);
    expect(filterLedger(topUps, { ...none, search: 'fr-7' }, TOPUP_SPEC).map((r) => r.id)).toEqual(['7']);
    expect(filterLedger(topUps, { ...none, search: 'gpay' }, TOPUP_SPEC).map((r) => r.id)).toEqual(['9']);
    expect(filterLedger(wallets, { ...none, status: 'Inactive' }, WALLET_SPEC).map((r) => r.id)).toEqual(['30']);
    expect(filterLedger(apps, { ...none, filters: { centre: 'TTC Bepur svk', course: 'Diploma' } }, APP_PAYMENT_SPEC).map((r) => r.key)).toEqual(['app-101']);
    expect(filterLedger(apps, { ...none, search: 'tts0101' }, APP_PAYMENT_SPEC).map((r) => r.key)).toEqual(['app-103']);
    expect(filterLedger(fees.rows, { ...none, filters: { period: '2026–27' } }, AFFILIATION_SPEC).map((r) => r.id)).toEqual(['4']);
  });

  test('pills list the tab statuses plus any extra one present, with unfiltered counts', () => {
    expect(statusPills(topUps, TOPUP_STATUSES, TOPUP_SPEC.statusOf)).toEqual([
      { status: 'Pending', count: 1 }, { status: 'Approved', count: 1 }, { status: 'Rejected', count: 1 },
    ]);
    expect(statusPills(apps, APP_PAYMENT_STATUSES, APP_PAYMENT_SPEC.statusOf).map((p) => p.count)).toEqual([1, 1, 0, 1]);
    expect(statusPills(fees.rows, AFFILIATION_STATUSES, AFFILIATION_SPEC.statusOf).map((p) => p.status))
      .toEqual(['Paid', 'Pending', 'Due Soon', 'Overdue', 'No fee']);
  });

  test('sorting, filter options and the clear button state', () => {
    expect(sortLedger(topUps, (r) => r.amount, 'desc').map((r) => r.id)).toEqual(['7', '10', '9']);
    expect(sortLedger(wallets, (r) => r.code, 'asc').map((r) => r.code)).toEqual(['30', 'TTC0001']);
    expect(filterOptions(apps, (r) => r.course)).toEqual([{ value: 'Diploma', label: 'Diploma' }, { value: 'PG Diploma', label: 'PG Diploma' }]);
    expect(isLedgerFiltered(none)).toBe(false);
    expect(isLedgerFiltered({ ...none, filters: { centre: '' } })).toBe(false);
    expect(isLedgerFiltered({ ...none, filters: { centre: 'x' } })).toBe(true);
    expect(isLedgerFiltered({ ...none, search: ' a ' })).toBe(true);
  });
});

describe('tones and deep links', () => {
  test("Naji's tone map", () => {
    expect(['Approved', 'Paid', 'Active'].map(statusTone)).toEqual(['emerald', 'emerald', 'emerald']);
    expect(['Pending', 'Partial', 'Due Soon'].map(statusTone)).toEqual(['amber', 'amber', 'amber']);
    expect(['Rejected', 'Overdue', 'Unpaid', 'Inactive'].map(statusTone)).toEqual(['rose', 'rose', 'rose', 'rose']);
    expect(statusTone('No plan')).toBe('slate');
  });

  test('?tab=&status= from the dashboard; anything unknown falls back', () => {
    expect(parseWalletLink('?tab=topups&status=Pending')).toEqual({ tab: 'topups', status: 'Pending' });
    expect(parseWalletLink('?tab=wallets')).toEqual({ tab: 'wallets', status: '' });
    expect(parseWalletLink('?tab=nope&status=<script>')).toEqual({ tab: 'topups', status: '' });
    expect(parseWalletLink('')).toEqual({ tab: 'topups', status: '' });
  });
});

describe('money from VarChar columns', () => {
  test('commas, spaces and the rupee sign are stripped; blanks and junk are 0', () => {
    expect(moneyOf('3,201')).toBe(3201);
    expect(moneyOf('1,000.50')).toBe(1000.5);
    expect(moneyOf(' ₹ 2,500 ')).toBe(2500);
    expect(moneyOf('Rs. 250')).toBe(250);
    expect(moneyOf('')).toBe(0);
    expect(moneyOf(null)).toBe(0);
    expect(moneyOf(undefined)).toBe(0);
    expect(moneyOf('abc')).toBe(0);
    expect(moneyOf(75000)).toBe(75000);
    expect(moneyOf(Number.NaN)).toBe(0);
  });

  test('wallet balances, top-up and wallet-transaction amounts keep their thousands', () => {
    expect(toCentreWalletRows([{ id: 1, centre_id: 'TTC0001', centre_name: 'A', wallet_balance: '3,201', transaction_count: 1, status: 1 }])[0]?.balance).toBe(3201);
    const rows = toTopUpRows([
      { id: 1, centre_name: 'A', amount: '1,000.50', date: '2026-01-01', status: 'pending' },
      { id: 2, centre_name: 'A', amount: '25,000', date: '2026-01-02', status: 'pending' },
      { id: 3, centre_name: 'A', amount: '', date: '2026-01-03', status: 'pending' },
    ]);
    expect(rows.map((r) => r.amount)).toEqual([1000.5, 25000, 0]);
    // The amount sort is numeric, not text.
    expect(sortLedger(rows, (r) => r.amount, 'desc').map((r) => r.id)).toEqual(['2', '1', '3']);
    expect(toWalletTxnRows([{ id: 9, transaction_type: 'credit', amount: '3,201', created_at: '2026-01-01T00:00:00Z' }])[0]?.amount).toBe(3201);
  });
});

describe('tab keyboard', () => {
  test('Left / Right wrap, Home / End jump, other keys do nothing', () => {
    expect(nextTabIndex('ArrowRight', 0, 4)).toBe(1);
    expect(nextTabIndex('ArrowRight', 3, 4)).toBe(0);
    expect(nextTabIndex('ArrowLeft', 0, 4)).toBe(3);
    expect(nextTabIndex('Home', 2, 4)).toBe(0);
    expect(nextTabIndex('End', 0, 4)).toBe(3);
    expect(nextTabIndex('Enter', 1, 4)).toBeNull();
    expect(nextTabIndex('ArrowRight', 0, 0)).toBeNull();
    expect([tabId('wallets'), panelId('wallets')]).toEqual(['wallet-tab-wallets', 'wallet-panel-wallets']);
  });
});
