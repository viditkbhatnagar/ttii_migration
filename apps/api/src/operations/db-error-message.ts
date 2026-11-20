// What an admin sees when the database refuses a write (Risha, TTII 2026-11-20).
//
// The database server's disk filled up and MariaDB answered every insert with
// error 1114 "The table 'exam_questions' is full". The admin screen showed
// Prisma's raw message ("Invalid `prisma.exam_questions.createMany()`
// invocation: ConnectorError(...)"), which reads like a broken form and says
// nothing about what to do. Database failures now get a plain sentence; the
// raw error is logged on the server, never sent to the browser.

export const STORAGE_FULL_MESSAGE =
  'The database server is out of storage space, so this could not be saved. Please contact support and try again once it is fixed.';
export const DATABASE_ERROR_MESSAGE =
  'The database could not complete this request. Please try again in a minute; if it keeps happening, contact support.';

/** MariaDB "table is full" (1114) / "out of disk" (1021, 3) / OS ENOSPC (errno 28). */
const STORAGE_FULL = /\b(1114|1021)\b|is full|No space left on device|ENOSPC|errno:? ?28\b/i;
/** Prisma's client / connector errors, whose text is not for end users. */
const PRISMA_ERROR = /Invalid `prisma\.|ConnectorError|PrismaClient(Known|Unknown)RequestError|Can't reach database server|Timed out fetching a new connection/;

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : typeof error === 'string' ? error : '';
}

/** A plain message for a database failure, or null when the error is not one (keep its own message). */
export function friendlyDatabaseError(error: unknown): string | null {
  const name = error instanceof Error ? error.constructor.name : '';
  const text = messageOf(error);
  const isPrisma = name.startsWith('PrismaClient') || PRISMA_ERROR.test(text);
  if (!isPrisma) return null;
  return STORAGE_FULL.test(text) ? STORAGE_FULL_MESSAGE : DATABASE_ERROR_MESSAGE;
}
