import { useEffect, useMemo, useState } from 'react';
import { Download, ListChecks, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageLoader } from '@/components/ui/page-loader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { EmptyState, PageTitle } from '../../shared/components/ui-kit.js';
import { FilterSelect, ListPager, PillTab, SortHead } from '../students/list-chrome.js';
import { pageSlice } from '../cohorts/list-model.js';
import {
  FEE_PAGE_SIZE, inr2, installmentCsvRows, rowNo, searchInstallments, sortInstallments, toInstallmentRows,
  type InstallmentSortKey, type SortDir,
} from './fee-model.js';

// Fee Information → Fee Installments in the house list style (TTII 2026-10-12).
// Naji's prototype has no screen for this one, so it takes the look of the
// other rebuilt fee lists. Behaviour is unchanged: the Student / Course /
// Payment Status filters and the plan-status tabs are server-side on
// /admin/fee_management/installments, the counts are the server's, and
// "View Installments" opens the student's page (Payment History tab).

type PlanTab = 'all' | 'fully_added' | 'partially_added' | 'not_added';
const TABS: Array<{ id: PlanTab; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'fully_added', label: 'Fully Added' },
  { id: 'partially_added', label: 'Partially Added' },
  { id: 'not_added', label: 'Not Added' },
];

export default function FeeInstallmentsPage({ api, session, onNavigate }: AdminPageProps) {
  const [studentFilter, setStudentFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState<PlanTab>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<InstallmentSortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [courses, setCourses] = useState<Array<{ value: string; label: string }>>([]);
  const [students, setStudents] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    Promise.all([api.loadCourses(session.token), api.loadStudents(session.token, {})])
      .then(([c, s]) => {
        setCourses(c.map((x) => ({ label: asString(x.title), value: asString(x.id) })));
        setStudents(s.map((x) => ({
          label: asString(x.name) || asString(x.student_name) || 'Unknown',
          value: asString(x._id) || asString(x.id),
        })));
      })
      .catch(() => { /* the filters fall back to empty lists; the table still loads */ });
  }, [api, session.token]);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadFeeInstallments(session.token, {
      ...(courseFilter ? { courseId: courseFilter } : {}),
      ...(activeTab !== 'all' ? { status: activeTab } : {}),
      ...(studentFilter ? { studentId: studentFilter } : {}),
      ...(paymentStatusFilter ? { paymentStatus: paymentStatusFilter } : {}),
    }),
    [courseFilter, activeTab, studentFilter, paymentStatusFilter],
  );

  const counts = data?.counts ?? { fully_added: 0, partially_added: 0, not_added: 0 };
  const countOf = (tab: PlanTab) => (tab === 'all'
    ? asNumber(counts.fully_added) + asNumber(counts.partially_added) + asNumber(counts.not_added)
    : asNumber(counts[tab]));
  const rows = useMemo(() => toInstallmentRows(data?.items ?? []), [data]);
  const filtered = useMemo(() => sortInstallments(searchInstallments(rows, search), sortKey, sortDir), [rows, search, sortKey, sortDir]);
  const { current, pages, page: shownPage } = pageSlice(filtered, page, FEE_PAGE_SIZE);
  useEffect(() => { if (page !== shownPage) setPage(shownPage); }, [page, shownPage]);

  const withPageReset = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setPage(1); };
  const reset = () => { setCourseFilter(''); setStudentFilter(''); setPaymentStatusFilter(''); setSearch(''); setPage(1); };
  const onSort = (k: InstallmentSortKey) => {
    if (k === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };

  if (loading && !data) return <PageLoader label="Loading fee installments..." />;
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
      <PageTitle
        title="Fee Installments"
        subtitle={`${filtered.length} of ${rows.length} students`}
        actions={(
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={filtered.length === 0}
            onClick={() => downloadCsv('fee_installments.csv', toCsv(installmentCsvRows(filtered)))}
          >
            <Download aria-hidden="true" className="size-4" /> Export
          </Button>
        )}
      />

      <div role="group" aria-label="Instalment plan" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <PillTab key={t.id} active={activeTab === t.id} label={t.label} count={countOf(t.id)} onClick={() => withPageReset(setActiveTab)(t.id)} />
        ))}
      </div>

      <Card className="gap-0 border-border/70 p-4 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_220px_220px_160px_auto]">
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search instalment plans" placeholder="Search by student ID, name, course or instalment…" className="pl-9" value={search} onChange={(e) => withPageReset(setSearch)(e.target.value)} />
          </div>
          <FilterSelect label="Student" value={studentFilter} onChange={withPageReset(setStudentFilter)} allLabel="All Students" options={students} />
          <FilterSelect label="Course" value={courseFilter} onChange={withPageReset(setCourseFilter)} allLabel="All Courses" options={courses} />
          <FilterSelect
            label="Payment Status"
            value={paymentStatusFilter}
            onChange={withPageReset(setPaymentStatusFilter)}
            allLabel="All Payment Status"
            options={[{ value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }]}
          />
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>Reset filters</Button>
          </div>
        </div>
      </Card>

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}

      <Card className="gap-0 overflow-hidden border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {current.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={rows.length === 0 ? 'No instalment plans found.' : 'No students match your search.'}
            {...(rows.length === 0 ? {} : { action: <Button variant="outline" size="sm" onClick={reset}>Reset filters</Button> })}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table aria-busy={loading}>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <SortHead label="Student ID" k="studentId" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Name" k="name" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Installment Details" k="details" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Enrolled Course(s)" k="course" sortKey={sortKey} dir={sortDir} onSort={onSort} />
                  <SortHead label="Total Courses Fee" k="totalFee" sortKey={sortKey} dir={sortDir} onSort={onSort} className="text-right" />
                  <TableHead className="text-right text-xs">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {current.map((r, i) => (
                  <TableRow key={r.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground">{rowNo(shownPage, FEE_PAGE_SIZE, i)}</TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-primary">{r.studentId || '-'}</TableCell>
                    <TableCell className="text-sm font-medium">{r.name || '-'}</TableCell>
                    <TableCell className="text-sm">{r.details || '-'}</TableCell>
                    <TableCell className="max-w-[280px] text-sm">
                      {r.courses.length > 1 ? (
                        <ul className="list-inside list-disc text-xs">
                          {r.courses.map((c, j) => <li key={`${c}-${j}`}>{c}</li>)}
                        </ul>
                      ) : (r.courseText || '-')}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm tabular-nums">{inr2(r.totalFee)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!r.viewId}
                        onClick={() => { if (r.viewId) onNavigate(`/admin/students/view/${r.viewId}`); }}
                      >
                        View Installments
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <ListPager page={shownPage} pages={pages} shown={current.length} total={filtered.length} noun="entries" onPage={setPage} />
      </Card>
    </div>
  );
}
