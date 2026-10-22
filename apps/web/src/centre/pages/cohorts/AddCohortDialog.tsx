import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePortalThemeClass } from '@/lib/portal-theme';
import { cn } from '@/lib/utils';
import type { CentrePortalApi } from '../../centre-portal-api.js';
import { FilterSelect } from '../kit/FilterSelect.js';
import {
  EMPTY_COHORT_FORM, autoNameAndCode, cohortFormError, subjectsForCourse, type CohortForm, type CohortOptions,
} from './cohort-model.js';

interface AddCohortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: CentrePortalApi;
  token: string;
  options: CohortOptions;
  onCreated: () => void;
}

const YEAR_SPAN = 5;

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Add Cohort: the existing POST /centre/cohorts/add. A cohort carries ONE
 * primary course (the design's multi-course ticking has no column), and the
 * course list is the centre's own courses (its course plans).
 */
export function AddCohortDialog({ open, onOpenChange, api, token, options, onCreated }: AddCohortDialogProps) {
  const portalTheme = usePortalThemeClass();
  const [form, setForm] = useState<CohortForm>(EMPTY_COHORT_FORM);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const thisYear = new Date().getFullYear();

  const subjects = useMemo(() => subjectsForCourse(options, form.courseId), [options, form.courseId]);
  const baseTitle = form.type === 'subject'
    ? options.subjects.find((s) => s.id === form.subjectId)?.title ?? ''
    : options.courses.find((c) => c.id === form.courseId)?.title ?? '';
  const auto = autoNameAndCode(baseTitle, form.startDate);

  const set = (patch: Partial<CohortForm>) => { setForm((f) => ({ ...f, ...patch })); setError(null); };
  const close = (next: boolean) => {
    if (sending) return;
    if (!next) { setForm(EMPTY_COHORT_FORM); setError(null); }
    onOpenChange(next);
  };

  const submit = async () => {
    const problem = cohortFormError(form);
    if (problem) { setError(problem); return; }
    setSending(true);
    setError(null);
    try {
      const res = await api.addCohort(token, {
        title: form.name.trim() || auto.name || baseTitle,
        cohortCode: form.code.trim() || auto.code,
        courseId: form.courseId,
        subjectId: form.type === 'subject' ? form.subjectId : '',
        instructorId: form.instructorId,
        languageId: form.languageId,
        startDate: form.startDate,
        endDate: form.endDate,
      });
      if (res.success !== true && res.status !== 1) {
        setError(typeof res.message === 'string' && res.message ? res.message : 'Could not create the cohort.');
        return;
      }
      toast.success('Cohort created');
      setForm(EMPTY_COHORT_FORM);
      onOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      setError(errorText(err, 'Could not create the cohort. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  const toOptions = (items: { id: string; title: string }[]) => items.map((o) => ({ value: o.id, label: o.title }));

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className={cn(portalTheme, 'modal-maxh overflow-y-auto')} style={{ width: 'min(42rem, calc(100vw - 2rem))', maxWidth: 'none' }}>
        <DialogHeader>
          <DialogTitle>Add Cohort</DialogTitle>
          <DialogDescription>Create a new cohort for a subject or a whole course.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <FilterSelect label="Cohort Type" value={form.type} options={[{ value: 'subject', label: 'For Subject' }, { value: 'course', label: 'For Course' }]}
              onChange={(v) => set({ type: v === 'course' ? 'course' : 'subject', subjectId: '' })} />
            <FilterSelect label="Course" value={form.courseId} options={toOptions(options.courses)} placeholder="Select course"
              onChange={(v) => set({ courseId: v, subjectId: '' })} />
          </div>
          {options.courses.length === 0 && <p className="text-xs text-muted-foreground">Your centre has no courses yet. TTII adds them under Courses &amp; Fees.</p>}
          {form.type === 'subject' && (
            <FilterSelect label="Subject" value={form.subjectId} options={toOptions(subjects)} placeholder={form.courseId ? 'Select subject' : 'Select a course first'}
              onChange={(v) => set({ subjectId: v })} />
          )}
          <div className="space-y-1.5">
            <Label htmlFor="cohort-name">Cohort Name</Label>
            <Input id="cohort-name" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder={auto.name || 'Auto-generated from subject or course + start month'} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cohort-code">Cohort Code</Label>
            <Input id="cohort-code" value={form.code} onChange={(e) => set({ code: e.target.value })} placeholder={auto.code || 'Auto-generated from short name + start month'} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <FilterSelect label="Instructor" value={form.instructorId} options={toOptions(options.instructors)} placeholder="Select instructor" onChange={(v) => set({ instructorId: v })} />
            <FilterSelect label="Language" value={form.languageId} options={toOptions(options.languages)} placeholder="Select language" onChange={(v) => set({ languageId: v })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cohort-start">Start Date</Label>
              <DmyDateInput id="cohort-start" value={form.startDate} onChange={(v) => set({ startDate: v })} minYear={thisYear - 1} maxYear={thisYear + YEAR_SPAN} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cohort-end">End Date</Label>
              <DmyDateInput id="cohort-end" value={form.endDate} onChange={(v) => set({ endDate: v })} minYear={thisYear - 1} maxYear={thisYear + YEAR_SPAN} />
            </div>
          </div>
          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="outline" disabled={sending} onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" disabled={sending} className="gap-1.5">
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              {sending ? 'Creating…' : 'Create Cohort'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
