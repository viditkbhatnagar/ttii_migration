import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUpload } from '../../shared/components/FileUpload.js';
import { RichTextEditor } from '../../shared/components/RichTextEditor.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import type { AdminPortalApi } from '../../admin-portal-api.js';

// Content types the Subject Detail page can create under a lesson. "document"
// covers PPT / PDF / Word uploads. Quizzes are created here as a shell; their
// questions are authored in the Content Library (linked out), since that
// builder is substantial.
export type ContentKind = 'video' | 'article' | 'document' | 'quiz';

const KIND_LABEL: Record<ContentKind, string> = {
  video: 'Video',
  article: 'Article',
  document: 'PPT / Document',
  quiz: 'Quiz',
};

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

interface ContentItemDialogProps {
  open: boolean;
  onClose: () => void;
  api: AdminPortalApi;
  token: string;
  subjectTitle: string;
  lessonId: string;
  lessonTitle: string;
  /** Existing asset to edit, or null to create a new one. */
  editAsset: Record<string, unknown> | null;
  onSaved: () => void;
}

export function ContentItemDialog({
  open,
  onClose,
  api,
  token,
  subjectTitle,
  lessonId,
  lessonTitle,
  editAsset,
  onSaved,
}: ContentItemDialogProps) {
  const isEdit = !!editAsset;
  const [kind, setKind] = useState<ContentKind>('video');
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [attachment, setAttachment] = useState('');
  const [saving, setSaving] = useState(false);

  // Hydrate when (re)opened.
  useEffect(() => {
    if (!open) return;
    if (editAsset) {
      const raw = asString(editAsset.asset_type);
      const t: ContentKind =
        raw === 'article' || raw === 'document' || raw === 'quiz' ? raw : 'video';
      setKind(t);
      setTitle(asString(editAsset.title));
      setVideoUrl(asString(editAsset.video_url));
      setSummary(asString(editAsset.summary));
      setAttachment(asString(editAsset.attachment));
    } else {
      setKind('video');
      setTitle('');
      setVideoUrl('');
      setSummary('');
      setAttachment('');
    }
  }, [open, editAsset]);

  const questionCount = useMemo(
    () => (editAsset ? Number(editAsset.question_count ?? 0) : 0),
    [editAsset],
  );

  const handleSave = async (): Promise<void> => {
    if (!title.trim()) {
      toast.error('Please enter a title.');
      return;
    }
    setSaving(true);
    try {
      const input: Record<string, unknown> = {
        title: title.trim(),
        asset_type: kind,
        lesson_id: Number(lessonId),
        subject_tag: subjectTitle || undefined,
        lesson_tag: lessonTitle || undefined,
      };
      if (kind === 'video') input.video_url = videoUrl.trim() || undefined;
      if (kind === 'article') input.summary = summary || undefined;
      if (kind === 'document') input.attachment = attachment.trim() || undefined;

      if (isEdit) {
        await api.updateContentAsset(token, asString(editAsset?.id), input);
      } else {
        await api.createContentAsset(token, input);
      }
      toast.success(isEdit ? 'Content updated' : 'Content added');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save content.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Content' : 'Add Content'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Added to lesson <span className="font-medium text-slate-700">{lessonTitle || '—'}</span>.
            It is also saved to the Content Library.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select
                className={selectClass}
                value={kind}
                disabled={isEdit}
                onChange={(e) => setKind(e.target.value as ContentKind)}
              >
                {(Object.keys(KIND_LABEL) as ContentKind[]).map((k) => (
                  <option key={k} value={k}>{KIND_LABEL[k]}</option>
                ))}
              </select>
              {isEdit ? <p className="text-[11px] text-slate-400">Type can't be changed after creation.</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content title" />
            </div>
          </div>

          {kind === 'video' && (
            <div className="space-y-1.5">
              <Label>Video URL</Label>
              <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://… (YouTube, Vimeo, or direct link)" />
            </div>
          )}

          {kind === 'article' && (
            <div className="space-y-1.5">
              <Label>Article Content</Label>
              <RichTextEditor
                value={summary}
                onChange={setSummary}
                onUploadImage={async (file) => {
                  const r = await api.uploadFile(token, file);
                  return r.url;
                }}
              />
            </div>
          )}

          {kind === 'document' && (
            <div className="space-y-1.5">
              <Label>File (PPT, PDF, Word…)</Label>
              <FileUpload
                value={attachment}
                onChange={setAttachment}
                onUpload={async (file) => { const r = await api.uploadFile(token, file); return r.url; }}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
                placeholder="Upload a file or paste a URL"
              />
            </div>
          )}

          {kind === 'quiz' && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {isEdit
                ? `This quiz has ${questionCount} question${questionCount === 1 ? '' : 's'}. Add or edit questions from Courses → Content Library (open this quiz asset).`
                : 'Create the quiz here, then add its questions from Courses → Content Library (open the quiz asset).'}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Content'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
