import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { Pill } from '../../shared/components/ui-kit.js';
import { serverResult } from '../students/student-view/student-view-model.js';
import {
  EMPTY_TARGET_FORM, MONTHS, PHASE_TONE, TARGET_TYPES, TYPE_TONE, formFromRow, monthLabel, targetPayload, yearOptions,
  type TargetFormValues, type TargetRow,
} from './counsellor-target-model.js';
import { formatYmd } from './staff-model.js';

// Assign / Edit Target and View Target dialogs (Naji's TargetsModule), on the
// UNCHANGED add / edit payload: counsellor, type, value, assigned month + year
// (stored as the month's first..last day) and remarks.

const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';
const DIALOG_STYLE = { width: 'min(560px, calc(100vw - 2rem))', maxWidth: 'min(560px, calc(100vw - 2rem))' };
const DIALOG_CLASS = 'flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0';

export type TargetDialogState =
  | { mode: 'add'; presetUserId?: string; presetMonth?: string; presetYear?: string }
  | { mode: 'edit'; row: TargetRow }
  | null;

const VALUE_HINT: Record<string, string> = {
  Applications: 'Number of applications',
  Enrolments: 'Number of enrolments',
  Points: 'Associated points from enrolled packages',
  Revenue: 'Target amount',
};

export function TargetFormDialog({ state, counsellors, api, token, onClose, onSaved }: {
  state: TargetDialogState;
  counsellors: Array<{ id: string; name: string }>;
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [v, setV] = useState<TargetFormValues>(EMPTY_TARGET_FORM);
  const [saving, setSaving] = useState(false);
  const isEdit = state?.mode === 'edit';

  useEffect(() => {
    if (!state) return;
    if (state.mode === 'edit') setV(formFromRow(state.row));
    else setV({ ...EMPTY_TARGET_FORM, userId: state.presetUserId ?? '', month: state.presetMonth ?? '', year: state.presetYear ?? '' });
  }, [state]);

  const set = <K extends keyof TargetFormValues>(k: K) => (val: TargetFormValues[K]) => setV((s) => ({ ...s, [k]: val }));
  const payload = targetPayload(v);

  const submit = async () => {
    if (!payload || !state) return;
    setSaving(true);
    try {
      const res = state.mode === 'edit'
        ? await api.editCounsellorTarget(token, state.row.id, payload)
        : await api.addCounsellorTarget(token, payload);
      const { ok, message } = serverResult(res, state.mode === 'edit' ? 'Target updated.' : 'Target assigned.', 'Failed to save target');
      if (ok) toast.success(message); else toast.error(message);
      onClose();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save target');
    } finally {
      setSaving(false);
    }
  };

  // Keep an edited target's counsellor selectable even if they left the list.
  const options = state?.mode === 'edit' && v.userId && !counsellors.some((c) => c.id === v.userId)
    ? [{ id: v.userId, name: state.row.counsellor || `#${v.userId}` }, ...counsellors]
    : counsellors;

  return (
    <Dialog open={state !== null} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent style={DIALOG_STYLE} className={DIALOG_CLASS}>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <DialogTitle className="text-xl font-semibold">{isEdit ? 'Edit Target' : 'Assign Target'}</DialogTitle>
            <DialogDescription>Set a monthly applications, enrolments, points or revenue target for a counsellor.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="ct-counsellor" className="text-xs font-semibold">Counsellor <span className="text-destructive">*</span></Label>
                <select id="ct-counsellor" className={SELECT_CLASS} value={v.userId} onChange={(e) => set('userId')(e.target.value)}>
                  <option value="">Select Counsellor</option>
                  {options.map((c) => <option key={c.id} value={c.id}>{c.name || `#${c.id}`}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ct-month" className="text-xs font-semibold">Assigned Month <span className="text-destructive">*</span></Label>
                <select id="ct-month" className={SELECT_CLASS} value={v.month} onChange={(e) => set('month')(e.target.value)}>
                  <option value="">Month</option>
                  {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ct-year" className="text-xs font-semibold">Year <span className="text-destructive">*</span></Label>
                <select id="ct-year" className={SELECT_CLASS} value={v.year} onChange={(e) => set('year')(e.target.value)}>
                  <option value="">Year</option>
                  {yearOptions(new Date(), v.year).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ct-type" className="text-xs font-semibold">Target Type <span className="text-destructive">*</span></Label>
                <select id="ct-type" className={SELECT_CLASS} value={v.type} onChange={(e) => set('type')(e.target.value)}>
                  {TARGET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ct-value" className="text-xs font-semibold">Target Value <span className="text-destructive">*</span></Label>
                <Input id="ct-value" type="number" min={0} inputMode="numeric" value={v.value} onChange={(e) => set('value')(e.target.value)} placeholder="Enter target value" />
                <p className="text-[11px] text-muted-foreground">{VALUE_HINT[v.type] ?? ''}</p>
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="ct-remarks" className="text-xs font-semibold">Remarks</Label>
                <textarea id="ct-remarks" rows={3} className={`${SELECT_CLASS} h-auto min-h-[80px] resize-y py-2`} value={v.remarks} onChange={(e) => set('remarks')(e.target.value)} placeholder="Optional remarks" />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" className="gap-1.5" disabled={saving || !payload}>
              {isEdit ? <Save aria-hidden="true" className="size-4" /> : <Plus aria-hidden="true" className="size-4" />}
              {saving ? 'Saving...' : isEdit ? 'Update' : 'Assign Target'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TargetViewDialog({ row, onClose, onEdit }: { row: TargetRow | null; onClose: () => void; onEdit: (row: TargetRow) => void }) {
  const items: Array<[string, React.ReactNode]> = row ? [
    ['Target ID', `#${row.id}`],
    ['Counsellor', row.counsellorEmail ? `${row.counsellor || '—'} (${row.counsellorEmail})` : row.counsellor || '—'],
    ['Target Type', <Pill key="t" tone={TYPE_TONE[row.type] ?? 'slate'}>{row.type || '—'}</Pill>],
    ['Assigned Month', monthLabel(row.monthKey) || '—'],
    ['Period', row.from && row.to ? `${formatYmd(row.from)} to ${formatYmd(row.to)}` : '—'],
    ['Target Value', row.value],
    ['Achieved', row.achieved],
    ['Progress', `${row.pct}%`],
    ['State', row.phase ? <Pill key="p" tone={PHASE_TONE[row.phase]}>{row.phase}</Pill> : '—'],
    ['Remarks', row.remarks || '—'],
  ] : [];
  return (
    <Dialog open={row !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent style={DIALOG_STYLE} className={DIALOG_CLASS}>
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="text-lg font-semibold">{row ? `${row.type} target — ${row.counsellor || 'Counsellor'}` : 'Target'}</DialogTitle>
          <DialogDescription>{row ? monthLabel(row.monthKey) : ''}</DialogDescription>
        </DialogHeader>
        <dl className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {items.map(([k, val]) => (
            <div key={k} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 last:border-0">
              <dt className="text-xs font-medium text-muted-foreground">{k}</dt>
              <dd className="max-w-[60%] text-right text-sm text-foreground">{val}</dd>
            </div>
          ))}
        </dl>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {row ? <Button className="gap-1.5" onClick={() => onEdit(row)}><Pencil aria-hidden="true" className="size-4" />Edit Target</Button> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
