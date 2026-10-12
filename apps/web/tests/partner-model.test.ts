import { describe, expect, test } from 'vitest';

import {
  EMPTY_PARTNER_FORM,
  buildCodeFromPartners,
  buildPartnerPayload,
  combinationCsvRows,
  filterCombinations,
  filterPartners,
  gstLabel,
  isDuplicateCombination,
  normalizeCombinationCode,
  partnerFormFrom,
  sortCombinations,
  sortPartners,
  statusCounts,
  toCombinationRows,
  toPartnerRows,
  validatePartner,
  type CombinationFilters,
} from '../src/admin/pages/certificates/partner-model';
import {
  combinationCount,
  filterPartnerStudents,
  studentStatuses,
  toPartnerCourses,
  toPartnerStudents,
} from '../src/admin/pages/partners/partner-detail-model';

const combos = toCombinationRows([
  { id: '1', combination_code: 'TTII + MSU', program_id: '3', program_title: 'Montessori', course_id: '16', course_title: 'Diploma', gst_applicable: true, gst_percent: 18, status: 'active', partners: [{ id: '10', partner_code: 'TTII', name: 'TTII' }, { id: '11', partner_code: 'MSU', name: 'MS University' }] },
  { id: '2', combination_code: 'TTII', program_id: '3', program_title: 'Montessori', course_id: '18', course_title: 'PG Diploma', gst_applicable: 0, gst_percent: null, status: 'inactive', partners: [{ id: '10', partner_code: 'TTII', name: 'TTII' }] },
  { id: '3', combination_code: 'CC-XYZ', program_id: '', program_title: '', course_id: '', course_title: '', gst_applicable: true, gst_percent: null, status: 'active', partners: [] },
]);

const partners = toPartnerRows([
  { id: '10', partner_code: 'TTII', name: 'Teachers Training Institute', country: 'India', status: 'active', position: 10 },
  { id: '11', partner_code: 'MSU', name: 'MS University', country: 'India', status: 'Inactive', position: '20' },
  { id: '12', partner_code: 'KHDA', name: 'KHDA', country: 'UAE', status: 'active', position: null },
], combos);

describe('partners', () => {
  test('combination counts come from the combinations list', () => {
    expect(partners.map((p) => p.combinations)).toEqual([2, 1, 0]);
  });

  test('status tabs and filters', () => {
    expect(statusCounts(partners)).toEqual({ all: 3, active: 2, inactive: 1 });
    expect(filterPartners(partners, { tab: 'inactive', search: '', country: '' }).map((p) => p.id)).toEqual(['11']);
    expect(filterPartners(partners, { tab: 'all', search: '', country: 'UAE' }).map((p) => p.id)).toEqual(['12']);
    expect(filterPartners(partners, { tab: 'all', search: 'univ', country: '' }).map((p) => p.id)).toEqual(['11']);
  });

  test('display order sorts blanks last', () => {
    expect(sortPartners(partners, 'position', 'asc').map((p) => p.id)).toEqual(['10', '11', '12']);
    expect(sortPartners(partners, 'combinations', 'desc').map((p) => p.id)).toEqual(['10', '11', '12']);
  });

  test('validation: required, duplicates, display order', () => {
    const others = partners.filter((p) => p.id !== '10');
    expect(validatePartner(EMPTY_PARTNER_FORM, others)).toEqual({ partner_code: 'Partner Code is required', name: 'Partner Name is required' });
    expect(validatePartner({ ...EMPTY_PARTNER_FORM, partner_code: 'msu', name: 'khda', position: '-1' }, others)).toEqual({
      partner_code: 'This code is already used by another partner',
      name: 'A partner with this name already exists',
      position: 'Display order must be 0 or more',
    });
    expect(validatePartner(partnerFormFrom(partners[0]!), others)).toEqual({});
  });

  test('payload matches the old body (position only when given)', () => {
    expect(buildPartnerPayload({ ...EMPTY_PARTNER_FORM, partner_code: ' AAP ', name: 'Aap' })).toEqual({
      partner_code: 'AAP', name: 'Aap', short_name: '', country: '', description: '', logo: '', status: 'active',
    });
    expect(buildPartnerPayload({ ...EMPTY_PARTNER_FORM, position: '5' }).position).toBe(5);
  });
});

