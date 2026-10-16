import type { Prisma } from '@prisma/client';

// Enrolment IDs (TTII 2026-10-16). Every enrolment has been numbered
// TIDMTT + YY + MM + the student's users.id, so a student given a second course
// in the same month got the SAME ID twice (Ansy Mol V K, user 353, holds
// TIDMTT26100353 on two enrolments). A new ID keeps that format and only gains
// a short sequence suffix (-2, -3, ...) when the base is already taken.
// Existing IDs are never rewritten.

/** TIDMTT + YY + MM + users.id padded to 4, from the server clock as before. */
export function baseEnrollmentId(userId: number, now: Date): string {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `TIDMTT${yy}${mm}${String(userId).padStart(4, '0')}`;
}

/** The base when nobody holds it, else the base with the smallest free suffix. */
export function pickUniqueEnrollmentId(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Allocate a unique enrolment ID for the student. Soft-deleted enrolments
 *  still hold their IDs, so they count as taken. */
export async function allocateEnrollmentId(
  client: Pick<Prisma.TransactionClient, 'enrol'>,
  userId: number,
  now: Date,
): Promise<string> {
  const base = baseEnrollmentId(userId, now);
  const rows = await client.enrol.findMany({
    where: { enrollment_id: { startsWith: base } },
    select: { enrollment_id: true },
  });
  const taken = new Set(rows.map((r) => (r.enrollment_id ?? '').trim()).filter((id) => id !== ''));
  return pickUniqueEnrollmentId(base, taken);
}
