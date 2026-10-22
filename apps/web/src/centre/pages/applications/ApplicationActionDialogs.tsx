import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { usePortalThemeClass } from '@/lib/portal-theme';
import { cn } from '@/lib/utils';
import type { CentrePortalApi } from '../../centre-portal-api.js';
import { messageFromError } from '../../../admin/shared/utils/admin-data-utils.js';
import { str } from '../list-kit/list-kit-model.js';

// Convert and Reject on the existing ownership-guarded endpoints
// (/centre/applications/convert, /centre/applications/update_status).

export interface ActionTarget { id: string; name: string; course: string; email: string }

interface BaseProps {
  api: CentrePortalApi;
  token: string;
  target: ActionTarget | null;
  onClose: () => void;
  onDone: () => void;
}

const DIALOG_STYLE = { width: '100%', maxWidth: 'min(480px, calc(100vw - 2rem))' };

export function ConvertDialog({ api, token, target, onClose, onDone }: BaseProps) {
  const portalTheme = usePortalThemeClass();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const convert = async () => {
    if (!target) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.convertApplication(token, target.id);
      const code = str((res.data as Record<string, unknown> | undefined)?.student_id);
      toast.success(code ? `${target.name} is enrolled — student ID ${code}` : `${target.name} is enrolled`);
      onDone();
    } catch (err: unknown) {
      setError(messageFromError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={target !== null} onOpenChange={(open) => { if (!open && !busy) { setError(''); onClose(); } }}>
      <DialogContent className={cn('[&>*]:min-w-0', portalTheme)} style={DIALOG_STYLE}>
        <DialogHeader>
          <DialogTitle>Convert to student?</DialogTitle>
          <DialogDescription>
            This enrols <span className="font-medium text-foreground">{target?.name}</span>
            {target?.course ? <> in <span className="font-medium text-foreground">{target.course}</span></> : null}: it creates
            their student account and TTS student ID{target?.email ? <>, and emails their login details to {target.email}</> : null}.
            It cannot be undone from the portal.
          </DialogDescription>
        </DialogHeader>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => { void convert(); }} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Convert to student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RejectDialog({ api, token, target, onClose, onDone }: BaseProps) {
  const portalTheme = usePortalThemeClass();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const close = () => {
    if (busy) return;
    setReason('');
    setError('');
    onClose();
  };

  const reject = async () => {
    if (!target) return;
    if (reason.trim().length < 3) { setError('Add a short reason for rejecting.'); return; }
    setBusy(true);
    setError('');
    try {
      await api.rejectApplication(token, target.id, reason.trim());
      toast.success(`Application for ${target.name} rejected`);
      setReason('');
      onDone();
    } catch (err: unknown) {
      setError(messageFromError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={target !== null} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className={cn('[&>*]:min-w-0', portalTheme)} style={DIALOG_STYLE}>
        <DialogHeader>
          <DialogTitle>Reject application?</DialogTitle>
          <DialogDescription>
            The application for <span className="font-medium text-foreground">{target?.name}</span> will be closed and can no longer be converted.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="reject-reason">Reason *</Label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(''); }}
            rows={3}
            maxLength={500}
            placeholder="e.g. Student withdrew"
            className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={() => { void reject(); }} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
