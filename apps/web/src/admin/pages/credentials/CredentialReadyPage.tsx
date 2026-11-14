import { ShieldOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, FileCheck2, Hourglass, PauseCircle, Search, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, KpiTile, PageTitle } from '../../shared/components/ui-kit.js';
import { FilterSelect, ListPager, PillTab } from '../students/list-chrome.js';
import { pageSlice, sortRows } from '../cohorts/list-model.js';
import { distinct } from './credential-format.js';
import { useCredentialGrants, type CredentialGrants } from './credential-issue-hooks.js';
import type { EligibilityStatus, ReadyRow } from './credential-issue-types.js';
import { CriteriaSheet } from './ready/CriteriaSheet.js';
import { HoldDialog, IssueDialog, type HoldKind } from './ready/ReadyDialogs.js';
import { ReadyTable } from './ready/ReadyTable.js';
import {
  EMPTY_READY_FILTERS, STAGES, STAGE_TONE, filterReady, readyExportRows, sortValue, stageCounts,
  type DocChoice, type ReadyFilters, type ReadySortKey,
} from './ready/ready-model.js';

// Admin -> Credential Manager -> Ready to Issue (spec 1.2). Real data: eligibility is
// evaluated server-side; this page filters, sorts and pages the returned rows.

const PAGE_SIZE = 10;
const STAGE_ICON = { Ready: CheckCircle2, 'On Hold': PauseCircle, 'Not Eligible': XCircle, 'In Progress': Hourglass } as const;

export default function CredentialReadyPage(props: AdminPageProps) {
  const grants = useCredentialGrants(props.api, props.session.token);
  if (!grants.loaded) return <PageLoader />;
  if (!grants.access) return <EmptyState icon={ShieldOff} title="Access unavailable" body="You do not have access to the Credential Manager." />;
  return <ReadyContent {...props} grants={grants} />;
}

