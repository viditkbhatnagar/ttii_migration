import { useMemo, useState } from 'react';
import { Layers, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { CoursePlanDialog, type PlanTarget } from '../CoursePlanDialog.js';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pill } from '../../../shared/components/ui-kit.js';
import { nextSort, type SortDir } from '../../cohorts/list-model.js';
import { FilterSelect, PillTab, SortHead } from '../../students/list-chrome.js';
import { distinct, filterPlans, fmtDay, inr, sortPlans, type PlanRow, type PlanSortKey, type PlanStatusTab } from '../centre-profile-model.js';
import { FILTER_SELECT, TAB_CARD, TabEmpty, TabToolbar } from './profile-ui.js';

// "Course & Fee Structure": the centre's real course plans (centre_course_plans
// — course, assigned amount, start / end). Active = today inside its dates.
// The prototype's combination / base fee / discount / GST columns have no
// source per centre and are not shown.

export function FeesTab({
  api, token, centreId, plans, onChanged,
}: {
  api: AdminPortalApi;
  token: string;
  centreId: string;
  plans: PlanRow[];
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [target, setTarget] = useState<PlanTarget | null>(null);
  const [status, setStatus] = useState<PlanStatusTab>('all');
  const [course, setCourse] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: PlanSortKey; dir: SortDir }>({ key: 'course', dir: 'asc' });
  const courses = useMemo(() => distinct(plans.map((p) => p.course)), [plans]);
  const rows = useMemo(() => sortPlans(filterPlans(plans, { status, course, search }), sort.key, sort.dir), [plans, status, course, search, sort]);
  const onSort = (k: PlanSortKey) => setSort((s) => nextSort(s, k));

  const remove = async (p: PlanRow) => {
    const yes = await confirm({
      title: `Remove ${p.course || 'this course'}?`,
      description: 'The centre can no longer add student applications for this course. Existing applications are not affected.',
      confirmText: 'Remove',
      variant: 'destructive',
    });
    if (!yes) return;
    try {
      const res = await api.deleteCentreCoursePlan(token, p.id, centreId);
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(res.message);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove the course.');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-2">
        {(['all', 'Active', 'Inactive'] as const).map((x) => (
          <PillTab key={x} active={status === x} label={x === 'all' ? 'All' : x} count={x === 'all' ? plans.length : plans.filter((p) => p.status === x).length} onClick={() => setStatus(x)} />
        ))}
      </div>
        <Button size="sm" className="h-9 gap-1.5" onClick={() => setTarget({ mode: 'add' })}>
          <Plus aria-hidden="true" className="size-4" /> Assign Course
        </Button>
      </div>
      <Card className={TAB_CARD}>
        <TabToolbar search={search} onSearch={setSearch} placeholder="Search course…">
          <FilterSelect label="Course" value={course} onChange={setCourse} allLabel="All Courses" options={courses.map((c) => ({ value: c, label: c }))} className={FILTER_SELECT} />
        </TabToolbar>
        {rows.length === 0 ? (
          <TabEmpty icon={Layers} text={plans.length ? 'No course plans match your filters.' : 'No courses assigned yet. Assign a course so this centre can add student applications.'} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <SortHead label="Course" k="course" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Centre Fee" k="amount" sortKey={sort.key} dir={sort.dir} onSort={onSort} className="text-right" />
                  <SortHead label="Start" k="start" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="End" k="end" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                  <TableHead className="w-12 text-right text-xs"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">{String(i + 1).padStart(2, '0')}</TableCell>
                    <TableCell className="text-sm font-medium">{r.course || '—'}</TableCell>
                    <TableCell className="text-right text-sm font-semibold tabular-nums">{inr(r.amount)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDay(r.start)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDay(r.end)}</TableCell>
                    <TableCell><Pill tone={r.status === 'Active' ? 'emerald' : 'slate'} className="px-2 py-0.5 text-[11px]">{r.status}</Pill></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-8" aria-label={`Actions for ${r.course || 'course plan'}`}>
                            <MoreHorizontal aria-hidden="true" className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setTarget({ mode: 'edit', plan: r })}><Pencil aria-hidden="true" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => void remove(r)}><Trash2 aria-hidden="true" /> Remove</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
      <CoursePlanDialog
        api={api} token={token} centreId={centreId} target={target}
        onClose={() => setTarget(null)}
        onSaved={() => { setTarget(null); onChanged(); }}
      />
    </div>
  );
}
