import { isNavGroup, type AdminNavEntry } from '../routing/admin-nav-tree.js';

// Navbar global search (Naji's admin shell). Pages are matched here against the
// real sidebar menu; students and courses come from /admin/search/global.

export const SEARCH_MAX_LENGTH = 80;
/** The server ignores anything shorter, so the client does not ask. */
export const REMOTE_SEARCH_MIN_LENGTH = 2;
export const PAGE_HIT_LIMIT = 5;

export type SearchGroup = 'Pages' | 'Students' | 'Courses';
export const SEARCH_GROUPS: readonly SearchGroup[] = ['Pages', 'Students', 'Courses'];

export interface SearchHit {
  key: string;
  group: SearchGroup;
  label: string;
  sub: string;
  href: string;
}

/** Every navigable menu entry as a Pages hit; a group's children carry the group as their sub-label. */
export function flattenNavPages(tree: readonly AdminNavEntry[]): SearchHit[] {
  return tree.flatMap((entry): SearchHit[] =>
    isNavGroup(entry)
      ? entry.children.map((child) => ({
          key: `p-${entry.id}-${child.id}`,
          group: 'Pages',
          label: child.label,
          sub: entry.label,
          href: child.href,
        }))
      : [{ key: `p-${entry.id}`, group: 'Pages', label: entry.label, sub: 'Page', href: entry.href }],
  );
}

function rank(hit: SearchHit, q: string): number {
  const label = hit.label.toLowerCase();
  if (label.startsWith(q)) return 0;
  if (label.includes(q)) return 1;
  if (hit.sub.toLowerCase().includes(q)) return 2;
  return -1;
}

/** Pages whose label (best) or section matches, label-prefix matches first, menu order kept within a rank. */
export function searchNavPages(tree: readonly AdminNavEntry[], raw: string, limit = PAGE_HIT_LIMIT): SearchHit[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  return flattenNavPages(tree)
    .map((hit, index) => ({ hit, index, score: rank(hit, q) }))
    .filter((r) => r.score >= 0)
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, limit)
    .map((r) => r.hit);
}

export interface RemoteSearchResult {
  students: Array<{ id: string; name: string; studentId: string; contact: string; course: string }>;
  courses: Array<{ id: string; title: string; code: string }>;
}

/** Server rows as hits that open the student / course view page. */
export function remoteHits(result: RemoteSearchResult): SearchHit[] {
  const students = result.students
    .filter((s) => s.id)
    .map((s): SearchHit => ({
      key: `s-${s.id}`,
      group: 'Students',
      label: s.name,
      sub: [s.studentId, s.course || s.contact].filter(Boolean).join(' · '),
      href: `/admin/students/view/${encodeURIComponent(s.id)}`,
    }));
  const courses = result.courses
    .filter((c) => c.id)
    .map((c): SearchHit => ({
      key: `c-${c.id}`,
      group: 'Courses',
      label: c.title,
      sub: c.code ? `Course · ${c.code}` : 'Course',
      href: `/admin/course/view/${encodeURIComponent(c.id)}`,
    }));
  return [...students, ...courses];
}

/** Arrow-key highlight that stays inside the list (no wrap, as in his design). */
export function moveHighlight(current: number, delta: 1 | -1, count: number): number {
  if (count <= 0) return 0;
  return Math.min(Math.max(current + delta, 0), count - 1);
}
