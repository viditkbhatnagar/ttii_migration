import { describe } from 'vitest';

import { createPrismaClient } from '../../src/data/prisma-client.js';
import { hasTestDatabase, testDatabaseUrl } from './test-db-url.js';

export const prisma = createPrismaClient(testDatabaseUrl);

export { hasTestDatabase };

/**
 * `describe` for suites that need a live database.
 *
 * Use this instead of a bare `describe` in any suite that calls
 * `resetParityTables()` or otherwise queries `prisma`. Without a mysql://
 * `DATABASE_URL` the whole suite is reported as skipped rather than failing —
 * see `tests/global-setup.ts` for the one-line note printed per run.
 */
export const describeWithDatabase: ReturnType<typeof describe.skipIf> =
  describe.skipIf(!hasTestDatabase);

const resetTablesInOrder = [
  'zoom_history',
  'exam_answer',
  'practice_answer',
  'exam_attempt',
  'exam_questions',
  'question_bank',
  'assignment_submissions',
  'saved_assignments',
  'assignment',
  'exam',
  'feed_comments',
  'feed_like',
  'feed_watched',
  'feed',
  'review_like',
  'review',
  'event_registration',
  'recorded_events',
  'events',
  'file',
  'folder',
  'student_document',
  'qualification',
  'centre_course_plans',
  'applications',
  'app_version',
  'frontend_settings',
  'settings',
  'centre_fundrequests',
  'wallet_transactions',
  'support_chat',
  'training_videos',
  'instructor_enrol',
  'demo_video',
  'lesson_files_report',
  'practice_attempt',
  'material_progress',
  'video_progress_status',
  'quiz',
  'vimeo_videolinks',
  'lesson_files',
  'live_class',
  'lesson',
  'cohort_students',
  'cohorts',
  'subject',
  'create_order',
  'coupon_code',
  'subject_package',
  'package',
  'student_fee',
  'payment_info',
  'course',
  'centres',
  'category',
  'auth_audit_log',
  'otp_challenge',
  'password_reset_token',
  'auth_session',
  'notification_read',
  'notification',
  'enrol',
  'users',
] as const;

export async function resetParityTables(): Promise<void> {
  for (const tableName of resetTablesInOrder) {
    await prisma.$executeRawUnsafe(`DELETE FROM ${tableName}`);
  }
}
