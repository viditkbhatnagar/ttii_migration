import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseEachWord } from '@/lib/text-format';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import {
  dialogStyle, envelopeMessage, errorMessage,
} from './catalog-list-model.js';
import { DIALOG_CLASS, Field, SELECT_CLASS, TEXTAREA_CLASS } from './catalog-ui.js';
import { UnlockWithSubjectField } from './UnlockWithSubjectField.js';

// New / Edit Subject (Naji's NewSubjectDialog) — the same fields and payload
// the Subjects page has always sent, including the "Unlocks together with"
// partner, which is only sent when set or changed here.

interface SubjectFormState {
  title: string;
  subject_code: string;
  short_name: string;
  subject_type: string;
  duration_hours: string;
  version: string;
  description: string;
  learning_outcomes: string;
  skills_covered: string;
  assignment_max_marks: string;
  assignment_pass_marks: string;
  examination_max_marks: string;
  examination_pass_marks: string;
  project_max_marks: string;
  project_pass_marks: string;
  viva_max_marks: string;
  viva_pass_marks: string;
  status: string;
  unlock_with_subject_id: string;
}

const emptyForm: SubjectFormState = {
  title: '', subject_code: '', short_name: '', subject_type: '', duration_hours: '', version: '', description: '',
  learning_outcomes: '', skills_covered: '', assignment_max_marks: '', assignment_pass_marks: '', examination_max_marks: '',
  examination_pass_marks: '', project_max_marks: '', project_pass_marks: '', viva_max_marks: '', viva_pass_marks: '',
  status: 'draft', unlock_with_subject_id: '',
};

const MARK_BLOCKS = [
  { key: 'assignment', label: 'Assignment' },
  { key: 'examination', label: 'Examination' },
  { key: 'project', label: 'Project' },
  { key: 'viva', label: 'Viva' },
] as const;

function numText(v: unknown): string {
  return v == null || v === '' ? '' : String(asNumber(v));
}

function formFromRow(row: Record<string, unknown>): SubjectFormState {
  return {
    title: asString(row.title),
    subject_code: asString(row.subject_code),
    short_name: asString(row.short_name),
    subject_type: asString(row.subject_type),
    duration_hours: numText(row.duration_hours),
    version: asString(row.version),
    description: asString(row.description),
    learning_outcomes: asString(row.learning_outcomes),
    skills_covered: asString(row.skills_covered),
    assignment_max_marks: numText(row.assignment_max_marks),
    assignment_pass_marks: numText(row.assignment_pass_marks),
    examination_max_marks: numText(row.examination_max_marks),
    examination_pass_marks: numText(row.examination_pass_marks),
    project_max_marks: numText(row.project_max_marks),
    project_pass_marks: numText(row.project_pass_marks),
    viva_max_marks: numText(row.viva_max_marks),
    viva_pass_marks: numText(row.viva_pass_marks),
    status: asString(row.status) || 'draft',
    unlock_with_subject_id: asString(row.unlock_with_subject_id),
  };
}

function nullableNumber(v: string): number | null {
  return v ? Number(v) : null;
}

export interface SubjectFormDialogProps {
  open: boolean;
  /** The API row being edited, or null to create a subject. */
  editRow: Record<string, unknown> | null;
  /** Every subject row (for the unlock-partner picker). */
  allSubjects: Record<string, unknown>[];
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}

