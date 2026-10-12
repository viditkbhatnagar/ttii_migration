import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ClipboardList, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { ClassTimeInput } from '@/components/ui/class-time-input';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../../routing/admin-routes.js';
import { asNumber, asString } from '../../../shared/utils/admin-data-utils.js';
import { formatYmd } from '../../exam_result/exam-results-model.js';
import {
  EXAM_YEAR_MAX,
  EXAM_YEAR_MIN,
  firstScheduleError,
  formatMinutes,
  patchScheduleRow,
  scheduleRowErrors,
  suggestedScheduleRow,
  toScheduleRow,
  type ExamWindow,
  type ScheduleRow,
} from './wizard-model.js';
import { Chip, StepBody, StepHeader, StepLoading, StepNotice, WizardFooter } from './wizard-ui.js';

export interface StepProps {
  api: AdminPageProps['api'];
  authToken: string;
  examId: string;
  closeLabel: string;
  onSaved: () => void;
  onBack: () => void;
  onClose: () => void;
}

export function StepSchedule({ api, authToken, examId, closeLabel, onSaved, onBack, onClose, examWindow }: StepProps & { examWindow: ExamWindow }) {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // New rows default to the Step 1 window; read through a ref so editing
  // Step 1 doesn't refetch (and wipe) a timetable being edited here.
  const windowRef = useRef(examWindow);
  windowRef.current = examWindow;

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const existing = await api.getExamSchedule(authToken, examId);
        if (cancelled) return;
        if (existing.length > 0) {
          setRows(existing.map(toScheduleRow));
        } else {
          const suggestions = await api.getExamSchedulingSuggestions(authToken, examId);
          if (cancelled) return;
          setRows(suggestions.map((s, i) => suggestedScheduleRow({
            subject_id: asNumber(s.subject_id),
            subject_title: asString(s.subject_title),
            course_ids: asString(s.course_ids),
            available_courses: asString(s.available_courses),
          }, i, windowRef.current)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, authToken, examId]);

  const updateRow = (idx: number, patch: Partial<ScheduleRow>) =>
    setRows((cur) => cur.map((r, i) => (i === idx ? patchScheduleRow(r, patch) : r)));
  const removeRow = (idx: number) => setRows((cur) => cur.filter((_, i) => i !== idx));

  const handleSave = async (then: 'next' | 'close') => {
    const problem = firstScheduleError(rows, examWindow);
    if (problem) { toast.error(problem); return; }
    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        id: r.id,
        subject_id: r.subject_id,
        subject_title: r.subject_title,
        course_ids: r.course_ids,
        exam_date: r.exam_date,
        start_time: r.start_time,
        end_time: r.end_time,
        duration_minutes: r.duration_minutes,
        total_marks: r.total_marks,
        pass_marks: r.pass_marks,
      }));
      const res = await api.saveExamSchedule(authToken, examId, payload);
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Saved.';
      if (status === 1) { toast.success(message); if (then === 'next') onSaved(); else onClose(); }
      else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save schedule.');
    } finally { setSaving(false); }
  };

  if (loading) return <StepLoading label="Loading schedule…" />;
  if (rows.length === 0) {
    return (
      <StepNotice action={<Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}><ArrowLeft aria-hidden="true" className="size-4" /> Back to Step 1</Button>}>
        <p className="font-medium text-foreground">No subjects found for the picked courses.</p>
        <p className="text-xs">Add subjects to those courses (Courses → Subjects) and revisit this step.</p>
      </StepNotice>
    );
  }

  const from = formatYmd(examWindow.from_date);
  const to = formatYmd(examWindow.to_date);
  const errorCount = rows.filter((r) => scheduleRowErrors(r, examWindow).length > 0).length;

  return (
    <>
      <StepBody>
        <StepHeader
          icon={ClipboardList}
          title="Subject Timetable"
          subtitle={<>One row per subject across the picked courses — a subject shared by several courses runs as a single sitting. {from && to ? <>Dates must fall within <span className="font-medium text-foreground">{from} – {to}</span>. </> : null}Times are IST.</>}
          actions={(
            <>
              {errorCount > 0 ? <Chip tone="danger">{errorCount} row{errorCount === 1 ? '' : 's'} to fix</Chip> : null}
              <Chip tone="primary">{rows.length} subject{rows.length === 1 ? '' : 's'}</Chip>
            </>
          )}
        />
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-10 text-xs">#</TableHead>
                <TableHead className="min-w-[180px] text-xs">Subject</TableHead>
                <TableHead className="text-xs">Date</TableHead>
                <TableHead className="text-xs">Start</TableHead>
                <TableHead className="text-xs">End</TableHead>
                <TableHead className="text-right text-xs">Duration</TableHead>
                <TableHead className="text-right text-xs">Total Marks</TableHead>
                <TableHead className="text-right text-xs">Pass Marks</TableHead>
                <TableHead className="w-10 text-xs"><span className="sr-only">Remove</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => {
                const errs = scheduleRowErrors(r, examWindow);
                return (
                  <TableRow key={`${r.subject_id ?? r.subject_title}-${idx}`} className={cn('align-top', errs.length > 0 && 'bg-rose-50/50 hover:bg-rose-50/70')}>
                    <TableCell className="pt-4 text-xs text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="whitespace-normal">
                      <p className="pt-1.5 text-sm font-medium text-foreground">{r.subject_title}</p>
                      <p className="text-[11px] text-muted-foreground">{r.available_courses || '—'}</p>
                      {errs.length > 0 ? (
                        <ul className="mt-1 space-y-0.5 text-[11px] font-medium text-rose-700">
                          {errs.map((e) => <li key={e}>{e}</li>)}
                        </ul>
                      ) : null}
                    </TableCell>
                    <TableCell><DmyDateInput value={r.exam_date} onChange={(iso) => updateRow(idx, { exam_date: iso })} hidePicker className="h-8 w-28" minYear={EXAM_YEAR_MIN} maxYear={EXAM_YEAR_MAX} /></TableCell>
                    <TableCell><ClassTimeInput value={r.start_time} onChange={(v) => updateRow(idx, { start_time: v })} className="h-8" /></TableCell>
                    <TableCell><ClassTimeInput value={r.end_time} onChange={(v) => updateRow(idx, { end_time: v })} className="h-8" /></TableCell>
                    <TableCell className="pt-4 text-right text-xs text-muted-foreground">{formatMinutes(r.duration_minutes) || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Input aria-label={`${r.subject_title} total marks`} type="number" min={0} value={r.total_marks} onChange={(e) => updateRow(idx, { total_marks: Number(e.target.value) || 0 })} className="ml-auto h-8 w-20 text-right" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input aria-label={`${r.subject_title} pass marks`} type="number" min={0} value={r.pass_marks} onChange={(e) => updateRow(idx, { pass_marks: Number(e.target.value) || 0 })} className="ml-auto h-8 w-20 text-right" />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${r.subject_title}`} title="Remove row" onClick={() => removeRow(idx)}>
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </StepBody>
      <WizardFooter
        step={2}
        onBack={onBack}
        onSaveClose={() => { void handleSave('close'); }}
        onContinue={() => { void handleSave('next'); }}
        saving={saving}
        closeLabel={closeLabel}
      />
    </>
  );
}
