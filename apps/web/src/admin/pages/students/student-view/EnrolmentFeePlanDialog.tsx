import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Lock, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConfirm } from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { Pill } from '../../../shared/components/ui-kit.js';
import { asString, formatDate } from '../../../shared/utils/admin-data-utils.js';
import {
  MAX_PLAN_INSTALMENTS,
  generateRows,
  initialDraft,
  instalmentLabelOffset,
  lockReasonLabel,
  parsePlanData,
  summarizeDraft,
  toSaveBody,
  todayYmd,
  type DraftRow,
  type EnrolmentPlanData,
  type PlanDraft,
  type PlanMode,
  type PlanScheduleRow,
} from './enrolment-fee-plan-model.js';
import { rupees } from './student-view-model.js';

// Generate / Edit Payment Plan for an enrolment on its own plan (TTII
// 2026-10-16) — a course added after the student's application, any course of a
// student with no linked application, or the original course when its
// application plan holds no schedule. Saved straight to that enrolment's fee
// schedule (student_payments), which the student sees and Pay Now charges.
// Paid rows, and rows with a payment against them, are kept exactly; only
// Pending rows with no payment are replaced. The server re-checks every rule in
// one transaction and refuses while money outside the schedule is unrecorded.

export interface EnrolmentFeePlanTarget {
  enrolId: string;
  courseTitle: string;
  hasPlan: boolean;
}

const WIDTH = 'min(760px, calc(100vw - 2rem))';
const inputCls = 'h-9';

/** Picker years for due dates: the server accepts a year back to three ahead. */
function dueYears(): { minYear: number; maxYear: number } {
  const year = new Date().getFullYear();
  return { minYear: year - 1, maxYear: year + 3 };
}

