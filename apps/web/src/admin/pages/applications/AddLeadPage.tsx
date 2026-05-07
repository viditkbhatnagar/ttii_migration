import { useEffect, useMemo, useState } from 'react';
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
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { titleCaseOnBlur } from '@/lib/text-format';

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
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [courseId, setCourseId] = useState('');
  const [offeringId, setOfferingId] = useState('');
  const [combinationId, setCombinationId] = useState('');
  const [source, setSource] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [duplicate, setDuplicate] = useState<{ message: string; existingUserId?: string } | null>(null);

  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [offerings, setOfferings] = useState<Record<string, unknown>[]>([]);
  const [combinations, setCombinations] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    void api
      .loadCourses(session.token)
      .then((rows) => setCourses(rows))
      .catch(() => setCourses([]));
  }, [api, session.token]);

  useEffect(() => {
    if (!courseId) {
      setOfferings([]);
      setOfferingId('');
      return;
    }
    void api
      .listOfferings(session.token, { course_id: courseId })
      .then((rows) => setOfferings(rows))
      .catch(() => setOfferings([]));
    setOfferingId('');
  }, [api, session.token, courseId]);

  // Certificate combinations are course-scoped on this admin already.
  // If the loader doesn't exist, just skip — combination is optional.
  useEffect(() => {
    const loader = (api as unknown as {
      loadCertificateCombinations?: (token: string, courseId?: string) => Promise<unknown>;
    }).loadCertificateCombinations;
    if (typeof loader !== 'function') return;
    void loader(session.token, courseId)
      .then((rows) => setCombinations(toRecords(rows)))
      .catch(() => setCombinations([]));
  }, [api, session.token, courseId]);

  const courseOptions = useMemo(
    () => courses.map((c) => ({ label: asString(c.title) || `Course ${asString(c.id)}`, value: asString(c.id) })),
    [courses],
  );
  const offeringOptions = useMemo(
    () => offerings.map((o) => ({ label: asString(o.title) || `Offering ${asString(o.id)}`, value: asString(o.id) })),
    [offerings],
  );
  const combinationOptions = useMemo(
    () => combinations.map((c) => ({ label: asString(c.label) || asString(c.title) || `Combination ${asString(c.id)}`, value: asString(c.id) })),
    [combinations],
  );

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Name is required.'); return; }
    if (!email.trim()) { toast.error('Email is required.'); return; }
    if (!phone.trim()) { toast.error('Phone is required.'); return; }
    if (!courseId) { toast.error('Course is required.'); return; }
    setSubmitting(true);
    setDuplicate(null);
    try {
      const res = await api.addLead(session.token, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        country_code: countryCode,
        course_id: courseId,
        offering_id: offeringId || undefined,
        combination_id: combinationId || undefined,
        source: source.trim() || undefined,
      });
      const status = (res as { status?: number }).status;
      const code = (res as { code?: string }).code;
      const message = asString((res as { message?: unknown }).message) || 'Done.';
      if (status === 1) {
        toast.success(message);
        onNavigate('/admin/applications/index');
        return;
      }
      if (status === 2 && code === 'duplicate_student_other_course') {
        const data = (res as { data?: Record<string, unknown> }).data ?? {};
        setDuplicate({ message, existingUserId: asString(data.existing_user_id) });
        return;
      }
      toast.error(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add lead.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Add Lead" />
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
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="student@example.com" />
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
              >
                <option value="">None</option>
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
              they are auto-set so the team can see what's being recorded. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Pipeline</Label>
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-slate-50 px-3 text-sm text-slate-700">
                Counsellor
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pipeline User</Label>
              <div className="flex h-10 w-full items-center rounded-md border border-input bg-slate-50 px-3 text-sm text-slate-700">
                Auto-set from logged-in user
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onNavigate('/admin/applications/index')}>
              Cancel
            </Button>
            <Button
              onClick={() => { void handleSubmit(); }}
              disabled={submitting || !name.trim() || !email.trim() || !phone.trim() || !courseId}
              className="bg-ttii-primary hover:bg-ttii-primary/90"
            >
              {submitting ? 'Saving...' : 'Add Lead'}
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
