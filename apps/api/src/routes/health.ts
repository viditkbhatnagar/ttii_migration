import type { FastifyInstance } from 'fastify';

interface ApiHealthPayload {
  status: 'ok';
  service: 'api';
  timestamp: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export function registerHealthRoutes(app: FastifyInstance): void {
  app.get('/health', (): ApiEnvelope<ApiHealthPayload> => {
    return {
      data: {
        status: 'ok',
        service: 'api',
        timestamp: new Date().toISOString(),
      },
    };
  });
}
