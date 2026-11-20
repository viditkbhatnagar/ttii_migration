import { describe, expect, test } from 'vitest';

import { DATABASE_ERROR_MESSAGE, STORAGE_FULL_MESSAGE, friendlyDatabaseError } from '../../src/operations/db-error-message.js';

// Risha 2026-11-20: the DB disk filled up and the admin saw Prisma's raw text.
const RAW_1114 = "Invalid `prisma.exam_questions.createMany()` invocation:\n\nError occurred during query execution:\nConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(Server(MysqlError { code: 1114, message: \"The table 'exam_questions' is full\", state: \"HY000\" })) })";

describe('database errors shown to an admin', () => {
  test('a full database disk reads as a storage problem, not a broken form', () => {
    expect(friendlyDatabaseError(new Error(RAW_1114))).toBe(STORAGE_FULL_MESSAGE);
    expect(friendlyDatabaseError(new Error('Invalid `prisma.exam.create()` invocation: No space left on device (errno: 28)'))).toBe(STORAGE_FULL_MESSAGE);
  });
  test('other database failures get a plain sentence; raw Prisma text never reaches the browser', () => {
    const out = friendlyDatabaseError(new Error("Invalid `prisma.exam.findMany()` invocation: Can't reach database server at 10.0.0.2:3306"));
    expect(out).toBe(DATABASE_ERROR_MESSAGE);
    class PrismaClientKnownRequestError extends Error {}
    expect(friendlyDatabaseError(new PrismaClientKnownRequestError('Unique constraint failed'))).toBe(DATABASE_ERROR_MESSAGE);
  });
  test('an ordinary error keeps its own message', () => {
    expect(friendlyDatabaseError(new Error('Exam not found.'))).toBeNull();
    expect(friendlyDatabaseError('nope')).toBeNull();
    expect(friendlyDatabaseError(undefined)).toBeNull();
  });
});
