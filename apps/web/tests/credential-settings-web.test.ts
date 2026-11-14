import { describe, expect, test } from 'vitest';

import { ADMIN_NAV_TREE, isNavGroup } from '../src/admin/routing/admin-nav-tree';
import {
  ALL_CREDENTIAL_PERMISSIONS, NO_CREDENTIAL_PERMISSIONS, canOpenCredentialPage, filterCredentialNav, toCredentialPermissions,
} from '../src/admin/pages/credentials/credential-permissions';
import {
  buildPayload, emptyForm, formFromRow, numberExample, presetComponents, savesNewVersion, type ConfigRow,
} from '../src/admin/pages/credentials/settings/settings-model';
import { EMPTY_OFFERING_FILTERS, filterOfferings, offeringCsvRows, sortOfferings, toOfferingRows } from '../src/admin/pages/offering/offering-list-model';

// Credential Manager settings (web): menu gating, payload shaping, offering TTII column and filter.

const childIds = (tree: ReturnType<typeof filterCredentialNav>): string[] => {
  const g = tree.find((e) => isNavGroup(e) && e.id === 'credential-manager');
  return g && isNavGroup(g) ? g.children.map((c) => c.id) : [];
};

describe('Credential Manager menu gating', () => {
  test('page rules from the prototype: settings, reports, dashboard (any), others need access', () => {
    const only = (k: keyof typeof NO_CREDENTIAL_PERMISSIONS) => ({ ...NO_CREDENTIAL_PERMISSIONS, [k]: true });
    expect(canOpenCredentialPage('credential-settings', only('settings'))).toBe(true);
    expect(canOpenCredentialPage('credential-settings', only('access'))).toBe(false);
    expect(canOpenCredentialPage('credential-reports', only('reports'))).toBe(true);
    expect(canOpenCredentialPage('credential-dashboard', only('reports'))).toBe(true);
    expect(canOpenCredentialPage('credential-dashboard', only('revoke'))).toBe(false);
    expect(canOpenCredentialPage('credential-ready', only('settings'))).toBe(false);
    expect(canOpenCredentialPage('credential-delivery', only('access'))).toBe(true);
  });

  test('filters only the credential group; Super Admin sees all; unknown permissions hide it', () => {
    expect(childIds(filterCredentialNav(ADMIN_NAV_TREE, 1, null))).toHaveLength(7);
    expect(childIds(filterCredentialNav(ADMIN_NAV_TREE, 8, ALL_CREDENTIAL_PERMISSIONS))).toHaveLength(7);
    expect(childIds(filterCredentialNav(ADMIN_NAV_TREE, 8, null))).toEqual([]);
    expect(childIds(filterCredentialNav(ADMIN_NAV_TREE, 8, NO_CREDENTIAL_PERMISSIONS))).toEqual([]);
    expect(childIds(filterCredentialNav(ADMIN_NAV_TREE, 8, { ...NO_CREDENTIAL_PERMISSIONS, settings: true }))).toEqual(['credential-dashboard', 'credential-settings']);
    const trimmed = filterCredentialNav(ADMIN_NAV_TREE, 8, NO_CREDENTIAL_PERMISSIONS);
    expect(trimmed.length).toBe(ADMIN_NAV_TREE.length - 1);
  });

  test('toCredentialPermissions fails closed on junk', () => {
    expect(toCredentialPermissions({ access: 'yes', settings: true })).toEqual({ ...NO_CREDENTIAL_PERMISSIONS, settings: true });
    expect(toCredentialPermissions(null)).toEqual(NO_CREDENTIAL_PERMISSIONS);
  });
});

describe('settings payloads', () => {
  test('a rule form round-trips through the row shape; an active rule saves a new version', () => {
    const form = { ...emptyForm(), offeringId: '4', effectiveFrom: '2026-11-12', ruleType: 'Assignment + Exam (all subjects)', components: presetComponents('Assignment + Exam (all subjects)') };
    const payload = buildPayload('rule', form, null);
    expect(payload).toMatchObject({ offering_id: 4, effective_from: '2026-11-12' });
    expect((payload.data as { components: unknown[] }).components).toHaveLength(2);
    const row: ConfigRow = { id: 9, name: '', offeringId: 4, version: 2, effectiveFrom: '2026-11-12', active: true, data: payload.data as Record<string, unknown> };
    expect(formFromRow('rule', row)).toMatchObject({ offeringId: '4', ruleType: 'Assignment + Exam (all subjects)' });
    expect(savesNewVersion('rule', row)).toBe(true);
    expect(savesNewVersion('rule', { ...row, active: false })).toBe(false);
    expect(savesNewVersion('template', row)).toBe(false);
    expect(buildPayload('rule', form, 9)).toMatchObject({ id: 9 });
  });

  test('a template picks course OR level, never both; defaults print everything but Photo', () => {
    const f = emptyForm();
    expect(f.fields).not.toContain('Photo');
    expect(f.fields).toHaveLength(13);
    expect(buildPayload('template', { ...f, name: 'T', offeringId: '3', level: 'Diploma' }, null)).toMatchObject({ offering_id: 3, data: { level: null } });
    expect(buildPayload('template', { ...f, name: 'T', level: 'Degree' }, null)).toMatchObject({ offering_id: null, data: { level: 'Degree' } });
  });

  test('number series example and the default grading scheme shape', () => {
    expect(numberExample({ prefix: 'TTII/CERT', year: '2026', padding: '6', nextNumber: '1' })).toBe('TTII/CERT/2026/000001');
    const grading = buildPayload('grading', { ...emptyForm(), name: 'S' }, null);
    expect((grading.data as { bands: Array<{ grade: string }> }).bands.map((b) => b.grade)).toEqual(['O', 'A+', 'A', 'B+', 'B', 'C', 'F']);
  });
});

describe('Course Offerings TTII column and filter', () => {
  const raw = [{ id: '3', title: 'A' }, { id: '4', title: 'B' }, { id: '5', title: 'C' }];
  const rows = toOfferingRows(raw, new Map([['3', true], ['4', false]]));

  test('rows carry the credential flag (No when unset); the filter and sort use it', () => {
    expect(rows.map((r) => r.credentialIssued)).toEqual([true, false, false]);
    expect(filterOfferings(rows, { ...EMPTY_OFFERING_FILTERS, ttii: 'Yes' }).map((r) => r.id)).toEqual(['3']);
    expect(filterOfferings(rows, { ...EMPTY_OFFERING_FILTERS, ttii: 'No' }).map((r) => r.id)).toEqual(['4', '5']);
    expect(sortOfferings(rows, 'ttii', 'desc')[0]?.id).toBe('3');
    expect(offeringCsvRows(rows)[1]).toContain('Yes');
  });
});
