import { useCallback, useEffect, useState } from 'react';

// The portal router (app.tsx) only tracks the pathname, so pages that keep
// state in the query string (?tab=…, ?new=1) read window.location.search
// themselves. Navigating to the SAME page with a new query (the top bar's
// "Request Funds" → /centre/wallet?tab=fund-requests&new=1 while already on the
// wallet) fires popstate without a remount, so the hook listens for it too.
// Updates use replaceState: a tab switch is not a history entry.

function currentSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

export function useQueryParams(): [URLSearchParams, (patch: Record<string, string | null>) => void] {
  const [search, setSearch] = useState(currentSearch);

  useEffect(() => {
    const sync = () => setSearch(currentSearch());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const update = useCallback((patch: Record<string, string | null>) => {
    const params = new URLSearchParams(currentSearch());
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', next);
    setSearch(query ? `?${query}` : '');
  }, []);

  return [new URLSearchParams(search), update];
}
