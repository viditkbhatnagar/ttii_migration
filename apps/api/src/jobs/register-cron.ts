import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

import type { StorageProvider } from '../integrations/contracts.js';
import { syncPendingTeamsArtifacts } from './teams-artifacts-sync.js';

export interface CronJobsDeps {
  prisma: PrismaClient;
  storage: StorageProvider;
  teamsCreds: {
    clientId: string | undefined;
    clientSecret: string | undefined;
    tenantId: string | undefined;
  };
  /** Interval between runs (ms). Default 5 minutes. */
  intervalMs?: number;
  /** Delay before the first run after app ready (ms). Default 30 seconds. */
  startupDelayMs?: number;
}

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_STARTUP_DELAY_MS = 30 * 1000;

/**
 * Registers background cron jobs on app startup. Currently just the Teams
 * artifacts sync (recordings + attendance). Cleans up on app close so tests
 * and hot reloads don't leak timers.
 *
 * Skips registration entirely if Teams credentials are missing — the sync
 * would no-op anyway, and we don't want a noisy warn every 5 minutes in
 * dev/CI.
 */
export function registerCronJobs(app: FastifyInstance, deps: CronJobsDeps): void {
  if (!deps.teamsCreds.clientId || !deps.teamsCreds.clientSecret || !deps.teamsCreds.tenantId) {
    app.log.info({ job: 'teams-artifacts-sync' }, 'Cron skipped — Teams M365 credentials not configured');
    return;
  }

  const intervalMs = deps.intervalMs ?? DEFAULT_INTERVAL_MS;
  const startupDelayMs = deps.startupDelayMs ?? DEFAULT_STARTUP_DELAY_MS;

  let interval: NodeJS.Timeout | null = null;
  let initialTimeout: NodeJS.Timeout | null = null;
  let running = false;

  const tick = async (): Promise<void> => {
    if (running) {
      // Previous run still in flight — skip this tick to avoid overlap
      app.log.debug({ job: 'teams-artifacts-sync' }, 'Skipping tick; previous run still in progress');
      return;
    }
    running = true;
    try {
      const result = await syncPendingTeamsArtifacts({
        prisma: deps.prisma,
        storage: deps.storage,
        teamsCreds: deps.teamsCreds,
        logger: {
          info: (event, fields) => app.log.info({ job: 'teams-artifacts-sync', event, ...fields }),
          warn: (event, fields) => app.log.warn({ job: 'teams-artifacts-sync', event, ...fields }),
          error: (event, fields) => app.log.error({ job: 'teams-artifacts-sync', event, ...fields }),
        },
      });
      if (result.candidateCount > 0) {
        app.log.info(
          { job: 'teams-artifacts-sync', ...result },
          'Teams artifacts sync complete',
        );
      }
    } catch (err) {
      app.log.error(
        { job: 'teams-artifacts-sync', err: err instanceof Error ? err.message : String(err) },
        'Teams artifacts sync threw unhandled error',
      );
    } finally {
      running = false;
    }
  };

  app.addHook('onReady', (done) => {
    initialTimeout = setTimeout(() => {
      void tick();
      interval = setInterval(() => {
        void tick();
      }, intervalMs);
    }, startupDelayMs);

    app.log.info(
      { job: 'teams-artifacts-sync', intervalMs, startupDelayMs },
      'Teams artifacts sync cron armed',
    );
    done();
  });

  app.addHook('onClose', (_instance, done) => {
    if (initialTimeout) clearTimeout(initialTimeout);
    if (interval) clearInterval(interval);
    initialTimeout = null;
    interval = null;
    done();
  });
}
