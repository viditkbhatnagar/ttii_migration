import type { Prisma, PrismaClient } from '@prisma/client';

// Naji 2026-05-09 — the wizard's auto-generated exam identifier,
// TTIIEXM{YY}{#####} (e.g. TTIIEXM2600012): the highest sequence used this
// year, plus one. Shared by the Create Exam wizard (Step 1) and supplementary
// exams (TTII 2026-10-16), so both draw codes from one sequence.

type Db = Pick<PrismaClient, 'exam'> | Prisma.TransactionClient;

export async function nextExamCode(db: Db, now: Date = new Date()): Promise<string> {
  const yy = now.getFullYear() % 100;
  const prefix = `TTIIEXM${String(yy).padStart(2, '0')}`;
  const recent = await db.exam.findMany({
    where: { exam_code: { startsWith: prefix } },
    select: { exam_code: true },
    orderBy: { id: 'desc' },
    take: 500,
  });
  let maxSeq = 0;
  for (const row of recent) {
    const code = row.exam_code ?? '';
    if (!code.startsWith(prefix)) continue;
    const n = Number.parseInt(code.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
  }
  return `${prefix}${String(maxSeq + 1).padStart(5, '0')}`;
}
