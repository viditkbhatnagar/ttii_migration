import { COUNTRIES, INDIAN_STATES, getDistrictsForState } from '@/lib/locations';

// Country / State / District rules shared by the lead dialog and the public
// centre form (LocationFields renders them).

export interface LocationValue {
  country: string;
  state: string;
  district: string;
}

export const COUNTRY_NAMES: string[] = COUNTRIES.map((c) => c.name);

/** "Select a …" when a searchable box holds typed text that is not one of its options. */
export function locationErrors(value: LocationValue, requireDistrict: boolean): Partial<Record<keyof LocationValue, string>> {
  const e: Partial<Record<keyof LocationValue, string>> = {};
  if (!value.country.trim()) e.country = 'Required';
  else if (!COUNTRY_NAMES.includes(value.country)) e.country = 'Select a country from the list';
  if (!value.state.trim()) e.state = 'Required';
  else if (value.country === 'India' && !INDIAN_STATES.includes(value.state)) e.state = 'Select a state from the list';
  const districts = value.country === 'India' && value.state ? getDistrictsForState(value.state) : null;
  if (requireDistrict && !value.district.trim()) e.district = 'Required';
  else if (value.district.trim() && districts && !districts.includes(value.district)) e.district = 'Select a district from the list';
  return e;
}
