/**
 * SearchableSelect — combobox input with a dropdown anchored directly
 * below the input field. Filters options as the user types. Naji UAT
 * 2026-05-12 — the native HTML <datalist> was positioning the suggestions
 * off to the side; this component renders the suggestions directly below.
 *
 * Free-text typing is allowed — the value passed to onChange is whatever
 * the user typed, even if it doesn't match an option. This preserves
 * round-trip behavior for legacy data that may not be in the canonical
 * list. Use `strict` to force selection from the list only.
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
  /** Show how many options at most (default 8). */
  maxResults?: number;
  /** If true, blur reverts the value to the last valid pick. */
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
  maxResults = 8,
  strict = false,
  disabled = false,
  hint,
}: SearchableSelectProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Keep the query in sync when the parent value changes (e.g. on prefill).
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Click-outside closes the dropdown.
  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e: MouseEvent): void => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        if (strict) {
          const match = options.find((o) => o.toLowerCase() === query.toLowerCase());
          if (!match) setQuery(value);
        }
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, options, query, strict, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const v = value.trim().toLowerCase();
    // Browse mode: when the input is empty OR the user hasn't typed
    // anything since the field was prefilled (query still equals the
    // saved value), show the FULL option list so clicking the chevron
    // actually exposes every choice — not just the one current value.
    if (!q || q === v) return options.slice(0, Math.max(maxResults, 200));
    return options
      .filter((o) => o.toLowerCase().includes(q))
      .slice(0, maxResults);
  }, [options, query, value, maxResults]);

  const select = (val: string): void => {
    setQuery(val);
    onChange(val);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
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
          className="pr-9"
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
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
            setOpen((v) => !v);
            inputRef.current?.focus();
          }}
          className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
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
          {filtered.map((opt, idx) => (
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
                idx === highlightIdx ? 'bg-ttii-primary/10 text-ttii-primary' : 'text-gray-900'
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
