import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { getCentreNavForRole } from '../routing/centre-nav-tree.js';
import { useCentreLayout } from './CentreLayoutContext.js';
import { navClick } from './centre-nav-click.js';
import { centreNavIcon } from './centre-nav-icons.js';
import { affiliationLine, inr, isNavActive, portalSubtitle, splitPhoneNav } from './centre-shell-model.js';

// Naji's LATEST phone bar (phone-bottom-bar-match-the-attached-design,
// 2026-10-19): a full-width bar with large rounded top corners, Home and
// Applications | Students and Wallet, the page you are on in a solid orange
// circle with a bold label, and a raised round "+" in the middle that opens
// the "More" grid (centre name, wallet / affiliation card, the other menu
// items) and turns into an "×" while it is open. Phones and tablets only
// (below lg); the desktop sidebar is unchanged.

interface Props {
  pathname: string;
  roleId: number;
  onNavigate: (href: string) => void;
}

export function CentreMobileTabBar({ pathname, roleId, onNavigate }: Props) {
  const { shell } = useCentreLayout();
  const [open, setOpen] = useState(false);
  const { tabs, more } = useMemo(() => splitPhoneNav(getCentreNavForRole(roleId)), [roleId]);
  const go = (href: string) => {
    setOpen(false);
    onNavigate(href);
  };
  const left = tabs.slice(0, 2);
  const right = tabs.slice(2, 4);

  const renderTab = (tab: (typeof tabs)[number]) => {
    const active = isNavActive(pathname, tab.href);
    const Icon = centreNavIcon(tab.icon);
    return (
      <a
        key={tab.id}
        href={tab.href}
        onClick={navClick(go, tab.href)}
        aria-current={active ? 'page' : undefined}
        className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
      >
        <span className={cn('flex h-11 w-11 items-center justify-center rounded-full transition-colors', active ? 'bg-accent-orange text-accent-orange-foreground shadow-[var(--shadow-soft)]' : 'text-primary')}>
          <Icon aria-hidden="true" className={cn('h-6 w-6', active ? 'fill-white/25' : 'fill-primary/15')} strokeWidth={2.2} />
        </span>
        <span className={cn('max-w-full truncate px-0.5 text-[11px] leading-none', active ? 'font-bold text-foreground' : 'font-medium text-muted-foreground')}>{tab.short}</span>
      </a>
    );
  };

  return (
    <>
      <nav
        aria-label="Main"
        className={cn('pointer-events-auto fixed inset-x-0 bottom-0 rounded-t-[28px] bg-card shadow-[var(--shadow-bar)] lg:hidden', open ? 'z-[60]' : 'z-40')}
        style={{ paddingBottom: 'max(0.25rem, calc(env(safe-area-inset-bottom) - 0.75rem))' }}
      >
        <div className="relative grid h-[68px] grid-cols-5 px-2">
          {left.map(renderTab)}
          <span aria-hidden="true" />
          {right.map(renderTab)}
          {more.length > 0 ? (
            <button
              type="button"
              aria-label={open ? 'Close menu' : 'More'}
              aria-expanded={open}
              aria-haspopup="dialog"
              onClick={() => setOpen(!open)}
              className="absolute -top-7 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-card)] ring-4 ring-background transition-transform focus-visible:outline-none focus-visible:ring-ring active:scale-90"
            >
              {open ? <X aria-hidden="true" className="h-7 w-7" strokeWidth={2.5} /> : <Plus aria-hidden="true" className="h-8 w-8" strokeWidth={2.5} />}
            </button>
          ) : null}
        </div>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="modal-maxh gap-0 overflow-y-auto rounded-t-2xl p-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:hidden"
        >
          <SheetHeader className="p-0 text-left">
            <SheetTitle>{shell.centre?.name || 'Centre Portal'}</SheetTitle>
            <SheetDescription>{portalSubtitle(roleId, shell)}</SheetDescription>
          </SheetHeader>
          {shell.wallet ? (
            <a
              href="/centre/wallet"
              onClick={navClick(go, '/centre/wallet')}
              className="mt-3 block rounded-xl bg-[image:var(--gradient-primary)] p-3 text-primary-foreground"
            >
              <p className="text-xs opacity-90">Wallet Balance</p>
              <p className="text-lg font-bold tabular-nums">{inr(shell.wallet.balance)}</p>
              <p className="text-[11px] opacity-90">{affiliationLine(shell.affiliation)}</p>
            </a>
          ) : null}
          <div className="mt-5 grid grid-cols-4 gap-x-2 gap-y-5">
            {more.map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = centreNavIcon(item.icon);
              return (
                <a
                  key={item.id}
                  href={item.href}
                  onClick={navClick(go, item.href)}
                  aria-current={active ? 'page' : undefined}
                  className="flex flex-col items-center gap-1.5 rounded-xl text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className={cn('flex h-14 w-14 items-center justify-center rounded-2xl shadow-[var(--shadow-soft)]', active ? 'bg-[image:var(--gradient-primary)] text-primary-foreground' : 'bg-primary-soft text-accent-foreground')}>
                    <Icon aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <span className={cn('text-[11px] leading-tight', active ? 'font-semibold text-primary' : 'text-foreground')}>{item.label}</span>
                </a>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
