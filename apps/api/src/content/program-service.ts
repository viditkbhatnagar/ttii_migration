import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../data/prisma-client.js';

export type ProgramInput = {
  title: string;
  code?: string | undefined;
  level?: string | undefined;
  duration?: string | undefined;
  description?: string | undefined;
  status?: string | undefined;
};

function requireId(value: string, name: string): void {
  if (!value || !value.trim()) throw new Error(`${name} is required`);
}

export class ProgramService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  // ── Program CRUD ─────────────────────────────────────────────────

  async listPrograms(): Promise<Record<string, unknown>[]> {
    const programs = await this.prisma.program.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
    });

    const programIds = programs.map((p) => p.id);

    // Batch counts: courses per program
    const courseCounts = programIds.length > 0
      ? await this.prisma.program_courses.groupBy({
          by: ['program_id'],
          where: { program_id: { in: programIds }, deleted_at: null },
          _count: { id: true },
        })
      : [];
    const courseCountMap = new Map(courseCounts.map((c) => [c.program_id, c._count.id]));

    return programs.map((p) => ({
      id: p.id,
      title: p.title,
      code: p.code ?? '',
      level: p.level ?? '',
      duration: p.duration ?? '',
      description: p.description ?? '',
      status: p.status ?? 'active',
      course_count: courseCountMap.get(p.id) ?? 0,
      created_at: p.created_at?.toISOString() ?? '',
    }));
  }

  async getProgram(programId: string): Promise<Record<string, unknown> | null> {
    requireId(programId, 'programId');
    const program = await this.prisma.program.findFirst({
      where: { id: programId, deleted_at: null },
    });
    if (!program) return null;

    return {
      id: program.id,
      title: program.title,
      code: program.code ?? '',
      level: program.level ?? '',
      duration: program.duration ?? '',
      description: program.description ?? '',
      status: program.status ?? 'active',
      thumbnail: program.thumbnail ?? '',
      created_at: program.created_at?.toISOString() ?? '',
    };
  }

  async createProgram(actorUserId: string, input: ProgramInput): Promise<Record<string, unknown>> {
    const program = await this.prisma.program.create({
      data: {
        title: input.title,
        code: input.code ?? null,
        level: input.level ?? null,
        duration: input.duration ?? null,
        description: input.description ?? null,
        status: input.status ?? 'active',
        created_by: actorUserId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    return { id: program.id };
  }

  async updateProgram(actorUserId: string, programId: string, input: ProgramInput): Promise<void> {
    requireId(programId, 'programId');
    await this.prisma.program.update({
      where: { id: programId },
      data: {
        title: input.title,
        code: input.code ?? null,
        level: input.level ?? null,
        duration: input.duration ?? null,
        description: input.description ?? null,
        ...(input.status ? { status: input.status } : {}),
        updated_by: actorUserId,
        updated_at: new Date(),
      },
    });
  }

  async deleteProgram(actorUserId: string, programId: string): Promise<void> {
    requireId(programId, 'programId');
    await this.prisma.program.update({
      where: { id: programId },
      data: {
        deleted_by: actorUserId,
        deleted_at: new Date(),
      },
    });
  }

  // ── Program ↔ Course Mappings ────────────────────────────────────

  async listProgramCourses(programId: string): Promise<Record<string, unknown>[]> {
    const junctions = await this.prisma.program_courses.findMany({
      where: { program_id: programId, deleted_at: null },
      orderBy: { order: 'asc' },
    });

    if (junctions.length === 0) return [];

    const courseIds = junctions.map((j) => j.course_id);
    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds }, deleted_at: null },
    });
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    return junctions
      .map((j) => {
        const course = courseMap.get(j.course_id);
        if (!course) return null;
        return {
          id: course.id,
          title: course.title,
          short_name: course.short_name ?? '',
          status: course.status ?? 'active',
          duration: course.duration ?? '',
          order: j.order,
          is_elective: j.is_elective,
          junction_id: j.id,
        };
      })
      .filter(Boolean) as Record<string, unknown>[];
  }

  async addCourseToProgram(actorUserId: string, programId: string, courseId: string): Promise<Record<string, unknown>> {
    // Check if already linked
    const existing = await this.prisma.program_courses.findFirst({
      where: { program_id: programId, course_id: courseId, deleted_at: null },
    });
    if (existing) return { id: existing.id, already_linked: true };

    // Get next order
    const last = await this.prisma.program_courses.findMany({
      where: { program_id: programId, deleted_at: null },
      select: { order: true },
      orderBy: { order: 'desc' },
      take: 1,
    });
    const nextOrder = (last[0]?.order ?? 0) + 1;

    const junction = await this.prisma.program_courses.create({
      data: {
        program_id: programId,
        course_id: courseId,
        order: nextOrder,
        created_by: actorUserId,
        created_at: new Date(),
        deleted_at: null,
      },
    });

    return { id: junction.id };
  }

  async removeCourseFromProgram(programId: string, courseId: string): Promise<void> {
    const junction = await this.prisma.program_courses.findFirst({
      where: { program_id: programId, course_id: courseId, deleted_at: null },
    });
    if (junction) {
      await this.prisma.program_courses.update({
        where: { id: junction.id },
        data: { deleted_at: new Date() },
      });
    }
  }

  async reorderProgramCourses(programId: string, courseIds: string[]): Promise<void> {
    const updates = courseIds.map((courseId, index) =>
      this.prisma.program_courses.updateMany({
        where: { program_id: programId, course_id: courseId, deleted_at: null },
        data: { order: index + 1 },
      }),
    );
    await this.prisma.$transaction(updates);
  }
}
