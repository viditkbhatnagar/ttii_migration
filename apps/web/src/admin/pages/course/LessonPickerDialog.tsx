import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BookOpen, CopyPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, asNumber, toRecords } from '../../shared/utils/admin-data-utils.js';

/**
 * Pick an existing lesson (from any course) and CLONE it — with all its
 * content — into this Lesson-wise course. Non-destructive: the source lesson
 * is untouched (Ishfaq 2026-06-24 — "cannot add existing lessons").
 */
export function LessonPickerDialog({
  api, token, courseId, open, onClose, onAttached,
}: {
  api: AdminPageProps['api'];
  token: string;
  courseId: string;
  open: boolean;
  onClose: () => void;
  onAttached: () => void;
}) {
  const [search, setSearch] = useState('');
  const [cloningId, setCloningId] = useState('');

  const { data, loading } = useAdminPageData(
    () => (open ? api.listAttachableLessons(token, courseId) : Promise.resolve([])),
    [open, courseId],
  );
  const lessons = useMemo(() => toRecords(data), [data]);

  useEffect(() => { if (!open) setSearch(''); }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return lessons;
    return lessons.filter((l) => {
      const hay = `${asString(l.title)} ${asString(l.course_title)} ${asString(l.subject_title)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [lessons, search]);

  const clone = async (lesson: Record<string, unknown>) => {
    const id = asString(lesson.id);
    setCloningId(id);
    try {
      await api.cloneLessonInto(token, id, courseId);
      toast.success('Lesson cloned into this course.');
      onAttached();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not attach lesson.');
    } finally {
      setCloningId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto"
        style={{ width: 'min(680px, calc(100vw - 2rem))', maxWidth: 'min(680px, calc(100vw - 2rem))' }}
      >
        <DialogHeader>
          <DialogTitle>Attach an existing lesson</DialogTitle>
          <DialogDescription>
            Pick a lesson from any course to copy it — with all its content — into this course. The original lesson is not changed.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by lesson, course or subject…"
            className="pl-8"
          />
        </div>

        <div className="mt-3 space-y-1.5">
          {loading ? (
            [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)
          ) : filtered.length === 0 ? (
            <p className="rounded-md border border-dashed py-8 text-center text-sm text-slate-500">
              {lessons.length === 0 ? 'No lessons available to attach.' : 'No lessons match your search.'}
            </p>
          ) : (
            filtered.map((l) => {
              const id = asString(l.id);
              const files = asNumber(l.files_count);
              const context = asString(l.subject_title)
                ? `${asString(l.course_title)} · ${asString(l.subject_title)}`
                : asString(l.course_title);
              return (
                <div key={id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <BookOpen aria-hidden="true" className="size-4 shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{asString(l.title) || '(untitled lesson)'}</p>
                    {context ? <p className="truncate text-[11px] text-slate-400">{context}</p> : null}
                  </div>
                  <Badge variant="secondary" className="shrink-0">{files} item{files === 1 ? '' : 's'}</Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 gap-1.5"
                    disabled={cloningId === id}
                    onClick={() => void clone(l)}
                  >
                    <CopyPlus aria-hidden="true" className="size-3.5" />
                    {cloningId === id ? 'Attaching…' : 'Attach'}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
