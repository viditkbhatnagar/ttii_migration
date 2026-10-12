import { describe, expect, test } from 'vitest';

import {
  QUALIFICATIONS,
  ageFromDob,
  buildStudentForm,
  dobYmd,
  resolveOption,
  withCurrent,
} from '../src/admin/pages/students/edit-student-model';

describe('legacy value resolution', () => {
  test('exact, case-insensitive, alias, else raw', () => {
    expect(resolveOption('Male', ['Male', 'Female'])).toBe('Male');
    expect(resolveOption('female', ['Male', 'Female'])).toBe('Female');
    expect(resolveOption('2', ['Male', 'Female', 'Other'])).toBe('Female');
    expect(resolveOption("Bachelor's", QUALIFICATIONS)).toBe("Bachelor's Degree");
    expect(resolveOption('not_married', ['Single', 'Married'])).toBe('Single');
    expect(resolveOption('B.Ed (Hons)', QUALIFICATIONS)).toBe('B.Ed (Hons)');
    expect(resolveOption('  ', QUALIFICATIONS)).toBe('');
  });

  test('an unmatched stored value is kept as a "(current)" option', () => {
    const base = [{ value: '', label: 'Select' }, { value: 'A', label: 'A' }];
    expect(withCurrent(base, 'Z').at(-1)).toEqual({ value: 'Z', label: 'Z (current)' });
    expect(withCurrent(base, 'A')).toBe(base);
    expect(withCurrent(base, '')).toBe(base);
  });
});

describe('dates', () => {
  test('dob is read from the leading digits, never shifted', () => {
    expect(dobYmd('1995-03-01T00:00:00.000Z')).toBe('1995-03-01');
    expect(dobYmd('1995-03-01')).toBe('1995-03-01');
    expect(dobYmd('0000-00-00')).toBe('0000-00-00');
    expect(dobYmd('garbage')).toBe('');
    expect(dobYmd(null)).toBe('');
  });

  test('age in whole years, birthday-aware', () => {
    expect(ageFromDob('1995-03-01', '2026-02-28')).toBe(30);
    expect(ageFromDob('1995-03-01', '2026-03-01')).toBe(31);
    expect(ageFromDob('2030-01-01', '2026-01-01')).toBeNull();
    expect(ageFromDob('', '2026-01-01')).toBeNull();
  });
});

describe('form', () => {
  test('same keys and prefill as the old page', () => {
    const form = buildStudentForm({
      name: 'Divya N', user_email: 'd@x.in', second_phone: '98', whatsapp_no: '919188644038', gender: '2',
      marital_status: 'married', nationality: '99', nationality_name: 'India', country: '99', country_name: 'India',
      date_of_birth: '1995-03-01T00:00:00.000Z', previous_school: 'GHS', work_experience: '1-3 years',
      employment_status: 'self-employed', course_id: 16, status: '',
    });
    expect(form).toMatchObject({
      name: 'Divya N', alternate_phone: '98', whatsapp_no: '919188644038', gender: 'Female', marital_status: 'Married',
      nationality: 'India', country: 'India', date_of_birth: '1995-03-01', institution_name: 'GHS',
      experience_years: '1-3 Years', employment_status: 'Self-Employed', course_id: '16', status: '1',
    });
    expect(Object.keys(form)).toHaveLength(45);
  });
});
