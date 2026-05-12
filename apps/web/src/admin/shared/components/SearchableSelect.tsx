/**
 * SearchableSelect — combobox with a dropdown anchored below the input.
 *
 * Behaviour (Naji UAT 2026-05-13 — bulletproofed):
 * - Clicking the input or the chevron opens the list in BROWSE mode,
 *   showing all options regardless of the current value. This is the
 *   "open the dropdown like a native <select>" path.
 * - As soon as the user types, the component switches to FILTER mode and
 *   narrows the list by substring match.
 * - Closing without picking restores the input text to the saved value
 *   so the field never ends up holding a stale draft.
 * - Free-text typing is allowed unless `strict` is set.
 */
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  maxResults?: number;
  strict?: boolean;
  disabled?: boolean;
  hint?: string;
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  maxResults = 200,
  strict = false,
  disabled = false,
  hint,
}: SearchableSelectProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [browse, setBrowse] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e: MouseEvent): void => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setBrowse(false);
        if (strict) {
          const match = options.find((o) => o.toLowerCase() === query.toLowerCase());
          if (!match) setQuery(value);
        } else {
          // Restore the saved value if the user didn't actually pick a new one.
          setQuery(value);
        }
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, options, query, strict, value]);

  const filtered = useMemo(() => {
    if (browse) return options.slice(0, maxResults);
    const q = query.trim().toLowerCase();
    if (!q || q === value.trim().toLowerCase()) return options.slice(0, maxResults);
    return options
      .filter((o) => o.toLowerCase().includes(q))
      .slice(0, maxResults);
  }, [browse, options, query, value, maxResults]);

  // When the dropdown opens with a prefilled value, scroll the matching
  // option into view so the user immediately sees where they are.
  const currentIdx = useMemo(() => {
    if (!value) return -1;
    const v = value.toLowerCase();
    return filtered.findIndex((o) => o.toLowerCase() === v);
  }, [filtered, value]);

  useEffect(() => {
    if (open && currentIdx >= 0) setHighlightIdx(currentIdx);
  }, [open, currentIdx]);

  const openList = (): void => {
    setBrowse(true);
    setOpen(true);
  };

  const select = (val: string): void => {
    setQuery(val);
    onChange(val);
    setBrowse(false);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        openList();
        return;
      }
      setHighlightIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[highlightIdx]) {
        e.preventDefault();
        select(filtered[highlightIdx]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setBrowse(false);
      setQuery(value);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Label className="mb-1 text-xs">{label}</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          className="pr-9 cursor-pointer"
          onFocus={openList}
          onClick={openList}
          onChange={(e) => {
            setBrowse(false);
            setQuery(e.target.value);
            onChange(e.target.value);
            setOpen(true);
            setHighlightIdx(0);
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? 'Close suggestions' : 'Open suggestions'}
          onMouseDown={(e) => {
            e.preventDefault();
            if (open) {
              setOpen(false);
              setBrowse(false);
              setQuery(value);
            } else {
              openList();
              inputRef.current?.focus();
            }
          }}
          className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-500 hover:text-gray-700"
          disabled={disabled}
        >
          <svg className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.24 4.38a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {hint ? <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p> : null}
      {open && filtered.length > 0 ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg"
        >
          {filtered.map((opt, idx) => {
            const isCurrent = opt.toLowerCase() === value.toLowerCase();
            return (
              <li
                key={opt}
                role="option"
                aria-selected={idx === highlightIdx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(opt);
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  idx === highlightIdx
                    ? 'bg-ttii-primary/10 text-ttii-primary'
                    : isCurrent
                      ? 'bg-gray-50 text-gray-900 font-medium'
                      : 'text-gray-900'
                }`}
              >
                {opt}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
