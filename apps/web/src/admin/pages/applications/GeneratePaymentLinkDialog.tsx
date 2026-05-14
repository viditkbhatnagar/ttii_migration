// Naji 2026-05-07/08 — rich Generate Payment Link dialog used from
// ViewApplicationPage. Pulls pricing from the application's selected
// offering + certificate combination so the breakdown (Base / Discount
// / Final / GST / Inc-GST / Registration) is computed up-front. Two
// modes: Full Payment (one-shot) and Installment Plan (registration
// split + remaining instalments with editable rows).

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPortalApi } from '../../admin-portal-api.js';

type Mode = 'full' | 'installment';

interface PriceBreakdown {
  baseFee: number;
  discount: number;
  finalFee: number;
  gstPercent: number;
  gstAmount: number;
  feeIncGst: number;
}

interface PlanRow {
  label: string;
  amount: number; // INR — instalment amount EXCLUDING GST
  gstPercent: number; // GST applied to this row
  dueDate: string; // yyyy-mm-dd
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: AdminPortalApi;
  authToken: string;
  applicationId: string;
  studentName: string;
  // Existing application fields needed for prefill — passed from
  // ViewApplicationPage so we don't refetch.
  offeringId?: string;
  combinationId?: string;
  initialBaseFee?: number;
  initialDiscount?: number;
  initialOfferedFee?: number;
  initialGstPercent?: number;
  // Restore an existing saved plan when opened on a row that already
  // has one — Naji 2026-05-09: admin should be able to Edit / Resend
  // without re-entering everything.
  initialSavedPlan?: {
    mode?: string;
    total_amount_minor?: number;
    registration_fee_minor?: number | null;
    installments?: Array<{
      label?: string;
      amountMinor?: number;
      amount_minor?: number;
      dueDate?: string;
      due_date?: string;
      gstPercent?: number;
      gst_percent?: number;
    }>;
  } | null;
  onSent?: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsIso(baseIso: string, months: number): string {
  const d = new Date(baseIso);
  if (Number.isNaN(d.getTime())) return baseIso;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function fmtInr(amount: number): string {
  if (!Number.isFinite(amount)) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export function GeneratePaymentLinkDialog({
  open, onOpenChange, api, authToken, applicationId, studentName,
  offeringId, combinationId, initialBaseFee, initialDiscount,
  initialOfferedFee, initialGstPercent, initialSavedPlan, onSent,
}: Props) {
  const [mode, setMode] = useState<Mode>('full');
  const [pricingLoading, setPricingLoading] = useState(false);

  // Editable inputs
  const [baseFee, setBaseFee] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [gstPercent, setGstPercent] = useState(18);
  const [registrationFee, setRegistrationFee] = useState(0);
  const [registrationSplitCount, setRegistrationSplitCount] = useState(1);
  const [registrationDueNow, setRegistrationDueNow] = useState(0);
  const [remainingInstallmentsCount, setRemainingInstallmentsCount] = useState(3);
  const [firstDueDate, setFirstDueDate] = useState(todayIso());
  const [linkExpiryDays, setLinkExpiryDays] = useState(7);

  // Generated plan (Installment Plan mode only). Shown after Generate
  // is clicked; each row is editable inline.
  const [plan, setPlan] = useState<PlanRow[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Did the (offering, combination) package lookup match a row? Used to
  // surface a clear "no pricing set" notice so admins know to enter
  // the values manually or set them under Course Offerings → Packages.
  const [packageFound, setPackageFound] = useState<boolean | null>(null);

  // Load pricing on open. Real pricing lives in the offering ↔ combination
  // pair (offering_certificate_packages) — base_fee, discount, gst_percent
  // and registration_fee are stored per (offering_id, combination_id).
  // We pull the package row matching the picked combination first; fall
  // back to combination GST + offering-level pricing only if the package
  // row is missing.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      // Seed from props.
      setBaseFee(initialBaseFee ?? 0);
      setDiscount(initialDiscount ?? 0);
      setGstPercent(initialGstPercent ?? 18);
      setPackageFound(null);
      // Restore saved plan if one was passed in (Edit / Resend flow).
      if (initialSavedPlan && Array.isArray(initialSavedPlan.installments) && initialSavedPlan.installments.length > 0) {
        setMode(initialSavedPlan.mode === 'installment' ? 'installment' : 'full');
        const restored: PlanRow[] = initialSavedPlan.installments.map((row) => ({
          label: typeof row.label === 'string' ? row.label : '',
          amount: Number(row.amountMinor ?? row.amount_minor ?? 0) / 100,
          gstPercent: Number(row.gstPercent ?? row.gst_percent ?? 0),
          dueDate: typeof (row.dueDate ?? row.due_date) === 'string' ? (row.dueDate ?? row.due_date) as string : '',
        }));
        setPlan(restored);
        const reg = Number(initialSavedPlan.registration_fee_minor ?? 0) / 100;
        if (reg > 0) setRegistrationFee(reg);
      } else {
        setPlan(null);
      }
      setPricingLoading(true);
      try {
        let pkgMatched = false;
        // 1) Try the (offering, combination) package — this is where Naji's
        //    team actually sets pricing.
        if (offeringId && combinationId) {
          try {
            const packages = await api.listOfferingPackages(authToken, offeringId);
            if (cancelled) return;
            const pkg = packages.find((p) => String((p as { combination_id?: unknown }).combination_id) === String(combinationId)) as
              | { base_fee?: unknown; discount?: unknown; offered_fee?: unknown; registration_fee?: unknown; gst_percent?: unknown; gst_applicable?: unknown }
              | undefined;
            if (pkg) {
              pkgMatched = true;
              const base = Number(pkg.base_fee ?? 0);
              const disc = Number(pkg.discount ?? 0);
              const offered = Number(pkg.offered_fee ?? 0);
              const regFee = Number(pkg.registration_fee ?? 0);
              const gst = Number(pkg.gst_percent ?? 0);
              if (Number.isFinite(base) && base > 0) setBaseFee(base);
              if (Number.isFinite(disc) && disc > 0) setDiscount(disc);
              else if (offered > 0 && base > 0) setDiscount(Math.max(0, base - offered));
              if (Number.isFinite(regFee) && regFee > 0) setRegistrationFee(regFee);
              setGstPercent(Number.isFinite(gst) ? gst : 0);
            }
          } catch { /* fall through to combination/offering fallbacks */ }
        }
        // 2) Fallback — combination GST only (when no package row exists).
        if (!pkgMatched && combinationId) {
          try {
            const combo = await api.getCertificateCombination(authToken, combinationId);
            if (!cancelled && combo) {
              const c = combo as { gst_applicable?: unknown; gst_percent?: unknown };
              const applicable = Boolean(c.gst_applicable);
              const percent = Number(c.gst_percent ?? 0);
              if (!applicable) setGstPercent(0);
              else if (Number.isFinite(percent) && percent > 0) setGstPercent(percent);
            }
          } catch { /* keep current */ }
        }
        // 3) Fallback — offering-level pricing (legacy data without packages).
        if (!pkgMatched && offeringId) {
          try {
            const offerings = await api.listOfferings(authToken, {});
            if (cancelled) return;
            const list = Array.isArray(offerings) ? offerings : [];
            const off = list.find((o) => String((o as { id?: unknown }).id) === String(offeringId)) as
              | { base_fee?: unknown; pricing_amount?: unknown; discount?: unknown; offered_fee?: unknown }
              | undefined;
            if (off) {
              const base = Number(off.base_fee ?? off.pricing_amount ?? 0);
              const disc = Number(off.discount ?? 0);
              const offered = Number(off.offered_fee ?? 0);
              if (Number.isFinite(base) && base > 0) setBaseFee(base);
              if (Number.isFinite(disc) && disc > 0) setDiscount(disc);
              if (offered > 0 && base > 0 && disc <= 0) setDiscount(Math.max(0, base - offered));
            }
          } catch { /* keep prop seeds */ }
        }
        if (offeringId && combinationId) setPackageFound(pkgMatched);
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, api, authToken, offeringId, combinationId, initialBaseFee, initialDiscount, initialOfferedFee, initialGstPercent]);

  const breakdown: PriceBreakdown = useMemo(() => {
    const finalFee = Math.max(0, baseFee - discount);
    const gstAmount = finalFee * (gstPercent / 100);
    return {
      baseFee, discount, finalFee, gstPercent,
      gstAmount,
      feeIncGst: finalFee + gstAmount,
    };
  }, [baseFee, discount, gstPercent]);

  // Generate the payment plan rows per Naji's row-structure spec.
  // Naji 2026-05-09 — each row carries its own GST percent so the saved
  // plan can render Description / Instalment / GST / Instalment Inc GST
  // columns later. Naji UAT 2026-05-14 — Registration Fee rows now carry
  // 0% GST (flat administrative charge); only Course Fee installments
  // attract the offering's GST. This keeps Plan Total = Fee Inc. GST +
  // Registration Fee, matching the top-of-dialog breakdown the team
  // treats as authoritative.
  const generatePlan = () => {
    // Course fee (excl GST) = final fee. Registration fee is added on
    // top but is GST-free.
    const courseFeeExcl = breakdown.finalFee;
    const totalExcl = courseFeeExcl + registrationFee;
    const rows: PlanRow[] = [];
    const gst = breakdown.gstPercent;

    // Row 1: Registration Fee (Fee Due Now), Today's date. GST-free.
    if (registrationFee > 0 && registrationDueNow > 0) {
      rows.push({
        label: 'Registration Fee — Due Now',
        amount: Math.min(registrationDueNow, registrationFee),
        gstPercent: 0,
        dueDate: todayIso(),
      });
    }

    // Row 2..N: Registration Fee Balance — split across remaining splits, GST-free.
    const regBalance = Math.max(0, registrationFee - registrationDueNow);
    const regSplitsRemaining = Math.max(0, registrationSplitCount - 1);
    if (regBalance > 0 && regSplitsRemaining > 0) {
      const each = Math.round((regBalance / regSplitsRemaining) * 100) / 100;
      for (let i = 0; i < regSplitsRemaining; i++) {
        rows.push({
          label: `Registration Fee Balance ${i + 1} of ${regSplitsRemaining}`,
          amount: each,
          gstPercent: 0,
          dueDate: addMonthsIso(firstDueDate, i + 1),
        });
      }
    } else if (regBalance > 0) {
      // No remaining splits — push the balance as one row, GST-free.
      rows.push({
        label: 'Registration Fee Balance',
        amount: regBalance,
        gstPercent: 0,
        dueDate: addMonthsIso(firstDueDate, 1),
      });
    }

    // Row N+1..N+M: Remaining course-fee installments equally split. These
    // carry the offering's GST percent.
    const remainingCourseFee = Math.max(0, totalExcl - registrationFee);
    if (remainingInstallmentsCount > 0 && remainingCourseFee > 0) {
      const each = Math.round((remainingCourseFee / remainingInstallmentsCount) * 100) / 100;
      // Start dates after the registration-balance rows.
      const dateOffset = rows.length;
      for (let i = 0; i < remainingInstallmentsCount; i++) {
        rows.push({
          label: `Course Fee Installment ${i + 1} of ${remainingInstallmentsCount}`,
          amount: each,
          gstPercent: gst,
          dueDate: addMonthsIso(firstDueDate, dateOffset + i + 1),
        });
      }
    }

    if (rows.length === 0) {
      toast.error('Set Registration Fee + Due Now or Number of installments to generate a plan.');
      return;
    }
    setPlan(rows);
  };

  const updatePlanRow = (idx: number, patch: Partial<PlanRow>) => {
    setPlan((cur) => cur ? cur.map((r, i) => i === idx ? { ...r, ...patch } : r) : cur);
  };
  const removePlanRow = (idx: number) => {
    setPlan((cur) => cur ? cur.filter((_, i) => i !== idx) : cur);
  };

  const planTotals = useMemo(() => {
    const rows = plan ?? [];
    let excl = 0; let gst = 0; let incl = 0;
    for (const r of rows) {
      const a = Number.isFinite(r.amount) ? r.amount : 0;
      const g = Number.isFinite(r.gstPercent) ? r.gstPercent : 0;
      const gAmt = (a * g) / 100;
      excl += a; gst += gAmt; incl += a + gAmt;
    }
    return { excl, gst, incl };
  }, [plan]);

  const sendPaymentLink = async () => {
    if (mode === 'full') {
      const total = breakdown.feeIncGst;
      if (total <= 0) { toast.error('Total amount must be greater than 0.'); return; }
      setSubmitting(true);
      try {
        const res = await api.generatePaymentLink(authToken, {
          id: applicationId,
          mode: 'full',
          total_amount_minor: Math.round(total * 100),
          expires_in_days: linkExpiryDays,
        });
        const m = (res as { message?: string }).message ?? '';
        if ((res as { status?: number }).status === 1) {
          toast.success(m || 'Payment link sent.');
          onOpenChange(false);
          onSent?.();
        } else toast.error(m || 'Could not generate payment link.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed.');
      } finally { setSubmitting(false); }
      return;
    }

    // Installment Plan mode — use the generated/edited plan.
    if (!plan || plan.length === 0) { toast.error('Generate a payment plan first.'); return; }
    const total = planTotals.incl;
    setSubmitting(true);
    try {
      const res = await api.generatePaymentLink(authToken, {
        id: applicationId,
        mode: 'installment',
        total_amount_minor: Math.round(total * 100),
        registration_fee_minor: Math.round((plan[0]?.amount ?? 0) * 100),
        installments: plan.map((r) => ({
          label: r.label,
          amount_minor: Math.round(r.amount * 100),
          gst_percent: r.gstPercent,
          due_date: r.dueDate,
        })),
        expires_in_days: linkExpiryDays,
      });
      const m = (res as { message?: string }).message ?? '';
      if ((res as { status?: number }).status === 1) {
        toast.success(m || 'Payment link sent with plan.');
        onOpenChange(false);
        onSent?.();
      } else toast.error(m || 'Could not send payment link.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed.');
    } finally { setSubmitting(false); }
  };

  // Naji 2026-05-08 — Save persists to the applications.payment_plan
  // column without sending the link or creating a Razorpay link. Once
  // saved, the Lead Snapshot card on the View page surfaces the plan
  // summary so admins / counsellors don't recreate it.
  const savePlan = async () => {
    if (!plan || plan.length === 0) { toast.error('Nothing to save.'); return; }
    const total = planTotals.incl;
    setSubmitting(true);
    try {
      const res = await api.savePaymentPlan(authToken, {
        id: applicationId,
        mode: 'installment',
        total_amount_minor: Math.round(total * 100),
        registration_fee_minor: Math.round((plan[0]?.amount ?? 0) * 100),
        installments: plan.map((r) => ({
          label: r.label,
          amount_minor: Math.round(r.amount * 100),
          gst_percent: r.gstPercent,
          due_date: r.dueDate,
        })),
      });
      const m = (res as { message?: string }).message ?? '';
      if ((res as { status?: number }).status === 1) {
        toast.success(m || 'Payment plan saved.');
        onSent?.();
      } else {
        toast.error(m || 'Could not save plan.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(960px,calc(100vw-2rem))] max-w-[min(960px,calc(100vw-2rem))] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Generate Payment Link</DialogTitle>
          <DialogDescription>
            For <strong>{studentName}</strong>. Pricing pulled from the selected course offering.
          </DialogDescription>
        </DialogHeader>

        <div className="w-full min-w-0 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setMode('full'); setPlan(null); }}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${mode === 'full' ? 'border-ttii-primary bg-ttii-primary/5 text-ttii-primary' : 'border-slate-200 text-slate-600'}`}
            >
              Full Payment
            </button>
            <button
              type="button"
              onClick={() => setMode('installment')}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${mode === 'installment' ? 'border-ttii-primary bg-ttii-primary/5 text-ttii-primary' : 'border-slate-200 text-slate-600'}`}
            >
              Installment Plan
            </button>
          </div>

          {/* Offering-derived breakdown — only Discount editable per Naji */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Pricing {pricingLoading ? '(loading…)' : 'based on offering'}
            </p>
            {packageFound === false ? (
              <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                No pricing is set for this Offering and Combination pair.
                Set Base Fee, Discount, GST and Registration Fee under
                Courses → Course Offerings → Packages, or enter the
                values manually below.
              </div>
            ) : null}
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-2 text-slate-500">Base Fee</td>
                  <td className="py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      value={baseFee || ''}
                      onChange={(e) => setBaseFee(Number(e.target.value) || 0)}
                      className="w-32 rounded-md border border-slate-200 px-2 py-1 text-right text-sm"
                      placeholder="0"
                    />
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 text-slate-500">Discount</td>
                  <td className="py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      value={discount || ''}
                      onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                      className="w-32 rounded-md border border-slate-200 px-2 py-1 text-right text-sm"
                      placeholder="0"
                    />
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 font-semibold text-slate-700">Final Fee</td>
                  <td className="py-2 text-right font-semibold">{fmtInr(breakdown.finalFee)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 text-slate-500">GST ({breakdown.gstPercent}%)</td>
                  <td className="py-2 text-right">{fmtInr(breakdown.gstAmount)}</td>
                </tr>
                <tr className="border-b border-slate-100 bg-emerald-50/40">
                  <td className="py-2 font-bold text-slate-900">Fee Inc. GST</td>
                  <td className="py-2 text-right font-bold text-emerald-700">{fmtInr(breakdown.feeIncGst)}</td>
                </tr>
                {mode === 'installment' ? (
                  <tr>
                    <td className="py-2 text-slate-500">Registration Fee</td>
                    <td className="py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        value={registrationFee || ''}
                        onChange={(e) => setRegistrationFee(Number(e.target.value) || 0)}
                        className="w-32 rounded-md border border-slate-200 px-2 py-1 text-right text-sm"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Installment plan controls + generated plan */}
          {mode === 'installment' ? (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Payment Due Now (INR)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={registrationDueNow || ''}
                    onChange={(e) => setRegistrationDueNow(Number(e.target.value) || 0)}
                    placeholder="e.g. 5000"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reg Fee Split Count (max 3)</Label>
                  <select
                    value={registrationSplitCount}
                    onChange={(e) => setRegistrationSplitCount(Math.min(3, Math.max(1, Number(e.target.value))))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {[1, 2, 3].map((n) => (<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Number of Remaining Installments</Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    value={remainingInstallmentsCount}
                    onChange={(e) => setRemainingInstallmentsCount(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Preferred Due Date (first instalment)</Label>
                  <Input
                    type="date"
                    value={firstDueDate}
                    onChange={(e) => setFirstDueDate(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={generatePlan} className="bg-ttii-primary hover:bg-ttii-primary/90">
                Generate Plan
              </Button>

              {plan && plan.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Payment Plan — edit any row</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-slate-500">
                        <tr className="border-b border-slate-100">
                          <th className="px-2 py-2 text-left font-medium">Description</th>
                          <th className="px-2 py-2 text-right font-medium">Instalment (₹)</th>
                          <th className="px-2 py-2 text-right font-medium">GST %</th>
                          <th className="px-2 py-2 text-right font-medium">Instalment Inc. GST</th>
                          <th className="px-2 py-2 text-left font-medium">Due Date</th>
                          <th className="px-2 py-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {plan.map((r, idx) => {
                          const incGst = r.amount + (r.amount * (r.gstPercent || 0)) / 100;
                          return (
                            <tr key={idx} className="border-b border-slate-100">
                              <td className="px-2 py-1.5">
                                <input
                                  value={r.label}
                                  onChange={(e) => updatePlanRow(idx, { label: e.target.value })}
                                  className="w-full rounded-md border border-transparent bg-transparent px-2 py-1 text-sm hover:border-slate-200 focus:border-slate-300"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                <input
                                  type="number"
                                  value={r.amount}
                                  onChange={(e) => updatePlanRow(idx, { amount: Number(e.target.value) || 0 })}
                                  className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-sm"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={r.gstPercent}
                                  onChange={(e) => updatePlanRow(idx, { gstPercent: Number(e.target.value) || 0 })}
                                  className="w-16 rounded-md border border-slate-200 px-2 py-1 text-right text-sm"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-right font-medium text-slate-900">
                                {fmtInr(incGst)}
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="date"
                                  value={r.dueDate}
                                  onChange={(e) => updatePlanRow(idx, { dueDate: e.target.value })}
                                  className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                                />
                              </td>
                              <td className="px-2 py-1.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => removePlanRow(idx)}
                                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                                  title="Remove row"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-50">
                          <td className="px-2 py-2 font-semibold text-slate-700">Plan total</td>
                          <td className="px-2 py-2 text-right font-medium text-slate-700">{fmtInr(planTotals.excl)}</td>
                          <td className="px-2 py-2 text-right text-xs text-slate-500">{fmtInr(planTotals.gst)}</td>
                          <td className="px-2 py-2 text-right font-bold text-emerald-700">{fmtInr(planTotals.incl)}</td>
                          <td colSpan={2} />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="space-y-1">
            <Label className="text-xs">Link Expiry (days)</Label>
            <Input
              type="number"
              min={1}
              value={linkExpiryDays}
              onChange={(e) => setLinkExpiryDays(Math.max(1, Number(e.target.value) || 7))}
            />
          </div>
        </div>

        {/* Footer buttons — Naji's spec: Lead | Save | Save and Cancel |
            Cancel | Send the Payment Link */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {mode === 'installment' && plan ? (
            <>
              <Button variant="outline" onClick={() => { void savePlan(); }} disabled={submitting}>Save</Button>
              <Button
                variant="outline"
                onClick={() => { void savePlan().then(() => onOpenChange(false)); }}
                disabled={submitting}
              >
                Save &amp; Close
              </Button>
            </>
          ) : null}
          <Button
            onClick={() => { void sendPaymentLink(); }}
            disabled={submitting || (mode === 'installment' && (!plan || plan.length === 0))}
            className="bg-ttii-primary hover:bg-ttii-primary/90"
          >
            {submitting ? 'Sending…' : 'Send the Payment Link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
