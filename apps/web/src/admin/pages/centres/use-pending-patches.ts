import { useCallback, useState } from 'react';

// Local row patches that bridge the gap between a successful mutation and the
// refetch. The lists load with a cache key, so reload() revalidates silently in
// the background; without a patch, an approved fund request would stay
// "Pending" with live buttons (and a deleted centre would linger) until the
// new data lands. Patches are tied to the data object they were made against
// and drop away by themselves as soon as fresh data arrives.

export interface PendingPatches<P> {
  get: (id: string) => P | undefined;
  set: (id: string, value: P) => void;
}

export function usePendingPatches<P>(data: unknown): PendingPatches<P> {
  const [state, setState] = useState<{ base: unknown; map: ReadonlyMap<string, P> }>({ base: null, map: new Map() });
  const live = state.base === data ? state.map : null;

  const get = useCallback((id: string) => live?.get(id), [live]);
  const set = useCallback((id: string, value: P) => {
    setState((prev) => {
      const map = new Map(prev.base === data ? prev.map : []);
      map.set(id, value);
      return { base: data, map };
    });
  }, [data]);

  return { get, set };
}
