import type { PrismaClient } from '@prisma/client';

import { combinationsForOffering, dateYmd, offeringOpenOn, scalarText as text, type PlanStatus } from './centre-portal-apps-model.js';

// The TTII catalogue a centre sees for ITS courses (centre_course_plans):
// active offerings (open = enrolment window not closed, IST day) and the
// certificate combinations a student can be enrolled with, partners included.
// No prices: per-combination centre fees / discount / GST are a pending
// product decision (offering packages hold the STUDENT-facing price).

export interface CatalogCombination { id: number; code: string; partners: string[] }

export interface CatalogOffering {
  id: number;
  title: string;
  code: string;
  mode: string;
  startDate: string;
  endDate: string;
  enrolmentStart: string;
  enrolmentEnd: string;
  capacity: number | null;
  /** Taking applications today. */
  open: boolean;
  combinations: CatalogCombination[];
}

export interface CatalogCourse {
  id: number;
  title: string;
  shortName: string;
  code: string;
  category: string;
  duration: string;
  /** Active offerings of the course (open and not yet open / closed). */
  offerings: CatalogOffering[];
  /** Every combination a student of this course can be enrolled with. */
  combinations: CatalogCombination[];
}

export type OptionCourse = CatalogCourse & { planStatus: PlanStatus };


/** Soonest start first; offerings with no start date last. */
function byStartDate(a: CatalogOffering, b: CatalogOffering): number {
  if (a.startDate !== b.startDate) {
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return a.startDate.localeCompare(b.startDate);
  }
  return a.id - b.id;
}

export async function loadCourseCatalog(prisma: PrismaClient, courseIds: number[], todayYmd: string): Promise<CatalogCourse[]> {
  if (courseIds.length === 0) return [];
  const [courses, offerings, combos] = await Promise.all([
    prisma.course.findMany({
      where: { id: { in: courseIds }, deleted_at: null },
      select: { id: true, title: true, short_name: true, course_code: true, duration: true, category_id: true },
    }),
    prisma.offerings.findMany({
      where: { course_id: { in: courseIds }, deleted_at: null },
      select: {
        id: true, course_id: true, title: true, offering_code: true, delivery_mode: true, start_date: true, end_date: true,
        enrollment_start: true, enrollment_end: true, max_enrollment: true, status: true,
      },
      orderBy: [{ start_date: 'asc' }, { id: 'asc' }],
    }),
    prisma.certificate_combinations.findMany({
      where: { course_id: { in: courseIds }, deleted_at: null, status: 'active' },
      select: { id: true, course_id: true, combination_code: true },
      orderBy: { id: 'asc' },
    }),
  ]);
  const active = offerings.filter((o) => text(o.status).toLowerCase() === 'active');
  const categoryIds = [...new Set(courses.map((c) => c.category_id).filter((id): id is number => typeof id === 'number' && id > 0))];
  const comboIds = combos.map((c) => c.id);
  const [packages, categories, partnerLinks] = await Promise.all([
    active.length === 0 ? [] : prisma.offering_certificate_packages.findMany({
      where: { offering_id: { in: active.map((o) => o.id) }, deleted_at: null },
      select: { offering_id: true, combination_id: true },
    }),
    categoryIds.length === 0 ? [] : prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true } }),
    comboIds.length === 0 ? [] : prisma.certificate_combination_partners.findMany({
      where: { combination_id: { in: comboIds } },
      select: { combination_id: true, partner_id: true },
    }),
  ]);
  const partnerIds = [...new Set(partnerLinks.map((l) => l.partner_id))];
  const partners = partnerIds.length === 0 ? [] : await prisma.certification_partners.findMany({
    where: { id: { in: partnerIds }, deleted_at: null },
    select: { id: true, name: true, short_name: true, position: true },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
  });
  const partnerOrder = new Map(partners.map((p, i) => [p.id, i]));
  const partnerName = new Map(partners.map((p) => [p.id, text(p.short_name) || text(p.name)]));
  const categoryName = new Map(categories.map((c) => [c.id, text(c.name)]));

  const toCombination = (c: { id: number; combination_code: string }): CatalogCombination => ({
    id: c.id,
    code: text(c.combination_code),
    partners: partnerLinks
      .filter((l) => l.combination_id === c.id && partnerName.has(l.partner_id))
      .sort((a, b) => (partnerOrder.get(a.partner_id) ?? 0) - (partnerOrder.get(b.partner_id) ?? 0))
      .map((l) => partnerName.get(l.partner_id) ?? ''),
  });

  return courses.map((course) => {
    const courseCombos = combos.filter((c) => c.course_id === course.id).map(toCombination);
    const courseOfferings = active.filter((o) => o.course_id === course.id).map((o): CatalogOffering => ({
      id: o.id,
      title: text(o.title) || text(o.offering_code) || `Offering ${o.id}`,
      code: text(o.offering_code),
      mode: text(o.delivery_mode),
      startDate: dateYmd(o.start_date),
      endDate: dateYmd(o.end_date),
      enrolmentStart: dateYmd(o.enrollment_start),
      enrolmentEnd: dateYmd(o.enrollment_end),
      capacity: typeof o.max_enrollment === 'number' && o.max_enrollment > 0 ? o.max_enrollment : null,
      open: offeringOpenOn(o, todayYmd),
      combinations: combinationsForOffering(courseCombos, packages.filter((p) => p.offering_id === o.id).map((p) => p.combination_id)),
    })).sort(byStartDate);
    const open = courseOfferings.filter((o) => o.open);
    const offered = new Set(open.flatMap((o) => o.combinations.map((c) => c.id)));
    return {
      id: course.id,
      title: text(course.title) || `Course ${course.id}`,
      shortName: text(course.short_name),
      code: text(course.course_code),
      category: course.category_id ? categoryName.get(course.category_id) ?? '' : '',
      duration: text(course.duration),
      offerings: courseOfferings,
      combinations: open.length === 0 ? courseCombos : courseCombos.filter((c) => offered.has(c.id)),
    };
  });
}
