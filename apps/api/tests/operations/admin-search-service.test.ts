import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import {
  ADMIN_SEARCH_COURSE_LIMIT,
  ADMIN_SEARCH_STUDENT_LIMIT,
  AdminSearchService,
  normaliseAdminSearchQuery,
} from '../../src/operations/admin-search-service.js';

// Navbar global search (Naji's admin shell): a few light student + course rows.

interface Call { model: string; args: Record<string, unknown> }

function stubPrisma(rows: { users?: unknown[]; courses?: unknown[]; studentCourses?: unknown[] }) {
  const calls: Call[] = [];
  const prisma = {
    users: {
      findMany: (args: Record<string, unknown>) => {
        calls.push({ model: 'users', args });
        return Promise.resolve(rows.users ?? []);
      },
    },
    course: {
      findMany: (args: Record<string, unknown>) => {
        calls.push({ model: 'course', args });
        const where = args.where as Record<string, unknown>;
        return Promise.resolve('id' in where ? rows.studentCourses ?? [] : rows.courses ?? []);
      },
    },
  };
  return { prisma: prisma as unknown as PrismaClient, calls };
}

describe('normaliseAdminSearchQuery', () => {
  test('trims and refuses anything shorter than two characters', () => {
    expect(normaliseAdminSearchQuery('  a ')).toBe('');
    expect(normaliseAdminSearchQuery('  an ')).toBe('an');
  });

  test('caps a pasted essay at 80 characters', () => {
    expect(normaliseAdminSearchQuery('x'.repeat(200))).toHaveLength(80);
  });
});

describe('AdminSearchService.search', () => {
  test('a too-short query does not touch the database', async () => {
    const { prisma, calls } = stubPrisma({});
    const result = await new AdminSearchService(prisma).search('a');
    expect(result).toEqual({ students: [], courses: [] });
    expect(calls).toHaveLength(0);
  });

  test('searches live students (role 2) and live courses, each capped', async () => {
    const { prisma, calls } = stubPrisma({});
    await new AdminSearchService(prisma).search('ananya');

    const users = calls.find((c) => c.model === 'users')!.args;
    expect(users.take).toBe(ADMIN_SEARCH_STUDENT_LIMIT);
    expect(users.where).toMatchObject({ deleted_at: null, role_id: 2 });
    expect((users.where as { OR: unknown[] }).OR).toContainEqual({ student_id: { contains: 'ananya' } });

    const courses = calls.find((c) => c.model === 'course')!.args;
    expect(courses.take).toBe(ADMIN_SEARCH_COURSE_LIMIT);
    expect(courses.where).toMatchObject({ deleted_at: null });
  });

  test('labels each student with their course title and a usable contact', async () => {
    const { prisma } = stubPrisma({
      users: [
        { id: 7, name: 'Ananya Sharma', student_id: 'TTS0058', user_email: '', email: '9876543210', phone: '9876543210', course_id: 16 },
        { id: 8, name: null, student_id: null, user_email: 'x@y.in', email: null, phone: null, course_id: null },
      ],
      courses: [{ id: 16, title: 'Montessori Diploma', course_code: 'MD' }],
      studentCourses: [{ id: 16, title: 'Montessori Diploma' }],
    });

    const result = await new AdminSearchService(prisma).search('an');

    expect(result.students).toEqual([
      { id: 7, name: 'Ananya Sharma', studentId: 'TTS0058', contact: '9876543210', course: 'Montessori Diploma' },
      { id: 8, name: 'Unnamed student', studentId: '', contact: 'x@y.in', course: '' },
    ]);
    expect(result.courses).toEqual([{ id: 16, title: 'Montessori Diploma', code: 'MD' }]);
  });
});
