import { Building2, CalendarClock, FileText, HandCoins, ScrollText, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { fmtDay, type ActivityRow } from '../centre-profile-model.js';
import { TabEmpty } from './profile-ui.js';

// "Recent Activity": only events a row records — the centre's creation, KYC
// edits, fund requests raised and decided, wallet credits / debits, uploaded
// documents, agreements and affiliation certificates. Newest first.

const KIND_ICON: Record<string, LucideIcon> = {
  centre: Building2,
  kyc: ShieldCheck,
  fund_request: HandCoins,
  wallet: Wallet,
  document: FileText,
  agreement: ScrollText,
  certificate: ShieldCheck,
};

const IST_TIME = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', hour12: true });

function timeOf(at: string): string {
  const t = Date.parse(at);
  return Number.isNaN(t) ? '' : IST_TIME.format(new Date(t));
}

export function ActivityTab({ activity }: { activity: ActivityRow[] }) {
  return (
    <Card className="gap-0 border-border/70 p-5 shadow-[var(--shadow-soft)]">
      <h3 className="mb-4 text-base font-semibold">Recent Activity</h3>
      {activity.length === 0 ? (
        <TabEmpty icon={CalendarClock} text="No activity recorded for this centre yet." />
      ) : (
        <ol className="relative space-y-5 border-l border-border pl-6">
          {activity.map((it, i) => {
            const Icon = KIND_ICON[it.kind] ?? CalendarClock;
            const time = timeOf(it.at);
            return (
              <li key={`${it.at}-${i}`} className="relative">
                <span className="absolute -left-[31px] grid size-6 place-items-center rounded-full border border-border bg-card text-muted-foreground">
                  <Icon aria-hidden="true" className="size-3" />
                </span>
                <p className="text-sm font-medium">{it.text}</p>
                <p className="text-xs text-muted-foreground">{fmtDay(it.at)}{time ? ` · ${time}` : ''}</p>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
