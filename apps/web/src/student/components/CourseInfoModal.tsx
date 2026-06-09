// Course "More Info" modal — mirrors the EduPulse course-detail page
// (ttii.lovable.app/course/...) as closely as our catalog data allows: a tall
// gradient hero (code + title + price), an icon stat-bar, an About section, and
// a Programme-fee / Enrol sidebar with a feature list. Honest omissions: star
// rating, enrolled count, course "mode", brochure, "Who should enrol", and the
// per-course curriculum aren't shown — the catalog API doesn't provide them.

import { GraduationCap, Clock, BookOpen, FileText, UserPlus, Check, X, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '../../admin/shared/utils/admin-data-utils.js';

export interface CourseInfo {
  id: string;
  title: string;
  code: string;
  duration: string;
  subjectCount: number;
  lessonCount: number;
  price: number;
  offerPrice: number;
  description: string;
  tags?: string[];
}

export function CourseInfoModal({
  course,
  onClose,
  onEnrol,
}: {
  course: CourseInfo | null;
  onClose: () => void;
  onEnrol: () => void;
}) {
  const hasOffer = course ? course.offerPrice > 0 && course.offerPrice < course.price : false;
  const displayPrice = course ? (hasOffer ? course.offerPrice : course.price) : 0;
  const isFree = course ? course.price <= 0 : false;
  const priceLabel = isFree ? 'Free' : displayPrice > 0 ? formatCurrency(displayPrice) : '—';

  const stats: Array<{ icon: LucideIcon; label: string; value: string }> = [];
  const features: string[] = [];
  if (course) {
    if (course.duration) {
      stats.push({ icon: Clock, label: 'Duration', value: course.duration });
      features.push(course.duration);
    }
    if (course.subjectCount > 0) {
      stats.push({ icon: BookOpen, label: 'Subjects', value: String(course.subjectCount) });
      features.push(`${course.subjectCount} subject${course.subjectCount === 1 ? '' : 's'}`);
    }
    if (course.lessonCount > 0) {
      stats.push({ icon: FileText, label: 'Lessons', value: String(course.lessonCount) });
      features.push(`${course.lessonCount} lesson${course.lessonCount === 1 ? '' : 's'}`);
    }
  }
  const tags = course?.tags ?? [];

  return (
    <Dialog open={course !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden p-0 sm:max-w-[900px]"
        style={{ width: 'min(900px, calc(100vw - 2rem))', maxWidth: 'min(900px, calc(100vw - 2rem))' }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{course?.title ?? 'Course'}</DialogTitle>
        </DialogHeader>
        {course ? (
          <div className="flex max-h-[88vh] flex-col">
            {/* Hero */}
            <div className="relative bg-gradient-to-br from-student-primary to-student-accent px-6 py-8 text-white sm:px-8 sm:py-10">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 rounded-full bg-white/15 p-1.5 text-white/90 transition-colors hover:bg-white/25 hover:text-white"
              >
                <X className="size-4" />
              </button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur">
                <GraduationCap aria-hidden="true" className="size-4" />
                {course.code || 'Programme'}
              </span>
              <h2 className="mt-3 max-w-[88%] text-2xl font-bold leading-tight sm:text-3xl">{course.title}</h2>
            </div>

            {/* Stat bar */}
            {stats.length > 0 ? (
              <div className="flex flex-col border-b border-slate-200 sm:flex-row sm:divide-x sm:divide-slate-100">
                {stats.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="flex flex-1 items-center gap-3 px-6 py-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-student-primary-light text-student-primary">
                        <Icon aria-hidden="true" className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] text-student-muted">{s.label}</p>
                        <p className="truncate text-sm font-bold text-student-text">{s.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            {/* Body: About (left) + Fee/Enrol sidebar (right) */}
            <div className="grid flex-1 gap-5 overflow-y-auto p-6 sm:grid-cols-[minmax(0,1fr)_300px] sm:p-8">
              <div className="min-w-0 space-y-6">
                <section>
                  <h3 className="mb-2 text-sm font-bold text-student-text">About this course</h3>
                  {course.description ? (
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{course.description}</p>
                  ) : (
                    <p className="text-sm text-student-muted">
                      Full details for this programme will be shared by our admissions team when you request to enrol.
                    </p>
                  )}
                </section>
                {tags.length > 0 ? (
                  <section>
                    <h3 className="mb-2 text-sm font-bold text-student-text">Highlights</h3>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-student-primary-light px-3 py-1 text-xs font-semibold text-student-primary"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>

              <aside>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-student-muted">Programme fee</p>
                  <p className="mt-1 text-2xl font-bold text-student-text">{priceLabel}</p>
                  {hasOffer ? (
                    <p className="text-xs text-slate-400 line-through">{formatCurrency(course.price)}</p>
                  ) : !isFree && displayPrice > 0 ? (
                    <p className="text-xs text-student-muted">incl. all taxes</p>
                  ) : null}

                  <Button
                    onClick={onEnrol}
                    className="mt-4 w-full rounded-xl bg-student-primary text-white hover:bg-student-primary/90"
                  >
                    <UserPlus aria-hidden="true" className="mr-2 size-4" />
                    Enrol Now
                  </Button>

                  {features.length > 0 ? (
                    <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-student-muted">
                      {features.map((f) => (
                        <li key={f} className="flex items-center gap-2">
                          <Check aria-hidden="true" className="size-3.5 shrink-0 text-student-primary" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold text-student-muted transition-colors hover:bg-slate-50"
                >
                  Close
                </button>
              </aside>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
