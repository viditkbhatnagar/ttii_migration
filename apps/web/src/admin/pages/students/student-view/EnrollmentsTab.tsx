import type { ReactNode } from 'react';
import {
  ArrowLeft, FileSignature, GraduationCap, ListChecks, PencilLine, Plus, ScrollText, TrendingUp, Users, Video, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { asNumber, asString } from '../../../shared/utils/admin-data-utils.js';
import { progressLabel } from './student-view-model.js';
import { EnrolmentStatusPill } from './EnrollmentSections.js';
import { Panel, ProfileTabs, type TabItem } from './student-view-ui.js';

// Enrollments tab in Naji's EnrollmentLayout: a header with the back arrow and
// the secondary (segmented) tabs, an "Enrolled courses" rail of course cards on
// the left, and the selected enrolment's header card + sub-tab body on the
// right. Kept from the old page: Add Enrolment on the rail, Edit enrolment on
// the course header (admins only), and the Application Details + Cohort tabs.
//
// Risha UAT 2026-07-27 — the right track is minmax(0,1fr) and the pane min-w-0
// so a long tutor remark cannot stretch the pane and clip the tables' scrollers.

const ENROLMENT_SUB_TABS: TabItem[] = [
  { id: 'application', label: 'Application Details', icon: ScrollText },
  { id: 'learning', label: 'Learning Progress', icon: TrendingUp },
  { id: 'quiz', label: 'Quiz', icon: ListChecks },
  { id: 'live', label: 'Live Class', icon: Video },
  { id: 'cohort', label: 'Cohort', icon: Users },
  { id: 'assignment', label: 'Assignment', icon: PencilLine },
  { id: 'exam', label: 'Examination', icon: FileSignature },
  { id: 'payments', label: 'Payments', icon: Wallet },
];

function CourseCard({ enrolment, active, onClick }: { enrolment: Record<string, unknown>; active: boolean; onClick: () => void }) {
  const pct = Math.max(0, Math.min(100, asNumber(enrolment.progress)));
  const title = asString(enrolment.course_title) || `Enrolment ${asString(enrolment.id)}`;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group w-full rounded-2xl border bg-card p-4 text-left shadow-[var(--shadow-soft)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        active ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
          <GraduationCap aria-hidden="true" className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          {/* Naji UAT 2026-05-15 — two lines before truncating long course names. */}
          <p className="line-clamp-2 break-words text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{asString(enrolment.enrollment_id) || `ID ${asString(enrolment.id)}`}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <EnrolmentStatusPill status={asString(enrolment.status) || asString(enrolment.enrollment_status) || 'Active'} />
        <span className="text-[11px] font-semibold tabular-nums text-foreground">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-[image:var(--gradient-primary)] transition-all" style={{ width: `${pct}%` }} />
      </div>
    </button>
  );
}

export function EnrollmentsTab({
  enrolments, selectedIdx, onSelect, subTab, onSubTab, onBack, onAdd, onEdit, canEdit, children,
}: {
  enrolments: Record<string, unknown>[];
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
  subTab: string;
  onSubTab: (id: string) => void;
  onBack: () => void;
  onAdd: () => void;
  onEdit: (row: Record<string, unknown>) => void;
  canEdit: boolean;
  /** The selected sub-tab's body. */
  children: ReactNode;
}) {
  const selected = selectedIdx !== null ? enrolments[selectedIdx] ?? null : null;
  const subLabel = ENROLMENT_SUB_TABS.find((t) => t.id === subTab)?.label ?? '';
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to the student profile"
            className="inline-flex size-9 items-center justify-center rounded-xl border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </button>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Enrollments</p>
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">Course overview</h2>
          </div>
        </div>
        {selected ? (
          <div className="w-full lg:w-auto lg:max-w-[70%]">
            <ProfileTabs tabs={ENROLMENT_SUB_TABS} active={subTab} onChange={onSubTab} variant="secondary" label="Enrolment sections" />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="w-full">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="text-sm font-semibold text-foreground">Enrolled courses</h3>
            <span className="text-[11px] text-muted-foreground">{enrolments.length} total</span>
          </div>
          <Button size="sm" className="mb-3 w-full gap-1.5" onClick={onAdd}>
            <Plus aria-hidden="true" className="size-4" /> Add Enrolment
          </Button>
          {enrolments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">No enrolments.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0 [&>*]:min-w-[260px] lg:[&>*]:min-w-0">
              {enrolments.map((e, idx) => (
                <CourseCard key={asString(e.id) || idx} enrolment={e} active={selectedIdx === idx} onClick={() => onSelect(idx)} />
              ))}
            </div>
          )}
        </aside>

        <div className="min-w-0 space-y-6">
          {selected === null ? (
            <Panel><p className="py-10 text-center text-sm text-muted-foreground">Pick a course on the left to see its details.</p></Panel>
          ) : (
            <div key={`${asString(selected.id)}-${subTab}`} className="space-y-6 motion-safe:animate-in motion-safe:fade-in-50 motion-safe:duration-300">
              <Panel>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Enrollment · {asString(selected.enrollment_id) || asString(selected.id)}
                    </p>
                    <h2 className="truncate text-lg font-semibold text-foreground sm:text-xl">{asString(selected.course_title) || 'Enrolment'}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[
                        asString(selected.offering_title),
                        asString(selected.certificate_combination_code),
                        asString(selected.cohort_title) || asString(selected.batch_title),
                      ].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">{progressLabel(asNumber(selected.progress))}</span>
                    <span className="rounded-full bg-secondary px-2.5 py-1 font-medium text-foreground">{subLabel}</span>
                    {canEdit ? <Button variant="outline" size="sm" onClick={() => onEdit(selected)}>Edit enrolment</Button> : null}
                  </div>
                </div>
              </Panel>
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
