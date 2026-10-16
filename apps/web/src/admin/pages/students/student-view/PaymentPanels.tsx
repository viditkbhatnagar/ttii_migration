import { Plus, Receipt, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminDataTable, type DataTableAction, type DataTableColumn } from '../../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../../shared/components/AdminStatusBadge.js';
import { StatBox } from '../../../shared/components/ui-kit.js';
import { asNumber, asString, formatDate } from '../../../shared/utils/admin-data-utils.js';
import { rupees } from './student-view-model.js';
import { EmptyLine, InfoRow, Panel, SectionHeader } from './student-view-ui.js';

// The Student View's fee and payment surfaces (Course Fee tab + Enrollments →
// Payments). PAYMENT SAFETY (TTII 2026-10-12 reskin): every figure, source and
// action here is the old page's, moved verbatim — only the cards around them
// changed. Sources:
//   - studentFees            → per-enrolment fee / paid / pending (settled student_payments)
//   - applicationFee / applicationInstallments → captured at application
//   - applicationPaymentPlan / paymentLink*    → the saved Payment Plan
//   - scopedSchedule          → student_payments rows for the ENROLLED course(s)

export type SavedPlan = {
  mode?: string;
  total_amount_minor?: number;
  registration_fee_minor?: number | null;
  installments?: Array<{
    label?: string; amountMinor?: number; amount_minor?: number; dueDate?: string; due_date?: string; gstPercent?: number; gst_percent?: number;
  }>;
};

export interface PaymentData {
  studentFees: Record<string, unknown>[];
  applicationFee: Record<string, unknown> | null;
  applicationInstallments: Record<string, unknown>[];
  applicationPaymentPlan: SavedPlan | null;
  paymentLinkUrl: string;
  paymentLinkExpiresAt: unknown;
  paymentStatus: string;
  hasPaymentPlan: boolean;
  scopedSchedule: Record<string, unknown>[];
}

const SCHEDULE_COLUMNS: DataTableColumn[] = [
  { key: 'installment_details', label: 'Installment' },
  { key: 'amount', label: 'Amount', render: (v) => `₹${asNumber(v).toLocaleString('en-IN')}` },
  { key: 'due_date', label: 'Due Date', render: (v) => formatDate(v) },
  { key: 'paid_date', label: 'Paid Date', render: (v) => formatDate(v) },
  { key: 'payment_mode', label: 'Mode', render: (v) => asString(v) || '-' },
  { key: 'status', label: 'Status', render: (v) => <AdminStatusBadge status={asString(v) || 'Pending'} /> },
];

const th = 'px-3 py-2 text-left text-xs font-medium text-muted-foreground';
const td = 'px-3 py-1.5';

/** Generate / Edit Payment Plan (needs the student's retained application row). */
export function PaymentPlanButton({ hasPlan, applicationId, onOpen }: { hasPlan: boolean; applicationId: string; onOpen: () => void }) {
  return (
    <Button
      size="sm"
      onClick={onOpen}
      disabled={!applicationId}
      title={applicationId ? '' : 'No application record is linked to this student, so a payment plan cannot be generated here.'}
    >
      {hasPlan ? 'Edit Payment Plan' : 'Generate Payment Plan'}
    </Button>
  );
}

function PaymentHistory({
  rows, actions, action,
}: { rows: Record<string, unknown>[]; actions?: DataTableAction[]; action?: React.ReactNode }) {
  return (
    <Panel>
      <SectionHeader icon={Receipt} title="Payment History" description="Instalments recorded for the enrolled course(s)" {...(action ? { action } : {})} />
      {rows.length > 0 ? (
        <AdminDataTable columns={SCHEDULE_COLUMNS} rows={rows} searchable={false} exportable={false} {...(actions ? { actions } : {})} />
      ) : (
        <EmptyLine>No payment records found.</EmptyLine>
      )}
    </Panel>
  );
}

