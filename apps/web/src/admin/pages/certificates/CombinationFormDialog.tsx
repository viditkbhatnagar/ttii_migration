import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import {
  buildCodeFromPartners,
  isActiveStatus,
  isDuplicateCombination,
  normalizeCombinationCode,
  type CombinationRow,
} from './partner-model.js';

// New / Edit Certificate Combination in Naji's dialog order: Program → Course →
// partners → code (auto from the partners, still editable as before) → GST →
// Status. Same body to the same endpoints as the old form.

export interface Option { id: string; label: string; programId?: string }
export interface PartnerOption { id: string; code: string; name: string; shortName: string; status: string }

interface ComboForm {
  combination_code: string;
  program_id: string;
  course_id: string;
  partner_ids: string[];
  gst_applicable: boolean;
  gst_percent: string;
  status: string;
}

const EMPTY: ComboForm = {
  combination_code: '', program_id: '', course_id: '', partner_ids: [], gst_applicable: true, gst_percent: '18', status: 'active',
};

const WIDTH = 'min(640px, calc(100vw - 2rem))';
const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

const generateCode = (): string => `CC-${Date.now().toString(36).toUpperCase().slice(-6)}`;

function formFrom(r: CombinationRow): ComboForm {
  return {
    combination_code: r.code,
    program_id: r.programId,
    course_id: r.courseId,
    partner_ids: r.partners.map((p) => p.id),
    gst_applicable: r.gst,
    gst_percent: r.gstPercent === null ? '18' : String(r.gstPercent),
    status: r.status || 'active',
  };
}

export function CombinationFormDialog({
  open, editing, rows, programs, courses, partners, api, token, onClose, onSaved,
}: {
  open: boolean;
  editing: CombinationRow | null;
  rows: CombinationRow[];
  programs: Option[];
  courses: Option[];
  partners: PartnerOption[];
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<ComboForm>(EMPTY);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? formFrom(editing) : { ...EMPTY, combination_code: generateCode() });
    setError('');
  }, [open, editing]);

  // Naji 2026-05-14 — picking partners fills the code as "Code1 + Code2".
  useEffect(() => {
    if (!open || form.partner_ids.length === 0) return;
    const next = buildCodeFromPartners(partners, form.partner_ids);
    if (next) setForm((f) => (f.combination_code === next ? f : { ...f, combination_code: next }));
  }, [open, form.partner_ids, partners]);

  // Courses narrow to the chosen program when the course list carries one;
  // the selected course always stays listed.
  const courseOptions = useMemo(() => {
    if (!form.program_id) return courses;
    const inProgram = courses.filter((c) => c.programId === form.program_id || c.id === form.course_id);
    return inProgram.some((c) => c.id !== form.course_id) ? inProgram : courses;
  }, [courses, form.program_id, form.course_id]);

  // Inactive partners are hidden unless this combination already uses them.
  const partnerOptions = partners.filter((p) => isActiveStatus(p.status) || form.partner_ids.includes(p.id));

  const set = <K extends keyof ComboForm>(k: K, v: ComboForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const togglePartner = (id: string) => setForm((f) => ({
    ...f,
    partner_ids: f.partner_ids.includes(id) ? f.partner_ids.filter((x) => x !== id) : [...f.partner_ids, id],
  }));

  const submit = async () => {
    if (!form.combination_code.trim()) { setError('Combination code is required'); return; }
    if (isDuplicateCombination(rows, editing?.id ?? '', form.course_id, form.partner_ids)) {
      setError('This combination of partners already exists for this course');
      return;
    }
    const pct = Number(form.gst_percent);
    if (form.gst_applicable && form.gst_percent.trim() !== '' && (!Number.isFinite(pct) || pct < 0 || pct > 100)) {
      setError('GST % must be between 0 and 100');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        combination_code: normalizeCombinationCode(form.combination_code),
        program_id: form.program_id || undefined,
        course_id: form.course_id || undefined,
        partner_ids: form.partner_ids,
        gst_applicable: form.gst_applicable,
        gst_percent: form.gst_applicable ? Number(form.gst_percent) || 18 : 0,
        status: form.status,
      };
      const res = editing
        ? await api.updateCertificateCombination(token, editing.id, payload)
        : await api.createCertificateCombination(token, payload);
      toast.success(asString(res.message) || (editing ? 'Combination updated.' : 'Combination created.'));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save combination');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent style={{ width: WIDTH, maxWidth: WIDTH }} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle>{editing ? 'Edit Certificate Combination' : 'New Certificate Combination'}</DialogTitle>
          <DialogDescription>Partner combination students can choose when they apply or enrol.</DialogDescription>
        </DialogHeader>
        <form id="combination-form" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="combo-program">Program</Label>
            <select id="combo-program" className={SELECT_CLASS} value={form.program_id} onChange={(e) => set('program_id', e.target.value)}>
              <option value="">— Select Program —</option>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="combo-course">Course</Label>
            <select id="combo-course" className={SELECT_CLASS} value={form.course_id} onChange={(e) => set('course_id', e.target.value)}>
              <option value="">— Select Course —</option>
              {courseOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Combination (choose one or more partners)</legend>
            {partnerOptions.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                No certification partners yet. Add them under Partner Management → Certification Partners first.
              </p>
            ) : (
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {partnerOptions.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/40">
                    <Checkbox checked={form.partner_ids.includes(p.id)} onCheckedChange={() => togglePartner(p.id)} />
                    <span className="font-semibold">{p.code}</span>
                    <span className="truncate text-muted-foreground">— {p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
          <div className="space-y-1.5">
            <Label htmlFor="combo-code">Combination Code (auto)</Label>
            <Input id="combo-code" value={form.combination_code} placeholder="CC-XXXXXX" onChange={(e) => set('combination_code', e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-sm font-medium">GST Applicability</span>
              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm">
                <Checkbox checked={form.gst_applicable} onCheckedChange={(v) => set('gst_applicable', v === true)} />
                {form.gst_applicable ? 'Yes' : 'No'}
              </label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="combo-gst">GST % (default 18)</Label>
              <Input id="combo-gst" type="number" step="0.01" disabled={!form.gst_applicable} value={form.gst_percent} onChange={(e) => set('gst_percent', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="combo-status">Status</Label>
            <select id="combo-status" className={SELECT_CLASS} value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </form>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-3">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button type="submit" form="combination-form" disabled={saving || !form.combination_code.trim()}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
