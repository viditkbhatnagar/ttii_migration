import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { asString } from '../../../shared/utils/admin-data-utils.js';
import { openLinkRefusal, toIsoDate, withPaidDateStatus, type InstalmentForm } from './student-view-model.js';
import { SaveBlockedNotice } from './SaveBlockedNotice.js';
import { NativeSelect } from './student-view-ui.js';

// Edit / Add Installment — Naji UAT 2026-05-13 / 2026-07-06. PAYMENT LOGIC IS
// UNCHANGED from the old ViewStudentPage: same prefill, the same "a Paid Date
// means Paid" coercion, POST /admin/student-payments/update (edit) or the add
// endpoint with the enrolment's user_id + course_id, the same toasts. Only the
// layout changed, and the two native date inputs became dd/mm/yyyy fields
// (they hold the same YYYY-MM-DD value).

export type InstallmentTarget =
  | { mode: 'edit'; row: Record<string, unknown> }
  // enrolId: the enrolment whose application's open payment link can be
  // cancelled from here when it blocks the add (TTII 2026-10-17).
  | { mode: 'add'; userId: string; courseId: string; enrolId?: string };

const EMPTY: InstalmentForm = { installment_details: '', amount: '', due_date: '', paid_date: '', payment_mode: '', status: '' };
const MODES = ['Online', 'Cash', 'Cheque', 'UPI', 'Bank Transfer', 'Razorpay'];
const STATUSES = ['Paid', 'Pending', 'Overdue', 'Waived'];

export function InstallmentDialog({
  target, onClose, onSaved, api, token,
}: { target: InstallmentTarget | null; onClose: () => void; onSaved: () => void; api: AdminPortalApi; token: string }) {
  const [form, setForm] = useState<InstalmentForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  // Set when the server refused the add because a payment link is open.
  const [linkBlock, setLinkBlock] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    setLinkBlock(null);
    if (target.mode === 'add') {
      setForm({ ...EMPTY, status: 'Pending' });
      return;
    }
    const row = target.row;
    setForm({
      installment_details: asString(row.installment_details),
      amount: asString(row.amount),
      due_date: toIsoDate(row.due_date),
      paid_date: toIsoDate(row.paid_date),
      payment_mode: asString(row.payment_mode),
      status: asString(row.status),
    });
  }, [target]);

  const submit = async () => {
    if (!target) return;
    setSubmitting(true);
    try {
      const outForm = withPaidDateStatus(form);
      let res: Record<string, unknown>;
      if (target.mode === 'add') {
        if (!target.userId || !target.courseId) { toast.error('Enrolment context missing'); return; }
        res = await api.addInstallment(token, { user_id: target.userId, course_id: target.courseId, ...outForm });
      } else {
        const id = asString(target.row.id);
        if (!id) { toast.error('Installment id missing'); return; }
        res = await api.updateInstallment(token, id, outForm);
      }
      if ((res as { status?: number }).status === 1) {
        toast.success(target.mode === 'add' ? 'Installment added' : 'Installment updated');
        onClose();
        onSaved();
      } else {
        toast.error(asString((res as { message?: unknown }).message) || 'Save failed');
      }
    } catch (err: unknown) {
      const blocked = openLinkRefusal(err);
      if (blocked) setLinkBlock(blocked);
      else toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (patch: Partial<InstalmentForm>) => setForm((f) => ({ ...f, ...patch }));
  const thisYear = new Date().getFullYear();
  const width = 'min(560px, calc(100vw - 2rem))';
  return (
    <Dialog open={target !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent style={{ width, maxWidth: width }} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>{target?.mode === 'add' ? 'Add Installment' : 'Edit Installment'}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div>
              <Label htmlFor="inst-details" className="mb-1">Installment</Label>
              <Input id="inst-details" value={form.installment_details} onChange={(e) => set({ installment_details: e.target.value })} placeholder="e.g. Installment 1" maxLength={200} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="inst-amount" className="mb-1">Amount (INR)</Label>
                <Input id="inst-amount" type="number" value={form.amount} onChange={(e) => set({ amount: e.target.value })} placeholder="e.g. 4000" />
              </div>
              <div>
                <Label htmlFor="inst-mode" className="mb-1">Mode</Label>
                <NativeSelect id="inst-mode" value={form.payment_mode} onChange={(v) => set({ payment_mode: v })} options={MODES.map((v) => ({ value: v, label: v }))} />
                {target?.mode === 'add' && form.status.trim().toLowerCase() !== 'paid' && !form.paid_date.trim() ? (
                  <p className="mt-1 text-xs text-muted-foreground">Leave empty until it is paid: a Pending row with a mode counts as a payment already recorded.</p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="inst-due" className="mb-1">Due Date</Label>
                <DmyDateInput id="inst-due" value={form.due_date} onChange={(v) => set({ due_date: v })} minYear={thisYear - 10} maxYear={thisYear + 5} />
              </div>
              <div>
                <Label htmlFor="inst-paid" className="mb-1">Paid Date</Label>
                <DmyDateInput id="inst-paid" value={form.paid_date} onChange={(v) => set({ paid_date: v })} minYear={thisYear - 10} maxYear={thisYear + 1} />
              </div>
            </div>
            <div>
              <Label htmlFor="inst-status" className="mb-1">Status</Label>
              <NativeSelect id="inst-status" value={form.status} onChange={(v) => set({ status: v })} options={STATUSES.map((v) => ({ value: v, label: v }))} />
              <p className="mt-1 text-xs text-muted-foreground">A row with a Paid Date is saved as Paid.</p>
            </div>
          </div>
          <div className="shrink-0 space-y-3 border-t border-border px-6 py-4">
            {linkBlock ? (
              <SaveBlockedNotice
                reason={linkBlock}
                linkOpen
                enrolId={target?.mode === 'add' ? target.enrolId ?? null : null}
                api={api}
                token={token}
                onLinkCancelled={() => setLinkBlock(null)}
              />
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
