// View model of the centre's own Dashboard (Naji 2026-10-22): parses the
// /centre/portal/dashboard payload and decides KPI tiles, deltas and empty
// states. Real data only — no fabricated seats, targets or revenue.
import { asRecord, inr, num, rows, str } from '../../layout/centre-shell-model.js';

export type KpiTone = 'primary' | 'success' | 'warning' | 'info';

export interface DashboardKpi {
  id: string;
  label: string;
  value: string;
  tone: KpiTone;
  /** % change this month against last month; null when there is nothing to compare. */
  delta: number | null;
  sub: string;
  href: string;
}

export interface TrendPoint { month: string; label: string; applications: number; enrolments: number }
export interface CourseBar { courseId: number; title: string; shortName: string; applications: number; enrolments: number }
export interface RecentApp { id: number; applicationId: string; name: string; course: string; date: string; stage: string }
export interface RecentPay { id: number; studentName: string; studentCode: string; course: string; amount: number; mode: string; paidOn: string; label: string }
export interface RecentTxn { id: number; type: 'credit' | 'debit'; amount: number; remarks: string; date: string }

export interface DashboardMoneyData {
  walletBalance: number;
  pendingTopUps: number;
  feesScheduled: number;
  feesPaid: number;
  feesBalance: number;
  withBalance: number;
  recentPayments: RecentPay[];
  recentWallet: RecentTxn[];
}

export interface DashboardData {
  today: string;
  centreName: string;
  kpis: Record<string, number>;
  trend: TrendPoint[];
  courses: CourseBar[];
  recentApplications: RecentApp[];
  money: DashboardMoneyData | null;
}

export function toDashboardData(raw: unknown): DashboardData {
  const d = asRecord(raw);
  const k = asRecord(d.kpis);
  const kpis: Record<string, number> = {};
  for (const key of Object.keys(k)) kpis[key] = num(k[key]);
  const m = asRecord(d.money);
  return {
    today: str(d.today),
    centreName: str(asRecord(d.centre).name),
    kpis,
    trend: rows(d.trend).map((t) => ({ month: str(t.month), label: str(t.label), applications: num(t.applications), enrolments: num(t.enrolments) })),
    courses: rows(d.courses).map((c) => ({ courseId: num(c.courseId), title: str(c.title), shortName: str(c.shortName), applications: num(c.applications), enrolments: num(c.enrolments) })),
    recentApplications: rows(d.recentApplications).map((a) => ({
      id: num(a.id), applicationId: str(a.applicationId), name: str(a.name), course: str(a.course), date: str(a.date), stage: str(a.stage),
    })),
    money: Object.keys(m).length === 0 ? null : {
      walletBalance: num(m.walletBalance),
      pendingTopUps: num(m.pendingTopUps),
      feesScheduled: num(m.feesScheduled),
      feesPaid: num(m.feesPaid),
      feesBalance: num(m.feesBalance),
      withBalance: num(m.withBalance),
      recentPayments: rows(m.recentPayments).map((p) => ({
        id: num(p.id), studentName: str(p.studentName), studentCode: str(p.studentCode), course: str(p.course),
        amount: num(p.amount), mode: str(p.mode), paidOn: str(p.paidOn), label: str(p.label),
      })),
      recentWallet: rows(m.recentWallet).map((t) => ({
        id: num(t.id), type: str(t.type) === 'debit' ? 'debit' : 'credit', amount: num(t.amount), remarks: str(t.remarks), date: str(t.date),
      })),
    },
  };
}

