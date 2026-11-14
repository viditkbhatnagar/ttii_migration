import type { AdminNavEntry } from '../../routing/admin-nav-tree.js';
import { isNavGroup } from '../../routing/admin-nav-tree.js';

// The five Credential Manager switches (spec §1.11) and the menu rule that
// hides what the signed-in user cannot open. Server routes enforce the same.

export interface CredentialPermissions { access: boolean; revoke: boolean; override: boolean; settings: boolean; reports: boolean }

export const NO_CREDENTIAL_PERMISSIONS: CredentialPermissions = { access: false, revoke: false, override: false, settings: false, reports: false };
export const ALL_CREDENTIAL_PERMISSIONS: CredentialPermissions = { access: true, revoke: true, override: true, settings: true, reports: true };

export function toCredentialPermissions(raw: Record<string, unknown> | null | undefined): CredentialPermissions {
  const r = raw ?? {};
  return { access: r.access === true, revoke: r.revoke === true, override: r.override === true, settings: r.settings === true, reports: r.reports === true };
}

/** Prototype canOpenCredentialPage: settings needs settings, reports needs reports, the dashboard any of the three, the rest access. */
export function canOpenCredentialPage(itemId: string, p: CredentialPermissions): boolean {
  switch (itemId) {
    case 'credential-settings': return p.settings;
    case 'credential-reports': return p.reports;
    case 'credential-dashboard': return p.access || p.settings || p.reports;
    default: return p.access;
  }
}

/** Filters ONLY the Credential Manager group; `perms` null = not loaded yet (hidden unless Super Admin). */
export function filterCredentialNav(tree: readonly AdminNavEntry[], roleId: number, perms: CredentialPermissions | null): readonly AdminNavEntry[] {
  const effective = roleId === 1 ? ALL_CREDENTIAL_PERMISSIONS : perms;
  return tree.flatMap((entry): AdminNavEntry[] => {
    if (!isNavGroup(entry) || entry.id !== 'credential-manager') return [entry];
    if (!effective) return [];
    const children = entry.children.filter((child) => canOpenCredentialPage(child.id, effective));
    return children.length === 0 ? [] : [{ ...entry, children }];
  });
}
