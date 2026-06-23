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

/* ─── Constants ─────────────────────────────────────────────────────────── */

const COUNTRY_CODES: Array<{ code: string; label: string }> = [
  { code: '91', label: '🇮🇳 +91' },
  { code: '1', label: '🇺🇸 +1' },
  { code: '44', label: '🇬🇧 +44' },
  { code: '971', label: '🇦🇪 +971' },
  { code: '65', label: '🇸🇬 +65' },
  { code: '61', label: '🇦🇺 +61' },
];

/** Source options — mirrors the admin AddLeadPage <select> exactly. */
const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Walk-in', label: 'Walk-in' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Website', label: 'Website' },
  { value: 'Social', label: 'Social Media' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Email', label: 'Email' },
  { value: 'Call-in', label: 'Call-in' },
  { value: 'Reference', label: 'Reference (existing student)' },
  { value: 'Other', label: 'Other' },
];

/* ─── Props ──────────────────────────────────────────────────────────────── */

export interface CounsellorAddLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  api: CounsellorPortalApi;
  session: AuthSession;
  onCreated: () => void;
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function CounsellorAddLeadDialog({
  open,
  onOpenChange,
  api,
  session,
  onCreated,
}: CounsellorAddLeadDialogProps) {
  const { currentUser } = useCounsellorLayout();

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

  /* ── Dropdown data ── */
  const [courses, setCourses] = useState<Record<string, unknown>[]>([]);
  const [offerings, setOfferings] = useState<Record<string, unknown>[]>([]);
  const [combinations, setCombinations] = useState<Record<string, unknown>[]>([]);

  /* Track course change to know when to clear dependents */
  const lastCourseIdRef = useRef('');

  /* ── Load published courses once on mount ── */
  useEffect(() => {
    if (!open) return;
    void api.admin
      .loadCourses(session.token)
      .then((rows) =>
        setCourses(
          rows.filter((r) => {
            const status = r.status;
            return typeof status === 'string' && status.toLowerCase() === 'published';
          }),
        ),
      )
      .catch(() => setCourses([]));
  }, [open, api, session.token]);

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
      .then((rows) => setOfferings(rows))
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
        setCombinations(list);
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
    setOfferings([]);
    setCombinations([]);
    lastCourseIdRef.current = '';
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
        source: source.trim() || undefined,
      };

      const res = await api.admin.addLead(session.token, payload);
      const status = (res as { status?: number }).status;
      const message =
        asString((res as { message?: unknown }).message) || 'Lead created successfully.';

      if (status === 1) {
        toast.success(message);
        reset();
        onCreated();
      } else {
        toast.error(message || 'Failed to add lead.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add lead.');
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
    source !== '';

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
          <DialogTitle>Add Lead</DialogTitle>
          <DialogDescription>
            Create a new lead. Fields marked with * are required.
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
              {submitting ? 'Adding…' : 'Add Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
