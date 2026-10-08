import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SITTING_LABEL, formatYmd, type Sitting, type StudentResult } from './exam-results-model.js';
import { OverallBadge, Pill, type Tone } from './result-ui.js';

// One student's result, subject by subject — with what is behind each mark
// (answers saved, time taken) so staff can judge a flagged paper.

const SITTING_TONE: Record<string, Tone> = {
  pass: 'emerald',
  fail: 'rose',
  absent: 'slate',
  pending: 'blue',
  marks_only: 'slate',
};

export function StudentResultDialog({
  student, sittings, onClose,
}: { student: StudentResult | null; sittings: Sitting[]; onClose: () => void }) {
  return (
    <Dialog open={student !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
        style={{ width: 'min(760px, calc(100vw - 2rem))', maxWidth: 'min(760px, calc(100vw - 2rem))' }}
      >
        {student ? (
          <>
            <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {student.name} <OverallBadge result={student.overall} />
              </DialogTitle>
              <DialogDescription>
                {student.studentCode} · {student.obtained}/{student.maxMarks} ({student.percentage}%) · {student.subjectsPassed} of {student.subjectsTotal} subjects passed
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs">Subject</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Marks</TableHead>
                    <TableHead className="text-xs">Answered</TableHead>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {student.sittings.map((c, i) => {
                    const sitting = sittings[i];
                    return (
                      <TableRow key={c.examId}>
                        <TableCell className="text-sm font-medium">
                          {sitting?.subjectTitle ?? '—'}
                          {c.flag ? (
                            <span className="mt-1 flex items-start gap-1 text-[11px] font-normal text-amber-700">
                              <AlertTriangle aria-hidden="true" className="mt-px size-3 shrink-0" /> {c.flag}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{formatYmd(sitting?.date ?? '') || '—'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {c.score === null ? '—' : `${c.score}/${c.totalMarks}`}
                          {c.passMarks !== null ? <span className="block text-[10px] text-muted-foreground">pass {c.passMarks}</span> : null}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs tabular-nums">
                          {c.answered === null ? '—' : `${c.answered} of ${c.questionCount ?? 0}`}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs tabular-nums">{c.minutesTaken === null ? '—' : `${c.minutesTaken} min`}</TableCell>
                        <TableCell><Pill tone={SITTING_TONE[c.status] ?? 'slate'}>{SITTING_LABEL[c.status] ?? c.status}</Pill></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
