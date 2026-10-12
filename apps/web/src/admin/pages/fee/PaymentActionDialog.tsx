import { useCallback, useEffect, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { inr2 } from './fee-model.js';
import { localTodayYmd, type PaymentRow } from './payment-model.js';

// The Payment Status row dialog — Mark as Paid or Send Reminder — restyled in
// Naji's design (RecordPaymentModal look) with the old behaviour unchanged:
// same fields, same optional extras, same endpoint calls, same toasts, and the
// list reloads after either action. Only the date field changed: dd/mm/yyyy
// entry instead of a native date input (it still sends YYYY-MM-DD).

const PAYMENT_MODE_OPTIONS = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Card', 'Online', 'Other'];

export type PaymentAction = { type: 'mark_paid' | 'reminder'; row: PaymentRow };

interface MarkPaidForm {
  paidDate: string;
  paymentMode: string;
  referenceNumber: string;
  receiptUrl: string;
}

const thisYear = new Date().getFullYear();

export function PaymentActionDialog({
  action, api, token, onClose, onDone,
}: { action: PaymentAction | null; api: AdminPortalApi; token: string; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<MarkPaidForm>({ paidDate: localTodayYmd(), paymentMode: 'Online', referenceNumber: '', receiptUrl: '' });

  // Reset the form every time the dialog opens for a row.
  useEffect(() => {
    if (action?.type !== 'mark_paid') return;
    setForm({ paidDate: localTodayYmd(), paymentMode: action.row.mode || 'Online', referenceNumber: '', receiptUrl: '' });
  }, [action]);

  const close = useCallback(() => { setBusy(false); setUploading(false); onClose(); }, [onClose]);

  const uploadReceipt = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const result = await api.uploadFile(token, file);
      setForm((f) => ({ ...f, receiptUrl: result.url }));
      toast.success('Receipt uploaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }, [api, token]);

  const submit = useCallback(async () => {
    if (!action) return;
    setBusy(true);
    try {
      if (action.type === 'mark_paid') {
        const extras: { paidDate?: string; paymentMode?: string; referenceNumber?: string; receiptUrl?: string } = {};
        if (form.paidDate) extras.paidDate = form.paidDate;
        if (form.paymentMode) extras.paymentMode = form.paymentMode;
        if (form.referenceNumber) extras.referenceNumber = form.referenceNumber;
        if (form.receiptUrl) extras.receiptUrl = form.receiptUrl;
        await api.markInstallmentPaid(token, action.row.id, extras);
        toast.success('Installment marked as paid.');
      } else {
        await api.sendPaymentReminder(token, action.row.id);
        toast.success('Reminder sent.');
      }
      close();
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operation failed.');
    } finally {
      setBusy(false);
    }
  }, [action, api, token, form, close, onDone]);

  const isMarkPaid = action?.type === 'mark_paid';
  const row = action?.row;

  return (
    <Dialog open={action !== null} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent
        style={{ width: 'min(560px, calc(100vw - 2rem))', maxWidth: 'min(560px, calc(100vw - 2rem))' }}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
      >
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
            <DialogTitle className="text-xl">{isMarkPaid ? 'Mark as Paid' : 'Send Reminder'}</DialogTitle>
            <DialogDescription className="sr-only">
              {isMarkPaid ? 'Record this instalment as paid.' : 'Send a payment reminder for this instalment.'}
            </DialogDescription>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Student</p>
                <p className="truncate text-sm font-semibold text-foreground">{row?.name || '—'}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{[row?.course, row?.details].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</p>
                <p className="text-lg font-bold tabular-nums text-emerald-700">{inr2(row?.amount)}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            {isMarkPaid ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="mp-paid-date" className="text-xs">Date of Payment</Label>
                    <DmyDateInput id="mp-paid-date" value={form.paidDate} onChange={(v) => setForm((f) => ({ ...f, paidDate: v }))} minYear={thisYear - 5} maxYear={thisYear + 1} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mp-mode" className="text-xs">Payment Mode</Label>
                    <select
                      id="mp-mode"
                      value={form.paymentMode}
                      onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value }))}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {PAYMENT_MODE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mp-ref" className="text-xs">Reference Number</Label>
                  <Input
                    id="mp-ref"
                    value={form.referenceNumber}
                    onChange={(e) => setForm((f) => ({ ...f, referenceNumber: e.target.value }))}
                    placeholder="Transaction / cheque / receipt number"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mp-receipt" className="text-xs">Receipt Upload</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-muted/50">
                      <Upload className="size-3.5" aria-hidden="true" />
                      <span>{uploading ? 'Uploading…' : 'Choose file'}</span>
                      <input
                        id="mp-receipt"
                        type="file"
                        className="sr-only"
                        accept="image/*,application/pdf"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) void uploadReceipt(f);
                        }}
                      />
                    </label>
                    {form.receiptUrl ? (
                      <a href={form.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline">View uploaded receipt</a>
                    ) : (
                      <span className="text-xs text-muted-foreground">No file uploaded</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Send a payment reminder to <strong className="text-foreground">{row?.name}</strong> for {inr2(row?.amount)}?
              </p>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
            <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
            <Button type="submit" disabled={busy || uploading}>{busy ? 'Processing...' : 'Confirm'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
