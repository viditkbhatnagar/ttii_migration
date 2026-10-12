import { describe, expect, test } from 'vitest';

import type { PrismaClient } from '@prisma/client';

import { ExamDashboardService, type ExamDashboardSummary } from '../../src/operations/exam-dashboard-service.js';
import type { ExamAdminService } from '../../src/operations/exam-admin-service.js';
import type { ExamCalendarService } from '../../src/operations/exam-calendar-service.js';
import type { ExamResultsService } from '../../src/operations/exam-results-service.js';

// TTII 2026-10-12 — the dashboard summary reads every exam's result sheet, so
// views within a minute share one build; a failed build is never kept.

type Build = (nowMs: number) => Promise<ExamDashboardSummary>;

function makeService(clock: { ms: number }, build: Build): ExamDashboardService {
  const unused = {} as unknown;
  const service = new ExamDashboardService({} as PrismaClient, {
    now: () => new Date(clock.ms),
    admin: unused as ExamAdminService,
    results: unused as ExamResultsService,
    calendar: unused as ExamCalendarService,
  });
  (service as unknown as { build: Build }).build = build;
  return service;
}

describe('dashboard summary cache', () => {
  test('repeat and concurrent views within a minute share one build; a minute later it rebuilds', async () => {
    const clock = { ms: Date.UTC(2026, 9, 12, 6) };
    let builds = 0;
    const service = makeService(clock, (nowMs) => {
      builds += 1;
      return Promise.resolve({ generatedAt: new Date(nowMs).toISOString() } as ExamDashboardSummary);
    });
    const [a, b] = await Promise.all([service.summary(), service.summary()]);
    expect(a).toBe(b);
    clock.ms += 59_000;
    await service.summary();
    expect(builds).toBe(1);
    clock.ms += 2_000;
    await service.summary();
    expect(builds).toBe(2);
  });

  test('a failed build is not cached', async () => {
    const clock = { ms: Date.UTC(2026, 9, 12, 6) };
    let builds = 0;
    const service = makeService(clock, () => {
      builds += 1;
      return builds === 1 ? Promise.reject(new Error('db down')) : Promise.resolve({ generatedAt: 'ok' } as ExamDashboardSummary);
    });
    await expect(service.summary()).rejects.toThrow('db down');
    await expect(service.summary()).resolves.toMatchObject({ generatedAt: 'ok' });
    expect(builds).toBe(2);
  });
});
