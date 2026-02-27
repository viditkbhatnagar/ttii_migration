import { clsx } from 'clsx';
import type { ReactNode } from 'react';

export interface PortalNavItem {
  id: string;
  label: string;
  href: string;
}

export interface PortalScaffoldProps {
  roleLabel: string;
  title: string;
  subtitle: string;
  navItems: readonly PortalNavItem[];
  activeHref: string;
  onNavigate: (href: string) => void;
  onLogout?: () => void;
  children: ReactNode;
}

export function PortalScaffold({
  roleLabel,
  title,
  subtitle,
  navItems,
  activeHref,
  onNavigate,
  onLogout,
  children,
}: PortalScaffoldProps) {
  return (
    <div className="min-h-screen grid grid-cols-[minmax(240px,280px)_minmax(0,1fr)] max-md:grid-cols-1 animate-[shellEnter_320ms_ease]">
      <aside
        className="p-5 px-4 text-gray-100 bg-gradient-to-b from-[#0f3d49] via-[#0e5662] to-[#0f2f39] border-r border-white/10 max-md:border-r-0 max-md:border-b max-md:border-white/15 grid gap-3 content-start"
        aria-label={`${roleLabel} navigation`}
      >
        <p className="uppercase tracking-widest text-xs text-cyan-200">{roleLabel}</p>
        <h1 className="font-bold text-lg">{title}</h1>
        <p className="text-cyan-100 text-sm leading-relaxed">{subtitle}</p>

        <nav className="mt-2 grid gap-2">
          {navItems.map((item) => {
            const isActive = item.href === activeHref;

            return (
              <button
                key={item.id}
                type="button"
                className={clsx(
                  'text-left border rounded-lg px-2.5 py-2 cursor-pointer transition-colors text-cyan-50',
                  isActive
                    ? 'border-cyan-300 bg-cyan-300/20'
                    : 'border-transparent bg-white/8 hover:bg-white/18',
                )}
                onClick={() => onNavigate(item.href)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {onLogout ? (
          <button
            type="button"
            className="mt-3 justify-self-start border border-white/35 bg-transparent text-white rounded-lg px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors"
            onClick={onLogout}
          >
            Logout
          </button>
        ) : null}
      </aside>
      <main className="p-5 grid gap-4 max-md:p-4">{children}</main>
    </div>
  );
}
