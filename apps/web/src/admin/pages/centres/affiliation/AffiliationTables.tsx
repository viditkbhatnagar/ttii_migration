import { useEffect, useMemo, useState } from 'react';
import { Award, Download, Eye, FileSignature, IndianRupee, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Pill } from '../../../shared/components/ui-kit.js';
import { FilterSelect, ListPager, PillTab, SortHead } from '../../students/list-chrome.js';
import { fmtDate, inr } from '../onboarding/onboarding-model.js';
import type { ViewerDoc } from '../onboarding/onboarding-ui.js';
import {
  AGREEMENT_PILLS, CERTIFICATE_PILLS, DEFAULT_AFFILIATION_FILTERS, centreOptions, filterAgreements, filterCertificates,
  sortAgreements, sortCertificates, statusCounts, statusTone, termLabel,
  type AffiliationFilters, type AgreementRow, type AgreementSortKey, type CertificateRow, type CertificateSortKey, type SortDir,
} from './affiliation-model.js';

// The two tables of Affiliation & Agreements (Naji's AgreementsTab /
// CertificatesTab): pills with counts + the view switch, search + centre
// filter, sortable columns, page size 8, View (in-app PDF viewer) / Download.

const PAGE_SIZE = 8;
export type AffiliationView = 'agreements' | 'certificates';

export function ViewSwitch({ view, onChange }: { view: AffiliationView; onChange: (v: AffiliationView) => void }) {
  const tabs: Array<{ id: AffiliationView; label: string; icon: typeof Award }> = [
    { id: 'agreements', label: 'Agreements', icon: FileSignature },
    { id: 'certificates', label: 'Affiliation Certificates', icon: Award },
  ];
  return (
    <div role="group" aria-label="View" className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-muted/70 p-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={view === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            view === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <t.icon aria-hidden="true" className="size-4" />{t.label}
        </button>
      ))}
    </div>
  );
}

function usePaging<T>(rows: T[]) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  return { page, pages, setPage, current: rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) };
}

function useSort<K extends string>(initial: K) {
  const [key, setKey] = useState<K>(initial);
  const [dir, setDir] = useState<SortDir>('asc');
  const onSort = (k: K) => {
    if (k === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setKey(k); setDir('asc'); }
  };
  return { key, dir, onSort };
}

function Toolbar({ filters, set, placeholder, centres }: {
  filters: AffiliationFilters; set: (p: Partial<AffiliationFilters>) => void; placeholder: string; centres: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-[minmax(0,1fr)_240px]">
      <div className="relative">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Search" placeholder={placeholder} className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
      </div>
      <FilterSelect label="Centre" value={filters.centre} onChange={(v) => set({ centre: v })} allLabel="All centres" options={centres} />
    </div>
  );
}

function CentreCell({ row }: { row: { centreName: string; centreCode: string; inOnboarding: boolean } }) {
  return (
    <div className="min-w-0">
      <div className="font-medium text-foreground">{row.centreName || '—'}</div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <span>Code: {row.centreCode || '—'}</span>
        {row.inOnboarding ? <Pill tone="blue" className="px-1.5 py-0 text-[10px]">In onboarding</Pill> : null}
      </div>
    </div>
  );
}

function FileActions({ url, title, subtitle, onView }: { url: string; title: string; subtitle: string; onView: (d: ViewerDoc) => void }) {
  return (
    <>
      <Button variant="ghost" size="icon" className="size-8" title={url ? 'View' : 'PDF not generated yet'} aria-label={`View ${title}`} disabled={!url} onClick={() => onView({ title, subtitle, url })}>
        <Eye aria-hidden="true" className="size-4" />
      </Button>
      {url ? (
        <Button variant="ghost" size="icon" className="size-8" title="Download" aria-label={`Download ${title}`} asChild>
          <a href={url} download target="_blank" rel="noreferrer"><Download aria-hidden="true" className="size-4" /></a>
        </Button>
      ) : (
        <Button variant="ghost" size="icon" className="size-8" title="PDF not generated yet" aria-label={`Download ${title}`} disabled><Download aria-hidden="true" className="size-4" /></Button>
      )}
    </>
  );
}

