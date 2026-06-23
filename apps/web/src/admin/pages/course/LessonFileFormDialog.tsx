import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { FileUpload } from '../../shared/components/FileUpload.js';
import { RichTextEditor } from '../../shared/components/RichTextEditor.js';
import { titleCaseEachWord } from '@/lib/text-format';
import {
  type QuizQuestion,
  emptyQuizQuestion,
  parseQuizCsv,
  downloadQuizCsvTemplate,
} from '../../shared/utils/quiz-csv.js';

export type LessonFileType = 'video' | 'audio' | 'article' | 'document' | 'quiz';

const FILE_TYPE_LABEL: Record<LessonFileType, string> = {
  video: 'Video',
  audio: 'Audio',
  article: 'Article',
  document: 'Document',
  quiz: 'Quiz',
};

const textareaClass =
  'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface FileForm {
  title: string;
  summary: string;
  duration: string;
  video_url: string;
  audio_file: string;
  attachment: string;
  thumbnail: string;
  language: string;
  free: boolean;
}

const emptyFileForm: FileForm = {
  title: '', summary: '', duration: '', video_url: '', audio_file: '',
  attachment: '', thumbnail: '', language: '', free: false,
};

export interface LessonFileFormDialogProps {
  api: AdminPageProps['api'];
  token: string;
  lessonId: string;
  open: boolean;
  type: LessonFileType;
  /** Existing lesson_files row to edit, or null to add a new file. */
  editingFile: Record<string, unknown> | null;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Add / edit one lesson_files row (video, audio, article, document or quiz)
 * directly on a lesson. Self-contained: owns its own form + quiz-question
 * state so it can be dropped into any lesson surface. Mirrors the field set of
 * the course_new Lesson Builder so lesson-wise courses get the same authoring
 * power (Naji 2026-06-24 — "no option to tag any lessons or content").
 */
export function LessonFileFormDialog({
  api, token, lessonId, open, type, editingFile, onClose, onSaved,
}: LessonFileFormDialogProps) {
  const [form, setForm] = useState<FileForm>(emptyFileForm);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const editingId = editingFile ? asString(editingFile.id) : '';

  // Populate (or reset) the form whenever the dialog opens or the target
  // file/type changes. Form state is otherwise untouched while typing.
  useEffect(() => {
    if (!open) return;
    if (editingFile) {
      setForm({
        title: asString(editingFile.title),
        summary: asString(editingFile.summary),
        duration: asString(editingFile.duration),
        video_url: asString(editingFile.video_url),
        audio_file: asString(editingFile.audio_file),
        attachment: asString(editingFile.attachment),
        thumbnail: asString(editingFile.thumbnail),
        language: asString(editingFile.languages) || asString(editingFile.language),
        free:
          editingFile.free === true || editingFile.free === 1 ||
          editingFile.free === '1' || editingFile.free === 'on',
      });
    } else {
      setForm(emptyFileForm);
    }

    if (type === 'quiz') {
      if (editingId) {
        setQuizLoading(true);
        void api.listLessonQuizQuestions(token, editingId)
          .then((rows) => {
            const loaded: QuizQuestion[] = rows.map((r) => ({
              question: asString(r.question),
              option_a: asString(r.option_a),
              option_b: asString(r.option_b),
              option_c: asString(r.option_c),
              option_d: asString(r.option_d),
              correct_answer: (asString(r.correct_answer).toUpperCase() || 'A') as 'A' | 'B' | 'C' | 'D',
            }));
            setQuizQuestions(loaded.length > 0 ? loaded : [{ ...emptyQuizQuestion }]);
          })
          .catch(() => setQuizQuestions([{ ...emptyQuizQuestion }]))
          .finally(() => setQuizLoading(false));
      } else {
        setQuizQuestions([{ ...emptyQuizQuestion }]);
      }
    } else {
      setQuizQuestions([]);
    }
  }, [open, editingId, type, editingFile, api, token]);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Please enter a title.'); return; }
    setSaving(true);
    try {
      const payload = {
        lesson_id: lessonId,
        title: form.title.trim(),
        summary: form.summary.trim(),
        duration: form.duration.trim(),
        lesson_type: type,
        video_url: form.video_url.trim(),
        attachment: form.attachment.trim(),
        audio_file: form.audio_file.trim(),
        thumbnail: form.thumbnail.trim(),
        language: form.language.trim(),
        free: form.free,
      };
      let savedFileId = editingId;
      if (editingId) {
        await api.editLessonFile(token, editingId, payload);
      } else {
        const result = await api.addLessonFile(token, payload);
        const data = (result as { data?: unknown }).data;
        const newIdRaw =
          data && typeof data === 'object' && 'id' in data
            ? (data as Record<string, unknown>).id
            : undefined;
        savedFileId = typeof newIdRaw === 'number' || typeof newIdRaw === 'string' ? String(newIdRaw) : '';
      }

      if (type === 'quiz' && !savedFileId) {
        throw new Error('Server did not return a file id — quiz questions were not saved. Please try again.');
      }
      if (type === 'quiz' && savedFileId) {
        const cleaned = quizQuestions
          .filter((q) => q.question.trim() !== '')
          .map((q) => ({
            question: q.question.trim(),
            option_a: q.option_a.trim(),
            option_b: q.option_b.trim(),
            option_c: q.option_c.trim(),
            option_d: q.option_d.trim(),
            correct_answer: q.correct_answer,
          }));
        await api.replaceLessonQuizQuestions(token, savedFileId, cleaned);
      }

      toast.success(editingId ? 'Content updated.' : 'Content added.');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto"
        style={{ width: 'min(640px, calc(100vw - 2rem))', maxWidth: 'min(640px, calc(100vw - 2rem))' }}
      >
        <form onSubmit={(e) => { e.preventDefault(); void handleSave(); }}>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Add'} {FILE_TYPE_LABEL[type]}</DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto py-2">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) setForm((f) => ({ ...f, title: next })); }}
                placeholder={`${FILE_TYPE_LABEL[type]} title`}
              />
            </div>

            {type === 'video' && (
              <div className="space-y-2">
                <Label>Video URL</Label>
                <Input
                  value={form.video_url}
                  onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))}
                  placeholder="https://vimeo.com/… or https://youtu.be/…"
                />
                <p className="text-[11px] text-slate-500">Vimeo / YouTube share URLs auto-embed in the player.</p>
              </div>
            )}

            {type === 'audio' && (
              <div className="space-y-2">
                <Label>Audio File</Label>
                <FileUpload
                  value={form.audio_file}
                  onChange={(url) => setForm((f) => ({ ...f, audio_file: url }))}
                  onUpload={async (file) => { const r = await api.uploadFile(token, file); return r.url; }}
                  accept="audio/*"
                  placeholder="Upload audio or paste a URL"
                />
              </div>
            )}

            {type === 'document' && (
              <div className="space-y-2">
                <Label>Document File</Label>
                <FileUpload
                  value={form.attachment}
                  onChange={(url) => setForm((f) => ({ ...f, attachment: url }))}
                  onUpload={async (file) => { const r = await api.uploadFile(token, file); return r.url; }}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
                  placeholder="Upload file or paste a URL"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Thumbnail / Banner Image (optional)</Label>
              <FileUpload
                value={form.thumbnail}
                onChange={(url) => setForm((f) => ({ ...f, thumbnail: url }))}
                onUpload={async (file) => { const r = await api.uploadFile(token, file); return r.url; }}
                accept="image/*"
                placeholder="Upload image or paste a URL"
              />
            </div>

            {type === 'article' ? (
              <div className="space-y-2">
                <Label>Article Content</Label>
                <RichTextEditor
                  value={form.summary}
                  onChange={(html) => setForm((f) => ({ ...f, summary: html }))}
                />
              </div>
            ) : type !== 'quiz' ? (
              <div className="space-y-2">
                <Label>Summary</Label>
                <textarea
                  className={textareaClass}
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  placeholder="Brief summary"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Quiz Description (optional)</Label>
                  <textarea
                    className={textareaClass}
                    value={form.summary}
                    onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                    placeholder="Short description shown above the questions"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Label>Questions ({quizQuestions.length})</Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const text = typeof reader.result === 'string' ? reader.result : '';
                          const parsed = parseQuizCsv(text);
                          if (parsed.length === 0) {
                            toast.error('No questions found in CSV. Expected columns: question, option_a, option_b, option_c, option_d, correct_answer');
                            return;
                          }
                          setQuizQuestions((prev) => {
                            const existing = prev.filter((q) => q.question.trim() !== '');
                            return [...existing, ...parsed];
                          });
                          toast.success(`Imported ${parsed.length} question${parsed.length === 1 ? '' : 's'}.`);
                        };
                        reader.readAsText(file);
                        e.target.value = '';
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={downloadQuizCsvTemplate}>
                      Download CSV Template
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => csvInputRef.current?.click()}>
                      Upload CSV
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setQuizQuestions((prev) => [...prev, { ...emptyQuizQuestion }])}>
                      + Add Question
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  CSV columns: <code>question, option_a, option_b, option_c, option_d, correct_answer</code> (correct_answer = A/B/C/D).
                </p>

                {quizLoading ? (
                  <p className="text-xs text-slate-500">Loading questions…</p>
                ) : quizQuestions.length === 0 ? (
                  <p className="text-xs text-slate-400">No questions yet. Click + Add Question or upload a CSV.</p>
                ) : (
                  <ol className="space-y-3">
                    {quizQuestions.map((q, idx) => (
                      <li key={idx} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-600">Q{idx + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => setQuizQuestions((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            Remove
                          </Button>
                        </div>
                        <textarea
                          className={textareaClass}
                          value={q.question}
                          onChange={(e) => setQuizQuestions((prev) => prev.map((x, i) => i === idx ? { ...x, question: e.target.value } : x))}
                          placeholder="Question text"
                        />
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                            const key = `option_${letter.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d';
                            return (
                              <div key={letter} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`lwq-${idx}-correct`}
                                  className="size-4"
                                  checked={q.correct_answer === letter}
                                  onChange={() => setQuizQuestions((prev) => prev.map((x, i) => i === idx ? { ...x, correct_answer: letter } : x))}
                                  aria-label={`Mark ${letter} as correct`}
                                />
                                <Input
                                  value={q[key]}
                                  onChange={(e) => setQuizQuestions((prev) => prev.map((x, i) => i === idx ? { ...x, [key]: e.target.value } : x))}
                                  placeholder={`Option ${letter}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              {(type === 'video' || type === 'audio') && (
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Input
                    value={form.duration}
                    onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                    placeholder="e.g. 10:30"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Language</Label>
                <Input
                  value={form.language}
                  onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                  placeholder="e.g. English"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.free}
                onChange={(e) => setForm((f) => ({ ...f, free: e.target.checked }))}
                className="size-4 rounded border-gray-300"
              />
              Free preview (accessible without enrolment)
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            {/* Block submit until quiz questions have loaded for an edit —
                otherwise an early click would replace them with an empty set. */}
            <Button type="submit" disabled={saving || quizLoading || !form.title.trim()}>
              {saving ? 'Saving…' : quizLoading ? 'Loading…' : editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
