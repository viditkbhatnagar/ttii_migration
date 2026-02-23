export type MetricTone = 'neutral' | 'info' | 'success' | 'warning';

export interface MetricCardProps {
  label: string;
  value: string;
  detail?: string;
  tone?: MetricTone;
}

export function MetricCard({ label, value, detail, tone = 'neutral' }: MetricCardProps) {
  return (
    <article className={`metric-card metric-card--${tone}`} aria-label={label}>
      <p className="metric-card__label">{label}</p>
      <p className="metric-card__value">{value}</p>
      {detail ? <p className="metric-card__detail">{detail}</p> : null}
    </article>
  );
}