export function AgreementsTable({ rows, view, onViewChange, onView, onMarkPaid }: {
  rows: AgreementRow[]; view: AffiliationView; onViewChange: (v: AffiliationView) => void; onView: (d: ViewerDoc) => void; onMarkPaid: (row: AgreementRow) => void;
}) {
  const [filters, setFilters] = useState<AffiliationFilters>(DEFAULT_AFFILIATION_FILTERS);
  const sort = useSort<AgreementSortKey>('no');
  const counts = useMemo(() => statusCounts(rows, AGREEMENT_PILLS), [rows]);
  const centres = useMemo(() => centreOptions(rows), [rows]);
  const filtered = useMemo(() => sortAgreements(filterAgreements(rows, filters), sort.key, sort.dir), [rows, filters, sort.key, sort.dir]);
  const paging = usePaging(filtered);
  const set = (p: Partial<AffiliationFilters>) => { setFilters((f) => ({ ...f, ...p })); paging.setPage(1); };
  const head = (label: string, k: AgreementSortKey) => <SortHead label={label} k={k} sortKey={sort.key} dir={sort.dir} onSort={sort.onSort} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Agreement status" className="flex flex-wrap gap-2">
          {AGREEMENT_PILLS.map((p) => <PillTab key={p} active={filters.status === p} label={p} count={counts[p]} onClick={() => set({ status: p })} />)}
        </div>
        <ViewSwitch view={view} onChange={onViewChange} />
      </div>
      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <Toolbar filters={filters} set={set} placeholder="Search agreement no, centre or code…" centres={centres} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-12 text-xs">#</TableHead>
                {head('Agreement No.', 'no')}
                {head('Centre', 'centre')}
                {head('Effective Date', 'effective')}
                {head('Expiry Date', 'expiry')}
                {head('Term', 'term')}
                {head('Status', 'status')}
                <TableHead className="text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paging.current.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No agreements match your filters.</TableCell></TableRow>
              ) : paging.current.map((a, i) => (
                <TableRow key={a.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs tabular-nums text-muted-foreground">{(paging.page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="whitespace-nowrap font-medium">{a.agreementNo}</TableCell>
                  <TableCell><CentreCell row={a} /></TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDate(a.effectiveDate)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDate(a.expiryDate)}</TableCell>
                  <TableCell className="whitespace-nowrap">{termLabel(a.termYears)}</TableCell>
                  <TableCell>
                    <Pill tone={statusTone(a.status)}>{a.status}</Pill>
                    {!a.feePaid ? <p className="mt-1 whitespace-nowrap text-[11px] text-amber-700">Fee unpaid · {inr(a.feeAmount)}</p> : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <FileActions url={a.fileUrl} title={`Agreement ${a.agreementNo}`} subtitle={`${a.centreName} (${a.centreCode || '—'})`} onView={onView} />
                      {!a.feePaid ? (
                        <Button variant="outline" size="sm" className="ml-1 h-8 gap-1 whitespace-nowrap text-xs" onClick={() => onMarkPaid(a)}>
                          <IndianRupee aria-hidden="true" className="size-3.5" />Mark Fee Paid
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ListPager page={paging.page} pages={paging.pages} shown={paging.current.length} total={filtered.length} noun="agreements" onPage={paging.setPage} />
      </Card>
    </div>
  );
}

export function CertificatesTable({ rows, view, onViewChange, onView, onRegenerate, regenerating }: {
  rows: CertificateRow[]; view: AffiliationView; onViewChange: (v: AffiliationView) => void; onView: (d: ViewerDoc) => void;
  onRegenerate: (row: CertificateRow) => void; regenerating: string;
}) {
  const [filters, setFilters] = useState<AffiliationFilters>(DEFAULT_AFFILIATION_FILTERS);
  const sort = useSort<CertificateSortKey>('no');
  const counts = useMemo(() => statusCounts(rows, CERTIFICATE_PILLS), [rows]);
  const centres = useMemo(() => centreOptions(rows), [rows]);
  const filtered = useMemo(() => sortCertificates(filterCertificates(rows, filters), sort.key, sort.dir), [rows, filters, sort.key, sort.dir]);
  const paging = usePaging(filtered);
  const set = (p: Partial<AffiliationFilters>) => { setFilters((f) => ({ ...f, ...p })); paging.setPage(1); };
  const head = (label: string, k: CertificateSortKey) => <SortHead label={label} k={k} sortKey={sort.key} dir={sort.dir} onSort={sort.onSort} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Certificate status" className="flex flex-wrap gap-2">
          {CERTIFICATE_PILLS.map((p) => <PillTab key={p} active={filters.status === p} label={p} count={counts[p]} onClick={() => set({ status: p })} />)}
        </div>
        <ViewSwitch view={view} onChange={onViewChange} />
      </div>
      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <Toolbar filters={filters} set={set} placeholder="Search certificate no, centre or code…" centres={centres} />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-12 text-xs">#</TableHead>
                {head('Certificate No.', 'no')}
                {head('Centre', 'centre')}
                {head('Valid From', 'from')}
                {head('Valid To', 'to')}
                {head('Status', 'status')}
                <TableHead className="text-right text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paging.current.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No certificates match your filters.</TableCell></TableRow>
              ) : paging.current.map((c, i) => (
                <TableRow key={c.id} className="hover:bg-muted/30">
                  <TableCell className="text-xs tabular-nums text-muted-foreground">{(paging.page - 1) * PAGE_SIZE + i + 1}</TableCell>
                  <TableCell className="whitespace-nowrap font-medium">{c.certificateNo}</TableCell>
                  <TableCell><CentreCell row={c} /></TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDate(c.validFrom)}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmtDate(c.validTo)}</TableCell>
                  <TableCell><Pill tone={statusTone(c.status)}>{c.status}</Pill></TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <FileActions url={c.fileUrl} title={`Certificate ${c.certificateNo}`} subtitle={`${c.centreName} (${c.centreCode || '—'})`} onView={onView} />
                      {!c.fileUrl && c.status !== 'Revoked' ? (
                        <Button variant="ghost" size="icon" className="size-8" title="Regenerate PDF" aria-label={`Regenerate PDF for ${c.certificateNo}`} disabled={regenerating === c.id} onClick={() => onRegenerate(c)}>
                          <RefreshCw aria-hidden="true" className={cn('size-4', regenerating === c.id && 'animate-spin motion-reduce:animate-none')} />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ListPager page={paging.page} pages={paging.pages} shown={paging.current.length} total={filtered.length} noun="certificates" onPage={paging.setPage} />
      </Card>
    </div>
  );
}
