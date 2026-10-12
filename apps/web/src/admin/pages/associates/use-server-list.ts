import { useEffect, useMemo, useRef, useState } from 'react';
import { messageFromError } from '../../shared/utils/admin-data-utils.js';

// Server-paged lists of Associate Management (Associate Students, the
// Commissions basis and Communications): one request per distinct query,
// typing debounced, and a newer query always wins — a slower, older response
// is dropped instead of overwriting it.

export const SEARCH_DEBOUNCE_MS = 300;

export function useDebouncedValue<T>(value: T, ms: number = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export interface ServerList {
  data: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** The query parameters of the current request (for an export of the same filters). */
  params: Record<string, string>;
}

export function useServerList(
  fetchPage: (params: Record<string, string>) => Promise<Record<string, unknown>>,
  params: Record<string, string>,
): ServerList {
  // Keyed on the serialised params so an unchanged query never refetches.
  const key = JSON.stringify(params);
  const stableParams = useMemo(() => JSON.parse(key) as Record<string, string>, [key]);
  const fetchRef = useRef(fetchPage);
  useEffect(() => { fetchRef.current = fetchPage; }, [fetchPage]);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchRef.current(stableParams)
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e: unknown) => { if (!cancelled) setError(messageFromError(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [stableParams, nonce]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1), params: stableParams };
}
