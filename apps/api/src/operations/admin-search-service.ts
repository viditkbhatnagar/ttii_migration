import type { PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../data/prisma-client.js';

// Navbar global search (TTII 2026-10-12, Naji's admin shell). The search box
// in his Navbar finds pages, students and courses as you type. Pages come from
// the sidebar menu on the client; this service answers the Students and Courses
// groups with a handful of light rows — the Students list endpoint is far too
// heavy (fees, progress, enrolments for every match) to call per keystroke.

export const ADMIN_SEARCH_MIN_LENGTH = 2;
export const ADMIN_SEARCH_MAX_LENGTH = 80;
export const ADMIN_SEARCH_STUDENT_LIMIT = 5;
export const ADMIN_SEARCH_COURSE_LIMIT = 4;

export interface AdminSearchStudent {
  id: number;
  name: string;
  studentId: string;
  contact: string;
  course: string;
}

export interface AdminSearchCourse {
  id: number;
  title: string;
  code: string;
}

export interface AdminSearchResult {
  students: AdminSearchStudent[];
  courses: AdminSearchCourse[];
}

const EMPTY: AdminSearchResult = { students: [], courses: [] };

/** Trim and cap the query; anything shorter than the minimum searches nothing. */
export function normaliseAdminSearchQuery(raw: string): string {
  const q = raw.trim().slice(0, ADMIN_SEARCH_MAX_LENGTH).trim();
  return q.length >= ADMIN_SEARCH_MIN_LENGTH ? q : '';
}

function text(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

export class AdminSearchService {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async search(raw: string): Promise<AdminSearchResult> {
    const q = normaliseAdminSearchQuery(raw);
    if (!q) return EMPTY;

    const [users, courses] = await Promise.all([
      this.prisma.users.findMany({
        where: {
          deleted_at: null,
          role_id: 2,
          OR: [
            { name: { contains: q } },
            { user_email: { contains: q } },
            { phone: { contains: q } },
            { student_id: { contains: q } },
          ],
        },
        select: { id: true, name: true, student_id: true, user_email: true, email: true, phone: true, course_id: true },
        orderBy: { id: 'desc' },
        take: ADMIN_SEARCH_STUDENT_LIMIT,
      }),
      this.prisma.course.findMany({
        where: {
          deleted_at: null,
          OR: [
            { title: { contains: q } },
            { course_code: { contains: q } },
            { short_name: { contains: q } },
          ],
        },
        select: { id: true, title: true, course_code: true },
        orderBy: { id: 'desc' },
        take: ADMIN_SEARCH_COURSE_LIMIT,
      }),
    ]);

    const studentCourseIds = [...new Set(
      users.map((u) => u.course_id).filter((id): id is number => typeof id === 'number' && id > 0),
    )];
    const studentCourses = studentCourseIds.length > 0
      ? await this.prisma.course.findMany({ where: { id: { in: studentCourseIds } }, select: { id: true, title: true } })
      : [];
    const courseTitle = new Map(studentCourses.map((c) => [c.id, text(c.title)]));

    return {
      students: users.map((u) => ({
        id: u.id,
        name: text(u.name) || 'Unnamed student',
        studentId: text(u.student_id),
        // users.email sometimes holds a phone number; prefer user_email.
        contact: text(u.user_email) || text(u.phone) || text(u.email),
        course: (u.course_id ? courseTitle.get(u.course_id) : '') ?? '',
      })),
      courses: courses.map((c) => ({ id: c.id, title: text(c.title) || `Course ${c.id}`, code: text(c.course_code) })),
    };
  }
}
