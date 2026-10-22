import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { usePortalThemeClass } from '@/lib/portal-theme';
import { cn } from '@/lib/utils';
import type { CentrePortalApi } from '../../centre-portal-api.js';
import { matchesQuery } from '../kit/format.js';
import type { Learner } from './cohort-model.js';

interface AddLearnersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: CentrePortalApi;
  token: string;
  cohortId: string;
  /** The centre's students who are not in the cohort yet. */
  candidates: Learner[];
  onAdded: () => void;
}

/** Add the centre's own students to the cohort (existing POST /centre/cohorts/add_cohort_students). */
export function AddLearnersDialog({ open, onOpenChange, api, token, cohortId, candidates, onAdded }: AddLearnersDialogProps) {
  const portalTheme = usePortalThemeClass();
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = useMemo(() => candidates.filter((c) => matchesQuery(search, [c.name, c.studentCode])), [candidates, search]);

  const close = (next: boolean) => {
    if (sending) return;
    if (!next) { setPicked([]); setSearch(''); setError(null); }
    onOpenChange(next);
  };
  const toggle = (id: string, on: boolean) => setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));

  const submit = async () => {
    if (picked.length === 0) { setError('Tick at least one student.'); return; }
    setSending(true);
    setError(null);
    try {
      const res = await api.addCohortStudents(token, cohortId, picked);
      if (res.success !== true && res.status !== 1) {
        setError(typeof res.message === 'string' && res.message ? res.message : 'Could not add the students.');
        return;
      }
      toast.success(`${picked.length} learner${picked.length === 1 ? '' : 's'} added`);
      setPicked([]);
      onOpenChange(false);
      onAdded();
    } catch (err: unknown) {
      setError(err instanceof Error && err.message ? err.message : 'Could not add the students. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className={cn(portalTheme, 'modal-maxh overflow-y-auto')} style={{ width: 'min(32rem, calc(100vw - 2rem))', maxWidth: 'none' }}>
        <DialogHeader>
          <DialogTitle>Add Learners</DialogTitle>
          <DialogDescription>Choose students of your centre to add to this cohort.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <label htmlFor="learner-search" className="sr-only">Search students</label>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input id="learner-search" className="pl-9" placeholder="Search by name or student ID" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="max-h-72 min-h-0 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {shown.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                <Checkbox checked={picked.includes(c.id)} onCheckedChange={(v) => toggle(c.id, v === true)} />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.studentCode}</span>
              </label>
            ))}
            {shown.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {candidates.length === 0 ? 'Every student of your centre is already in this cohort.' : 'No students match your search.'}
              </p>
            )}
          </div>
          {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" disabled={sending} onClick={() => close(false)}>Cancel</Button>
          <Button type="button" disabled={sending || picked.length === 0} className="gap-1.5" onClick={() => void submit()}>
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            {sending ? 'Adding…' : picked.length === 0 ? 'Add Learners' : `Add ${picked.length} Learner${picked.length === 1 ? '' : 's'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
