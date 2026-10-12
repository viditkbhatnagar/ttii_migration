import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Eye, Megaphone, MoreHorizontal, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle, Pill } from '../../shared/components/ui-kit.js';
import { DetailsDialog } from '../../shared/components/DetailsDialog.js';
import {
  AUDIENCE_LABEL,
  NO_COHORT,
  STATUS_LABEL,
  announcementCsvRows,
  cohortLabel,
  createdLabel,
  deliveryLabel,
  filterAnnouncements,
  sortAnnouncements,
  toAnnouncementRows,
  type AnnouncementFilters,
  type AnnouncementRow,
  type AnnouncementSortKey,
} from './announcement-model.js';
import { AnnouncementFormDialog } from './AnnouncementFormDialog.js';
import { nextSort, pageSlice, type SortDir } from './list-model.js';
import { ExportButtons, Pager, SortHead } from './list-ui.js';

// Cohorts Management → Announcements (TTII 2026-10-12), rebuilt after Naji's
// AnnouncementsModule: filter card (cohort / status / search), export + print,
// a sortable paged table with a View / Edit / Delete menu, the New / Edit
// dialog and a read-only View dialog. Same endpoints and bodies as before.

const PAGE_SIZE = 10;
const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';
const EMPTY_FILTERS: AnnouncementFilters = { cohortId: '', status: '', search: '' };

