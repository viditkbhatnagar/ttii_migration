import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { daysInMonth, firstWeekday, isoToDmy, parseIsoParts, partsToIso } from '@/lib/dmy-date';

// Calendar picker for the shared dd/mm/yyyy field (Naji 2026-08-03, after the
// mobile "no / key" fix — students asked to pick rather than type).
//
// Purpose-built rather than react-day-picker: this is a DATE OF BIRTH control,
// and a month-at-a-time calendar is the wrong shape for it — reaching 1996 from
// today means paging back ~360 times. Month and year are therefore first-class
// dropdowns, and the arrows only nudge a month at a time for fine adjustment.
// Also avoids adding a dependency (and a lockfile churn) for one control.
//
// Native <select> for month/year on purpose: on a phone it opens the OS wheel,
// which beats any custom listbox, and it sidesteps nesting a Radix Select
// portal inside a Radix Popover portal.
//
// Colours are explicit rather than theme tokens: PopoverContent portals to
// <body>, escaping wrappers like `.counsellor-theme`, where `hsl(var(--token))`
// renders black (documented project gotcha).

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface DmyDatePickerProps {
  /** Canonical ISO yyyy-mm-dd (or '' when empty). */
  value: string;
  onChange: (iso: string) => void;
  /** Earliest selectable year. Defaults to 100 years back — DOB range. */
  minYear?: number;
  /** Latest selectable year. Defaults to the current year. */
  maxYear?: number;
  disabled?: boolean | undefined;
}

export function DmyDatePicker({ value, onChange, minYear, maxYear, disabled }: DmyDatePickerProps) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const selected = parseIsoParts(value);

  const yearMax = maxYear ?? today.getFullYear();
  const yearMin = minYear ?? yearMax - 100;

  // The month on view. Starts at the selected date, else a sensible DOB-ish
  // default (not today — nobody was born today) so the year dropdown is the
  // first thing that reads as adjustable.
  const [viewY, setViewY] = useState<number>(selected?.y ?? yearMax - 20);
  const [viewM, setViewM] = useState<number>(selected?.m ?? 0);

  // Re-sync the view when the field is edited by typing while the popover is
  // closed, so opening it lands on the date the student already entered.
  const [syncedFor, setSyncedFor] = useState(value);
  if (value !== syncedFor) {
    setSyncedFor(value);
    if (selected) {
      setViewY(selected.y);
      setViewM(selected.m);
    }
  }

  const years = useMemo(() => {
    const out: number[] = [];
    for (let y = yearMax; y >= yearMin; y -= 1) out.push(y);
    return out;
  }, [yearMin, yearMax]);

  const step = (delta: number): void => {
    const next = viewM + delta;
    if (next < 0) { setViewM(11); setViewY((y) => Math.max(yearMin, y - 1)); return; }
    if (next > 11) { setViewM(0); setViewY((y) => Math.min(yearMax, y + 1)); return; }
    setViewM(next);
  };

  const pick = (day: number): void => {
    onChange(partsToIso(viewY, viewM, day));
    setOpen(false);
  };

  const total = daysInMonth(viewY, viewM);
  const lead = firstWeekday(viewY, viewM);
  const cells: Array<number | null> = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={value ? `Change date of birth, currently ${isoToDmy(value)}` : 'Open calendar to pick a date'}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarDays className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(20rem,calc(100vw-2rem))] border-slate-200 bg-white p-3 text-slate-900"
      >
        <div className="mb-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Previous month"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
          >
            <ChevronLeft className="size-4" />
          </button>

          <select
            aria-label="Month"
            value={viewM}
            onChange={(e) => setViewM(Number(e.target.value))}
            className="h-8 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
          >
            {MONTHS.map((label, i) => <option key={label} value={i}>{label}</option>)}
          </select>

          <select
            aria-label="Year"
            value={viewY}
            onChange={(e) => setViewY(Number(e.target.value))}
            className="h-8 w-[4.75rem] shrink-0 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>

          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Next month"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 text-center text-[11px] font-semibold uppercase text-slate-400">{w}</div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`pad-${i}`} />;
            const isSelected = selected?.y === viewY && selected.m === viewM && selected.d === day;
            const isToday = today.getFullYear() === viewY && today.getMonth() === viewM && today.getDate() === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => pick(day)}
                aria-label={`${day} ${MONTHS[viewM]} ${viewY}`}
                aria-pressed={isSelected}
                className={cn(
                  'h-8 rounded-md text-sm transition',
                  isSelected
                    ? 'bg-slate-900 font-semibold text-white'
                    : isToday
                      ? 'bg-slate-100 font-semibold text-slate-900 hover:bg-slate-200'
                      : 'text-slate-700 hover:bg-slate-100',
                )}
              >
                {day}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
