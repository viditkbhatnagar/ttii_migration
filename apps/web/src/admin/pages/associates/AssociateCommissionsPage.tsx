import { useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import { messageFromError } from '../../shared/utils/admin-data-utils.js';
import { LoadError, SetupNeededCard } from './associate-mgmt-ui.js';
import {
  EMPTY_STUDENT_QUERY, commissionBasisCsvRows,
  type AssociateStudentRow, type StudentQuery, type StudentSortKey,
} from './associate-mgmt-model.js';
import { AssociateStudentTable, StudentFilterCard } from './associate-students-ui.js';
import { useAssociateStudents } from './use-associate-students.js';

// Admin → Associate Management → Commissions, in the layout of Naji's
// AssociateCommissionsModule (TTII 2026-10-12) — as an honest "Set-up needed"
// page. The LMS has no commission rules, amounts, approvals or payouts, and
// those rules are an owed product decision, so NO amounts are shown or
// invented. What is real: the confirmed enrolments by associates that
// commissions would be calculated on (applications.pipeline_user = an
// associate AND is_converted = 1), read-only, filterable and exportable.
// Not built: the Pending / Approved / Paid / On Hold KPIs and tabs, Approve /
// Hold / Mark Paid (bulk or per row) and Record Payout — all need the
// decisions listed on the page and new tables.

const DECISIONS = [
  'Rate: a flat amount per enrolment or a percentage, and whether it is set per associate, per course or both.',
  'Base: which fee it is calculated on (course fee, fee after discount, fee excluding GST, or only what has actually been collected).',
  'When it becomes due: on enrolment, on the first instalment, or once the full fee is paid; and what happens on a refund or drop-out.',
  'Flow: the approve, hold and pay steps, and what a payout records (UTR / reference, date, TDS if any).',
  'Who approves and who pays: which roles can approve, hold and mark commissions paid.',
];

const COMMISSIONS_QUERY: StudentQuery = { ...EMPTY_STUDENT_QUERY, tab: 'enrolled', monthBy: 'enrolled', sort: 'enrolled' };

export default function AssociateCommissionsPage({ api, session, onNavigate }: AdminPageProps) {
  const [query, setQuery] = useState<StudentQuery>(COMMISSIONS_QUERY);
  const [selected, setSelected] = useState<Map<string, AssociateStudentRow>>(new Map());
  const [exporting, setExporting] = useState(false);
  const { page, loaded, loading, error, reload, exportAll } = useAssociateStudents(api, session.token, query);

  // The tab stays on 'enrolled': this list is the commission basis only.
  const set = (patch: Partial<StudentQuery>) => setQuery((q) => ({ ...q, ...patch, tab: 'enrolled', monthBy: 'enrolled', page: patch.page ?? 1 }));
  const reset = () => setQuery(COMMISSIONS_QUERY);
  const onSort = (k: StudentSortKey) =>
    setQuery((q) => ({ ...q, sort: k, dir: q.sort === k && q.dir === 'desc' ? 'asc' : 'desc', page: 1 }));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = selected.size > 0 ? [...selected.values()] : await exportAll();
      downloadCsv('associate-confirmed-enrolments.csv', toCsv(commissionBasisCsvRows(rows)));
      toast.success(`Exported ${rows.length} enrolment${rows.length === 1 ? '' : 's'}`);
    } catch (e: unknown) {
      toast.error(messageFromError(e));
    } finally {
      setExporting(false);
    }
  };

  if (!loaded && loading) return <PageLoader label="Loading commissions..." />;
  if (error && !loaded) return <LoadError message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Commissions"
        subtitle="Commission on each confirmed enrolment by an associate."
        actions={(
          <Button variant="outline" size="sm" className="gap-1.5" disabled={exporting || page.total === 0} onClick={() => void exportCsv()}>
            <Download aria-hidden="true" className="size-4" /> Export{selected.size ? ` (${selected.size})` : ''}
          </Button>
        )}
      />

      <SetupNeededCard
        title="Commission rules are not set up yet"
        what="This page will work out each associate's commission on every confirmed enrolment, then let you approve, hold and record payouts with a reference. Until the rules below are agreed, no commission amounts are calculated or shown — only the enrolments they would be based on."
        decisions={DECISIONS}
      />

      <div>
        <h2 className="text-sm font-semibold text-foreground">Confirmed enrolments by associates</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {page.counts.enrolled.toLocaleString('en-IN')} enrolment{page.counts.enrolled === 1 ? '' : 's'} — the basis commissions would be calculated on. No amounts until the rules are set.
        </p>
      </div>

      <StudentFilterCard
        query={query}
        page={page}
        searchPlaceholder="Search by student, application ID, phone or email…"
        onChange={set}
        onReset={reset}
      />

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      <AssociateStudentTable
        variant="commissions"
        page={page}
        query={query}
        loading={loading}
        onSort={onSort}
        onPage={(p) => set({ page: p })}
        selected={selected}
        onSelect={setSelected}
        onOpen={onNavigate}
        onReset={reset}
        emptyTitle="No associate enrolments yet."
      />
    </div>
  );
}
