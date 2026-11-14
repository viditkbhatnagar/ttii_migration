import { describe, expect, test } from 'vitest';

import {
  batchSequence, batchStatusAfterUpdate, daysLate, formatBatchNo, isCredentialStorageKey, isGoodTrend, isOverdue, isReadyLate,
  lastMonthKeys, nextStatuses, trackingLink, trendPercent, validDayCount, validateAcknowledge, validateBatchCreate, validateDispatch,
  validateItemUpdate, ITEM_STATUS_LABEL, TRANSITIONS, type BatchItemFacts,
} from '../../src/operations/credential-delivery-model.js';
import { ITEM_STATUSES } from '../../src/operations/credential-types.js';

describe('item status transitions (spec 5.4)', () => {
  test('the table matches the spec for every status', () => {
    expect(TRANSITIONS.print_queued).toEqual([]);
    expect(TRANSITIONS.printed).toEqual([]);
    expect(TRANSITIONS.packed).toEqual([]);
    expect(TRANSITIONS.dispatched).toEqual(['in_transit', 'delivered', 'collected', 'returned', 'address_issue', 'lost']);
    expect(TRANSITIONS.in_transit).toEqual(['delivered', 'returned', 'address_issue', 'lost']);
    expect(TRANSITIONS.delivered).toEqual(['handed_over']);
    expect(TRANSITIONS.collected).toEqual([]);
    expect(TRANSITIONS.handed_over).toEqual([]);
    expect(TRANSITIONS.returned).toEqual(['in_transit', 'lost']);
    expect(TRANSITIONS.address_issue).toEqual(['in_transit', 'returned', 'lost']);
    expect(TRANSITIONS.lost).toEqual([]);
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...ITEM_STATUSES].sort());
  });

  test('batch type filters: Collected only for office collection, Handed over only to centre', () => {
    expect(nextStatuses('dispatched', 'to_learner')).not.toContain('collected');
    expect(nextStatuses('dispatched', 'to_centre')).not.toContain('collected');
    expect(nextStatuses('dispatched', 'office_collection')).toEqual(['collected', 'returned', 'address_issue', 'lost']);
    expect(nextStatuses('delivered', 'to_centre')).toEqual(['handed_over']);
    expect(nextStatuses('delivered', 'to_learner')).toEqual([]);
    expect(nextStatuses('delivered', 'office_collection')).toEqual([]);
    expect(nextStatuses('dispatched', null)).toEqual([]);
  });

  test('invalid moves are rejected', () => {
    const base = { batchType: 'to_learner' as const, receiverName: '', proofKey: null, remarks: '' };
    expect(validateItemUpdate({ ...base, from: 'printed', to: 'delivered' })).toMatch(/cannot move/);
    expect(validateItemUpdate({ ...base, from: 'lost', to: 'in_transit' })).toMatch(/cannot move/);
    expect(validateItemUpdate({ ...base, from: 'delivered', to: 'dispatched' })).toMatch(/cannot move/);
    expect(validateItemUpdate({ ...base, from: 'dispatched', to: 'in_transit' })).toBeNull();
  });

  test('receiver + proof for Collected / Handed over; remarks for Returned / Address issue / Lost', () => {
    const office = { from: 'dispatched' as const, to: 'collected' as const, batchType: 'office_collection' as const, remarks: '' };
    expect(validateItemUpdate({ ...office, receiverName: '', proofKey: 'k' })).toMatch(/Receiver/);
    expect(validateItemUpdate({ ...office, receiverName: 'A', proofKey: null })).toMatch(/ID photo/);
    expect(validateItemUpdate({ ...office, receiverName: 'A', proofKey: 'k' })).toBeNull();
    const lost = { from: 'in_transit' as const, to: 'lost' as const, batchType: 'to_learner' as const, receiverName: '', proofKey: null };
    expect(validateItemUpdate({ ...lost, remarks: '  ' })).toMatch(/remarks/i);
    expect(validateItemUpdate({ ...lost, remarks: 'Courier lost it' })).toBeNull();
  });

  test('every status has a label', () => {
    for (const s of ITEM_STATUSES) expect(ITEM_STATUS_LABEL[s]).toBeTruthy();
  });
});

