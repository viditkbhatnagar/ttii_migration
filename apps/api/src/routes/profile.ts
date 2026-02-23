import { Prisma } from '@prisma/client';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { requireLegacyAuth } from '../auth/middleware.js';
import { hashPassword } from '../auth/password.js';
import { getPrismaClient } from '../data/prisma-client.js';

interface RegisterProfileRoutesOptions {
  authService?: AuthService;
  [key: string]: unknown;
}

function toStringValue(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function requestPayload(request: FastifyRequest): Record<string, unknown> {
  if (request.method === 'GET') {
    return (request.query as Record<string, unknown>) ?? {};
  }

  if (request.body && typeof request.body === 'object') {
    return request.body as Record<string, unknown>;
  }

  return {};
}

function requestUserId(request: FastifyRequest): number {
  return request.authContext?.user.id ?? 0;
}

function sendProfileError(reply: FastifyReply, error: unknown): void {
  const message = error instanceof Error ? error.message : 'Internal profile error.';

  reply.code(500).send({
    status: 0,
    message,
    data: {},
  });
}

function normalizeProfileRow(row: Record<string, unknown> | null): Record<string, unknown> {
  if (!row) {
    return {};
  }

  return {
    id: row.id,
    student_id: row.student_id,
    name: row.name,
    email: row.email,
    user_email: row.user_email,
    phone: row.phone,
    country_code: row.country_code,
    role_id: row.role_id,
    course_id: row.course_id,
    image: row.image,
    academic_year: row.academic_year,
  };
}

export function registerProfileRoutes(app: FastifyInstance, options: RegisterProfileRoutesOptions = {}): void {
  const authService = options.authService ?? new AuthService();
  const requireAuth = requireLegacyAuth(authService);
  const prisma = getPrismaClient();

  const readProfile = async (userId: number): Promise<Record<string, unknown> | null> => {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        id,
        student_id,
        name,
        email,
        user_email,
        phone,
        country_code,
        role_id,
        course_id,
        image,
        academic_year
      FROM users
      WHERE id = ${userId}
        AND deleted_at IS NULL
      LIMIT 1
    `);

    return rows[0] ?? null;
  };

  app.get('/profile/index', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = requestUserId(request);
      const profile = await readProfile(userId);

      reply.code(200).send({
        status: 1,
        message: 'success',
        data: normalizeProfileRow(profile),
      });
    } catch (error: unknown) {
      sendProfileError(reply, error);
    }
  });

  app.post('/profile/update', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = requestUserId(request);
      const payload = requestPayload(request);
      const now = new Date().toISOString();

      await prisma.$executeRaw(Prisma.sql`
        UPDATE users
        SET
          name = ${toStringValue(payload.name)},
          email = ${toStringValue(payload.email)},
          user_email = ${toStringValue(payload.user_email) || toStringValue(payload.email)},
          phone = ${toStringValue(payload.phone)},
          country_code = ${toStringValue(payload.country_code)},
          academic_year = ${toStringValue(payload.academic_year)},
          image = CASE WHEN ${toStringValue(payload.image)} = '' THEN image ELSE ${toStringValue(payload.image)} END,
          updated_by = ${userId},
          updated_at = ${now}
        WHERE id = ${userId}
          AND deleted_at IS NULL
      `);

      const profile = await readProfile(userId);

      reply.code(200).send({
        status: 1,
        message: 'Profile updated successfully',
        data: normalizeProfileRow(profile),
      });
    } catch (error: unknown) {
      sendProfileError(reply, error);
    }
  });

  app.post('/profile/update_user_image', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = requestUserId(request);
      const payload = requestPayload(request);
      const now = new Date().toISOString();
      const image = toStringValue(payload.image);

      if (image === '') {
        reply.code(200).send({
          status: 0,
          message: 'Image is required',
          data: {},
        });
        return;
      }

      await prisma.$executeRaw(Prisma.sql`
        UPDATE users
        SET image = ${image},
            updated_by = ${userId},
            updated_at = ${now}
        WHERE id = ${userId}
          AND deleted_at IS NULL
      `);

      const profile = await readProfile(userId);

      reply.code(200).send({
        status: 1,
        message: 'Profile image updated successfully',
        data: normalizeProfileRow(profile),
      });
    } catch (error: unknown) {
      sendProfileError(reply, error);
    }
  });

  app.post('/profile/change_password', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = requestUserId(request);
      const payload = requestPayload(request);
      const password = toStringValue(payload.password);
      const confirmPassword = toStringValue(payload.confirm_password);

      if (password === '' || confirmPassword === '') {
        reply.code(200).send({
          status: 0,
          message: 'Password and confirm password are required.',
          data: {},
        });
        return;
      }

      if (password !== confirmPassword) {
        reply.code(200).send({
          status: 0,
          message: 'Password and confirm password must match.',
          data: {},
        });
        return;
      }

      const passwordHash = await hashPassword(password);
      const now = new Date().toISOString();

      await prisma.$executeRaw(Prisma.sql`
        UPDATE users
        SET password = ${passwordHash},
            updated_by = ${userId},
            updated_at = ${now}
        WHERE id = ${userId}
          AND deleted_at IS NULL
      `);

      reply.code(200).send({
        status: 1,
        message: 'Password changed successfully',
        data: {},
      });
    } catch (error: unknown) {
      sendProfileError(reply, error);
    }
  });
}
