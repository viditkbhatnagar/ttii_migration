import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClassTimeInput } from '@/components/ui/class-time-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePortalThemeClass } from '@/lib/portal-theme';
import { titleCaseEachWord } from '@/lib/text-format';
import { cn } from '@/lib/utils';
import type { CentrePortalApi } from '../../centre-portal-api.js';
import { FilterSelect } from '../kit/FilterSelect.js';
import { EMPTY_SESSION_FORM, sessionFormError, type SessionForm } from './cohort-model.js';

interface AddSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: CentrePortalApi;
  token: string;
  cohortId: string;
  /** IST calendar day, for the "not in the past" check. */
  today: string;
  /** A cohort needs an instructor before the server accepts a class. */
  hasInstructor: boolean;
  onAdded: () => void;
}

const PLATFORMS = [
  { value: 'link', label: 'Paste a meeting link (Teams / Zoom / Meet)' },
  { value: 'teams', label: 'Create a Microsoft Teams meeting' },
];
const YEAR_SPAN = 3;

/**
 * Add Live Session: the existing POST /centre/live_class/add. Times go through
 * ClassTimeInput (flags AM/PM slips) and the dd/mm/yyyy date field; times are
 * IST wall clock, which the server stores as entered.
 */
export function AddSessionDialog({ open, onOpenChange, api, token, cohortId, today, hasInstructor, onAdded }: AddSessionDialogProps) {
  const portalTheme = usePortalThemeClass();
  const [form, setForm] = useState<SessionForm>(EMPTY_SESSION_FORM);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const thisYear = new Date().getFullYear();
  const set = (patch: Partial<SessionForm>) => { setForm((f) => ({ ...f, ...patch })); setError(null); };

  const close = (next: boolean) => {
    if (sending) return;
    if (!next) { setForm(EMPTY_SESSION_FORM); setError(null); }
    onOpenChange(next);
  };

  const submit = async () => {
    const problem = sessionFormError(form, today);
    if (problem) { setError(problem); return; }
    setSending(true);
    setError(null);
    try {
      const res = await api.addLiveClass(token, {
        cohortId,
        zoomId: '',
        password: '',
        platform: form.platform === 'teams' ? 'teams' : 'manual',
        manualJoinUrl: form.platform === 'link' ? form.link.trim() : '',
        entries: [{ sessionId: '', title: form.title.trim(), date: form.dateYmd, fromTime: form.from, toTime: form.to }],
      });
      if (res.success !== true && res.status !== 1) {
        setError(typeof res.message === 'string' && res.message ? res.message : 'Could not schedule the session.');
        return;
      }
      toast.success('Live session scheduled');
      setForm(EMPTY_SESSION_FORM);
      onOpenChange(false);
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : 'Could not schedule the session. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className={cn(portalTheme, 'modal-maxh overflow-y-auto')} style={{ width: 'min(32rem, calc(100vw - 2rem))', maxWidth: 'none' }}>
        <DialogHeader>
          <DialogTitle>Add Live Session</DialogTitle>
          <DialogDescription>Schedule a class for this cohort. Times are India Standard Time.</DialogDescription>
        </DialogHeader>
        {!hasInstructor && <p role="alert" className="rounded-md bg-warning-soft px-3 py-2 text-xs text-warning-foreground">This cohort has no instructor yet, so a session cannot be scheduled. Ask TTII to assign one.</p>}
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="session-title">Session Title</Label>
            <Input id="session-title" value={form.title} placeholder="e.g. Child Development — Week 1"
              onChange={(e) => set({ title: e.target.value })}
              onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) set({ title: next }); }} />
          </div>
          <FilterSelect label="Meeting" value={form.platform} options={PLATFORMS} onChange={(v) => set({ platform: v === 'teams' ? 'teams' : 'link' })} />
          {form.platform === 'link' && (
            <div className="space-y-1.5">
              <Label htmlFor="session-link">Meeting link</Label>
              <Input id="session-link" type="url" inputMode="url" placeholder="https://teams.microsoft.com/..." value={form.link} onChange={(e) => set({ link: e.target.value })} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="session-date">Date</Label>
            <DmyDateInput id="session-date" value={form.dateYmd} onChange={(v) => set({ dateYmd: v })} minYear={thisYear} maxYear={thisYear + YEAR_SPAN} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>From Time</Label><ClassTimeInput value={form.from} onChange={(v) => set({ from: v })} /></div>
            <div className="space-y-1.5"><Label>To Time</Label><ClassTimeInput value={form.to} onChange={(v) => set({ to: v })} /></div>
          </div>
          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="outline" disabled={sending} onClick={() => close(false)}>Cancel</Button>
            <Button type="submit" disabled={sending || !hasInstructor} className="gap-1.5">
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              {sending ? 'Scheduling…' : 'Add Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
