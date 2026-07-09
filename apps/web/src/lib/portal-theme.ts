import { createContext, useContext } from 'react';

/**
 * Theme class for PORTALED shadcn content (Dialog / DropdownMenu / Popover /
 * Select / Sheet *Content), which Radix renders at `document.body` and which
 * therefore escapes a portal wrapper's scoped theme (e.g. `.counsellor-theme`).
 *
 * Scoped-theme layouts (Associate, Counsellor) provide their class here so
 * shared components can re-apply it to their portaled content and avoid the
 * "portaled content reverts to admin-magenta" gotcha. Defaults to `''` (no
 * scoped theme = admin default), so components outside a provider are unchanged.
 */
const PortalThemeContext = createContext<string>('');

export const PortalThemeProvider = PortalThemeContext.Provider;

/** The active scoped-theme class to apply to portaled content, or `''`. */
export function usePortalThemeClass(): string {
  return useContext(PortalThemeContext);
}
