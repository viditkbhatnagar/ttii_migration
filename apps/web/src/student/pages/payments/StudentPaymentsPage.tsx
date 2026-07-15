import { useState, useCallback, useMemo } from 'react';
import {
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Calendar,
  BookOpen,
  ListChecks,
  Download,
  Search,
  Eye,
  Loader2,
  Gift,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StudentLoader as PageLoader } from '@/student/components/StudentLoader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCardForm, type CardConfirmState } from '@/components/payments/CreditCardForm';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asString, asNumber, formatCurrency, formatDate } from '../../../admin/shared/utils/admin-data-utils.js';
import { openRazorpayCheckout } from '@/lib/razorpay-checkout';
import type { StudentPortalApi } from '../../student-portal-api.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

/* ─── Types ──────────────────────────────────────────────────── */

interface CourseInstallment {
  id: string;
  no: number;
  details: string;
  amount: number;
  dueDate: string;
  status: string;
  paid: boolean;
}

interface CourseAccount {
  courseId: string;
  title: string;
  enrolledOn: string;
  totalFee: number;
  amountPaid: number;
  balance: number;
  percentPaid: number;
  status: string;
  isFree: boolean;
  installments: CourseInstallment[];
  paidCount: number;
  pendingCount: number;
  nextDue: CourseInstallment | null;
}

interface PaymentsBundle {
  payments: Awaited<ReturnType<StudentPortalApi['loadPayments']>>;
}

type CourseTab = 'all' | 'paid' | 'free' | 'active' | 'completed';
type DueLevel = 'overdue' | 'due-soon' | 'pending';

/* ─── Helpers ────────────────────────────────────────────────── */

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function normalizeInstallment(raw: Record<string, unknown>, index: number): CourseInstallment {
  const status = asString(raw.status);
  return {
    id: asString(raw.id) || `inst-${index}`,
    no: asNumber(raw.installment_no) || index + 1,
    details: asString(raw.installment_details) || `Installment ${index + 1}`,
    amount: asNumber(raw.amount),
    dueDate: asString(raw.due_date),
    status,
    paid: status.toLowerCase() === 'paid',
  };
}

function normalizeCourse(raw: Record<string, unknown>): CourseAccount {
  const courseId = asString(raw.course_id) || asString(raw.id);
  const totalFee = asNumber(raw.total_fee) || asNumber(raw.total_amount);
  const amountPaid = asNumber(raw.amount_paid);
  const balance = asNumber(raw.balance);
  const rawInstallments = Array.isArray(raw.installments) ? raw.installments : [];
  const installments = rawInstallments.map((entry, i) => normalizeInstallment(toRecord(entry), i));
  const paidCount = installments.filter((inst) => inst.paid).length;
  const unpaidSorted = installments
    .filter((inst) => !inst.paid)
    .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  return {
    courseId,
    title: asString(raw.title) || `Course ${courseId}`,
    enrolledOn: asString(raw.enroled_on) || asString(raw.enrolled_on),
    totalFee,
    amountPaid,
    balance,
    percentPaid: asNumber(raw.payment_percentage) || (totalFee > 0 ? Math.round((amountPaid / totalFee) * 100) : 0),
    status: asString(raw.status),
    isFree: totalFee <= 0,
    installments,
    paidCount,
    pendingCount: installments.length - paidCount,
    nextDue: unpaidSorted[0] ?? null,
  };
}

function dueLevel(dueDate: string): DueLevel {
  if (!dueDate) return 'pending';
  const due = new Date(dueDate).getTime();
  if (Number.isNaN(due)) return 'pending';
  const now = Date.now();
  if (due < now) return 'overdue';
  if (due - now < 7 * 24 * 60 * 60 * 1000) return 'due-soon';
  return 'pending';
}

