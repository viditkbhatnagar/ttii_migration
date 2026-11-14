import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { IssuedRow } from '../credential-issue-types.js';
import { publicUrlOf } from './issued-model.js';
import type { IssuedActions, ReasonKind } from './useIssuedActions.js';

export function RowActionMenu({ row, actions, canRevoke, onView, onAsk }: {
  row: IssuedRow; actions: IssuedActions; canRevoke: boolean; onView: (r: IssuedRow) => void; onAsk: (kind: ReasonKind, r: IssuedRow) => void;
}) {
  const valid = row.status === 'valid';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${row.verificationId}`}><MoreHorizontal aria-hidden="true" className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(row)}>View details</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void actions.download(row)}>Download PDF</DropdownMenuItem>
        <DropdownMenuItem disabled={!valid} onClick={() => void actions.print(row)}>Print Original</DropdownMenuItem>
        <DropdownMenuItem disabled={!valid} onClick={() => onAsk('Duplicate', row)}>Duplicate copy</DropdownMenuItem>
        <DropdownMenuItem disabled={!valid} onClick={() => onAsk('Correction', row)}>Correction</DropdownMenuItem>
        {canRevoke ? (
          <DropdownMenuItem disabled={row.status === 'superseded'} onClick={() => onAsk(row.status === 'revoked' ? 'Restore' : 'Revoke', row)}>
            {row.status === 'revoked' ? 'Restore' : 'Revoke'}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem disabled={!valid} onClick={() => void actions.resend(row)}>Resend portal link</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void actions.regenerate(row)}>Regenerate PDF{row.hasPdf ? '' : ' (missing)'}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => actions.verify(publicUrlOf(row.verificationId))}>Verification</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ReasonDialog({ target, actions, onClose }: {
  target: { kind: ReasonKind; row: IssuedRow } | null; actions: IssuedActions; onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [name, setName] = useState('');
  const [seen, setSeen] = useState<typeof target>(null);
  if (target !== seen) { setSeen(target); setReason(''); setName(target?.row.learner ?? ''); }
  if (!target) return null;
  const { kind, row } = target;
  const w = 'min(460px, calc(100vw - 2rem))';
  const ready = reason.trim() !== '' && (kind !== 'Correction' || name.trim() !== '');
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !actions.busy) onClose(); }}>
      <DialogContent style={{ width: w, maxWidth: w }}>
        <DialogHeader>
          <DialogTitle>{kind}</DialogTitle>
          <DialogDescription>{row.documentNo} · A reason is required.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="action-reason">Action reason</Label>
            <Input id="action-reason" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          {kind === 'Correction' ? (
            <div className="grid gap-1.5">
              <Label htmlFor="corrected-name">Corrected learner name</Label>
              <Input id="corrected-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={actions.busy}>Cancel</Button>
          <Button disabled={!ready || actions.busy} onClick={() => void actions.submit(kind, row, reason.trim(), name.trim()).then((ok) => { if (ok) onClose(); })}>
            {kind === 'Correction' ? 'Issue corrected version' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
