import { ShieldOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, PageTitle, Pill } from '../../shared/components/ui-kit.js';
import { FilterSelect, ListPager, PillTab } from '../students/list-chrome.js';
import { pageSlice } from '../cohorts/list-model.js';
import { dash, distinct, fmtDate } from './credential-format.js';
import { useCredentialGrants, type CredentialGrants } from './credential-issue-hooks.js';
import type { IssuedRow } from './credential-issue-types.js';
import { ReasonDialog, RowActionMenu } from './issued/IssuedActions.js';
import { useIssuedActions, type ReasonKind } from './issued/useIssuedActions.js';
import { IssuedDetailView } from './issued/IssuedDetailView.js';
import {
  EMPTY_ISSUED_FILTERS, ISSUED_TABS, STATUS_LABEL, STATUS_TONE, filterIssued, issuedExportRows, type IssuedFilters, type IssuedTab,
} from './issued/issued-model.js';

// Admin -> Credential Manager -> Issued (spec 1.3). Rows come from the server; the
// filters, status chips and the 10-per-page pager run in the browser.

const PAGE_SIZE = 10;
const head = 'whitespace-nowrap text-xs font-medium text-muted-foreground';

export default function CredentialIssuedPage(props: AdminPageProps) {
  const grants = useCredentialGrants(props.api, props.session.token);
  if (!grants.loaded) return <PageLoader />;
  if (!grants.access) return <EmptyState icon={ShieldOff} title="Access unavailable" body="You do not have access to the Credential Manager." />;
  return <IssuedContent {...props} grants={grants} />;
}

