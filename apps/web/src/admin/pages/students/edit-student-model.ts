// Pure logic of Admin → Students → Edit (moved out of EditStudentPage when it
// was restyled to Naji's student-profile look, TTII 2026-10-12). The form
// fields, the legacy-value resolution and the save body are unchanged.

export const QUALIFICATIONS = [
  'Secondary School', 'Higher Secondary', 'Diploma', "Bachelor's Degree",
  'Postgraduate Diploma', "Master's Degree", 'M.Phil.', 'Ph.D.',
  'Professional Certification', 'Other',
];

export const EXPERIENCE_BUCKETS = ['Fresher', '0-1 Years', '1-3 Years', '3-5 Years', '5-10 Years', '10+ Years'];

export const GENDERS = ['Male', 'Female', 'Other'];
export const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
export const EMPLOYMENT_STATUSES = ['Employed', 'Self-Employed', 'Unemployed', 'Student', 'Homemaker', 'Retired'];
export const ACCOUNT_STATUSES = [
  { value: '1', label: 'Active' }, { value: '0', label: 'Inactive' }, { value: '2', label: 'Graduated' }, { value: '3', label: 'Dropped' },
];

// Naji 2026-05-11 — TTII is India-focused: built-in Indian states + UTs.
// Free text still works for international students.
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

// Naji 2026-05-12 — districts per state (Kerala first; others stay free text).
export const DISTRICTS_BY_STATE: Record<string, string[]> = {
  Kerala: [
    'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam',
    'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta',
    'Thiruvananthapuram', 'Thrissur', 'Wayanad',
  ],
};

// Naji 2026-05-11 — legacy spellings mapped to the canonical dropdown option.
const ALIASES: Record<string, string> = {
  '1': 'Male', '2': 'Female', '3': 'Other',
  male: 'Male', female: 'Female', other: 'Other',
  married: 'Married', single: 'Single', divorced: 'Divorced', widowed: 'Widowed',
  not_married: 'Single', unmarried: 'Single',
  admin: 'Admin', counsellor: 'Counsellor', counselor: 'Counsellor',
  associate: 'Associate', associates: 'Associate', centre: 'Centre', center: 'Centre',
  facebook: 'Facebook', whatsapp: 'WhatsApp', email: 'Email', website: 'Website',
  'walk-in': 'Walk-in', walkin: 'Walk-in', 'call-in': 'Call-in', callin: 'Call-in',
  reference: 'Reference', referral: 'Reference', referred: 'Reference',
  "bachelor's": "Bachelor's Degree", bachelors: "Bachelor's Degree", bachelor: "Bachelor's Degree",
  "master's": "Master's Degree", masters: "Master's Degree", master: "Master's Degree",
  'high school': 'Secondary School', 'senior secondary': 'Higher Secondary',
  intermediate: 'Higher Secondary', 'plus two': 'Higher Secondary', '+2': 'Higher Secondary',
  online: 'Online', offline: 'Offline', hybrid: 'Hybrid',
  employed: 'Employed', 'self-employed': 'Self-Employed', selfemployed: 'Self-Employed',
  unemployed: 'Unemployed', student: 'Student', homemaker: 'Homemaker', retired: 'Retired',
};

/**
 * A raw legacy value → the canonical option: exact match, then a
 * case-insensitive label match, then a known alias; otherwise the raw value
 * unchanged (the select keeps it as a "(current)" option so nothing is lost).
 */
export function resolveOption(raw: string, options: string[]): string {
  const v = raw.trim();
  if (!v) return '';
  if (options.includes(v)) return v;
  const lower = v.toLowerCase();
  const ci = options.find((o) => o.toLowerCase() === lower);
  if (ci) return ci;
  return ALIASES[lower] ?? v;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');

/** YYYY-MM-DD of a stored date of birth (ISO timestamp or bare date); '' if unreadable. */
export function dobYmd(value: unknown): string {
  const s = value instanceof Date ? value.toISOString() : str(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
}

/** Whole years from a YYYY-MM-DD birth date to `today` (YYYY-MM-DD); null when out of range. */
export function ageFromDob(ymd: string, today: string): number | null {
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!b || !t) return null;
  let age = Number(t[1]) - Number(b[1]);
  const md = Number(t[2]) - Number(b[2]);
  if (md < 0 || (md === 0 && Number(t[3]) < Number(b[3]))) age -= 1;
  return age < 0 || age > 130 ? null : age;
}

/** Today's local calendar date as YYYY-MM-DD (built from local parts). */
export function localTodayYmd(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export type StudentForm = Record<string, string>;

/** The form state the page edits — identical keys to the old page's form. */
export function buildStudentForm(student: Record<string, unknown>): StudentForm {
  const s = (k: string) => str(student[k]);
  return {
    name: s('name'),
    user_email: s('user_email'),
    phone: s('phone'),
    country_code: s('country_code'),
    alternate_phone: s('second_phone') || s('alternate_phone'),
    // getStudentDetail mirrors the `whatsapp` string onto whatsapp_no (the Int
    // column overflows); the server writes 0 there and keeps the string.
    whatsapp_no: s('whatsapp_no'),
    date_of_birth: dobYmd(student.date_of_birth),
    age: s('age'),
    gender: resolveOption(s('gender'), GENDERS),
    nationality: s('nationality_name') || s('nationality'),
    marital_status: resolveOption(s('marital_status'), MARITAL_STATUSES),
    father_name: s('father_name'),
    mother_name: s('mother_name'),
    guardian_name: s('guardian_name'),
    aadhar_no: s('aadhar_no'),
    passport_no: s('passport_no'),
    emergency_name: s('emergency_name'),
    emergency_relation: s('emergency_relation'),
    emergency_phone: s('emergency_phone'),
    biography: s('biography'),
    learning_disabilities: s('learning_disabilities'),
    accessibility_needs: s('accessibility_needs'),
    country: s('country_name') || s('country'),
    state: s('state'),
    city: s('city'),
    address: s('address'),
    native_address: s('native_address'),
    status: s('status') || '1',
    highest_qualification: resolveOption(s('highest_qualification'), QUALIFICATIONS),
    specialization: s('specialization'),
    institution_name: s('institution_name') || s('previous_school'),
    year_of_passing: s('year_of_passing'),
    percentage_or_grade: s('percentage_or_grade'),
    employment_status: resolveOption(s('employment_status'), EMPLOYMENT_STATUSES),
    current_occupation: s('current_occupation'),
    experience_years: resolveOption(s('work_experience') || s('experience_years'), EXPERIENCE_BUCKETS),
    // Enrolment fields no longer edited here — round-tripped so a save keeps them.
    course_id: s('course_id'),
    offering_id: s('offering_id'),
    certificate_combination_id: s('certificate_combination_id'),
    mode_of_study: s('mode_of_study'),
    preferred_language: s('preferred_language'),
    pipeline: s('pipeline'),
    pipeline_user: s('pipeline_user'),
    lead_source: s('lead_source'),
    reference_student_id: s('reference_student_id'),
  };
}

/** Options for a select, with an unmatched stored value kept as "(current)". */
export function withCurrent(options: Array<{ value: string; label: string }>, value: string): Array<{ value: string; label: string }> {
  return value && !options.some((o) => o.value === value) ? [...options, { value, label: `${value} (current)` }] : options;
}
