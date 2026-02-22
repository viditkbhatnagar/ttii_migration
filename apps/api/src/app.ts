import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';

import { registerHealthRoutes } from './routes/health.js';

export function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.register(helmet, {
    global: true,
  });

  app.register(registerHealthRoutes, {
    prefix: '/api',
  });

  return app;
}
