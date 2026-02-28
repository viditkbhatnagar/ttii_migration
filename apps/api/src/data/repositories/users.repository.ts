import type { Prisma, PrismaClient, users } from '@prisma/client';

import { getPrismaClient } from '../prisma-client.js';
import { toDataLayerError } from '../errors.js';

type UsersDelegate = PrismaClient['users'];

function activeUsersWhere(where: Prisma.usersWhereInput, includeDeleted: boolean): Prisma.usersWhereInput {
  if (includeDeleted) {
    return where;
  }

  return {
    AND: [where, { deleted_at: null }],
  };
}

export class UsersRepository {
  constructor(private readonly usersModel: UsersDelegate = getPrismaClient().users) {}

  async create(data: Prisma.usersUncheckedCreateInput): Promise<users> {
    const now = new Date();
    const createData: Prisma.usersUncheckedCreateInput = {
      ...data,
      created_at: data.created_at ?? now,
      updated_at: data.updated_at ?? now,
    };

    try {
      return await this.usersModel.create({ data: createData });
    } catch (error: unknown) {
      throw toDataLayerError(error, 'users.create');
    }
  }

  async findById(id: string, includeDeleted = false): Promise<users | null> {
    try {
      return await this.usersModel.findFirst({
        where: activeUsersWhere({ id }, includeDeleted),
      });
    } catch (error: unknown) {
      throw toDataLayerError(error, 'users.findById');
    }
  }

  async count(where: Prisma.usersWhereInput = {}, includeDeleted = false): Promise<number> {
    try {
      return await this.usersModel.count({
        where: activeUsersWhere(where, includeDeleted),
      });
    } catch (error: unknown) {
      throw toDataLayerError(error, 'users.count');
    }
  }

  async update(where: Prisma.usersWhereInput, data: Prisma.usersUncheckedUpdateInput): Promise<number> {
    const updateData: Prisma.usersUncheckedUpdateInput = {
      ...data,
      updated_at: data.updated_at ?? new Date(),
    };

    try {
      const result = await this.usersModel.updateMany({
        where: activeUsersWhere(where, false),
        data: updateData,
      });
      return result.count;
    } catch (error: unknown) {
      throw toDataLayerError(error, 'users.update');
    }
  }

  async softDelete(where: Prisma.usersWhereInput, deletedBy: string | null = null): Promise<number> {
    try {
      const result = await this.usersModel.updateMany({
        where: activeUsersWhere(where, false),
        data: {
          deleted_at: new Date(),
          deleted_by: deletedBy,
        },
      });
      return result.count;
    } catch (error: unknown) {
      throw toDataLayerError(error, 'users.softDelete');
    }
  }

  async restore(id: string): Promise<boolean> {
    try {
      const result = await this.usersModel.updateMany({
        where: { id },
        data: {
          deleted_at: null,
          deleted_by: null,
        },
      });
      return result.count > 0;
    } catch (error: unknown) {
      throw toDataLayerError(error, 'users.restore');
    }
  }
}
