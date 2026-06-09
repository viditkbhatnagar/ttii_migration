// Course "More Info" modal (Naji 2026-06-06). Mirrors the EduPulse course
// detail page as a modal, using the catalog data we actually have — hero with
// code + title + price, a Duration/Subjects/Lessons stat bar, an About section,
// and a fee + Enrol footer. Honest omissions: ratings, enrolment counts and
// brochures aren't shown because the catalog API doesn't provide them.

import { GraduationCap, Clock, BookOpen, FileText, UserPlus, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

  const stats: Array<{ icon: LucideIcon; label: string; value: string }> = [];
  if (course) {
    if (course.duration) stats.push({ icon: Clock, label: 'Duration', value: course.duration });
    if (course.subjectCount > 0) stats.push({ icon: BookOpen, label: 'Subjects', value: String(course.subjectCount) });
    if (course.lessonCount > 0) stats.push({ icon: FileText, label: 'Lessons', value: String(course.lessonCount) });
  }

  return (
    <Dialog open={course !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-[640px]"
        style={{ width: 'min(640px, calc(100vw - 2rem))', maxWidth: 'min(640px, calc(100vw - 2rem))' }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{course?.title ?? 'Course'}</DialogTitle>
        </DialogHeader>
        {course ? (
          <div className="flex max-h-[85vh] flex-col">
            {/* Hero */}
            <div className="relative bg-gradient-to-br from-student-primary to-student-accent p-6 text-white">
              <span className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold text-student-text shadow-sm">
                {isFree ? 'Free' : displayPrice > 0 ? formatCurrency(displayPrice) : '—'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur">
                <GraduationCap aria-hidden="true" className="size-3.5" />
                {course.code || 'Programme'}
              </span>
              <h2 className="mt-2 pr-20 text-xl font-bold leading-snug">{course.title}</h2>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {stats.length > 0 ? (
                <div className="grid grid-cols-3 gap-3">
                  {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                        <Icon aria-hidden="true" className="mx-auto size-5 text-student-primary" />
                        <p className="mt-1 text-sm font-bold text-student-text">{s.value}</p>
                        <p className="text-[11px] text-student-muted">{s.label}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <section className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">About this course</p>
                {course.description ? (
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{course.description}</p>
                ) : (
                  <p className="text-sm text-student-muted">
                    Full details for this programme will be shared by our admissions team when you request to enrol.
                  </p>
                )}
              </section>
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="text-sm">
                <span className="text-student-muted">Programme fee: </span>
                {isFree ? (
                  <span className="font-bold text-emerald-600">Free</span>
                ) : displayPrice > 0 ? (
                  <>
                    <span className="font-bold text-student-text">{formatCurrency(displayPrice)}</span>
                    {hasOffer ? (
                      <span className="ml-1.5 text-xs text-slate-400 line-through">{formatCurrency(course.price)}</span>
                    ) : null}
                  </>
                ) : (
                  <span className="font-medium text-slate-500">Shared by admissions</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose}>Close</Button>
                <Button onClick={onEnrol} className="bg-student-primary text-white hover:bg-student-primary/90">
                  <UserPlus aria-hidden="true" className="mr-2 size-4" />
                  Enrol Now
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
