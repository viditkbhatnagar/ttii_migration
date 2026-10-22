import { useMemo } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import type { CentreForm, FormMode } from './centre-form-model.js';
import { CentreFormFields } from './CentreFormFields.js';
import { SetupNotice } from './CentreFormDialog.js';
import { useCentreForm, useCentreFormStart, type CentreFormTarget } from './use-centre-form.js';

// /admin/centres/add and /admin/centres/edit/:id — the same Add / Edit Centre
// form as the in-place dialog (Naji's AddCentreDialog), as a full page for
// direct links. Saving opens the centre's profile.

function targetFromPath(): CentreFormTarget {
  const m = /\/admin\/centres\/edit\/([^/?#]+)/.exec(window.location.pathname);
  return m?.[1] ? { mode: 'edit', centreId: decodeURIComponent(m[1]) } : { mode: 'add' };
}

export default function AddCentrePage({ api, session, onNavigate }: AdminPageProps) {
  const target = useMemo(targetFromPath, []);
  const start = useCentreFormStart(api, session.token, target);
  const isEdit = target.mode === 'edit';
  const cancel = () => onNavigate(isEdit ? `/admin/centres/view/${target.centreId}` : '/admin/centres/index');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={cancel}
          aria-label={isEdit ? 'Back to the centre' : 'Back to Centre Directory'}
          className="inline-flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </button>
        <PageTitle
          title={isEdit ? 'Edit Centre' : 'Add Centre'}
          subtitle={isEdit ? "Update the centre's legal, contact and bank details." : 'Register a new learning centre with legal, contact and bank details.'}
        />
      </div>
      {start.state === 'ready' ? (
        <PageForm
          api={api}
          token={session.token}
          initial={start.initial}
          mode={start.mode}
          notice={start.notice}
          centreId={isEdit ? target.centreId : undefined}
          onCancel={cancel}
          onSaved={(id) => onNavigate(`/admin/centres/view/${id}`)}
        />
      ) : (
        <Card className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          {start.state === 'error'
            ? <span role="alert" className="text-destructive">{start.message}</span>
            : <><Loader2 aria-hidden="true" className="size-4 animate-spin" /> Loading…</>}
        </Card>
      )}
    </div>
  );
}

function PageForm({
  api, token, initial, mode, notice, centreId, onCancel, onSaved,
}: {
  api: AdminPageProps['api'];
  token: string;
  initial: CentreForm;
  mode: FormMode;
  notice: string;
  centreId: string | undefined;
  onCancel: () => void;
  onSaved: (id: string) => void;
}) {
  const ctl = useCentreForm({ api, token, mode, initial, centreId });
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void ctl.submit().then((saved) => { if (saved?.id) onSaved(saved.id); });
      }}
      className="space-y-4"
    >
      <Card className="gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)] sm:p-6">
        {notice ? <SetupNotice text={notice} /> : null}
        <CentreFormFields ctl={ctl} mode={mode} idPrefix={centreId ? `centre-page-${centreId}` : 'centre-page-new'} />
      </Card>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={ctl.saving}>{ctl.saving ? 'Saving…' : mode.mode === 'edit' ? 'Save Changes' : 'Add Centre'}</Button>
      </div>
    </form>
  );
}
