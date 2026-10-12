import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { messageFromError } from '../../shared/utils/admin-data-utils.js';
import {
  COMM_CHANNELS, COMM_DIRECTIONS, COMM_MESSAGE_MAX, COMM_SUBJECT_MAX, EMPTY_COMM_DRAFT, validateCommDraft, type CommDraft,
} from './associate-mgmt-model.js';

// Naji's LogCommDialog in "log" mode only: records a call / WhatsApp / email /
// note that ALREADY happened. It sends nothing — the prototype's "Send
// Message" mode (wa.me / mailto) is deliberately not built.

const CONTROL = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

function Field({ id, label, error, className, children }: { id: string; label: string; error?: string | undefined; className?: string; children: React.ReactNode }) {
  return (
    <div className={`grid gap-1.5 ${className ?? ''}`}>
      <Label htmlFor={id} className="text-xs font-semibold text-foreground">{label}<span className="text-destructive"> *</span></Label>
      {children}
      {error ? <p id={`${id}-error`} className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function LogCommunicationDialog({ open, associates, api, token, onClose, onSaved }: {
  open: boolean;
  associates: Array<{ id: string; name: string }>;
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState<CommDraft>(EMPTY_COMM_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setD(EMPTY_COMM_DRAFT); setErrors({}); } }, [open]);
  const set = (k: keyof CommDraft) => (v: string) => setD((s) => ({ ...s, [k]: v }));
  const aria = (k: string) => (errors[k] ? { 'aria-invalid': true, 'aria-describedby': `comm-${k}-error` } : {});

  const save = async () => {
    const e = validateCommDraft(d);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSaving(true);
    try {
      const res = await api.logAssociateCommunication(token, {
        associateId: d.associateId, channel: d.channel, direction: d.direction, subject: d.subject.trim(), message: d.message.trim(),
      });
      if (res.status !== 1) { toast.error(res.message || 'Could not log the communication.'); return; }
      toast.success(res.message || 'Communication logged.');
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(messageFromError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent
        style={{ width: 'min(560px, calc(100vw - 2rem))', maxWidth: 'min(560px, calc(100vw - 2rem))' }}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
      >
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); void save(); }} noValidate>
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <DialogTitle>Log Communication</DialogTitle>
            <DialogDescription>Record a conversation that already happened. Nothing is sent to the associate.</DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
            <Field id="comm-associateId" label="Associate" error={errors.associateId} className="sm:col-span-2">
              <select id="comm-associateId" className={CONTROL} value={d.associateId} onChange={(e) => set('associateId')(e.target.value)} {...aria('associateId')}>
                <option value="">Select associate</option>
                {associates.map((a) => <option key={a.id} value={a.id}>{a.name || `Associate #${a.id}`} (#{a.id})</option>)}
              </select>
            </Field>
            <Field id="comm-channel" label="Channel" error={errors.channel}>
              <select id="comm-channel" className={CONTROL} value={d.channel} onChange={(e) => set('channel')(e.target.value)} {...aria('channel')}>
                {COMM_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field id="comm-direction" label="Direction" error={errors.direction}>
              <select id="comm-direction" className={CONTROL} value={d.direction} onChange={(e) => set('direction')(e.target.value)} {...aria('direction')}>
                {COMM_DIRECTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field id="comm-subject" label="Subject" error={errors.subject} className="sm:col-span-2">
              <Input id="comm-subject" value={d.subject} maxLength={COMM_SUBJECT_MAX} onChange={(e) => set('subject')(e.target.value)} {...aria('subject')} />
            </Field>
            <Field id="comm-message" label="Summary / Notes" error={errors.message} className="sm:col-span-2">
              <textarea
                id="comm-message"
                rows={5}
                maxLength={COMM_MESSAGE_MAX}
                className={`${CONTROL} h-auto min-h-[110px] resize-y py-2`}
                value={d.message}
                onChange={(e) => set('message')(e.target.value)}
                {...aria('message')}
              />
            </Field>
          </div>

          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Log'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
