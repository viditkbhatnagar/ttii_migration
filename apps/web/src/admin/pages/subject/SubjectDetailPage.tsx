import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Pencil, Trash2, BookOpen, Video, FileText,
  ClipboardList, Presentation, FileQuestion, ExternalLink, type LucideIcon,
} from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useConfirm } from '@/components/confirm-dialog';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords } from '../../shared/utils/admin-data-utils.js';
import { SortableList } from '../../shared/components/SortableList.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';
import { ContentItemDialog } from './ContentItemDialog.js';
import type { AdminPageProps } from '../../routing/admin-routes.js';

// Visual treatment per content type. PPT/Word/PDF all map to "document".
const TYPE_META: Record<string, { icon: LucideIcon; tint: string; label: string }> = {
  video: { icon: Video, tint: 'bg-blue-50 text-blue-600', label: 'Video' },
  article: { icon: FileText, tint: 'bg-emerald-50 text-emerald-600', label: 'Article' },
  document: { icon: Presentation, tint: 'bg-amber-50 text-amber-600', label: 'PPT / Doc' },
  quiz: { icon: ClipboardList, tint: 'bg-fuchsia-50 text-fuchsia-600', label: 'Quiz' },
  audio: { icon: FileText, tint: 'bg-slate-100 text-slate-600', label: 'Audio' },
};

function typeMeta(t: string) {
  return TYPE_META[t] ?? { icon: FileQuestion, tint: 'bg-slate-100 text-slate-600', label: t || 'Item' };
}

interface LessonNode {
  id: string;
  title: string;
  summary: string;
  free: string;
  content: Record<string, unknown>[];
}

