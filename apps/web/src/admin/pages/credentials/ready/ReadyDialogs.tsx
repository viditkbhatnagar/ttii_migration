import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { Pill } from '../../../shared/components/ui-kit.js';
import type { ReadyRow } from '../credential-issue-types.js';
import { DOC_OPTIONS, choiceDisabled, typesFor, type DocChoice } from './ready-model.js';

const FIELD = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';
const width = (px: number) => { const w = `min(${px}px, calc(100vw - 2rem))`; return { width: w, maxWidth: w }; };

export type HoldKind = 'place' | 'release' | 'override';
const TITLE: Record<HoldKind, string> = { place: 'Place hold', release: 'Release hold', override: 'Manual override to Ready' };
const ACTION = { place: 'place_hold', release: 'release_hold', override: 'override' } as const;

export function HoldDialog({ api, token, target, holdReasons, onClose, onDone }: {
  api: AdminPortalApi; token: string; target: { row: ReadyRow; kind: HoldKind } | null; holdReasons: string[];
  onClose: () => void; onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  if (!target) return null;
  const { row, kind } = target;
  const save = async () => {
    setBusy(true);
    try {
      const res = await api.credentialReadyAction(token, ACTION[kind], { enrolId: row.enrolId, reason: reason.trim(), remarks: remarks.trim() });
      if (!res.ok) { toast.error(res.message || 'Could not update eligibility.'); return; }
      toast.success('Eligibility updated; history retained.');
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update eligibility.');
    } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent style={width(480)}>
        <DialogHeader>
          <DialogTitle>{TITLE[kind]}</DialogTitle>
          <DialogDescription>{row.learner}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="hold-reason">{kind === 'place' ? 'Hold reason' : 'Reason'}</Label>
            {kind === 'place' && holdReasons.length > 0 ? (
              <select id="hold-reason" className={FIELD} value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="">Choose a hold reason</option>
                {holdReasons.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            ) : (
              <Input id="hold-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" />
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="hold-remarks">Remarks</Label>
            <textarea id="hold-remarks" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!reason.trim() || busy} onClick={() => void save()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function IssueDialog({ api, token, rows, initialChoice, onClose, onDone }: {
  api: AdminPortalApi; token: string; rows: ReadyRow[]; initialChoice: DocChoice; onClose: () => void; onDone: () => void;
}) {
  const firstFree = DOC_OPTIONS.find((o) => !choiceDisabled(o.value, rows))?.value ?? initialChoice;
  const [choice, setChoice] = useState<DocChoice>(choiceDisabled(initialChoice, rows) ? firstFree : initialChoice);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const bulk = rows.length > 1;
  const blocked = choiceDisabled(choice, rows);
  const issue = async () => {
    setBusy(true);
    try {
      const res = await api.credentialReadyIssue(token, rows.map((r) => r.enrolId), typesFor(choice));
      if (!res.ok || !res.data) { toast.error(res.message || 'Could not issue the documents.'); return; }
      toast.success('Documents issued.');
      if (res.data.pdfFailures > 0) {
        toast.warning(`${res.data.pdfFailures} PDF(s) could not be generated; use Regenerate PDF on the Issued page.`);
      }
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not issue the documents.');
    } finally { setBusy(false); }
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      <DialogContent style={width(640)} className="@container max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bulk ? 'Bulk credentials' : 'Generate credentials'}</DialogTitle>
          <DialogDescription>{rows.length} learner(s)</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="doc-type">Document type</Label>
            <select id="doc-type" className={FIELD} value={choice} onChange={(e) => setChoice(e.target.value as DocChoice)}>
              {DOC_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} disabled={choiceDisabled(o.value, rows)}>{o.label}</option>
              ))}
            </select>
            {blocked ? <p className="text-xs text-rose-700">A selected learner already has this document; choose another type.</p> : null}
            <p className="text-xs text-muted-foreground">
              {bulk ? 'Review each learner before issuing the selected documents.' : 'Review the learner below before issuing.'}{' '}
              There is no PDF preview step: the real PDF, with its number and verification ID, is generated when you issue.
            </p>
          </div>
          <ul className="grid max-h-64 gap-2 overflow-y-auto rounded-xl border border-border p-3" aria-label="Learners to issue">
            {rows.map((r) => (
              <li key={r.enrolId} className="grid gap-1 border-b border-border pb-2 text-sm last:border-b-0 last:pb-0 @xl:grid-cols-[1fr_auto] @xl:items-start">
                <div className="min-w-0">
                  <p className="font-medium">{r.printedName || r.learner}</p>
                  <p className="text-xs text-muted-foreground">{r.enrolmentNo} · {r.course}</p>
                  <p className="text-xs text-muted-foreground">{r.address || 'No address confirmed'}</p>
                </div>
                <Pill tone={r.nameConfirmed ? 'emerald' : 'amber'}>{r.nameConfirmed ? 'Name confirmed' : 'Name not confirmed'}</Pill>
              </li>
            ))}
          </ul>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={reviewed} onCheckedChange={(v) => setReviewed(v === true)} />
            I have reviewed the details
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button disabled={!reviewed || blocked || busy} onClick={() => void issue()}>{bulk ? `Issue ${rows.length} documents` : 'Issue'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
