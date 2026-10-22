import type { PrismaClient } from '@prisma/client';

import { DUPLICATE_PLAN_MESSAGE, planIsLive, validatePlanInput } from './centre-course-plan-model.js';
import { fail, intOf, text, ymdOfDate, type Outcome } from './centre-profile-model.js';

// Admin management of centre_course_plans (the courses a centre may add
// student applications for, and the centre fee). Rule for renewals: a NEW plan
// is refused only while a live plan (not deleted, end date today-IST or later)
// exists for the same centre + course; an expired plan does not block, so a
// renewal is a fresh plan and the expired row stays as history.

export class CentreCoursePlans {
  constructor(private readonly prisma: PrismaClient, private readonly now: () => Date) {}

  async options(): Promise<Outcome<{ courses: Array<{ id: number; title: string }> }>> {
    const rows = await this.prisma.course.findMany({
      where: { deleted_at: null, status: 'active' }, select: { id: true, title: true }, orderBy: { title: 'asc' },
    });
    return { status: 1, message: 'success', data: { courses: rows.map((r) => ({ id: r.id, title: text(r.title) })) } };
  }

  async save(actor: number | null, payload: Record<string, unknown>): Promise<Outcome<{ id: number }>> {
    const centreId = intOf(payload.centre_id);
    const centre = centreId ? await this.prisma.centres.findFirst({ where: { id: centreId, deleted_at: null }, select: { id: true } }) : null;
    if (!centre) return fail('Centre not found');
    const checked = validatePlanInput(payload);
    if ('error' in checked) return fail(checked.error);
    const { fee, start, end } = checked.value;
    const id = intOf(payload.id);
    const at = this.now();

    if (id) {
      const plan = await this.prisma.centre_course_plans.findFirst({ where: { id, centre_id: centreId, deleted_at: null }, select: { id: true } });
      if (!plan) return fail('Course plan not found');
      // The course of an existing plan never changes: applications already follow it.
      await this.prisma.centre_course_plans.update({
        where: { id }, data: { assigned_amount: fee, start_date: start, end_date: end, updated_by: actor, updated_at: at },
      });
      return { status: 1, message: 'Course plan updated', data: { id } };
    }

    const courseId = intOf(payload.course_id);
    const course = courseId ? await this.prisma.course.findFirst({ where: { id: courseId, deleted_at: null }, select: { id: true } }) : null;
    if (!course) return fail('Choose a course.');
    const existing = await this.prisma.centre_course_plans.findMany({
      where: { centre_id: centreId, course_id: courseId, deleted_at: null }, select: { end_date: true },
    });
    if (existing.some((p) => planIsLive(ymdOfDate(p.end_date), at.getTime()))) return fail(DUPLICATE_PLAN_MESSAGE);
    const row = await this.prisma.centre_course_plans.create({
      data: { centre_id: centreId, course_id: courseId, assigned_amount: fee, start_date: start, end_date: end, created_by: actor, created_at: at },
      select: { id: true },
    });
    return { status: 1, message: 'Course assigned', data: { id: row.id } };
  }

  async remove(actor: number | null, id: number, centreId: number): Promise<Outcome> {
    if (!id || !centreId) return fail('Course plan not found');
    const res = await this.prisma.centre_course_plans.updateMany({
      where: { id, centre_id: centreId, deleted_at: null }, data: { deleted_at: this.now(), deleted_by: actor },
    });
    return res.count > 0 ? { status: 1, message: 'Course removed' } : fail('Course plan not found');
  }
}
