import { describe, expect, test } from 'vitest';

import { itemsOnDay, monthCells, monthRange, toCalendarItems } from '../src/admin/pages/exam_calendar/exam-calendar-model';

// TTII 2026-10-12 — the calendar's dates are local days. The test process may
// run in UTC or IST; local parts make the answer the same in both.

describe('month helpers', () => {
  test('October 2026 runs to the 31st (the global calendar stopped at the 30th)', () => {
    expect(monthRange(2026, 9)).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthRange(2026, 1)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  test('the grid pads to whole weeks, Sunday first', () => {
    const cells = monthCells(2026, 9); // 1 Oct 2026 is a Thursday
    expect(cells.slice(0, 5)).toEqual([null, null, null, null, '2026-10-01']);
    expect(cells.length % 7).toBe(0);
    expect(cells.filter(Boolean)).toHaveLength(31);
  });
});

describe('itemsOnDay', () => {
  const items = toCalendarItems([
    { key: 'a', kind: 'sitting', examId: 1, title: 'Window exam', fromDate: '2026-09-28', toDate: '2026-10-02', status: 'completed' },
    { key: 'b', kind: 'reexam', examId: 22, title: 'Diploma', subject: 'Child Psychology', fromDate: '2026-10-20', toDate: '2026-10-20', status: 'upcoming', students: 4 },
    { key: 'c', kind: 'bogus', examId: 3, title: 'No date', fromDate: '', toDate: '' },
  ]);

  test('a window spanning a month boundary shows on every day it covers', () => {
    expect(itemsOnDay(items, '2026-10-01').map((i) => i.key)).toEqual(['a']);
    expect(itemsOnDay(items, '2026-09-28').map((i) => i.key)).toEqual(['a']);
    expect(itemsOnDay(items, '2026-10-03')).toEqual([]);
  });

  test('re-exams keep their kind; undated items never show; unknown kinds read as sittings', () => {
    expect(itemsOnDay(items, '2026-10-20')[0]).toMatchObject({ kind: 'reexam', students: 4 });
    expect(items[2]?.kind).toBe('sitting');
    expect(itemsOnDay(items, '').length).toBe(0);
  });
});
