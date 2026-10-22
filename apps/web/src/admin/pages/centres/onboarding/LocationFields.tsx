import { Input } from '@/components/ui/input';
import { INDIAN_STATES, getDistrictsForState } from '@/lib/locations';
import { SearchableSelect } from '../../../shared/components/SearchableSelect.js';
import { COUNTRY_NAMES, type LocationValue } from './location-rules.js';

// Country → State → District as cascading searchable dropdowns (Naji's
// SearchableSelect + locations), on the app's own location data: India has the
// full state and district lists; other countries (and Indian states without a
// district list) fall back to typing the name. Changing a parent clears its
// children. Used by Add / Edit Centre Lead and the public centre form.

export function LocationFields({ value, onChange, errors, requireDistrict = false, idPrefix }: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  errors?: Partial<Record<keyof LocationValue, string | undefined>>;
  requireDistrict?: boolean;
  idPrefix: string;
}) {
  const india = value.country === 'India';
  const districts = india && value.state ? getDistrictsForState(value.state) : null;
  const err = (k: keyof LocationValue) => (errors?.[k] ? <p role="alert" className="text-xs text-destructive">{errors[k]}</p> : null);
  // One label style for both kinds of box: the searchable box keeps its own
  // label for screen readers only, the visible one carries Naji's red asterisk.
  const label = (text: string, required: boolean, htmlFor?: string) => (
    <label htmlFor={htmlFor} aria-hidden={htmlFor ? undefined : true} className="text-xs font-semibold text-foreground">
      {text}{required ? <span className="text-destructive"> *</span> : null}
    </label>
  );
  const searchable = (text: string, required: boolean, box: React.ReactNode) => (
    <>
      {label(text, required)}
      <div className="[&>div>label]:sr-only">{box}</div>
    </>
  );
  const typed = (key: 'state' | 'district', text: string, required: boolean, disabled: boolean, onText: (v: string) => void) => (
    <>
      {label(text, required, `${idPrefix}-${key}`)}
      <Input id={`${idPrefix}-${key}`} value={value[key]} disabled={disabled} aria-invalid={Boolean(errors?.[key])} onChange={(e) => onText(e.target.value)} />
    </>
  );
  return (
    <>
      <div className="grid min-w-0 content-start gap-1.5">
        {searchable('Country', true, (
          <SearchableSelect
            label="Country (required)"
            value={value.country}
            options={COUNTRY_NAMES}
            strict
            placeholder="Select country"
            onChange={(v) => { if (v !== value.country) onChange({ country: v, state: '', district: '' }); }}
          />
        ))}
        {err('country')}
      </div>
      <div className="grid min-w-0 content-start gap-1.5">
        {india ? searchable('State', true, (
          <SearchableSelect
            label="State (required)"
            value={value.state}
            options={[...INDIAN_STATES]}
            strict
            placeholder="Select state"
            onChange={(v) => { if (v !== value.state) onChange({ ...value, state: v, district: '' }); }}
          />
        )) : typed('state', 'State', true, !value.country, (v) => onChange({ ...value, state: v, district: '' }))}
        {err('state')}
      </div>
      <div className="grid min-w-0 content-start gap-1.5">
        {districts ? searchable('District', requireDistrict, (
          <SearchableSelect
            label={requireDistrict ? 'District (required)' : 'District'}
            value={value.district}
            options={[...districts]}
            strict
            placeholder="Select district"
            onChange={(v) => onChange({ ...value, district: v })}
          />
        )) : typed('district', 'District', requireDistrict, !value.state, (v) => onChange({ ...value, district: v }))}
        {err('district')}
      </div>
    </>
  );
}