export function SubjectFormDialog({ open, editRow, allSubjects, api, token, onClose, onSaved }: SubjectFormDialogProps) {
  const editId = editRow ? asString(editRow.id) : '';
  const [form, setForm] = useState<SubjectFormState>(emptyForm);
  // The partner as loaded when Edit opened, to send the field only if changed.
  const [initialUnlockWith, setInitialUnlockWith] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(editRow ? formFromRow(editRow) : emptyForm);
    setInitialUnlockWith(editRow ? asString(editRow.unlock_with_subject_id) : '');
  }, [open, editRow]);

  const totalMarks = useMemo(
    () => Number(form.assignment_max_marks || 0) + Number(form.examination_max_marks || 0) + Number(form.project_max_marks || 0) + Number(form.viva_max_marks || 0),
    [form.assignment_max_marks, form.examination_max_marks, form.project_max_marks, form.viva_max_marks],
  );

  const setField = (key: keyof SubjectFormState, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const save = useCallback(async () => {
    if (!form.title.trim()) {
      toast.error('Subject title is required.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        subject_code: form.subject_code.trim() || null,
        short_name: form.short_name.trim() || null,
        subject_type: form.subject_type || null,
        duration_hours: nullableNumber(form.duration_hours),
        version: form.version.trim() || null,
        description: form.description.trim() || null,
        learning_outcomes: form.learning_outcomes.trim() || null,
        skills_covered: form.skills_covered.trim() || null,
        assignment_max_marks: nullableNumber(form.assignment_max_marks),
        assignment_pass_marks: nullableNumber(form.assignment_pass_marks),
        examination_max_marks: nullableNumber(form.examination_max_marks),
        examination_pass_marks: nullableNumber(form.examination_pass_marks),
        project_max_marks: nullableNumber(form.project_max_marks),
        project_pass_marks: nullableNumber(form.project_pass_marks),
        viva_max_marks: nullableNumber(form.viva_max_marks),
        viva_pass_marks: nullableNumber(form.viva_pass_marks),
        status: form.status,
        // Only when it was set or changed here: echoing the value loaded with
        // the page would silently undo a partner set since (by another admin or
        // by SQL). The API leaves the stored value alone when the key is absent.
        ...(!editId || form.unlock_with_subject_id !== initialUnlockWith
          ? { unlock_with_subject_id: form.unlock_with_subject_id }
          : {}),
      };
      const res = editId ? await api.editSubject(token, editId, payload) : await api.addSubject(token, payload);
      toast.success(envelopeMessage(res, editId ? 'Subject updated.' : 'Subject created.'));
      onClose();
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save subject'));
    } finally {
      setSaving(false);
    }
  }, [api, token, editId, form, initialUnlockWith, onClose, onSaved]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className={DIALOG_CLASS} style={dialogStyle(880)}>
        <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6 text-left">
            <DialogTitle>{editId ? 'Edit Subject' : 'New Subject'}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <section>
              <h4 className="mb-3 text-sm font-semibold">Subject Information</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Subject Title" htmlFor="subject-title" required>
                  <Input
                    id="subject-title"
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    onBlur={(e) => { const next = titleCaseEachWord(e.target.value); if (next !== e.target.value) setField('title', next); }}
                    placeholder="e.g. Child Development"
                  />
                </Field>
                <Field label="Subject Code" htmlFor="subject-code">
                  <Input id="subject-code" value={form.subject_code} onChange={(e) => setField('subject_code', e.target.value)} placeholder="e.g. CD-101" />
                </Field>
                <Field label="Short Name" htmlFor="subject-short">
                  <Input id="subject-short" value={form.short_name} onChange={(e) => setField('short_name', e.target.value)} placeholder="e.g. CD" />
                </Field>
                <Field label="Subject Type" htmlFor="subject-type">
                  <select id="subject-type" className={SELECT_CLASS} value={form.subject_type} onChange={(e) => setField('subject_type', e.target.value)}>
                    <option value="">— Select —</option>
                    <option value="Core">Core</option>
                    <option value="Elective">Elective</option>
                  </select>
                </Field>
                <Field label="Duration (hours)" htmlFor="subject-hours">
                  <Input id="subject-hours" type="number" min="0" value={form.duration_hours} onChange={(e) => setField('duration_hours', e.target.value)} placeholder="e.g. 30" />
                </Field>
                <Field label="Version" htmlFor="subject-version">
                  <Input id="subject-version" value={form.version} onChange={(e) => setField('version', e.target.value)} placeholder="e.g. 1.0" />
                </Field>
              </div>
              <Field label="Description" htmlFor="subject-description" className="mt-4">
                <textarea id="subject-description" rows={3} className={TEXTAREA_CLASS} value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Subject overview" />
              </Field>
            </section>

            <section>
              <h4 className="mb-3 text-sm font-semibold">Learning Design</h4>
              <div className="grid gap-4">
                <Field label="Learning Outcomes (one point per line)" htmlFor="subject-outcomes">
                  <textarea id="subject-outcomes" rows={4} className={TEXTAREA_CLASS} value={form.learning_outcomes} onChange={(e) => setField('learning_outcomes', e.target.value)} placeholder={'• Understand cognitive milestones\n• Identify developmental delays'} />
                </Field>
                <Field label="Skills Covered (comma separated)" htmlFor="subject-skills">
                  <Input id="subject-skills" value={form.skills_covered} onChange={(e) => setField('skills_covered', e.target.value)} placeholder="e.g. observation, lesson planning, classroom management" />
                </Field>
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold">Assessment Configuration</h4>
                <span className="text-xs text-muted-foreground">Total: <span className="font-semibold text-foreground">{totalMarks}</span></span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {MARK_BLOCKS.map((b) => {
                  const maxKey = `${b.key}_max_marks` as keyof SubjectFormState;
                  const passKey = `${b.key}_pass_marks` as keyof SubjectFormState;
                  return (
                    <div key={b.key} className="rounded-lg border border-border p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{b.label}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label htmlFor={`${b.key}-max`} className="text-[11px] text-muted-foreground">Max marks</label>
                          <Input id={`${b.key}-max`} type="number" min="0" value={form[maxKey]} onChange={(e) => setField(maxKey, e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label htmlFor={`${b.key}-pass`} className="text-[11px] text-muted-foreground">Pass marks</label>
                          <Input id={`${b.key}-pass`} type="number" min="0" value={form[passKey]} onChange={(e) => setField(passKey, e.target.value)} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Status" htmlFor="subject-status">
                <select id="subject-status" className={SELECT_CLASS} value={form.status} onChange={(e) => setField('status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </Field>
              <UnlockWithSubjectField
                value={form.unlock_with_subject_id}
                onChange={(v) => setField('unlock_with_subject_id', v)}
                subjects={allSubjects}
                ownSubjectId={editId}
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-border bg-muted/30 px-6 py-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>{saving ? 'Saving...' : editId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
