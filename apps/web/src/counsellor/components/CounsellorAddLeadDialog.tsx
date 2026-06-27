import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { AuthSession } from '@ttii/frontend-core';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CounsellorPortalApi } from '../counsellor-portal-api.js';
import { useCounsellorLayout } from '../layout/CounsellorLayoutContext.js';
import { asString } from '../../admin/shared/utils/admin-data-utils.js';
import { SearchableSelect } from '../../admin/shared/components/SearchableSelect.js';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const COUNTRY_CODES: Array<{ code: string; label: string }> = [
  { code: '91', label: '🇮🇳 +91' },
  { code: '1', label: '🇺🇸 +1' },
  { code: '44', label: '🇬🇧 +44' },
  { code: '971', label: '🇦🇪 +971' },
  { code: '65', label: '🇸🇬 +65' },
  { code: '61', label: '🇦🇺 +61' },
];

/** Source options — mirrors the admin AddLeadPage <select>. Naji 2026-06-24:
 * dropped "Social Media" and renamed "Referral" to "Network". */
const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Walk-in', label: 'Walk-in' },
  { value: 'Network', label: 'Network' },
  { value: 'Website', label: 'Website' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Email', label: 'Email' },
  { value: 'Call-in', label: 'Call-in' },
  { value: 'Reference', label: 'Reference (existing student)' },
  { value: 'Other', label: 'Other' },
];

/** Map a stored source value to a current option so editing a legacy lead
 * doesn't show a blank Source field (Naji 2026-06-24 dropped 'Social' and
 * renamed 'Referral' → 'Network'). 'Reference#<id>' is left untouched — the
 * picker effect parses it. */
function normalizeLegacySource(value: string): string {
  if (value === 'Referral') return 'Network';
  if (value === 'Social') return 'Other';
  return value;
}

/* ─── Props ──────────────────────────────────────────────────────────────── */

