import { useState, useCallback } from 'react';
import { CreditCard, Package, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatCurrency } from '../../../admin/shared/utils/admin-data-utils.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

export default function StudentPaymentsPage({ api, session }: StudentPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadPayments(session.token),
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
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Payments</h1>
        <Card className="bg-white">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
          </CardContent>
        </Card>
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
        <h1 className="text-xl font-semibold text-gray-900">Payments</h1>
        <Button variant="outline" size="sm" onClick={reload}>Refresh</Button>
      </div>

      {/* Payment Summary */}
      {totalFee > 0 ? (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="size-5 text-ttii-primary" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalFee)}</p>
                <p className="text-sm text-gray-500">Total Fee</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(paidAmount)}</p>
                <p className="text-sm text-gray-500">Paid</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${pendingAmount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCurrency(pendingAmount)}
                </p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-gray-500">
                <span>Payment Progress</span>
                <span>{paymentPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(paymentPercent, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Course Fees */}
      {(data?.studentCourses ?? []).length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Course Fees</h2>
          <div className="space-y-3">
            {(data?.studentCourses ?? []).map((course) => {
              const courseId = asString(course.course_id) || asString(course.id);
              const title = asString(course.title) || `Course ${courseId}`;
              const status = asString(course.status);
              const balance = asNumber(course.balance);

              return (
                <Card key={courseId} className="bg-white">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-gray-900">{title}</p>
                      {status ? (
                        <Badge variant={status.toLowerCase() === 'paid' ? 'default' : 'secondary'} className="mt-1 text-xs">
                          {status}
                        </Badge>
                      ) : null}
                    </div>
                    {balance > 0 ? (
                      <p className="text-sm font-semibold text-red-600">Balance: {formatCurrency(balance)}</p>
                    ) : (
                      <p className="text-sm font-semibold text-emerald-600">Paid</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Packages */}
      {(data?.packages ?? []).length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Available Packages</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(data?.packages ?? []).map((pkg) => {
              const id = asString(pkg.id);
              const title = asString(pkg.title) || `Package ${id}`;
              const amount = asNumber(pkg.payable_amount) || asNumber(pkg.price);
              const isPurchased = pkg.is_purchased === true || pkg.is_purchased === 1 || pkg.is_purchased === '1';

              return (
                <Card key={id} className="bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                        <Package className="size-4 text-purple-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{title}</p>
                        <p className="text-sm font-semibold text-ttii-primary">{formatCurrency(amount)}</p>
                      </div>
                      {isPurchased ? (
                        <Badge variant="default" className="text-xs">Enrolled</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Available</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Coupon */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="size-4 text-ttii-primary" />
            Apply Coupon
          </CardTitle>
          <CardDescription>Enter a coupon code to get a discount on your course fee</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-3 pt-4">
          {couponResult ? (
            <div className={`rounded-md px-4 py-3 text-sm ${couponResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {couponResult.message}
            </div>
          ) : null}
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="coupon">Coupon Code</Label>
              <Input
                id="coupon"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter coupon code"
              />
            </div>
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
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
