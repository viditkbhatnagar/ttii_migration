import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import { CohortForm } from './CohortForm.js';

// /admin/cohorts/add and /admin/cohorts/edit/:id (Risha UAT 2026-05-27). The
// Cohorts list now opens the same form in Naji's Add / Edit dialog; these routes
// stay because the sidebar ("Add Cohorts") and older links point at them.
export default function AddCohortPage({ api, session, onNavigate }: AdminPageProps) {
  const editCohortId = useMemo(() => {
    const m = window.location.pathname.match(/\/admin\/cohorts\/edit\/([^/?#]+)/);
    return m?.[1] ?? null;
  }, []);
  const back = () => onNavigate('/admin/cohorts/index');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <button
          type="button"
          onClick={back}
          aria-label="Back to Cohorts"
          className="inline-flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </button>
        <button type="button" onClick={back} className="hover:text-foreground">Cohorts</button>
        <span>/</span>
        <span className="font-medium text-foreground">{editCohortId ? 'Edit Cohort' : 'Add Cohort'}</span>
      </div>
      <PageTitle
        title={editCohortId ? 'Edit Cohort' : 'Add Cohort'}
        subtitle={editCohortId ? 'Update the cohort’s programs, offerings, faculty and dates.' : 'Create a new cohort by selecting a subject and its linked courses.'}
      />
      <Card className="mx-auto max-w-2xl gap-0 p-6 shadow-[var(--shadow-soft)]">
        <CohortForm api={api} token={session.token} editCohortId={editCohortId} layout="page" onSaved={back} onCancel={back} />
      </Card>
    </div>
  );
}
