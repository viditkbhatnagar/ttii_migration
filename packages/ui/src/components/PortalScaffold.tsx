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
    <div className="portal-scaffold">
      <aside className="portal-sidebar" aria-label={`${roleLabel} navigation`}>
        <p className="portal-role">{roleLabel}</p>
        <h1>{title}</h1>
        <p className="portal-subtitle">{subtitle}</p>

        <nav className="portal-nav">
          {navItems.map((item) => {
            const isActive = item.href === activeHref;

            return (
              <button
                key={item.id}
                type="button"
                className={`portal-nav__item${isActive ? ' portal-nav__item--active' : ''}`}
                onClick={() => onNavigate(item.href)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {onLogout ? (
          <button type="button" className="portal-logout" onClick={onLogout}>
            Logout
          </button>
        ) : null}
      </aside>
      <main className="portal-content">{children}</main>
    </div>
  );
}
