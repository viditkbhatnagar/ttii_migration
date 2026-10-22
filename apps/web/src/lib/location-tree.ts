import { COUNTRIES, INDIAN_STATES, getCountryByName, getDistrictsForState } from './locations';

// Country → State → District for cascading address pickers (Centres v2, Naji
// 2026-10-22). India uses the full lists in locations.ts; the Gulf countries
// TTII centres operate in carry the prototype's emirates / governorates and
// their districts. Any other country has no list: the pickers accept free text.

const GULF: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  'United Arab Emirates': {
    Dubai: ['Deira', 'Bur Dubai', 'Jumeirah', 'Al Barsha', 'Dubai Marina'],
    'Abu Dhabi': ['Abu Dhabi City', 'Al Ain', 'Al Dhafra'],
    Sharjah: ['Sharjah City', 'Khor Fakkan', 'Kalba'],
    Ajman: ['Ajman City'],
    'Ras Al Khaimah': ['RAK City'],
  },
  Qatar: { Doha: ['Doha'], 'Al Rayyan': ['Al Rayyan'], 'Al Wakrah': ['Al Wakrah'] },
  Oman: { Muscat: ['Muscat', 'Seeb', 'Bawshar'], Dhofar: ['Salalah'] },
  'Saudi Arabia': { Riyadh: ['Riyadh'], Makkah: ['Jeddah', 'Makkah'], 'Eastern Province': ['Dammam', 'Khobar'] },
};

/** Every country name, India first (locations.ts order). */
export const COUNTRY_NAMES: readonly string[] = COUNTRIES.map((c) => c.name);

/** The states of a country; [] when no list is known (free text). */
export function statesFor(country: string): readonly string[] {
  if (country === 'India') return INDIAN_STATES;
  return Object.keys(GULF[country] ?? {});
}

/** The districts of a state; [] when no list is known (free text). */
export function districtsFor(country: string, state: string): readonly string[] {
  if (country === 'India') return getDistrictsForState(state) ?? [];
  return GULF[country]?.[state] ?? [];
}

/** "+91" for "India"; '' for an unknown country. */
export function dialCodeFor(country: string): string {
  const entry = getCountryByName(country);
  return entry ? `+${entry.dial}` : '';
}
