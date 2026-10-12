import { describe, expect, it } from 'vitest';

import { NAV_ICON_NAMES } from '../src/admin/layout/AdminSidebar';
import { ADMIN_NAV_TREE, findActiveNavIds, isNavGroup } from '../src/admin/routing/admin-nav-tree';
import { resolveAdminRoute } from '../src/admin/routing/admin-routes';

// Naji's sidebar order (AdminSidebar.tsx in his prototype), 2026-10-12.

const topIds = () => ADMIN_NAV_TREE.map((e) => e.id);
const group = (id: string) => {
  const entry = ADMIN_NAV_TREE.find((e) => e.id === id);
  if (!entry || !isNavGroup(entry)) throw new Error(`no group ${id}`);
  return entry;
};

describe('admin nav tree', () => {
  it('replaces Users / Counsellors / Associates with the three management groups', () => {
    expect(topIds()).not.toContain('users-admin');
    expect(topIds()).not.toContain('counsellors');
    expect(topIds()).not.toContain('associates');
    const ids = topIds();
    // Counsellor + Associate Management right after Instructors; Administration right above Settings.
    expect(ids.slice(ids.indexOf('instructors'), ids.indexOf('instructors') + 3)).toEqual(['instructors', 'counsellor-management', 'associate-management']);
    expect(ids.slice(-2)).toEqual(['administration', 'settings']);
  });

  it('has Naji\'s labels, order and hrefs inside each new group', () => {
    const pick = (id: string) => group(id).children.map((c) => [c.label, c.href]);
    expect(group('administration').label).toBe('Administration');
    expect(pick('administration')).toEqual([
      ['User Management', '/admin/sub_admin/index'],
      ['Roles & Permissions', '/admin/roles/index'],
      ['Audit Logs', '/admin/audit_logs/index'],
    ]);
    expect(group('counsellor-management').label).toBe('Counsellor Management');
    expect(pick('counsellor-management')).toEqual([
      ['Counsellors', '/admin/counsellor/index'],
      ['Teams', '/admin/teams/index'],
      ['Groups', '/admin/groups/index'],
      ['Targets', '/admin/counsellor_target/index'],
    ]);
    expect(group('associate-management').label).toBe('Associate Management');
    expect(pick('associate-management')).toEqual([
      ['Dashboard', '/admin/associates/dashboard'],
      ['Associates', '/admin/associates/index'],
      ['Onboarding', '/admin/associates/onboarding'],
      ['Associate Students', '/admin/associates/students'],
      ['Commissions', '/admin/associates/commissions'],
      ['Communications', '/admin/associates/communications'],
    ]);
  });

  it('every page entry id is unique across the whole tree (highlighting is by item id)', () => {
    // Group ids live in their own namespace (expand state), so only page ids are compared.
    const ids = ADMIN_NAV_TREE.flatMap((e) => (isNavGroup(e) ? e.children.map((c) => c.id) : [e.id]));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every icon is one the sidebar can draw', () => {
    for (const entry of ADMIN_NAV_TREE) expect(NAV_ICON_NAMES).toContain(entry.icon);
    expect(group('administration').icon).toBe('ShieldCheck');
    expect(group('counsellor-management').icon).toBe('Headphones');
    expect(group('associate-management').icon).toBe('Handshake');
  });

  it('the Audit Logs page is routed', () => {
    expect(resolveAdminRoute('/admin/audit_logs/index')?.title).toBe('Audit Logs');
    expect(resolveAdminRoute('/admin/sub_admin/index')?.title).toBe('User Management');
  });
});

describe('findActiveNavIds', () => {
  it('matches a menu page exactly', () => {
    expect(findActiveNavIds('/admin/audit_logs/index')).toEqual({ groupId: 'administration', itemId: 'audit-logs' });
    expect(findActiveNavIds('/admin/associates/dashboard/')).toEqual({ groupId: 'associate-management', itemId: 'associates-dashboard' });
    expect(findActiveNavIds('/admin/dashboard/index')).toEqual({ groupId: null, itemId: 'dashboard' });
  });

  it('keeps a detail page highlighted under its section index', () => {
    expect(findActiveNavIds('/admin/roles/manage/8')).toEqual({ groupId: 'administration', itemId: 'roles-permissions' });
    expect(findActiveNavIds('/admin/associates/view/12')).toEqual({ groupId: 'associate-management', itemId: 'associates-directory' });
    expect(findActiveNavIds('/admin/counsellor/view/4')).toEqual({ groupId: 'counsellor-management', itemId: 'counsellors-directory' });
    expect(findActiveNavIds('/admin/teams/view/2')).toEqual({ groupId: 'counsellor-management', itemId: 'counsellor-teams' });
  });

  it('a sibling page with its own entry wins over the section fallback', () => {
    expect(findActiveNavIds('/admin/associates/onboarding')).toEqual({ groupId: 'associate-management', itemId: 'associates-onboarding' });
    expect(findActiveNavIds('/admin/cohorts/add')).toMatchObject({ itemId: 'add-cohorts' });
  });

  it('highlights nothing for pages outside every section', () => {
    expect(findActiveNavIds('/admin/unknown/thing')).toEqual({ groupId: null, itemId: null });
  });
});
