import { Input } from '@/components/ui/input';
import { isImplausibleClassTime, toPmEquivalent, toTimeDisplay } from '@/lib/class-time';
import { cn } from '@/lib/utils';

// A native <input type="time"> emits a correct 24-hour "HH:MM", but in a
// 12-hour browser locale it renders hh:mm + an AM/PM segment, and that segment
// defaults to AM. Typing "2:00" for an afternoon class and tabbing away
// therefore stores 02:00 — 2 AM — with no visible complaint.
//
// That is exactly how the 28 Jul 2026 "2.00pm session not showing as Ongoing"
// bug happened: live_class 738 (cohort 93) was saved 02:00-03:15, so by 14:07
// the student portal correctly filed it under Past. It was not a one-off —
// 21 classes sat at 02:00 and 6 at 03:00, against 221 correctly at 19:00.
//
// Rather than replace the native control (it has the best keyboard and mobile
// behaviour), flag the implausible window and offer a one-click correction.
// Sibling of dmy-date-field.tsx, which guards the same class of trap on dates.

interface ClassTimeInputProps {
  value: string;
  onChange: (hhmm: string) => void;
  className?: string | undefined;
}

/**
 * Time input for scheduling a class. Behaves exactly like the native control,
 * but when the value lands before 07:00 it shows an inline warning offering a
 * one-click switch to the PM equivalent.
 */
export function ClassTimeInput({ value, onChange, className }: ClassTimeInputProps) {
  const suspect = isImplausibleClassTime(value);
  return (
    <div className="grid gap-1">
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={suspect || undefined}
        className={cn(suspect && 'border-amber-400 focus-visible:ring-amber-400', className)}
      />
      {suspect && (
        <p className="text-[11px] leading-tight text-amber-800">
          That is <span className="font-semibold">{toTimeDisplay(value)}</span> — did you mean{' '}
          <button
            type="button"
            onClick={() => onChange(toPmEquivalent(value))}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            {toTimeDisplay(toPmEquivalent(value))}
          </button>
          ?
        </p>
      )}
    </div>
  );
}
