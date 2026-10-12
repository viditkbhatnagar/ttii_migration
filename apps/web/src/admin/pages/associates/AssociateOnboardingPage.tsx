import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { EmptyState, PageTitle, Pill } from '../../shared/components/ui-kit.js';
import { StaffFormDialog } from '../counsellor/StaffFormDialog.js';
import { formatYmd } from '../counsellor/staff-model.js';
import { formatIstDateTime } from '../counsellor/staff-profile-model.js';
import { FilterSelect, ListPager, PillTab } from '../students/list-chrome.js';
import { AssocAvatar, LoadError, SetupNeededCard } from './associate-mgmt-ui.js';
import {
  EMPTY_ONBOARDING_FILTERS, ONBOARDING_TABS, dash, filterOnboarding, onboardingCounts, onboardingCsvRows, toOnboardingRows,
  uniqSorted, type OnboardingFilters,
} from './associate-mgmt-model.js';

// Admin → Associate Management → Onboarding, in the layout of Naji's
// AssociateOnboardingModule (TTII 2026-10-12) — as an honest "Set-up needed"
// page. There is no KYC, bank or approval data in the LMS and what to collect
// is an owed product decision, so no PAN / Aadhaar / bank / commission columns
// are invented. What is real: every associate account with the day it was
// created, its status, and its first and latest real sign-in (auth_audit_log:
// password, Google/Microsoft or OTP login). "Add Associate" is the SAME create
// dialog and endpoint as the Associates directory.
// Not built: Pending Review / Approved / Rejected, Approve / Reject (bulk or
// per row), the reject reason and "Move back to review" — they need an
// onboarding status that does not exist; the 5-step KYC / bank / commission
// wizard.

const PAGE_SIZE = 10;
const DECISIONS = [
  'KYC: which details and documents to collect (PAN, Aadhaar, photo ID, address proof), and whether they are mandatory before an associate can sign in.',
  'Bank details: whether account number and IFSC are stored in the LMS at all (they are sensitive financial data), or kept with Finance outside it.',
  'Approval flow: whether a new associate starts as "Pending review", who approves or rejects (and with what reason), and what an associate can do before approval.',
  'Agreement: whether the associate must accept a written agreement, and whether the LMS records when they accepted it.',
];

export default function AssociateOnboardingPage({ api, session }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(() => api.loadAssociateOnboarding(session.token), []);
  const [filters, setFilters] = useState<OnboardingFilters>(EMPTY_ONBOARDING_FILTERS);
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => toOnboardingRows(data ?? []), [data]);
  const centres = useMemo(() => uniqSorted(rows.map((r) => r.centre)), [rows]);
  const counts = useMemo(() => onboardingCounts(filterOnboarding(rows, { ...filters, tab: 'all' })), [rows, filters]);
  const filtered = useMemo(() => filterOnboarding(rows, filters), [rows, filters]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  useEffect(() => { if (page > pages) setPage(pages); }, [page, pages]);
  const current = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const set = (patch: Partial<OnboardingFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const reset = () => { setFilters(EMPTY_ONBOARDING_FILTERS); setPage(1); };

  if (loading && !data) return <PageLoader label="Loading associate onboarding..." />;
  if (error) return <LoadError message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Associate Onboarding"
        subtitle="Associate accounts and when they first signed in."
        actions={(
          <>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={filtered.length === 0} onClick={() => downloadCsv('associate-onboarding.csv', toCsv(onboardingCsvRows(filtered)))}>
              <Download aria-hidden="true" className="size-4" /> Export
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => setAdding(true)}>
              <Plus aria-hidden="true" className="size-4" /> Add Associate
            </Button>
          </>
        )}
      />

      <SetupNeededCard
        title="KYC, bank details and approval are not set up yet"
        what="This page will review each new associate's KYC and bank details and approve or reject them before they are activated. Until the points below are decided, it lists the real associate accounts only — no KYC or bank fields are collected or shown."
        decisions={DECISIONS}
      />

      <div role="group" aria-label="Sign-in status" className="flex flex-wrap gap-2">
        {ONBOARDING_TABS.map((t) => (
          <PillTab key={t.id} active={filters.tab === t.id} label={t.label} count={counts[t.id]} onClick={() => set({ tab: t.id })} />
        ))}
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search associates" placeholder="Search by name, ID, email or phone…" className="pl-9" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
          </div>
          <FilterSelect label="Centre" value={filters.centre} onChange={(v) => set({ centre: v })} allLabel="All Centres" options={centres.map((c) => ({ value: c, label: c }))} />
          <div className="flex items-center justify-end"><Button variant="ghost" size="sm" onClick={reset}>Reset filters</Button></div>
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState
            icon={Users}
            title={rows.length === 0 ? 'No associates yet.' : 'No associates match your filters.'}
            {...(rows.length === 0 ? {} : { action: <Button variant="outline" size="sm" onClick={reset}>Reset filters</Button> })}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">Associate</TableHead>
                  <TableHead className="text-xs">Account Created</TableHead>
                  <TableHead className="text-xs">Centre</TableHead>
                  <TableHead className="text-xs">First Sign-in</TableHead>
                  <TableHead className="text-xs">Last Sign-in</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((r, i) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground">{(page - 1) * PAGE_SIZE + i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <AssocAvatar name={r.name} />
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{dash(r.name)}</p>
                          <p className="text-xs text-muted-foreground">#{r.id} · {dash(r.phone)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{dash(formatYmd(r.createdAt))}</TableCell>
                    <TableCell className="text-sm">{dash(r.centre)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {r.firstSignIn ? formatIstDateTime(r.firstSignIn) : <span className="text-muted-foreground">Never signed in</span>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{dash(formatIstDateTime(r.lastSignIn))}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Pill tone={r.isActive ? 'emerald' : 'slate'}>{r.isActive ? 'Active' : 'Inactive'}</Pill>
                        {r.loginDisabled ? <Pill tone="rose">Login disabled</Pill> : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <ListPager page={page} pages={pages} shown={current.length} total={filtered.length} noun="associates" onPage={setPage} />
      </Card>
      <p className="text-xs text-muted-foreground">
        Sign-ins come from the sign-in audit log (password, Google / Microsoft or OTP). Sign-ins from before the log began are not on record.
      </p>

      <StaffFormDialog kind="associate" target={adding ? 'add' : null} api={api} token={session.token} onClose={() => setAdding(false)} onSaved={reload} />
    </div>
  );
}
