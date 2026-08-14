import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

import type { EmailProvider, StorageProvider } from '../integrations/contracts.js';
import { syncPendingTeamsArtifacts } from './teams-artifacts-sync.js';
import { sendDueExamReminders } from './exam-reminders.js';
import { AssessmentService } from '../assessment/assessment-service.js';

export interface CronJobsDeps {
  prisma: PrismaClient;
  storage: StorageProvider;
  teamsCreds: {
    clientId: string | undefined;
    clientSecret: string | undefined;
    tenantId: string | undefined;
  };
  /** Email provider for the exam reminder sweep. */
  email?: EmailProvider;
  /** Interval between runs (ms). Default 5 minutes. */
  intervalMs?: number;
  /** Delay before the first run after app ready (ms). Default 30 seconds. */
  startupDelayMs?: number;
  /** Interval for the exam auto-submit sweep (ms). Default 1 minute. */
  autoSubmitIntervalMs?: number;
}

/**
 * Exam 24h/1h reminder sweep. Independent of the Teams credentials so it runs
 * on every deployment. Idempotency lives in `exam_reminders`, not in this timer.
 */
function registerExamReminderCron(app: FastifyInstance, deps: CronJobsDeps): void {
  if (!deps.email) {
    app.log.info({ job: 'exam-reminders' }, 'Cron skipped — no email provider configured');
    return;
  }
  const email = deps.email;
  const intervalMs = deps.intervalMs ?? DEFAULT_INTERVAL_MS;
  const startupDelayMs = deps.startupDelayMs ?? DEFAULT_STARTUP_DELAY_MS;

  let interval: NodeJS.Timeout | null = null;
  let initialTimeout: NodeJS.Timeout | null = null;
  let running = false;

  const tick = async (): Promise<void> => {
    if (running) return;
    running = true;
    try {
      const result = await sendDueExamReminders({
        prisma: deps.prisma,
        email,
        logger: {
          info: (event, fields) => app.log.info({ job: 'exam-reminders', event, ...fields }),
          warn: (event, fields) => app.log.warn({ job: 'exam-reminders', event, ...fields }),
          error: (event, fields) => app.log.error({ job: 'exam-reminders', event, ...fields }),
        },
      });
      if (result.sent > 0 || result.failed > 0) {
        app.log.info({ job: 'exam-reminders', ...result }, 'Exam reminders sweep complete');
      }
    } catch (err) {
      app.log.error(
        { job: 'exam-reminders', err: err instanceof Error ? err.message : String(err) },
        'Exam reminders sweep threw unhandled error',
      );
    } finally {
      running = false;
    }
  };

  app.addHook('onReady', (done) => {
    initialTimeout = setTimeout(() => {
      void tick();
      interval = setInterval(() => { void tick(); }, intervalMs);
    }, startupDelayMs);
    app.log.info({ job: 'exam-reminders', intervalMs, startupDelayMs }, 'Exam reminders cron armed');
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

/**
 * Server-side exam auto-submit (TTII 2026-08-14: "the exam should be
 * automatically submitted once the allotted time expires, regardless of whether
 * the student is online or offline").
 *
 * Deliberately depends on NOTHING optional — no email provider, no M365
 * credentials, no settings-table gate. The institute asked for this, so a job
 * that quietly never armed because some unrelated integration was unconfigured
 * would be a silent non-delivery. It is also registered before the Teams block
 * that returns early.
 */
function registerExamAutoSubmitCron(app: FastifyInstance, deps: CronJobsDeps): void {
  const intervalMs = deps.autoSubmitIntervalMs ?? DEFAULT_AUTO_SUBMIT_INTERVAL_MS;
  const startupDelayMs = deps.startupDelayMs ?? DEFAULT_STARTUP_DELAY_MS;

  let interval: NodeJS.Timeout | null = null;
  let initialTimeout: NodeJS.Timeout | null = null;
  let running = false;

  const tick = async (): Promise<void> => {
    // Re-entrancy guard: a slow sweep must never overlap itself and finalise
    // the same attempt twice.
    if (running) return;
    running = true;
    try {
      const result = await new AssessmentService({ prisma: deps.prisma }).sweepExpiredExamAttempts();
      // Silent when there was nothing to do, so the log stays readable — but
      // ALWAYS loud when marks were written or something failed.
      if (result.graded > 0 || result.failed > 0 || result.skippedNoWork > 0) {
        app.log.info({ job: 'exam-auto-submit', ...result }, 'Exam auto-submit sweep complete');
      }
    } catch (err) {
      app.log.error(
        { job: 'exam-auto-submit', err: err instanceof Error ? err.message : String(err) },
        'Exam auto-submit sweep threw unhandled error',
      );
    } finally {
      running = false;
    }
  };

  app.addHook('onReady', (done) => {
    initialTimeout = setTimeout(() => {
      void tick();
      interval = setInterval(() => { void tick(); }, intervalMs);
    }, startupDelayMs);
    app.log.info({ job: 'exam-auto-submit', intervalMs, startupDelayMs }, 'Exam auto-submit cron armed');
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

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_STARTUP_DELAY_MS = 30 * 1000;
/**
 * Every minute. The sweep already waits AUTO_SUBMIT_GRACE_MS (5 min) past a
 * paper's deadline, so this only decides how much is added on top: at 1 minute
 * a paper is finalised 5-6 minutes after time expires. On the 5-minute default
 * it would be 5-10, which reads as "it didn't submit" to someone watching.
 */
const DEFAULT_AUTO_SUBMIT_INTERVAL_MS = 60 * 1000;

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
  // Exam reminders are registered FIRST and unconditionally. The Teams sync
  // below bails out when M365 credentials are absent, and it used to `return`
  // from this whole function — so any job added after it silently never ran.
  registerExamReminderCron(app, deps);
  // Same reason, and it must outlive every optional integration: this one writes
  // the marks a student is graded on.
  registerExamAutoSubmitCron(app, deps);

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
