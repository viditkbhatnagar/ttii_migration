import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AuthSession } from '@ttii/frontend-core';
import type { CentrePortalApi } from '../centre-portal-api.js';
import { EMPTY_SHELL, toShellData, type CentreShellData } from './centre-shell-model.js';

// Shell state of the centre portal (Naji 2026-10-22 design): sidebar collapse
// and light / dark theme (his SidebarState + ThemeState, remembered in this
// browser under his keys), the top-bar support chat panel, and the shell facts
// (/centre/portal/shell: centre, wallet, affiliation) the sidebar card, the
// phone "More" sheet and the top bar share.

const SIDEBAR_KEY = 'ttii-centre-portal:sidebar-collapsed';
const THEME_KEY = 'ttii-centre-portal:theme';
/** The shell facts are re-read on navigation once they are this old (the wallet moves when TTII approves a top-up). */
const SHELL_STALE_MS = 60_000;

export type CentreTheme = 'light' | 'dark';

interface CentreLayoutState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  theme: CentreTheme;
  toggleTheme: () => void;
  supportOpen: boolean;
  setSupportOpen: (open: boolean) => void;
  openSupport: () => void;
  shell: CentreShellData;
  shellLoaded: boolean;
  refreshShell: () => void;
}

const CentreLayoutCtx = createContext<CentreLayoutState | null>(null);

function readStored(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return ''; // storage unavailable: defaults apply
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the choice is simply not remembered */
  }
}

interface ProviderProps {
  api: CentrePortalApi;
  session: AuthSession;
  pathname: string;
  children: ReactNode;
}

export function CentreLayoutProvider({ api, session, pathname, children }: ProviderProps) {
  const [collapsed, setCollapsed] = useState(() => readStored(SIDEBAR_KEY) === '1');
  const [theme, setTheme] = useState<CentreTheme>(() => (readStored(THEME_KEY) === 'dark' ? 'dark' : 'light'));
  const [supportOpen, setSupportOpen] = useState(false);
  const [shell, setShell] = useState<CentreShellData>(EMPTY_SHELL);
  const [shellLoaded, setShellLoaded] = useState(false);
  const loadedAt = useRef(0);
  const inFlight = useRef(false);

  const loadShell = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const raw = await api.loadShell(session.token);
      setShell(toShellData(raw));
      loadedAt.current = Date.now();
    } catch {
      // The shell still works without these facts: the card and greeting fall back to the session.
    } finally {
      inFlight.current = false;
      setShellLoaded(true);
    }
  }, [api, session.token]);

  useEffect(() => {
    if (Date.now() - loadedAt.current < SHELL_STALE_MS) return;
    void loadShell();
  }, [loadShell, pathname]);

  useEffect(() => { writeStored(SIDEBAR_KEY, collapsed ? '1' : '0'); }, [collapsed]);
  useEffect(() => { writeStored(THEME_KEY, theme); }, [theme]);

  const toggleSidebar = useCallback(() => setCollapsed((prev) => !prev), []);
  const toggleTheme = useCallback(() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')), []);

  const openSupport = useCallback(() => setSupportOpen(true), []);
  const refreshShell = useCallback(() => { void loadShell(); }, [loadShell]);

  const value = useMemo<CentreLayoutState>(() => ({
    sidebarCollapsed: collapsed,
    toggleSidebar,
    theme,
    toggleTheme,
    supportOpen,
    setSupportOpen,
    openSupport,
    shell,
    shellLoaded,
    refreshShell,
  }), [collapsed, toggleSidebar, theme, toggleTheme, supportOpen, openSupport, shell, shellLoaded, refreshShell]);

  return <CentreLayoutCtx value={value}>{children}</CentreLayoutCtx>;
}

export function useCentreLayout(): CentreLayoutState {
  const ctx = useContext(CentreLayoutCtx);
  if (!ctx) {
    throw new Error('useCentreLayout must be used within CentreLayoutProvider');
  }
  return ctx;
}

/** The shell state when rendered inside the centre portal; null in isolation (tests, previews). */
export function useOptionalCentreLayout(): CentreLayoutState | null {
  return useContext(CentreLayoutCtx);
}

/**
 * "Contact Support" for pages: opens the top-bar chat panel, or — outside the
 * shell — goes to the full-page /centre/support chat.
 */
export function useOpenCentreSupport(onNavigate: (href: string) => void): () => void {
  const ctx = useContext(CentreLayoutCtx);
  const open = ctx?.openSupport;
  return useCallback(() => {
    if (open) open();
    else onNavigate('/centre/support');
  }, [open, onNavigate]);
}
