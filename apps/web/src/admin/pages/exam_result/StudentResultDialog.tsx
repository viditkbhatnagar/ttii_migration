import { AlertTriangle, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SITTING_LABEL, formatHm, formatYmd, type Sitting, type StudentResult, type StudentSitting } from './exam-results-model.js';
import { OverallBadge, Pill, type Tone } from './result-ui.js';

// One student's result, subject by subject — with what is behind each mark
// (answers saved, time taken) so staff can judge a flagged paper.

const SITTING_TONE: Record<string, Tone> = {
  pass: 'emerald',
  fail: 'rose',
  absent: 'slate',
  pending: 'blue',
  marks_only: 'slate',
  reexam: 'violet',
};

/** A subject can be re-examined once its sitting is over and it was not passed. */
function canReExam(cell: StudentSitting, sitting: Sitting | undefined): boolean {
  if (!sitting?.closed) return false;
  return cell.status === 'fail' || cell.status === 'absent' || cell.status === 'reexam' || cell.flag !== null;
}

export function StudentResultDialog({
  student, sittings, onClose, onReExam,
}: {
  student: StudentResult | null;
  sittings: Sitting[];
  onClose: () => void;
  onReExam: (student: StudentResult, examId: number) => void;
}) {
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
                    <TableHead className="text-right text-xs"><span className="sr-only">Action</span></TableHead>
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
                          {c.reExam ? (
                            <span className="mt-1 block text-[11px] font-normal text-primary">
                              Re-exam {formatYmd(c.reExam.date)}, {formatHm(c.reExam.startTime)}–{formatHm(c.reExam.endTime)}
                              {c.reExam.state === 'completed' ? ` · original paper ${c.previousScore ?? '—'}` : ''}
                              {c.reExam.state === 'missed' ? ' · not taken' : ''}
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
                        <TableCell className="text-right">
                          {canReExam(c, sitting) ? (
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => onReExam(student, c.examId)}>
                              <CalendarClock aria-hidden="true" className="size-3.5" />
                              {c.status === 'reexam' ? 'Move' : 'Re-exam'}
                            </Button>
                          ) : null}
                        </TableCell>
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
