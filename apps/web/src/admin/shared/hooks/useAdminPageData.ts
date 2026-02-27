import { useCallback, useEffect, useState } from 'react';
import { messageFromError } from '../utils/admin-data-utils.js';

interface AdminPageDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useAdminPageData<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
): AdminPageDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loader();
      setData(result);
    } catch (err: unknown) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
