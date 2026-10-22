import { describe, expect, it } from 'vitest';
import {
  filterCollections, fundRequestError, moneyOf, paidPct, parseWalletTab, paymentHistory, proofFileError, statusCounts,
  toCollectionDetail, toCollectionsView, toWalletLedgerView, EMPTY_COLLECTION_FILTERS, type CollectionRow,
} from '../src/centre/pages/wallet/wallet-model';

const row = (over: Partial<CollectionRow>): CollectionRow => ({
  key: 'app-1', applicationId: 'A1', studentName: 'Asha', studentCode: '', course: 'Montessori', fee: 10000, paid: 4000, balance: 6000,
  overdue: 0, status: 'partial', nextDueYmd: '2026-10-30', source: 'application', date: '', ...over,
});

describe('moneyOf', () => {
  it('strips commas, spaces and the rupee sign', () => {
    expect(moneyOf('3,201')).toBe(3201);
    expect(moneyOf('₹ 1,000.50')).toBe(1000.5);
    expect(moneyOf('Rs. 2,500')).toBe(2500);
    expect(moneyOf(250)).toBe(250);
  });
  it('is 0 for blanks and junk', () => {
    expect(moneyOf('')).toBe(0);
    expect(moneyOf('abc')).toBe(0);
    expect(moneyOf(null)).toBe(0);
    expect(moneyOf(Number.NaN)).toBe(0);
  });
});

describe('parseWalletTab', () => {
  it('accepts the design short names and falls back to overview', () => {
    expect(parseWalletTab('funds')).toBe('fund-requests');
    expect(parseWalletTab('payments')).toBe('collections');
    expect(parseWalletTab('collections')).toBe('collections');
    expect(parseWalletTab('nonsense')).toBe('overview');
    expect(parseWalletTab(null)).toBe('overview');
  });
});

describe('fundRequestError', () => {
  const ok = { amount: '25,000', reference: 'UTR123', description: '' };
  it('accepts a valid form', () => expect(fundRequestError(ok)).toBeNull());
  it('requires an amount, a positive one, and a reference', () => {
    expect(fundRequestError({ ...ok, amount: '' })).toMatch(/amount/i);
    expect(fundRequestError({ ...ok, amount: '0' })).toMatch(/valid amount/i);
    expect(fundRequestError({ ...ok, amount: '12abc' })).toMatch(/valid amount/i);
    expect(fundRequestError({ ...ok, amount: '-5' })).toMatch(/valid amount/i);
    expect(fundRequestError({ ...ok, reference: '  ' })).toMatch(/reference/i);
  });
  it('refuses an absurd amount', () => expect(fundRequestError({ ...ok, amount: '99999999999' })).toMatch(/too large/i));
});

describe('proofFileError', () => {
  it('allows images and pdf, refuses others and oversize', () => {
    expect(proofFileError(null)).toBeNull();
    expect(proofFileError({ name: 'a.PDF', size: 10 })).toBeNull();
    expect(proofFileError({ name: 'a.exe', size: 10 })).toMatch(/image/i);
    expect(proofFileError({ name: 'a.png', size: 21 * 1024 * 1024 })).toMatch(/20 MB/);
  });
});

describe('toWalletLedgerView', () => {
  it('keeps the running balance only where the server sent one and the reconcile flag', () => {
    const v = toWalletLedgerView({
      balance: '5,000', totalCredits: 6000, totalDebits: 1000, net: 5000, reconciled: false,
      entries: [{ id: 1, type: 'credit', amount: '6,000', ymd: '2026-10-01' }, { id: '', type: 'debit', amount: 1 }],
      fundRequests: [{ id: 3, status: 'PENDING', amount: '2,000', attachment: 'javascript:alert(1)' }],
      pendingTopUps: { count: 1, amount: 2000 },
    });
    expect(v.balance).toBe(5000);
    expect(v.reconciled).toBe(false);
    expect(v.entries).toHaveLength(1);
    expect(v.entries[0]?.balance).toBeNull();
    expect(v.entries[0]?.txnNo).toBe('WTX-1');
    expect(v.fundRequests[0]?.status).toBe('pending');
    expect(v.fundRequests[0]?.attachment).toBe('');
    expect(v.pendingTopUps).toEqual({ count: 1, amount: 2000 });
  });
});

describe('collections', () => {
  const rows = [
    row({ key: 'a', studentName: 'Asha Nair', status: 'overdue', overdue: 1000, nextDueYmd: '2026-10-20' }),
    row({ key: 'b', studentName: 'Bina', status: 'paid', course: 'Early Years', nextDueYmd: '' }),
    row({ key: 'c', studentName: 'Cara', status: 'pending', nextDueYmd: '2026-10-28' }),
  ];
  it('filters by status, course, search and due window (IST today passed in)', () => {
    const f = (patch: object) => filterCollections(rows, { ...EMPTY_COLLECTION_FILTERS, ...patch }, '2026-10-22').map((r) => r.key);
    expect(f({ status: 'paid' })).toEqual(['b']);
    expect(f({ course: 'Early Years' })).toEqual(['b']);
    expect(f({ search: 'asha nair' })).toEqual(['a']);
    expect(f({ due: 'overdue' })).toEqual(['a']);
    expect(f({ due: 'next7' })).toEqual(['c']);
    expect(f({ due: 'next30' })).toEqual(['c']);
  });
  it('counts statuses', () => expect(statusCounts(rows)).toMatchObject({ all: 3, overdue: 1, paid: 1, pending: 1, partial: 0 }));
  it('parses totals with comma strings', () => {
    const v = toCollectionsView({ rows: [{ key: 'x', fee: '10,000', paid: '2,500', balance: '7,500' }], totals: { fee: '10,000', received: 2500, pending: 7500, overdue: 0, overdueRows: 0 } });
    expect(v.rows[0]).toMatchObject({ fee: 10000, paid: 2500, balance: 7500, status: 'pending', source: 'enrolment' });
    expect(v.totals.received).toBe(2500);
  });
  it('paidPct never shows 100 for a part-paid fee and handles zero fee', () => {
    expect(paidPct(10000, 9999)).toBe(99);
    expect(paidPct(10000, 10000)).toBe(100);
    expect(paidPct(0, 0)).toBe(0);
    expect(paidPct(10000, -5)).toBe(0);
  });
});

describe('collection detail', () => {
  it('orders payment history newest first, undated last, and drops unsafe receipt links', () => {
    const d = toCollectionDetail({
      row: { key: 'app-1' },
      instalments: [
        { id: 1, status: 'paid', paidYmd: '2026-08-01', amount: 100, receiptUrl: 'https://x/r.pdf' },
        { id: 2, status: 'paid', paidYmd: '', amount: 100 },
        { id: 3, status: 'paid', paidYmd: '2026-09-01', amount: 100, receiptUrl: 'data:text/html,x' },
        { id: 4, status: 'overdue', amount: 100 },
      ],
    });
    const h = paymentHistory(d.instalments);
    expect(h.map((i) => i.id)).toEqual(['3', '1', '2']);
    expect(h[0]?.receiptUrl).toBe('');
    expect(h[1]?.receiptUrl).toBe('https://x/r.pdf');
  });
});
