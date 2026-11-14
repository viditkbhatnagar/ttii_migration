import { useState } from 'react';
import { toast } from 'sonner';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { pdfFileName, openBlob, saveBlob } from '../credential-issue-hooks.js';
import type { IssuedRow } from '../credential-issue-types.js';

export type ReasonKind = 'Duplicate' | 'Correction' | 'Revoke' | 'Restore';

const failure = (error: unknown, fallback: string): string => (error instanceof Error && error.message ? error.message : fallback);

/** Every row action of the Issued page; `changed` reloads the list (and detail) after a write. */
export function useIssuedActions(api: AdminPortalApi, token: string, changed: () => void) {
  const [busy, setBusy] = useState(false);
  const guard = async (fallback: string, run: () => Promise<void>): Promise<void> => {
    setBusy(true);
    try { await run(); } catch (error) { toast.error(failure(error, fallback)); } finally { setBusy(false); }
  };
  const download = (row: IssuedRow) => guard('The PDF could not be loaded.', async () => {
    saveBlob(await api.credentialIssuedPdf(token, { id: row.id }), pdfFileName(row.documentNo));
  });
  const openPdf = (row: IssuedRow) => guard('The PDF could not be loaded.', async () => {
    openBlob(await api.credentialIssuedPdf(token, { id: row.id, log: false }));
  });
  const print = (row: IssuedRow) => guard('Could not print the original.', async () => {
    const res = await api.credentialIssuedAction(token, 'print', { id: row.id, reason: 'Print Original' });
    if (!res.ok) { toast.error(res.message); return; }
    saveBlob(await api.credentialIssuedPdf(token, { id: row.id, log: false }), pdfFileName(row.documentNo, '-original'));
    toast.info(res.message || 'PDF downloaded for printing; Original copy event recorded.');
    changed();
  });
  const simple = (row: IssuedRow, action: 'resend' | 'regenerate', fallback: string) => guard(fallback, async () => {
    const res = await api.credentialIssuedAction(token, action, { id: row.id });
    if (!res.ok) { toast.error(res.message); return; }
    toast.success(res.message || (action === 'resend' ? 'Portal notification sent.' : 'PDF regenerated.'));
    changed();
  });
  const verify = (url: string) => { window.open(url, '_blank', 'noopener'); };
  const submit = (kind: ReasonKind, row: IssuedRow, reason: string, correctedName: string): Promise<boolean> => {
    let okay = false;
    return guard('The action could not be completed.', async () => {
      if (kind === 'Duplicate') {
        const res = await api.credentialIssuedAction(token, 'duplicate', { id: row.id, reason });
        if (!res.ok) { toast.error(res.message); return; }
        okay = true;
        if (res.data?.eventId) saveBlob(await api.credentialIssuedPdf(token, { id: row.id, event: res.data.eventId }), pdfFileName(row.documentNo, '-duplicate'));
        toast.success(res.message || 'Duplicate copy recorded.');
      } else {
        const action = kind === 'Correction' ? 'correction' : kind === 'Revoke' ? 'revoke' : 'restore';
        const res = await api.credentialIssuedAction(token, action, kind === 'Correction' ? { id: row.id, reason, correctedName } : { id: row.id, reason });
        if (!res.ok) { toast.error(res.message); return; }
        okay = true;
        toast.success(res.message || 'Done.');
      }
      changed();
    }).then(() => okay);
  };
  return { busy, download, openPdf, print, resend: (r: IssuedRow) => simple(r, 'resend', 'Could not resend.'), regenerate: (r: IssuedRow) => simple(r, 'regenerate', 'Could not regenerate the PDF.'), verify, submit };
}
export type IssuedActions = ReturnType<typeof useIssuedActions>;

