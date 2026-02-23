import type { enrol, Prisma, PrismaClient } from '@prisma/client';

import { getPrismaClient } from '../prisma-client.js';
import { toDataLayerError } from '../errors.js';

type EnrolDelegate = PrismaClient['enrol'];

function activeEnrolWhere(where: Prisma.enrolWhereInput, includeDeleted: boolean): Prisma.enrolWhereInput {
  if (includeDeleted) {
    return where;
  }

  return {
    AND: [where, { deleted_at: null }],
  };
}

export class EnrolRepository {
  constructor(private readonly enrolModel: EnrolDelegate = getPrismaClient().enrol) {}

  async create(data: Prisma.enrolUncheckedCreateInput): Promise<enrol> {
    const now = new Date();

    try {
      return await this.enrolModel.create({
        data: {
          ...data,
          created_at: data.created_at ?? now,
          updated_at: data.updated_at ?? now,
        },
      });
    } catch (error: unknown) {
      throw toDataLayerError(error, 'enrol.create');
    }
  }

  async isUserEnrolled(userId: number, courseId: number): Promise<boolean> {
    try {
      const count = await this.enrolModel.count({
        where: activeEnrolWhere(
          {
            user_id: userId,
            course_id: courseId,
          },
          false,
        ),
      });

      return count > 0;
    } catch (error: unknown) {
      throw toDataLayerError(error, 'enrol.isUserEnrolled');
    }
  }

  async listUserEnrollments(userId: number, includeDeleted = false): Promise<enrol[]> {
    try {
      return await this.enrolModel.findMany({
        where: activeEnrolWhere(
          {
            user_id: userId,
          },
          includeDeleted,
        ),
        orderBy: {
          id: 'asc',
        },
      });
    } catch (error: unknown) {
      throw toDataLayerError(error, 'enrol.listUserEnrollments');
    }
  }

  async softDeleteByUserAndCourse(userId: number, courseId: number, deletedBy: number | null = null): Promise<number> {
    try {
      const result = await this.enrolModel.updateMany({
        where: activeEnrolWhere(
          {
            user_id: userId,
            course_id: courseId,
          },
          false,
        ),
        data: {
          deleted_at: new Date(),
          deleted_by: deletedBy,
        },
      });

      return result.count;
    } catch (error: unknown) {
      throw toDataLayerError(error, 'enrol.softDeleteByUserAndCourse');
    }
  }
}
