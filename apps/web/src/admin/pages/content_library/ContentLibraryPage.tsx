import { useState, useMemo, useCallback } from 'react';
import { Eye, Check, Download, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminFilterBar, type FilterField } from '../../shared/components/AdminFilterBar.js';
import { FileUpload } from '../../shared/components/FileUpload.js';
import { RichTextEditor } from '../../shared/components/RichTextEditor.js';
import { useConfirm } from '@/components/confirm-dialog';

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const typeColors: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  video: 'default', audio: 'secondary', article: 'outline', document: 'outline', quiz: 'destructive',
};

type CorrectAnswer = 'A' | 'B' | 'C' | 'D';

interface QuestionForm {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: CorrectAnswer;
}

interface AssetForm {
  title: string;
  summary: string;
  asset_type: string;
  subject_tag: string;
  lesson_tag: string;
  language: string;
  duration: string;
  video_url: string;
  attachment: string;
  audio_file: string;
  tags: string;
  time_limit_minutes: string;
  attempts_allowed: string;
  pass_marks: string;
  shuffle_questions: boolean;
  questions: QuestionForm[];
}

const emptyQuestion: QuestionForm = {
  question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A',
};

const emptyForm: AssetForm = {
  title: '', summary: '', asset_type: 'video', subject_tag: '', lesson_tag: '', language: '',
  duration: '', video_url: '', attachment: '', audio_file: '', tags: '',
  time_limit_minutes: '', attempts_allowed: '', pass_marks: '', shuffle_questions: false,
  questions: [],
};

function isDocPdf(url: string): boolean {
  return /\.pdf($|\?)/i.test(url);
}

