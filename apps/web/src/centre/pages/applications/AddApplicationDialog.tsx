import { useEffect, useMemo, useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePortalThemeClass } from '@/lib/portal-theme';
import { titleCaseOnBlur } from '@/lib/text-format';
import { cn } from '@/lib/utils';
import type { CentrePortalApi } from '../../centre-portal-api.js';
import { messageFromError } from '../../../admin/shared/utils/admin-data-utils.js';
import { str } from '../list-kit/list-kit-model.js';
import {
  EMPTY_FORM, PLAN_NOTE, addPayload, combinationsFor, offeringsFor, parseApplicationOptions, presetForm, updateForm, validateForm,
  type AddApplicationForm, type OptionCourse,
} from './centre-applications-model.js';

// Naji's AddApplicationDialog (student name, phone, email, course, offering,
// certificate combination) on the real centre flow: the course list is the
// centre's assigned courses (centre_course_plans), offerings are the course's
// open ones and combinations the ones offered for that offering. His "Fee
// payable to TTII (incl. GST)" box is not shown: the centre fee sheet is a
// pending product decision. The server re-checks every choice.

export interface AddApplicationPreset { courseId?: string; offeringId?: string }

interface AddApplicationDialogProps {
  api: CentrePortalApi;
  token: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (applicationId: string) => void;
  preset?: AddApplicationPreset;
}

type OptionsState = { status: 'idle' | 'loading' } | { status: 'ready'; courses: OptionCourse[] } | { status: 'error'; message: string };

export function AddApplicationDialog({ api, token, open, onOpenChange, onCreated, preset }: AddApplicationDialogProps) {
  const portalTheme = usePortalThemeClass();
  const [options, setOptions] = useState<OptionsState>({ status: 'idle' });
  const [form, setForm] = useState<AddApplicationForm>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Load the centre's courses each time the dialog opens (plans and offerings change).
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setOptions({ status: 'loading' });
    setError('');
    api.loadApplicationOptions(token)
      .then((data) => {
        if (cancelled) return;
        const courses = parseApplicationOptions(data);
        setOptions({ status: 'ready', courses });
        setForm(presetForm(courses, preset?.courseId, preset?.offeringId));
      })
      .catch((err: unknown) => { if (!cancelled) setOptions({ status: 'error', message: messageFromError(err) }); });
    return () => { cancelled = true; };
  }, [api, token, open, preset?.courseId, preset?.offeringId]);

  const courses = useMemo(() => (options.status === 'ready' ? options.courses : []), [options]);
  const offerings = offeringsFor(courses, form.courseId);
  const combinations = combinationsFor(courses, form.courseId, form.offeringId);
  const set = (patch: Partial<AddApplicationForm>) => { setForm((f) => updateForm(f, patch)); setError(''); };

  const close = (next: boolean) => {
    if (saving) return;
    if (!next) { setForm(EMPTY_FORM); setError(''); }
    onOpenChange(next);
  };

  const save = async () => {
    const problem = validateForm(form, courses);
    if (problem) { setError(problem); return; }
    setSaving(true);
    try {
      const res = await api.addPortalApplication(token, addPayload(form));
      toast.success(`Application created for ${form.name.trim()}`);
      setForm(EMPTY_FORM);
      onOpenChange(false);
      onCreated?.(str(res.application_id));
    } catch (err: unknown) {
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        className={cn('max-h-[85vh] overflow-y-auto [&>*]:min-w-0', portalTheme)}
        style={{ width: '100%', maxWidth: 'min(560px, calc(100vw - 2rem))' }}
      >
        <DialogHeader>
          <DialogTitle>New Application</DialogTitle>
          <DialogDescription>Add a student for one of your centre&apos;s courses. Convert it to enrol the student.</DialogDescription>
        </DialogHeader>

        {options.status === 'loading' || options.status === 'idle' ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your courses…
          </div>
        ) : options.status === 'error' ? (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{options.message}</p>
        ) : courses.length === 0 ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            No courses are assigned to your centre yet. Please contact TTII to have a course assigned.
          </p>
        ) : (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); void save(); }}
            noValidate
          >
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="app-name">Student name *</Label>
              <Input id="app-name" autoComplete="off" value={form.name} onChange={(e) => set({ name: e.target.value })} onBlur={titleCaseOnBlur((v) => set({ name: v }))} placeholder="Full name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="app-phone">Phone *</Label>
              <div className="flex gap-2">
                <Input aria-label="Country code" className="w-16 shrink-0" value={form.countryCode} onChange={(e) => set({ countryCode: e.target.value })} />
                <Input id="app-phone" inputMode="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="Phone number" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="app-email">Email *</Label>
              <Input id="app-email" type="email" inputMode="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="name@example.com" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="app-course">Course *</Label>
              <Select value={form.courseId} onValueChange={(v) => { if (v) set({ courseId: v }); }}>
                <SelectTrigger id="app-course" className="w-full"><SelectValue placeholder="Choose a course" /></SelectTrigger>
                <SelectContent className={portalTheme}>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id} disabled={c.planStatus !== 'active'}>
                      {c.title}{c.planStatus !== 'active' ? ` (${PLAN_NOTE[c.planStatus]})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="app-offering">Offering *</Label>
              <Select value={form.offeringId} onValueChange={(v) => { if (v) set({ offeringId: v }); }} disabled={!form.courseId || offerings.length === 0}>
                <SelectTrigger id="app-offering" className="w-full">
                  <SelectValue placeholder={form.courseId && offerings.length === 0 ? 'No open offerings' : 'Choose an offering'} />
                </SelectTrigger>
                <SelectContent className={portalTheme}>
                  {offerings.map((o) => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="app-combination">Certificate combination{combinations.length > 0 ? ' *' : ''}</Label>
              <Select value={form.combinationId} onValueChange={(v) => { if (v) set({ combinationId: v }); }} disabled={!form.offeringId || combinations.length === 0}>
                <SelectTrigger id="app-combination" className="w-full">
                  <SelectValue placeholder={form.offeringId && combinations.length === 0 ? 'None for this offering' : 'Choose a combination'} />
                </SelectTrigger>
                <SelectContent className={portalTheme}>
                  {combinations.map((c) => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground sm:col-span-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>The fee for a course and combination is not shown in the portal yet. TTII sets it.</span>
            </div>
            {error ? <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
            <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
          </form>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={saving}>Cancel</Button>
          <Button onClick={() => { void save(); }} disabled={saving || options.status !== 'ready' || courses.length === 0} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Create Application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
