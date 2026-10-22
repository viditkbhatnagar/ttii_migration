import { useMemo } from 'react';
import { Building2, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCentreNavForRole } from '../routing/centre-nav-tree.js';
import { useCentreLayout } from './CentreLayoutContext.js';
import { centreNavIcon } from './centre-nav-icons.js';
import { navClick } from './centre-nav-click.js';
import { affiliationLine, inr, isNavActive, portalSubtitle, type CentreShellData } from './centre-shell-model.js';

// Naji's desktop sidebar (src/components/dashboard/Sidebar.tsx): centre name +
// "Centre Portal · {code}" header, the centre menu with his active style, the
// collapse handle, and the wallet / affiliation card (Centre login only — real
// wallet balance and affiliation expiry from /centre/portal/shell).

interface CentreSidebarProps {
  pathname: string;
  roleId: number;
  onNavigate: (href: string) => void;
}

export function WalletCard({ shell, collapsed, onNavigate }: { shell: CentreShellData; collapsed: boolean; onNavigate: (href: string) => void }) {
  if (!shell.wallet) return null;
  const balance = inr(shell.wallet.balance);
  const affiliation = affiliationLine(shell.affiliation);
  const warn = shell.affiliation?.state === 'expired' || shell.affiliation?.state === 'due_soon';
  if (collapsed) {
    return (
      <a
        href="/centre/wallet"
        onClick={navClick(onNavigate, '/centre/wallet')}
        title={`Wallet · ${balance} · ${affiliation}`}
        aria-label={`Wallet and payment: ${balance}. ${affiliation}`}
        className="flex h-11 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Wallet aria-hidden="true" className="h-4 w-4" />
      </a>
    );
  }
  return (
    <a
      href="/centre/wallet"
      onClick={navClick(onNavigate, '/centre/wallet')}
      className="block rounded-lg bg-[image:var(--gradient-primary)] p-3 text-primary-foreground transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <p className="text-xs font-medium opacity-90">Wallet Balance</p>
      <p className="text-lg font-bold tabular-nums">{balance}</p>
      <p className={cn('mt-1 text-[11px]', warn ? 'font-semibold' : 'opacity-90')}>{affiliation}</p>
    </a>
  );
}

export function CentreSidebar({ pathname, roleId, onNavigate }: CentreSidebarProps) {
  const { sidebarCollapsed: collapsed, toggleSidebar, shell } = useCentreLayout();
  const items = useMemo(() => getCentreNavForRole(roleId), [roleId]);
  const name = shell.centre?.name || 'TTII Centre';

  return (
    <aside
      aria-label="Centre navigation"
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-300 ease-out lg:flex',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!collapsed}
        className="absolute -right-3 top-[20px] z-40 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-[var(--shadow-soft)] transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {collapsed ? <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" /> : <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />}
      </button>

      <div className={cn('flex h-16 shrink-0 items-center gap-2 border-b border-border', collapsed ? 'justify-center px-0' : 'px-5')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground" title={collapsed ? name : undefined}>
          <Building2 aria-hidden="true" className="h-5 w-5" />
        </div>
        {!collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight" title={name}>{name}</p>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">{portalSubtitle(roleId, shell)}</p>
          </div>
        ) : null}
      </div>

      <nav aria-label="Centre sections" className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = centreNavIcon(item.icon);
          return (
            <a
              key={item.id}
              href={item.href}
              onClick={navClick(onNavigate, item.href)}
              aria-current={active ? 'page' : undefined}
              aria-label={collapsed ? item.label : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                collapsed ? 'justify-center px-0' : 'px-3',
                active ? 'bg-primary-soft text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </a>
          );
        })}
      </nav>

      {shell.wallet ? (
        <div className="border-t border-border p-4">
          <WalletCard shell={shell} collapsed={collapsed} onNavigate={onNavigate} />
        </div>
      ) : null}
    </aside>
  );
}
