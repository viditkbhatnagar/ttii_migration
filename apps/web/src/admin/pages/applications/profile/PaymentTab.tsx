import { History, Pencil, Receipt, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Pill } from '../../../shared/components/ui-kit.js';
import type { Tone } from '../../../shared/components/ui-tones.js';
import { asNumber, asString, formatDate, toRecords } from '../../../shared/utils/admin-data-utils.js';
import {
  paymentStatusLabel, planLines, planTotals, rowIsPaid, rowPaymentInfo, type SavedPlan,
} from '../application-profile-model.js';
import { Field, FieldGrid, Section } from './ProfileSections.js';

// Payment tab of Naji's ApplicationProfile, on our data: the fee captured on the
// form, the saved payment plan with its per-instalment "Paid" chips (from the
// instalment ledger), and the student_payments history once the form is in.

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function statusTone(status: string): Tone {
  if (status === 'paid') return 'emerald';
  if (status === 'pending_approval') return 'amber';
  if (status === 'payment_rejected') return 'rose';
  return 'slate';
}

function PaidChip({ plan, paymentStatus, index }: { plan: SavedPlan | null; paymentStatus: string; index: number }) {
  const info = rowPaymentInfo(plan, paymentStatus, index);
  const hasAny = info && (info.mode || info.reference || info.date || info.receipt);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100">
          Paid
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 text-sm">
        {!info ? <p className="text-muted-foreground">Payment recorded.</p> : (
          <div className="space-y-1.5">
            <p className="font-semibold">Payment details</p>
            {info.mode ? <p><span className="text-muted-foreground">Mode:</span> {info.mode}</p> : null}
            {info.reference ? <p><span className="text-muted-foreground">Reference:</span> {info.reference}</p> : null}
            {info.date ? <p><span className="text-muted-foreground">Date:</span> {formatDate(info.date) || info.date}</p> : null}
            {info.receipt ? <a href={info.receipt} target="_blank" rel="noreferrer" className="inline-block font-medium text-primary hover:underline">View receipt</a> : null}
            {!hasAny ? <p className="text-muted-foreground">Paid online.</p> : null}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function PaymentTab({
  app, payments, plan, leadStage, canEditPlan, onEditPlan,
}: {
  app: Record<string, unknown>;
  payments: unknown;
  plan: SavedPlan | null;
  leadStage: boolean;
  /** The plan can still be edited / resent (lead → form_pending). */
  canEditPlan: boolean;
  onEditPlan: () => void;
}) {
  const paymentStatus = asString(app.payment_status);
  const linkUrl = asString(app.payment_link_url);
  const hasPlan = plan !== null || linkUrl !== '';
  const lines = planLines(plan);
  const totals = planTotals(plan);
  const history = toRecords(payments);

  return (
    <div className="space-y-6">
      {!leadStage ? (
        <Section title="Fee Structure" icon={Receipt}>
          <FieldGrid cols={3}>
            <Field label="Course Fee" value={asString(app.course_fee) ? `₹${asString(app.course_fee)}` : ''} />
            <Field label="Discount" value={asString(app.discount) ? `${asString(app.discount)}%` : ''} />
            <Field label="GST Applicability" value={asString(app.gst_applicability)} />
            <Field label="Final Course Fee" value={asString(app.final_course_fee) ? `₹${asString(app.final_course_fee)}` : ''} />
          </FieldGrid>
        </Section>
      ) : null}

      <Section
        title="Payment Plan"
        icon={Wallet}
        action={(
          <div className="flex items-center gap-2">
            {paymentStatus ? <Pill tone={statusTone(paymentStatus)} className="uppercase tracking-wide">{paymentStatusLabel(paymentStatus)}</Pill> : null}
            {canEditPlan ? (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={onEditPlan}>
                <Pencil aria-hidden="true" className="size-4" /> {hasPlan ? 'Edit' : 'Create'}
              </Button>
            ) : null}
          </div>
        )}
      >
        {!hasPlan ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No payment plan created yet.{canEditPlan ? ' Use Generate Payment Link to create one.' : ''}
          </p>
        ) : (
          <>
            <FieldGrid cols={3}>
              <Field label="Mode" value={plan?.mode === 'installment' ? 'Installment Plan' : 'Full Payment'} />
              <Field label="Instalments Total" value={totals.excl > 0 ? inr(totals.excl) : ''} />
              <Field label="GST" value={totals.gst > 0 ? inr(totals.gst) : ''} />
              <Field label="Total Inc. GST" value={totals.total > 0 ? inr(totals.total) : ''} />
              {plan?.registration_fee_minor ? <Field label="Registration Fee" value={inr(Number(plan.registration_fee_minor) / 100)} /> : null}
              {linkUrl ? (
                <>
                  <Field label="Payment Link" value={<a href={linkUrl} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">{linkUrl}</a>} full />
                  <Field label="Expires" value={formatDate(app.payment_link_expires_at)} />
                </>
              ) : (
                <Field label="Payment Link" value="Not sent yet (saved as draft)" />
              )}
            </FieldGrid>
            {lines.length > 0 ? (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Description</th>
                      <th className="py-2 pr-3 text-right">Amount</th>
                      <th className="py-2 pr-3 text-right">GST %</th>
                      <th className="py-2 pr-3 text-right">Inc. GST</th>
                      <th className="py-2 pr-3">Due Date</th>
                      <th className="py-2 pr-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l, i) => (
                      <tr key={i} className="border-b border-border/60 last:border-0">
                        <td className="py-3 pr-3 text-muted-foreground">{i + 1}</td>
                        <td className="py-3 pr-3 font-medium">{l.label || '-'}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">₹{l.amount.toLocaleString('en-IN')}</td>
                        <td className="py-3 pr-3 text-right tabular-nums">{l.gstPercent}%</td>
                        <td className="py-3 pr-3 text-right font-semibold tabular-nums">{inr(l.inclusive)}</td>
                        <td className="py-3 pr-3 text-muted-foreground">{formatDate(l.dueDate) || '-'}</td>
                        <td className="py-3 pr-3 text-right">
                          {rowIsPaid(plan, paymentStatus, i)
                            ? <PaidChip plan={plan} paymentStatus={paymentStatus} index={i} />
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </Section>

      {!leadStage ? (
        <Section title="Payment History" icon={History}>
          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">Installment</th>
                    <th className="py-2 pr-3 text-right">Amount</th>
                    <th className="py-2 pr-3">Due Date</th>
                    <th className="py-2 pr-3">Paid Date</th>
                    <th className="py-2 pr-3">Mode</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((p, i) => (
                    <tr key={i} className="border-b border-border/60 last:border-0">
                      <td className="py-3 pr-3 font-medium">{asString(p.installment_details) || '-'}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">₹{asNumber(p.amount).toLocaleString('en-IN')}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{formatDate(p.due_date) || '-'}</td>
                      <td className="py-3 pr-3 text-muted-foreground">{formatDate(p.paid_date) || '-'}</td>
                      <td className="py-3 pr-3">{asString(p.payment_mode) || '-'}</td>
                      <td className="py-3 pr-3"><Pill tone={statusTone(asString(p.status).toLowerCase())}>{asString(p.status) || 'Pending'}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No payment records found.</p>
          )}
        </Section>
      ) : null}
    </div>
  );
}
