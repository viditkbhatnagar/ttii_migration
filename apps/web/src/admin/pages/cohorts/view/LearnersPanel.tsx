import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Eye, Plus, Search, Trash2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPageProps } from '../../../routing/admin-routes.js';
import { asString } from '../../../shared/utils/admin-data-utils.js';
import { EmptyState } from '../../../shared/components/ui-kit.js';
import { initials, toLearnerView, type LearnerView } from './cohort-detail-model.js';
import { DialogShell } from './DialogShell.js';
import { PanelHeader } from './panel-ui.js';

type Api = AdminPageProps['api'];

export function LearnersPanel({
  api, token, cohortId, learners, cohortInfo, onReload,
}: {
  api: Api;
  token: string;
  cohortId: string;
  learners: Record<string, unknown>[];
  /** Rows for the View Learner dialog (cohort, subject, course, language, faculty). */
  cohortInfo: Array<{ label: string; value: string }>;
  onReload: () => void;
}) {
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<LearnerView | null>(null);
  const views = useMemo(() => learners.map(toLearnerView), [learners]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? views.filter((l) => l.name.toLowerCase().includes(q)) : views;
  }, [views, search]);

  const remove = async (l: LearnerView) => {
    const ok = await confirm({
      title: `Remove ${l.name} from this cohort?`,
      description: 'This action cannot be undone.',
      confirmText: 'Remove',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await api.removeCohortLearner(token, cohortId, l.id);
      toast.success(asString(res.message) || `${l.name} removed from cohort`);
      onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove learner');
    }
  };

  return (
    <Card className="gap-0 border-border/70 p-0 shadow-[var(--shadow-soft)]">
      <PanelHeader title={`Learners List (${views.length})`} subtitle="Enrolled students in this cohort.">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search learners" placeholder="Search learners" className="h-9 w-44 rounded-full pl-9 sm:w-56" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" className="size-4" /> Add
        </Button>
      </PanelHeader>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title={views.length === 0 ? 'No learners enrolled in this cohort.' : 'No learners match your search.'} />
      ) : (
        <div className="grid gap-2.5 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((l, idx) => (
            <div key={l.id} className="group flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3 py-2.5 transition hover:border-primary/40 hover:bg-primary/5">
              <span className="w-5 text-center text-xs font-medium text-muted-foreground">{idx + 1}</span>
              <Avatar className="size-9">
                {l.image ? <AvatarImage src={l.image} alt="" /> : null}
                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">{initials(l.name)}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm font-medium tracking-wide">{l.name || '-'}</span>
              <button
                type="button"
                className="rounded-lg p-1.5 text-primary transition hover:bg-primary/10"
                aria-label={`View ${l.name}`}
                title="View learner"
                onClick={() => setViewing(l)}
              >
                <Eye aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                className="rounded-lg p-1.5 text-destructive transition hover:bg-destructive/10"
                aria-label={`Remove ${l.name}`}
                title="Remove"
                onClick={() => void remove(l)}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <AddLearnersDialog api={api} token={token} cohortId={cohortId} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); onReload(); }} />
      ) : null}

      <DialogShell
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.name || 'Learner'}
        footer={<Button variant="outline" onClick={() => setViewing(null)}>Close</Button>}
      >
        {viewing ? (
          <dl className="divide-y divide-border text-sm">
            {[
              { label: 'Enrollment', value: viewing.enrollmentId },
              { label: 'Course', value: viewing.course },
              { label: 'Offering', value: viewing.offering },
              ...cohortInfo,
            ].map((r) => (
              <div key={r.label} className="grid grid-cols-3 gap-2 py-2">
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className="col-span-2 font-medium text-foreground">{r.value || '—'}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </DialogShell>
    </Card>
  );
}

function AddLearnersDialog({
  api, token, cohortId, onClose, onAdded,
}: { api: Api; token: string; cohortId: string; onClose: () => void; onAdded: () => void }) {
  const [available, setAvailable] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.loadAvailableLearners(token, cohortId)
      .then(setAvailable)
      .catch((err: unknown) => {
        setAvailable([]);
        toast.error(err instanceof Error ? err.message : 'Could not load students.');
      })
      .finally(() => setLoading(false));
  }, [api, token, cohortId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? available.filter((s) => asString(s.name).toLowerCase().includes(q)) : available;
  }, [available, search]);
  const idOf = (s: Record<string, unknown>) => asString(s.id) || asString(s._id);
  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const submit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      const res = await api.addCohortLearners(token, cohortId, [...selected]);
      toast.success(asString(res.message) || `${selected.size} learner${selected.size === 1 ? '' : 's'} added`);
      onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add learners');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogShell
      open
      onClose={onClose}
      title="Add learners"
      description="Pick students to enrol in this cohort"
      onSubmit={() => void submit()}
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting || selected.size === 0}>{submitting ? 'Assigning…' : 'Add to Cohort'}</Button>
        </>
      )}
    >
      <div className="space-y-3">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search students" placeholder="Search students" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={allSelected}
              disabled={filtered.length === 0}
              onCheckedChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map(idOf)))}
            />
            Select all
          </label>
          <span>{selected.size} students selected</span>
        </div>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No available students.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {filtered.map((s) => {
              const id = idOf(s);
              const name = asString(s.name);
              return (
                <li key={id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40">
                    <Checkbox checked={selected.has(id)} onCheckedChange={() => toggle(id)} aria-label={`Select ${name}`} />
                    <Avatar className="size-8">
                      {asString(s.image) ? <AvatarImage src={asString(s.image)} alt="" /> : null}
                      <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">{initials(name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">{name || '—'}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {[asString(s.student_id), asString(s.course_title)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DialogShell>
  );
}
