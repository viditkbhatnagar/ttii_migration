import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, ArrowLeft, CheckCircle2, Lock, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { asString, formatDate } from '../../shared/utils/admin-data-utils.js';
import {
  KIND_LABEL,
  MAX_OPTIONS,
  MIN_OPTIONS,
  buildPayload,
  changeKind,
  emptyForm,
  formFromQuestion,
  optionLetter,
  type QuestionForm,
  type QuestionKind,
  type QuestionRow,
  type SubjectRow,
} from './question-bank-model.js';

// The full Add / Edit / View question screen from Naji's QuestionBankModule,
// on our fields: type (MCQ, True / False = an MCQ with True and False,
// Descriptive), positional options A–F with one correct answer, hint, and
// solution / explanation (the model answer for a descriptive question).
// Difficulty, marks, status, tags, keywords, Bloom's level and the rich-text
// toolbar of his mock-up have no column in question_bank and are left out.
//
// A question in a PUBLISHED exam is graded against its current row, so the
// server refuses type / option / answer changes for it; the form locks those
// controls up front and says why, and only the wording, hint and solution
// stay editable.

export type FormMode = 'add' | 'edit' | 'view';

const FIELD = 'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-70';

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

export function QuestionFormView({
  mode, subject, question, authorName, api, token, onBack, onSaved, onEdit, onDelete,
}: {
  mode: FormMode;
  subject: SubjectRow;
  question: QuestionRow | null;
  authorName: (id: number) => string;
  api: AdminPortalApi;
  token: string;
  onBack: () => void;
  onSaved: () => void;
  onEdit: (id: number) => void;
  onDelete: (q: QuestionRow) => void;
}) {
  const defaultCourse = String(subject.courses[0]?.id ?? '');
  const [form, setForm] = useState<QuestionForm>(() => (question ? formFromQuestion(question, defaultCourse) : emptyForm(defaultCourse)));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lessons, setLessons] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    api.loadLessons(token, String(subject.id))
      .then((rows) => setLessons(rows.map((l) => ({ id: asString(l.id), title: asString(l.title) })).filter((l) => l.id && l.title)))
      .catch(() => setLessons([]));
  }, [api, token, subject.id]);

  const readOnly = mode === 'view';
  const published = question?.usedInPublished ?? [];
  const locked = mode === 'edit' && published.length > 0;
  const answerDisabled = readOnly || locked;
  const set = (patch: Partial<QuestionForm>) => setForm((f) => ({ ...f, ...patch }));
  const setOption = (i: number, value: string) => setForm((f) => ({ ...f, options: f.options.map((o, j) => (j === i ? value : o)) }));
  const removeOption = (i: number) => setForm((f) => {
    const options = f.options.filter((_, j) => j !== i);
    // Positional answer: removing an option before it moves it up one.
    const correct = f.correct === null || f.correct === i ? null : f.correct > i ? f.correct - 1 : f.correct;
    return { ...f, options, correct };
  });

  const save = async () => {
    const built = buildPayload(form);
    if (!built.ok) { setError(built.message); return; }
    setError('');
    setSaving(true);
    try {
      const input = { ...built.payload, subjectId: String(subject.id) };
      const res = question ? await api.editQuestion(token, String(question.id), input) : await api.addQuestion(token, input);
      const message = asString(res.message);
      if (res.status !== 1) { setError(message || 'Could not save the question.'); return; }
      toast.success(message || (question ? 'Question updated.' : 'Question added.'));
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the question.');
    } finally {
      setSaving(false);
    }
  };

  const title = mode === 'add' ? 'Add Question' : mode === 'edit' ? 'Edit Question' : 'View Question';
  const isChoice = form.kind !== 'descriptive';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onBack}>
          <ArrowLeft aria-hidden="true" className="size-4" /> Back to {subject.title}
        </Button>
        <div className="flex gap-2">
          {mode === 'view' && question ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onEdit(question.id)}>
              <Pencil aria-hidden="true" className="size-4" /> Edit
            </Button>
          ) : null}
          {mode !== 'add' && question ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-rose-600 hover:text-rose-700"
              disabled={published.length > 0}
              title={published.length > 0 ? 'In a published exam — cannot be deleted' : 'Delete'}
              onClick={() => onDelete(question)}
            >
              <Trash2 aria-hidden="true" className="size-4" /> Delete
            </Button>
          ) : null}
        </div>
      </div>

      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
          <Sparkles aria-hidden="true" className="size-3" /> Question Bank{subject.code ? ` · ${subject.code}` : ''}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {subject.title}{subject.courses.length > 0 ? ` · ${subject.courses.map((c) => c.title).join(', ')}` : ''}
        </p>
      </div>

      {error ? (
        <Card role="alert" className="gap-0 border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-2 text-sm text-rose-700">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        </Card>
      ) : null}

      {published.length > 0 && !readOnly ? (
        <Card className="gap-0 border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2 text-sm text-amber-800">
            <Lock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              This question is in {published.length === 1 ? 'a published exam' : `${published.length} published exams`} ({published.join(', ')}).
              Its type, options and answer are locked so students are all graded alike — fix the wording, hint or solution, or add a corrected copy.
            </p>
          </div>
        </Card>
      ) : null}

      <Card className="gap-0 p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-semibold text-foreground">Basic Information</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Subject" htmlFor="qf-subject">
            <Input id="qf-subject" value={subject.code ? `${subject.code} · ${subject.title}` : subject.title} disabled />
          </Field>
          <Field label="Question Type" htmlFor="qf-type">
            <select id="qf-type" className={cn(FIELD, 'h-9 py-0')} value={form.kind} disabled={answerDisabled} onChange={(e) => setForm((f) => changeKind(f, e.target.value as QuestionKind))}>
              {(Object.keys(KIND_LABEL) as QuestionKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </Field>
          <Field label="Course" htmlFor="qf-course">
            <select id="qf-course" className={cn(FIELD, 'h-9 py-0')} value={form.courseId} disabled={readOnly || subject.courses.length === 0} onChange={(e) => set({ courseId: e.target.value })}>
              {subject.courses.length === 0 ? <option value="">Not linked to a course</option> : null}
              {subject.courses.map((c) => <option key={c.id} value={String(c.id)}>{c.title}</option>)}
            </select>
          </Field>
          <Field label="Lesson (optional)" htmlFor="qf-lesson">
            <select id="qf-lesson" className={cn(FIELD, 'h-9 py-0')} value={form.lessonId} disabled={readOnly} onChange={(e) => set({ lessonId: e.target.value })}>
              <option value="">No lesson</option>
              {form.lessonId && !lessons.some((l) => l.id === form.lessonId) ? <option value={form.lessonId}>{question?.lessonTitle || `Lesson ${form.lessonId}`}</option> : null}
              {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <Card className="gap-0 p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-semibold text-foreground">Question Details</h2>
        <textarea
          aria-label="Question text"
          className={cn(FIELD, 'mt-3 min-h-[140px]')}
          placeholder="Enter question text"
          value={form.title}
          disabled={readOnly}
          onChange={(e) => set({ title: e.target.value })}
        />
      </Card>

      <Card className="gap-0 p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-semibold text-foreground">Answer Configuration</h2>
        {isChoice ? (
          <div className="mt-4 space-y-2" role="radiogroup" aria-label="Correct answer">
            {form.options.map((o, i) => (
              <div key={i} className={cn('flex items-center gap-2 rounded-lg border bg-card p-2', form.correct === i ? 'border-emerald-300 bg-emerald-50/50' : 'border-border')}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold">{optionLetter(i)}</span>
                <Input
                  aria-label={`Option ${optionLetter(i)}`}
                  className="min-w-0 flex-1"
                  value={o}
                  disabled={answerDisabled || form.kind === 'tf'}
                  placeholder={`Option ${optionLetter(i)}`}
                  onChange={(e) => setOption(i, e.target.value)}
                />
                <label className={cn('flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs', answerDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer')}>
                  <input type="radio" name="qf-correct" className="size-3.5 accent-primary" checked={form.correct === i} disabled={answerDisabled} onChange={() => set({ correct: i })} />
                  Correct
                </label>
                {!answerDisabled && form.kind === 'mcq' && form.options.length > MIN_OPTIONS ? (
                  <Button size="icon" variant="ghost" className="size-8 shrink-0" aria-label={`Remove option ${optionLetter(i)}`} onClick={() => removeOption(i)}>
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                ) : null}
              </div>
            ))}
            {!answerDisabled && form.kind === 'mcq' ? (
              <Button size="sm" variant="outline" className="gap-1.5" disabled={form.options.length >= MAX_OPTIONS} onClick={() => set({ options: [...form.options, ''] })}>
                <Plus aria-hidden="true" className="size-4" /> Add option
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">One correct answer. Up to {MAX_OPTIONS} options; a blank option in the middle must be filled or removed.</p>
          </div>
        ) : (
          <div className="mt-4">
            <Field label="Suggested Answer (model answer for evaluators)" htmlFor="qf-model">
              <textarea id="qf-model" className={cn(FIELD, 'min-h-[120px]')} value={form.solution} disabled={readOnly} onChange={(e) => set({ solution: e.target.value })} />
            </Field>
          </div>
        )}
      </Card>

      <Card className="gap-0 p-5 shadow-[var(--shadow-soft)]">
        <h2 className="text-sm font-semibold text-foreground">Additional Information</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {isChoice ? (
            <Field label="Explanation / solution (optional)" htmlFor="qf-solution">
              <textarea id="qf-solution" className={cn(FIELD, 'min-h-[90px]')} value={form.solution} disabled={readOnly} onChange={(e) => set({ solution: e.target.value })} />
            </Field>
          ) : null}
          <Field label="Hint (optional)" htmlFor="qf-hint">
            <textarea id="qf-hint" className={cn(FIELD, 'min-h-[90px]')} value={form.hint} disabled={readOnly} onChange={(e) => set({ hint: e.target.value })} />
          </Field>
        </div>
      </Card>

      {mode === 'view' && question ? (
        <Card className="gap-0 p-5 shadow-[var(--shadow-soft)]">
          <h2 className="text-sm font-semibold text-foreground">Meta</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Question ID</dt><dd className="font-mono text-foreground">{question.code}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Created By</dt><dd className="text-foreground">{authorName(question.createdBy)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Created On</dt><dd className="text-foreground">{formatDate(question.createdAt) || '—'}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide text-muted-foreground">Last Updated</dt><dd className="text-foreground">{formatDate(question.updatedAt) || '—'}</dd></div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Used in exams</dt>
              <dd className="text-foreground">{question.usedInExams}{published.length > 0 ? ` (published: ${published.join(', ')})` : ''}</dd>
            </div>
          </dl>
        </Card>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" onClick={onBack} disabled={saving}>Cancel</Button>
          <Button className="gap-1.5" onClick={() => { void save(); }} disabled={saving}>
            <CheckCircle2 aria-hidden="true" className="size-4" /> {saving ? 'Saving…' : 'Save Question'}
          </Button>
        </div>
      )}
    </div>
  );
}
