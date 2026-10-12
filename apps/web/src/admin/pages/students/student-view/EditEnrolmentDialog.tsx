import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { asString } from '../../../shared/utils/admin-data-utils.js';

import { LEAD_SOURCES, offeringSortKey, pipelineRoleIds, toUserOptions } from './student-view-model.js';
import { NativeSelect } from './student-view-ui.js';

// Edit Enrolment — Naji UAT 2026-05-12. Moved out of the old ViewStudentPage
// with its logic UNCHANGED: prefill from the enrolment row, offerings sorted
// chronologically, offering / combination pre-selected by title / code, the
// pipeline → pipeline-user cascade, and POST /admin/enrol/update with the whole
// form (the server leaves a blank offering / combination untouched).

type Option = { label: string; value: string };

export function EditEnrolmentDialog({
  row, leadSource, onClose, onSaved, api, token,
}: {
  row: Record<string, unknown> | null;
  /** The student's lead source (it lives on the application, not the enrolment). */
  leadSource: string;
  onClose: () => void;
  onSaved: () => void;
  api: AdminPortalApi;
  token: string;
}) {
  const [form, setForm] = useState({
    enrollment_id: '', enrollment_status: '', mode_of_study: '', preferred_language: '',
    offering_id: '', combination_id: '', pipeline: '', pipeline_user: '', lead_source: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [offerings, setOfferings] = useState<Option[]>([]);
  const [combinations, setCombinations] = useState<Option[]>([]);
  const [languages, setLanguages] = useState<Option[]>([]);
  const [pipelineUsers, setPipelineUsers] = useState<Option[]>([]);
  const open = row !== null;

  useEffect(() => {
    if (!row) return;
    setForm({
      enrollment_id: asString(row.enrollment_id),
      enrollment_status: asString(row.enrollment_status) || asString(row.status) || 'Active',
      mode_of_study: asString(row.mode_of_study),
      preferred_language: asString(row.preferred_language),
      offering_id: '',
      combination_id: '',
      pipeline: asString(row.pipeline),
      pipeline_user: asString(row.pipeline_user),
      lead_source: leadSource,
    });
  }, [row, leadSource]);

  useEffect(() => {
    if (!row) return;
    const courseId = asString(row.course_id);
    const filters = courseId ? { course_id: courseId } : undefined;
    void Promise.all([
      api.listOfferings(token, filters),
      api.loadCertificateCombinations(token, filters),
      api.loadLanguages(token),
    ]).then(([offs, combos, langs]) => {
      const sorted = [...offs].sort((a, b) => offeringSortKey(a) - offeringSortKey(b));
      setOfferings(sorted.map((o) => ({ label: asString(o.title) || asString(o.offering_code) || `Offering ${asString(o.id)}`, value: asString(o.id) })));
      setCombinations(combos.map((c) => ({ label: asString(c.combination_code) || asString(c.title) || `Combination ${asString(c.id)}`, value: asString(c.id) })));
      setLanguages(langs.map((l) => ({ label: asString(l.title) || asString(l.name) || `Language ${asString(l.id)}`, value: asString(l.id) })));
      const offTitle = asString(row.offering_title);
      if (offTitle) {
        const match = offs.find((o) => asString(o.title) === offTitle || asString(o.offering_code) === offTitle);
        if (match) setForm((f) => ({ ...f, offering_id: asString(match.id) }));
      }
      const comboCode = asString(row.certificate_combination_code);
      if (comboCode) {
        const match = combos.find((c) => asString(c.combination_code) === comboCode);
        if (match) setForm((f) => ({ ...f, combination_id: asString(match.id) }));
      }
    });
  }, [row, api, token]);

  useEffect(() => {
    if (!open) return;
    const p = form.pipeline;
    if (!p) { setPipelineUsers([]); return; }
    if (p === 'Centre') {
      void api.loadCentres(token).then((rows) => {
        setPipelineUsers(rows.map((r) => ({ label: asString(r.name) || asString(r.title) || `Centre ${asString(r.id)}`, value: asString(r.id) })));
      });
      return;
    }
    const roleIds = pipelineRoleIds(p);
    if (roleIds.length === 0) { setPipelineUsers([]); return; }
    void Promise.all(roleIds.map((rid) => api.loadPipelineUsers(token, rid))).then((results) => setPipelineUsers(toUserOptions(results.flat())));
  }, [open, form.pipeline, api, token]);

  const close = () => {
    setOfferings([]); setCombinations([]); setLanguages([]); setPipelineUsers([]);
    onClose();
  };

  const submit = async () => {
    if (!row) return;
    const enrolId = asString(row.id);
    if (!enrolId) { toast.error('Enrolment id missing'); return; }
    setSubmitting(true);
    try {
      const res = await api.updateEnrolment(token, enrolId, form);
      if ((res as { status?: number }).status === 1) {
        toast.success('Enrolment updated');
        close();
        onSaved();
      } else {
        toast.error(asString((res as { message?: unknown }).message) || 'Update failed');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const width = 'min(560px, calc(100vw - 2rem))';
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent style={{ width, maxWidth: width }} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>Edit Enrolment</DialogTitle>
            <DialogDescription>{asString(row?.course_title) || 'Enrolment'}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div>
              <Label htmlFor="edit-enrol-id" className="mb-1">Enrollment ID</Label>
              <Input id="edit-enrol-id" value={form.enrollment_id} onChange={(e) => set({ enrollment_id: e.target.value })} placeholder="e.g. TIDMTT26040115" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-enrol-status" className="mb-1">Status</Label>
                <NativeSelect id="edit-enrol-status" value={form.enrollment_status} onChange={(v) => set({ enrollment_status: v })} options={['Active', 'On Hold', 'Dropout', 'Completed', 'Graduated'].map((v) => ({ value: v, label: v }))} />
              </div>
              <div>
                <Label htmlFor="edit-enrol-mode" className="mb-1">Mode of Study</Label>
                <NativeSelect id="edit-enrol-mode" value={form.mode_of_study} onChange={(v) => set({ mode_of_study: v })} options={['Online', 'Offline'].map((v) => ({ value: v, label: v }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-enrol-offering" className="mb-1">Course Offering</Label>
              <NativeSelect id="edit-enrol-offering" value={form.offering_id} onChange={(v) => set({ offering_id: v })} options={offerings} />
            </div>
            <div>
              <Label htmlFor="edit-enrol-combo" className="mb-1">Certificate Combination</Label>
              <NativeSelect id="edit-enrol-combo" value={form.combination_id} onChange={(v) => set({ combination_id: v })} options={combinations} />
            </div>
            <div>
              <Label htmlFor="edit-enrol-lang" className="mb-1">Preferred Language</Label>
              <NativeSelect id="edit-enrol-lang" value={form.preferred_language} onChange={(v) => set({ preferred_language: v })} options={languages} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="edit-enrol-pipeline" className="mb-1">Pipeline</Label>
                <NativeSelect id="edit-enrol-pipeline" value={form.pipeline} onChange={(v) => set({ pipeline: v, pipeline_user: '' })} options={['Admin', 'Counsellor', 'Associate', 'Centre'].map((v) => ({ value: v, label: v }))} />
              </div>
              <div>
                <Label htmlFor="edit-enrol-puser" className="mb-1">Pipeline User</Label>
                <NativeSelect id="edit-enrol-puser" value={form.pipeline_user} onChange={(v) => set({ pipeline_user: v })} options={pipelineUsers} disabled={!form.pipeline} placeholder={form.pipeline ? '- Select -' : 'Pick pipeline first'} />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-enrol-source" className="mb-1">Lead Source</Label>
              <NativeSelect id="edit-enrol-source" value={form.lead_source} onChange={(v) => set({ lead_source: v })} options={LEAD_SOURCES.map((v) => ({ value: v, label: v }))} />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={close} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