function ReadyContent({ api, session, grants }: AdminPageProps & { grants: CredentialGrants }) {
  const token = session.token;
  const { data, loading, error, reload } = useAdminPageData(() => api.credentialReadyIndex(token), [api, token]);
  const [stage, setStage] = useState<EligibilityStatus>('Ready');
  const [filters, setFilters] = useState<ReadyFilters>(EMPTY_READY_FILTERS);
  const [sort, setSort] = useState<{ key: ReadySortKey; dir: 'asc' | 'desc' }>({ key: 'completionDate', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [criteriaRow, setCriteriaRow] = useState<ReadyRow | null>(null);
  const [hold, setHold] = useState<{ row: ReadyRow; kind: HoldKind } | null>(null);
  const [issue, setIssue] = useState<{ rows: ReadyRow[]; choice: DocChoice } | null>(null);

  const list = data?.ok ? data.data : null;
  const rows = useMemo(() => list?.rows ?? [], [list]);
  const counts = useMemo(() => stageCounts(rows, filters), [rows, filters]);
  const filtered = useMemo(() => filterReady(rows, stage, filters), [rows, stage, filters]);
  const sorted = useMemo(() => sortRows(filtered, (r) => sortValue(r, sort.key), sort.dir), [filtered, sort]);
  const paged = pageSlice(sorted, page, PAGE_SIZE);
  useEffect(() => { if (page > paged.pages) setPage(paged.pages); }, [page, paged.pages]);

  const options = useMemo(() => ({
    course: distinct(rows.map((r) => r.course)), batch: distinct(rows.map((r) => r.batch)), centre: distinct(rows.map((r) => r.centre)),
    exam: distinct(rows.map((r) => r.examSession)), hold: distinct(rows.filter((r) => r.status === 'On Hold').map((r) => r.holdReason)),
  }), [rows]);

  const set = (patch: Partial<ReadyFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const changeStage = (s: EligibilityStatus) => { setStage(s); setSelected(new Set()); setPage(1); };
  const onSort = (k: ReadySortKey) => setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' }));
  const selectedRows = sorted.filter((r) => selected.has(r.enrolId));
  const allOnPage = paged.current.length > 0 && paged.current.every((r) => selected.has(r.enrolId));
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    paged.current.forEach((r) => (allOnPage ? next.delete(r.enrolId) : next.add(r.enrolId)));
    return next;
  });
  const toggleOne = (id: number, on: boolean) => setSelected((prev) => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next; });
  const exportRows = (picked: ReadyRow[]) => downloadCsv('ready-to-issue.csv', toCsv(readyExportRows(picked)));
  const done = () => { setHold(null); setIssue(null); setSelected(new Set()); reload(); };
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_READY_FILTERS);

  if (loading && !data) return <PageLoader />;
  if (error || !data) return <EmptyState icon={FileCheck2} title="Could not load Ready to Issue" body={error ?? ''} action={<Button variant="outline" onClick={reload}>Retry</Button>} />;
  if (!data.ok || !list) return <div className="grid gap-6"><PageTitle title="Ready to Issue" /><Card><EmptyState icon={FileCheck2} title={data.notSetUp ? 'Credential Manager not set up' : 'Unavailable'} body={data.message} /></Card></div>;

  return (
    <div className="grid gap-6">
      <PageTitle title="Ready to Issue" subtitle="Learners who completed their programme, by eligibility stage. Documents are numbered and verifiable once issued." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAGES.map((s) => (
          <KpiTile key={s} label={s} value={list.counts[s]} icon={STAGE_ICON[s]} tone={STAGE_TONE[s]} active={stage === s} onClick={() => changeStage(s)} />
        ))}
      </div>
      <Card className="gap-0 overflow-hidden p-0">
        <div className="grid gap-3 border-b border-border p-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Eligibility stage">
            {STAGES.map((s) => <PillTab key={s} active={stage === s} label={s} count={counts[s]} onClick={() => changeStage(s)} />)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-52 flex-1 basis-64">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input aria-label="Search" className="pl-9" placeholder="Search name or enrolment no.…" value={filters.query} onChange={(e) => set({ query: e.target.value })} />
            </div>
            <FilterSelect label="Course" allLabel="All courses" value={filters.course} onChange={(v) => set({ course: v })} options={options.course} className="max-w-56" />
            <FilterSelect label="Batch" allLabel="All batches" value={filters.batch} onChange={(v) => set({ batch: v })} options={options.batch} />
            <FilterSelect label="Centre" allLabel="All centres" value={filters.centre} onChange={(v) => set({ centre: v })} options={options.centre} />
            {stage === 'Ready' ? (
              <FilterSelect label="Name confirmed" allLabel="Name confirmed: all" value={filters.nameConfirmed} onChange={(v) => set({ nameConfirmed: v === 'yes' || v === 'no' ? v : '' })} options={[{ value: 'yes', label: 'Confirmed' }, { value: 'no', label: 'Not confirmed' }]} />
            ) : null}
            {stage === 'On Hold' ? <FilterSelect label="Hold reason" allLabel="All hold reasons" value={filters.holdReason} onChange={(v) => set({ holdReason: v })} options={options.hold} /> : null}
            <FilterSelect label="Exam session" allLabel="All exam sessions" value={filters.examSession} onChange={(v) => set({ examSession: v })} options={options.exam} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Completion</span>
            <DmyDateInput className="w-36" value={filters.from} maxYear={new Date().getFullYear() + 2} onChange={(v) => set({ from: v })} />
            <span className="text-xs text-muted-foreground">to</span>
            <DmyDateInput className="w-36" value={filters.to} maxYear={new Date().getFullYear() + 2} onChange={(v) => set({ to: v })} />
            <Button variant="ghost" size="sm" disabled={!filters.from && !filters.to} onClick={() => set({ from: '', to: '' })}>Clear dates</Button>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => exportRows(sorted)}><Download aria-hidden="true" className="size-4" /> Excel</Button>
              <Button variant="outline" size="sm" disabled={!hasFilters} onClick={() => { setFilters(EMPTY_READY_FILTERS); setPage(1); }}>Reset filters</Button>
            </div>
          </div>
          {selected.size > 0 ? (
            <div role="status" className="flex flex-wrap items-center gap-2 rounded-xl bg-primary/5 px-3 py-2 text-sm">
              <span className="font-medium">{selected.size} selected</span>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => exportRows(selectedRows)}><Download aria-hidden="true" className="size-4" /> Excel</Button>
              <Button size="sm" disabled={selectedRows.length === 0 || selectedRows.some((r) => r.status !== 'Ready')} onClick={() => setIssue({ rows: selectedRows, choice: 'certificate' })}>Bulk generate</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear selection</Button>
            </div>
          ) : null}
        </div>
        {sorted.length === 0 ? (
          <EmptyState icon={FileCheck2} title={`No ${stage} learners`} body={hasFilters ? 'No learners match these filters.' : 'Nothing to show in this stage.'} />
        ) : (
          <div className="overflow-x-auto">
            <ReadyTable
              rows={paged.current} stage={stage} selected={selected} sortKey={sort.key} sortDir={sort.dir} canOverride={grants.override}
              onSort={onSort} onToggle={toggleOne} onToggleAll={toggleAll} onView={setCriteriaRow}
              onHold={(row, kind) => setHold({ row, kind })} onOverride={(row) => setHold({ row, kind: 'override' })}
              onGenerate={(row, choice) => setIssue({ rows: [row], choice })}
            />
          </div>
        )}
        <ListPager page={paged.page} pages={paged.pages} shown={paged.current.length} total={sorted.length} noun="learners" onPage={setPage} />
      </Card>
      <CriteriaSheet api={api} token={token} row={criteriaRow} onClose={() => setCriteriaRow(null)} />
      <HoldDialog key={hold ? `${hold.kind}-${hold.row.enrolId}` : 'none'} api={api} token={token} target={hold} holdReasons={list.holdReasons} onClose={() => setHold(null)} onDone={done} />
      {issue ? <IssueDialog api={api} token={token} rows={issue.rows} initialChoice={issue.choice} onClose={() => setIssue(null)} onDone={done} /> : null}
    </div>
  );
}
