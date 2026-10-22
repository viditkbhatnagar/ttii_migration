import { useId } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortalThemeClass } from '@/lib/portal-theme';
import { cn } from '@/lib/utils';

interface FilterSelectProps {
  label: string;
  /** Visually hide the label (it still names the control). */
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  /** Label of the leading "all" option (value 'all'); omit for no such option. */
  allLabel?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

/**
 * Labelled Radix select for filters and form pick lists. Empty values are
 * ignored: a controlled Radix Select emits '' when its options change under
 * it, which would silently wipe the choice.
 */
export function FilterSelect({
  label, hideLabel = false, value, onChange, options, allLabel, placeholder, className, triggerClassName,
}: FilterSelectProps) {
  const id = useId();
  const portalTheme = usePortalThemeClass();
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className={cn('text-[11px] font-medium text-muted-foreground', hideLabel && 'sr-only')}>{label}</label>
      <Select value={value} onValueChange={(v) => { if (v) onChange(v); }}>
        <SelectTrigger id={id} className={cn('mt-1 h-9 w-full text-xs', hideLabel && 'mt-0', triggerClassName)}>
          <SelectValue placeholder={placeholder ?? `Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent className={portalTheme}>
          {allLabel && <SelectItem value="all">{allLabel}</SelectItem>}
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
