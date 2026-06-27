import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth-service.js';
import { buildLegacyUserData } from '../auth/legacy-user-data.js';
import { extractAuthToken, requireLegacyAuth } from '../auth/middleware.js';
import { hashPassword } from '../auth/password.js';
import { sha256Hex } from '../auth/session-token.js';
import { getPrismaClient } from '../data/prisma-client.js';
import { toLegacyFileUrl } from '../data/legacy-asset-url.js';
import type { StorageProvider } from '../integrations/contracts.js';

interface RegisterProfileRoutesOptions {
  authService?: AuthService;
  storage?: StorageProvider;
  [key: string]: unknown;
}

function toStringValue(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function toIntId(id: string | number | null | undefined): number {
  if (typeof id === 'number') return id;
  if (!id) return 0;
  const n = parseInt(String(id), 10);
  return Number.isFinite(n) ? n : 0;
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
  const id = request.authContext?.user.id;
  return id !== undefined && id !== null ? String(id) : '';
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

  // Web/admin consumers (newer) — keep the camel/snake-mixed shape.
  const rawImage =
    typeof row.profile_picture === 'string' && row.profile_picture
      ? row.profile_picture
      : typeof row.image === 'string'
        ? row.image
        : '';

  // Null-safe every field: Flutter models are non-nullable, so a null
  // (sparse profile — no place / academic_year / etc.) crashes "Null is not a
  // subtype of String". Strings default to '', ids to 0. Web/admin keep working
  // ('' and 0 stay falsy like null).
  return {
    id: row.id ?? 0,
    student_id: row.student_id ?? '',
    name: row.name ?? '',
    email: row.email ?? '',
    user_email: row.user_email ?? '',
    phone: row.phone ?? '',
    country_code: row.country_code ?? '',
    role_id: row.role_id ?? 0,
    course_id: row.course_id ?? 0,
    image: rawImage,
    user_image: toLegacyFileUrl(rawImage),
    profile_picture: toLegacyFileUrl(rawImage),
    academic_year: row.academic_year ?? '',
    username: row.username ?? '',
    date_of_birth: row.dob ?? '',
    gender: row.gender ?? '',
    place: row.place ?? '',
    pincode: row.pin_code ?? '',
  };
}


export function registerProfileRoutes(app: FastifyInstance, options: RegisterProfileRoutesOptions = {}): void {
  const authService = options.authService ?? new AuthService();
  const requireAuth = requireLegacyAuth(authService);
  const prisma = getPrismaClient();

  const readProfile = async (userId: string): Promise<Record<string, unknown> | null> => {
    const user = await prisma.users.findFirst({
      where: {
        id: toIntId(userId),
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
        profile_picture: true,
        academic_year: true,
        username: true,
        dob: true,
        gender: true,
        place: true,
        pin_code: true,
        // Ansaba UAT 2026-05-26 — mobile-app payload needs these too.
        device_id: true,
        status: true,
      },
    });

    return user ?? null;
  };

  // Full login history for the Settings page. Each successful login creates an
  // `auth_session` row (see AuthService.createSession), so that table IS the
  // real per-login history — `created_at` is the login time, `ip_address` /
  // `user_agent` are captured from the request. Newest first, capped at 50.
  // `current` flags the session matching the caller's own token. All
  // DateTime columns here are real (no '0000-00-00' zero-date hazard).
  const LOGIN_HISTORY_LIMIT = 50;

  const readLoginHistory = async (
    userId: string,
    currentTokenHash: string | null,
  ): Promise<Record<string, unknown>[]> => {
    const userIdInt = toIntId(userId);
    if (userIdInt <= 0) {
      return [];
    }

    const sessions = await prisma.auth_session.findMany({
      where: { user_id: userIdInt },
      orderBy: { created_at: 'desc' },
      take: LOGIN_HISTORY_LIMIT,
      select: {
        created_at: true,
        ip_address: true,
        user_agent: true,
        expires_at: true,
        revoked_at: true,
        token_hash: true,
      },
    });

    return sessions.map((s) => ({
      at: s.created_at ? s.created_at.toISOString() : '',
      ip: s.ip_address ?? '',
      device: s.user_agent ?? '',
      user_agent: s.user_agent ?? '',
      expires_at: s.expires_at ? s.expires_at.toISOString() : '',
      revoked_at: s.revoked_at ? s.revoked_at.toISOString() : null,
      current: currentTokenHash !== null && s.token_hash === currentTokenHash,
    }));
  };

  app.get('/profile/index', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const userId = requestUserId(request);
      const profile = await readProfile(userId);
      const normalized = normalizeProfileRow(profile);

      // Ansaba UAT 2026-05-26 — Flutter mobile app reads the profile
      // payload as `data["user_data"]["user_image"]`, `["user_name"]`,
      // etc. The PHP LMS at lms.teachersindia.in/api/profile/index also
      // surfaces `call_us` and `whatsapp` sibling fields (both default
      // to the user's phone number). Surface the legacy shape AS WELL
      // AS the flat normalised fields so any newer web/admin caller
      // that already reads from data.* keeps working.
      const sessionToken = extractAuthToken(request) ?? '';
      const userData = buildLegacyUserData(profile, sessionToken);
      const phone = typeof userData.user_phone === 'string' ? userData.user_phone : '';
      // Real login history (auth_session rows), newest first, capped at 50.
      // The current session is flagged via the caller's own token hash.
      const currentTokenHash = sessionToken ? sha256Hex(sessionToken) : null;
      const loginHistory = await readLoginHistory(userId, currentTokenHash);
      reply.code(200).send({
        status: 1,
        message: 'success',
        data: {
          ...normalized,
          user_data: userData,
          user: userData,
          call_us: phone,
          whatsapp: phone,
          login_history: loginHistory,
          loginHistory,
        },
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

      let imageToSet: string | undefined;
      if (imageValue !== '') {
        imageToSet = imageValue;
      }

      const dobValue = toStringValue(payload.date_of_birth);
      const dateOfBirth = dobValue !== '' ? new Date(dobValue) : undefined;

      await prisma.users.updateMany({
        where: {
          id: toIntId(userId),
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
          ...(dateOfBirth !== undefined && !Number.isNaN(dateOfBirth.getTime()) ? { dob: dateOfBirth } : {}),
          ...(payload.gender !== undefined ? { gender: toStringValue(payload.gender) } : {}),
          ...(payload.place !== undefined ? { place: toStringValue(payload.place) } : {}),
          ...(payload.pincode !== undefined ? { pin_code: toStringValue(payload.pincode) } : {}),
          updated_by: toIntId(userId),
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
          id: toIntId(userId),
          deleted_at: null,
        },
        data: {
          image,
          updated_by: toIntId(userId),
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

  // Multipart photo upload for the signed-in user. The auth token rides
  // on the URL query (?auth_token=…) because @fastify/multipart isn't
  // configured with attachFieldsToBody, so the middleware can't see body
  // fields on multipart requests. Same trick the admin uploadFile uses.
  // Uploaded photos are public-read so the <img> in the avatar can fetch
  // them without a signed URL on every page render.
  app.post('/profile/upload_image', { preHandler: [requireAuth] }, async (request, reply) => {
    const storage = options.storage;
    if (!storage) {
      reply.code(500).send({ status: 0, message: 'Storage not configured', data: {} });
      return;
    }
    try {
      const file = await request.file();
      if (!file) {
        reply.code(400).send({ status: 0, message: 'No file provided', data: {} });
        return;
      }
      if (!file.mimetype.startsWith('image/')) {
        reply.code(400).send({ status: 0, message: 'Only image files are allowed', data: {} });
        return;
      }
      const ext = (file.filename.split('.').pop() ?? 'bin').toLowerCase();
      const userId = requestUserId(request);
      const key = `public/profile-photos/${userId || 'anon'}-${Date.now()}.${ext}`;
      const chunks: Buffer[] = [];
      for await (const chunk of file.file) {
        chunks.push(Buffer.from(chunk as Uint8Array));
      }
      const body = Buffer.concat(chunks);
      const result = await storage.uploadObject({
        key,
        body,
        contentType: file.mimetype,
        cacheControl: 'public, max-age=31536000, immutable',
        publicRead: true,
      });

      await prisma.users.updateMany({
        where: { id: toIntId(userId), deleted_at: null },
        data: {
          image: result.location,
          updated_by: toIntId(userId),
          updated_at: new Date(),
        },
      });

      reply.code(200).send({
        status: 1,
        message: 'Profile photo updated',
        data: { key: result.key, url: result.location },
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
          id: toIntId(userId),
          deleted_at: null,
        },
        data: {
          password: passwordHash,
          updated_by: toIntId(userId),
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
