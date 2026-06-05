import { useCallback, useEffect, useState } from 'react';
import { messageFromError } from '../utils/admin-data-utils.js';

interface AdminPageDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Module-level cache so navigating back to a page can show its last data
// instantly while it revalidates in the background (stale-while-revalidate).
// Lives for the browser session and is cleared on a full page reload. Opt-in
// per call via `cacheKey` — calls without a key keep the original
// fetch-on-every-mount behaviour, so admin pages are unaffected.
const pageDataCache = new Map<string, unknown>();

/** Drop a cached entry (or everything) — e.g. on logout. */
export function clearAdminPageDataCache(cacheKey?: string): void {
  if (cacheKey) pageDataCache.delete(cacheKey);
  else pageDataCache.clear();
}

export function useAdminPageData<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  cacheKey?: string,
): AdminPageDataState<T> {
  // Seed from cache on (re)mount so a revisited tab paints immediately.
  const seeded = cacheKey ? (pageDataCache.get(cacheKey) as T | undefined) : undefined;
  const [data, setData] = useState<T | null>(seeded ?? null);
  const [loading, setLoading] = useState(seeded === undefined);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Only block the UI with a spinner when there's nothing cached to show yet;
    // otherwise revalidate silently behind the already-visible data.
    const hasCached = cacheKey ? pageDataCache.has(cacheKey) : false;
    if (!hasCached) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await loader();
      if (cacheKey) pageDataCache.set(cacheKey, result);
      setData(result);
      setError(null);
    } catch (err: unknown) {
      // Keep showing cached data on a transient revalidation failure rather than
      // blanking the page; only surface the error on a cold (uncached) load.
      if (!hasCached) setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload };
}
