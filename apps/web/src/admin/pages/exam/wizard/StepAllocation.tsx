import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { asNumber, asString } from '../../../shared/utils/admin-data-utils.js';
import type { StepProps } from './StepSchedule.js';
import { allocationError, filterStudents, type EligibleStudent } from './wizard-model.js';
import { Chip, StepBody, StepHeader, StepLoading, WizardFooter } from './wizard-ui.js';

/** Step 5 — Naji's two-pane allocation: eligible students on the left, the added list on the right. */
export function StepAllocation({ api, authToken, examId, closeLabel, onSaved, onBack, onClose }: StepProps) {
  const [students, setStudents] = useState<EligibleStudent[]>([]);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!examId) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      api.getExamEligibleStudents(authToken, examId),
      api.getExamAllocations(authToken, examId),
    ])
      .then(([list, current]) => {
        if (cancelled) return;
        setStudents(list.map((r) => ({
          user_id: asNumber(r.user_id),
          student_id: asString(r.student_id),
          name: asString(r.name),
          email: asString(r.email),
          courses: asString(r.courses),
        })));
        setPicked(new Set(current));
      })
      .catch(() => { if (!cancelled) setStudents([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api, authToken, examId]);

  const filtered = useMemo(() => filterStudents(students, search), [students, search]);
  const byId = useMemo(() => new Map(students.map((s) => [s.user_id, s])), [students]);

  const togglePick = (uid: number) => setPicked((prev) => { const next = new Set(prev); if (next.has(uid)) next.delete(uid); else next.add(uid); return next; });
  const allFilteredPicked = filtered.length > 0 && filtered.every((s) => picked.has(s.user_id));
  const toggleAll = () => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (allFilteredPicked) filtered.forEach((s) => next.delete(s.user_id));
      else filtered.forEach((s) => next.add(s.user_id));
      return next;
    });
  };

  const handleSave = async (then: 'next' | 'close') => {
    // Naji's design: moving on to publish needs at least one student. Save &
    // Close still stores whatever is picked (an empty list included).
    if (then === 'next') {
      const err = allocationError(picked.size);
      if (err) { toast.error(err); return; }
    }
    setSaving(true);
    try {
      const res = await api.saveExamAllocations(authToken, examId, [...picked]);
      const status = (res as { status?: number }).status;
      const message = asString((res as { message?: unknown }).message) || 'Saved.';
      if (status === 1) { toast.success(message); if (then === 'next') onSaved(); else onClose(); }
      else toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save allocations.');
    } finally { setSaving(false); }
  };

  if (loading) return <StepLoading label="Loading eligible students…" />;

  // Allocated earlier but no longer on the eligible list — still saved with
  // the exam, so they are shown rather than silently carried along.
  const added = [...picked].map((uid) => byId.get(uid) ?? { user_id: uid, student_id: '', name: `Student #${uid}`, email: '', courses: 'No longer eligible' });

  return (
    <>
      <StepBody>
        <StepHeader
          icon={Users}
          title="Allocate Students"
          subtitle="Pick the students who will sit this exam. The list shows students with an active enrolment in the picked courses."
          actions={<Chip tone="primary">{picked.size} selected</Chip>}
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Eligible Students ({students.length})</p>
              <div className="relative w-full max-w-xs">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input aria-label="Search students" placeholder="Search name, email, student ID, course…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-9" />
              </div>
            </div>
            <div className="max-h-[460px] overflow-auto rounded-xl border border-border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label={allFilteredPicked ? 'Clear filtered' : 'Select filtered'}
                        checked={allFilteredPicked}
                        onCheckedChange={toggleAll}
                        disabled={filtered.length === 0}
                      />
                    </TableHead>
                    <TableHead className="text-xs">Student</TableHead>
                    <TableHead className="text-xs">Email</TableHead>
                    <TableHead className="text-xs">Courses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">No eligible students for the picked courses.</TableCell></TableRow>
                  ) : filtered.map((s) => {
                    const checked = picked.has(s.user_id);
                    return (
                      <TableRow key={s.user_id} className={cn('cursor-pointer', checked && 'bg-primary/5')} onClick={() => togglePick(s.user_id)}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox aria-label={`Select ${s.name}`} checked={checked} onCheckedChange={() => togglePick(s.user_id)} />
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.student_id}</p>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.email}</TableCell>
                        <TableCell className="whitespace-normal text-xs text-muted-foreground">{s.courses}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Added Students ({picked.size})</p>
              {picked.size > 0 ? (
                <button type="button" onClick={() => setPicked(new Set())} className="text-[11px] font-medium text-rose-600 hover:underline">Clear all</button>
              ) : null}
            </div>
            {picked.size > 0 ? <p className="text-[11px] text-muted-foreground">All added students receive the exam notification when the exam is first published (if Email is on in the next step).</p> : null}
            <div className="max-h-[460px] overflow-y-auto rounded-xl border border-border bg-muted/20">
              {added.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                  <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Users aria-hidden="true" className="size-5" /></span>
                  <p className="text-sm font-medium text-foreground">No students added yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Select learners from the list to add them here.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {added.map((s) => (
                    <li key={s.user_id} className="flex items-start justify-between gap-2 bg-card px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{[s.student_id, s.courses].filter(Boolean).join(' · ')}</p>
                      </div>
                      <button type="button" onClick={() => togglePick(s.user_id)} className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${s.name}`}>
                        <Trash2 aria-hidden="true" className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </StepBody>
      <WizardFooter
        step={5}
        onBack={onBack}
        onSaveClose={() => { void handleSave('close'); }}
        onContinue={() => { void handleSave('next'); }}
        saving={saving}
        closeLabel={closeLabel}
      />
    </>
  );
}
