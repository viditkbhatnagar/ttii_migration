import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Eye, Mail, MessageCircle, MessagesSquare, NotebookPen, Phone, Plus, Search, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, PageTitle } from '../../shared/components/ui-kit.js';
import { toStaffRows } from '../counsellor/staff-model.js';
import { formatIstDateTime } from '../counsellor/staff-profile-model.js';
import { FilterSelect, ListPager, PillTab } from '../students/list-chrome.js';
import { LoadError } from './associate-mgmt-ui.js';
import {
  COMM_CHANNELS, COMM_DIRECTIONS, EMPTY_COMM_FILTERS, commCounts, commCsvRows, filterComms, monthOptions, toCommList, uniqSorted,
  type CommChannelTab, type CommFilters, type CommRow,
} from './associate-mgmt-model.js';
import { LogCommunicationDialog } from './LogCommunicationDialog.js';

// Admin → Associate Management → Communications, after Naji's
// AssociateCommunicationsModule (TTII 2026-10-12): every call, WhatsApp,
// email and note with associates, from the new associate_communications table
// (deploy/migrations/2026-10-12-associate-communications.sql). "Log
// Communication" RECORDS a conversation that already happened — nothing is
// sent. Until the migration runs the list is empty with a clear note and
// logging is switched off.
// Not built: "Send Message" (outbound WhatsApp / email from the LMS).

const PAGE_SIZE = 10;
const CHANNEL_ICON: Record<string, LucideIcon> = { Call: Phone, WhatsApp: MessageCircle, Email: Mail, Note: NotebookPen };

export default function AssociateCommunicationsPage({ api, session }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => Promise.all([api.loadAssociateCommunications(session.token), api.loadAssociates(session.token)]),
    [],
  );
  const [filters, setFilters] = useState<CommFilters>(EMPTY_COMM_FILTERS);
  const [page, setPage] = useState(1);
  const [logOpen, setLogOpen] = useState(false);
  const [view, setView] = useState<CommRow | null>(null);

  const list = useMemo(() => toCommList(data?.[0].data ?? {}), [data]);
  const notice = list.tableMissing ? (data?.[0].message ?? '') : '';
  const associates = useMemo(() => toStaffRows(data?.[1] ?? []).map((a) => ({ id: a.id, name: a.name })), [data]);
  const rows = list.rows;
  const staff = useMemo(() => uniqSorted(rows.map((r) => r.createdByName)), [rows]);
  const months = useMemo(() => monthOptions(new Date()), []);
  const counts = useMemo(() => commCounts(filterComms(rows, { ...filters, channel: 'all' })), [rows, filters]);
  const filtered = useMemo(() => filterComms(rows, filters), [rows, filters]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const set = (patch: Partial<CommFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_COMM_FILTERS); setPage(1); };
  const exportCsv = () => {
    downloadCsv('associate-communications.csv', toCsv(commCsvRows(filtered)));
    toast.success(`Exported ${filtered.length} entr${filtered.length === 1 ? 'y' : 'ies'}`);
  };

  if (loading && !data) return <PageLoader label="Loading communications..." />;
  if (error) return <LoadError message={error} onRetry={reload} />;

  const tabs: Array<{ id: CommChannelTab; label: string }> = [{ id: 'all', label: 'All' }, ...COMM_CHANNELS.map((c) => ({ id: c, label: c }))];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Communications"
        subtitle="Every call, WhatsApp, email and note with associates."
        actions={(
          <>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={exportCsv}>
              <Download aria-hidden="true" className="size-4" /> Export
            </Button>
            <Button size="sm" className="gap-1.5" disabled={list.tableMissing} onClick={() => setLogOpen(true)}>
              <Plus aria-hidden="true" className="size-4" /> Log Communication
            </Button>
          </>
        )}
      />

      {notice ? (
        <p role="status" className="rounded-xl border border-dashed border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
          {notice}
        </p>
      ) : null}
      {list.truncated ? (
        <p className="text-xs text-muted-foreground">Showing the latest {rows.length.toLocaleString('en-IN')} entries.</p>
      ) : null}

      <div role="group" aria-label="Channel" className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <PillTab key={t.id} active={filters.channel === t.id} label={t.label} count={counts[t.id]} onClick={() => set({ channel: t.id })} />
        ))}
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_190px_150px_170px_150px_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search communications" placeholder="Search by associate, subject or message…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <FilterSelect label="Associate" value={filters.associate} onChange={(v) => set({ associate: v })} allLabel="All Associates" options={associates.map((a) => ({ value: a.id, label: a.name || `#${a.id}` }))} />
          <FilterSelect label="Direction" value={filters.direction} onChange={(v) => set({ direction: v })} allLabel="All Directions" options={COMM_DIRECTIONS.map((d) => ({ value: d, label: d }))} />
          <FilterSelect label="Logged by" value={filters.staff} onChange={(v) => set({ staff: v })} allLabel="All Staff" options={staff.map((s) => ({ value: s, label: s }))} />
          <FilterSelect label="Month" value={filters.month} onChange={(v) => set({ month: v })} allLabel="All Months" options={months} />
          <div className="flex items-center justify-end"><Button variant="ghost" size="sm" onClick={reset}>Reset filters</Button></div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title={rows.length === 0 ? 'No communications logged yet.' : 'No communications match your filters.'}
            {...(rows.length === 0 ? {} : { action: <Button variant="outline" size="sm" onClick={reset}>Reset filters</Button> })}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Associate</TableHead>
                  <TableHead className="text-xs">Channel</TableHead>
                  <TableHead className="text-xs">Direction</TableHead>
                  <TableHead className="text-xs">Subject</TableHead>
                  <TableHead className="text-xs">Logged By</TableHead>
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((r, i) => {
                  const Icon = CHANNEL_ICON[r.channel] ?? NotebookPen;
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatIstDateTime(r.createdAt)}</TableCell>
                      <TableCell className="font-medium text-foreground">{r.associateName}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm"><Icon aria-hidden="true" className="size-4 text-primary" />{r.channel}</span>
                      </TableCell>
                      <TableCell className="text-sm">{r.direction}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="truncate font-medium text-foreground">{r.subject}</p>
                          <p className="truncate text-xs text-muted-foreground">{r.message}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{r.createdByName || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="size-8" aria-label={`View ${r.subject}`} title="View" onClick={() => setView(r)}>
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
        <ListPager page={page} pages={pages} shown={current.length} total={filtered.length} noun="entries" onPage={setPage} />
      </Card>

      <LogCommunicationDialog open={logOpen} associates={associates} api={api} token={session.token} onClose={() => setLogOpen(false)} onSaved={reload} />

      <Dialog open={view !== null} onOpenChange={(o) => { if (!o) setView(null); }}>
        <DialogContent
          style={{ width: 'min(520px, calc(100vw - 2rem))', maxWidth: 'min(520px, calc(100vw - 2rem))' }}
          className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
        >
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <DialogTitle className="break-words">{view?.subject}</DialogTitle>
            <DialogDescription>
              {view ? `${view.channel} · ${view.direction} · ${formatIstDateTime(view.createdAt)}${view.createdByName ? ` · ${view.createdByName}` : ''}` : ''}
            </DialogDescription>
          </DialogHeader>
          {view ? (
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-5 text-sm">
              <p className="font-medium text-foreground">{view.associateName}</p>
              <p className="whitespace-pre-wrap break-words text-foreground">{view.message}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