describe('overdue and late days', () => {
  const dispatched = new Date('2026-11-01T00:00:00Z');
  test('more than the limit is overdue; exactly 10 days is not', () => {
    expect(isOverdue(dispatched, 'in_transit', new Date('2026-11-11T00:00:00Z'), 10)).toBe(false);
    expect(isOverdue(dispatched, 'in_transit', new Date('2026-11-12T00:00:00Z'), 10)).toBe(true);
    expect(isOverdue(dispatched, 'in_transit', new Date('2026-11-12T00:00:00Z'), 15)).toBe(false);
  });
  test('finished or undispatched parcels are never overdue', () => {
    const late = new Date('2026-12-30T00:00:00Z');
    for (const s of ['delivered', 'collected', 'handed_over', 'returned', 'lost'] as const) expect(isOverdue(dispatched, s, late, 10)).toBe(false);
    expect(isOverdue(null, 'dispatched', late, 10)).toBe(false);
    expect(isOverdue(dispatched, 'address_issue', late, 10)).toBe(true);
  });
  test('days late beyond the setting', () => {
    expect(daysLate(new Date('2026-11-01T00:00:00Z'), new Date('2026-11-15T00:00:00Z'), 10)).toBe(4);
    expect(daysLate(new Date('2026-11-10T00:00:00Z'), new Date('2026-11-15T00:00:00Z'), 10)).toBe(0);
  });
  test('day-count settings are whole numbers 1-365', () => {
    expect(validDayCount(0)).toBe(false);
    expect(validDayCount(1.5)).toBe(false);
    expect(validDayCount(366)).toBe(false);
    expect(validDayCount(10)).toBe(true);
  });
});

describe('tracking links', () => {
  test('https only, AWB escaped, {AWB} any case', () => {
    expect(trackingLink('https://example.com/{awb}', 'A /1')).toBe('https://example.com/A%20%2F1');
    expect(trackingLink('https://example.com/{AWB}', 'A /1')).toBe('https://example.com/A%20%2F1');
    expect(trackingLink('javascript:{awb}', '1')).toBeUndefined();
    expect(trackingLink('http://example.com/{awb}', '1')).toBeUndefined();
    expect(trackingLink('https://user:pw@example.com/{awb}', '1')).toBeUndefined();
    expect(trackingLink('https://example.com/track', '1')).toBeUndefined();
    expect(trackingLink('https://example.com/{awb}', '')).toBeUndefined();
  });
});

describe('dispatch batch rules (spec 5.3)', () => {
  const item = (over: Partial<BatchItemFacts> = {}): BatchItemFacts => ({ id: 1, status: 'printed', batchId: null, documentValid: true, centreId: 5, userId: 9, ...over });
  const input = { type: 'to_centre', centreId: 5, address: 'Kochi', awbNo: 'A1', courierActive: true };

  test('valid batches pass; only printed, unbatched, valid documents', () => {
    expect(validateBatchCreate([item()], input)).toBeNull();
    expect(validateBatchCreate([], input)).toMatch(/at least one/);
    expect(validateBatchCreate([item({ status: 'print_queued' })], input)).toMatch(/Printed/);
    expect(validateBatchCreate([item({ batchId: 3 })], input)).toMatch(/Printed/);
    expect(validateBatchCreate([item({ documentValid: false })], input)).toMatch(/valid/);
  });
  test('To centre: one centre, required', () => {
    expect(validateBatchCreate([item()], { ...input, centreId: null })).toMatch(/centre/i);
    expect(validateBatchCreate([item(), item({ id: 2, centreId: 6 })], input)).toMatch(/selected centre/);
  });
  test('To learner: one learner only', () => {
    const learner = { ...input, type: 'to_learner', centreId: null };
    expect(validateBatchCreate([item(), item({ id: 2 })], learner)).toBeNull();
    expect(validateBatchCreate([item(), item({ id: 2, userId: 10 })], learner)).toMatch(/one learner/);
  });
  test('non-office needs address, AWB and an active courier; office collection needs none', () => {
    expect(validateBatchCreate([item()], { ...input, address: ' ' })).toMatch(/Address, active courier and AWB/);
    expect(validateBatchCreate([item()], { ...input, awbNo: '' })).toMatch(/AWB/);
    expect(validateBatchCreate([item()], { ...input, courierActive: false })).toMatch(/courier/);
    expect(validateBatchCreate([item()], { type: 'office_collection', centreId: null, address: '', awbNo: '', courierActive: false })).toBeNull();
    expect(validateBatchCreate([item()], { ...input, type: 'bogus' })).toMatch(/type/);
  });
  test('Mark Dispatched needs a packed batch, a packing list, packed items and valid documents', () => {
    const ok = { status: 'packed' as const, hasPackingList: true, items: [{ status: 'packed' as const, documentValid: true }] };
    expect(validateDispatch(ok)).toBeNull();
    expect(validateDispatch({ ...ok, hasPackingList: false })).toMatch(/packing list/);
    expect(validateDispatch({ ...ok, status: 'dispatched' })).toMatch(/packed batch/);
    expect(validateDispatch({ ...ok, items: [{ status: 'printed', documentValid: true }] })).toMatch(/packed/);
    expect(validateDispatch({ ...ok, items: [{ status: 'packed', documentValid: false }] })).toMatch(/no longer valid/);
  });
  test('batch status after an update', () => {
    expect(batchStatusAfterUpdate(['delivered', 'handed_over'])).toBe('delivered');
    expect(batchStatusAfterUpdate(['delivered', 'in_transit'])).toBe('in_progress');
    expect(batchStatusAfterUpdate(['delivered', 'lost'])).toBe('in_progress');
  });
  test('batch numbers', () => {
    expect(formatBatchNo(1)).toBe('TTII/DISPATCH/0001');
    expect(formatBatchNo(12345)).toBe('TTII/DISPATCH/12345');
    expect(batchSequence('TTII/DISPATCH/0042')).toBe(42);
    expect(batchSequence('nope')).toBe(0);
  });
});

