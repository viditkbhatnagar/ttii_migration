import { useState, useCallback, useMemo } from 'react';
import {
  CreditCard,
  Package,
  Tag,
  Calendar,
  Receipt,
  Loader2,
  CalendarClock,
  Download,
  FileText,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PageLoader } from '@/components/ui/page-loader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCardForm, type CardConfirmState } from '@/components/payments/CreditCardForm';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatCurrency, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import { openRazorpayCheckout } from '@/lib/razorpay-checkout';
import type { StudentPaymentHistoryItem, StudentInstallmentItem, StudentPortalApi } from '../../student-portal-api.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

function getInstallmentStatusStyle(status: string): string {
  const lower = status.toLowerCase();
  if (lower === 'paid') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (lower === 'overdue') return 'bg-red-100 text-red-700 border-red-200';
  if (lower === 'due') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function isPaidStatus(status: string): boolean {
  return status.toLowerCase() === 'paid';
}

function getHistoryStatusStyle(status: string): string {
  const lower = status.toLowerCase();
  if (lower === 'success' || lower === 'paid') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (lower === 'failed') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

function getHistoryStatusLabel(status: string): string {
  return status.toLowerCase() === 'success' ? 'Paid' : status;
}

interface PaymentsBundle {
  payments: Awaited<ReturnType<StudentPortalApi['loadPayments']>>;
  paymentHistory: StudentPaymentHistoryItem[];
  installments: StudentInstallmentItem[];
}

interface SelectedCourse {
  courseId: string;
  title: string;
  totalFee: number;
  amountPaid: number;
  balance: number;
  status: string;
}

// Pick the course the Outstanding Balance card represents: prefer the
// snapshot's selectedCourseId, then the first course that still owes money,
// then the first course outright. Real data only — never fabricated.
function pickSelectedCourse(
  studentCourses: Record<string, unknown>[],
  selectedCourseId: string,
): SelectedCourse | null {
  const firstCourse = studentCourses[0];
  if (!firstCourse) return null;

  const toSelected = (row: Record<string, unknown>): SelectedCourse => {
    const courseId = asString(row.course_id) || asString(row.id);
    return {
      courseId,
      title: asString(row.title) || `Course ${courseId}`,
      totalFee: asNumber(row.total_fee) || asNumber(row.total_amount),
      amountPaid: asNumber(row.amount_paid),
      balance: asNumber(row.balance),
      status: asString(row.status),
    };
  };

  const matched = selectedCourseId
    ? studentCourses.find((row) => asString(row.course_id) === selectedCourseId)
    : undefined;
  if (matched) return toSelected(matched);

  const owing = studentCourses.find((row) => asNumber(row.balance) > 0);
  return toSelected(owing ?? firstCourse);
}

export default function StudentPaymentsPage({ api, session }: StudentPageProps) {
  const { data: bundle, loading, error, reload } = useAdminPageData<PaymentsBundle>(
    async () => {
      const [payments, paymentHistory, installments] = await Promise.all([
        api.loadPayments(session.token),
        api.loadPaymentHistory(session.token),
        api.loadInstallments(session.token),
      ]);
      return { payments, paymentHistory, installments };
    },
    [api, session.token],
    `student:payments:${session.userId}`,
  );

  const data = bundle?.payments;
  const paymentHistory = bundle?.paymentHistory;
  const installments = bundle?.installments;

  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{ success: boolean; message: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [payingCourseId, setPayingCourseId] = useState<string | null>(null);
  // Naji 2026-05-11 — flip-card payment dialog with the 21st.dev design.
  // The dialog captures only Card Holder Name + Expiry (non-sensitive). Card
  // number and CVV are entered inside Razorpay Checkout's PCI-compliant
  // iframe — they never touch our React state or our backend.
  const [payDialogCourseId, setPayDialogCourseId] = useState<string | null>(null);
  const [payDialogCourseTitle, setPayDialogCourseTitle] = useState<string>('');
  const [payDialogAmount, setPayDialogAmount] = useState<number>(0);

  /**
   * Razorpay payment flow:
   *   1. POST our backend to create a Razorpay order (returns order_id + key + amount)
   *   2. Open Razorpay Checkout popup with those params + cardholder prefill
   *   3. On success, send the signed response back so the server can verify
   *      the HMAC signature and mark the fee_installment paid.
   *   4. Reload the payments view either way so the UI reflects state.
   */
  const launchRazorpay = useCallback(async (courseId: string, courseTitle: string, holderName: string) => {
    if (!courseId || payingCourseId) return;
    setPayingCourseId(courseId);
    try {
      const order = await api.createOrder(session.token, courseId);
      const orderId = asString(order.order_id);
      const key = asString(order.key);
      const amount = asNumber(order.amount);
      const currency = asString(order.currency) || 'INR';

      if (!orderId || !key || amount <= 0) {
        toast.error('Could not start payment — please try again.');
        return;
      }

      const result = await openRazorpayCheckout({
        orderId,
        amount,
        currency,
        keyId: key,
        name: "Teachers' Training Institute of India",
        description: courseTitle,
        ...(holderName ? { prefill: { name: holderName } } : {}),
      });

      if (result.status === 'cancelled') {
        toast.info('Payment cancelled.');
        return;
      }
      if (result.status === 'failed') {
        toast.error(result.message || 'Payment failed.');
        reload();
        return;
      }

      const verify = await api.completeOrder(session.token, {
        courseId,
        razorpayOrderId: result.orderId,
        razorpayPaymentId: result.paymentId,
        razorpaySignature: result.signature,
      });
      if (verify.ok) {
        toast.success('Payment successful.');
      } else {
        toast.error(verify.message || 'Payment verification failed.');
      }
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment could not be processed.');
    } finally {
      setPayingCourseId(null);
    }
  }, [api, payingCourseId, reload, session.token]);

  // Pay Now button → open dialog with the card-form preview.
  const openPayDialog = useCallback((courseId: string, courseTitle: string, balance: number) => {
    setPayDialogCourseId(courseId);
    setPayDialogCourseTitle(courseTitle);
    setPayDialogAmount(balance);
  }, []);

  const handleCardFormSubmit = useCallback((state: CardConfirmState) => {
    if (!payDialogCourseId) return;
    const courseId = payDialogCourseId;
    const title = payDialogCourseTitle;
    // Close the dialog before opening Razorpay so the Razorpay modal sits
    // on top of the regular page, not stacked over the dialog.
    setPayDialogCourseId(null);
    void launchRazorpay(courseId, title, state.holder);
  }, [payDialogCourseId, payDialogCourseTitle, launchRazorpay]);

  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim() || !data?.selectedCourseId || !data?.selectedPackageId) return;
    setCouponLoading(true);
    setCouponResult(null);
    try {
      const response = await api.applyCoupon(session.token, {
        courseId: data.selectedCourseId,
        packageId: data.selectedPackageId,
        couponCode: couponCode.trim(),
      });
      const status = asNumber(response.status);
      const message = asString(response.message) || (status === 1 ? 'Coupon applied!' : 'Invalid coupon.');
      setCouponResult({ success: status === 1, message });
    } catch (err: unknown) {
      setCouponResult({ success: false, message: err instanceof Error ? err.message : 'Failed to apply coupon.' });
    } finally {
      setCouponLoading(false);
    }
  }, [api, session.token, couponCode, data]);

  // The Outstanding Balance card + Installment Plan are driven by the
  // selected course (real financials live on each studentCourses row; the
  // /payment/get_payment_details endpoint returns empty strings).
  const selectedCourse = useMemo(
    () => pickSelectedCourse(data?.studentCourses ?? [], data?.selectedCourseId ?? ''),
    [data?.studentCourses, data?.selectedCourseId],
  );

  const sortedInstallments = useMemo(() => (installments ?? []).slice(), [installments]);
  const paidInstallments = sortedInstallments.filter((inst) => isPaidStatus(inst.status)).length;
  const totalInstallments = sortedInstallments.length;
  const nextDue = sortedInstallments.find((inst) => !isPaidStatus(inst.status));

  if (loading) {
    return <PageLoader label="Loading student payments..." />;
  }

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-student-text">Payments &amp; Billing</h1>
      <p className="mt-1 text-sm text-student-muted">Manage your fees and transactions</p>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  const balance = selectedCourse?.balance ?? 0;
  const totalFee = selectedCourse?.totalFee ?? 0;
  const installmentPercent = totalInstallments > 0 ? Math.round((paidInstallments / totalInstallments) * 100) : 0;
  const canPaySelected = Boolean(selectedCourse && balance > 0);
  const isPayingSelected = selectedCourse ? payingCourseId === selectedCourse.courseId : false;

  const handlePaySelected = () => {
    if (!selectedCourse || balance <= 0) return;
    openPayDialog(selectedCourse.courseId, selectedCourse.title, balance);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {header}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={reload} className="rounded-xl">Refresh</Button>
          <Button
            size="sm"
            className="rounded-xl bg-student-primary text-white hover:bg-student-primary/90"
            onClick={handlePaySelected}
            disabled={!canPaySelected || payingCourseId !== null}
          >
            <CreditCard aria-hidden="true" className="size-4" />
            Pay Now
          </Button>
        </div>
      </div>

      {/* Outstanding Balance (left) + Installment Plan (right) */}
      {selectedCourse ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Gradient Outstanding Balance card */}
          <div className="lg:col-span-2">
            <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-2xl bg-gradient-to-br from-student-primary to-student-accent p-6 text-white shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                    {balance > 0 ? 'Outstanding Balance' : 'Balance Cleared'}
                  </p>
                  <p className="mt-2 text-4xl font-bold tabular-nums">{formatCurrency(balance)}</p>
                  <p className="mt-2 truncate text-sm text-white/90">{selectedCourse.title}</p>
                </div>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
                  <Receipt aria-hidden="true" className="size-5 text-white" />
                </span>
              </div>

              <div className="space-y-3">
                {nextDue?.dueDate ? (
                  <p className="flex items-center gap-2 text-sm text-white/90">
                    <CalendarClock aria-hidden="true" className="size-4" />
                    Next due by {formatDate(nextDue.dueDate)}
                  </p>
                ) : balance <= 0 ? (
                  <p className="flex items-center gap-2 text-sm text-white/90">
                    <CheckCircle2 aria-hidden="true" className="size-4" />
                    All installments paid
                  </p>
                ) : null}

                {totalInstallments > 0 ? (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs text-white/80">
                      <span>{paidInstallments} of {totalInstallments} installments paid</span>
                      <span className="font-semibold tabular-nums">{installmentPercent}%</span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-white/25"
                      role="progressbar"
                      aria-valuenow={installmentPercent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${paidInstallments} of ${totalInstallments} installments paid`}
                    >
                      <div
                        className="h-full rounded-full bg-white transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(installmentPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                ) : totalFee > 0 ? (
                  <p className="text-xs text-white/80">
                    {formatCurrency(selectedCourse.amountPaid)} paid of {formatCurrency(totalFee)}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {balance > 0 ? (
                    <Button
                      size="sm"
                      className="rounded-xl bg-white text-student-primary hover:bg-white/90"
                      onClick={handlePaySelected}
                      disabled={payingCourseId !== null}
                    >
                      {isPayingSelected ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
                      {isPayingSelected ? 'Processing…' : `Pay ${formatCurrency(balance)}`}
                    </Button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-sm font-semibold text-white ring-1 ring-white/30">
                      <CheckCircle2 aria-hidden="true" className="size-4" />
                      Fully Paid
                    </span>
                  )}
                  {/* No scheduling endpoint exists — surfaced but disabled
                      rather than wiring a fake action. */}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled
                    title="Scheduling payments is coming soon"
                    aria-disabled="true"
                    className="rounded-xl border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                  >
                    <Calendar aria-hidden="true" className="size-4" />
                    Schedule
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Installment Plan */}
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar aria-hidden="true" className="size-5 text-student-primary" />
                Installment Plan
              </CardTitle>
              <CardDescription>Your fee schedule</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {totalInstallments === 0 ? (
                <p className="py-6 text-center text-sm text-student-muted">No installment plan on file.</p>
              ) : (
                <ul className="space-y-3">
                  {sortedInstallments.map((inst: StudentInstallmentItem, index) => {
                    const paid = isPaidStatus(inst.status);
                    return (
                      <li key={inst.id} className="flex items-center gap-3">
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                            paid
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-student-primary/10 text-student-primary'
                          }`}
                          aria-hidden="true"
                        >
                          {paid ? <Check className="size-4" /> : (inst.installmentNo || index + 1)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-student-text">{inst.installmentDetails}</p>
                          <p className="text-xs text-student-muted">
                            {inst.dueDate ? `Due ${formatDate(inst.dueDate)}` : 'No due date'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-semibold tabular-nums text-student-text">
                            {formatCurrency(inst.amount)}
                          </span>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getInstallmentStatusStyle(inst.status)}`}>
                            {inst.status}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Payment History */}
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt aria-hidden="true" className="size-5 text-student-primary" />
              Payment History
            </CardTitle>
            <CardDescription>Your past transactions</CardDescription>
          </div>
          {/* No export/document endpoint exists yet — kept visible but
              disabled rather than faking a download. */}
          <Button
            size="sm"
            variant="outline"
            disabled
            title="Export is coming soon"
            aria-disabled="true"
            className="rounded-xl"
          >
            <Download aria-hidden="true" className="size-4" />
            Export
          </Button>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {!paymentHistory || paymentHistory.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Receipt aria-hidden="true" className="size-12 text-slate-300" />
              <p className="text-sm text-student-muted">No payment transactions yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {paymentHistory.map((payment: StudentPaymentHistoryItem) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-student-text">
                      {payment.courseTitle || 'Course Payment'}
                    </p>
                    <p className="mt-0.5 text-xs text-student-muted">
                      <span className="font-mono">#{payment.id}</span>
                      {' · '}
                      {payment.paymentDate ? formatDate(payment.paymentDate) : 'N/A'}
                      {payment.paymentMode ? ` · ${payment.paymentMode}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold tabular-nums text-student-text">{formatCurrency(payment.amount)}</span>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getHistoryStatusStyle(payment.status)}`}>
                      {getHistoryStatusLabel(payment.status)}
                    </span>
                    {/* No invoice/receipt PDF endpoint — disabled links, no
                        fabricated documents. */}
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled
                        title="Invoice download coming soon"
                        aria-disabled="true"
                        className="h-8 gap-1 rounded-lg px-2 text-xs text-student-muted"
                      >
                        <FileText aria-hidden="true" className="size-3.5" />
                        Invoice
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled
                        title="Receipt download coming soon"
                        aria-disabled="true"
                        className="h-8 gap-1 rounded-lg px-2 text-xs text-student-muted"
                      >
                        <Receipt aria-hidden="true" className="size-3.5" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Course Fees — all enrolled courses with an outstanding balance can
          be paid here via the same Razorpay flow. */}
      {(data?.studentCourses ?? []).length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-student-text">Course Fees</h2>
          <div className="space-y-3">
            {(data?.studentCourses ?? []).map((course) => {
              const courseId = asString(course.course_id) || asString(course.id);
              const title = asString(course.title) || `Course ${courseId}`;
              const status = asString(course.status);
              const courseBalance = asNumber(course.balance);

              const isPaying = payingCourseId === courseId;
              return (
                <div key={courseId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-student-text">{title}</p>
                    {status ? (
                      <span className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        status.toLowerCase() === 'paid' || status.toLowerCase() === 'completed'
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                          : status.toLowerCase() === 'overdue'
                            ? 'bg-red-100 text-red-700 border-red-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                      }`}>
                        {status}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    {courseBalance > 0 ? (
                      <>
                        <p className="text-sm font-semibold text-red-600">Balance: {formatCurrency(courseBalance)}</p>
                        <Button
                          size="sm"
                          className="rounded-xl bg-student-primary text-white hover:bg-student-primary/90"
                          onClick={() => openPayDialog(courseId, title, courseBalance)}
                          disabled={isPaying || payingCourseId !== null}
                        >
                          {isPaying ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
                          {isPaying ? 'Processing…' : 'Pay Now'}
                        </Button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                        <CheckCircle2 aria-hidden="true" className="size-4" />
                        Paid
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Packages */}
      {(data?.packages ?? []).length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-student-text">Available Packages</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(data?.packages ?? []).map((pkg) => {
              const id = asString(pkg.id);
              const title = asString(pkg.title) || `Package ${id}`;
              const amount = asNumber(pkg.payable_amount) || asNumber(pkg.price);
              const isPurchased = pkg.is_purchased === true || pkg.is_purchased === 1 || pkg.is_purchased === '1';

              return (
                <div key={id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-student-primary/10 text-student-primary">
                    <Package aria-hidden="true" className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-student-text">{title}</p>
                    <p className="text-sm font-semibold text-student-primary">{formatCurrency(amount)}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    isPurchased
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {isPurchased ? 'Enrolled' : 'Available'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Coupon */}
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag aria-hidden="true" className="size-5 text-student-primary" />
            Apply Coupon
          </CardTitle>
          <CardDescription>Enter a coupon code to get a discount on your course fee</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-3 pt-4">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void handleApplyCoupon();
            }}
          >
            {couponResult ? (
              <div
                role={couponResult.success ? 'status' : 'alert'}
                aria-live={couponResult.success ? 'polite' : 'assertive'}
                className={`rounded-xl px-4 py-3 text-sm ${couponResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
              >
                {couponResult.message}
              </div>
            ) : null}
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label htmlFor="coupon" className="text-xs uppercase tracking-wider text-student-muted">Coupon Code</Label>
                <Input
                  id="coupon"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter coupon code"
                  className="rounded-xl"
                />
              </div>
              <Button
                type="submit"
                className="rounded-xl bg-student-primary hover:bg-student-primary/90"
                disabled={couponLoading || !couponCode.trim()}
              >
                {couponLoading ? 'Applying...' : 'Apply'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Payment Dialog — Naji 2026-05-11 flip-card preview. Cardholder
          Name + Expiry captured here; PAN/CVV happens inside Razorpay. */}
      <Dialog
        open={payDialogCourseId !== null}
        onOpenChange={(open) => { if (!open) setPayDialogCourseId(null); }}
      >
        <DialogContent className="w-[min(960px,calc(100vw-2rem))] max-w-[min(960px,calc(100vw-2rem))] p-6">
          <DialogHeader>
            <DialogTitle>
              Pay {payDialogAmount > 0 ? formatCurrency(payDialogAmount) : ''}
              {payDialogCourseTitle ? ` for ${payDialogCourseTitle}` : ''}
            </DialogTitle>
          </DialogHeader>
          <CreditCardForm
            {...(payDialogAmount > 0 ? { amountDisplay: formatCurrency(payDialogAmount) } : {})}
            merchantLabel="TTII LMS"
            {...(payDialogCourseTitle ? { itemDescription: payDialogCourseTitle } : {})}
            submitLabel={`Pay ${payDialogAmount > 0 ? formatCurrency(payDialogAmount) : ''} with Razorpay`}
            submitting={payingCourseId !== null}
            onSubmit={handleCardFormSubmit}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