export default function SubjectDetailPage({ api, session, onNavigate }: AdminPageProps) {
  const confirm = useConfirm();

  const subjectId = useMemo(() => {
    const m = window.location.pathname.match(/\/admin\/subjects\/view\/(.+)/);
    return m?.[1] ?? '';
  }, []);

  const { data, loading, error, reload } = useAdminPageData(
    () => (subjectId
      ? api.loadSubjectContentTree(session.token, subjectId)
      : Promise.resolve({} as Record<string, unknown>)),
    [subjectId],
  );

  const subject = useMemo(() => {
    const s = (data?.subject as Record<string, unknown> | undefined) ?? {};
    return {
      id: asString(s.id) || subjectId,
      title: asString(s.title),
      code: asString(s.subject_code),
      type: asString(s.subject_type),
      hours: s.duration_hours == null ? '' : String(asNumber(s.duration_hours)),
      status: asString(s.status) || 'draft',
    };
  }, [data, subjectId]);

  const lessons = useMemo<LessonNode[]>(() => {
    const raw = Array.isArray(data?.lessons) ? (data?.lessons as Record<string, unknown>[]) : [];
    return raw.map((l) => ({
      id: asString(l.id),
      title: asString(l.title),
      summary: asString(l.summary),
      free: asString(l.free) || 'off',
      content: toRecords(l.content),
    }));
  }, [data]);

  // ── Lesson add/edit dialog ──────────────────────────────────────────
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [lessonEditId, setLessonEditId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonFree, setLessonFree] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);

  const openAddLesson = () => {
    setLessonEditId('');
    setLessonTitle('');
    setLessonFree(false);
    setLessonDialogOpen(true);
  };
  const openEditLesson = (l: LessonNode) => {
    setLessonEditId(l.id);
    setLessonTitle(l.title);
    setLessonFree(l.free === 'on');
    setLessonDialogOpen(true);
  };

  const saveLesson = async () => {
    if (!lessonTitle.trim()) { toast.error('Please enter a lesson title.'); return; }
    setSavingLesson(true);
    try {
      const input = { subject_id: subjectId, title: lessonTitle.trim(), free: lessonFree };
      if (lessonEditId) {
        await api.editLesson(session.token, lessonEditId, input);
        toast.success('Lesson updated');
      } else {
        await api.addLesson(session.token, input);
        toast.success('Lesson added');
      }
      setLessonDialogOpen(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save lesson.');
    } finally {
      setSavingLesson(false);
    }
  };

  const deleteLesson = async (l: LessonNode) => {
    const n = l.content.length;
    const ok = await confirm({
      title: `Delete lesson "${l.title}"?`,
      description: n > 0
        ? `This lesson has ${n} content item${n === 1 ? '' : 's'}. The lesson will be removed; the content stays in the Content Library.`
        : 'This cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await api.deleteLesson(session.token, l.id);
      toast.success('Lesson deleted');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete lesson.');
    }
  };

  const reorderLessons = useCallback((nextIds: string[]) => {
    void (async () => {
      try {
        await api.reorderLessons(session.token, nextIds);
        toast.success('Lessons reordered');
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save order.');
        reload();
      }
    })();
  }, [api, session.token, reload]);

  // ── Content add/edit dialog ─────────────────────────────────────────
  const [contentDialog, setContentDialog] = useState<{ lesson: LessonNode; asset: Record<string, unknown> | null } | null>(null);

  const deleteContent = async (asset: Record<string, unknown>) => {
    const ok = await confirm({
      title: `Delete "${asString(asset.title)}"?`,
      description: 'It will be removed from this lesson and the Content Library.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await api.deleteContentAsset(session.token, asString(asset.id));
      toast.success('Content deleted');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete content.');
    }
  };

  const reorderContent = useCallback((lessonId: string, nextIds: string[]) => {
    void (async () => {
      try {
        await api.reorderLessonContent(session.token, lessonId, nextIds);
        toast.success('Content reordered');
        reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save order.');
        reload();
      }
    })();
  }, [api, session.token, reload]);

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink onNavigate={onNavigate} />
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700" role="alert">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink onNavigate={onNavigate} />

      {/* Subject header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#f5f3ff]">
              <BookOpen aria-hidden="true" className="size-5 text-[#8F2774]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{subject.title || 'Subject'}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {subject.code ? <span className="rounded-full bg-slate-100 px-2 py-0.5">{subject.code}</span> : null}
                {subject.type ? <span className="rounded-full bg-slate-100 px-2 py-0.5">{subject.type}</span> : null}
                {subject.hours ? <span className="rounded-full bg-slate-100 px-2 py-0.5">{subject.hours} hrs</span> : null}
                <AdminStatusBadge status={subject.status} />
              </div>
            </div>
          </div>
          <Button onClick={openAddLesson} className="gap-1.5">
            <Plus aria-hidden="true" className="size-4" /> Add Lesson
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {lessons.length} lesson{lessons.length === 1 ? '' : 's'} · drag the grip to reorder · content added here also appears in the Content Library
        </p>
      </div>

      {/* Lessons */}
      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">No lessons yet.</p>
          <Button onClick={openAddLesson} variant="outline" className="mt-3 gap-1.5">
            <Plus aria-hidden="true" className="size-4" /> Add the first lesson
          </Button>
        </div>
      ) : (
        <SortableList ids={lessons.map((l) => l.id)} onReorder={reorderLessons} className="space-y-4">
          {(id, dragHandle) => {
            const lesson = lessons.find((l) => l.id === id);
            if (!lesson) return null;
            return (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Lesson header */}
                <div className="flex items-center gap-2 border-b border-slate-100 p-4">
                  {dragHandle}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{lesson.title || 'Untitled lesson'}</p>
                    <p className="text-xs text-slate-400">{lesson.content.length} item{lesson.content.length === 1 ? '' : 's'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContentDialog({ lesson, asset: null })}
                    className="inline-flex items-center gap-1 rounded-full bg-[#8F2774]/10 px-3 py-1 text-xs font-semibold text-[#8F2774] transition-colors hover:bg-[#8F2774]/20"
                  >
                    <Plus aria-hidden="true" className="size-3" /> Add Content
                  </button>
                  <IconButton label="Edit lesson" onClick={() => openEditLesson(lesson)}><Pencil className="size-4" /></IconButton>
                  <IconButton label="Delete lesson" onClick={() => void deleteLesson(lesson)} danger><Trash2 className="size-4" /></IconButton>
                </div>

                {/* Lesson content */}
                {lesson.content.length === 0 ? (
                  <p className="px-4 py-5 text-center text-xs text-slate-400">No content yet. Use “Add Content”.</p>
                ) : (
                  <div className="p-3">
                    <SortableList
                      ids={lesson.content.map((c) => asString(c.id))}
                      onReorder={(ids) => reorderContent(lesson.id, ids)}
                      className="space-y-1.5"
                    >
                      {(cid, cHandle) => {
                        const item = lesson.content.find((c) => asString(c.id) === cid);
                        if (!item) return null;
                        const meta = typeMeta(asString(item.asset_type));
                        const Icon = meta.icon;
                        const qc = Number(item.question_count ?? 0);
                        const fileUrl = asString(item.attachment) || asString(item.video_url) || asString(item.audio_file);
                        return (
                          <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
                            {cHandle}
                            <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${meta.tint}`}>
                              <Icon aria-hidden="true" className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800">{asString(item.title) || 'Untitled'}</p>
                              <p className="text-[11px] text-slate-400">
                                {meta.label}{asString(item.asset_type) === 'quiz' ? ` · ${qc} question${qc === 1 ? '' : 's'}` : ''}
                              </p>
                            </div>
                            {fileUrl ? (
                              <IconButton label="View content" onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}><ExternalLink className="size-4" /></IconButton>
                            ) : null}
                            <IconButton label="Edit content" onClick={() => setContentDialog({ lesson, asset: item })}><Pencil className="size-4" /></IconButton>
                            <IconButton label="Delete content" onClick={() => void deleteContent(item)} danger><Trash2 className="size-4" /></IconButton>
                          </div>
                        );
                      }}
                    </SortableList>
                  </div>
                )}
              </div>
            );
          }}
        </SortableList>
      )}

      <p className="flex items-center justify-center gap-1 text-center text-xs text-slate-400">
        <ExternalLink aria-hidden="true" className="size-3" />
        Quiz questions and full asset editing live in Courses → Content Library
      </p>

      {/* Lesson dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={(o) => { if (!o) setLessonDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{lessonEditId ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Lesson Title *</Label>
              <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="e.g. Introduction" />
            </div>
            <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <input type="checkbox" className="size-4 rounded border-slate-300" checked={lessonFree} onChange={(e) => setLessonFree(e.target.checked)} />
              Free preview lesson (accessible without enrolment)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialogOpen(false)} disabled={savingLesson}>Cancel</Button>
            <Button onClick={() => void saveLesson()} disabled={savingLesson}>
              {savingLesson ? 'Saving…' : lessonEditId ? 'Save Changes' : 'Add Lesson'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content dialog */}
      {contentDialog ? (
        <ContentItemDialog
          open
          onClose={() => setContentDialog(null)}
          api={api}
          token={session.token}
          subjectTitle={subject.title}
          lessonId={contentDialog.lesson.id}
          lessonTitle={contentDialog.lesson.title}
          editAsset={contentDialog.asset}
          onSaved={reload}
        />
      ) : null}
    </div>
  );
}

function BackLink({ onNavigate }: { onNavigate: (href: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate('/admin/subjects/index')}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-[#8F2774]"
    >
      <ArrowLeft aria-hidden="true" className="size-4" /> Back to Subjects
    </button>
  );
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded-lg p-1.5 transition-colors ${danger ? 'text-slate-400 hover:bg-red-50 hover:text-red-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
    >
      {children}
    </button>
  );
}
