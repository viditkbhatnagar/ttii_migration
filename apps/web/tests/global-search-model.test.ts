import { describe, expect, it } from 'vitest';

import { ADMIN_NAV_TREE, type AdminNavEntry } from '../src/admin/routing/admin-nav-tree';
import { flattenNavPages, moveHighlight, remoteHits, searchNavPages } from '../src/admin/layout/global-search-model';

const TREE: AdminNavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/admin/dashboard/index', icon: 'LayoutDashboard' },
  {
    id: 'exam',
    label: 'Exam',
    icon: 'FileText',
    children: [
      { id: 'exams', label: 'Exams', href: '/admin/exam/index' },
      { id: 'exam-calendar', label: 'Exam Calendar', href: '/admin/exam/calendar' },
      { id: 'result', label: 'Result', href: '/admin/Exam_result/index' },
    ],
  },
  {
    id: 'entrance-exam',
    label: 'Entrance Exam',
    icon: 'ClipboardCheck',
    children: [{ id: 'ee-results', label: 'Exam Results', href: '/admin/entrance_exam/results' }],
  },
];

describe('flattenNavPages', () => {
  it('lists every navigable entry, a group child under its group name', () => {
    const pages = flattenNavPages(TREE);
    expect(pages.map((p) => p.label)).toEqual(['Dashboard', 'Exams', 'Exam Calendar', 'Result', 'Exam Results']);
    expect(pages[0]).toMatchObject({ sub: 'Page', href: '/admin/dashboard/index' });
    expect(pages[2]).toMatchObject({ sub: 'Exam', href: '/admin/exam/calendar' });
  });

  it('gives every real menu entry a unique key', () => {
    const keys = flattenNavPages(ADMIN_NAV_TREE).map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('searchNavPages', () => {
  it('finds nothing for a blank query', () => {
    expect(searchNavPages(TREE, '   ')).toEqual([]);
  });

  it('ranks label-prefix matches before contains, then section-only matches', () => {
    const hits = searchNavPages(TREE, 'res', 10);
    // "Result" starts with it; "Exam Results" only contains it.
    expect(hits.map((h) => h.label)).toEqual(['Result', 'Exam Results']);
  });

  it('matches a page by its section name and is case-insensitive', () => {
    const labels = searchNavPages(TREE, 'ENTRANCE', 10).map((h) => h.label);
    expect(labels).toEqual(['Exam Results']);
  });

  it('caps the list', () => {
    expect(searchNavPages(TREE, 'exam', 2)).toHaveLength(2);
  });
});

describe('remoteHits', () => {
  it('opens the student and course view pages', () => {
    const hits = remoteHits({
      students: [{ id: '7', name: 'Ananya', studentId: 'TTS0058', contact: 'a@b.in', course: 'Diploma' }],
      courses: [{ id: '16', title: 'Montessori Diploma', code: '' }],
    });
    expect(hits).toEqual([
      { key: 's-7', group: 'Students', label: 'Ananya', sub: 'TTS0058 · Diploma', href: '/admin/students/view/7' },
      { key: 'c-16', group: 'Courses', label: 'Montessori Diploma', sub: 'Course', href: '/admin/course/view/16' },
    ]);
  });

  it('drops rows without an id', () => {
    expect(remoteHits({ students: [{ id: '', name: 'x', studentId: '', contact: '', course: '' }], courses: [] })).toEqual([]);
  });
});

describe('moveHighlight', () => {
  it('stays inside the list', () => {
    expect(moveHighlight(0, -1, 3)).toBe(0);
    expect(moveHighlight(2, 1, 3)).toBe(2);
    expect(moveHighlight(1, 1, 3)).toBe(2);
    expect(moveHighlight(4, 1, 0)).toBe(0);
  });
});
