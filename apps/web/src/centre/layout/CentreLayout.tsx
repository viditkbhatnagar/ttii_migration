import { useEffect, useLayoutEffect, useState } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import { PortalThemeProvider } from '@/lib/portal-theme';
import type { CentrePortalApi } from '../centre-portal-api.js';
import { CentreRouter } from '../routing/CentreRouter.js';
import { resolveCentreRoute } from '../routing/centre-routes.js';
import { CentreLayoutProvider, useCentreLayout } from './CentreLayoutContext.js';
import { CentreMobileTabBar } from './CentreMobileTabBar.js';
import { CentreSidebar } from './CentreSidebar.js';
import { CentreTopbar, CENTRE_DARK_MODE_ENABLED } from './CentreTopbar.js';

// Naji's AppShell (src/components/dashboard/AppShell.tsx) for the centre
// portal: desktop sidebar, sticky top bar, the page, and the phone bottom bar.
// The .centre-theme class (app.css) sits on <html> while the portal is open so
// dialogs, sheets, popovers and toasts portaled to <body> are themed too; it
// and .dark are removed when the portal unmounts (log out), so no other
// portal ever sees them. viewport-fit=cover is set for the same span so the
// phone bar can pad for the iPhone home indicator.

const THEME_CLASS = 'centre-theme';

function useLocationSearch(): string {
  const [search, setSearch] = useState(() => (typeof window === 'undefined' ? '' : window.location.search));
  useEffect(() => {
    const onPop = () => setSearch(window.location.search);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return search;
}

function useHtmlTheme(theme: 'light' | 'dark'): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add(THEME_CLASS);
    return () => root.classList.remove(THEME_CLASS, 'dark');
  }, []);
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', CENTRE_DARK_MODE_ENABLED && theme === 'dark');
  }, [theme]);
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta) return undefined;
    const before = meta.content;
    if (!/viewport-fit/.test(before)) meta.content = `${before}, viewport-fit=cover`;
    return () => { meta.content = before; };
  }, []);
}

interface CentreLayoutProps {
  pathname: string;
  session: AuthSession;
  api: CentrePortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

function CentreLayoutInner({ pathname, session, api, onNavigate, onLogout }: CentreLayoutProps) {
  const { theme } = useCentreLayout();
  const search = useLocationSearch();
  useHtmlTheme(theme);

  useEffect(() => {
    const title = resolveCentreRoute(pathname)?.title ?? 'Centre';
    document.title = `${title} | TTII Centre Portal`;
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <CentreSidebar pathname={pathname} roleId={session.roleId} onNavigate={onNavigate} />
      <div className="flex min-w-0 flex-1 flex-col">
        <CentreTopbar api={api} session={session} onNavigate={onNavigate} onLogout={onLogout} />
        <main
          id="main-content"
          aria-label="Main content"
          className="min-w-0 flex-1 space-y-6 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:p-8"
        >
          {/* Keyed by the query too: a link to the same page with new ?tab= / ?new=1 opens it afresh. */}
          <CentreRouter key={`${pathname}${search}`} pathname={pathname} api={api} session={session} onNavigate={onNavigate} />
        </main>
      </div>
      <CentreMobileTabBar pathname={pathname} roleId={session.roleId} onNavigate={onNavigate} />
    </div>
  );
}

export function CentreLayout(props: CentreLayoutProps) {
  return (
    // Shared components that re-apply a scoped theme to their portaled content read this.
    <PortalThemeProvider value={THEME_CLASS}>
      <CentreLayoutProvider api={props.api} session={props.session} pathname={props.pathname}>
        <CentreLayoutInner {...props} />
      </CentreLayoutProvider>
    </PortalThemeProvider>
  );
}

export type { CentreLayoutProps };
