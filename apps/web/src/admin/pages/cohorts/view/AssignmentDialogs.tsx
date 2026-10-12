import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ClassTimeInput } from '@/components/ui/class-time-input';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { titleCaseOnBlur } from '@/lib/text-format';
import type { AdminPageProps } from '../../../routing/admin-routes.js';
import { asString } from '../../../shared/utils/admin-data-utils.js';
import { RichTextEditor } from '../../../shared/components/RichTextEditor.js';
import { hhmmOf, ymdOf } from '../list-model.js';
import { DialogShell } from './DialogShell.js';

type Api = AdminPageProps['api'];
const TEXTAREA = 'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40';

/** A stored "HH:MM[:SS]" as the time input's HH:MM; anything else is passed through untouched. */
function timeValue(raw: unknown): string {
  const s = asString(raw);
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(s) ? hhmmOf(s) : s;
}

function fileNameOf(url: string): string {
  return url ? url.split('/').pop() || url : '';
}

/**
 * Add / Edit Assignment for a cohort (Naji UAT 2026-05-22 overhaul): reuse a
 * previous assignment, question as text and/or an uploaded file, rich-text
 * instructions. Saves through /admin/assignment/add|edit with the cohort id.
 */
export function AssignmentDialog({
  api, token, cohortId, assignment, onClose, onSaved,
}: { api: Api; token: string; cohortId: string; assignment: Record<string, unknown> | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(() => asString(assignment?.title));
  const [description, setDescription] = useState(() => asString(assignment?.description));
  const [totalMarks, setTotalMarks] = useState(() => asString(assignment?.total_marks));
  const [dueDate, setDueDate] = useState(() => ymdOf(assignment?.due_date));
  const [fromTime, setFromTime] = useState(() => timeValue(assignment?.from_time));
  const [dueTime, setDueTime] = useState(() => timeValue(asString(assignment?.due_time) || asString(assignment?.to_time)));
  const [instructions, setInstructions] = useState(() => asString(assignment?.instructions));
  const [file, setFile] = useState(() => asString(assignment?.file));
  const [fileName, setFileName] = useState(() => fileNameOf(asString(assignment?.file)));
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previous, setPrevious] = useState<Record<string, unknown>[]>([]);
  const [reuseId, setReuseId] = useState('');

  // The Reuse dropdown (Add only) lists every earlier assignment.
  useEffect(() => {
    if (assignment) return;
    let cancelled = false;
    api.loadAdminAssignments(token, {})
      .then((rows) => { if (!cancelled) setPrevious(rows); })
      .catch(() => { /* non-fatal: the dropdown just stays hidden */ });
    return () => { cancelled = true; };
  }, [api, token, assignment]);

  const reuse = useCallback((id: string) => {
    setReuseId(id);
    const src = previous.find((r) => asString(r.id) === id || asString(r._id) === id);
    if (!src) return;
    setTitle(asString(src.title));
    setDescription(asString(src.description));
    setTotalMarks(asString(src.total_marks));
    setFromTime(timeValue(src.from_time));
    setDueTime(timeValue(asString(src.to_time) || asString(src.due_time)));
    setInstructions(asString(src.instructions));
    const f = asString(src.file);
    setFile(f);
    setFileName(fileNameOf(f));
    // Due date is never copied — every new assignment needs a fresh schedule.
    toast.success('Pre-filled from previous assignment. Set a new due date before saving.');
  }, [previous]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setUploading(true);
    try {
      const result = await api.uploadFile(token, picked);
      setFile(result.url);
      setFileName(picked.name);
      toast.success('Question file uploaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload: Parameters<typeof api.addAssignment>[1] = {
        title,
        description,
        dueDate,
        fromTime,
        toTime: dueTime,
        instructions,
        file,
        courseId: '',
        cohortId,
        ...(totalMarks ? { totalMarks: Number(totalMarks) } : {}),
      };
      const res = assignment
        ? await api.editAssignment(token, asString(assignment.id) || asString(assignment._id), payload)
        : await api.addAssignment(token, payload);
      toast.success(asString(res.message) || (assignment ? 'Assignment updated' : 'Assignment created'));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const thisYear = new Date().getFullYear();
  return (
    <DialogShell
      open
      onClose={onClose}
      title={assignment ? 'Edit Assignment' : 'Add Assignment'}
      width={672}
      onSubmit={() => void submit()}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting || uploading || !title || !dueDate}>
            {submitting ? 'Saving…' : assignment ? 'Save Changes' : 'Create Assignment'}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        {!assignment && previous.length > 0 ? (
          <div className="space-y-1.5 rounded-lg border border-dashed border-border bg-muted/30 p-3">
            <Label htmlFor="assignment-reuse" className="text-xs">Reuse from Previous Assignment (optional)</Label>
            <select id="assignment-reuse" value={reuseId} onChange={(e) => reuse(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— Start blank —</option>
              {previous.map((r) => {
                const id = asString(r.id) || asString(r._id);
                const ctx = asString(r.course_title) || asString(r.cohort_title) || asString(r.cohort_code);
                return <option key={id} value={id}>{asString(r.title)}{ctx ? ` — ${ctx}` : ''}</option>;
              })}
            </select>
            <p className="text-[11px] text-muted-foreground">Copies title, question text, file, marks, and instructions. Due date stays blank.</p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="assignment-title">Title *</Label>
          <Input id="assignment-title" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={titleCaseOnBlur(setTitle)} />
        </div>

        <fieldset className="space-y-3 rounded-lg border border-border p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question</legend>
          <div className="space-y-1.5">
            <Label htmlFor="assignment-question" className="text-xs">Add Question (Text)</Label>
            <textarea id="assignment-question" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Type the question or a brief description here…" className={TEXTAREA} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assignment-file" className="text-xs">Upload Question (File)</Label>
            <div className="flex items-center gap-2">
              <input id="assignment-file" type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onChange={(e) => void upload(e)} disabled={uploading} className="text-xs" />
              {uploading ? <span className="text-xs text-muted-foreground">Uploading…</span> : null}
            </div>
            {file ? (
              <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-2 py-1 text-xs">
                <a href={file} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{fileName || file}</a>
                <button type="button" className="ml-2 text-destructive hover:underline" onClick={() => { setFile(''); setFileName(''); }}>Remove</button>
              </div>
            ) : null}
            <p className="text-[11px] text-muted-foreground">PDF, DOC, image, or any file with the questions.</p>
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="assignment-marks">Total Marks</Label>
            <Input id="assignment-marks" type="number" min={0} value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="assignment-due">Due Date *</Label>
            <DmyDateInput id="assignment-due" value={dueDate} onChange={setDueDate} minYear={thisYear - 2} maxYear={thisYear + 2} />
          </div>
          <div className="space-y-1.5">
            <Label>From Time</Label>
            <ClassTimeInput value={fromTime} onChange={setFromTime} />
          </div>
          <div className="space-y-1.5">
            <Label>Due Time</Label>
            <ClassTimeInput value={dueTime} onChange={setDueTime} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Instructions</Label>
          <RichTextEditor value={instructions} onChange={setInstructions} />
        </div>
      </div>
    </DialogShell>
  );
}

/** Marks + remarks for one submission, via /admin/cohorts/grade_submission. */
export function GradeDialog({
  api, token, submission, assignmentMarks, onClose, onSaved,
}: { api: Api; token: string; submission: Record<string, unknown>; assignmentMarks: number; onClose: () => void; onSaved: () => void }) {
  const [marks, setMarks] = useState(asString(submission.marks));
  const [remarks, setRemarks] = useState(asString(submission.remarks));
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await api.gradeAssignmentSubmission(token, asString(submission.id) || asString(submission._id), marks, remarks);
      toast.success(asString(res.message) || 'Grade saved');
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save grade');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogShell
      open
      onClose={onClose}
      title="Edit Remarks"
      description={asString(submission.student_name) || undefined}
      onSubmit={() => void submit()}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting || !marks || !remarks}>{submitting ? 'Saving…' : 'Save'}</Button>
        </>
      )}
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="grade-marks">Marks * <span className="text-muted-foreground">(Assignment Mark: {assignmentMarks})</span></Label>
          <Input id="grade-marks" type="number" value={marks} onChange={(e) => setMarks(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="grade-remarks">Remarks *</Label>
          <Input id="grade-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
      </div>
    </DialogShell>
  );
}
