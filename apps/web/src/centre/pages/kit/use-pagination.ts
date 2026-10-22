import { useMemo, useState } from 'react';

/**
 * Client-side pagination over an already-filtered list (the design's
 * usePagination). The page is clamped to the list, and `resetKey` — the
 * filters that produced the list — sends it back to page 1 when it changes, so
 * a new filter never lands on an empty page.
 */
export function usePagination<T>(items: T[], pageSize = 10, resetKey = '') {
  const [state, setState] = useState({ page: 1, key: resetKey });
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = state.key === resetKey ? Math.min(Math.max(1, state.page), totalPages) : 1;
  const current = useMemo(() => items.slice((page - 1) * pageSize, page * pageSize), [items, page, pageSize]);
  const setPage = (p: number) => setState({ page: Math.min(Math.max(1, p), totalPages), key: resetKey });
  return { page, setPage, totalPages, current, total: items.length, offset: (page - 1) * pageSize };
}
