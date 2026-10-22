import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import type { CentreForm, FormMode } from './centre-form-model.js';
import { CentreFormFields } from './CentreFormFields.js';
import { useCentreForm, useCentreFormStart, type CentreFormTarget, type SavedCentre } from './use-centre-form.js';

// Add / Edit Centre as Naji's AddCentreDialog, opened in place from the
// Centre Directory ("Add Centre", row "Edit") and the Centre Profile ("Edit
// Centre", "Add Bank Details"). Add pre-fills the next TTC#### code; Edit
// loads the profile (centre + KYC) when the caller does not already have it.

export type { CentreFormTarget } from './use-centre-form.js';

const DIALOG_WIDTH = 'min(960px, calc(100vw - 2rem))';

export function CentreFormDialog({
  api, token, target, onClose, onSaved,
}: {
  api: AdminPortalApi;
  token: string;
  target: CentreFormTarget | null;
  onClose: () => void;
  onSaved: (saved: SavedCentre) => void;
}) {
  const loaded = useCentreFormStart(api, token, target);
  const isEdit = target?.mode === 'edit';
  return (
    <Dialog open={target !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        style={{ width: DIALOG_WIDTH, maxWidth: DIALOG_WIDTH }}
        className="top-2 flex modal-maxh translate-y-0 flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0 sm:top-[50%] sm:translate-y-[-50%]"
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle>{isEdit ? 'Edit Centre' : 'Add Centre'}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the centre's legal, contact and bank details." : 'Register a new learning centre with legal, contact and bank details.'}
          </DialogDescription>
        </DialogHeader>
        {loaded.state === 'ready' && target ? (
          <FormBody
            key={target.mode === 'add' ? 'add' : target.centreId}
            api={api}
            token={token}
            initial={loaded.initial}
            mode={loaded.mode}
            notice={loaded.notice}
            centreId={target.mode === 'edit' ? target.centreId : undefined}
            onCancel={onClose}
            onSaved={onSaved}
          />
        ) : (
          <div role="status" className="flex min-h-40 flex-1 items-center justify-center gap-2 px-6 py-10 text-sm text-muted-foreground">
            {loaded.state === 'error'
              ? <span className="text-destructive">{loaded.message}</span>
              : <><Loader2 aria-hidden="true" className="size-4 animate-spin" /> Loading…</>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FormBody({
  api, token, initial, mode, notice, centreId, onCancel, onSaved,
}: {
  api: AdminPortalApi;
  token: string;
  initial: CentreForm;
  mode: FormMode;
  notice: string;
  centreId: string | undefined;
  onCancel: () => void;
  onSaved: (saved: SavedCentre) => void;
}) {
  const ctl = useCentreForm({ api, token, mode, initial, centreId });
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void ctl.submit().then((saved) => { if (saved) onSaved(saved); });
      }}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {notice ? <SetupNotice text={notice} /> : null}
        <CentreFormFields ctl={ctl} mode={mode} idPrefix={centreId ? `centre-${centreId}` : 'centre-new'} />
      </div>
      <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={ctl.saving}>
          {ctl.saving ? 'Saving…' : mode.mode === 'edit' ? 'Save Changes' : 'Add Centre'}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Shown when the 2026-10-22 tables are missing: legal, identity, tax and bank fields are hidden. */
export function SetupNotice({ text }: { text: string }) {
  return (
    <p role="note" className="mb-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>{text} Legal, identity, tax and bank details can be added once it is set up.</span>
    </p>
  );
}
