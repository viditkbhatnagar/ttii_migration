import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { titleCaseOnBlur } from '@/lib/text-format';
import { verifyEmailWithFeedback } from '@/lib/email-verify-helper';

// Mirror of the backend's role → pipeline label map (operations-service.ts
// addLead). Keep in sync if roles are added.
const ROLE_PIPELINE_LABEL: Record<number, string> = {
  1: 'Super Admin',
  8: 'Admin',
  9: 'Counsellor',
  10: 'Associate',
};

/**
 * Add Lead — Step 1 of Naji's 8-step Lead → Enrolment workflow.
 *
 * Captures only the minimum needed to start the pipeline:
 * Name / Email / Phone / Course / Offering / Combination / Source.
 * `pipeline` and `pipeline_user_id` are stamped automatically from
 * the logged-in user on the backend, so this form has no role picker.
 *
 * Duplicate handling on submit (per backend):
 *   - duplicate_lead_same_course   → toast error, stay on form
 *   - duplicate_student_same_course → toast error, stay on form
 *   - duplicate_student_other_course → confirmation dialog: "this email
 *     is already a student. Enrol them to the new course?". Confirming
 *     re-submits with `confirm_existing_student: true` (handled later
 *     when we wire enrol-to-second-course).
 */
export default function AddLeadPage({ api, session, onNavigate }: AdminPageProps) {
  // Naji 2026-05-08 — same component handles both Add and Edit. The
  // route /admin/leads/edit/:id flips us into edit mode: prefill from
  // the existing application, change the title + submit button, and
  // call api.editLead instead of api.addLead. Pipeline + Pipeline User
  // remain auto from the logged-in user (we never reassign on edit).
  const editId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const path = window.location.pathname;
    // Same component is mounted under /admin/leads/edit/:id (admin
    // portal) and /counsellor/leads/edit/:id (counsellor portal).
    const m = path.match(/^\/(?:admin|counsellor)\/leads\/edit\/(\d+)$/);
    if (m) return m[1] ?? '';
    return '';
  }, []);
  const isEditMode = editId !== '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [courseId, setCourseId] = useState('');
  const [offeringId, setOfferingId] = useState('');
  const [combinationId, setCombinationId] = useState('');
  const [source, setSource] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editLoading, setEditLoading] = useState(isEditMode);
  const [duplicate, setDuplicate] = useState<{ message: string; existingUserId?: string } | null>(null);

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [offerings, setOfferings] = useState<Record<string, unknown>[]>([]);
  const [combinations, setCombinations] = useState<Record<string, unknown>[]>([]);
  const [me, setMe] = useState<{ name: string; roleId: number } | null>(null);

  useEffect(() => {
    void api
      .loadCourses(session.token)
      // Naji 2026-05-12 — only published courses in the Lead dropdown.
      // Drafts were leaking into Add Lead / Add Application everywhere.
      .then((rows) => setCourses(rows.filter((r) => {
        const status = r.status;
        return typeof status === 'string' && status.toLowerCase() === 'published';
      })))
      .catch(() => setCourses([]));
  }, [api, session.token]);

  // Pending offering / combination ids from the edit prefill — applied
  // once the cascading loaders finish populating the dropdowns. The
  // courseId-change effects clear offeringId/combinationId, so we
  // can't set them in the same shot as the prefill. We use refs (not
  // state) so consuming the pending value doesn't trigger another
  // effect re-run that would wipe offeringId again.
  const pendingOfferingIdRef = useRef('');
  const pendingCombinationIdRef = useRef('');
  const lastCourseIdRef = useRef('');

  // Pre-fill in edit mode.
  useEffect(() => {
    if (!isEditMode || !editId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.getApplication(session.token, editId);
        if (cancelled) return;
        const r = (res as { application?: Record<string, unknown> }).application;
        if (!r) {
          toast.error('Lead not found.');
          return;
        }
        setName(asString(r.name));
        setEmail(asString(r.user_email) || asString(r.email));
        setPhone(asString(r.phone));
        const cc = asString(r.country_code).replace(/\+/g, '');
        if (cc) setCountryCode(cc);
        setSource(asString(r.marketing_source) || asString(r.lead_source));
        pendingOfferingIdRef.current = asString(r.offering_id);
        pendingCombinationIdRef.current = asString(r.certificate_combination_id);
        // Set courseId LAST — triggers the offering / combination loaders.
        setCourseId(asString(r.course_id));
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [api, session.token, isEditMode, editId]);

  // Pull the logged-in user so the Pipeline card reflects their actual
  // role + name (was hardcoded to "Counsellor" / "Auto-set...").
  useEffect(() => {
    void api
      .loadMyProfile(session.token)
      .then((profile) => setMe({ name: profile.name, roleId: profile.roleId }))
      .catch(() => setMe(null));
  }, [api, session.token]);

  useEffect(() => {
    if (!courseId) {
      setOfferings([]);
      setOfferingId('');
      lastCourseIdRef.current = '';
      return;
    }
    // Only wipe offeringId when the course actually changed — not when
    // the effect re-fires for unrelated reasons. Otherwise the prefill
    // restoration below gets clobbered.
    const courseChanged = lastCourseIdRef.current !== '' && lastCourseIdRef.current !== courseId;
    lastCourseIdRef.current = courseId;
    if (courseChanged) setOfferingId('');
    // Naji 2026-05-08 — only show active offerings, not drafts. Edit
    // mode falls back to all offerings if the saved one isn't active.
    void api
      .listOfferings(session.token, { course_id: courseId, status: 'active' })
      .then(async (rows) => {
        let list = rows;
        const pendingOff = pendingOfferingIdRef.current;
        if (pendingOff && !list.some((r) => asString(r.id) === pendingOff)) {
          // Saved offering isn't active — fetch all so the dropdown
          // shows the actual value attached to this lead.
          try {
            const allRows = await api.listOfferings(session.token, { course_id: courseId });
            list = allRows;
          } catch { /* keep active list */ }
        }
        setOfferings(list);
        if (pendingOff && list.some((r) => asString(r.id) === pendingOff)) {
          setOfferingId(pendingOff);
          pendingOfferingIdRef.current = '';
        }
      })
      .catch(() => setOfferings([]));
  }, [api, session.token, courseId]);

  // Certificate combinations — Naji 2026-05-12: only show combinations
  // after an Offering is picked. Previously the dropdown was populated
  // with course-scoped combinations even when offering was blank, which
  // let admins pick a combination that had no price package set up.
  useEffect(() => {
    if (!courseId || !offeringId) {
      setCombinations([]);
      setCombinationId('');
      return;
    }
    const courseChanged = lastCourseIdRef.current !== courseId;
    if (courseChanged) setCombinationId('');
    void (async () => {
      try {
        const allActive = await api.listCertificateCombinations(session.token, { course_id: courseId, status: 'active' });
        let list = allActive;
        try {
          const packages = await api.listOfferingPackages(session.token, offeringId);
          const pricedIds = new Set(packages.map((p) => asString(p.combination_id)));
          const priced = allActive.filter((c) => pricedIds.has(asString(c.id)));
          // If the offering has at least one priced combination, show
          // only those. Otherwise (no packages set yet for this
          // offering) keep the full list so admins aren't blocked.
          if (priced.length > 0) list = priced;
        } catch { /* fallback to full list */ }
        const pendingCombo = pendingCombinationIdRef.current;
        if (pendingCombo && !list.some((r) => asString(r.id) === pendingCombo)) {
          try {
            const allRows = await api.listCertificateCombinations(session.token, { course_id: courseId });
            list = allRows;
          } catch { /* keep current list */ }
        }
        setCombinations(list);
        if (pendingCombo && list.some((r) => asString(r.id) === pendingCombo)) {
          setCombinationId(pendingCombo);
          pendingCombinationIdRef.current = '';
        }
      } catch {
        setCombinations([]);
      }
    })();
  }, [api, session.token, courseId, offeringId]);

  const courseOptions = useMemo(
    () => courses.map((c) => ({ label: asString(c.title) || `Course ${asString(c.id)}`, value: asString(c.id) })),
    [courses],
  );
  const offeringOptions = useMemo(
    () => offerings.map((o) => ({ label: asString(o.title) || `Offering ${asString(o.id)}`, value: asString(o.id) })),
    [offerings],
  );
  const combinationOptions = useMemo(
    () => combinations.map((c) => ({
      label: asString(c.combination_code) || asString(c.label) || asString(c.title) || `Combination ${asString(c.id)}`,
      value: asString(c.id),
    })),
    [combinations],
  );

  const pipelineLabel = me ? (ROLE_PIPELINE_LABEL[me.roleId] ?? 'Admin') : '—';
  const pipelineUserLabel = me?.name?.trim() || 'Auto-set from logged-in user';

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Name is required.'); return; }
    if (!email.trim()) { toast.error('Email is required.'); return; }
    if (!phone.trim()) { toast.error('Phone is required.'); return; }
    if (!courseId) { toast.error('Course is required.'); return; }
    setSubmitting(true);
    setDuplicate(null);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        country_code: countryCode,
        course_id: courseId,
        offering_id: offeringId || undefined,
        combination_id: combinationId || undefined,
        source: source.trim() || undefined,
      };
      const res = isEditMode
        ? await api.editLead(session.token, editId, payload)
        : await api.addLead(session.token, payload);
      const status = (res as { status?: number }).status;
      const code = (res as { code?: string }).code;
      const message = asString((res as { message?: unknown }).message) || 'Done.';
      if (status === 1) {
        toast.success(message);
        onNavigate(isEditMode ? `/admin/applications/view/${editId}` : '/admin/applications/index');
        return;
      }
      if (status === 2 && code === 'duplicate_student_other_course') {
        const data = (res as { data?: Record<string, unknown> }).data ?? {};
        setDuplicate({ message, existingUserId: asString(data.existing_user_id) });
        return;
      }
      toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : isEditMode ? 'Failed to update lead.' : 'Failed to add lead.');
    } finally {
      setSubmitting(false);
    }
  };

  if (editLoading) {
    return (
      <div className="space-y-4">
        <AdminPageHeader title="Edit Lead" />
        <Card className="mx-auto max-w-2xl"><CardContent className="p-6 text-sm text-slate-500">Loading lead…</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title={isEditMode ? 'Edit Lead' : 'Add Lead'} />
      <Card className="mx-auto max-w-2xl">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={titleCaseOnBlur(setName)}
              placeholder="Full name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => {
                  const trimmed = email.trim();
                  if (!trimmed) return;
                  void verifyEmailWithFeedback(api, session.token, trimmed, (corrected) => setEmail(corrected));
                }}
                placeholder="student@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <div className="flex gap-2">
                <Input
                  className="w-20"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="91"
                />
                <Input
                  id="phone"
                  className="flex-1"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                  placeholder="9876543210"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="course">Course *</Label>
            <select
              id="course"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            >
              <option value="">Select Course</option>
              {courseOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="offering">Offering</Label>
              <select
                id="offering"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={offeringId}
                onChange={(e) => setOfferingId(e.target.value)}
                disabled={!courseId}
              >
                <option value="">{courseId ? 'Select Offering' : 'Pick a course first'}</option>
                {offeringOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="combination">Certificate Combination</Label>
              <select
                id="combination"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={combinationId}
                onChange={(e) => setCombinationId(e.target.value)}
                disabled={!courseId}
              >
                <option value="">{courseId ? 'None' : 'Pick a course first'}</option>
                {combinationOptions.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <select
              id="source"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="">Select source</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Referral">Referral</option>
              <option value="Website">Website</option>
              <option value="Social">Social Media</option>
              <option value="Facebook">Facebook</option>
              <option value="Instagram">Instagram</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
              <option value="Call-in">Call-in</option>
              <option value="Reference">Reference (existing student)</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {/* Naji 2026-05-07 — show Pipeline + Pipeline User even though
              they are auto-set so the team can see what's being recorded.
              Naji 2026-05-08 — values come from the logged-in user, not
              hardcoded "Counsellor". */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Pipeline</Label>
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-slate-50 px-3 text-sm text-slate-700">
                {pipelineLabel}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pipeline User</Label>
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-slate-50 px-3 text-sm text-slate-700">
                {pipelineUserLabel}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => onNavigate(isEditMode ? `/admin/applications/view/${editId}` : '/admin/applications/index')}
            >
              Cancel
            </Button>
            <Button
              onClick={() => { void handleSubmit(); }}
              disabled={submitting || !name.trim() || !email.trim() || !phone.trim() || !courseId}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              {submitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Lead'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={duplicate !== null} onOpenChange={(open) => { if (!open) setDuplicate(null); }}>
        <DialogContent className="w-[min(480px,calc(100vw-2rem))] max-w-[min(480px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>This email is already a student</DialogTitle>
            <DialogDescription>
              {duplicate?.message ?? 'This email is already registered as a student.'} Do you want to enrol them in the new course as well?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicate(null)}>Cancel</Button>
            <Button
              className="bg-ttii-primary hover:bg-ttii-primary/90"
              onClick={() => {
                toast.info('Enrol-to-second-course flow ships next; for now use the regular Add Application form.');
                setDuplicate(null);
              }}
            >
              Enrol to new course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
