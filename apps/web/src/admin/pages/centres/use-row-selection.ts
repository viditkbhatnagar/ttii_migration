import { useCallback, useMemo, useState } from 'react';

// Checkbox selection for the Centres lists: Export takes the selected rows, or
// every filtered row when nothing is selected (house style of the rebuilt lists).

export interface RowSelection {
  size: number;
  has: (id: string) => boolean;
  allOf: (ids: string[]) => boolean;
  toggle: (id: string, on: boolean) => void;
  togglePage: (ids: string[]) => void;
  drop: (id: string) => void;
}

export function useRowSelection(): RowSelection {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const has = useCallback((id: string) => selected.has(id), [selected]);
  const allOf = useCallback((ids: string[]) => ids.length > 0 && ids.every((id) => selected.has(id)), [selected]);

  const toggle = useCallback((id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const togglePage = useCallback((ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const all = ids.length > 0 && ids.every((id) => prev.has(id));
      for (const id of ids) {
        if (all) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const drop = useCallback((id: string) => toggle(id, false), [toggle]);

  return useMemo(
    () => ({ size: selected.size, has, allOf, toggle, togglePage, drop }),
    [selected.size, has, allOf, toggle, togglePage, drop],
  );
}