/** % change month on month, rounded to a whole number; null when last month is zero (no honest base). */
export function monthDelta(thisMonth: number, lastMonth: number): number | null {
  if (lastMonth <= 0) return null;
  return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** The KPI tiles, in the design's order, on real numbers. Money tiles only when the server sent money (Centre login). */
export function buildKpis(data: DashboardData): DashboardKpi[] {
  const k = data.kpis;
  const out: DashboardKpi[] = [];
  const money = data.money;
  if (money) {
    out.push({
      id: 'wallet', label: 'Wallet Balance', value: inr(money.walletBalance), tone: 'primary', delta: null,
      sub: money.pendingTopUps > 0 ? `${plural(money.pendingTopUps, 'top-up', 'top-ups')} awaiting approval` : 'Available for TTII fees',
      href: '/centre/wallet',
    });
  }
  out.push(
    {
      id: 'students', label: 'Active Students', value: String(k.activeStudents ?? 0), tone: 'success',
      delta: monthDelta(k.studentsThisMonth ?? 0, k.studentsLastMonth ?? 0),
      sub: `${k.students ?? 0} enrolled in total`, href: '/centre/students',
    },
    {
      id: 'cohorts', label: 'Active Cohorts', value: String(k.runningCohorts ?? 0), tone: 'info', delta: null,
      sub: (k.upcomingCohorts ?? 0) > 0 ? `${k.upcomingCohorts} upcoming` : 'Running now', href: '/centre/cohorts',
    },
    {
      id: 'applications', label: 'Total Applications', value: String(k.applications ?? 0), tone: 'primary',
      delta: monthDelta(k.applicationsThisMonth ?? 0, k.applicationsLastMonth ?? 0),
      sub: `${k.applicationsThisMonth ?? 0} this month`, href: '/centre/applications',
    },
    {
      id: 'enrolments', label: 'Total Enrollments', value: String(k.converted ?? 0), tone: 'success', delta: null,
      sub: `${k.conversion ?? 0}% conversion`, href: '/centre/applications',
    },
    {
      id: 'pending', label: 'Pending Applications', value: String(k.inProgress ?? 0), tone: 'warning', delta: null,
      sub: (k.awaitingApproval ?? 0) > 0 ? `${k.awaitingApproval} awaiting TTII approval` : 'In the pipeline', href: '/centre/applications',
    },
  );
  if (money) {
    out.push(
      {
        id: 'collected', label: 'Fees Collected', value: inr(money.feesPaid), tone: 'info', delta: null,
        sub: `of ${inr(money.feesScheduled)} scheduled`, href: '/centre/wallet?tab=collections',
      },
      {
        id: 'balance', label: 'Pending Fees', value: inr(money.feesBalance), tone: 'warning', delta: null,
        sub: money.withBalance > 0 ? plural(money.withBalance, 'student with a balance', 'students with a balance') : 'Nothing pending', href: '/centre/wallet?tab=collections',
      },
    );
  }
  return out;
}

/** Share of a KPI bar (0-100) for tiles that have a natural total. */
export function kpiProgress(kpi: DashboardKpi, data: DashboardData): number | undefined {
  const k = data.kpis;
  if (kpi.id === 'enrolments') return k.conversion ?? 0;
  if (kpi.id === 'students') return (k.students ?? 0) > 0 ? Math.round(((k.activeStudents ?? 0) / (k.students ?? 1)) * 100) : undefined;
  if (kpi.id === 'collected' && data.money && data.money.feesScheduled > 0) return Math.round((data.money.feesPaid / data.money.feesScheduled) * 100);
  return undefined;
}

export const STAGE_LABELS: Readonly<Record<string, string>> = {
  lead: 'Lead', payment_pending: 'Payment Pending', paid: 'Paid', form_pending: 'Form Pending',
  approval_waiting: 'Awaiting Approval', enrolled: 'Enrolled', rejected: 'Rejected',
};

export function stageLabel(stage: string): string {
  return STAGE_LABELS[stage] ?? 'Lead';
}

export type StageTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';
export function stageTone(stage: string): StageTone {
  if (stage === 'enrolled' || stage === 'paid') return 'success';
  if (stage === 'approval_waiting') return 'info';
  if (stage === 'payment_pending' || stage === 'form_pending') return 'warning';
  if (stage === 'rejected') return 'danger';
  return 'neutral';
}

/** True when the trend has any real activity worth drawing. */
export function trendHasData(trend: readonly TrendPoint[]): boolean {
  return trend.some((t) => t.applications > 0 || t.enrolments > 0);
}

/** Course bars short enough for an axis: the short name when there is one. */
export function courseAxisLabel(c: CourseBar, max = 28): string {
  const name = c.shortName || c.title;
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}
