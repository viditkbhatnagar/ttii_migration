/**
 * Seed the permanent Practice Exam (Naji 2026-08-01).
 *
 * Creates one exam flagged `is_practice = 1` plus ten sample questions, so the
 * "Start Practice Exam" card on the student Exams tab has something to launch.
 * `assessment-service.getExamForTaking` skips the allocation, date-window and
 * already-submitted gates for a practice exam, so every enrolled student can
 * take this as often as they like without any per-student allocation.
 *
 * IDEMPOTENT: re-running does nothing once the exam exists (matched on
 * exam_code). Safe to run against production more than once.
 *
 *   npx tsx prisma/seed-practice-exam.ts
 *
 * Risha UAT 2026-08-06 — note what that idempotency means: this is a CREATE-IF-
 * ABSENT guard, not an upsert. Once the exam row exists the script returns
 * before touching a single question, so editing the data below does NOT repair
 * an already-seeded exam — it only affects databases that have never been
 * seeded. Production (exam id 8) was seeded on 2026-08-01 with 1-based answers
 * and q_type 1; repair those rows with prisma/fix-practice-exam-questions.sql.
 *
 * The questions are deliberately generic "how the exam screen works" content —
 * they teach the mechanics (navigation, flagging, submitting), not a subject —
 * so this stays useful for every course. Replace them from the admin exam
 * wizard at any time; nothing here is special-cased beyond the is_practice flag.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EXAM_CODE = 'TTIIPRACTICE01';

/**
 * [question, options, ZERO-based index of the correct option]
 *
 * Risha UAT 2026-08-06 — this table used to be 1-based and every row was
 * written straight into `question_bank.correct_answers`. That column is
 * 0-BASED repo-wide and there are no exceptions: the CSV importer maps letter
 * A to 0 (`correctLetter.charCodeAt(0) - 65` in QuestionBankPage, fed to
 * operations-service `bulkAddQuestions`, whose type reads "indexes into
 * options"), QuestionBankPage and ViewSubjectQuestionsPage both persist the
 * render index, and the API parity fixture seeds ["0"] / ["1"] / ["2"].
 * The server grades by exact string equality against whatever the player
 * submits, and the player submits the 0-based index — so a 1-based seed marks
 * every correct answer WRONG. Keep this 0-based.
 */
const QUESTIONS: Array<[string, string[], number]> = [
  ['Which button do you use to move to the next question during an exam?', ['Next', 'Submit Exam', 'Close', 'Refresh'], 0],
  ['What happens if you close the exam window before submitting?', ['Your attempt stays in progress and can be resumed', 'Your answers are deleted immediately', 'The exam is auto-submitted', 'Nothing is saved at all'], 0],
  ['How many answers can you select for a single-choice question?', ['One', 'Two', 'As many as you like', 'None'], 0],
  ['Where can you see how much time is left in a timed exam?', ['The timer at the top of the exam screen', 'In your email', 'On the dashboard', 'Time is never shown'], 0],
  ['What should you do once you have answered every question?', ['Click Submit Exam', 'Close the browser', 'Wait for the timer to run out', 'Log out'], 0],
  ['Can you return to a previous question before submitting?', ['Yes, using the Previous button', 'No, questions are one-way', 'Only in practice exams', 'Only if the timer is paused'], 0],
  ['Is this practice exam graded or recorded against your results?', ['No, it is only for practice', 'Yes, it counts towards your final grade', 'Only the first attempt counts', 'It replaces your lowest score'], 0],
  ['How many times may you take this practice exam?', ['As many times as you like', 'Once only', 'Twice', 'Once per month'], 0],
  ['Who should you contact if the exam screen does not load?', ['Your institute support team', 'Nobody, just wait', 'Another student', 'Your bank'], 0],
  ['Before a real exam begins, what is the best preparation?', ['Check your internet connection and device in advance', 'Log in after the exam starts', 'Use an unstable connection', 'Skip reading the instructions'], 0],
];

async function main(): Promise<void> {
  const existing = await prisma.exam.findFirst({
    where: { exam_code: EXAM_CODE, deleted_at: null },
    select: { id: true, status: true, is_practice: true },
  });

  if (existing) {
    const count = await prisma.exam_questions.count({
      where: { exam_id: existing.id, deleted_at: null },
    });
    console.log(`Practice exam already exists (id=${existing.id}, status=${existing.status}, is_practice=${existing.is_practice}, questions=${count}). Nothing to do.`);
    return;
  }

  const now = new Date();

  const exam = await prisma.exam.create({
    data: {
      exam_code: EXAM_CODE,
      title: 'Practice Exam',
      description: 'Get familiar with the exam screen before your real examination. Not graded — take it as many times as you like.',
      is_practice: 1,
      status: 'published',
      duration: '15',
      mark: QUESTIONS.length,
      have_minus_mark: 0,
      publish_result: false,
      shuffle_questions: false,
      instructions:
        '<p>This is a practice exam. Nothing here is graded or recorded against your results.</p>'
        + '<p>Use it to get comfortable with the exam screen: moving between questions, selecting answers, watching the timer and submitting.</p>'
        + '<p>You can take it as many times as you like.</p>',
      created_at: now,
      updated_at: now,
    },
    select: { id: true },
  });

  let questionNo = 1;
  for (const [title, options, correctIndex] of QUESTIONS) {
    const qb = await prisma.question_bank.create({
      data: {
        title: `<p>${title}</p>`,
        // Risha UAT 2026-08-06 — q_type 0 = MCQ, 1 = Descriptive. These ten
        // all carry four options, so they are MCQs; the old `1` labelled them
        // descriptive, which makes the player render a textarea and the server
        // route them to manual grading (exam_descriptive_grades) instead of
        // scoring them.
        q_type: 0,
        number_of_options: options.length,
        options: JSON.stringify(options.map((o) => `<p>${o}</p>`)),
        // correctIndex is 0-based — see the QUESTIONS doc comment above.
        correct_answers: JSON.stringify([String(correctIndex)]),
        order: questionNo,
        created_at: now,
        updated_at: now,
      },
      select: { id: true },
    });

    await prisma.exam_questions.create({
      data: {
        exam_id: exam.id,
        question_id: qb.id,
        question_no: questionNo,
        mark: 1,
        negative_mark: 0,
        created_at: now,
        updated_at: now,
      },
    });
    questionNo += 1;
  }

  console.log(`Created practice exam id=${exam.id} (${EXAM_CODE}) with ${QUESTIONS.length} questions.`);
}

main()
  .catch((e: unknown) => {
    console.error('seed-practice-exam failed:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
