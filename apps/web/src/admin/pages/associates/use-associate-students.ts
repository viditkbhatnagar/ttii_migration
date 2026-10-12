import { useEffect, useMemo, useState } from 'react';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { messageFromError } from '../../shared/utils/admin-data-utils.js';
import {
  studentQueryParams, toStudentPage, type AssociateStudentPage, type AssociateStudentRow, type StudentQuery,
} from './associate-mgmt-model.js';

// Data hook behind Associate Students and the Commissions basis table:
// /admin/associates/students_list, paged / filtered / sorted on the server.

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Loads one page for `query`; the search box is debounced. A newer query
 * always wins: a slower, older response is dropped instead of overwriting it.
 */
export function useAssociateStudents(api: AdminPortalApi, token: string, query: StudentQuery) {
  const [search, setSearch] = useState(query.search);
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(query.search), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query.search]);
  // Keyed on the serialised params so typing (which changes `query` before the
  // debounce fires) does not refetch the same page on every keystroke.
  const key = JSON.stringify(studentQueryParams({ ...query, search }));
  const params = useMemo(() => JSON.parse(key) as Record<string, string>, [key]);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.loadAssociateStudents(token, params)
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e: unknown) => { if (!cancelled) setError(messageFromError(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, token, params, nonce]);

  const page = useMemo<AssociateStudentPage>(() => toStudentPage(data ?? {}), [data]);
  const exportAll = async (): Promise<AssociateStudentRow[]> =>
    toStudentPage(await api.loadAssociateStudents(token, { ...params, all: '1' })).rows;
  return { page, loaded: data !== null, loading, error, reload: () => setNonce((n) => n + 1), exportAll };
}
