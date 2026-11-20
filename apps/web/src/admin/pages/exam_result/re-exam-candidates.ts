import type { ReExamCandidate } from '../re_exam/ScheduleReExamDialog.js';
import { formatYmd, type StudentResult } from './exam-results-model.js';

/**
 * Who the re-exam dialog lists for one subject, and who it ticks. Absent and
 * flagged papers are ticked; a genuine fail is listed unticked (whether a fail
 * earns a re-exam is TTII's call); a student with a re-exam already is listed
 * unticked — ticking moves it. Every other student who sat the paper (passed,
 * or marks only) is listed last, unticked and marked `other`: a coordinator may
 * need to give a re-exam to a student whose paper was cut short by the old
 * proctoring bug, which left no flag on a paper that still passed.
 */
export function reExamCandidates(students: StudentResult[], sittingIndex: number): ReExamCandidate[] {
  const out: ReExamCandidate[] = [];
  for (const s of students) {
    const c = s.sittings[sittingIndex];
    if (!c) continue;
    const base = { userId: s.userId, name: s.name, studentCode: s.studentCode };
    if (c.status === 'reexam' && c.reExam) {
      out.push({ ...base, note: `Re-exam ${formatYmd(c.reExam.date).slice(0, 5)}`, tone: 'primary', preselect: false });
    } else if (c.flag) {
      out.push({ ...base, note: `Check · ${c.answered ?? 0}/${c.questionCount ?? 0} answered`, tone: 'amber', preselect: true });
    } else if (c.status === 'absent') {
      out.push({ ...base, note: c.reExam?.state === 'missed' ? 'Missed re-exam' : 'Absent', tone: 'slate', preselect: true });
    } else if (c.status === 'fail') {
      out.push({ ...base, note: `Failed · ${c.score ?? 0}/${c.totalMarks}`, tone: 'rose', preselect: false });
    } else if (c.status === 'pass' || c.status === 'marks_only') {
      out.push({ ...base, note: `${c.status === 'pass' ? 'Passed' : 'Sat'} · ${c.score ?? 0}/${c.totalMarks}`, tone: 'slate', preselect: false, other: true });
    }
  }
  // At-risk students first; the rest keep the sheet's order.
  return [...out.filter((c) => !c.other), ...out.filter((c) => c.other)];
}

/** Candidates whose name or student code contains the query (case-insensitive); all of them for an empty query. */
export function filterCandidates(list: ReExamCandidate[], query: string): ReExamCandidate[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter((c) => c.name.toLowerCase().includes(q) || c.studentCode.toLowerCase().includes(q));
}

/** The user ids an "All" button should tick: everyone listed except the other students who merely sat the paper. */
export function atRiskIds(list: ReExamCandidate[]): number[] {
  return list.filter((c) => !c.other).map((c) => c.userId);
}
