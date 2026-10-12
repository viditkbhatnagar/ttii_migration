import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, UserCheck, UserMinus, Users, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { KpiTile, PageTitle } from '../../shared/components/ui-kit.js';
import { StaffFormDialog } from './StaffFormDialog.js';
import { StaffProfile } from './StaffProfile.js';
import { StaffFilterCard, StaffTable } from './staff-list-ui.js';
import { activeTargetFor, toTargetRows, type TargetRow } from './counsellor-target-model.js';
import {
  EMPTY_STAFF_FILTERS, distinctCentres, filterStaff, sortStaff, staffCounts, staffCsvRows, toStaffRows, todayIstYmd,
  type StaffFilters, type StaffRow, type StaffSortKey, type StaffTab,
} from './staff-model.js';
import { useStaffActions } from './use-staff-actions.js';

// Admin → Counsellors → Counsellors Directory, rebuilt after Naji's
// CounsellorsModule (TTII 2026-10-12): KPI tiles that filter, a filter card,
// a sortable, selectable, paged table with each counsellor's current target,
// CSV export of the selection or the filtered list, and the profile view.
// Every action of the old page survives: Add, View (now the profile), Edit,
// Resend Login Email, Delete (confirm), Change Username/Password (opens Edit,
// as before) and Enable / Disable login (confirm before disabling).
// Not built (no data / needs a product decision): Employee ID, Designation,
// Team, Team Leader, Group, Manager, "On Leave" and Transfer Team.

const PAGE_SIZE = 10;
const KPIS: Array<{ tab: StaffTab; label: string; icon: typeof Users; tone: 'primary' | 'emerald' | 'rose' | 'amber' }> = [
  { tab: 'all', label: 'Total Counsellors', icon: Users, tone: 'primary' },
  { tab: 'Active', label: 'Active Counsellors', icon: UserCheck, tone: 'emerald' },
  { tab: 'Inactive', label: 'Inactive Counsellors', icon: UserX, tone: 'rose' },
  { tab: 'Disabled', label: 'Login Disabled', icon: UserMinus, tone: 'amber' },
];

export default function CounsellorsPage({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(() => api.loadCounsellors(session.token), []);
  const [targetRecords, setTargetRecords] = useState<Record<string, unknown>[]>([]);
  const [filters, setFilters] = useState<StaffFilters>(EMPTY_STAFF_FILTERS);
  const [sortKey, setSortKey] = useState<StaffSortKey>('joined');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formTarget, setFormTarget] = useState<'add' | StaffRow | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Optional enrichment for the Active Target column and the profile's Targets
  // tab; the directory still works if this is refused.
  useEffect(() => {
    api.loadCounsellorTargets(session.token).then(setTargetRecords).catch(() => setTargetRecords([]));
  }, [api, session.token, data]);

  const actions = useStaffActions('counsellor', api, session.token, reload);
  const today = todayIstYmd();
  const rows = useMemo(() => toStaffRows(data ?? []), [data]);
  const targets = useMemo(() => toTargetRows(targetRecords, today), [targetRecords, today]);
  const activeTarget = useMemo(() => {
    const map = new Map<string, TargetRow>();
    for (const r of rows) {
      const t = activeTargetFor(targets, r.id);
      if (t) map.set(r.id, t);
    }
    return map;
  }, [rows, targets]);

  const counts = useMemo(() => staffCounts(filterStaff(rows, { ...filters, tab: 'all' })), [rows, filters]);
  const filtered = useMemo(
    () => sortStaff(filterStaff(rows, filters), sortKey, sortDir, (r) => activeTarget.get(r.id)?.pct ?? null),
    [rows, filters, sortKey, sortDir, activeTarget],
  );
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
    downloadCsv('counsellors_export.csv', toCsv(staffCsvRows(picked, {
      header: 'Active Target',
      value: (r) => {
        const t = activeTarget.get(r.id);
        return t ? `${t.type} ${t.achieved}/${t.value} (${t.pct}%)` : '';
      },
    })));
  };

  const profileRow = profileId ? rows.find((r) => r.id === profileId) ?? null : null;

  if (loading && !data) return <PageLoader label="Loading counsellors..." />;
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
    <StaffFormDialog kind="counsellor" target={formTarget} api={api} token={session.token} onClose={() => setFormTarget(null)} onSaved={reload} />
  );

  if (profileRow) {
    return (
      <>
        <StaffProfile
          kind="counsellor"
          row={profileRow}
          api={api}
          token={session.token}
          targets={targets.filter((t) => t.userId === profileRow.id)}
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
        title="Counsellors"
        subtitle="Manage admission counsellors."
        actions={(
          <>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={exportCsv}>
              <Download aria-hidden="true" className="size-4" /> Export{selected.size ? ` (${selected.size})` : ''}
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setFormTarget('add')}>
              <Plus aria-hidden="true" className="size-4" /> Add Counsellor
            </Button>
          </>
        )}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((k) => (
          <KpiTile
            key={k.tab}
            label={k.label}
            value={counts[k.tab]}
            icon={k.icon}
            tone={k.tone}
            active={filters.tab === k.tab}
            onClick={() => set({ tab: filters.tab === k.tab ? 'all' : k.tab })}
          />
        ))}
      </div>

      <StaffFilterCard noun="counsellor" filters={filters} centres={centres} showJoined onChange={set} onReset={reset} />

      <StaffTable
        noun="counsellor"
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
        activeTarget={(r) => activeTarget.get(r.id) ?? null}
        onView={(r) => setProfileId(r.id)}
        onEdit={(r) => setFormTarget(r)}
        actions={actions}
        onReset={reset}
      />

      {dialog}
    </div>
  );
}