function IssuedContent({ api, session, grants }: AdminPageProps & { grants: CredentialGrants }) {
  const token = session.token;
  const { data, loading, error, reload } = useAdminPageData(() => api.credentialIssuedIndex(token), [api, token]);
  const [tab, setTab] = useState<IssuedTab>('all');
  const [filters, setFilters] = useState<IssuedFilters>(EMPTY_ISSUED_FILTERS);
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detailKey, setDetailKey] = useState(0);
  const [ask, setAsk] = useState<{ kind: ReasonKind; row: IssuedRow } | null>(null);
  const actions = useIssuedActions(api, token, () => { reload(); setDetailKey((k) => k + 1); });

  const rows = useMemo(() => (data?.ok ? data.data?.rows ?? [] : []), [data]);
  const counts = useMemo(() => {
    const base = filterIssued(rows, 'all', filters);
    return { all: base.length, valid: base.filter((r) => r.status === 'valid').length, superseded: base.filter((r) => r.status === 'superseded').length, revoked: base.filter((r) => r.status === 'revoked').length };
  }, [rows, filters]);
  const scoped = useMemo(() => (tab === 'all' ? rows : rows.filter((r) => r.status === tab)), [rows, tab]);
  const filtered = useMemo(() => filterIssued(rows, tab, filters), [rows, tab, filters]);
  const paged = pageSlice(filtered, page, PAGE_SIZE);
  useEffect(() => { if (page > paged.pages) setPage(paged.pages); }, [page, paged.pages]);
  const options = useMemo(() => ({
    course: distinct(scoped.map((r) => r.course)), batch: distinct(scoped.map((r) => r.batch)), centre: distinct(scoped.map((r) => r.centre)),
    docType: [...new Map(scoped.map((r) => [r.docType, r.docTypeLabel])).entries()].map(([value, label]) => ({ value, label })),
  }), [scoped]);

  const set = (patch: Partial<IssuedFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(EMPTY_ISSUED_FILTERS);
  const view = (r: IssuedRow) => setDetailId(r.id);
  const closeAsk = () => setAsk(null);

  if (loading && !data) return <PageLoader />;
  if (error || !data) return <EmptyState icon={FileText} title="Could not load Issued documents" body={error ?? ''} action={<Button variant="outline" onClick={reload}>Retry</Button>} />;
  if (!data.ok) return <div className="grid gap-6"><PageTitle title="Issued" /><Card><EmptyState icon={FileText} title={data.notSetUp ? 'Credential Manager not set up' : 'Unavailable'} body={data.message} /></Card></div>;

  const dialog = <ReasonDialog key={ask ? `${ask.kind}-${ask.row.id}` : 'none'} target={ask} actions={actions} onClose={closeAsk} />;
  if (detailId !== null) {
    return (
      <>
        <IssuedDetailView api={api} token={token} id={detailId} reloadKey={detailKey} canRevoke={grants.revoke} actions={actions}
          onBack={() => setDetailId(null)} onAsk={(kind, row) => setAsk({ kind, row })} />
        {dialog}
      </>
    );
  }

  return (
    <div className="grid gap-6">
      <PageTitle title="Issued" subtitle="Certificates, marksheets and provisional certificates issued by TTII, with their verification IDs." />
      <Card className="gap-0 overflow-hidden p-0">
        <div className="grid gap-3 border-b border-border p-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Document status">
            {ISSUED_TABS.map((t) => <PillTab key={t.id} active={tab === t.id} label={t.label} count={counts[t.id]} onClick={() => { setTab(t.id); setFilters((f) => ({ ...f, course: '', batch: '', centre: '', docType: '' })); setPage(1); }} />)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-52 flex-1 basis-72">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input aria-label="Search" className="pl-9" placeholder="Name, enrolment, document no. or verification ID…" value={filters.query} onChange={(e) => set({ query: e.target.value })} />
            </div>
            <FilterSelect label="Course" allLabel="All courses" value={filters.course} onChange={(v) => set({ course: v })} options={options.course} className="max-w-56" />
            <FilterSelect label="Batch" allLabel="All batches" value={filters.batch} onChange={(v) => set({ batch: v })} options={options.batch} />
            <FilterSelect label="Centre" allLabel="All centres" value={filters.centre} onChange={(v) => set({ centre: v })} options={options.centre} />
            <FilterSelect label="Document type" allLabel="All document types" value={filters.docType} onChange={(v) => set({ docType: v })} options={options.docType} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Issue date</span>
            <DmyDateInput className="w-36" value={filters.from} maxYear={new Date().getFullYear() + 1} onChange={(v) => set({ from: v })} />
            <span className="text-xs text-muted-foreground">to</span>
            <DmyDateInput className="w-36" value={filters.to} maxYear={new Date().getFullYear() + 1} onChange={(v) => set({ to: v })} />
            <Button variant="ghost" size="sm" disabled={!filters.from && !filters.to} onClick={() => set({ from: '', to: '' })}>Clear dates</Button>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => downloadCsv('issued.csv', toCsv(issuedExportRows(filtered)))}><Download aria-hidden="true" className="size-4" /> Excel</Button>
              <Button variant="outline" size="sm" disabled={!hasFilters} onClick={() => { setFilters(EMPTY_ISSUED_FILTERS); setPage(1); }}>Reset filters</Button>
            </div>
          </div>
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={FileText} title="No TTII-issued documents match these filters." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={head}>#</TableHead>
                  <TableHead className={head}>Document no.</TableHead>
                  <TableHead className={head}>Verification ID</TableHead>
                  <TableHead className={head}>Document type</TableHead>
                  <TableHead className={head}>Learner</TableHead>
                  <TableHead className={head}>Course</TableHead>
                  <TableHead className={head}>Centre</TableHead>
                  <TableHead className={head}>Issue date</TableHead>
                  <TableHead className={head}>Status</TableHead>
                  <TableHead className={`w-12 ${head}`}>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.current.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">{(paged.page - 1) * PAGE_SIZE + i + 1}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <button type="button" onClick={() => view(r)} className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{r.documentNo}</button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{r.verificationId}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{r.docTypeLabel}<p className="text-xs text-muted-foreground">Version {r.version}</p></TableCell>
                    <TableCell className="min-w-36 text-sm">{r.learner}<p className="text-xs text-muted-foreground">{r.enrolmentNo}</p></TableCell>
                    <TableCell className="min-w-40 max-w-64 whitespace-normal text-sm">{dash(r.course)}<p className="text-xs text-muted-foreground">{r.batch}</p></TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{dash(r.centre)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">{dash(fmtDate(r.issueDate))}</TableCell>
                    <TableCell><Pill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Pill></TableCell>
                    <TableCell><RowActionMenu row={r} actions={actions} canRevoke={grants.revoke} onView={view} onAsk={(kind, row) => setAsk({ kind, row })} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <ListPager page={paged.page} pages={paged.pages} shown={paged.current.length} total={filtered.length} noun="documents" onPage={setPage} />
      </Card>
      {dialog}
    </div>
  );
}