const DUE_STYLE: Record<DueLevel, { label: string; className: string }> = {
  overdue: { label: 'Overdue', className: 'bg-red-50 text-red-700 border-red-200' },
  'due-soon': { label: 'Due Soon', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending: { label: 'Pending', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function courseStatusPill(acc: CourseAccount): { label: string; className: string } {
  if (acc.isFree) return { label: 'N/A', className: 'bg-slate-100 text-slate-500 border-slate-200' };
  if (acc.balance <= 0) return { label: 'Cleared', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (acc.status.toLowerCase() === 'overdue') return { label: 'Overdue', className: 'bg-red-50 text-red-700 border-red-200' };
  return { label: 'On Track', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

function isThisMonth(dueDate: string): boolean {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/* ─── Page ───────────────────────────────────────────────────── */

export default function StudentPaymentsPage({ api, session }: StudentPageProps) {
  const { data: bundle, loading, error, reload } = useAdminPageData<PaymentsBundle>(
    async () => ({ payments: await api.loadPayments(session.token) }),
    [api, session.token],
    `student:payments:${session.userId}`,
  );

  const accounts = useMemo(
    () => (bundle?.payments.studentCourses ?? []).map(normalizeCourse),
    [bundle],
  );

  const kpis = useMemo(() => {
    let outstanding = 0;
    let paid = 0;
    let dueThisMonth = 0;
    let pendingInstallments = 0;
    let activePaidCourses = 0;
    for (const acc of accounts) {
      outstanding += acc.balance;
      paid += acc.amountPaid;
      if (!acc.isFree) activePaidCourses += 1;
      for (const inst of acc.installments) {
        if (!inst.paid) {
          pendingInstallments += 1;
          if (isThisMonth(inst.dueDate)) dueThisMonth += inst.amount;
        }
      }
    }
    return { outstanding, paid, dueThisMonth, pendingInstallments, activePaidCourses };
  }, [accounts]);

  const dues = useMemo(() => {
    const rows: Array<CourseInstallment & { courseId: string; courseTitle: string }> = [];
    for (const acc of accounts) {
      for (const inst of acc.installments) {
        if (!inst.paid) rows.push({ ...inst, courseId: acc.courseId, courseTitle: acc.title });
      }
    }
    return rows.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
  }, [accounts]);

  const [tab, setTab] = useState<CourseTab>('all');
  const [search, setSearch] = useState('');
  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((acc) => {
      if (tab === 'paid' && acc.isFree) return false;
      if (tab === 'free' && !acc.isFree) return false;
      if (tab === 'active' && acc.balance <= 0) return false;
      if (tab === 'completed' && acc.balance > 0) return false;
      if (q && !acc.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [accounts, tab, search]);

  const [viewAccount, setViewAccount] = useState<CourseAccount | null>(null);

  // ── Razorpay payment flow (unchanged) ──────────────────────────
  const [payingCourseId, setPayingCourseId] = useState<string | null>(null);
  const [payDialogCourseId, setPayDialogCourseId] = useState<string | null>(null);
  const [payDialogCourseTitle, setPayDialogCourseTitle] = useState<string>('');
  const [payDialogAmount, setPayDialogAmount] = useState<number>(0);

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

      // Prefill the student's identity so the Razorpay payment shows WHO paid
      // (name/email/phone) instead of void@razorpay.com, and attach the
      // attribution notes. The server returns these on the order.
      const prefill: { name?: string; email?: string; contact?: string } = {};
      const prefillName = asString(order.prefill_name) || holderName;
      const prefillEmail = asString(order.prefill_email);
      const prefillContact = asString(order.prefill_contact);
      if (prefillName) prefill.name = prefillName;
      if (prefillEmail) prefill.email = prefillEmail;
      if (prefillContact) prefill.contact = prefillContact;
      const notes = order.notes && typeof order.notes === 'object'
        ? (order.notes as Record<string, string>)
        : undefined;

      const result = await openRazorpayCheckout({
        orderId,
        amount,
        currency,
        keyId: key,
        name: "Teachers' Training Institute of India",
        description: courseTitle,
        ...(Object.keys(prefill).length > 0 ? { prefill } : {}),
        ...(notes ? { notes } : {}),
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

  const openPayDialog = useCallback((courseId: string, courseTitle: string, amount: number) => {
    setPayDialogCourseId(courseId);
    setPayDialogCourseTitle(courseTitle);
    setPayDialogAmount(amount);
  }, []);

  const handleCardFormSubmit = useCallback((state: CardConfirmState) => {
    if (!payDialogCourseId) return;
    const courseId = payDialogCourseId;
    const title = payDialogCourseTitle;
    setPayDialogCourseId(null);
    void launchRazorpay(courseId, title, state.holder);
  }, [payDialogCourseId, payDialogCourseTitle, launchRazorpay]);

  if (loading) {
    return <PageLoader label="Loading student payments..." />;
  }

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-student-text">Payments &amp; Billing</h1>
      <p className="mt-1 text-sm text-student-muted">
        Course-wise fees, installments and receipts across all your enrollments.
      </p>
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

  const kpiCards: Array<{ icon: LucideIcon; label: string; value: string; tone: string }> = [
    { icon: AlertCircle, label: 'Total Outstanding', value: formatCurrency(kpis.outstanding), tone: 'bg-red-50 text-red-600' },
    { icon: CheckCircle2, label: 'Total Paid', value: formatCurrency(kpis.paid), tone: 'bg-emerald-50 text-emerald-600' },
    { icon: Calendar, label: 'Due This Month', value: formatCurrency(kpis.dueThisMonth), tone: 'bg-amber-50 text-amber-600' },
    { icon: BookOpen, label: 'Active Paid Courses', value: String(kpis.activePaidCourses), tone: 'bg-student-primary/10 text-student-primary' },
    { icon: ListChecks, label: 'Pending Installments', value: String(kpis.pendingInstallments), tone: 'bg-sky-50 text-sky-600' },
  ];

  const tabs: Array<{ id: CourseTab; label: string }> = [
    { id: 'all', label: 'All Courses' },
    { id: 'paid', label: 'Paid Courses' },
    { id: 'free', label: 'Free Courses' },
    { id: 'active', label: 'Active' },
    { id: 'completed', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      {header}

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
              <span className={`flex size-9 items-center justify-center rounded-xl ${card.tone}`}>
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-student-muted">{card.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-student-text">{card.value}</p>
            </div>
          );
        })}
      </section>

      {/* Payment Dues table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-6">
          <div className="flex items-center gap-2">
            <AlertCircle aria-hidden="true" className="size-5 text-student-primary" />
            <h2 className="text-base font-bold text-student-text">Payment Dues</h2>
            {dues.length > 0 ? (
              <span className="rounded-full bg-student-primary/10 px-2 py-0.5 text-xs font-semibold text-student-primary">
                {dues.length} pending
              </span>
            ) : null}
          </div>
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
        </div>
        {dues.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <CheckCircle2 aria-hidden="true" className="size-10 text-emerald-300" />
            <p className="text-sm text-student-muted">No payment dues — you&apos;re all caught up.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-student-muted">
                  <th className="px-4 py-3 sm:px-6">Installment</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Due On</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right sm:px-6">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dues.map((due) => {
                  const level = DUE_STYLE[dueLevel(due.dueDate)];
                  return (
                    <tr key={`${due.courseId}-${due.id}`} className="transition-colors hover:bg-slate-50">
                      <td className="px-4 py-3 sm:px-6">
                        <span className="inline-flex items-center gap-2 font-medium text-student-text">
                          <CreditCard aria-hidden="true" className="size-4 text-student-primary" />
                          {due.details}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-student-muted">{due.courseTitle}</td>
                      <td className="px-4 py-3 text-student-muted">{due.dueDate ? formatDate(due.dueDate) : '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-student-text">{formatCurrency(due.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${level.className}`}>
                          {level.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right sm:px-6">
                        <Button
                          size="sm"
                          className="rounded-xl bg-student-primary text-white hover:bg-student-primary/90"
                          onClick={() => openPayDialog(due.courseId, due.courseTitle, due.amount)}
                          disabled={payingCourseId !== null}
                        >
                          <CreditCard aria-hidden="true" className="size-4" />
                          Pay Now
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Course filter tabs + search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-pressed={active}
                className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-student-primary text-white'
                    : 'bg-white text-student-muted ring-1 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Search courses"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl pl-10"
          />
        </div>
      </div>

      {/* Per-course payment cards */}
      {filteredAccounts.length === 0 ? (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <CreditCard aria-hidden="true" className="mx-auto mb-4 size-12 text-slate-300" />
          <p className="text-sm text-slate-500">No courses match this filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredAccounts.map((acc) => (
            <CourseAccountCard
              key={acc.courseId}
              acc={acc}
              busy={payingCourseId !== null}
              onView={() => setViewAccount(acc)}
              onPay={() => openPayDialog(acc.courseId, acc.title, acc.balance)}
            />
          ))}
        </div>
      )}

      {/* View Account modal — full installment schedule for a course */}
      <Dialog open={viewAccount !== null} onOpenChange={(open) => { if (!open) setViewAccount(null); }}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg!">
          <DialogHeader className="border-b border-slate-200 p-5 sm:p-6">
            <DialogTitle className="text-lg font-bold text-student-text">{viewAccount?.title ?? 'Account'}</DialogTitle>
            {viewAccount ? (
              <p className="mt-0.5 text-sm text-student-muted">
                {formatCurrency(viewAccount.amountPaid)} paid of {formatCurrency(viewAccount.totalFee)}
                {viewAccount.balance > 0 ? ` · ${formatCurrency(viewAccount.balance)} balance` : ' · cleared'}
              </p>
            ) : null}
          </DialogHeader>
          {viewAccount ? (
            <div className="max-h-[60vh] overflow-y-auto p-5 sm:p-6">
              {viewAccount.installments.length === 0 ? (
                <p className="py-6 text-center text-sm text-student-muted">No installment schedule on file.</p>
              ) : (
                <ul className="space-y-3">
                  {viewAccount.installments.map((inst, index) => (
                    <li key={inst.id} className="flex items-center gap-3">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          inst.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-student-primary/10 text-student-primary'
                        }`}
                        aria-hidden="true"
                      >
                        {inst.paid ? <CheckCircle2 className="size-4" /> : inst.no || index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-student-text">{inst.details}</p>
                        <p className="text-xs text-student-muted">{inst.dueDate ? `Due ${formatDate(inst.dueDate)}` : 'No due date'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-sm font-semibold tabular-nums text-student-text">{formatCurrency(inst.amount)}</span>
                        {inst.paid ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                            Paid
                          </span>
                        ) : (
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${DUE_STYLE[dueLevel(inst.dueDate)].className}`}>
                            {DUE_STYLE[dueLevel(inst.dueDate)].label}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
            <Button variant="outline" onClick={() => setViewAccount(null)}>Close</Button>
            {viewAccount && viewAccount.balance > 0 ? (
              <Button
                className="bg-student-primary text-white hover:bg-student-primary/90"
                onClick={() => {
                  const acc = viewAccount;
                  setViewAccount(null);
                  openPayDialog(acc.courseId, acc.title, acc.balance);
                }}
              >
                <CreditCard aria-hidden="true" className="mr-2 size-4" />
                Pay {formatCurrency(viewAccount.balance)}
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment dialog — cardholder name + expiry; PAN/CVV go to Razorpay. */}
      <Dialog
        open={payDialogCourseId !== null}
        onOpenChange={(open) => { if (!open) setPayDialogCourseId(null); }}
      >
        {/* max-h + overflow so the tall payment content scrolls on mobile
            instead of the top (amount/title) being clipped off-screen with no
            way to reach it. dvh = real mobile viewport. Ishfaq 2026-07-01. */}
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto p-6 sm:max-w-[960px]"
          style={{ width: 'min(960px, calc(100vw - 2rem))', maxWidth: 'min(960px, calc(100vw - 2rem))' }}
        >
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
            onBack={() => setPayDialogCourseId(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Course account card ────────────────────────────────────── */

function CourseAccountCard({
  acc,
  busy,
  onView,
  onPay,
}: {
  acc: CourseAccount;
  busy: boolean;
  onView: () => void;
  onPay: () => void;
}) {
  const statusPill = courseStatusPill(acc);
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Status pills */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {acc.isFree ? <Gift aria-hidden="true" className="size-3" /> : <CreditCard aria-hidden="true" className="size-3" />}
          {acc.isFree ? 'Free' : 'Paid'}
        </span>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusPill.className}`}>
          {statusPill.label}
        </span>
      </div>

      <h3 className="font-bold leading-snug text-student-text">{acc.title}</h3>
      {acc.enrolledOn ? (
        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-student-muted">
          <Calendar aria-hidden="true" className="size-3.5" />
          Enrolled {formatDate(acc.enrolledOn)}
        </p>
      ) : null}

      {acc.isFree ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center rounded-xl bg-slate-50 py-6 text-center">
          <Gift aria-hidden="true" className="size-7 text-student-primary" />
          <p className="mt-2 text-sm font-semibold text-student-text">No Payment Required</p>
          <p className="text-xs text-student-muted">Enjoy this course on us.</p>
        </div>
      ) : (
        <>
          {/* Total / Paid / Balance */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-student-text">{formatCurrency(acc.totalFee)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Paid</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-700">{formatCurrency(acc.amountPaid)}</p>
            </div>
            <div className="rounded-xl bg-student-primary/10 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-student-primary">Balance</p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-student-primary">{formatCurrency(acc.balance)}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-student-text">{Math.round(acc.percentPaid)}% Paid</span>
              <span className="inline-flex items-center gap-2 text-student-muted">
                <span className="inline-flex items-center gap-1"><CheckCircle2 aria-hidden="true" className="size-3.5 text-emerald-500" />{acc.paidCount}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1"><CalendarClock aria-hidden="true" className="size-3.5" />{acc.pendingCount} pending</span>
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuenow={Math.round(acc.percentPaid)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-student-primary transition-all" style={{ width: `${Math.min(Math.max(acc.percentPaid, 0), 100)}%` }} />
            </div>
          </div>

          {/* Next due */}
          {acc.nextDue ? (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-xs">
              <span className="font-medium text-amber-800">
                Next due <span className="font-bold">{formatCurrency(acc.nextDue.amount)}</span>
              </span>
              <span className="text-amber-700">{acc.nextDue.dueDate ? formatDate(acc.nextDue.dueDate) : ''}</span>
            </div>
          ) : null}
        </>
      )}

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-xl"
          onClick={onView}
        >
          <Eye aria-hidden="true" className="size-4" />
          View Account
        </Button>
        {!acc.isFree && acc.balance > 0 ? (
          <Button
            size="sm"
            className="flex-1 rounded-xl bg-student-primary text-white hover:bg-student-primary/90"
            onClick={onPay}
            disabled={busy}
          >
            {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <CreditCard aria-hidden="true" className="size-4" />}
            Pay Now
          </Button>
        ) : null}
      </div>
    </div>
  );
}
