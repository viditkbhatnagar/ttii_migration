import type { PrismaClient, category } from '@prisma/client';
import { getPrismaClient } from '../data/prisma-client.js';

// Programs are stored in the `category` table at top level (parent = 0/null).
// PHP LMS uses the same table for its Programs taxonomy — keeping a single
// source of truth so both LMSs stay in sync.

export type ProgramInput = {
  title: string;
  code?: string | undefined;
  level?: string | undefined;
  duration?: string | undefined;
  description?: string | undefined;
  status?: string | undefined;
};

function toIntId(id: string | number | null | undefined): number {
  if (typeof id === 'number') return id;
  if (!id) return 0;
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : 0;
}

function toNullableIntId(id: string | number | null | undefined): number | null {
  if (id === null || id === undefined || id === '') return null;
  if (typeof id === 'number') return id;
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : null;
}

function serializeProgram(row: category, courseCount: number): Record<string, unknown> {
  return {
    id: String(row.id),
    title: row.name ?? '',
    code: row.code ?? '',
    description: row.description ?? '',
    short_description: row.short_description ?? '',
    thumbnail: row.thumbnail ?? '',
    level: '',
    duration: '',
    course_count: courseCount,
    status: row.deleted_at ? 'inactive' : 'active',
    created_at: row.created_at ?? null,
  };
}

export class ProgramService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async listPrograms(): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.category.findMany({
      where: { AND: [{ OR: [{ parent: 0 }, { parent: null }] }, { deleted_at: null }] },
      orderBy: { id: 'desc' },
    });

    const ids = rows.map((r) => r.id);
    const counts = ids.length
      ? await this.prisma.course.groupBy({
          by: ['category_id'],
          where: { category_id: { in: ids }, deleted_at: null },
          _count: { id: true },
        })
      : [];

    const countMap = new Map<number, number>();
    for (const c of counts) {
      if (c.category_id != null) countMap.set(c.category_id, c._count.id);
    }

    return rows.map((r) => serializeProgram(r, countMap.get(r.id) ?? 0));
  }

  async getProgram(programId: string): Promise<Record<string, unknown> | null> {
    const id = toIntId(programId);
    if (!id) return null;
    const row = await this.prisma.category.findFirst({ where: { id, deleted_at: null } });
    if (!row) return null;
    const count = await this.prisma.course.count({ where: { category_id: id, deleted_at: null } });
    return serializeProgram(row, count);
  }

  async createProgram(actorUserId: string, input: ProgramInput): Promise<Record<string, unknown>> {
    const created = await this.prisma.category.create({
      data: {
        name: input.title,
        code: input.code ?? null,
        description: input.description ?? null,
        short_description: null,
        parent: 0,
        created_by: toNullableIntId(actorUserId),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    return serializeProgram(created, 0);
  }

  async updateProgram(actorUserId: string, programId: string, input: ProgramInput): Promise<void> {
    const id = toIntId(programId);
    if (!id) throw new Error('Invalid program id');
    await this.prisma.category.update({
      where: { id },
      data: {
        name: input.title,
        code: input.code ?? null,
        description: input.description ?? null,
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });
  }

  async deleteProgram(actorUserId: string, programId: string): Promise<void> {
    const id = toIntId(programId);
    if (!id) throw new Error('Invalid program id');
    await this.prisma.category.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: toNullableIntId(actorUserId),
      },
    });
  }

  async listProgramCourses(programId: string): Promise<Record<string, unknown>[]> {
    const id = toIntId(programId);
    if (!id) return [];
    const courses = await this.prisma.course.findMany({
      where: { category_id: id, deleted_at: null },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        title: true,
        short_name: true,
        course_code: true,
        level: true,
        thumbnail: true,
        short_description: true,
        status: true,
        duration: true,
      },
    });
    return courses.map((c) => ({
      id: String(c.id),
      title: c.title ?? '',
      short_name: c.short_name ?? '',
      course_code: c.course_code ?? '',
      level: c.level ?? '',
      thumbnail: c.thumbnail ?? '',
      short_description: c.short_description ?? '',
      status: c.status ?? '',
      duration: c.duration ?? '',
    }));
  }

  async addCourseToProgram(
    actorUserId: string,
    programId: string,
    courseId: string,
  ): Promise<Record<string, unknown>> {
    const pid = toIntId(programId);
    const cid = toIntId(courseId);
    if (!pid || !cid) throw new Error('Invalid program or course id');
    await this.prisma.course.update({
      where: { id: cid },
      data: {
        category_id: pid,
        updated_by: toNullableIntId(actorUserId),
        updated_at: new Date(),
      },
    });
    return { program_id: programId, course_id: courseId };
  }

  async removeCourseFromProgram(programId: string, courseId: string): Promise<void> {
    const pid = toIntId(programId);
    const cid = toIntId(courseId);
    if (!pid || !cid) return;
    await this.prisma.course.updateMany({
      where: { id: cid, category_id: pid },
      data: { category_id: null, updated_at: new Date() },
    });
  }

  async reorderProgramCourses(_programId: string, _courseIds: string[]): Promise<void> {
    // Ordering is not persisted — category_id is a single FK, not a pivot.
    // No-op; frontend controls display order if needed.
  }
}
