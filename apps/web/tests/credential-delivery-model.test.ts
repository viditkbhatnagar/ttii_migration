import { describe, expect, it } from 'vitest';

import {
  ITEM_TABS, dmyAny, dmyDash, dmyDashTime, itemStatusTone, monthName, scanStatusTone, trendText,
} from '../src/admin/pages/credentials/credential-delivery-model';

describe('credential display helpers', () => {
  it('shows dates as DD-MM-YYYY without shifting the day', () => {
    expect(dmyDash('2026-11-03')).toBe('03-11-2026');
    expect(dmyDash('')).toBe('');
    expect(dmyAny('2026-11-03')).toBe('03-11-2026');
  });
  it('shows a stored instant as India time', () => {
    expect(dmyDashTime('2026-11-03T20:00:00Z')).toBe('04-11-2026, 1:30 AM');
    expect(dmyAny('2026-11-03T08:00:00.000Z')).toBe('03-11-2026, 1:30 PM');
    expect(dmyDashTime(null)).toBe('');
  });
  it('formats month keys and trends', () => {
    expect(monthName('2026-07')).toBe('Jul 2026');
    expect(trendText(12)).toBe('+12%');
    expect(trendText(-20)).toBe('-20%');
    expect(trendText(0)).toBe('0%');
  });
  it('colours parcel and scan states semantically', () => {
    expect(itemStatusTone('delivered')).toBe('emerald');
    expect(itemStatusTone('lost')).toBe('rose');
    expect(itemStatusTone('in_transit')).toBe('blue');
    expect(scanStatusTone('revoked')).toBe('rose');
    expect(scanStatusTone('valid')).toBe('emerald');
  });
  it('splits the item statuses across the four tabs exactly once', () => {
    const all = Object.values(ITEM_TABS).flat();
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(11);
  });
});