function KeptRows({ rows }: { rows: PlanScheduleRow[] }) {
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  return (
    <section className="rounded-xl border border-border p-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Lock aria-hidden="true" className="size-3.5" /> Kept exactly as they are
      </p>
      <ul className="divide-y divide-border text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{r.label || 'Instalment'}</p>
              <p className="text-xs text-muted-foreground">
                {r.paidDate ? `Paid ${formatDate(r.paidDate)}` : r.dueDate ? `Due ${formatDate(r.dueDate)}` : 'No due date'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tabular-nums text-foreground">{rupees(r.amount)}</span>
              <Pill tone={r.lockReason === 'paid' ? 'emerald' : 'amber'}>{lockReasonLabel(r.lockReason)}</Pill>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-right text-xs text-muted-foreground">Kept total: <span className="font-semibold text-foreground">{rupees(total)}</span></p>
    </section>
  );
}

function Notices({ data }: { data: EnrolmentPlanData }) {
  return (
    <>
      {/* Money recorded outside the schedule (checkout on the course price, a
          payment on the enrolment's application, a pending approval or an
          open link): the server refuses a save until it is settled. */}
      {data.blockReason ? (
        <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-800">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <p>{data.blockReason} Saving is blocked until then, so the student is not charged twice.</p>
        </div>
      ) : null}
      {data.freeOffering ? (
        <p role="status" className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />This enrolment&apos;s course offering is marked Free.
        </p>
      ) : null}
    </>
  );
}

function RowEditor({
  rows, onChange, onRemove,
}: { rows: DraftRow[]; onChange: (key: string, patch: Partial<DraftRow>) => void; onRemove: (key: string) => void }) {
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => (
        <li key={r.key} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-2 sm:grid-cols-[minmax(0,1fr)_120px_190px_auto] sm:items-center">
          <Input aria-label={`Row ${i + 1} label`} className={inputCls} value={r.label} maxLength={200} onChange={(e) => onChange(r.key, { label: e.target.value })} />
          <Input
            aria-label={`Row ${i + 1} amount in rupees`}
            className={cn(inputCls, 'text-right tabular-nums')}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={r.amount}
            onChange={(e) => onChange(r.key, { amount: e.target.value })}
          />
          <DmyDateInput id={`plan-row-due-${r.key}`} value={r.dueDate} onChange={(v) => onChange(r.key, { dueDate: v })} {...dueYears()} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove row ${i + 1}`} onClick={() => onRemove(r.key)}>
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function EnrolmentFeePlanDialog({
  target, studentName, onClose, onSaved, api, token,
}: {
  target: EnrolmentFeePlanTarget | null;
  studentName: string;
  onClose: () => void;
  onSaved: () => void;
  api: AdminPortalApi;
  token: string;
}) {
  const confirm = useConfirm();
  const [data, setData] = useState<EnrolmentPlanData | null>(null);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [loadError, setLoadError] = useState('');
  const [count, setCount] = useState('3');
  const [firstDue, setFirstDue] = useState(() => todayYmd());
  const [saving, setSaving] = useState(false);
  // Row keys from a counter, never Date.now / random during render.
  const rowKeyRef = useRef(0);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setData(null);
    setDraft(null);
    setLoadError('');
    setCount('3');
    setFirstDue(todayYmd());
    api.getEnrolmentFeePlan(token, target.enrolId)
      .then((raw) => {
        if (cancelled) return;
        const parsed = parsePlanData(raw);
        const initial = initialDraft(parsed, todayYmd());
        setData(parsed);
        setDraft(initial);
        // Editing an instalment plan: re-splitting starts from its own shape.
        const firstRow = initial.rows[0];
        if (initial.mode === 'installment' && firstRow) {
          setCount(String(initial.rows.length));
          if (firstRow.dueDate) setFirstDue(firstRow.dueDate);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load the payment plan.');
      });
    return () => { cancelled = true; };
  }, [target, api, token]);

  const kept = useMemo(() => (data ? data.rows.filter((r) => r.locked) : []), [data]);
  const replaceable = useMemo(() => (data ? data.rows.filter((r) => !r.locked) : []), [data]);
  const dueWindow = useMemo(() => (data?.dueFrom && data.dueTo ? { from: data.dueFrom, to: data.dueTo } : null), [data]);
  const summary = useMemo(() => (draft ? summarizeDraft(draft, kept, replaceable.length, dueWindow, data) : null), [draft, kept, replaceable.length, dueWindow, data]);
  const canSave = Boolean(target && data && draft && summary && !summary.problem && summary.remaining !== null && !data.blockReason) && !saving;

  const patch = (p: Partial<PlanDraft>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const setMode = (mode: PlanMode) => setDraft((d) => {
    if (!d || d.mode === mode) return d;
    if (mode === 'full') return { ...d, mode, rows: [{ key: 'full', label: 'Course Fee', amount: '', dueDate: d.rows[0]?.dueDate || todayYmd() }] };
    return { ...d, mode, rows: [] };
  });
  const splitRows = () => {
    if (!summary || summary.remaining === null || summary.remaining <= 0) {
      toast.error(summary?.problem || 'Nothing is left to schedule.');
      return;
    }
    patch({ rows: generateRows(summary.remaining, Number(count) || 1, firstDue, instalmentLabelOffset(kept)) });
  };
  const changeRow = (key: string, p: Partial<DraftRow>) => setDraft((d) => (d ? { ...d, rows: d.rows.map((r) => (r.key === key ? { ...r, ...p } : r)) } : d));
  const removeRow = (key: string) => setDraft((d) => (d ? { ...d, rows: d.rows.filter((r) => r.key !== key) } : d));
  const addRow = () => {
    rowKeyRef.current += 1;
    const key = `add-${rowKeyRef.current}`;
    setDraft((d) => (d
      ? { ...d, rows: [...d.rows, { key, label: `Installment ${instalmentLabelOffset(kept) + d.rows.length + 1}`, amount: '', dueDate: '' }] }
      : d));
  };
  const applyFee = (totalFee: number, discount: number, gstPercent: number) => patch({ totalFee: String(totalFee), discount: String(discount), gstPercent: String(gstPercent) });

  const save = async () => {
    if (!target || !draft || !summary || summary.remaining === null || !canSave) return;
    if (replaceable.length > 0 && !(await confirm({
      title: `Replace ${replaceable.length} pending instalment${replaceable.length === 1 ? '' : 's'}?`,
      description: 'They have no payment against them. Paid instalments and anything with a payment against it are kept exactly.',
      confirmText: 'Save plan',
    }))) return;
    setSaving(true);
    try {
      const res = await api.saveEnrolmentFeePlan(token, toSaveBody(target.enrolId, draft, summary.remaining));
      const message = asString((res as { message?: unknown }).message);
      toast.success(message && message !== 'success' ? message : 'Payment plan saved.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the payment plan.');
    } finally {
      setSaving(false);
    }
  };

  const title = target?.hasPlan ? 'Edit Payment Plan' : 'Generate Payment Plan';
  return (
    <Dialog open={target !== null} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent style={{ width: WIDTH, maxWidth: WIDTH }} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {studentName} · {target?.courseTitle || 'this enrolment'}. Saved as this enrolment&apos;s own fee schedule — what the student sees and pays.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {loadError ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{loadError}</p> : null}
          {!loadError && (!data || !draft) ? <p className="py-8 text-center text-sm text-muted-foreground">Loading the fee schedule…</p> : null}
          {data && draft && summary ? (
            <>
              <Notices data={data} />

              <section className="rounded-xl border border-border p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fee</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="plan-total" className="mb-1 text-xs">Total Fee (₹) *</Label>
                    <Input id="plan-total" className={inputCls} type="number" inputMode="decimal" min={0} value={draft.totalFee} onChange={(e) => patch({ totalFee: e.target.value })} placeholder="e.g. 25000" />
                  </div>
                  <div>
                    <Label htmlFor="plan-discount" className="mb-1 text-xs">Discount (₹)</Label>
                    <Input id="plan-discount" className={inputCls} type="number" inputMode="decimal" min={0} value={draft.discount} onChange={(e) => patch({ discount: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="plan-gst" className="mb-1 text-xs">GST %</Label>
                    <Input id="plan-gst" className={inputCls} type="number" inputMode="decimal" min={0} max={100} value={draft.gstPercent} onChange={(e) => patch({ gstPercent: e.target.value })} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {draft.fromSchedule
                    ? "Started from this enrolment's current fee schedule."
                    : data.prefill.totalFee != null
                      ? `Prefilled from ${data.prefill.sourceLabel}.`
                      : 'No fee is set for this course yet — enter the total fee.'}
                  {' '}GST is added on top of the fee after discount; if the fee already includes GST, set GST to 0.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {draft.fromSchedule && data.prefill.totalFee != null ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => applyFee(data.prefill.totalFee ?? 0, data.prefill.discount, data.prefill.gstPercent)}>
                      Use {data.prefill.sourceLabel}: {rupees(data.prefill.totalFee)}
                    </Button>
                  ) : null}
                  {data.agreedFee != null ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => applyFee(data.agreedFee ?? 0, 0, 0)}>
                      Use the agreed fee: {rupees(data.agreedFee)}
                    </Button>
                  ) : null}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  <dt className="text-muted-foreground">After discount</dt><dd className="text-right tabular-nums">{summary.afterDiscount != null ? rupees(summary.afterDiscount) : '-'}</dd>
                  <dt className="text-muted-foreground">GST</dt><dd className="text-right tabular-nums">{summary.gstAmount != null ? rupees(summary.gstAmount) : '-'}</dd>
                  <dt className="font-semibold text-foreground">Payable</dt><dd className="text-right font-semibold tabular-nums">{summary.payable != null ? rupees(summary.payable) : '-'}</dd>
                  <dt className="font-semibold text-foreground">To schedule</dt><dd className="text-right font-semibold tabular-nums text-primary">{summary.remaining != null ? rupees(Math.max(0, summary.remaining)) : '-'}</dd>
                </dl>
              </section>

              <KeptRows rows={kept} />

              <section className="space-y-3 rounded-xl border border-border p-3">
                <div role="group" aria-label="Payment mode" className="grid grid-cols-2 gap-2">
                  {(['full', 'installment'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={draft.mode === m}
                      onClick={() => setMode(m)}
                      className={cn(
                        'rounded-lg border px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                        draft.mode === m ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {m === 'full' ? 'Full Payment' : 'Instalments'}
                    </button>
                  ))}
                </div>

                {draft.mode === 'full' ? (
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
                    <div>
                      <Label htmlFor="plan-full-label" className="mb-1 text-xs">Label</Label>
                      <Input id="plan-full-label" className={inputCls} maxLength={200} value={draft.rows[0]?.label ?? ''} onChange={(e) => changeRow(draft.rows[0]?.key ?? 'full', { label: e.target.value })} />
                    </div>
                    <div>
                      <Label htmlFor="plan-full-due" className="mb-1 text-xs">Due date *</Label>
                      <DmyDateInput id="plan-full-due" value={draft.rows[0]?.dueDate ?? ''} onChange={(v) => changeRow(draft.rows[0]?.key ?? 'full', { dueDate: v })} {...dueYears()} />
                    </div>
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      One payment of {summary.remaining != null && summary.remaining > 0 ? rupees(summary.remaining) : '—'}.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-[140px_200px_auto] sm:items-end">
                      <div>
                        <Label htmlFor="plan-count" className="mb-1 text-xs">Instalments</Label>
                        <Input id="plan-count" className={inputCls} type="number" min={1} max={MAX_PLAN_INSTALMENTS} value={count} onChange={(e) => setCount(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="plan-first-due" className="mb-1 text-xs">First due date</Label>
                        <DmyDateInput id="plan-first-due" value={firstDue} onChange={setFirstDue} {...dueYears()} />
                      </div>
                      <Button type="button" variant="outline" onClick={splitRows}>Split evenly</Button>
                    </div>
                    {draft.rows.length > 0 ? (
                      <RowEditor rows={draft.rows} onChange={changeRow} onRemove={removeRow} />
                    ) : (
                      <p className="text-xs text-muted-foreground">Choose how many instalments and a first due date, then Split evenly. Monthly due dates follow.</p>
                    )}
                    <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={addRow} disabled={draft.rows.length >= MAX_PLAN_INSTALMENTS}>
                      <Plus aria-hidden="true" className="size-4" /> Add row
                    </Button>
                    <p className="text-right text-xs text-muted-foreground">
                      Planned {rupees(summary.planned)} of {summary.remaining != null ? rupees(Math.max(0, summary.remaining)) : '-'}
                    </p>
                  </>
                )}
              </section>

              {summary.problem ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{summary.problem}</p> : null}
              {replaceable.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Saving replaces {replaceable.length} pending instalment{replaceable.length === 1 ? '' : 's'} with no payment against {replaceable.length === 1 ? 'it' : 'them'}.
                </p>
              ) : null}
              {summary.agreedChanges && summary.payable != null ? (
                <p className="text-xs text-muted-foreground">
                  Saving records {rupees(summary.payable)} as this enrolment&apos;s agreed fee{data.agreedFee != null ? ` (currently ${rupees(data.agreedFee)})` : ''}.
                </p>
              ) : null}
            </>
          ) : null}
        </div>

        <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={() => { void save(); }} disabled={!canSave}>{saving ? 'Saving…' : 'Save Plan'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
