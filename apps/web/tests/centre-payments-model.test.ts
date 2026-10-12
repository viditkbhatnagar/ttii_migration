import { describe, expect, test } from 'vitest';

import {
  EMPTY_PAYMENT_FILTERS,
  alreadyStatusOf,
  withSettledStatus,
  filterFundRequests,
  filterWalletTxns,
  fundRequestCsvRows,
  istYmdOf,
  safeHref,
  sortFundRequests,
  sortWalletTxns,
  toFundRequestRows,
  toWalletTxnRows,
  walletTxnCsvRows,
} from '../src/admin/pages/centres/centre-payments-model';

const fund = toFundRequestRows([
  { id: 1, centre_id: 28, centre_name: 'upCarrera Education', user_name: 'upCarrera Education', transaction_receipt: '5as2das5d6da', amount: '25000', date: '2026-01-19T00:00:00.000Z', status: 'approved', attachment_file: null, description: 'aa' },
  { id: 2, centre_id: 1, centre_name: 'TTC Bepur svk', user_name: 'TTC Bepur svk', transaction_receipt: '', amount: '100', date: '2025-12-05T00:00:00.000Z', status: 'pending', attachment_file: 'https://cdn.example.com/receipt.jpg', description: 'gpay' },
  { id: 3, centre_id: 1, centre_name: 'TTC Bepur svk', amount: '15000', date: '2025-12-06T00:00:00.000Z', status: 'rejected', attachment_file: 'javascript:alert(1)', description: 'test' },
]);

const wallet = toWalletTxnRows([
  // 2026-01-18T20:00Z is 19 Jan 01:30 in IST.
  { id: 10, centre_id: 28, centre_name: 'upCarrera Education', transaction_type: 'credit', amount: '25000', remarks: 'Fund request approved #1', created_at: '2026-01-18T20:00:00.000Z' },
  { id: 9, centre_id: 1, centre_name: 'TTC Bepur svk', transaction_type: 'Debit', amount: '800', remarks: 'Enrollment fee', created_at: '2025-12-01T06:00:00.000Z' },
]);

describe('fund request rows', () => {
  test('maps the payload: transaction no falls back to the id, dates stay calendar dates', () => {
    expect(fund.map((r) => r.txnNo)).toEqual(['5as2das5d6da', '2', '3']);
    expect(fund.map((r) => r.ymd)).toEqual(['2026-01-19', '2025-12-05', '2025-12-06']);
    expect(fund[0]).toMatchObject({ amount: 25000, status: 'approved', user: 'upCarrera Education' });
  });

  test('only safe attachment links are kept', () => {
    expect(fund[1]?.attachment).toBe('https://cdn.example.com/receipt.jpg');
    expect(fund[2]?.attachment).toBe('');
    expect(safeHref(' JavaScript:alert(1)')).toBe('');
    expect(safeHref('data:text/html,x')).toBe('');
    expect(safeHref('/uploads/a.pdf')).toBe('/uploads/a.pdf');
  });

  test('date window is inclusive and status applies to fund requests only', () => {
    const f = { ...EMPTY_PAYMENT_FILTERS, from: '2025-12-06', to: '2026-01-19' };
    expect(filterFundRequests(fund, f).map((r) => r.id)).toEqual(['1', '3']);
    expect(filterFundRequests(fund, { ...EMPTY_PAYMENT_FILTERS, status: 'pending' }).map((r) => r.id)).toEqual(['2']);
    expect(filterWalletTxns(wallet, { ...EMPTY_PAYMENT_FILTERS, status: 'pending' })).toHaveLength(2);
    expect(filterFundRequests(fund, { ...EMPTY_PAYMENT_FILTERS, search: 'gpay' }).map((r) => r.id)).toEqual(['2']);
  });

  test('sorts by date (newest first) and amount', () => {
    expect(sortFundRequests(fund, 'date', 'desc').map((r) => r.id)).toEqual(['1', '3', '2']);
    expect(sortFundRequests(fund, 'amount', 'asc').map((r) => r.id)).toEqual(['2', '3', '1']);
    expect(fundRequestCsvRows(fund.slice(1, 2))[1]).toEqual(['TTC Bepur svk', 'TTC Bepur svk', '2', 100, '05/12/2025', 'Pending', 'https://cdn.example.com/receipt.jpg', 'gpay']);
  });
});

describe('wallet transaction rows', () => {
  test('dates are IST calendar days and types are lower-cased', () => {
    expect(istYmdOf('2026-01-18T20:00:00.000Z')).toBe('2026-01-19');
    expect(istYmdOf('nope')).toBe('');
    expect(wallet.map((r) => r.ymd)).toEqual(['2026-01-19', '2025-12-01']);
    expect(wallet[1]?.type).toBe('debit');
  });

  test('filters by the IST date window and searches the remarks', () => {
    expect(filterWalletTxns(wallet, { ...EMPTY_PAYMENT_FILTERS, from: '2026-01-19' }).map((r) => r.id)).toEqual(['10']);
    expect(filterWalletTxns(wallet, { ...EMPTY_PAYMENT_FILTERS, search: 'enrollment' }).map((r) => r.id)).toEqual(['9']);
    expect(sortWalletTxns(wallet, 'date', 'asc').map((r) => r.id)).toEqual(['9', '10']);
    expect(walletTxnCsvRows(wallet)[1]).toEqual(['upCarrera Education', '10', 'Credit', 25000, '19/01/2026', 'Fund request approved #1']);
  });
});

describe('settled status after a decision', () => {
  test('a decided request shows its new status until the refetch lands', () => {
    const settled = withSettledStatus(fund, (id) => (id === '2' ? 'approved' : undefined));
    expect(settled.map((r) => r.status)).toEqual(['approved', 'approved', 'rejected']);
    expect(settled[0]).toBe(fund[0]);
    expect(filterFundRequests(settled, { ...EMPTY_PAYMENT_FILTERS, status: 'pending' })).toHaveLength(0);
  });

  test('reads the status out of an "already processed" reply', () => {
    expect(alreadyStatusOf('Fund request is already approved')).toBe('approved');
    expect(alreadyStatusOf('Fund request is already rejected')).toBe('rejected');
    expect(alreadyStatusOf('Fund request not found')).toBeNull();
  });
});
