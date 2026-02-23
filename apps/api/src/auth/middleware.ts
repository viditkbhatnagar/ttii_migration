import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';

import type { AuthService } from './auth-service.js';
import type { RequestMeta } from './types.js';

function toRequestMeta(request: FastifyRequest): RequestMeta {
  return {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}

function requestPath(request: FastifyRequest): string {
  return request.routeOptions.url ?? request.url;
}

function unauthorizedPayload(message = 'User not authenticated!'): { status: false; message: string; data: [] } {
  return {
    status: false,
    message,
    data: [],
  };
}

export function extractAuthToken(request: FastifyRequest): string | null {
  const query = request.query as { auth_token?: unknown };
  if (typeof query.auth_token === 'string' && query.auth_token.trim() !== '') {
    return query.auth_token.trim();
  }

  if (request.body && typeof request.body === 'object') {
    const bodyToken = (request.body as { auth_token?: unknown }).auth_token;
    if (typeof bodyToken === 'string' && bodyToken.trim() !== '') {
      return bodyToken.trim();
    }
  }

  const authorization = request.headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length).trim();
    if (token !== '') {
      return token;
    }
  }

  return null;
}

export function requireLegacyAuth(authService: AuthService): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const token = extractAuthToken(request);
    const requestMeta = toRequestMeta(request);

    if (!token) {
      await authService.logAuthDenied({
        requestMeta,
        path: requestPath(request),
        reason: 'missing_auth_token',
      });

      reply.code(401).send(unauthorizedPayload());
      return;
    }

    const authContext = await authService.authenticateAuthToken(token);
    if (!authContext) {
      await authService.logAuthDenied({
        requestMeta,
        path: requestPath(request),
        reason: 'invalid_or_expired_auth_token',
      });

      reply.code(401).send(unauthorizedPayload());
      return;
    }

    request.authContext = authContext;
  };
}

export function requireLegacyRoles(
  authService: AuthService,
  allowedRoles: readonly number[],
): preHandlerAsyncHookHandler {
  const allowedSet = new Set<number>(allowedRoles);

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authContext = request.authContext;

    if (!authContext) {
      reply.code(401).send(unauthorizedPayload());
      return;
    }

    const roleId = authContext.user.role_id;
    if (roleId === null || !allowedSet.has(roleId)) {
      await authService.logRbacDenied({
        userId: authContext.user.id,
        requiredRoles: allowedRoles,
        requestMeta: toRequestMeta(request),
        path: requestPath(request),
      });

      reply.code(403).send({
        status: false,
        message: 'Access denied.',
        data: [],
      });
      return;
    }
  };
}
