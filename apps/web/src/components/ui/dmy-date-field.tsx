import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dmyToIso, formatDmyInput, isoToDmy } from '@/lib/dmy-date';

// dd/mm/yyyy date entry that stores the canonical ISO yyyy-mm-dd internally.
// A native <input type="date"> renders in the browser locale (which can't be
// overridden) and rejects a typed dd/mm/yyyy string — so we use a text mask.
// (Naji UAT 2026-05-31, originally inline in PublicApplyPage; extracted to a
// shared component 2026-07-06 when the admin/counsellor Add-Application form
// hit the same "can't add DOB" bug, then generalised to DmyDateInput 2026-07-06
// so the other DOB surfaces — Edit Student, Student Profile, Counsellors,
// Associates, SSO complete-profile — can reuse it while keeping their own
// labels/styling.)

interface DmyDateInputProps {
  /** Canonical ISO yyyy-mm-dd (or '' when empty). */
  value: string;
  /** Fires with the canonical ISO yyyy-mm-dd once a full dd/mm/yyyy is typed. */
  onChange: (iso: string) => void;
  // `| undefined` on the optionals so callers (incl. FieldDmyDate) can forward
  // their own optional props under exactOptionalPropertyTypes.
  required?: boolean | undefined;
  id?: string | undefined;
  className?: string | undefined;
  placeholder?: string | undefined;
}

/**
 * A label-less dd/mm/yyyy masked input. Compose with your own <Label> when the
 * surface needs custom label styling; reach for FieldDmyDate for the common
 * stacked label + input pair. onChange only fires once a full valid dd/mm/yyyy
 * has been typed, so a partially-typed value leaves the stored ISO untouched.
 */
export function DmyDateInput({ value, onChange, required, id, className, placeholder = 'dd/mm/yyyy' }: DmyDateInputProps) {
  const [text, setText] = useState(isoToDmy(value));
  useEffect(() => {
    setText(isoToDmy(value));
  }, [value]);
  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      maxLength={10}
      placeholder={placeholder}
      value={text}
      required={required}
      className={className}
      onChange={(e) => {
        // Students only ever type digits; the slashes are inserted for them.
        const masked = formatDmyInput(e.target.value);
        setText(masked);
        const iso = dmyToIso(masked);
        if (iso) {
          onChange(iso);
        } else if (masked === '') {
          // Clearing the field must clear the stored date too — otherwise the
          // form still holds the previous DOB while the box looks empty.
          onChange('');
        }
      }}
    />
  );
}

interface FieldDmyDateProps {
  label: string;
  /** Canonical ISO yyyy-mm-dd (or '' when empty). */
  value: string;
  /** Fires with the canonical ISO yyyy-mm-dd once a full dd/mm/yyyy is typed. */
  onChange: (iso: string) => void;
  required?: boolean;
  id?: string;
}

export function FieldDmyDate({ label, value, onChange, required, id }: FieldDmyDateProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <DmyDateInput id={id} value={value} onChange={onChange} required={required} />
    </div>
  );
}