export default function ContentLibraryPage({ api, session }: AdminPageProps) {
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState('');
  const [form, setForm] = useState<AssetForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterSubjectTag, setFilterSubjectTag] = useState('');
  const [filterLessonTag, setFilterLessonTag] = useState('');
  const [filterCreatedBy, setFilterCreatedBy] = useState('');
  const [search, setSearch] = useState('');
  const [previewAsset, setPreviewAsset] = useState<Record<string, unknown> | null>(null);

  const apiFilters = useMemo(() => {
    // Backend currently only filters server-side by asset_type. The other
    // filters apply client-side below.
    const f: Record<string, string> = {};
    if (filterType) f.asset_type = filterType;
    return Object.keys(f).length > 0 ? f : undefined;
  }, [filterType]);

  const { data, loading, error, reload } = useAdminPageData(
    () => api.listContentAssets(session.token, apiFilters),
    [filterType],
  );
  const { data: languagesData } = useAdminPageData(() => api.loadLanguages(session.token), []);

  const allRows = useMemo(() => toRecords(data), [data]);
  const languages = useMemo(() => toRecords(languagesData), [languagesData]);

  const rows = useMemo(() => {
    return allRows.filter((r) => {
      if (search) {
        const s = search.toLowerCase();
        const matches =
          asString(r.title).toLowerCase().includes(s) ||
          asString(r.content_id).toLowerCase().includes(s) ||
          asString(r.tags).toLowerCase().includes(s);
        if (!matches) return false;
      }
      if (filterSubjectTag && asString(r.subject_tag).toLowerCase() !== filterSubjectTag.toLowerCase()) return false;
      if (filterLessonTag && asString(r.lesson_tag).toLowerCase() !== filterLessonTag.toLowerCase()) return false;
      if (filterCreatedBy && asString(r.created_by_name).toLowerCase() !== filterCreatedBy.toLowerCase()) return false;
      return true;
    });
  }, [allRows, search, filterSubjectTag, filterLessonTag, filterCreatedBy]);

  const subjectTagOptions = useMemo(() => {
    const set = new Set(allRows.map((r) => asString(r.subject_tag)).filter(Boolean));
    return [...set].sort().map((t) => ({ label: t, value: t }));
  }, [allRows]);
  const lessonTagOptions = useMemo(() => {
    const set = new Set(allRows.map((r) => asString(r.lesson_tag)).filter(Boolean));
    return [...set].sort().map((t) => ({ label: t, value: t }));
  }, [allRows]);
  const createdByOptions = useMemo(() => {
    const set = new Set(allRows.map((r) => asString(r.created_by_name)).filter(Boolean));
    return [...set].sort().map((t) => ({ label: t, value: t }));
  }, [allRows]);

  const handleOpenAdd = useCallback(() => {
    setEditId('');
    setForm(emptyForm);
    setShowForm(true);
  }, []);

  const handleOpenEdit = useCallback(async (row: Record<string, unknown>) => {
    const id = asString(row.id);
    const asset = await api.getContentAsset(session.token, id);
    if (!asset) return;
    const timeLimit = Number(asset.time_limit_seconds ?? 0);
    const questionsRaw = Array.isArray(asset.questions) ? asset.questions as Record<string, unknown>[] : [];
    const questions: QuestionForm[] = questionsRaw.map((q) => ({
      question: asString(q.question),
      option_a: asString(q.option_a),
      option_b: asString(q.option_b),
      option_c: asString(q.option_c),
      option_d: asString(q.option_d),
      correct_answer: (asString(q.correct_answer).toUpperCase() as CorrectAnswer) || 'A',
    }));
    setEditId(id);
    setForm({
      title: asString(asset.title),
      summary: asString(asset.summary),
      asset_type: asString(asset.asset_type) || 'video',
      subject_tag: asString(asset.subject_tag),
      lesson_tag: asString(asset.lesson_tag),
      language: asString(asset.language),
      duration: asString(asset.duration),
      video_url: asString(asset.video_url),
      attachment: asString(asset.attachment),
      audio_file: asString(asset.audio_file),
      tags: asString(asset.tags),
      time_limit_minutes: timeLimit > 0 ? String(Math.floor(timeLimit / 60)) : '',
      attempts_allowed: asString(asset.attempts_allowed),
      pass_marks: asString(asset.pass_marks),
      shuffle_questions: Boolean(asset.shuffle_questions),
      questions,
    });
    setShowForm(true);
  }, [api, session.token]);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const timeLimitSec = form.time_limit_minutes ? Number(form.time_limit_minutes) * 60 : undefined;
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        summary: form.summary.trim() || undefined,
        asset_type: form.asset_type,
        subject_tag: form.subject_tag.trim() || undefined,
        lesson_tag: form.lesson_tag.trim() || undefined,
        language: form.language || undefined,
        duration: form.duration.trim() || undefined,
        video_url: form.video_url.trim() || undefined,
        attachment: form.attachment.trim() || undefined,
        audio_file: form.audio_file.trim() || undefined,
        tags: form.tags.trim() || undefined,
      };
      if (form.asset_type === 'quiz') {
        payload.time_limit_seconds = timeLimitSec;
        payload.attempts_allowed = form.attempts_allowed ? Number(form.attempts_allowed) : undefined;
        payload.pass_marks = form.pass_marks ? Number(form.pass_marks) : undefined;
        payload.shuffle_questions = form.shuffle_questions;
        payload.questions = form.questions
          .filter((q) => q.question.trim())
          .map((q, idx) => ({
            question: q.question.trim(),
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_answer: q.correct_answer,
            sort_order: idx,
          }));
      }
      if (editId) {
        await api.updateContentAsset(session.token, editId, payload);
      } else {
        await api.createContentAsset(session.token, payload);
      }
      setShowForm(false);
      setEditId('');
      setForm(emptyForm);
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, editId, form, reload]);

  const handleDelete = useCallback(async (row: Record<string, unknown>) => {
    if (!(await confirm({
      title: `Delete asset "${asString(row.title)}"?`,
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    }))) return;
    try {
      await api.deleteContentAsset(session.token, asString(row.id));
      reload();
    } catch { /* ignore */ }
  }, [api, session.token, reload, confirm]);

  const handlePreview = useCallback(async (row: Record<string, unknown>) => {
    // Show the list row immediately for fast feedback, then fetch the full
    // asset so the quiz preview can render its nested `questions` array
    // (which listAssets omits in favor of a question_count).
    setPreviewAsset(row);
    if (asString(row.asset_type) === 'quiz') {
      try {
        const full = await api.getContentAsset(session.token, asString(row.id));
        if (full) setPreviewAsset(full);
      } catch { /* keep the row-level preview */ }
    }
  }, [api, session.token]);

  const updateQuestion = useCallback((index: number, patch: Partial<QuestionForm>) => {
    setForm((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    }));
  }, []);

  const addQuestion = useCallback(() => {
    setForm((prev) => ({ ...prev, questions: [...prev.questions, { ...emptyQuestion }] }));
  }, []);

  const removeQuestion = useCallback((index: number) => {
    setForm((prev) => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) }));
  }, []);

  const moveQuestion = useCallback((index: number, dir: -1 | 1) => {
    setForm((prev) => {
      const next = [...prev.questions];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      const a = next[index];
      const b = next[target];
      if (!a || !b) return prev;
      next[index] = b;
      next[target] = a;
      return { ...prev, questions: next };
    });
  }, []);

  const columns: DataTableColumn[] = [
    { key: 'content_id', label: 'Content ID', render: (v, row) => asString(v) || `CA-${asString(row.id).padStart(5, '0')}` },
    { key: 'preview', label: 'Preview', render: (_v, row) => (
      <button type="button" className="text-gray-400 hover:text-blue-600" title="Preview" aria-label="Preview content" onClick={() => { void handlePreview(row); }}>
        <Eye className="h-4 w-4" aria-hidden="true" />
      </button>
    )},
    { key: 'title', label: 'Title', sortable: true },
    { key: 'asset_type', label: 'Type', render: (v) => (
      <Badge variant={typeColors[String(v)] ?? 'secondary'}>{String(v)}</Badge>
    )},
    { key: 'subject_tag', label: 'Subject Tag', render: (v) => asString(v) || '-' },
    { key: 'lesson_tag', label: 'Lesson Tag', render: (v) => asString(v) || '-' },
    { key: 'duration', label: 'Duration', render: (v) => asString(v) || '-' },
    { key: 'created_by_name', label: 'Created By', render: (v) => asString(v) || '-' },
    { key: 'created_at', label: 'Created On', render: (v) => {
      const str = asString(v);
      if (!str) return '-';
      const d = new Date(str);
      return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
    }},
  ];

  const actions: DataTableAction[] = [
    { label: 'Preview', onClick: (row) => { void handlePreview(row); } },
    { label: 'Edit', onClick: (row) => void handleOpenEdit(row) },
    { label: 'Delete', onClick: (row) => void handleDelete(row), variant: 'destructive' },
  ];

  if (loading) {
    return <PageLoader label="Loading content library..." />;
  }

  if (error) {
    return <Card><CardContent role="alert" className="py-8 text-center text-sm text-red-600">{error}</CardContent></Card>;
  }

  const previewType = previewAsset ? asString(previewAsset.asset_type) : '';
  const previewQuestions = previewAsset && Array.isArray(previewAsset.questions)
    ? previewAsset.questions as Record<string, unknown>[]
    : [];

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Content Library" addLabel="+ New Asset" onAdd={handleOpenAdd} />

      <AdminFilterBar
        filters={
          [
            { key: 'search', label: 'Search', type: 'text' as const, value: search, placeholder: 'Title, ID, tags...', onChange: setSearch },
            {
              key: 'type',
              label: 'Type',
              type: 'select' as const,
              value: filterType,
              placeholder: 'All Types',
              options: [
                { label: 'Video', value: 'video' },
                { label: 'Audio', value: 'audio' },
                { label: 'Article', value: 'article' },
                { label: 'Document', value: 'document' },
                { label: 'Quiz', value: 'quiz' },
              ],
              onChange: setFilterType,
            },
            {
              key: 'subject_tag',
              label: 'Subject Tag',
              type: 'select' as const,
              value: filterSubjectTag,
              placeholder: 'All Subjects',
              options: subjectTagOptions,
              onChange: setFilterSubjectTag,
            },
            {
              key: 'lesson_tag',
              label: 'Lesson Tag',
              type: 'select' as const,
              value: filterLessonTag,
              placeholder: 'All Lessons',
              options: lessonTagOptions,
              onChange: setFilterLessonTag,
            },
            {
              key: 'created_by',
              label: 'Created By',
              type: 'select' as const,
              value: filterCreatedBy,
              placeholder: 'Anyone',
              options: createdByOptions,
              onChange: setFilterCreatedBy,
            },
          ] as FilterField[]
        }
        onApply={() => {}}
        onClear={() => {
          setSearch('');
          setFilterType('');
          setFilterSubjectTag('');
          setFilterLessonTag('');
          setFilterCreatedBy('');
        }}
      />

      {allRows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm font-medium text-slate-700">No content assets yet.</p>
            <p className="mt-2 text-xs text-slate-500">
              Click <strong>+ New Asset</strong> to add the first one. Legacy lesson content from
              the old LMS lives under each course&apos;s Lessons section, not here — the Content
              Library is a fresh standalone repository for reusable assets.
            </p>
          </CardContent>
        </Card>
      ) : (
        <AdminDataTable columns={columns} rows={rows} actions={actions} />
      )}

      {/* Add/Edit Asset Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditId(''); setForm(emptyForm); } }}>
        <DialogContent className="w-[min(720px,calc(100vw-2rem))] max-w-[min(720px,calc(100vw-2rem))] max-h-[90vh] overflow-y-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
            className="w-full min-w-0"
          >
          <DialogHeader className="mb-5">
            <DialogTitle>{editId ? 'Edit Asset' : 'New Content Asset'}</DialogTitle>
          </DialogHeader>
          <div className="w-full min-w-0 space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Asset title" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select className={selectClass} value={form.asset_type} onChange={(e) => setForm((f) => ({ ...f, asset_type: e.target.value }))}>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="article">Article</option>
                  <option value="document">Document</option>
                  <option value="quiz">Quiz</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Duration</Label>
                <Input value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} placeholder="e.g. 10:30" />
              </div>
              <div className="space-y-1.5">
                <Label>Language</Label>
                <select className={selectClass} value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}>
                  <option value="">-- Any --</option>
                  {languages.map((l) => <option key={asString(l.id)} value={asString(l.title)}>{asString(l.title)}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Subject Tag</Label>
                <Input value={form.subject_tag} onChange={(e) => setForm((f) => ({ ...f, subject_tag: e.target.value }))} placeholder="e.g. Child Development" />
              </div>
              <div className="space-y-1.5">
                <Label>Lesson Tag</Label>
                <Input value={form.lesson_tag} onChange={(e) => setForm((f) => ({ ...f, lesson_tag: e.target.value }))} placeholder="e.g. Introduction" />
              </div>
            </div>
            {form.asset_type === 'video' && (
              <div className="space-y-1.5">
                <Label>Video URL</Label>
                <Input value={form.video_url} onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))} placeholder="https://..." />
              </div>
            )}
            {form.asset_type === 'audio' && (
              <div className="space-y-1.5">
                <Label>Audio File</Label>
                <FileUpload
                  value={form.audio_file}
                  onChange={(url) => setForm((f) => ({ ...f, audio_file: url }))}
                  onUpload={async (file) => { const r = await api.uploadFile(session.token, file); return r.url; }}
                  accept="audio/*"
                  placeholder="Upload audio or enter URL"
                />
              </div>
            )}
            {form.asset_type === 'document' && (
              <div className="space-y-1.5">
                <Label>File</Label>
                <FileUpload
                  value={form.attachment}
                  onChange={(url) => setForm((f) => ({ ...f, attachment: url }))}
                  onUpload={async (file) => { const r = await api.uploadFile(session.token, file); return r.url; }}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
                  placeholder="Upload file or enter URL"
                />
              </div>
            )}
            {form.asset_type === 'article' ? (
              <div className="space-y-1.5">
                <Label>Article Content</Label>
                <RichTextEditor
                  value={form.summary}
                  onChange={(html) => setForm((f) => ({ ...f, summary: html }))}
                />
              </div>
            ) : form.asset_type !== 'quiz' ? (
              <div className="space-y-1.5">
                <Label>Summary</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="e.g. montessori, child-development" />
            </div>

            {form.asset_type === 'quiz' && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="font-medium">Quiz Settings</div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label>Time Limit (min)</Label>
                    <Input type="number" value={form.time_limit_minutes} onChange={(e) => setForm((f) => ({ ...f, time_limit_minutes: e.target.value }))} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Attempts</Label>
                    <Input type="number" value={form.attempts_allowed} onChange={(e) => setForm((f) => ({ ...f, attempts_allowed: e.target.value }))} placeholder="1" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Pass Marks</Label>
                    <Input type="number" value={form.pass_marks} onChange={(e) => setForm((f) => ({ ...f, pass_marks: e.target.value }))} placeholder="0" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Shuffle</Label>
                    <div className="flex h-10 items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={form.shuffle_questions}
                        onChange={(e) => setForm((f) => ({ ...f, shuffle_questions: e.target.checked }))}
                      />
                      <span className="ml-2 text-sm">Shuffle Questions</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    Questions ({form.questions.length})
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={addQuestion}>
                    <Plus className="mr-1 h-3 w-3" /> Add Question
                  </Button>
                </div>

                {form.questions.length === 0 ? (
                  <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                    No questions added yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {form.questions.map((q, idx) => (
                      <div key={idx} className="rounded-md border p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-semibold text-muted-foreground">Q{idx + 1}</div>
                          <div className="flex gap-1">
                            <Button type="button" size="icon" variant="ghost" aria-label="Move question up" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}>
                              <ChevronUp className="h-3 w-3" aria-hidden="true" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" aria-label="Move question down" onClick={() => moveQuestion(idx, 1)} disabled={idx === form.questions.length - 1}>
                              <ChevronDown className="h-3 w-3" aria-hidden="true" />
                            </Button>
                            <Button type="button" size="icon" variant="ghost" aria-label="Remove question" onClick={() => removeQuestion(idx)}>
                              <Trash2 className="h-3 w-3 text-red-600" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                        <textarea
                          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={q.question}
                          placeholder="Question text"
                          onChange={(e) => updateQuestion(idx, { question: e.target.value })}
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(['A', 'B', 'C', 'D'] as CorrectAnswer[]).map((letter) => {
                            const key = `option_${letter.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d';
                            return (
                              <label key={letter} className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name={`correct-${idx}`}
                                  checked={q.correct_answer === letter}
                                  onChange={() => updateQuestion(idx, { correct_answer: letter })}
                                />
                                <span className="w-4 font-semibold">{letter}</span>
                                <Input
                                  value={q[key]}
                                  onChange={(e) => updateQuestion(idx, { [key]: e.target.value } as Partial<QuestionForm>)}
                                  placeholder={`Option ${letter}`}
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="mt-6 gap-2">
            <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(''); setForm(emptyForm); }} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unified Preview Dialog */}
      <Dialog open={!!previewAsset} onOpenChange={(open) => { if (!open) setPreviewAsset(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{asString(previewAsset?.title)}</DialogTitle>
          </DialogHeader>
          {previewType === 'video' && (
            <div className="aspect-video w-full">
              {(() => {
                const url = asString(previewAsset?.video_url);
                if (!url) return <p className="py-6 text-center text-sm text-muted-foreground">No video URL set.</p>;
                if (/\.mp4($|\?)/i.test(url) || /\.webm($|\?)/i.test(url)) {
                  return <video src={url} controls className="h-full w-full" />;
                }
                return <iframe src={url} className="h-full w-full" allow="fullscreen" />;
              })()}
            </div>
          )}
          {previewType === 'audio' && (
            <div className="py-4">
              {asString(previewAsset?.audio_file) ? (
                <audio src={asString(previewAsset?.audio_file)} controls className="w-full" />
              ) : (
                <p className="text-center text-sm text-muted-foreground">No audio file uploaded.</p>
              )}
            </div>
          )}
          {previewType === 'document' && (
            <div className="space-y-3">
              {(() => {
                const url = asString(previewAsset?.attachment) || asString(previewAsset?.download_url);
                if (!url) return <p className="py-6 text-center text-sm text-muted-foreground">No file uploaded.</p>;
                return (
                  <>
                    {isDocPdf(url) ? (
                      <iframe src={url} className="h-[60vh] w-full rounded border" />
                    ) : (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        Preview not available for this file type. Use Download below.
                      </p>
                    )}
                    <div className="flex justify-end">
                      <Button asChild variant="default" size="sm">
                        <a href={url} target="_blank" rel="noopener noreferrer" download>
                          <Download className="mr-2 h-4 w-4" /> Download
                        </a>
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          {previewType === 'article' && (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: asString(previewAsset?.summary) }}
            />
          )}
          {previewType === 'quiz' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {Number(previewAsset?.time_limit_seconds ?? 0) > 0 && (
                  <Badge variant="secondary">Time: {Math.floor(Number(previewAsset?.time_limit_seconds) / 60)}m</Badge>
                )}
                <Badge variant="secondary">Attempts: {asString(previewAsset?.attempts_allowed) || '—'}</Badge>
                <Badge variant="secondary">Pass Marks: {asString(previewAsset?.pass_marks) || '—'}</Badge>
                <Badge variant="secondary">Shuffle: {previewAsset?.shuffle_questions ? 'Yes' : 'No'}</Badge>
                <Badge variant="secondary">{previewQuestions.length} question{previewQuestions.length === 1 ? '' : 's'}</Badge>
              </div>
              {previewQuestions.length === 0 ? (
                <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                  No questions added.
                </p>
              ) : (
                <ol className="space-y-3">
                  {previewQuestions.map((q, idx) => {
                    const correct = asString(q.correct_answer).toUpperCase();
                    return (
                      <li key={idx} className="rounded border p-3">
                        <div className="mb-2 text-sm font-semibold">Q{idx + 1}. {asString(q.question)}</div>
                        <ul className="space-y-1">
                          {(['A', 'B', 'C', 'D'] as CorrectAnswer[]).map((letter) => {
                            const key = `option_${letter.toLowerCase()}` as 'option_a' | 'option_b' | 'option_c' | 'option_d';
                            const text = asString(q[key]);
                            if (!text) return null;
                            const isCorrect = letter === correct;
                            return (
                              <li key={letter} className={`flex items-start gap-2 text-sm ${isCorrect ? 'text-green-700' : ''}`}>
                                {isCorrect ? <Check className="mt-0.5 h-4 w-4" /> : <span className="w-4" />}
                                <span className="w-4 font-semibold">{letter}.</span>
                                <span>{text}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
