import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ClipboardList, Download, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useConfirm } from '@/components/confirm-dialog';
import { cn } from '@/lib/utils';
import type { AdminPageProps } from '../../../routing/admin-routes.js';
import { asNumber, asString, formatDate, toRecords } from '../../../shared/utils/admin-data-utils.js';
import { EmptyState, StatBox } from '../../../shared/components/ui-kit.js';
import { instructionLines } from '../../exam/exam-list-model.js';
import { dmy } from '../list-model.js';
import { AssignmentDialog, GradeDialog } from './AssignmentDialogs.js';
import { evaluatedCount, initials } from './cohort-detail-model.js';
import { IconBtn, PanelHeader } from './panel-ui.js';

type Api = AdminPageProps['api'];
type SubTab = 'details' | 'submissions' | 'unsubmitted';
const SUB_TABS: Array<{ id: SubTab; label: string }> = [
  { id: 'details', label: 'Details' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'unsubmitted', label: 'Unsubmitted Students' },
];

const idOf = (r: Record<string, unknown>) => asString(r.id) || asString(r._id);

export function AssignmentsPanel({
  api, token, cohortId, cohortName, studentCount, assignments, onReload,
}: {
  api: Api;
  token: string;
  cohortId: string;
  cohortName: string;
  studentCount: number;
  assignments: Record<string, unknown>[];
  onReload: () => void;
}) {
  const confirm = useConfirm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>('details');
  const [subsData, setSubsData] = useState<Record<string, unknown> | null>(null);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [dialog, setDialog] = useState<{ kind: 'add' } | { kind: 'edit'; row: Record<string, unknown> } | null>(null);
  const [grading, setGrading] = useState<Record<string, unknown> | null>(null);

  const selected = useMemo(() => assignments.find((a) => idOf(a) === selectedId) ?? null, [assignments, selectedId]);

  const loadSubs = useCallback(async (assignmentId: string) => {
    setLoadingSubs(true);
    try {
      setSubsData(await api.loadCohortAssignmentSubmissions(token, assignmentId));
    } catch (err) {
      setSubsData(null);
      toast.error(err instanceof Error ? err.message : 'Could not load submissions.');
    } finally {
      setLoadingSubs(false);
    }
  }, [api, token]);

  useEffect(() => {
    setSubsData(null);
    if (selectedId) void loadSubs(selectedId);
  }, [selectedId, loadSubs]);

  const submissions = useMemo(() => toRecords(subsData?.submissions), [subsData]);
  const unsubmitted = useMemo(() => toRecords(subsData?.unsubmitted), [subsData]);

  const deleteAssignment = async (a: Record<string, unknown>) => {
    const ok = await confirm({
      title: `Delete "${asString(a.title)}"?`,
      description: 'Students will no longer see this assignment. This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      const res = await api.deleteAssignment(token, idOf(a));
      toast.success(asString(res.message) || 'Assignment deleted');
      setSelectedId(null);
      onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete assignment');
    }
  };

  const deleteSubmissionFile = async (submissionId: string) => {
    const ok = await confirm({ title: 'Delete this submission file?', description: 'This action cannot be undone.', confirmText: 'Delete', variant: 'destructive' });
    if (!ok) return;
    try {
      const res = await api.deleteAssignmentSubmission(token, submissionId);
      toast.success(asString(res.message) || 'Submission file deleted');
      if (selectedId) await loadSubs(selectedId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const file = selected ? asString(selected.file) || asString(selected.attachment) : '';
  const lines = selected ? instructionLines(asString(selected.instructions)) : [];

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="gap-0 border-border/70 p-0 shadow-[var(--shadow-soft)]">
        <PanelHeader title="Assignments">
          <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setDialog({ kind: 'add' })}>
            <Plus aria-hidden="true" className="size-4" /> Add
          </Button>
        </PanelHeader>
        {assignments.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No assignments yet." body="Create your first assignment to get started." />
        ) : (
          <div className="space-y-2 p-3">
            {assignments.map((a) => {
              const id = idOf(a);
              const active = id === selectedId;
              return (
                <div
                  key={id}
                  className={cn('flex items-start gap-2 rounded-xl border px-3 py-2.5 transition', active ? 'border-primary bg-primary/5' : 'border-border/70 hover:border-primary/30')}
                >
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setSelectedId(id); setSubTab('details'); }}>
                    <span className="block truncate text-sm font-semibold">{asString(a.title)}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {asString(a.total_marks) || '-'} marks · Due {dmy(a.due_date) || '-'} · {asNumber(a.submissions_count)} submitted
                    </span>
                    {asString(a.description) ? <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{asString(a.description)}</span> : null}
                  </button>
                  <IconBtn icon={Pencil} tone="muted" label={`Edit ${asString(a.title)}`} onClick={() => setDialog({ kind: 'edit', row: a })} />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="gap-0 border-border/70 p-0 shadow-[var(--shadow-soft)]">
        {!selected ? (
          <p className="grid h-full place-items-center p-16 text-center text-sm text-muted-foreground">Select an assignment to view details.</p>
        ) : (
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">{asString(selected.title)}</h3>
                <p className="text-xs text-muted-foreground">Cohort: {cohortName}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialog({ kind: 'edit', row: selected })}>
                  <Pencil aria-hidden="true" className="size-4" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 text-destructive" onClick={() => void deleteAssignment(selected)}>
                  <Trash2 aria-hidden="true" className="size-4" /> Delete
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <StatBox label="Students" value={studentCount} tone="primary" />
              <StatBox label="Submitted" value={subsData ? submissions.length : asNumber(selected.submissions_count)} tone="blue" />
              <StatBox label="Evaluated" value={subsData ? evaluatedCount(submissions) : '—'} tone="emerald" />
            </div>

            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-muted-foreground">Deadline</dt><dd className="font-medium">{dmy(selected.due_date) || formatDate(selected.due_date) || '-'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Total Marks</dt><dd className="font-medium">{asString(selected.total_marks) || '-'}</dd></div>
              <div>
                <dt className="text-xs text-muted-foreground">File</dt>
                <dd>
                  {file ? (
                    <a href={file} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                      <Download aria-hidden="true" className="size-3" /> Download
                    </a>
                  ) : <span className="text-muted-foreground">-</span>}
                </dd>
              </div>
            </dl>

            <div role="tablist" aria-label="Assignment" className="flex gap-1 border-b border-border">
              {SUB_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={subTab === t.id}
                  onClick={() => setSubTab(t.id)}
                  className={cn('-mb-px border-b-2 px-4 py-2 text-sm font-medium transition', subTab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {subTab === 'details' ? (
              <div className="space-y-3 text-sm">
                {asString(selected.description) ? (
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">Question</p>
                    <p className="whitespace-pre-wrap text-foreground">{asString(selected.description)}</p>
                  </div>
                ) : null}
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider text-primary">Instructions</p>
                  {lines.length === 0 ? (
                    <p className="text-muted-foreground">No instructions.</p>
                  ) : (
                    <ul className="list-disc space-y-1 pl-5 text-foreground">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
                  )}
                </div>
              </div>
            ) : loadingSubs ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Loading submissions…</p>
            ) : subTab === 'submissions' ? (
              submissions.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No submissions yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-left text-muted-foreground">
                      <tr>
                        <th className="px-2 py-2">#</th>
                        <th className="px-2 py-2">Student ID</th>
                        <th className="px-2 py-2">Student</th>
                        <th className="px-2 py-2">Submission Date</th>
                        <th className="px-2 py-2">Score</th>
                        <th className="px-2 py-2">Remarks</th>
                        <th className="px-2 py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {submissions.map((sub, idx) => (
                        <tr key={asString(sub.id) || idx}>
                          <td className="px-2 py-2">{idx + 1}</td>
                          <td className="px-2 py-2">{asString(sub.student_id)}</td>
                          <td className="px-2 py-2">
                            <StudentCell name={asString(sub.student_name)} image={asString(sub.image)} />
                          </td>
                          <td className="px-2 py-2">{formatDate(sub.submitted_at) || '-'}</td>
                          <td className="px-2 py-2">{asString(sub.marks) || '-'}</td>
                          <td className="max-w-[150px] truncate px-2 py-2">{asString(sub.remarks) || '-'}</td>
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-center">
                              <IconBtn icon={Pencil} tone="info" label="Grade submission" onClick={() => setGrading(sub)} />
                              {asString(sub.file) ? (
                                <IconBtn icon={FileText} tone="muted" label="View submission file" onClick={() => window.open(asString(sub.file), '_blank', 'noopener,noreferrer')} />
                              ) : null}
                              <IconBtn icon={Trash2} tone="danger" label="Delete submission" onClick={() => void deleteSubmissionFile(asString(sub.id))} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : unsubmitted.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">All students have submitted.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 text-left text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2">#</th>
                      <th className="px-2 py-2">Student ID</th>
                      <th className="px-2 py-2">Student</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {unsubmitted.map((u, idx) => (
                      <tr key={asString(u.id) || idx}>
                        <td className="px-2 py-2">{idx + 1}</td>
                        <td className="px-2 py-2">{asString(u.student_id)}</td>
                        <td className="px-2 py-2"><StudentCell name={asString(u.name)} image={asString(u.image)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {dialog ? (
        <AssignmentDialog
          api={api}
          token={token}
          cohortId={cohortId}
          assignment={dialog.kind === 'edit' ? dialog.row : null}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); onReload(); }}
        />
      ) : null}
      {grading && selected ? (
        <GradeDialog
          api={api}
          token={token}
          submission={grading}
          assignmentMarks={asNumber(selected.total_marks)}
          onClose={() => setGrading(null)}
          onSaved={() => {
            setGrading(null);
            onReload();
            if (selectedId) void loadSubs(selectedId);
          }}
        />
      ) : null}
    </div>
  );
}

function StudentCell({ name, image }: { name: string; image: string }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="size-6">
        {image ? <AvatarImage src={image} alt="" /> : null}
        <AvatarFallback className="bg-primary text-[9px] text-primary-foreground">{initials(name || 'S')}</AvatarFallback>
      </Avatar>
      <span className="font-medium uppercase">{name}</span>
    </div>
  );
}
