// "Choose your learning path" enrollment modal (Naji 2026-06-06, EduPulse demo).
// The student picks a learning format — Self-Paced or Cohort-Based — then sends
// an enrollment request. We do NOT take payment or self-enrol here (enrollment
// is admissions-driven at TTII): confirming creates an admissions lead via
// /student/leads/request-enrolment, and the student is told the team will reach
// out. The chosen path is a UI aid; it is not persisted, so the messaging stays
// honest about what happens next.

import { useState } from 'react';
import { GraduationCap, Clock, Users, Check, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '../../admin/shared/utils/admin-data-utils.js';

export interface EnrollCourse {
  id: string;
  title: string;
  subjectCount: number;
  price: number;
  offerPrice: number;
}

export type LearningPath = 'self_paced' | 'cohort';

interface PathOption {
  key: LearningPath;
  label: string;
  tagline: string;
  icon: typeof Clock;
  perks: string[];
  popular?: boolean;
}

const PATHS: PathOption[] = [
  {
    key: 'self_paced',
    label: 'Self-Paced',
    tagline: 'Learn on your own schedule',
    icon: Clock,
    perks: ['Start anytime, no fixed dates', 'Lifetime access to recordings', 'Progress at your own pace'],
  },
  {
    key: 'cohort',
    label: 'Cohort-Based',
    tagline: 'Learn live with a batch & mentor',
    icon: Users,
    perks: ['Live classes with instructors', 'Fixed start date & peer group', 'Structured weekly schedule'],
    popular: true,
  },
];

export function EnrollPathModal({
  course,
  onClose,
  onRequestEnrol,
}: {
  course: EnrollCourse | null;
  onClose: () => void;
  onRequestEnrol: (courseId: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<LearningPath>('cohort');
  const [busy, setBusy] = useState(false);

  const hasOffer = course ? course.offerPrice > 0 && course.offerPrice < course.price : false;
  const displayPrice = course ? (hasOffer ? course.offerPrice : course.price) : 0;
  const isFree = course ? course.price <= 0 : false;

  const confirm = async () => {
    if (!course) return;
    setBusy(true);
    try {
      await onRequestEnrol(course.id);
      toast.success('Enrollment request sent — our admissions team will reach out shortly.');
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not send your request. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={course !== null} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
      {/* Risha UAT 2026-08-06 — same mobile trap as the assignment modal: this
          had NO height cap and overflow-hidden, so on a phone the two stacked
          path cards made the modal taller than the screen and the centred
          overflow was clipped at both ends with nothing to scroll — "Request
          Enrollment" was unreachable. modal-maxh bounds it (vh fallback via
          @supports in app.css), the card list is the only scroll region, and
          top-2/translate-y-0 keeps the footer clear of the browser toolbars on
          phones (position:fixed centres against the toolbar-less viewport). */}
      <DialogContent className="top-2 flex modal-maxh translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:top-[50%] sm:translate-y-[-50%] sm:max-w-3xl!">
        <DialogHeader className="shrink-0 border-b border-slate-200 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-student-primary-light text-student-primary">
              <GraduationCap aria-hidden="true" className="size-6" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold text-student-text">Choose your learning path</DialogTitle>
              <p className="mt-0.5 truncate text-sm text-student-muted">
                {course?.title ?? ''}
                {course && course.subjectCount > 0 ? ` · ${course.subjectCount} subjects` : ''}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2 sm:p-6">
          {PATHS.map((path) => {
            const Icon = path.icon;
            const active = selected === path.key;
            return (
              <button
                key={path.key}
                type="button"
                onClick={() => setSelected(path.key)}
                aria-pressed={active}
                className={`relative flex flex-col rounded-2xl border p-4 text-left transition-all ${
                  active
                    ? 'border-student-primary bg-student-primary/5 ring-2 ring-student-primary/30'
                    : 'border-slate-200 hover:border-student-primary/40 hover:bg-slate-50'
                }`}
              >
                {path.popular ? (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-student-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-student-accent">
                    <Sparkles aria-hidden="true" className="size-3" /> Popular
                  </span>
                ) : null}
                <span className={`flex size-10 items-center justify-center rounded-xl ${active ? 'bg-student-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="mt-3 block font-bold text-student-text">{path.label}</span>
                <span className="mt-0.5 block text-xs text-student-muted">{path.tagline}</span>
                <ul className="mt-3 space-y-1.5">
                  {path.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-xs text-slate-600">
                      <Check aria-hidden="true" className={`mt-0.5 size-3.5 shrink-0 ${active ? 'text-student-primary' : 'text-slate-400'}`} />
                      {perk}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="text-sm">
            <span className="text-student-muted">Programme fee: </span>
            {isFree ? (
              <span className="font-bold text-emerald-600">Free</span>
            ) : displayPrice > 0 ? (
              <>
                <span className="font-bold text-student-text">{formatCurrency(displayPrice)}</span>
                {hasOffer && course ? (
                  <span className="ml-1.5 text-xs text-slate-400 line-through">{formatCurrency(course.price)}</span>
                ) : null}
                <span className="ml-1 text-xs text-slate-400">· confirmed by admissions</span>
              </>
            ) : (
              <span className="font-medium text-slate-500">Shared by admissions</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button
              onClick={() => void confirm()}
              disabled={busy}
              className="bg-student-primary text-white hover:bg-student-primary/90"
            >
              {busy ? <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" /> : null}
              Request Enrollment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
