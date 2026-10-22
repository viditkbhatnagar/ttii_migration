import { Tag } from '../list-kit/ListKit.js';
import { fmtYmd, inr } from '../list-kit/list-kit-model.js';
import { LINE_STATUS, type PaymentLine } from './centre-applications-model.js';

/** Instalments from Fees → Payment Status (the same computation the admin portal shows). */
export function PaymentLines({ lines }: { lines: PaymentLine[] }) {
  return (
    <ul className="space-y-2">
      {lines.map((l, i) => {
        const tone = LINE_STATUS[l.status] ?? { label: l.status, tone: 'bg-muted text-muted-foreground' };
        return (
          <li key={`${l.label}-${l.dueDate}-${i}`} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{l.label}</p>
              <p className="text-[11px] text-muted-foreground">
                {l.course ? `${l.course} · ` : ''}Due {fmtYmd(l.dueDate)}{l.paidDate ? ` · Paid ${fmtYmd(l.paidDate)}` : ''}{l.mode ? ` · ${l.mode}` : ''}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums text-foreground">{inr(l.amount)}</span>
            <Tag className={tone.tone}>{tone.label}</Tag>
          </li>
        );
      })}
    </ul>
  );
}
