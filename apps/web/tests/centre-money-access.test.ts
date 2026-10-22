import { describe, expect, test } from 'vitest';

import { canSeeMoney } from '../src/centre/pages/shared-money-access';
import { parseStudentBoard, studentsCsv } from '../src/centre/pages/students/centre-students-model';

// Associates (role 10) share the centre pages; the API omits their money fields
// and the pages and the CSV export must not show empty money columns.

describe('centre money access', () => {
  test('only the centre owner sees money', () => {
    expect(canSeeMoney(7)).toBe(true);
    expect(canSeeMoney(10)).toBe(false);
  });

  test('students CSV drops the fee columns when money is hidden', () => {
    const rows = parseStudentBoard({ rows: [{ id: 1, studentCode: 'TTS1', name: 'A', status: 'Active' }] });
    const withMoney = studentsCsv(rows).split('\n')[0] ?? '';
    const hidden = studentsCsv(rows, false).split('\n')[0] ?? '';
    expect(withMoney).toContain('Fee,Paid,Balance,Fee Status');
    expect(hidden).not.toMatch(/Fee|Paid|Balance/);
    expect((studentsCsv(rows, false).split('\n')[1] ?? '').split(',')).toHaveLength(hidden.split(',').length);
  });
});
