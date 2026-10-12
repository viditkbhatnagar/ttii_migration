import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { asString } from '../../../shared/utils/admin-data-utils.js';
import { LEAD_SOURCES, pipelineRoleIds, toUserOptions } from './student-view-model.js';
import { NativeSelect } from './student-view-ui.js';

// Add Enrolment — Naji UAT 2026-05-14. Moved out of the old ViewStudentPage
// with its logic UNCHANGED: the same form, the same cascades (course →
// offerings + combinations, pipeline → pipeline users), the same validation and
// the same POST /admin/students/:id/add-enrolment (which may create a Razorpay
// payment link, mark paid manually, or save without payment).
//
// From the Enrollments list (Naji's "Add Enrollment") there is no student yet,
// so `pickStudent` adds a student chooser on top; the request is identical.

type Option = { label: string; value: string };
type PaymentMode = 'link' | 'manual' | 'draft';

const EMPTY_FORM = {
  course_id: '', offering_id: '', combination_id: '',
  mode_of_study: 'Online', preferred_language: '',
  pipeline: '', pipeline_user: '', lead_source: '',
  registration_fee: '', discount: '', gst_percent: '18',
  final_course_fee: '', payment_mode: 'link' as PaymentMode,
};


export function AddEnrolmentDialog({
  open, onClose, onCreated, api, token, studentId, pickStudent = false,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  api: AdminPortalApi;
  token: string;
  studentId: string;
  pickStudent?: boolean;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [courses, setCourses] = useState<Option[]>([]);
  const [offerings, setOfferings] = useState<Option[]>([]);
  const [combinations, setCombinations] = useState<Option[]>([]);
  const [languages, setLanguages] = useState<Option[]>([]);
  const [pipelineUsers, setPipelineUsers] = useState<Option[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<Option[]>([]);
  const [studentQuery, setStudentQuery] = useState('');
  const [pickedStudent, setPickedStudent] = useState('');
  const targetStudent = pickStudent ? pickedStudent : studentId;

  useEffect(() => {
    if (!open) return;
    void api.loadCourses(token).then((rows) => {
      setCourses(rows.map((r) => ({ label: asString(r.title) || asString(r.course_title) || `Course ${asString(r.id)}`, value: asString(r.id) })));
    });
    void api.loadLanguages(token).then((rows) => {
      setLanguages(rows.map((r) => ({ label: asString(r.title) || asString(r.name) || `Language ${asString(r.id)}`, value: asString(r.id) })));
    });
    if (pickStudent) {
      void api.loadStudents(token).then((rows) => {
        setStudents(rows.map((r) => ({
          value: asString(r._id) || asString(r.id),
          label: [asString(r.name), asString(r.student_id), asString(r.phone)].filter(Boolean).join(' · '),
        })).filter((o) => o.value));
      }).catch(() => setStudents([]));
    }
  }, [open, api, token, pickStudent]);

  useEffect(() => {
    if (!open || !form.course_id) { setOfferings([]); setCombinations([]); return; }
    void Promise.all([
      api.listOfferings(token, { course_id: form.course_id }),
      api.loadCertificateCombinations(token, { course_id: form.course_id }),
    ]).then(([offs, combos]) => {
      setOfferings(offs.map((o) => ({ label: asString(o.title) || asString(o.offering_code) || `Offering ${asString(o.id)}`, value: asString(o.id) })));
      setCombinations(combos.map((c) => ({ label: asString(c.combination_code) || asString(c.title) || `Combination ${asString(c.id)}`, value: asString(c.id) })));
    });
  }, [open, form.course_id, api, token]);

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
    void Promise.all(roleIds.map((rid) => api.loadPipelineUsers(token, rid))).then((results) => {
      setPipelineUsers(toUserOptions(results.flat()));
    });
  }, [open, form.pipeline, api, token]);

  const visibleStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    const list = q ? students.filter((s) => s.label.toLowerCase().includes(q)) : students;
    return list.slice(0, 200);
  }, [students, studentQuery]);

  const close = (): void => {
    setForm(EMPTY_FORM);
    setStudentQuery('');
    setPickedStudent('');
    onClose();
  };

  const submit = async (): Promise<void> => {
    if (!targetStudent) { toast.error('Student is required.'); return; }
    if (!form.course_id) { toast.error('Course is required.'); return; }
    if (!form.final_course_fee) { toast.error('Final Course Fee is required.'); return; }
    setSubmitting(true);
    try {
      const res = await api.addAdditionalEnrolment(token, targetStudent, form);
      if ((res as { status?: number }).status === 1) {
        const data = (res as { data?: { pending_admin_approval?: boolean; payment_link_url?: string | null } }).data ?? {};
        const msg = data.pending_admin_approval ? 'Enrolment request submitted for admin approval.' : 'Additional enrolment created.';
        toast.success(msg + (data.payment_link_url ? ' Payment link sent.' : ''));
        close();
        onCreated();
      } else {
        toast.error(asString((res as { message?: unknown }).message) || 'Failed to create enrolment.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create enrolment.');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (patch: Partial<typeof EMPTY_FORM>) => setForm((f) => ({ ...f, ...patch }));
  const width = 'min(620px, calc(100vw - 2rem))';
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent style={{ width, maxWidth: width }} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>Add Enrolment</DialogTitle>
            <DialogDescription>
              {pickStudent
                ? 'Enrol an existing student in a course. Only the course, fee and payment method are needed.'
                : 'Add another course enrolment for this student. Personal information stays as-is — only the course, fee and payment method are needed.'}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            {pickStudent ? (
              <div className="space-y-1.5 rounded-xl border border-border bg-muted/30 p-3">
                <Label htmlFor="add-enrol-student">Student *</Label>
                <Input id="add-enrol-student-search" aria-label="Search students" placeholder="Type a name, student ID or phone…" value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} />
                <NativeSelect id="add-enrol-student" value={pickedStudent} onChange={setPickedStudent} placeholder="- Select student -" options={visibleStudents} />
              </div>
            ) : null}
            <div>
              <Label htmlFor="add-enrol-course" className="mb-1">Course *</Label>
              <NativeSelect id="add-enrol-course" value={form.course_id} onChange={(v) => set({ course_id: v, offering_id: '', combination_id: '' })} options={courses} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="add-enrol-offering" className="mb-1">Course Offering</Label>
                <NativeSelect id="add-enrol-offering" value={form.offering_id} onChange={(v) => set({ offering_id: v })} options={offerings} disabled={!form.course_id} />
              </div>
              <div>
                <Label htmlFor="add-enrol-combo" className="mb-1">Certificate Combination</Label>
                <NativeSelect id="add-enrol-combo" value={form.combination_id} onChange={(v) => set({ combination_id: v })} options={combinations} disabled={!form.course_id} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="add-enrol-mode" className="mb-1">Mode of Study</Label>
                <NativeSelect id="add-enrol-mode" value={form.mode_of_study} onChange={(v) => set({ mode_of_study: v })} placeholder={null} options={['Online', 'Offline', 'Hybrid'].map((v) => ({ value: v, label: v }))} />
              </div>
              <div>
                <Label htmlFor="add-enrol-lang" className="mb-1">Preferred Language</Label>
                <NativeSelect id="add-enrol-lang" value={form.preferred_language} onChange={(v) => set({ preferred_language: v })} options={languages} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="add-enrol-pipeline" className="mb-1">Pipeline</Label>
                <NativeSelect id="add-enrol-pipeline" value={form.pipeline} onChange={(v) => set({ pipeline: v, pipeline_user: '' })} options={['Admin', 'Counsellor', 'Associate', 'Centre'].map((v) => ({ value: v, label: v }))} />
              </div>
              <div>
                <Label htmlFor="add-enrol-puser" className="mb-1">Pipeline User</Label>
                <NativeSelect id="add-enrol-puser" value={form.pipeline_user} onChange={(v) => set({ pipeline_user: v })} options={pipelineUsers} disabled={!form.pipeline} placeholder={form.pipeline ? '- Select -' : 'Pick pipeline first'} />
              </div>
            </div>
            <div>
              <Label htmlFor="add-enrol-source" className="mb-1">Lead Source</Label>
              <NativeSelect id="add-enrol-source" value={form.lead_source} onChange={(v) => set({ lead_source: v })} options={LEAD_SOURCES.map((v) => ({ value: v, label: v }))} />
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fee breakdown</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="add-enrol-reg" className="mb-1 text-xs">Registration Fee</Label>
                  <Input id="add-enrol-reg" value={form.registration_fee} onChange={(e) => set({ registration_fee: e.target.value })} placeholder="e.g. 2000" type="number" />
                </div>
                <div>
                  <Label htmlFor="add-enrol-disc" className="mb-1 text-xs">Discount</Label>
                  <Input id="add-enrol-disc" value={form.discount} onChange={(e) => set({ discount: e.target.value })} placeholder="e.g. 10" type="number" />
                </div>
                <div>
                  <Label htmlFor="add-enrol-gst" className="mb-1 text-xs">GST %</Label>
                  <Input id="add-enrol-gst" value={form.gst_percent} onChange={(e) => set({ gst_percent: e.target.value })} placeholder="e.g. 18" type="number" />
                </div>
                <div>
                  <Label htmlFor="add-enrol-final" className="mb-1 text-xs">Final Course Fee *</Label>
                  <Input id="add-enrol-final" value={form.final_course_fee} onChange={(e) => set({ final_course_fee: e.target.value })} placeholder="e.g. 25000" type="number" />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="add-enrol-pay" className="mb-1">Payment</Label>
              <NativeSelect
                id="add-enrol-pay"
                value={form.payment_mode}
                onChange={(v) => set({ payment_mode: v as PaymentMode })}
                placeholder={null}
                options={[
                  { value: 'link', label: 'Generate Payment Link (Razorpay)' },
                  { value: 'manual', label: 'Mark Paid Manually' },
                  { value: 'draft', label: 'Save without payment' },
                ]}
              />
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={close} disabled={submitting}>Cancel</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Add Enrolment'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
