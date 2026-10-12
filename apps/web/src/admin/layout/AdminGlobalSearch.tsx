import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, GraduationCap, LayoutGrid, Loader2, Search, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminPortalApi } from '../admin-portal-api.js';
import { getNavTreeForRole } from '../routing/admin-nav-tree.js';
import {
  REMOTE_SEARCH_MIN_LENGTH,
  SEARCH_GROUPS,
  SEARCH_MAX_LENGTH,
  moveHighlight,
  remoteHits,
  searchNavPages,
  type SearchGroup,
  type SearchHit,
} from './global-search-model.js';

const DEBOUNCE_MS = 250;
const BLUR_CLOSE_MS = 150;

const GROUP_ICON: Record<SearchGroup, LucideIcon> = {
  Pages: LayoutGrid,
  Students: GraduationCap,
  Courses: BookOpen,
};

interface AdminGlobalSearchProps {
  api: AdminPortalApi;
  token: string;
  roleId: number;
  onNavigate: (href: string) => void;
}

/** Students + courses from the server for the (debounced) query; pages stay local. */
function useRemoteHits(api: AdminPortalApi, token: string, query: string): { hits: SearchHit[]; loading: boolean } {
  const [state, setState] = useState<{ query: string; hits: SearchHit[] }>({ query: '', hits: [] });
  const q = query.trim();
  const active = q.length >= REMOTE_SEARCH_MIN_LENGTH;

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      api.globalSearch(token, q)
        .then((result) => { if (!cancelled) setState({ query: q, hits: remoteHits(result) }); })
        // Pages still work when the server search fails; just show no rows for it.
        .catch(() => { if (!cancelled) setState({ query: q, hits: [] }); });
    }, DEBOUNCE_MS);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [api, token, q, active]);

  if (!active) return { hits: [], loading: false };
  return { hits: state.query === q ? state.hits : [], loading: state.query !== q };
}

/** Naji's navbar search: pages, students and courses as you type; Ctrl/Cmd+K focuses it. */
export function AdminGlobalSearch({ api, token, roleId, onNavigate }: AdminGlobalSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navTree = useMemo(() => getNavTreeForRole(roleId), [roleId]);
  const remote = useRemoteHits(api, token, query);

  const hits = useMemo(
    () => [...searchNavPages(navTree, query), ...remote.hits],
    [navTree, query, remote.hits],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Remote rows can arrive or vanish under the highlight; keep it on a real row.
  const current = Math.min(highlight, Math.max(hits.length - 1, 0));
  const close = () => { setQuery(''); setOpen(false); inputRef.current?.blur(); };
  const pick = (hit: SearchHit) => { close(); onNavigate(hit.href); };
  const showPanel = open && query.trim() !== '';

  return (
    <div className="relative hidden min-w-0 max-w-md flex-1 md:block">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        aria-label="Global search"
        aria-expanded={showPanel}
        aria-controls="admin-global-search-results"
        role="combobox"
        aria-autocomplete="list"
        value={query}
        onChange={(event) => { setQuery(event.target.value.slice(0, SEARCH_MAX_LENGTH)); setHighlight(0); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), BLUR_CLOSE_MS)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') { event.preventDefault(); setHighlight(moveHighlight(current, 1, hits.length)); }
          else if (event.key === 'ArrowUp') { event.preventDefault(); setHighlight(moveHighlight(current, -1, hits.length)); }
          else if (event.key === 'Enter' && hits[current]) { event.preventDefault(); pick(hits[current]); }
          else if (event.key === 'Escape') close();
        }}
        placeholder="Search students, courses, pages…"
        className="h-10 w-full rounded-xl border border-border bg-secondary/60 pl-10 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-card px-1.5 text-[10px] text-muted-foreground">
        Ctrl K
      </kbd>
      {showPanel ? (
        <div
          id="admin-global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-12 z-50 max-h-96 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-lg animate-in fade-in-0 zoom-in-95"
        >
          {hits.length === 0 ? (
            <p className="flex items-center justify-center gap-2 px-3 py-6 text-center text-sm text-muted-foreground">
              {remote.loading ? <><Loader2 aria-hidden="true" className="size-4 animate-spin" /> Searching…</> : <>No results for “{query.trim()}”</>}
            </p>
          ) : (
            SEARCH_GROUPS.map((group) => {
              const items = hits.filter((hit) => hit.group === group);
              if (items.length === 0) return null;
              const Icon = GROUP_ICON[group];
              return (
                <div key={group} className="py-1">
                  <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
                  {items.map((hit) => {
                    const index = hits.indexOf(hit);
                    return (
                      <button
                        key={hit.key}
                        type="button"
                        role="option"
                        aria-selected={index === current}
                        onMouseDown={(event) => { event.preventDefault(); pick(hit); }}
                        onMouseEnter={() => setHighlight(index)}
                        className={cn('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left', index === current && 'bg-secondary')}
                      >
                        <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-foreground">{hit.label}</span>
                          {hit.sub ? <span className="block truncate text-[11px] text-muted-foreground">{hit.sub}</span> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
          {hits.length > 0 && remote.loading ? (
            <p className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-muted-foreground">
              <Loader2 aria-hidden="true" className="size-3 animate-spin" /> Searching students and courses…
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
