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

function requestUserId(request: FastifyRequest): string {
  return request.authContext?.user.id ?? '';
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

  const readProfile = async (userId: string): Promise<Record<string, unknown> | null> => {
    const user = await prisma.users.findFirst({
      where: {
        id: userId,
        deleted_at: null,
      },
      select: {
        id: true,
        student_id: true,
        name: true,
        email: true,
        user_email: true,
        phone: true,
        country_code: true,
        role_id: true,
        course_id: true,
        image: true,
        academic_year: true,
      },
    });

    return user ?? null;
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
      const now = new Date();

      const imageValue = toStringValue(payload.image);

      // If image is empty, we need to preserve the existing value.
      // Fetch current image first when needed.
      let imageToSet: string | undefined;
      if (imageValue !== '') {
        imageToSet = imageValue;
      }

      await prisma.users.updateMany({
        where: {
          id: userId,
          deleted_at: null,
        },
        data: {
          name: toStringValue(payload.name),
          email: toStringValue(payload.email),
          user_email: toStringValue(payload.user_email) || toStringValue(payload.email),
          phone: toStringValue(payload.phone),
          country_code: toStringValue(payload.country_code),
          academic_year: toStringValue(payload.academic_year),
          ...(imageToSet !== undefined ? { image: imageToSet } : {}),
          updated_by: userId,
          updated_at: now,
        },
      });

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
      const now = new Date();
      const image = toStringValue(payload.image);

      if (image === '') {
        reply.code(200).send({
          status: 0,
          message: 'Image is required',
          data: {},
        });
        return;
      }

      await prisma.users.updateMany({
        where: {
          id: userId,
          deleted_at: null,
        },
        data: {
          image,
          updated_by: userId,
          updated_at: now,
        },
      });

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
      const now = new Date();

      await prisma.users.updateMany({
        where: {
          id: userId,
          deleted_at: null,
        },
        data: {
          password: passwordHash,
          updated_by: userId,
          updated_at: now,
        },
      });

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
