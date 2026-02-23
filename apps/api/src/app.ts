import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import Fastify from 'fastify';

import { AuthService } from './auth/auth-service.js';
import { createIntegrationRegistry } from './integrations/registry.js';
import type { IntegrationRegistry } from './integrations/contracts.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerContentRoutes } from './routes/content.js';
import { registerAssessmentRoutes } from './routes/assessment.js';
import { registerCommerceRoutes } from './routes/commerce.js';
import { registerEngagementRoutes } from './routes/engagement.js';
import { registerOperationsRoutes } from './routes/operations.js';
import { registerProfileRoutes } from './routes/profile.js';

export interface BuildAppOptions {
  integrations?: IntegrationRegistry;
  authService?: AuthService;
}

export function buildApp(options: BuildAppOptions = {}) {
  const integrations = options.integrations ?? createIntegrationRegistry();
  const authService = options.authService ?? new AuthService({ integrations });

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

  app.register(registerAuthRoutes, {
    prefix: '/api',
    authService,
  });

  app.register(registerContentRoutes, {
    prefix: '/api',
    authService,
  });

  app.register(registerAssessmentRoutes, {
    prefix: '/api',
    authService,
  });

  app.register(registerCommerceRoutes, {
    prefix: '/api',
    authService,
    integrations: {
      payment: integrations.payment,
    },
  });

  app.register(registerEngagementRoutes, {
    prefix: '/api',
    authService,
  });

  app.register(registerProfileRoutes, {
    prefix: '/api',
    authService,
  });

  app.register(registerOperationsRoutes, {
    prefix: '/api',
    authService,
  });

  return app;
}
