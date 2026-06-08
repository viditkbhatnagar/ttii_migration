import {
  Clock,
  BookOpen,
  FileText,
  Info,
  UserPlus,
  Star,
  TrendingUp,
  Sparkles,
  Award,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';

import { formatCurrency } from '../../admin/shared/utils/admin-data-utils.js';

/** A catalog course the student is NOT enrolled in (shown as a "Recommended" card). */
export interface RecommendedCourse {
  id: string;
  title: string;
  code: string;
  duration: string;
  subjectCount: number;
  lessonCount: number;
  price: number;
  offerPrice: number;
  tags: string[];
}

// Tag badge styles — keep in sync with the admin COURSE_TAG_OPTIONS
// (Best Seller / Trending / New / Recommended / Placement Support). Unknown
// tags fall back to a neutral grey pill.
const TAG_STYLE: Record<string, { icon: LucideIcon; className: string }> = {
  'Best Seller': { icon: Star, className: 'bg-rose-50 text-rose-600' },
  Trending: { icon: TrendingUp, className: 'bg-amber-50 text-amber-700' },
  New: { icon: Sparkles, className: 'bg-sky-50 text-sky-600' },
  Recommended: { icon: Award, className: 'bg-emerald-50 text-emerald-700' },
  'Placement Support': { icon: Briefcase, className: 'bg-violet-50 text-violet-700' },
};

interface RecommendedCourseCardProps {
  course: RecommendedCourse;
  onMore: () => void;
  onEnroll: () => void;
}

/**
 * EduPulse "Recommended Courses" card — gradient header with the price/Free
 * badge, title + course code, tag pills, icon-led meta (duration · subjects ·
 * lessons), and More Info / Enrol actions. Shared by the dashboard recommended
 * section and the Courses tab's available-courses grid.
 */
export function RecommendedCourseCard({ course, onMore, onEnroll }: RecommendedCourseCardProps) {
  const hasOffer = course.offerPrice > 0 && course.offerPrice < course.price;
  const displayPrice = hasOffer ? course.offerPrice : course.price;
  const isFree = course.price <= 0;
  const meta: Array<{ icon: LucideIcon; text: string }> = [];
  if (course.duration) meta.push({ icon: Clock, text: course.duration });
  if (course.subjectCount > 0) meta.push({ icon: BookOpen, text: `${course.subjectCount} Subjects` });
  if (course.lessonCount > 0) meta.push({ icon: FileText, text: `${course.lessonCount} Lessons` });

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {/* Gradient header with the price/Free badge top-right (EduPulse). */}
      <div className="relative h-20 bg-gradient-to-br from-student-primary to-student-accent">
        <span className="absolute right-2.5 top-2.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-student-text shadow-sm">
          {isFree ? 'Free' : displayPrice > 0 ? formatCurrency(displayPrice) : '—'}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-bold leading-snug text-student-text">{course.title}</h3>
        {course.code ? <p className="mt-0.5 text-xs font-medium text-student-muted">{course.code}</p> : null}
        {course.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {course.tags.map((tag) => {
              const style = TAG_STYLE[tag];
              const Icon = style?.icon;
              return (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${style?.className ?? 'bg-slate-100 text-slate-600'}`}
                >
                  {Icon ? <Icon aria-hidden="true" className="size-3" /> : null}
                  {tag}
                </span>
              );
            })}
          </div>
        ) : null}
        {meta.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-student-muted">
            {meta.map((m) => {
              const Icon = m.icon;
              return (
                <span key={m.text} className="inline-flex items-center gap-1">
                  <Icon aria-hidden="true" className="size-3.5" />
                  {m.text}
                </span>
              );
            })}
          </div>
        ) : null}
        <div className="mt-auto flex gap-2 pt-4">
          <Button
            onClick={onMore}
            variant="outline"
            className="h-9 flex-1 rounded-xl border-student-primary/30 px-2 text-xs font-semibold text-student-primary hover:bg-student-primary/5"
          >
            <Info aria-hidden="true" className="mr-1 size-3.5" />
            More Info
          </Button>
          <Button
            onClick={onEnroll}
            className="h-9 flex-1 rounded-xl bg-student-primary px-2 text-xs font-semibold text-white hover:bg-student-primary/90"
          >
            <UserPlus aria-hidden="true" className="mr-1 size-3.5" />
            Enrol
          </Button>
        </div>
      </div>
    </div>
  );
}
