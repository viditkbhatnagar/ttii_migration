import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, ShieldCheck, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { Pill } from '../../shared/components/ui-kit.js';
import { TONE } from '../../shared/components/ui-tones.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { AdminGrantsTable } from './AdminGrantsTable.js';
import { ACCESS_LABEL, ACCESS_TONE, GRANTS_NOT_ENFORCED, type GrantRow, type RoleRow } from './roles-model.js';

// Role profile (Naji's RoleProfileDialog), read-only: Overview, Permissions and
// Assigned Users of one built-in role. NOT copied: Edit / Duplicate / Activate
// role and Change Role (roles are fixed role_ids — no role table to write) and
// the Activity Timeline (there is no audit log of role changes).

export type RoleProfileTab = 'overview' | 'permissions' | 'users';

function ProfField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className={cn('mt-0.5 text-sm font-semibold text-foreground', mono && 'font-mono text-primary')}>{value}</div>
    </div>
  );
}

export function RoleProfileDialog({
  role, initialTab, grants, totalPermissions, countsKnown, api, token, onClose, onManage, onNavigate,
}: {
  role: RoleRow | null;
  initialTab: RoleProfileTab;
  grants: GrantRow[];
  totalPermissions: number;
  countsKnown: boolean;
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onManage: (row: GrantRow) => void;
  onNavigate: (href: string) => void;
}) {
  const [tab, setTab] = useState<RoleProfileTab>('overview');
  const [catalog, setCatalog] = useState<Array<Record<string, unknown>> | null>(null);
  const [catalogError, setCatalogError] = useState('');
  useEffect(() => { if (role) setTab(initialTab); }, [role, initialTab]);

  const needsCatalog = role !== null && role.access !== 'role' && tab === 'permissions';
  useEffect(() => {
    if (!needsCatalog || catalog !== null) return;
    let cancelled = false;
    api.listAdminPermissionsCatalog(token)
      .then((rows) => { if (!cancelled) setCatalog(rows); })
      .catch((err: unknown) => { if (!cancelled) setCatalogError(err instanceof Error ? err.message : 'Could not load permissions.'); });
    return () => { cancelled = true; };
  }, [needsCatalog, catalog, api, token]);

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of catalog ?? []) {
      const cat = asString(p.category) || 'Other';
      map.set(cat, [...(map.get(cat) ?? []), asString(p.title)]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [catalog]);

  const holders = role ? grants.filter((g) => g.roleId === role.roleId) : [];
  const users = countsKnown && role ? String(role.users) : '—';

  return (
    <Dialog open={role !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        style={{ width: 'min(960px, calc(100vw - 2rem))', maxWidth: 'min(960px, calc(100vw - 2rem))' }}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
      >
        {role ? (
          <>
            <DialogHeader className="shrink-0 border-b border-border bg-gradient-to-br from-primary/5 to-transparent px-6 py-5 text-left">
              <div className="flex flex-wrap items-start justify-between gap-4 pr-8">
                <div className="flex min-w-0 items-start gap-4">
                  <span className={cn('flex size-14 shrink-0 items-center justify-center rounded-2xl', TONE[ACCESS_TONE[role.access]].tile)}>
                    <ShieldCheck aria-hidden="true" className="size-7" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <DialogTitle className="text-2xl font-semibold tracking-tight">{role.name}</DialogTitle>
                      <Pill tone="primary">System Role</Pill>
                    </div>
                    <DialogDescription asChild>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono font-semibold text-primary">{role.code}</span>
                        <span aria-hidden="true">·</span>
                        <Pill tone={ACCESS_TONE[role.access]}>{ACCESS_LABEL[role.access]}</Pill>
                        <span aria-hidden="true">·</span>
                        <span className="inline-flex items-center gap-1"><Users2 aria-hidden="true" className="size-3.5" /> {users} assigned users</span>
                      </div>
                    </DialogDescription>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { onClose(); onNavigate(role.directoryHref); }}>
                  <ExternalLink aria-hidden="true" className="size-3.5" /> Open {role.directoryLabel}
                </Button>
              </div>
              <div role="group" aria-label="Role sections" className="mt-4 flex flex-wrap gap-1">
                {([
                  ['overview', 'Overview'],
                  ['permissions', 'Permissions'],
                  ['users', `Assigned Users (${users})`],
                ] as Array<[RoleProfileTab, string]>).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={tab === id}
                    onClick={() => setTab(id)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              {tab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ProfField label="Role Name" value={role.name} />
                    <ProfField label="Role Code" value={role.code} mono />
                    <ProfField label="Access" value={ACCESS_LABEL[role.access]} />
                    <ProfField label="Signs in to" value={role.portal} />
                    <ProfField label="Assigned Users" value={users} />
                    <ProfField label="Disabled Users" value={countsKnown ? String(role.disabled) : '—'} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Description</p>
                    <div className="mt-1.5 rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground">{role.description}</div>
                  </div>
                </div>
              )}

              {tab === 'permissions' && (
                role.access === 'role' ? (
                  <p className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-foreground">
                    {role.name} access is role-based: it comes from the role and its own portal, not from individual permissions.
                    There is nothing to grant here.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-foreground">
                      {role.access === 'all'
                        ? `A Super Admin holds every permission in the catalogue (${totalPermissions}).`
                        : 'Permissions are recorded per Admin user, not for the role. Use Manage Permissions on each Admin under Assigned Users.'}
                    </p>
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{GRANTS_NOT_ENFORCED}</p>
                    {catalogError ? <p role="alert" className="text-sm text-destructive">{catalogError}</p> : null}
                    {catalog === null && !catalogError ? <p className="text-sm text-muted-foreground">Loading permissions…</p> : null}
                    {grouped.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {grouped.map(([cat, titles]) => (
                          <div key={cat} className="rounded-lg border border-border p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</p>
                            <ul className="mt-1.5 space-y-1 text-sm text-foreground">
                              {titles.map((t) => <li key={t}>{t}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              )}

              {tab === 'users' && (
                role.access === 'role' ? (
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
                    <Users2 aria-hidden="true" className="size-8 text-muted-foreground/50" />
                    <p className="text-sm font-semibold text-foreground">{users} {role.name.toLowerCase()} account{users === '1' ? '' : 's'}</p>
                    <p className="max-w-md text-xs text-muted-foreground">They are managed on the {role.directoryLabel} page.</p>
                    <Button size="sm" variant="outline" onClick={() => { onClose(); onNavigate(role.directoryHref); }}>Open {role.directoryLabel}</Button>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <AdminGrantsTable
                      rows={holders}
                      totalPermissions={totalPermissions}
                      onManage={onManage}
                      emptyTitle={`No ${role.name} accounts.`}
                    />
                  </div>
                )
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
