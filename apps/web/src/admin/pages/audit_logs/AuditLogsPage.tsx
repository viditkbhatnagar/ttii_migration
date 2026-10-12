import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Activity, AlertTriangle, Download, Eye, FileText, Filter, Info, LogIn, RefreshCcw, Search, Wallet, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, KpiTile, Pill } from '../../shared/components/ui-kit.js';
import { istDateTime } from '../../shared/utils/ist-date.js';
import { FilterSelect, ListPager } from '../students/list-chrome.js';
import { initialsOf } from '../students/students-list-model.js';
import { AuditLogDetailSheet } from './AuditLogDetailSheet.js';
import {
  AUDIT_EXPORT_CAP, AUDIT_EXPORT_PAGE, AUDIT_PAGE_SIZE, AUDIT_TABS, RECORDED_NOTE,
  actorLabel, auditCsvRows, auditQuery, auditStatus, auditSummaryCsv, defaultAuditFilters, eventOptionsFor, recordLabel, toAuditPage,
  type AuditFilters, type AuditOutcome, type AuditRow, type AuditSource,
} from './audit-logs-model.js';

// Administration → Audit Logs, after Naji's AuditLogsModule (TTII 2026-10-12).
// READ-ONLY, real data only: sign-in events (auth_audit_log) and application /
// payment actions (application_events), filtered and paged on the server
// (GET /admin/audit_logs/list). KPIs are live counts.
// NOT copied (we do not record them): data changes on other modules,
// Old / New value diffs, Department, Module, Record IDs outside applications,
// Session ID, Location, Warning / Critical levels, Save View, Apply Filters
// (filters apply as you change them).

const SEARCH_DEBOUNCE_MS = 400;

