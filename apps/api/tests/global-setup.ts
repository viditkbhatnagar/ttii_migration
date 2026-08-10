import { hasTestDatabase } from './data/test-db-url.js';

/**
 * Runs once per `vitest run`, in the main process, before any suite is collected.
 *
 * Its only job is to explain the skips: without a mysql:// `DATABASE_URL` the
 * database-backed parity suites report as skipped (see `describeWithDatabase`
 * in tests/data/test-db.ts), and a CI log full of `↓` lines with no stated
 * reason is easy to misread as tests having silently disappeared.
 *
 * Note: this file runs outside the test worker context, so it must never import
 * from `vitest` (directly or transitively).
 */
export default function setup(): void {
  if (!hasTestDatabase) {
    console.warn(
      '[vitest] No mysql:// DATABASE_URL set — database-backed parity suites will be SKIPPED (auth, content, assessment, operations, data repositories). Every other suite runs normally.',
    );
  }
}
