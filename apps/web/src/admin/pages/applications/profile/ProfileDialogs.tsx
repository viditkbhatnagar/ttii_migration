import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { asString, toRecords } from '../../../shared/utils/admin-data-utils.js';
import { localYmd } from '../application-list-model.js';

// The three dialogs the profile opens: Mark as Paid (manual payment → Finance
// approval), Reject (with a reason) and Reassign Pipeline. Each reads the
// server's {status, message} and toasts it.

const FIELD_CLASS = 'flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60';

function serverMessage(res: unknown): { ok: boolean; message: string } {
  const r = (res ?? {}) as { status?: unknown; message?: unknown };
  return { ok: r.status === 1 || asString(r.status) === '1', message: asString(r.message) };
}

function Shell({
  open, onOpenChange, title, description, width, children, footer,
}: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; width: number; children: ReactNode; footer: ReactNode }) {
  const size = `min(${width}px, calc(100vw - 2rem))`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ width: size, maxWidth: size }} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">{children}</div>
        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface BaseProps { open: boolean; onOpenChange: (o: boolean) => void; api: AdminPortalApi; token: string; applicationId: string; onDone: () => void }

/** Naji 2026-05-09 — Mark as Paid: mode, amount, date, reference and a receipt are all required. */
export function MarkPaidDialog({ open, onOpenChange, api, token, applicationId, onDone }: BaseProps) {
  const today = localYmd(new Date());
  const [mode, setMode] = useState('cash');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [reference, setReference] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('cash'); setAmount(''); setDate(localYmd(new Date())); setReference(''); setReceiptUrl('');
  }, [open]);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const res = await api.uploadFile(token, file);
      setReceiptUrl(res.url);
      toast.success('Receipt uploaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    const amountNum = Number(amount);
    if (!(amountNum > 0)) { toast.error('Amount received is required.'); return; }
    if (!date) { toast.error('Date of payment is required.'); return; }
    if (date > today) { toast.error('Date of payment cannot be in the future.'); return; }
    if (!reference.trim()) { toast.error('Reference number is required.'); return; }
    if (!receiptUrl.trim()) { toast.error('Receipt is required.'); return; }
    setSaving(true);
    try {
      const res = await api.markApplicationPaid(token, applicationId, { mode, amount: amountNum, paidDate: date, reference: reference.trim(), receipt_url: receiptUrl });
      const { ok, message } = serverMessage(res);
      if (ok) {
        // Manual payments go to Finance for approval — show the server's message.
        toast.success(message || 'Manual payment recorded — pending finance approval.');
        onOpenChange(false);
        onDone();
      } else toast.error(message || 'Could not mark paid.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed.');
    } finally {
      setSaving(false);
    }
  };

  const thisYear = new Date().getFullYear();
  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title="Mark as Paid"
      description="Record a payment received outside the payment link. Finance approves it before it counts."
      width={480}
      footer={(
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => void submit()}
            disabled={saving || uploading || !(Number(amount) > 0) || !reference.trim() || !receiptUrl}
          >
            {saving ? 'Saving…' : 'Mark as Paid'}
          </Button>
        </>
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="mp-mode">Mode</Label>
        <select id="mp-mode" value={mode} onChange={(e) => setMode(e.target.value)} className={FIELD_CLASS}>
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cheque">Cheque</option>
          <option value="card">Card / POS</option>
          <option value="upi">UPI</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mp-amount">Amount Received (₹) *</Label>
        <Input id="mp-amount" type="number" min="1" step="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Actual amount received" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mp-date">Date of Payment *</Label>
        <DmyDateInput id="mp-date" value={date} onChange={setDate} minYear={2015} maxYear={thisYear} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mp-ref">Reference Number *</Label>
        <Input id="mp-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. Cheque no., Bank ref, UPI txn ID" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mp-receipt">Receipt *</Label>
        {receiptUrl ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <span className="min-w-0 flex-1 truncate">Uploaded: {receiptUrl.split('/').pop()}</span>
            <button type="button" className="text-xs text-emerald-700 underline" onClick={() => setReceiptUrl('')}>Replace</button>
          </div>
        ) : (
          <input
            id="mp-receipt"
            type="file"
            accept="image/*,application/pdf"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
          />
        )}
        {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
      </div>
    </Shell>
  );
}

