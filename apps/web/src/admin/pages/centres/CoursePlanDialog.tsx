import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { EMPTY_PLAN_FORM, parseFee, validatePlanForm, type PlanForm, type PlanFormErrors } from './centre-plan-form-model.js';
import type { PlanRow } from './centre-profile-model.js';

// Assign Course / Edit plan. The course is chosen on add and fixed on edit
// (applications already follow it); the fee is the centre fee in rupees.

export type PlanTarget = { mode: 'add' } | { mode: 'edit'; plan: PlanRow };

const DIALOG_WIDTH = 'min(520px, calc(100vw - 2rem))';

function startForm(target: PlanTarget | null): PlanForm {
  if (target?.mode !== 'edit') return EMPTY_PLAN_FORM;
  const p = target.plan;
  return { courseId: p.courseId, fee: String(p.amount), start: p.start, end: p.end };
}

const FieldError = ({ id, message }: { id: string; message: string | undefined }) =>
  message ? <p id={id} role="alert" className="mt-1 text-xs text-rose-600">{message}</p> : null;

export function CoursePlanDialog({
  api, token, centreId, target, onClose, onSaved,
}: {
  api: AdminPortalApi;
  token: string;
  centreId: string;
  target: PlanTarget | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PlanForm>(EMPTY_PLAN_FORM);
  const [errors, setErrors] = useState<PlanFormErrors>({});
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [saving, setSaving] = useState(false);
  const mode = target?.mode ?? 'add';
  const open = target !== null;

  useEffect(() => {
    if (!target) return;
    setForm(startForm(target));
    setErrors({});
  }, [target]);

  useEffect(() => {
    if (!open) return;
    let live = true;
    api.loadCentreCourseOptions(token)
      .then((rows) => { if (live) setCourses(rows); })
      .catch(() => { if (live) toast.error('Could not load the course list.'); });
    return () => { live = false; };
  }, [api, token, open]);

  const set = (patch: Partial<PlanForm>) => setForm((f) => ({ ...f, ...patch }));

  const submit = async () => {
    const found = validatePlanForm(form, mode);
    setErrors(found);
    if (Object.keys(found).length > 0 || !target) return;
    setSaving(true);
    try {
      const res = await api.saveCentreCoursePlan(token, {
        ...(target.mode === 'edit' ? { id: target.plan.id } : {}),
        centreId, courseId: form.courseId, fee: parseFee(form.fee) ?? '', start: form.start, end: form.end,
      });
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(res.message);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the course plan.');
    } finally {
      setSaving(false);
    }
  };

  const editCourse = target?.mode === 'edit' ? target.plan.course : '';
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !saving) onClose(); }}>
      <DialogContent style={{ width: DIALOG_WIDTH, maxWidth: DIALOG_WIDTH }} className="gap-4">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Course Plan' : 'Assign Course'}</DialogTitle>
          <DialogDescription>
            The centre can add student applications for this course while today is between the start and end dates.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="plan-course">Course</Label>
            {mode === 'edit' ? (
              <Input id="plan-course" value={editCourse} disabled readOnly />
            ) : (
              <Select value={form.courseId} onValueChange={(v) => { if (v) set({ courseId: v }); }}>
                <SelectTrigger id="plan-course" aria-invalid={Boolean(errors.courseId)} className="w-full">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <FieldError id="plan-course-err" message={errors.courseId} />
          </div>
          <div>
            <Label htmlFor="plan-fee">Centre fee (₹)</Label>
            <Input
              id="plan-fee" inputMode="decimal" placeholder="e.g. 10000" value={form.fee}
              aria-invalid={Boolean(errors.fee)} aria-describedby={errors.fee ? 'plan-fee-err' : undefined}
              onChange={(e) => set({ fee: e.target.value })}
            />
            <FieldError id="plan-fee-err" message={errors.fee} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="plan-start">Start date</Label>
              <DmyDateInput id="plan-start" value={form.start} onChange={(v) => set({ start: v })} minYear={new Date().getFullYear() - 3} maxYear={new Date().getFullYear() + 5} />
              <FieldError id="plan-start-err" message={errors.start} />
            </div>
            <div>
              <Label htmlFor="plan-end">End date</Label>
              <DmyDateInput id="plan-end" value={form.end} onChange={(v) => set({ end: v })} minYear={new Date().getFullYear() - 3} maxYear={new Date().getFullYear() + 8} />
              <FieldError id="plan-end-err" message={errors.end} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button disabled={saving} onClick={() => void submit()}>
            {saving ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {mode === 'edit' ? 'Save changes' : 'Assign course'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