export default function AnnouncementsPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const [filters, setFilters] = useState<AnnouncementFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<{ key: AnnouncementSortKey; dir: SortDir }>({ key: 'created', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<{ editing: AnnouncementRow | null } | null>(null);
  const [viewing, setViewing] = useState<AnnouncementRow | null>(null);

  const { data, loading, error, reload } = useAdminPageData(
    async () => toAnnouncementRows(await api.listAnnouncements(session.token)),
    [],
  );
  const { data: cohortsData } = useAdminPageData(() => api.loadAdminCohorts(session.token), []);

  const rows = useMemo(() => data ?? [], [data]);
  const cohorts = useMemo(
    () => toRecords(cohortsData)
      .map((c) => ({ id: asString(c.id), label: asString(c.title) || `Cohort #${asString(c.id)}` }))
      .filter((c) => c.id),
    [cohortsData],
  );
  // Filter options: every cohort, plus any cohort an announcement points at.
  const cohortFilterOptions = useMemo(() => {
    const map = new Map(cohorts.map((c) => [c.id, c.label]));
    for (const r of rows) if (r.cohortId && !map.has(r.cohortId)) map.set(r.cohortId, cohortLabel(r));
    return [...map].map(([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [cohorts, rows]);

  const filtered = useMemo(() => sortAnnouncements(filterAnnouncements(rows, filters), sort.key, sort.dir), [rows, filters, sort]);
  const { current, pages, page: safePage } = pageSlice(filtered, page, PAGE_SIZE);
  useEffect(() => { if (page !== safePage) setPage(safePage); }, [page, safePage]);

  const set = (patch: Partial<AnnouncementFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const onSort = (k: AnnouncementSortKey) => setSort((s) => nextSort(s, k));
  const exportCsv = () => downloadCsv('announcements.csv', toCsv(announcementCsvRows(filtered)));

  const remove = async (row: AnnouncementRow) => {
    const ok = await confirm({
      title: `Delete announcement "${row.title}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await api.deleteAnnouncement(session.token, row.id);
      toast.success(asString(res.message) || 'Announcement deleted.');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete announcement');
    }
  };

  if (loading) return <PageLoader label="Loading announcements..." />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-destructive">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Announcements"
        subtitle="Broadcast updates to cohorts across channels."
        actions={(
          <Button size="sm" className="gap-1.5" onClick={() => setDialog({ editing: null })}>
            <Plus aria-hidden="true" className="size-4" /> Add Announcement
          </Button>
        )}
      />

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-3">
          <select aria-label="Cohort" className={SELECT_CLASS} value={filters.cohortId} onChange={(e) => set({ cohortId: e.target.value })}>
            <option value="">All Cohorts</option>
            <option value={NO_COHORT}>No specific cohort</option>
            {cohortFilterOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <select
            aria-label="Status"
            className={SELECT_CLASS}
            value={filters.status}
            onChange={(e) => set({ status: e.target.value === 'draft' || e.target.value === 'sent' ? e.target.value : '' })}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
          </select>
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search announcements" placeholder="Search..." className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-center justify-between gap-2 p-4">
          <ExportButtons onCsv={exportCsv} disabled={filtered.length === 0} />
          <p className="text-xs text-muted-foreground">{filtered.length} of {rows.length} announcements</p>
        </div>
        {current.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={rows.length === 0 ? 'No announcements yet.' : 'No announcements match your filters.'}
            action={rows.length === 0
              ? <Button size="sm" onClick={() => setDialog({ editing: null })}>Add the first announcement</Button>
              : <Button variant="outline" size="sm" onClick={() => { setFilters(EMPTY_FILTERS); setPage(1); }}>Reset filters</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 text-xs">#</TableHead>
                <SortHead label="Title" k="title" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Cohort" k="cohort" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Audience" k="audience" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Delivery" k="delivery" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Created" k="created" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <TableHead className="text-right text-xs print:hidden">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.map((a, i) => (
                <TableRow key={a.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs text-primary">{(safePage - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="max-w-[260px] text-sm font-medium">
                    <button type="button" className="text-left hover:text-primary hover:underline" onClick={() => setViewing(a)}>
                      {a.title || <span className="italic text-muted-foreground">(untitled)</span>}
                    </button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{cohortLabel(a)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{AUDIENCE_LABEL[a.audienceType]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{deliveryLabel(a.channels)}</TableCell>
                  <TableCell><Pill tone={a.status === 'sent' ? 'emerald' : 'slate'}>{STATUS_LABEL[a.status]}</Pill></TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{createdLabel(a.createdAt)}</TableCell>
                  <TableCell className="text-right print:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${a.title || 'announcement'}`}>
                          <MoreHorizontal aria-hidden="true" className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewing(a)}><Eye aria-hidden="true" /> View</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDialog({ editing: a })}><Pencil aria-hidden="true" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => void remove(a)}><Trash2 aria-hidden="true" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Pager page={safePage} pages={pages} shown={current.length} total={filtered.length} noun="entries" onPage={setPage} />
      </Card>

      <AnnouncementFormDialog
        open={dialog !== null}
        editing={dialog?.editing ?? null}
        cohorts={cohorts}
        api={api}
        token={session.token}
        onClose={() => setDialog(null)}
        onSaved={() => { setDialog(null); reload(); }}
      />

      <DetailsDialog
        open={viewing !== null}
        title={viewing?.title || '(untitled)'}
        subtitle={viewing ? `${cohortLabel(viewing)} · ${createdLabel(viewing.createdAt)}` : ''}
        onClose={() => setViewing(null)}
        rows={viewing ? [
          { label: 'Status', value: STATUS_LABEL[viewing.status] },
          { label: 'Audience', value: AUDIENCE_LABEL[viewing.audienceType] },
          { label: 'Delivery', value: deliveryLabel(viewing.channels) },
          { label: 'Message', value: viewing.content },
          {
            label: 'Attachment',
            value: /^https?:\/\//i.test(viewing.attachmentUrl)
              ? <a href={viewing.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{viewing.attachmentUrl}</a>
              : viewing.attachmentUrl,
          },
        ] : []}
        footer={viewing ? (
          <Button variant="outline" className="gap-1.5" onClick={() => { const v = viewing; setViewing(null); setDialog({ editing: v }); }}>
            <Pencil aria-hidden="true" className="size-4" /> Edit
          </Button>
        ) : null}
      />
    </div>
  );
}
