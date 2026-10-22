import { describe, expect, test } from 'vitest';

import { validJoinUrl } from '../../src/operations/live-class-join-url.js';
import { OperationsService } from '../../src/operations/operations-service.js';
import { memoryPrisma } from './support/memory-prisma.js';

// Security review 2026-10-22: addLiveClasses must not be steerable to another
// centre's cohort, and a typed meeting link must be a real http(s) URL.

function seed() {
  return {
    users: [
      { id: 700, role_id: 7, centre_id: '1', deleted_at: null },
      { id: 702, role_id: 7, centre_id: '', deleted_at: null },
      { id: 1, role_id: 1, deleted_at: null },
    ],
    cohorts: [
      { id: 75, title: 'Mine', course_id: 16, instructor_id: 30, centre_id: 1, deleted_at: null },
      { id: 76, title: 'Other centre', course_id: 18, instructor_id: 30, centre_id: 28, deleted_at: null },
    ],
    live_class: [],
  };
}

const entry = { sessionId: '1', title: 'Live', date: '2026-11-02', fromTime: '14:00', toTime: '15:00', isRepetitive: 0, repeatDates: [] as string[] };
const input = (over: Record<string, unknown> = {}) => ({
  cohortId: '75', zoomId: '', password: '', platform: 'manual', manualJoinUrl: 'https://meet.google.com/abc', entries: [entry], ...over,
}) as never;

describe('validJoinUrl', () => {
  test('accepts http(s) only, trims, caps length', () => {
    expect(validJoinUrl('  https://zoom.us/j/1 ')).toBe('https://zoom.us/j/1');
    expect(validJoinUrl('http://example.com/x')).toBe('http://example.com/x');
    for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'ftp://x.com', 'meet.google.com/abc', '', '   ', null, 42]) {
      expect(validJoinUrl(bad)).toBeNull();
    }
    expect(validJoinUrl(`https://x.com/${'a'.repeat(1000)}`)).toBeNull();
  });
});

describe('addLiveClasses security', () => {
  test('a centre login with no centre cannot target any cohort', async () => {
    const db = memoryPrisma(seed());
    const res = await new OperationsService(db.prisma).addLiveClasses('centre', '702', input());
    expect(res).toMatchObject({ success: false, message: 'Centre is not assigned for current user.' });
    expect(await db.prisma.live_class.findMany({})).toHaveLength(0);
  });

  test('a centre cannot add to another centre\'s cohort', async () => {
    const db = memoryPrisma(seed());
    const res = await new OperationsService(db.prisma).addLiveClasses('centre', '700', input({ cohortId: '76' }));
    expect(res).toMatchObject({ success: false });
    expect(await db.prisma.live_class.findMany({})).toHaveLength(0);
  });

  test.each(['centre', 'admin'] as const)('%s: refuses a manual link that is not http(s)', async (scope) => {
    const db = memoryPrisma(seed());
    const actor = scope === 'centre' ? '700' : '1';
    for (const manualJoinUrl of ['javascript:alert(1)', 'data:text/html,x', 'meet.google.com/abc', `https://x.com/${'a'.repeat(1000)}`]) {
      const res = await new OperationsService(db.prisma).addLiveClasses(scope, actor, input({ manualJoinUrl }));
      expect(res).toMatchObject({ success: false, message: expect.stringContaining('valid meeting link') });
    }
    expect(await db.prisma.live_class.findMany({})).toHaveLength(0);
  });

  test('a valid https link is stored trimmed', async () => {
    const db = memoryPrisma(seed());
    const res = await new OperationsService(db.prisma).addLiveClasses('centre', '700', input({ manualJoinUrl: ' https://meet.google.com/abc ' }));
    expect(res).toMatchObject({ success: true });
    const rows = (await db.prisma.live_class.findMany({})) as Array<{ join_url: string }>;
    expect(rows.map((r) => r.join_url)).toEqual(['https://meet.google.com/abc']);
  });
});
