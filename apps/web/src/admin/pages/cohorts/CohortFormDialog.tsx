import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { CohortForm } from './CohortForm.js';

const WIDTH = 'min(672px, calc(100vw - 2rem))';

/** Naji's Add Cohort / Edit Cohort dialog. `cohortId` null = add. */
export function CohortFormDialog({
  open, cohortId, api, token, onClose, onSaved,
}: {
  open: boolean;
  cohortId: string | null;
  api: AdminPageProps['api'];
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        style={{ width: WIDTH, maxWidth: WIDTH }}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle>{cohortId ? 'Edit Cohort' : 'Add Cohort'}</DialogTitle>
          <DialogDescription>
            {cohortId ? 'Update the cohort’s programs, offerings, faculty and dates.' : 'Create a new cohort by selecting a subject and its linked courses.'}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <CohortForm
            key={cohortId ?? 'new'}
            api={api}
            token={token}
            editCohortId={cohortId}
            layout="dialog"
            onSaved={onSaved}
            onCancel={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
