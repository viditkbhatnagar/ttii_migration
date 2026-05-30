import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';

import { AuthService } from './auth/auth-service.js';
import { getPrismaClient } from './data/prisma-client.js';
import { env } from './env.js';
import { createIntegrationRegistry } from './integrations/registry.js';
import type { IntegrationRegistry } from './integrations/contracts.js';
import { registerCronJobs } from './jobs/register-cron.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerContentRoutes } from './routes/content.js';
import { registerAssessmentRoutes } from './routes/assessment.js';
import { registerCommerceRoutes } from './routes/commerce.js';
import { registerEngagementRoutes } from './routes/engagement.js';
import { registerOperationsRoutes } from './routes/operations.js';
import { registerInstructorRoutes } from './routes/instructor.js';
import { registerCertificationRoutes } from './routes/certification.js';
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
    // PHP CodeIgniter (the legacy LMS) was case-insensitive for controller
    // names, so the Flutter app sends URLs like `/api/Course/get_subjects`,
    // `/api/Profile/index`, `/api/Home/index`. Fastify's default is
    // case-sensitive, which 404s every CamelCase URL on the new API.
    // Switch to case-insensitive so the same registered lowercase route
    // (`/course/get_subjects`) matches every casing the app may send.
    //
    // (Top-level `caseSensitive` works in Fastify 5 but emits FSTDEP022; the
    // forward-compatible spelling for Fastify 6 is `routerOptions.caseSensitive`.)
    routerOptions: {
      caseSensitive: false,
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

  app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
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
    storage: integrations.storage,
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
    storage: integrations.storage,
  });

  app.register(registerProfileRoutes, {
    prefix: '/api',
    authService,
    storage: integrations.storage,
  });

  app.register(registerInstructorRoutes, {
    prefix: '/api',
    authService,
    storage: integrations.storage,
  });

  app.register(registerCertificationRoutes, {
    prefix: '/api',
    authService,
  });

  app.register(registerOperationsRoutes, {
    prefix: '/api',
    authService,
    storage: integrations.storage,
  });

  // --- Background cron jobs ---
  registerCronJobs(app, {
    prisma: getPrismaClient(),
    storage: integrations.storage,
    teamsCreds: {
      clientId: env.EMAIL_MSGRAPH_CLIENT_ID,
      clientSecret: env.EMAIL_MSGRAPH_CLIENT_SECRET,
      tenantId: env.EMAIL_MSGRAPH_TENANT_ID,
    },
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
