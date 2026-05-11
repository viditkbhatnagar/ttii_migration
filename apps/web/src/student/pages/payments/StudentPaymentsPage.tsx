import { useState, useCallback } from 'react';
import { CreditCard, Package, Tag, History, Calendar, Receipt, Wallet, Loader2 } from 'lucide-react';
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
  if (lower === 'paid') return 'bg-green-100 text-green-700 border-green-200';
  if (lower === 'overdue') return 'bg-red-100 text-red-700 border-red-200';
  if (lower === 'due') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function getPaymentStatusStyle(status: string): string {
  const lower = status.toLowerCase();
  if (lower === 'success') return 'bg-green-100 text-green-700 border-green-200';
  if (lower === 'failed') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-yellow-100 text-yellow-700 border-yellow-200';
}

interface PaymentsBundle {
  payments: Awaited<ReturnType<StudentPortalApi['loadPayments']>>;
  paymentHistory: StudentPaymentHistoryItem[];
  installments: StudentInstallmentItem[];
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

  if (loading) {
    return <PageLoader label="Loading student payments..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-student-text">Payments</h1>
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  const paymentDetails = data?.paymentDetails ?? {};
  const totalFee = asNumber(paymentDetails.total_fee) || asNumber(paymentDetails.total_amount);
  const paidAmount = asNumber(paymentDetails.paid_amount) || asNumber(paymentDetails.amount_paid);
  const pendingAmount = totalFee > 0 ? totalFee - paidAmount : asNumber(paymentDetails.pending_amount);
  const paymentPercent = totalFee > 0 ? Math.round((paidAmount / totalFee) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-student-text">Payments</h1>
          <p className="mt-1 text-sm text-student-muted">Manage your fees and transactions</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} className="rounded-xl">Refresh</Button>
      </div>

      {/* Payment Summary Cards */}
      {totalFee > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-student-text">{formatCurrency(totalFee)}</p>
                <p className="mt-0.5 text-xs font-medium text-student-muted">Total Fee</p>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Wallet aria-hidden="true" className="size-5" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-student-text">{formatCurrency(paidAmount)}</p>
                <p className="mt-0.5 text-xs font-medium text-student-muted">Paid</p>
              </div>
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <CreditCard aria-hidden="true" className="size-5" />
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-2xl font-semibold ${pendingAmount > 0 ? 'text-red-600' : 'text-student-text'}`}>
                  {formatCurrency(pendingAmount)}
                </p>
                <p className="mt-0.5 text-xs font-medium text-student-muted">Pending</p>
              </div>
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${pendingAmount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                <Receipt aria-hidden="true" className="size-5" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Progress Bar */}
      {totalFee > 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-student-muted">Payment Progress</span>
            <span className="font-semibold text-student-primary">{paymentPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-student-primary transition-all duration-500 ease-out"
              style={{ width: `${Math.min(paymentPercent, 100)}%` }}
              role="progressbar"
              aria-valuenow={paymentPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Payment progress: ${paymentPercent}%`}
            />
          </div>
        </div>
      ) : null}

      {/* Payment History */}
      <Card className="rounded-xl border-slate-200 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="size-5 text-student-primary" />
            Payment History
          </CardTitle>
          <CardDescription>Your payment transactions</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {!paymentHistory || paymentHistory.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Receipt aria-hidden="true" className="size-12 text-slate-300" />
              <p className="text-sm text-student-muted">No payment transactions yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paymentHistory.map((payment: StudentPaymentHistoryItem) => (
                <div key={payment.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-student-text">
                      {payment.courseTitle || 'Course Payment'}
                    </p>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-student-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {payment.paymentDate ? formatDate(payment.paymentDate) : 'N/A'}
                      </span>
                      <span>{payment.paymentMode}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-student-text">{formatCurrency(payment.amount)}</span>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPaymentStatusStyle(payment.status)}`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Installment Schedule */}
      {installments && installments.length > 0 ? (
        <Card className="rounded-xl border-slate-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="size-5 text-student-primary" />
              Installment Schedule
            </CardTitle>
            <CardDescription>Your fee installment plan</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <div className="divide-y divide-slate-100">
              {installments.map((inst: StudentInstallmentItem) => (
                <div key={inst.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-student-text">
                      {inst.installmentDetails}
                    </p>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-student-muted">
                      <span>Due: {inst.dueDate ? formatDate(inst.dueDate) : 'N/A'}</span>
                      {inst.paidDate ? <span>Paid: {formatDate(inst.paidDate)}</span> : null}
                      {inst.paymentMode ? <span>{inst.paymentMode}</span> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-student-text">{formatCurrency(inst.amount)}</span>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getInstallmentStatusStyle(inst.status)}`}>
                      {inst.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Course Fees */}
      {(data?.studentCourses ?? []).length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-student-text">Course Fees</h2>
          <div className="space-y-3">
            {(data?.studentCourses ?? []).map((course) => {
              const courseId = asString(course.course_id) || asString(course.id);
              const title = asString(course.title) || `Course ${courseId}`;
              const status = asString(course.status);
              const balance = asNumber(course.balance);

              const isPaying = payingCourseId === courseId;
              return (
                <div key={courseId} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-student-text">{title}</p>
                    {status ? (
                      <span className={`mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        status.toLowerCase() === 'paid' || status.toLowerCase() === 'completed'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {status}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    {balance > 0 ? (
                      <>
                        <p className="text-sm font-semibold text-red-600">Balance: {formatCurrency(balance)}</p>
                        <Button
                          size="sm"
                          className="bg-student-primary text-white hover:bg-student-primary/90"
                          onClick={() => openPayDialog(courseId, title, balance)}
                          disabled={isPaying || payingCourseId !== null}
                        >
                          {isPaying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isPaying ? 'Processing…' : 'Pay Now'}
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-emerald-600">Paid</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Packages */}
      {(data?.packages ?? []).length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-student-text">Available Packages</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(data?.packages ?? []).map((pkg) => {
              const id = asString(pkg.id);
              const title = asString(pkg.title) || `Package ${id}`;
              const amount = asNumber(pkg.payable_amount) || asNumber(pkg.price);
              const isPurchased = pkg.is_purchased === true || pkg.is_purchased === 1 || pkg.is_purchased === '1';

              return (
                <div key={id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                    <Package aria-hidden="true" className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-student-text">{title}</p>
                    <p className="text-sm font-semibold text-student-primary">{formatCurrency(amount)}</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    isPurchased
                      ? 'bg-green-100 text-green-700 border-green-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {isPurchased ? 'Enrolled' : 'Available'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

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

      {/* Coupon */}
      <Card className="rounded-xl border-slate-200 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="size-5 text-student-primary" />
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
    </div>
  );
}
