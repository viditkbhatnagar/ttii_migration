import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowUpRight, FileText, GraduationCap, Loader2, Search } from 'lucide-react';
import type { AuthSession } from '@ttii/frontend-core';
import { cn } from '@/lib/utils';
import type { CentrePortalApi } from '../centre-portal-api.js';
import { getCentreNavForRole } from '../routing/centre-nav-tree.js';
import { hitHref } from './centre-search-href.js';
import { searchHits, type SearchHit } from './centre-shell-model.js';

// Naji's GlobalSearch.tsx on real data: the menu pages, plus the centre's OWN
// applications (/centre/applications/index) and students
// (/centre/students/index) — both already scoped to the caller's centre by the
// server. They are read once, the first time the box is used.
// A hit opens the record's detail page when the portal has one
// (/centre/applications/view/:id, /centre/students/view/:id); otherwise the
// list, with the search text in ?q=.

const SOURCES_STALE_MS = 120_000;

interface Sources { applications: Record<string, unknown>[]; students: Record<string, unknown>[] }

const ICON = { page: Search, application: FileText, student: GraduationCap } as const;
const GROUP = { page: 'Pages', application: 'Applications', student: 'Students' } as const;

interface Props {
  api: CentrePortalApi;
  session: AuthSession;
  onNavigate: (href: string) => void;
}

export function CentreGlobalSearch({ api, session, onNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [sources, setSources] = useState<Sources | null>(null);
  const [loadingSources, setLoadingSources] = useState(false);
  const loadedAt = useRef(0);
  const container = useRef<HTMLDivElement>(null);
  const listId = useId();
  const pages = useMemo(() => getCentreNavForRole(session.roleId), [session.roleId]);

  const loadSources = useCallback(async () => {
    if (loadingSources || Date.now() - loadedAt.current < SOURCES_STALE_MS) return;
    setLoadingSources(true);
    const [apps, students] = await Promise.allSettled([
      api.loadApplications(session.token),
      api.loadStudents(session.token),
    ]);
    setSources({
      applications: apps.status === 'fulfilled' ? apps.value.items : [],
      students: students.status === 'fulfilled' ? students.value : [],
    });
    loadedAt.current = Date.now();
    setLoadingSources(false);
  }, [api, session.token, loadingSources]);

  const hits = useMemo(
    () => searchHits(query, { pages, applications: sources?.applications ?? [], students: sources?.students ?? [] }),
    [query, pages, sources],
  );

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  const choose = (hit: SearchHit) => {
    setOpen(false);
    setQuery('');
    onNavigate(hitHref(hit));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) { setOpen(true); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive((i) => Math.min(hits.length - 1, i + 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    if (event.key === 'Enter' && open && hits[active]) { event.preventDefault(); choose(hits[active]); }
  };

  const showList = open && (hits.length > 0 || query.trim() !== '');
  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <div ref={container} className="relative hidden w-64 md:block">
      <div className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring/50">
        <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          type="search"
          role="combobox"
          aria-label="Search applications, students and pages"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && hits[active] ? optionId(active) : undefined}
          placeholder="Search applications, students…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => { setOpen(true); void loadSources(); }}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {loadingSources ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
      </div>
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute right-0 top-full z-50 mt-2 max-h-96 w-[420px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          onMouseDown={(e) => e.preventDefault()}
        >
          {hits.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">{loadingSources ? 'Searching…' : 'No results found.'}</li>
          ) : null}
          {hits.map((hit, i) => {
            const Icon = ICON[hit.kind];
            const first = i === 0 || hits[i - 1]?.kind !== hit.kind;
            return (
              <li key={hit.key} role="presentation">
                {first ? <p className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">{GROUP[hit.kind]}</p> : null}
                <div
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(hit)}
                  className={cn('flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm', i === active && 'bg-accent text-accent-foreground')}
                >
                  <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{hit.title}</p>
                    {hit.subtitle ? <p className="truncate text-xs text-muted-foreground">{hit.subtitle}</p> : null}
                  </div>
                  {hit.kind === 'page' ? <ArrowUpRight aria-hidden="true" className="h-4 w-4 text-muted-foreground" /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
