import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Plus, Trash2, Upload as UploadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { downloadCsv } from '@/lib/csv';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseEachWord } from '@/lib/text-format';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { FileUpload } from '../../shared/components/FileUpload.js';
import { RichTextEditor } from '../../shared/components/RichTextEditor.js';
import { SearchableSelect } from '../../shared/components/SearchableSelect.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import {
  dialogStyle, envelopeMessage, errorMessage,
} from '../course/catalog-list-model.js';
import { DIALOG_CLASS, Field, SELECT_CLASS, TEXTAREA_CLASS } from '../course/catalog-ui.js';
import {
  ANSWER_LETTERS, EMPTY_QUESTION, QUIZ_CSV_TEMPLATE, assetPayload, moveQuestion, parseQuestionCsv,
  type AssetForm, type LessonPicker, type QuestionForm,
} from './content-library-model.js';

// New / Edit Content Asset (Naji's NewAssetDialog) — the same fields, uploads,
// quiz builder (CSV bulk upload, reorder, correct answer) and payload as
// before. Saves now toast the server's message and failures instead of
// closing silently.

export interface AssetFormDialogProps {
  open: boolean;
  editId: string;
  initial: AssetForm;
  languages: Record<string, unknown>[];
  subjectChoices: string[];
  picker: LessonPicker;
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}

type OptionKey = 'option_a' | 'option_b' | 'option_c' | 'option_d';

