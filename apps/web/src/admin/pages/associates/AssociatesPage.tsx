import { useEffect, useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import { PillTab } from '../students/list-chrome.js';
import { StaffFormDialog } from '../counsellor/StaffFormDialog.js';
import { StaffProfile } from '../counsellor/StaffProfile.js';
import { StaffFilterCard, StaffTable } from '../counsellor/staff-list-ui.js';
import {
  EMPTY_STAFF_FILTERS, distinctCentres, filterStaff, sortStaff, staffCounts, staffCsvRows, toStaffRows,
  type StaffFilters, type StaffRow, type StaffSortKey, type StaffTab,
} from '../counsellor/staff-model.js';
import { useStaffActions } from '../counsellor/use-staff-actions.js';

// Admin → Associates → Associates Directory, rebuilt after Naji's
// AssociatesModule (TTII 2026-10-12): status pills with counts, a filter card,
// a sortable, selectable, paged table, CSV export of the selection or the
// filtered list, and the associate profile. Every action of the old page
// survives: Add, View (now the profile), Edit, Resend Login Email, Delete
// (confirm), Change Username/Password (opens Edit, as before) and Enable /
// Disable login (confirm before disabling).
// Not built (no data / needs a product decision): City / State / Occupation,
// commission plan and earnings, KYC & bank details, Pending Onboarding,
// bulk Activate / Deactivate, communications log and documents.

const PAGE_SIZE = 10;
const TABS: Array<{ id: StaffTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'Active', label: 'Active' },
  { id: 'Inactive', label: 'Inactive' },
  { id: 'Disabled', label: 'Login Disabled' },
];

export default function AssociatesPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(() => api.loadAssociates(session.token), []);
  const [filters, setFilters] = useState<StaffFilters>(EMPTY_STAFF_FILTERS);
  const [sortKey, setSortKey] = useState<StaffSortKey>('joined');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formTarget, setFormTarget] = useState<'add' | StaffRow | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const actions = useStaffActions('associate', api, session.token, reload);
  const rows = useMemo(() => toStaffRows(data ?? []), [data]);
  const counts = useMemo(() => staffCounts(filterStaff(rows, { ...filters, tab: 'all' })), [rows, filters]);
  const filtered = useMemo(() => sortStaff(filterStaff(rows, filters), sortKey, sortDir), [rows, filters, sortKey, sortDir]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const centres = useMemo(() => distinctCentres(rows), [rows]);

  const set = (patch: Partial<StaffFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_STAFF_FILTERS); setPage(1); };
  const onSort = (k: StaffSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };
  const exportCsv = () => {
    const picked = selected.size > 0 ? filtered.filter((r) => selected.has(r.id)) : filtered;
    downloadCsv('associates_export.csv', toCsv(staffCsvRows(picked)));
  };

  const profileRow = profileId ? rows.find((r) => r.id === profileId) ?? null : null;

  if (loading && !data) return <PageLoader label="Loading associates..." />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  const dialog = (
    <StaffFormDialog kind="associate" target={formTarget} api={api} token={session.token} onClose={() => setFormTarget(null)} onSaved={reload} />
  );

  if (profileRow) {
    return (
      <>
        <StaffProfile
          kind="associate"
          row={profileRow}
          api={api}
          token={session.token}
          actions={actions}
          onBack={() => setProfileId(null)}
          onEdit={() => setFormTarget(profileRow)}
          onNavigate={onNavigate}
        />
        {dialog}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Associates"
        subtitle={`${rows.length} associate${rows.length === 1 ? '' : 's'} · ${counts.Active} active`}
        actions={(
          <>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={exportCsv}>
              <Download aria-hidden="true" className="size-4" /> Export{selected.size ? ` (${selected.size})` : ''}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setFormTarget('add')}>
              <Plus aria-hidden="true" className="size-4" /> Add Associate
            </Button>
          </>
        )}
      />

      <div role="group" aria-label="Associate status" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <PillTab key={t.id} active={filters.tab === t.id} label={t.label} count={counts[t.id]} onClick={() => set({ tab: t.id })} />
        ))}
      </div>

      <StaffFilterCard noun="associate" filters={filters} centres={centres} onChange={set} onReset={reset} />

      <StaffTable
        noun="associate"
        rows={rows}
        current={current}
        filteredCount={filtered.length}
        page={page}
        pages={pages}
        pageSize={PAGE_SIZE}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        onPage={setPage}
        selected={selected}
        onSelect={setSelected}
        onView={(r) => setProfileId(r.id)}
        onEdit={(r) => setFormTarget(r)}
        actions={actions}
        onReset={reset}
      />

      {dialog}
    </div>
  );
}
