import { useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageLoader } from '@/components/ui/page-loader';
import { downloadCsv, toCsv } from '@/lib/csv';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import { messageFromError } from '../../shared/utils/admin-data-utils.js';
import { stageLabel } from '../applications/application-list-model.js';
import { PillTab } from '../students/list-chrome.js';
import { LoadError } from './associate-mgmt-ui.js';
import {
  EMPTY_STUDENT_QUERY, STUDENT_TABS, studentCsvRows,
  type AssociateStudentRow, type StudentQuery, type StudentSortKey,
} from './associate-mgmt-model.js';
import { AssociateStudentTable, StudentFilterCard } from './associate-students-ui.js';
import { useAssociateStudents } from './use-associate-students.js';

// Admin → Associate Management → Associate Students, after Naji's
// AssociateStudentsModule (TTII 2026-10-12). READ-ONLY: every lead and student
// owned by an associate (applications.pipeline_user = an associate), paged,
// filtered and sorted on the server, with export and a link to the
// application (or the student once converted).
// Not built: "Add Referral" (a new write path — leads are added from
// Applications or by the associate) and the inline Stage dropdown (stages move
// through the Applications pipeline, which owns its rules); the Commission
// column (no commission rules exist yet — see Commissions).

export default function AssociateStudentsPage({ api, session, onNavigate }: AdminPageProps) {
  const [query, setQuery] = useState<StudentQuery>(EMPTY_STUDENT_QUERY);
  const [selected, setSelected] = useState<Map<string, AssociateStudentRow>>(new Map());
  const [exporting, setExporting] = useState(false);
  const { page, loaded, loading, error, reload, exportAll } = useAssociateStudents(api, session.token, query);

  const set = (patch: Partial<StudentQuery>) => setQuery((q) => ({ ...q, ...patch, page: patch.page ?? 1 }));
  const reset = () => setQuery(EMPTY_STUDENT_QUERY);
  const onSort = (k: StudentSortKey) =>
    setQuery((q) => ({ ...q, sort: k, dir: q.sort === k && q.dir === 'desc' ? 'asc' : 'desc', page: 1 }));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = selected.size > 0 ? [...selected.values()] : await exportAll();
      downloadCsv('associate-students.csv', toCsv(studentCsvRows(rows, stageLabel)));
      toast.success(`Exported ${rows.length} row${rows.length === 1 ? '' : 's'}`);
    } catch (e: unknown) {
      toast.error(messageFromError(e));
    } finally {
      setExporting(false);
    }
  };

  if (!loaded && loading) return <PageLoader label="Loading associate students..." />;
  if (error && !loaded) return <LoadError message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Associate Students"
        subtitle={`${page.counts.all.toLocaleString('en-IN')} leads and students referred by associates`}
        actions={(
          <Button variant="outline" size="sm" className="gap-1.5" disabled={exporting || page.total === 0} onClick={() => void exportCsv()}>
            <Download aria-hidden="true" className="size-4" /> Export{selected.size ? ` (${selected.size})` : ''}
          </Button>
        )}
      />

      <div role="group" aria-label="Stage" className="flex flex-wrap gap-2">
        {STUDENT_TABS.map((t) => (
          <PillTab key={t.id} active={query.tab === t.id} label={t.label} count={page.counts[t.id]} onClick={() => set({ tab: t.id })} />
        ))}
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
        variant="students"
        page={page}
        query={query}
        loading={loading}
        onSort={onSort}
        onPage={(p) => set({ page: p })}
        selected={selected}
        onSelect={setSelected}
        onOpen={onNavigate}
        onReset={reset}
        emptyTitle="No associate has a lead yet."
      />
      <p className="text-xs text-muted-foreground">
        Fee is the application&apos;s final fee; its status is the payment recorded on the application (registration / payment link), not instalments paid after enrolment.
      </p>
    </div>
  );
}
