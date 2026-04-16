import type { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../data/prisma-client.js';

// Programs are not present in the production MySQL schema.
// The service is retained as a stub for Session 06 route wiring;
// all methods return empty results or no-op until a decision is made
// on whether to add program tables to production.

export type ProgramInput = {
  title: string;
  code?: string | undefined;
  level?: string | undefined;
  duration?: string | undefined;
  description?: string | undefined;
  status?: string | undefined;
};

export class ProgramService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  listPrograms(): Promise<Record<string, unknown>[]> {
    return Promise.resolve([]);
  }

  getProgram(_programId: string): Promise<Record<string, unknown> | null> {
    return Promise.resolve(null);
  }

  createProgram(_actorUserId: string, _input: ProgramInput): Promise<Record<string, unknown>> {
    return Promise.reject(new Error('programs table not present in MySQL schema'));
  }

  updateProgram(_actorUserId: string, _programId: string, _input: ProgramInput): Promise<void> {
    return Promise.reject(new Error('programs table not present in MySQL schema'));
  }

  deleteProgram(_actorUserId: string, _programId: string): Promise<void> {
    return Promise.reject(new Error('programs table not present in MySQL schema'));
  }

  listProgramCourses(_programId: string): Promise<Record<string, unknown>[]> {
    return Promise.resolve([]);
  }

  addCourseToProgram(
    _actorUserId: string,
    _programId: string,
    _courseId: string,
  ): Promise<Record<string, unknown>> {
    return Promise.reject(new Error('program_courses table not present in MySQL schema'));
  }

  removeCourseFromProgram(_programId: string, _courseId: string): Promise<void> {
    return Promise.reject(new Error('program_courses table not present in MySQL schema'));
  }

  reorderProgramCourses(_programId: string, _courseIds: string[]): Promise<void> {
    return Promise.reject(new Error('program_courses table not present in MySQL schema'));
  }
}
