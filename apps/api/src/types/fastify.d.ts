import 'fastify';

import type { AuthContext } from '../auth/types.js';

declare module 'fastify' {
  interface FastifyRequest {
    authContext?: AuthContext;
  }
}