describe('combinations', () => {
  const none: CombinationFilters = { tab: 'all', search: '', programId: '', courseId: '', partnerId: '', gst: '' };

  test('gst label falls back to 18%', () => {
    expect(combos.map(gstLabel)).toEqual(['Yes (18%)', 'No', 'Yes (18%)']);
  });

  test('filters', () => {
    expect(filterCombinations(combos, { ...none, partnerId: '11' }).map((r) => r.id)).toEqual(['1']);
    expect(filterCombinations(combos, { ...none, gst: 'no' }).map((r) => r.id)).toEqual(['2']);
    expect(filterCombinations(combos, { ...none, tab: 'active', search: 'ms univ' }).map((r) => r.id)).toEqual(['1']);
    expect(filterCombinations(combos, { ...none, courseId: '18' }).map((r) => r.id)).toEqual(['2']);
  });

  test('sort by gst puts "No" first ascending', () => {
    expect(sortCombinations(combos, 'gst', 'asc')[0]?.id).toBe('2');
  });

  test('code helpers', () => {
    expect(normalizeCombinationCode(' TTII+KHDA  +MSU ')).toBe('TTII + KHDA + MSU');
    const list = [{ id: '10', code: 'TTII' }, { id: '11', code: 'MSU' }, { id: '12', code: '', shortName: 'KH' }];
    expect(buildCodeFromPartners(list, ['12', '10'])).toBe('TTII + KH');
  });

  test('duplicate = same course and same partner set, excluding itself', () => {
    expect(isDuplicateCombination(combos, '', '16', ['11', '10'])).toBe(true);
    expect(isDuplicateCombination(combos, '1', '16', ['11', '10'])).toBe(false);
    expect(isDuplicateCombination(combos, '', '16', ['10'])).toBe(false);
    expect(isDuplicateCombination(combos, '', '', ['10'])).toBe(false);
  });

  test('csv', () => {
    expect(combinationCsvRows(combos)[1]).toEqual(['TTII + MSU', 'Montessori', 'Diploma', 'TTII + MSU', 'Yes (18%)', 'Active']);
  });
});

describe('partner detail', () => {
  const courses = toPartnerCourses([
    { id: '16', title: 'Diploma', student_count: 4, course_type: 1, combinations: [{ id: '1', code: 'TTII + MSU' }, { id: '2', code: 'TTII' }] },
    { id: '18', title: 'PG', student_count: '2', course_type: 0, combinations: [{ id: '2', code: 'TTII' }] },
  ]);
  const students = toPartnerStudents([
    { enrolment_id: '1', user_id: '5', name: 'Asha', email: 'asha@x.in', student_id: 'TTS0001', course_id: '16', course_title: 'Diploma', enrollment_status: 'Active' },
    { enrolment_id: '2', user_id: '6', name: 'Binu', email: '919544125503', student_id: 'TTS0002', course_id: '18', course_title: 'PG', enrollment_status: 'completed' },
  ]);

  test('courses + distinct combinations', () => {
    expect(courses.map((c) => c.type)).toEqual(['Cohort-based', 'Self-study']);
    expect(combinationCount(courses)).toBe(2);
  });

  test('a phone number in the email column is not shown as an email', () => {
    expect(students.map((s) => s.email)).toEqual(['asha@x.in', '']);
  });

  test('student filters', () => {
    expect(filterPartnerStudents(students, { search: 'tts0002', courseId: '', status: '' }).map((s) => s.key)).toEqual(['2']);
    expect(filterPartnerStudents(students, { search: '', courseId: '16', status: '' }).map((s) => s.key)).toEqual(['1']);
    expect(filterPartnerStudents(students, { search: '', courseId: '', status: 'Completed' }).map((s) => s.key)).toEqual(['2']);
    expect(studentStatuses(students)).toEqual(['Active', 'completed']);
  });
});
