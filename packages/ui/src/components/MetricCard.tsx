import { clsx } from 'clsx';

export type MetricTone = 'neutral' | 'info' | 'success' | 'warning';

export interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  tone?: MetricTone;
}

const toneStyles: Record<MetricTone, string> = {
  neutral: 'bg-gray-50 border-gray-300',
  info: 'bg-blue-50 border-blue-200',
  success: 'bg-green-50 border-green-200',
  warning: 'bg-amber-50 border-amber-200',
};

export function MetricCard({ label, value, detail, tone = 'neutral' }: MetricCardProps) {
  return (
    <article
      className={clsx('rounded-xl border px-3.5 py-3 grid gap-1', toneStyles[tone])}
      aria-label={label}
    >
      <p className="uppercase tracking-wide text-xs text-gray-600">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {detail ? <p className="text-sm text-gray-600 leading-snug">{detail}</p> : null}
    </article>
  );
}
