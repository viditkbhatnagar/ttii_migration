import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { COUNTRIES } from '@/lib/locations';

/**
 * Phone number input with a country dial-code dropdown. Stores the dial
 * code separately so the backend can validate / format consistently.
 *
 * Naji 2026-05-02 — every contact / WhatsApp number must be prefixed with
 * a country code dropdown across the system.
 */
interface PhoneInputProps {
  /** Dial code without "+" prefix (e.g. "91"). */
  countryCode: string;
  number: string;
  onChange: (next: { countryCode: string; number: string }) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
}

const selectClass =
  'inline-flex h-10 shrink-0 items-center rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

export function PhoneInput({ countryCode, number, onChange, placeholder, id }: PhoneInputProps) {
  // Sort by dial code numerically; preserve India at the very top regardless.
  const options = useMemo(() => {
    const india = COUNTRIES.find((c) => c.code === 'IN');
    const rest = COUNTRIES.filter((c) => c.code !== 'IN').slice().sort((a, b) => a.name.localeCompare(b.name));
    return india ? [india, ...rest] : rest;
  }, []);

  return (
    <div className="flex w-full items-stretch gap-2">
      <select
        aria-label="Country dial code"
        className={selectClass}
        value={countryCode || '91'}
        onChange={(e) => onChange({ countryCode: e.target.value, number })}
      >
        {options.map((c) => (
          <option key={c.code} value={c.dial}>
            {c.code} +{c.dial}
          </option>
        ))}
      </select>
      <Input
        {...(id !== undefined ? { id } : {})}
        type="tel"
        inputMode="tel"
        value={number}
        onChange={(e) => onChange({ countryCode, number: e.target.value.replace(/[^0-9 -]/g, '') })}
        placeholder={placeholder ?? 'Enter phone number'}
        className="flex-1 min-w-0"
      />
    </div>
  );
}