export function CourseFeeTab({ p, canEdit, applicationId, onOpenPlan }: { p: PaymentData; canEdit: boolean; applicationId: string; onOpenPlan: () => void }) {
  const fees = p.studentFees;
  return (
    <div className="space-y-6">
      {canEdit ? (
        <div className="flex justify-end">
          <PaymentPlanButton hasPlan={p.hasPaymentPlan} applicationId={applicationId} onOpen={onOpenPlan} />
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        <StatBox label={`Total Fee (All Courses) · ${fees.length} enrolment${fees.length === 1 ? '' : 's'}`} value={rupees(fees.reduce((s, f) => s + asNumber(f.total_fee), 0))} tone="blue" />
        {/* Majida 2026-07-31 — Paid is the per-enrolment paid_amount (settled
            student_payments, cash + online), the same source as the rows
            below; Pending sums each enrolment's own pending. */}
        <StatBox label="Paid · across all enrolments" value={rupees(fees.reduce((s, f) => s + asNumber(f.paid_amount), 0))} tone="emerald" />
        <StatBox label="Pending · across all enrolments" value={rupees(fees.reduce((s, f) => s + asNumber(f.pending_amount), 0))} tone={fees.length > 0 ? 'amber' : 'slate'} />
      </div>

      <Panel>
        <SectionHeader icon={Wallet} title="Per-Enrolment Fees" />
        {fees.length === 0 ? (
          <EmptyLine>No fee records yet.</EmptyLine>
        ) : (
          <AdminDataTable
            columns={[
              { key: 'enrollment_id', label: 'Enrolment No' },
              { key: 'course_title', label: 'Course' },
              { key: 'offering_title', label: 'Offering', render: (v) => asString(v) || '-' },
              { key: 'total_fee', label: 'Course Fee', render: (v) => `₹${asNumber(v).toLocaleString('en-IN')}` },
              { key: 'paid_amount', label: 'Paid', render: (v) => `₹${asNumber(v).toLocaleString('en-IN')}` },
              { key: 'pending_amount', label: 'Pending', render: (v) => `₹${asNumber(v).toLocaleString('en-IN')}` },
            ]}
            rows={fees}
          />
        )}
      </Panel>

      {p.applicationFee ? <ApplicationFeeCard fee={p.applicationFee} installments={p.applicationInstallments} /> : null}
      {p.hasPaymentPlan ? <PaymentPlanCard p={p} /> : null}
      <PaymentHistory rows={p.scopedSchedule} />
    </div>
  );
}

function ApplicationFeeCard({ fee, installments }: { fee: Record<string, unknown>; installments: Record<string, unknown>[] }) {
  return (
    <Panel>
      <SectionHeader icon={Wallet} title="Application Fee Breakdown" />
      <div className="grid gap-x-8 md:grid-cols-2">
        <div>
          <InfoRow label="Registration Fee" value={asString(fee.registration_fee) ? `₹${asString(fee.registration_fee)}` : '-'} />
          <InfoRow label="Discount" value={asString(fee.discount) ? `${asString(fee.discount)}${fee.discount_type === 'flat' ? ' (flat)' : ' %'}` : '-'} />
        </div>
        <div>
          <InfoRow label="GST %" value={asString(fee.gst_percent) || '-'} />
          <InfoRow label="Final Course Fee" value={asString(fee.final_fee) ? `₹${asNumber(fee.final_fee).toLocaleString('en-IN')}` : '-'} />
        </div>
      </div>
      {installments.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Instalment Plan (captured at application)</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr><th className={th}>#</th><th className={th}>Description</th><th className={th}>Due Date</th><th className={th}>Amount</th><th className={th}>GST</th><th className={th}>Total</th></tr>
              </thead>
              <tbody>
                {installments.map((row, idx) => (
                  <tr key={idx} className="border-t border-border">
                    <td className={td}>{idx + 1}</td>
                    <td className={td}>{asString(row.description) || '-'}</td>
                    <td className={td}>{asString(row.due_date) || '-'}</td>
                    <td className={td}>{asString(row.amount) || '-'}</td>
                    <td className={td}>{asString(row.gst) || '-'}</td>
                    <td className={`${td} font-medium`}>{asString(row.total) || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function PaymentPlanCard({ p }: { p: PaymentData }) {
  const plan = p.applicationPaymentPlan;
  return (
    <Panel>
      <SectionHeader
        icon={Receipt}
        title="Payment Plan"
        {...(p.paymentStatus ? { action: <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-800">{p.paymentStatus}</span> } : {})}
      />
      <div className="grid gap-x-8 md:grid-cols-2">
        <div>
          <InfoRow label="Mode" value={plan?.mode === 'installment' ? 'Installment Plan' : 'Full Payment'} />
          <InfoRow label="Total" value={plan?.total_amount_minor ? `₹${(Number(plan.total_amount_minor) / 100).toLocaleString('en-IN')}` : '-'} />
        </div>
        <div>
          {p.paymentLinkUrl ? (
            <>
              <InfoRow label="Payment Link" value={p.paymentLinkUrl} />
              <InfoRow label="Expires" value={formatDate(p.paymentLinkExpiresAt)} />
            </>
          ) : (
            <InfoRow label="Payment Link" value="Not sent yet (saved as draft)" />
          )}
        </div>
      </div>
      {plan?.installments && plan.installments.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Installments</p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr><th className={th}>#</th><th className={th}>Label</th><th className={th}>Due Date</th><th className={th}>GST %</th><th className={th}>Amount</th></tr>
              </thead>
              <tbody>
                {plan.installments.map((row, idx) => {
                  const minor = row.amountMinor ?? row.amount_minor ?? 0;
                  const due = row.dueDate ?? row.due_date ?? '';
                  const gst = row.gstPercent ?? row.gst_percent ?? '';
                  return (
                    <tr key={idx} className="border-t border-border">
                      <td className={td}>{idx + 1}</td>
                      <td className={td}>{asString(row.label) || '-'}</td>
                      <td className={td}>{due ? formatDate(due) : '-'}</td>
                      <td className={td}>{gst !== '' ? `${gst}%` : '-'}</td>
                      <td className={`${td} font-medium`}>{`₹${(Number(minor) / 100).toLocaleString('en-IN')}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

/** Fee Summary for an enrolment priced by its own plan (TTII 2026-10-16): the
 *  plan already holds any discount and GST, so only its totals are shown. */
function ScheduleFeeSummary({ fee }: { fee: Record<string, unknown> }) {
  return (
    <div className="grid gap-x-8 md:grid-cols-2">
      <div>
        <InfoRow label="Fee set by" value="This enrolment's payment plan" />
        <InfoRow label="Course Fee (per plan)" value={rupees(asNumber(fee.total_fee))} />
      </div>
      <div>
        <InfoRow label="Fee Paid" value={rupees(asNumber(fee.paid_amount))} />
        <InfoRow label="Balance" value={rupees(asNumber(fee.pending_amount))} />
      </div>
    </div>
  );
}

/** Enrollments → Payments: Fee Summary per enrolment + editable Payment History. */
export function EnrollmentPaymentsPanel({
  p, canEdit, applicationId, onOpenPlan, enrolmentPlan = null, onAddInstalment, onEditInstalment, onDeleteInstalment,
}: {
  p: PaymentData;
  canEdit: boolean;
  applicationId: string;
  onOpenPlan: () => void;
  /** Set for an ADDITIONAL enrolment: its own plan replaces the application-wide one. */
  enrolmentPlan?: { hasPlan: boolean; onOpen: () => void } | null;
  /** null when no enrolment is selected (the Add button is then hidden). */
  onAddInstalment: (() => void) | null;
  onEditInstalment: (row: Record<string, unknown>) => void;
  onDeleteInstalment: (row: Record<string, unknown>) => void;
}) {
  const actions: DataTableAction[] = [
    { label: 'Edit', onClick: (row: Record<string, unknown>) => onEditInstalment(row) },
    { label: 'Delete', onClick: (row: Record<string, unknown>) => onDeleteInstalment(row) },
  ];
  return (
    <div className="space-y-6">
      {canEdit ? (
        <div className="flex justify-end">
          {enrolmentPlan ? (
            <Button size="sm" onClick={enrolmentPlan.onOpen} title="This course was added after the student's application, so it has its own fee plan.">
              {enrolmentPlan.hasPlan ? 'Edit Payment Plan' : 'Generate Payment Plan'}
            </Button>
          ) : (
            <PaymentPlanButton hasPlan={p.hasPaymentPlan} applicationId={applicationId} onOpen={onOpenPlan} />
          )}
        </div>
      ) : null}
      {p.studentFees.length > 0 ? (
        <Panel>
          <SectionHeader icon={Wallet} title="Fee Summary" />
          <div className="space-y-4">
            {p.studentFees.map((fee, idx) => {
              if (asString(fee.fee_source) === 'schedule') return <ScheduleFeeSummary key={idx} fee={fee} />;
              const discount = asNumber(fee.discount);
              const gstAmount = asNumber(fee.gst_amount);
              return (
                <div key={idx} className="grid gap-x-8 md:grid-cols-2">
                  <div>
                    <InfoRow label="Course Offering" value={asString(fee.offering_title) || '-'} />
                    <InfoRow label="Certificate Combination" value={asString(fee.combination_title) || '-'} />
                    <InfoRow label="Base Fee" value={rupees(asNumber(fee.base_fee))} />
                    <InfoRow label="Discount" value={discount > 0 ? `- ${rupees(discount)}` : rupees(0)} />
                    <InfoRow label="Course Fee" value={rupees(asNumber(fee.course_fee))} />
                  </div>
                  <div>
                    <InfoRow label={`GST (${asNumber(fee.gst_percent) || 0}%)`} value={gstAmount > 0 ? `+ ${rupees(gstAmount)}` : rupees(0)} />
                    <InfoRow label="Course Fee Inc GST" value={rupees(asNumber(fee.course_fee_inc_gst) || asNumber(fee.total_fee))} />
                    <InfoRow label="Fee Paid" value={rupees(asNumber(fee.paid_amount))} />
                    <InfoRow label="Balance" value={rupees(asNumber(fee.pending_amount))} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}
      <PaymentHistory
        rows={p.scopedSchedule}
        actions={actions}
        {...(canEdit && onAddInstalment
          ? { action: <Button size="sm" variant="outline" className="gap-1.5" onClick={onAddInstalment}><Plus aria-hidden="true" className="size-4" /> Add Instalment</Button> }
          : {})}
      />
    </div>
  );
}
