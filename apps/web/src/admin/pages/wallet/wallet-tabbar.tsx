import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { WALLET_TABS, nextTabIndex, panelId, tabId, type WalletTab } from './wallet-payment-model.js';

// The underline tab bar of Wallet & Payment as a WAI-ARIA tablist: one tab in
// the Tab order (roving tabIndex), Left / Right / Home / End move and select,
// each tab controls its tabpanel. A count is shown once its tab has loaded.

export function WalletTabBar({ tab, counts, onSelect }: {
  tab: WalletTab;
  counts: Partial<Record<WalletTab, number>>;
  onSelect: (tab: WalletTab) => void;
}) {
  const refs = useRef<Partial<Record<WalletTab, HTMLButtonElement | null>>>({});
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = nextTabIndex(e.key, index, WALLET_TABS.length);
    const target = next === null ? undefined : WALLET_TABS[next];
    if (!target) return;
    e.preventDefault();
    onSelect(target.id);
    refs.current[target.id]?.focus();
  };
  return (
    <div role="tablist" aria-label="Wallet & Payment" className="flex w-full items-center gap-1 overflow-x-auto border-b border-border">
      {WALLET_TABS.map((t, i) => {
        const selected = tab === t.id;
        const count = counts[t.id];
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            id={tabId(t.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(t.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(t.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              selected ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {count === undefined ? null : (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{count}</span>
            )}
            {selected ? <span aria-hidden="true" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
          </button>
        );
      })}
    </div>
  );
}
