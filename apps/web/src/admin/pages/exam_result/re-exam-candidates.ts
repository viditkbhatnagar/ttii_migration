import type { ReExamCandidate } from '../re_exam/ScheduleReExamDialog.js';
import { formatYmd, type StudentResult } from './exam-results-model.js';

/**
 * Who the re-exam dialog lists for one subject, and who it ticks. Absent and
 * flagged papers are ticked; a genuine fail is listed unticked (whether a fail
 * earns a re-exam is TTII's call); a student with a re-exam already is listed
 * unticked — ticking moves it.
 */
export function reExamCandidates(students: StudentResult[], sittingIndex: number): ReExamCandidate[] {
  const out: ReExamCandidate[] = [];
  for (const s of students) {
    const c = s.sittings[sittingIndex];
    if (!c) continue;
    const base = { userId: s.userId, name: s.name, studentCode: s.studentCode };
    if (c.status === 'reexam' && c.reExam) {
      out.push({ ...base, note: `Re-exam ${formatYmd(c.reExam.date).slice(0, 5)}`, tone: 'violet', preselect: false });
    } else if (c.flag) {
      out.push({ ...base, note: `Check · ${c.answered ?? 0}/${c.questionCount ?? 0} answered`, tone: 'amber', preselect: true });
    } else if (c.status === 'absent') {
      out.push({ ...base, note: c.reExam?.state === 'missed' ? 'Missed re-exam' : 'Absent', tone: 'slate', preselect: true });
    } else if (c.status === 'fail') {
      out.push({ ...base, note: `Failed · ${c.score ?? 0}/${c.totalMarks}`, tone: 'rose', preselect: false });
    }
  }
  return out;
}
