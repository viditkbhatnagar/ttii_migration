import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifyStatic from '@fastify/static';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    contentSecurityPolicy: false,
  });

  // --- API routes ---

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

  // --- Static file serving (production) ---
  // Serves the built Vite frontend from apps/web/dist/
  const webDistPath = path.resolve(__dirname, '../../web/dist');
  if (fs.existsSync(webDistPath)) {
    app.register(fastifyStatic, {
      root: webDistPath,
      wildcard: false,
    });

    // SPA fallback: any non-API route that doesn't match a static file → index.html
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api')) {
        return reply.status(404).send({ status: 0, message: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}
