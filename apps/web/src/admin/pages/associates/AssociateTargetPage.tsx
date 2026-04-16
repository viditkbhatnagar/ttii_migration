import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString, toRecords, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../shared/components/AdminDataTable.js';
import { AdminStatusBadge } from '../../shared/components/AdminStatusBadge.js';

const TARGET_TYPES = ['Applications', 'Enrolments', 'Revenue'] as const;

const TYPE_BADGE_MAP: Record<string, string> = {
  applications: 'registered',
  enrolments: 'mcq',
  revenue: 'active',
};

function parsePeriod(period: unknown): { from: string; to: string } {
  const str = asString(period);
  const parts = str.split(' to ');
  return { from: parts[0]?.trim() ?? '', to: parts[1]?.trim() ?? '' };
}

export default function AssociateTargetPage({ api, session }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadAssociateTargets(session.token),
    [],
  );

  const [associates, setAssociates] = useState<Record<string, unknown>[]>([]);
  const [associatesLoaded, setAssociatesLoaded] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formUserId, setFormUserId] = useState('');
  const [formType, setFormType] = useState<string>(TARGET_TYPES[0]);
  const [formValue, setFormValue] = useState('');
  const [formFrom, setFormFrom] = useState('');
  const [formTo, setFormTo] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const allTargets = useMemo(() => toRecords(data), [data]);

  const totalTarget = useMemo(
    () => allTargets.reduce((sum, row) => sum + asNumber(row.target_value), 0),
    [allTargets],
  );

  const totalAchieved = useMemo(
    () => allTargets.reduce((sum, row) => sum + asNumber(row.achieved_value), 0),
    [allTargets],
  );

  async function loadAssociatesIfNeeded() {
    if (associatesLoaded) return;
    try {
      const list = await api.loadAssociates(session.token);
      setAssociates(Array.isArray(list) ? list : []);
    } catch {
      setAssociates([]);
    }
    setAssociatesLoaded(true);
  }

  function resetForm() {
    setEditingId(null);
    setFormUserId('');
    setFormType(TARGET_TYPES[0]);
    setFormValue('');
    setFormFrom('');
    setFormTo('');
    setFormRemarks('');
  }

  function openAdd() {
    resetForm();
    void loadAssociatesIfNeeded();
    setDialogOpen(true);
  }

  function openEdit(row: Record<string, unknown>) {
    const { from, to } = parsePeriod(row.period);
    setEditingId(asString(row.id || row._id));
    setFormUserId(asString(row.user_id));
    setFormType(asString(row.target_type) || TARGET_TYPES[0]);
    setFormValue(String(asNumber(row.target_value)));
    setFormFrom(from);
    setFormTo(to);
    setFormRemarks(asString(row.remarks));
    void loadAssociatesIfNeeded();
    setDialogOpen(true);
  }

  async function handleDelete(row: Record<string, unknown>) {
    const id = asString(row.id || row._id);
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this target?')) return;
    try {
      await api.deleteAssociateTarget(session.token, id);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete target');
    }
  }

  async function handleSubmit() {
    if (!formUserId || !formType || !formValue || !formFrom || !formTo) return;
    setSubmitting(true);
    const input = {
      user_id: formUserId,
      target_type: formType,
      target_value: Number(formValue),
      period_from: formFrom,
      period_to: formTo,
      remarks: formRemarks || undefined,
    };
    try {
      if (editingId) {
        await api.editAssociateTarget(session.token, editingId, input);
      } else {
        await api.addAssociateTarget(session.token, '', input);
      }
      setDialogOpen(false);
      resetForm();
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save target');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: DataTableColumn[] = useMemo(
    () => [
      { key: 'associate_name', label: 'Associate Name', sortable: true },
      {
        key: 'target_type',
        label: 'Type',
        render: (v) => {
          const typeStr = asString(v);
          const badgeVariant = TYPE_BADGE_MAP[typeStr.toLowerCase()] ?? typeStr.toLowerCase();
          return <AdminStatusBadge status={badgeVariant || typeStr} />;
        },
      },
      { key: 'target_value', label: 'Point/Count', sortable: true },
      {
        key: 'period',
        label: 'From',
        render: (v) => formatDate(parsePeriod(v).from),
      },
      {
        key: 'period',
        label: 'To',
        render: (v) => formatDate(parsePeriod(v).to),
      },
      { key: 'achieved_value', label: 'Achieved', sortable: true },
      {
        key: 'achieved_value',
        label: 'Performance %',
        render: (_v, row) => {
          const target = asNumber(row.target_value);
          const achieved = asNumber(row.achieved_value);
          const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;
          return (
            <span className={pct >= 100 ? 'text-green-600 font-medium' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}>
              {pct}%
            </span>
          );
        },
      },
    ],
    [],
  );

  const actions: DataTableAction[] = useMemo(
    () => [
      { label: 'Edit', onClick: (row) => openEdit(row) },
      { label: 'Delete', onClick: (row) => void handleDelete(row), variant: 'destructive' as const },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (loading) {
    return <PageLoader label="Loading associate target..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  const overallPct = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;

  const selectClass = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Associate Target" addLabel="+ Add Target" onAdd={openAdd} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Entries', value: allTargets.length },
          { label: 'Total Target', value: totalTarget },
          { label: 'Total Achieved', value: totalAchieved },
          { label: 'Overall Progress', value: `${overallPct}%` },
        ].map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500">{card.label}</p>
              <p className="text-2xl font-semibold text-gray-900">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminDataTable columns={columns} rows={allTargets} actions={actions} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Target' : 'Add Target'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="at-associate">Associate</Label>
              <select
                id="at-associate"
                className={selectClass}
                value={formUserId}
                onChange={(e) => setFormUserId(e.target.value)}
              >
                <option value="">Select Associate</option>
                {associates.map((a) => (
                  <option key={asString(a.id || a._id)} value={asString(a.id || a._id)}>
                    {asString(a.name || a.full_name || a.email)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="at-type">Target Type</Label>
              <select
                id="at-type"
                className={selectClass}
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              >
                {TARGET_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="at-value">Target Value</Label>
              <Input
                id="at-value"
                type="number"
                min={0}
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="Enter target value"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="at-from">Period From</Label>
                <Input
                  id="at-from"
                  type="date"
                  value={formFrom}
                  onChange={(e) => setFormFrom(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="at-to">Period To</Label>
                <Input
                  id="at-to"
                  type="date"
                  value={formTo}
                  onChange={(e) => setFormTo(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="at-remarks">Remarks</Label>
              <textarea
                id="at-remarks"
                className={`${selectClass} min-h-[80px] resize-y`}
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                placeholder="Optional remarks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={submitting || !formUserId || !formType || !formValue || !formFrom || !formTo}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