export interface CounsellorAddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: CounsellorPortalApi;
  session: AuthSession;
  onCreated: () => void;
  /** Application/lead id to edit. When set, the dialog runs in edit mode
   * (prefills + saves via editLead) instead of creating a new lead. */
  editId?: string;
  /** Called after a successful edit (edit mode). Falls back to onCreated. */
  onEdited?: () => void;
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function CounsellorAddLeadDialog({
  open,
  onOpenChange,
  api,
  session,
  onCreated,
  editId,
  onEdited,
}: CounsellorAddLeadDialogProps) {
  const { currentUser } = useCounsellorLayout();
  const isEditMode = Boolean(editId);

  /* ── Form state ── */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [phone, setPhone] = useState('');
  const [courseId, setCourseId] = useState('');
  const [offeringId, setOfferingId] = useState('');
  const [combinationId, setCombinationId] = useState('');
  const [source, setSource] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ── Reference (existing student) picker — Naji 2026-06-24 ── */
  const [referenceStudentId, setReferenceStudentId] = useState('');
  const [referenceStudentLabel, setReferenceStudentLabel] = useState('');
  const [studentRefOptions, setStudentRefOptions] = useState<Array<{ id: string; label: string }>>([]);

  /* ── Dropdown data ── */
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [offerings, setOfferings] = useState<Record<string, unknown>[]>([]);
  const [combinations, setCombinations] = useState<Record<string, unknown>[]>([]);

  /* Track course change to know when to clear dependents */
  const lastCourseIdRef = useRef('');
  /* Pending offering / combination ids from the edit prefill — applied once
   * the cascading loaders finish populating the dropdowns. Refs (not state) so
   * consuming the pending value doesn't re-trigger an effect that wipes it. */
  const pendingOfferingIdRef = useRef('');
  const pendingCombinationIdRef = useRef('');

  /* ── Load published courses on open ── */
  useEffect(() => {
    if (!open) return;
    void api.admin
      .loadCourses(session.token)
      .then((rows) =>
        setCourses(
          // Show live courses — exclude only draft/archived. Most courses
          // store status='active' (the DB default), so a 'published'-only
          // filter hid the lead's own course in Edit mode → Course/Offering/
          // Combination rendered blank (Naji 2026-06-26).
          rows.filter((r) => {
            const status = typeof r.status === 'string' ? r.status.toLowerCase() : '';
            return status !== 'draft' && status !== 'archived';
          }),
        ),
      )
      .catch(() => setCourses([]));
  }, [open, api, session.token]);

  /* ── Load this counsellor's students once on open for the Reference picker ── */
  useEffect(() => {
    if (!open) return;
    void api.admin
      .loadStudents(session.token, {})
      .then((rows) => {
        const opts = (Array.isArray(rows) ? rows : [])
          .map((r) => {
            const id = asString(r.id ?? r._id);
            const studentName = asString(r.name) || asString(r.student_name) || 'Student';
            const sid = asString(r.student_id);
            return { id, label: sid ? `${studentName} · ${sid}` : studentName };
          })
          .filter((o) => o.id);
        setStudentRefOptions(opts);
      })
      .catch(() => setStudentRefOptions([]));
  }, [open, api, session.token]);

  /* ── Edit-mode prefill ── */
  useEffect(() => {
    if (!open || !editId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.admin.getApplication(session.token, editId);
        if (cancelled) return;
        const r = (res as { application?: Record<string, unknown> }).application;
        if (!r) { toast.error('Lead not found.'); return; }
        setName(asString(r.name));
        setEmail(asString(r.user_email) || asString(r.email));
        setPhone(asString(r.phone));
        const cc = asString(r.country_code).replace(/\+/g, '');
        if (cc) setCountryCode(cc);
        setSource(normalizeLegacySource(asString(r.marketing_source) || asString(r.lead_source)));
        pendingOfferingIdRef.current = asString(r.offering_id);
        pendingCombinationIdRef.current = asString(r.certificate_combination_id);
        // Set courseId LAST — triggers the offering / combination loaders.
        setCourseId(asString(r.course_id));
      } catch {
        if (!cancelled) toast.error('Could not load lead.');
      }
    })();
    return () => { cancelled = true; };
  }, [open, editId, api, session.token]);

  /* ── Parse a prefilled "Reference#<id>" source into the picker state ── */
  useEffect(() => {
    if (!source || !source.startsWith('Reference#')) return;
    const refId = source.slice('Reference#'.length);
    if (!refId) return;
    setReferenceStudentId(refId);
    setSource('Reference');
    const match = studentRefOptions.find((o) => o.id === refId);
    if (match) setReferenceStudentLabel(match.label);
  }, [source, studentRefOptions]);

  /* ── Recover the picker label once the student list resolves ──
   * loadStudents may finish AFTER the prefill set referenceStudentId, leaving
   * the picker visually blank; without this the strict combobox could clear
   * the id on the next blur and lose the referral link (Naji 2026-06-24). */
  useEffect(() => {
    if (referenceStudentId && !referenceStudentLabel && studentRefOptions.length > 0) {
      const match = studentRefOptions.find((o) => o.id === referenceStudentId);
      if (match) setReferenceStudentLabel(match.label);
    }
  }, [referenceStudentId, referenceStudentLabel, studentRefOptions]);

  /* ── Load active offerings when course changes ── */
  useEffect(() => {
    if (!courseId) {
      setOfferings([]);
      setOfferingId('');
      lastCourseIdRef.current = '';
      return;
    }
    const courseChanged =
      lastCourseIdRef.current !== '' && lastCourseIdRef.current !== courseId;
    lastCourseIdRef.current = courseId;
    if (courseChanged) setOfferingId('');

    void api.admin
      .listOfferings(session.token, { course_id: courseId, status: 'active' })
      .then(async (rows) => {
        let list = rows;
        const pendingOff = pendingOfferingIdRef.current;
        if (pendingOff && !list.some((r) => asString(r.id) === pendingOff)) {
          // Saved offering isn't active — fetch all so the dropdown shows it.
          try {
            list = await api.admin.listOfferings(session.token, { course_id: courseId });
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

  /* ── Load priced combinations when course + offering are both set ── */
  useEffect(() => {
    if (!courseId || !offeringId) {
      setCombinations([]);
      setCombinationId('');
      return;
    }
    void (async () => {
      try {
        const allActive = await api.admin.listCertificateCombinations(session.token, {
          course_id: courseId,
          status: 'active',
        });
        let list = allActive;
        try {
          const packages = await api.admin.listOfferingPackages(session.token, offeringId);
          const pricedIds = new Set(packages.map((p) => asString(p.combination_id)));
          const priced = allActive.filter((c) => pricedIds.has(asString(c.id)));
          if (priced.length > 0) list = priced;
        } catch {
          /* fallback to full active list */
        }
        const pendingCombo = pendingCombinationIdRef.current;
        if (pendingCombo && !list.some((r) => asString(r.id) === pendingCombo)) {
          try {
            list = await api.admin.listCertificateCombinations(session.token, { course_id: courseId });
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

  /* ── Derived option lists ── */
  const courseOptions = useMemo(
    () =>
      courses.map((c) => ({
        label: asString(c.title) || `Course ${asString(c.id)}`,
        value: asString(c.id),
      })),
    [courses],
  );

  const offeringOptions = useMemo(
    () =>
      offerings.map((o) => ({
        label: asString(o.title) || `Offering ${asString(o.id)}`,
        value: asString(o.id),
      })),
    [offerings],
  );

  const combinationOptions = useMemo(
    () =>
      combinations.map((c) => ({
        label:
          asString(c.combination_code) ||
          asString(c.label) ||
          asString(c.title) ||
          `Combination ${asString(c.id)}`,
        value: asString(c.id),
      })),
    [combinations],
  );

  /* ── Reset on close ── */
  const reset = () => {
    setName('');
    setEmail('');
    setCountryCode('91');
    setPhone('');
    setCourseId('');
    setOfferingId('');
    setCombinationId('');
    setSource('');
    setReferenceStudentId('');
    setReferenceStudentLabel('');
    setOfferings([]);
    setCombinations([]);
    lastCourseIdRef.current = '';
    pendingOfferingIdRef.current = '';
    pendingCombinationIdRef.current = '';
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required.'); return; }
    if (!email.trim()) { toast.error('Email is required.'); return; }
    if (!phone.trim()) { toast.error('Phone is required.'); return; }
    if (!courseId) { toast.error('Course is required.'); return; }
    if (!offeringId) { toast.error('Offering is required.'); return; }
    if (combinationOptions.length > 0 && !combinationId) {
      toast.error('Certificate Combination is required.');
      return;
    }
    if (!source.trim()) { toast.error('Source is required.'); return; }
    if (source === 'Reference' && !referenceStudentId) {
      toast.error('Please pick the existing student making the referral.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: {
        name: string;
        email: string;
        phone: string;
        country_code?: string | undefined;
        course_id: string;
        offering_id?: string | undefined;
        combination_id?: string | undefined;
        source?: string | undefined;
      } = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        country_code: countryCode || undefined,
        course_id: courseId,
        offering_id: offeringId || undefined,
        combination_id: combinationId || undefined,
        // When source = Reference and a student is picked, serialise as
        // "Reference#<student_user_id>" so getApplication recovers the link.
        source:
          source.trim() === 'Reference' && referenceStudentId
            ? `Reference#${referenceStudentId}`
            : (source.trim() || undefined),
      };

      const res = isEditMode && editId
        ? await api.admin.editLead(session.token, editId, payload)
        : await api.admin.addLead(session.token, payload);
      const status = (res as { status?: number }).status;
      const message =
        asString((res as { message?: unknown }).message) ||
        (isEditMode ? 'Lead updated successfully.' : 'Lead created successfully.');

      if (status === 1) {
        toast.success(message);
        reset();
        if (isEditMode) (onEdited ?? onCreated)();
        else onCreated();
      } else {
        toast.error(message || 'Failed to save lead.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save lead.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit =
    !submitting &&
    name.trim() !== '' &&
    email.trim() !== '' &&
    phone.trim() !== '' &&
    courseId !== '' &&
    offeringId !== '' &&
    source !== '' &&
    (source !== 'Reference' || referenceStudentId !== '');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* The shadcn Dialog renders its content through a Radix portal anchored
          to <body>, which sits OUTSIDE the .counsellor-theme layout wrapper —
          so without this class the dialog falls back to the admin :root palette
          (magenta primary) instead of the counsellor Lovable orange/navy theme
          (Naji 2026-06-24 "counsellor — again design changed"). */}
      <DialogContent
        className="counsellor-theme max-h-[90vh] overflow-y-auto"
        style={{ width: 'min(672px, calc(100vw - 2rem))', maxWidth: 'min(672px, calc(100vw - 2rem))' }}
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Lead' : 'Add Lead'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the lead details. Fields marked with * are required.'
              : 'Create a new lead. Fields marked with * are required.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4 pt-2">
          {/* Row 1 — Name + Email */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cald-name">Name *</Label>
              <Input
                id="cald-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cald-email">Email *</Label>
              <Input
                id="cald-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                maxLength={255}
              />
            </div>
          </div>

          {/* Row 2 — Phone (full-width: country code + number) */}
          <div className="space-y-1.5">
            <Label>Phone Number</Label>
            <div className="flex gap-2">
              <Select value={countryCode} onValueChange={setCountryCode}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="counsellor-theme">
                  {COUNTRY_CODES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                placeholder="Phone number"
                maxLength={15}
                className="flex-1"
              />
            </div>
          </div>

          {/* Row 3 — Course + Offering */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Course *</Label>
              <Select
                value={courseId}
                onValueChange={(v) => {
                  setCourseId(v);
                  setOfferingId('');
                  setCombinationId('');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent className="counsellor-theme">
                  {courseOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Offering *</Label>
              <Select
                value={offeringId}
                onValueChange={setOfferingId}
                disabled={!courseId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={courseId ? 'Select offering' : 'Pick a course first'}
                  />
                </SelectTrigger>
                <SelectContent className="counsellor-theme">
                  {offeringOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4 — Certificate Combination + Source */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                Certificate Combination
                {combinationOptions.length > 0 ? ' *' : ''}
              </Label>
              <Select
                value={combinationId}
                onValueChange={setCombinationId}
                disabled={!offeringId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !offeringId
                        ? 'Pick a course first'
                        : combinationOptions.length === 0
                        ? 'None available'
                        : 'Select combination'
                    }
                  />
                </SelectTrigger>
                <SelectContent className="counsellor-theme">
                  {combinationOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Source *</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent className="counsellor-theme">
                  {SOURCE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reference (existing student) picker — only when source = Reference.
              Stores the referred student's user_id; serialised as
              "Reference#<id>" on save (Naji 2026-06-24). */}
          {source === 'Reference' ? (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <SearchableSelect
                label="Referred By (Existing Student) *"
                value={referenceStudentLabel}
                onChange={(label) => {
                  setReferenceStudentLabel(label);
                  const match = studentRefOptions.find((o) => o.label === label);
                  setReferenceStudentId(match?.id ?? '');
                }}
                options={studentRefOptions.map((o) => o.label)}
                placeholder="Search by name or student ID"
                strict
              />
              {!referenceStudentId ? (
                <p className="mt-1 text-xs text-amber-700">
                  Pick the existing student making the referral, otherwise the source won't capture who referred this lead.
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Row 5 — Pipeline (read-only) + Pipeline User (read-only) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Pipeline</Label>
              <Input value="Counsellor" disabled className="bg-muted/40" />
            </div>
            <div className="space-y-1.5">
              <Label>Pipeline User</Label>
              <Input
                value={currentUser?.name ?? '—'}
                disabled
                className="bg-muted/40"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting
                ? (isEditMode ? 'Saving…' : 'Adding…')
                : (isEditMode ? 'Save Changes' : 'Add Lead')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
