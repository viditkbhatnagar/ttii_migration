import { useState, useCallback } from 'react';
import { CreditCard, Package, Tag, History, Calendar, Receipt, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatCurrency, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPaymentHistoryItem, StudentInstallmentItem } from '../../student-portal-api.js';
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

export default function StudentPaymentsPage({ api, session }: StudentPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadPayments(session.token),
    [api, session.token],
  );

  const { data: paymentHistory, loading: historyLoading } = useAdminPageData(
    () => api.loadPaymentHistory(session.token),
    [api, session.token],
  );

  const { data: installments, loading: installmentsLoading } = useAdminPageData(
    () => api.loadInstallments(session.token),
    [api, session.token],
  );

  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<{ success: boolean; message: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

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
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-student-text">Payments</h1>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalFee)}</p>
                <p className="mt-1 text-sm text-white/80">Total Fee</p>
              </div>
              <div className="rounded-xl bg-white/20 p-3">
                <Wallet className="size-6 text-blue-100" />
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(paidAmount)}</p>
                <p className="mt-1 text-sm text-white/80">Paid</p>
              </div>
              <div className="rounded-xl bg-white/20 p-3">
                <CreditCard className="size-6 text-emerald-100" />
              </div>
            </div>
          </div>
          <div className={`rounded-2xl bg-gradient-to-br ${pendingAmount > 0 ? 'from-red-500 to-red-600' : 'from-slate-500 to-slate-600'} p-5 text-white shadow-md`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{formatCurrency(pendingAmount)}</p>
                <p className="mt-1 text-sm text-white/80">Pending</p>
              </div>
              <div className="rounded-xl bg-white/20 p-3">
                <Receipt className="size-6 text-white/80" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Progress Bar */}
      {totalFee > 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-student-muted">Payment Progress</span>
            <span className="font-semibold text-student-primary">{paymentPercent}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700 ease-out"
              style={{ width: `${Math.min(paymentPercent, 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Payment History */}
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="size-5 text-student-primary" />
            Payment History
          </CardTitle>
          <CardDescription>Your payment transactions</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          {historyLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : !paymentHistory || paymentHistory.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <Receipt className="size-12 text-slate-300" />
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
      {!installmentsLoading && installments && installments.length > 0 ? (
        <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
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

              return (
                <div key={courseId} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-md">
                  <div>
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
                  {balance > 0 ? (
                    <p className="text-sm font-semibold text-red-600">Balance: {formatCurrency(balance)}</p>
                  ) : (
                    <p className="text-sm font-semibold text-emerald-600">Paid</p>
                  )}
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
                <div key={id} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-md">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-100">
                    <Package className="size-5 text-purple-600" />
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

      {/* Coupon */}
      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Tag className="size-5 text-student-primary" />
            Apply Coupon
          </CardTitle>
          <CardDescription>Enter a coupon code to get a discount on your course fee</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-3 pt-4">
          {couponResult ? (
            <div className={`rounded-xl px-4 py-3 text-sm ${couponResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
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
              className="rounded-xl bg-student-primary hover:bg-student-primary/90"
              disabled={couponLoading || !couponCode.trim()}
              onClick={() => void handleApplyCoupon()}
            >
              {couponLoading ? 'Applying...' : 'Apply'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