/** Reject with a reason — the real stage-machine transition (stage='rejected' + reason + timeline + notification). */
export function RejectDialog({ open, onOpenChange, api, token, applicationId, onDone }: BaseProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setReason(''); }, [open]);

  const submit = async () => {
    if (!reason.trim()) { toast.error('Please enter a reason for rejection.'); return; }
    setSaving(true);
    try {
      const { ok, message } = serverMessage(await api.rejectApplication(token, applicationId, reason.trim()));
      if (ok) {
        toast.success(message || 'Application rejected.');
        onOpenChange(false);
        onDone();
      } else toast.error(message || 'Could not reject the application.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject application');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title="Reject Application"
      description="Are you sure you want to reject this application? Please provide a reason below."
      width={480}
      footer={(
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button variant="destructive" onClick={() => void submit()} disabled={saving || !reason.trim()}>
            {saving ? 'Rejecting...' : 'Reject Application'}
          </Button>
        </>
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="reject-reason">Reason for Rejection *</Label>
        <textarea
          id="reject-reason"
          className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for rejection"
        />
      </div>
    </Shell>
  );
}

// Pipeline label → role_id, mirroring AddApplicationPage and the backend labels.
const PIPELINE_ROLE_MAP: Record<string, number> = { Admin: 8, Counsellor: 9, Associate: 10 };
const PIPELINE_OPTIONS = ['Admin', 'Counsellor', 'Associate'] as const;

/** Naji 2026-07-08 — correct a lead's owner without the full Edit Application form. */
export function ReassignDialog({
  open, onOpenChange, api, token, applicationId, onDone, currentPipeline, currentUserId, currentUserName,
}: BaseProps & { currentPipeline: string; currentUserId: string; currentUserName: string }) {
  const [pipeline, setPipeline] = useState('');
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prefill = (PIPELINE_OPTIONS as readonly string[]).includes(currentPipeline) ? currentPipeline : '';
    setPipeline(prefill);
    // Keep the current owner only when its pipeline is prefilled, so the id matches a loaded option.
    setUserId(prefill ? currentUserId : '');
  }, [open, currentPipeline, currentUserId]);

  useEffect(() => {
    const roleId = PIPELINE_ROLE_MAP[pipeline];
    if (!open || !roleId) { setUsers([]); return; }
    let cancelled = false;
    setLoadingUsers(true);
    api.loadPipelineUsers(token, roleId)
      .then((rows) => {
        if (cancelled) return;
        const loaded = toRecords(rows);
        setUsers(loaded);
        // Drop a stale prefilled owner (e.g. a deleted user absent from the list).
        setUserId((cur) => (cur && loaded.some((u) => asString(u.id) === cur) ? cur : ''));
      })
      .catch(() => { if (!cancelled) setUsers([]); })
      .finally(() => { if (!cancelled) setLoadingUsers(false); });
    return () => { cancelled = true; };
  }, [open, pipeline, api, token]);

  const submit = async () => {
    if (!pipeline) { toast.error('Please choose a pipeline.'); return; }
    if (!userId) { toast.error('Please choose a pipeline user.'); return; }
    setSaving(true);
    try {
      const { ok, message } = serverMessage(await api.reassignApplicationPipeline(token, applicationId, pipeline, userId));
      if (ok) {
        toast.success(message || 'Pipeline reassigned.');
        onOpenChange(false);
        onDone();
      } else toast.error(message || 'Could not reassign pipeline.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reassign pipeline.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell
      open={open}
      onOpenChange={onOpenChange}
      title="Reassign Pipeline"
      description={`Currently ${currentPipeline || '-'}${currentUserName ? ` · ${currentUserName}` : ''}. Choose the pipeline and user this lead should belong to.`}
      width={480}
      footer={(
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={saving || loadingUsers || !pipeline || !userId}>{saving ? 'Saving...' : 'Save'}</Button>
        </>
      )}
    >
      <div className="space-y-2">
        <Label htmlFor="reassign-pipeline">Pipeline *</Label>
        <select id="reassign-pipeline" className={FIELD_CLASS} value={pipeline} onChange={(e) => { setPipeline(e.target.value); setUserId(''); }}>
          <option value="">Select Pipeline</option>
          {PIPELINE_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="reassign-user">Pipeline User *</Label>
        <select id="reassign-user" className={FIELD_CLASS} value={userId} onChange={(e) => setUserId(e.target.value)} disabled={!pipeline || loadingUsers}>
          <option value="">{!pipeline ? 'Select a pipeline first' : loadingUsers ? 'Loading users...' : 'Select Pipeline User'}</option>
          {users.map((u) => {
            const uid = asString(u.id);
            return <option key={uid} value={uid}>{asString(u.name) || asString(u.user_email) || uid}</option>;
          })}
        </select>
      </div>
    </Shell>
  );
}