describe('centre acknowledgement', () => {
  const facts = { batchType: 'to_centre', batchCentreId: 5, callerCentreId: 5, acknowledgedAt: null, dispatchedAt: new Date(), receiverName: 'R', itemStatuses: ['dispatched' as const] };
  test('only the centre\'s own dispatched, un-acknowledged to-centre parcel', () => {
    expect(validateAcknowledge(facts)).toBeNull();
    expect(validateAcknowledge({ ...facts, callerCentreId: 6 })).toMatch(/your centre/);
    expect(validateAcknowledge({ ...facts, callerCentreId: null })).toMatch(/your centre/);
    expect(validateAcknowledge({ ...facts, batchType: 'to_learner' })).toMatch(/centre/);
    expect(validateAcknowledge({ ...facts, receiverName: ' ' })).toMatch(/Receiver/);
    expect(validateAcknowledge({ ...facts, acknowledgedAt: new Date() })).toMatch(/already/);
    expect(validateAcknowledge({ ...facts, dispatchedAt: null })).toMatch(/not been dispatched/);
    expect(validateAcknowledge({ ...facts, itemStatuses: ['packed'] })).toMatch(/received/);
  });
});

describe('storage keys', () => {
  test('proof keys stay inside the credentials folder', () => {
    expect(isCredentialStorageKey('credentials/delivery-proof/abc.pdf', 'delivery-proof')).toBe(true);
    expect(isCredentialStorageKey('credentials/delivery-proof/../x', 'delivery-proof')).toBe(false);
    expect(isCredentialStorageKey('uploads/abc.pdf', 'delivery-proof')).toBe(false);
  });
});

describe('dashboard metrics', () => {
  test('trend vs last month', () => {
    expect(trendPercent(112, 100)).toBe(12);
    expect(trendPercent(80, 100)).toBe(-20);
    expect(trendPercent(0, 0)).toBe(0);
    expect(trendPercent(5, 0)).toBe(100);
  });
  test('a trend is good when flat or when its direction matches', () => {
    expect(isGoodTrend(0, true)).toBe(true);
    expect(isGoodTrend(10, true)).toBe(true);
    expect(isGoodTrend(10, false)).toBe(false);
    expect(isGoodTrend(-10, false)).toBe(true);
  });
  test('ready waiting turns late only after reminder days', () => {
    expect(isReadyLate(3, 3)).toBe(false);
    expect(isReadyLate(4, 3)).toBe(true);
  });
  test('last 12 month keys end with the current IST month', () => {
    const keys = lastMonthKeys(new Date('2026-11-14T10:00:00Z'), 12);
    expect(keys).toHaveLength(12);
    expect(keys[0]).toBe('2025-12');
    expect(keys[11]).toBe('2026-11');
    // 20:00 UTC on the 30th is already December in IST.
    expect(lastMonthKeys(new Date('2026-11-30T20:00:00Z'), 1)).toEqual(['2026-12']);
  });
});