export default function AuditLogsPage({ api, session, onNavigate }: AdminPageProps) {
  const [filters, setFilters] = useState<AuditFilters>(() => defaultAuditFilters());
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<AuditRow | null>(null);
  const [exporting, setExporting] = useState(false);

  // Search is sent to the server, so it waits for a pause in typing.
  useEffect(() => {
    if (searchText === filters.search) return undefined;
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchText }));
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchText, filters.search]);

  const query = useMemo(() => auditQuery(filters, page), [filters, page]);
  const queryKey = JSON.stringify(query);
  const { data, loading, error, reload } = useAdminPageData(
    async () => toAuditPage(await api.loadAuditLogs(session.token, query)),
    [queryKey],
  );

  // The selection belongs to one result set.
  useEffect(() => { setSelected(new Set()); }, [queryKey]);

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const kpis = data?.kpis ?? null;
  const eventOptions = useMemo(() => eventOptionsFor(filters.source, data?.eventTypes ?? []), [filters.source, data?.eventTypes]);
  const userName = filters.userName || data?.user?.name || (filters.userId ? `User ${filters.userId}` : '');

  const set = (patch: Partial<AuditFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const setTab = (source: AuditSource) => {
    // An event picked under another tab may not exist under this one.
    const keepEvent = eventOptionsFor(source, data?.eventTypes ?? []).some((o) => o.value === filters.event);
    set({ source, event: keepEvent ? filters.event : '' });
  };
  const reset = () => { setSearchText(''); setFilters(defaultAuditFilters()); setPage(1); };
  const failedKpiActive = filters.source === 'auth' && filters.outcome === 'failure';

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.key));
  const toggleAll = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allOnPage) rows.forEach((r) => next.delete(r.key));
    else rows.forEach((r) => next.add(r.key));
    return next;
  });
  const toggleOne = (key: string, on: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    if (on) next.add(key); else next.delete(key);
    return next;
  });

  /** Every row matching the filters (up to the export cap), page by page. */
  const fetchFiltered = async (): Promise<{ list: AuditRow[]; truncated: boolean }> => {
    const out: AuditRow[] = [];
    let matched = Number.POSITIVE_INFINITY;
    for (let p = 1; out.length < Math.min(matched, AUDIT_EXPORT_CAP); p += 1) {
      const res = toAuditPage(await api.loadAuditLogs(session.token, auditQuery(filters, p, AUDIT_EXPORT_PAGE, true)));
      matched = res.total;
      if (res.rows.length === 0) break;
      out.push(...res.rows);
    }
    return { list: out.slice(0, AUDIT_EXPORT_CAP), truncated: matched > AUDIT_EXPORT_CAP };
  };

  const runExport = async (kind: 'logs' | 'report') => {
    const chosen = kind === 'logs' ? rows.filter((r) => selected.has(r.key)) : [];
    setExporting(true);
    try {
      const { list, truncated } = chosen.length > 0 ? { list: chosen, truncated: false } : await fetchFiltered();
      if (list.length === 0) { toast.error('No activities to export'); return; }
      if (kind === 'logs') downloadCsv('audit_logs.csv', toCsv(auditCsvRows(list, istDateTime)));
      else downloadCsv('audit_summary_report.csv', toCsv(auditSummaryCsv(list)));
      const what = kind === 'logs' ? `Exported ${list.length} activities` : `Summary of ${list.length} activities downloaded`;
      if (truncated) toast.warning(`${what} — the first ${AUDIT_EXPORT_CAP}. Narrow the dates to get the rest.`);
      else toast.success(what);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading && !data) return <PageLoader label="Loading audit logs..." />;
  if (error && !data) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Administration</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Audit Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track sign-ins, security events and application actions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" disabled={exporting || total === 0} onClick={() => { void runExport('logs'); }}>
            <Download aria-hidden="true" className="size-4" /> Export Logs{selected.size ? ` (${selected.size})` : ''}
          </Button>
          <Button size="sm" className="gap-1.5" disabled={exporting || total === 0} onClick={() => { void runExport('report'); }}>
            <FileText aria-hidden="true" className="size-4" /> Download Report
          </Button>
        </div>
      </div>

      <p role="note" className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        {RECORDED_NOTE}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiTile label="Activities in range" value={total.toLocaleString('en-IN')} icon={Activity} tone="primary" active={filters.source === 'all' && filters.outcome === 'all'} onClick={() => set({ source: 'all', outcome: 'all', event: '' })} />
        <KpiTile label="Sign-ins today" value={(kpis?.signInsToday ?? 0).toLocaleString('en-IN')} icon={LogIn} tone="blue" />
        <KpiTile
          label="Failed sign-ins (24h)"
          value={(kpis?.failedSignIns24h ?? 0).toLocaleString('en-IN')}
          icon={AlertTriangle}
          tone="rose"
          active={failedKpiActive}
          onClick={() => set(failedKpiActive ? { source: 'all', outcome: 'all', event: '' } : { source: 'auth', outcome: 'failure', event: '' })}
        />
        <KpiTile label="Application actions (7 days)" value={(kpis?.applicationActions7d ?? 0).toLocaleString('en-IN')} icon={FileText} tone="amber" active={filters.source === 'application'} onClick={() => setTab(filters.source === 'application' ? 'all' : 'application')} />
        <KpiTile label="Payment actions (7 days)" value={(kpis?.paymentActions7d ?? 0).toLocaleString('en-IN')} icon={Wallet} tone="emerald" active={filters.source === 'payment'} onClick={() => setTab(filters.source === 'payment' ? 'all' : 'payment')} />
      </div>

      <div role="group" aria-label="Activity type" className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-1.5 shadow-[var(--shadow-soft)]">
        {AUDIT_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={filters.source === t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'rounded-xl px-3.5 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              filters.source === t.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Filter aria-hidden="true" className="size-4 text-muted-foreground" /> Filters
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={reset}>
            <RefreshCcw aria-hidden="true" className="size-3.5" /> Reset Filters
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_220px_160px]">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search activity"
              className="h-9 pl-9 text-sm"
              placeholder="Search user, sign-in name, IP, application ID or description"
              value={searchText}
              maxLength={100}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <FilterSelect
            label="Action type"
            value={filters.event}
            onChange={(v) => set({ event: v })}
            allLabel="All Actions"
            options={eventOptions.map((o) => ({ value: o.value, label: o.label }))}
          />
          <FilterSelect
            label="Status"
            value={filters.outcome === 'all' ? '' : filters.outcome}
            onChange={(v) => set({ outcome: (v || 'all') as AuditOutcome })}
            allLabel="All Status"
            options={[{ value: 'success', label: 'Success' }, { value: 'failure', label: 'Failed' }]}
          />
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:max-w-xl">
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">From (IST)</span>
            <DmyDateInput value={filters.from} onChange={(v) => set({ from: v })} />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-muted-foreground">To (IST)</span>
            <DmyDateInput value={filters.to} onChange={(v) => set({ to: v })} />
          </div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
            {total.toLocaleString('en-IN')} activit{total === 1 ? 'y' : 'ies'}
            {filters.userId ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                {userName}
                <button type="button" aria-label="Show every user" className="rounded hover:text-primary" onClick={() => set({ userId: '', userName: '' })}>
                  <X aria-hidden="true" className="size-3" />
                </button>
              </span>
            ) : null}
            {selected.size > 0 ? (
              <>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{selected.size} selected</span>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>Clear</Button>
              </>
            ) : null}
            {loading ? <span className="text-xs font-normal text-muted-foreground">Updating…</span> : null}
          </div>
          <p className="text-xs text-muted-foreground">Sorted by <span className="font-medium text-foreground">Date &amp; Time</span> · Newest first</p>
        </div>
        {error ? <p role="alert" className="border-b border-border bg-rose-50 px-4 py-2 text-xs text-rose-700">{error}</p> : null}
        {rows.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No audit logs found."
            body="Nothing recorded matches these filters. Try a wider date range or clear the filters."
            action={<Button variant="outline" size="sm" onClick={reset}>Reset filters</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10">
                    <Checkbox aria-label="Select all on this page" checked={allOnPage} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead className="w-12 text-xs">Sl No</TableHead>
                  <TableHead className="text-xs">Date &amp; Time</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Record</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">IP Address</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-right text-xs">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => {
                  const [date, time] = (istDateTime(r.at) || '—').split(', ');
                  const who = actorLabel(r);
                  return (
                    <TableRow key={r.key} className="hover:bg-muted/30" data-state={selected.has(r.key) ? 'selected' : undefined}>
                      <TableCell>
                        <Checkbox aria-label={`Select ${r.action}`} checked={selected.has(r.key)} onCheckedChange={(v) => toggleOne(r.key, v === true)} />
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">{(page - 1) * AUDIT_PAGE_SIZE + i + 1}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <p className="text-sm font-medium text-foreground">{date}</p>
                        {time ? <p className="text-xs text-muted-foreground">{time}</p> : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initialsOf(who)}</span>
                          <div className="min-w-0">
                            {r.userId ? (
                              <button
                                type="button"
                                title="Show only this user's activity"
                                className="block max-w-[200px] truncate text-left text-sm font-semibold text-foreground hover:text-primary hover:underline"
                                onClick={() => set({ userId: r.userId, userName: who })}
                              >
                                {who}
                              </button>
                            ) : (
                              <p className="max-w-[200px] truncate text-sm font-semibold text-foreground">{who}</p>
                            )}
                            <p className="max-w-[200px] truncate text-xs text-muted-foreground">{r.userRole || r.identifier || '—'}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-foreground">{r.category}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {r.applicationId ? (
                          <button type="button" className="font-mono text-xs font-semibold text-primary hover:underline" onClick={() => setViewing(r)}>
                            {r.applicationCode || `#${r.applicationId}`}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="whitespace-nowrap text-sm font-medium text-foreground">{r.action}</p>
                        {r.description ? <p className="max-w-[320px] truncate text-xs text-muted-foreground" title={r.description}>{r.description}</p> : null}
                        {!r.description && r.source === 'application' ? <p className="text-xs text-muted-foreground">{recordLabel(r)}</p> : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{r.ipAddress || '—'}</TableCell>
                      <TableCell><Pill tone={r.success ? 'emerald' : 'rose'}>{auditStatus(r)}</Pill></TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="size-8" title="View details" aria-label={`View details of ${r.action}`} onClick={() => setViewing(r)}>
                          <Eye aria-hidden="true" className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <ListPager page={page} pages={pages} shown={rows.length} total={total} noun="activities" onPage={setPage} />
      </Card>

      <AuditLogDetailSheet row={viewing} onClose={() => setViewing(null)} onNavigate={onNavigate} />
    </div>
  );
}