export function AssetFormDialog({ open, editId, initial, languages, subjectChoices, picker, api, token, onClose, onSaved }: AssetFormDialogProps) {
  const [form, setForm] = useState<AssetForm>(initial);
  const [saving, setSaving] = useState(false);
  const bulkInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (open) setForm(initial); }, [open, initial]);

  const upload = useCallback(async (file: File) => (await api.uploadFile(token, file)).url, [api, token]);
  const patch = (p: Partial<AssetForm>) => setForm((f) => ({ ...f, ...p }));
  const setQuestions = (fn: (qs: QuestionForm[]) => QuestionForm[]) => setForm((f) => ({ ...f, questions: fn(f.questions) }));
  const updateQuestion = (index: number, p: Partial<QuestionForm>) => setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...p } : q)));

  const save = useCallback(async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = assetPayload(form);
      const res = editId ? await api.updateContentAsset(token, editId, payload) : await api.createContentAsset(token, payload);
      toast.success(envelopeMessage(res, editId ? 'Asset updated.' : 'Asset created.'));
      onClose();
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err, 'Could not save the asset.'));
    } finally {
      setSaving(false);
    }
  }, [api, token, editId, form, onClose, onSaved]);

  /** Bulk upload of quiz questions from a CSV (Naji 2026-04-30). */
  const onBulkFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (!text.trim()) { toast.error('CSV is empty.'); return; }
      const { questions, errors } = parseQuestionCsv(text);
      if (questions.length === 0) { toast.error(errors[0] ?? 'No valid questions found.'); return; }
      setQuestions((qs) => [...qs, ...questions]);
      if (errors.length > 0) {
        toast.warning(`${questions.length} questions imported. ${errors.length} skipped: ${errors.slice(0, 2).join(' ')}${errors.length > 2 ? '…' : ''}`);
      } else {
        toast.success(`${questions.length} questions imported.`);
      }
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to parse CSV.'));
    } finally {
      if (bulkInput.current) bulkInput.current.value = '';
    }
  }, []);

  const lessonValue = form.lesson_id ? (picker.idToLabel.get(form.lesson_id) ?? form.lesson_tag) : form.lesson_tag;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className={DIALOG_CLASS} style={dialogStyle(720)}>
        <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6 text-left">
            <DialogTitle>{editId ? 'Edit Asset' : 'New Content Asset'}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <Field label="Title" htmlFor="asset-title" required>
              <Input
                id="asset-title"
                value={form.title}
                onChange={(e) => patch({ title: e.target.value })}
                onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) patch({ title: next }); }}
                placeholder="Asset title"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Type" htmlFor="asset-type">
                <select id="asset-type" className={SELECT_CLASS} value={form.asset_type} onChange={(e) => patch({ asset_type: e.target.value })}>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="article">Article</option>
                  <option value="document">Document</option>
                  <option value="quiz">Quiz</option>
                </select>
              </Field>
              <Field label="Duration" htmlFor="asset-duration">
                <Input id="asset-duration" value={form.duration} onChange={(e) => patch({ duration: e.target.value })} placeholder="e.g. 10:30" />
              </Field>
              <Field label="Language" htmlFor="asset-language">
                <select id="asset-language" className={SELECT_CLASS} value={form.language} onChange={(e) => patch({ language: e.target.value })}>
                  <option value="">— Any —</option>
                  {languages.map((l) => <option key={asString(l.id)} value={asString(l.title)}>{asString(l.title)}</option>)}
                </select>
              </Field>
            </div>

            {/* Risha UAT 2026-05-30 — both tags are pick-from-list. Picking a
                lesson stores the real lesson_id link and fills the Subject Tag;
                free typing still works so legacy text tags keep working. */}
            <div className="grid gap-3 sm:grid-cols-2">
              <SearchableSelect
                label="Subject Tag"
                value={form.subject_tag}
                options={subjectChoices}
                placeholder="Choose or type a subject…"
                onChange={(v) => patch({ subject_tag: v })}
              />
              <SearchableSelect
                label="Lesson Tag"
                value={lessonValue}
                options={picker.options}
                placeholder="Choose or type a lesson…"
                onChange={(label) => {
                  const id = picker.labelToId.get(label);
                  if (id) {
                    setForm((f) => ({
                      ...f,
                      lesson_id: id,
                      lesson_tag: picker.idToTitle.get(id) || label,
                      subject_tag: picker.idToSubject.get(id) || f.subject_tag,
                    }));
                  } else {
                    // Free-typed text that matches no lesson: keep it as a plain
                    // text tag and drop any previous hard link.
                    patch({ lesson_tag: label, lesson_id: '' });
                  }
                }}
              />
            </div>

            {form.asset_type === 'video' ? (
              <Field label="Video URL" htmlFor="asset-video">
                <Input id="asset-video" value={form.video_url} onChange={(e) => patch({ video_url: e.target.value })} placeholder="https://..." />
              </Field>
            ) : null}
            <Field label="Thumbnail / Banner Image (optional)">
              <FileUpload value={form.thumbnail} onChange={(url) => patch({ thumbnail: url })} onUpload={upload} accept="image/*" placeholder="Upload an image or paste a URL" />
            </Field>
            {form.asset_type === 'audio' ? (
              <Field label="Audio File">
                <FileUpload value={form.audio_file} onChange={(url) => patch({ audio_file: url })} onUpload={upload} accept="audio/*" placeholder="Upload audio or enter URL" />
              </Field>
            ) : null}
            {form.asset_type === 'document' ? (
              <Field label="File">
                <FileUpload value={form.attachment} onChange={(url) => patch({ attachment: url })} onUpload={upload} accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*" placeholder="Upload file or enter URL" />
              </Field>
            ) : null}
            {form.asset_type === 'article' ? (
              <Field label="Article Content">
                <RichTextEditor value={form.summary} onChange={(html) => patch({ summary: html })} onUploadImage={upload} />
              </Field>
            ) : form.asset_type !== 'quiz' ? (
              <Field label="Summary" htmlFor="asset-summary">
                <textarea id="asset-summary" rows={3} className={TEXTAREA_CLASS} value={form.summary} onChange={(e) => patch({ summary: e.target.value })} />
              </Field>
            ) : null}
            <Field label="Tags (comma-separated)" htmlFor="asset-tags">
              <Input id="asset-tags" value={form.tags} onChange={(e) => patch({ tags: e.target.value })} placeholder="e.g. montessori, child-development" />
            </Field>

            {form.asset_type === 'quiz' ? (
              <section className="space-y-4 rounded-xl border border-border p-4">
                <h4 className="text-sm font-semibold">Quiz Settings</h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Time Limit (min)" htmlFor="quiz-time">
                    <Input id="quiz-time" type="number" min="0" value={form.time_limit_minutes} onChange={(e) => patch({ time_limit_minutes: e.target.value })} placeholder="0" />
                  </Field>
                  <Field label="Attempts" htmlFor="quiz-attempts">
                    <Input id="quiz-attempts" type="number" min="1" value={form.attempts_allowed} onChange={(e) => patch({ attempts_allowed: e.target.value })} placeholder="1" />
                  </Field>
                  <Field label="Pass Marks" htmlFor="quiz-pass">
                    <Input id="quiz-pass" type="number" min="0" value={form.pass_marks} onChange={(e) => patch({ pass_marks: e.target.value })} placeholder="0" />
                  </Field>
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                  <input type="checkbox" className="size-4 rounded border-input" checked={form.shuffle_questions} onChange={(e) => patch({ shuffle_questions: e.target.checked })} />
                  <span>Shuffle questions for each attempt</span>
                </label>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Questions ({form.questions.length})</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => downloadCsv('quiz-questions-template.csv', QUIZ_CSV_TEMPLATE)} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
                      Download CSV template
                    </button>
                    <Button type="button" size="sm" variant="outline" onClick={() => bulkInput.current?.click()}>
                      <UploadIcon aria-hidden="true" className="mr-1 size-3" /> Bulk Upload
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setQuestions((qs) => [...qs, { ...EMPTY_QUESTION }])}>
                      <Plus aria-hidden="true" className="mr-1 size-3" /> Add Question
                    </Button>
                    <input ref={bulkInput} type="file" accept=".csv,text/csv" aria-label="Upload quiz questions CSV" className="hidden" onChange={(e) => { void onBulkFile(e); }} />
                  </div>
                </div>

                {form.questions.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">No questions added yet.</p>
                ) : (
                  <div className="space-y-3">
                    {form.questions.map((q, idx) => (
                      <div key={idx} className="space-y-2 rounded-lg border border-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-muted-foreground">Q{idx + 1}</span>
                          <div className="flex gap-1">
                            <Button type="button" size="icon" variant="ghost" className="size-7" aria-label="Move question up" disabled={idx === 0} onClick={() => setQuestions((qs) => moveQuestion(qs, idx, -1))}>
                              <ChevronUp aria-hidden="true" className="size-3" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="size-7" aria-label="Move question down" disabled={idx === form.questions.length - 1} onClick={() => setQuestions((qs) => moveQuestion(qs, idx, 1))}>
                              <ChevronDown aria-hidden="true" className="size-3" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" className="size-7" aria-label="Remove question" onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== idx))}>
                              <Trash2 aria-hidden="true" className="size-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <textarea
                          aria-label={`Question ${idx + 1}`}
                          className={`${TEXTAREA_CLASS} min-h-[60px]`}
                          value={q.question}
                          placeholder="Question text"
                          onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          {ANSWER_LETTERS.map((letter) => {
                            const key = `option_${letter.toLowerCase()}` as OptionKey;
                            return (
                              <label key={letter} className="flex items-center gap-2 text-sm">
                                <input type="radio" name={`correct-${idx}`} aria-label={`Option ${letter} is correct`} checked={q.correct_answer === letter} onChange={() => updateQuestion(idx, { correct_answer: letter })} />
                                <span className="w-4 font-semibold">{letter}</span>
                                <Input value={q[key]} onChange={(e) => updateQuestion(idx, { [key]: e.target.value })} placeholder={`Option ${letter}`} />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/30 px-6 py-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>{saving ? 'Saving...' : editId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
