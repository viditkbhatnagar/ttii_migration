import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Camera, GraduationCap, MapPin, UserCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import { titleCaseEachWord } from '@/lib/text-format';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asString, toRecords } from '../../shared/utils/admin-data-utils.js';
import { PhotoUpload } from '../../shared/components/PhotoUpload.js';
import { SearchableSelect } from '../../shared/components/SearchableSelect.js';
import { Panel, SectionHeader } from './student-view/student-view-ui.js';
import {
  ACCOUNT_STATUSES,
  DISTRICTS_BY_STATE,
  EMPLOYMENT_STATUSES,
  EXPERIENCE_BUCKETS,
  GENDERS,
  INDIAN_STATES,
  MARITAL_STATUSES,
  QUALIFICATIONS,
  ageFromDob,
  buildStudentForm,
  localTodayYmd,
  withCurrent,
  type StudentForm,
} from './edit-student-model.js';

// Admin → Students → Edit, restyled to match the rebuilt Student View (Naji's
// profile cards, TTII 2026-10-12). Same fields, same legacy-value prefill, same
// photo upload + crop, same save body (POST updateStudentFull with the form +
// profile_picture) and the same return to the student's View page.

const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';
const TEXTAREA_CLASS = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const opts = (list: string[]) => [{ value: '', label: 'Select' }, ...list.map((v) => ({ value: v, label: v }))];

export default function EditStudentPage({ api, session, onNavigate }: AdminPageProps) {
  const studentId = useMemo(() => {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1] || '';
  }, []);

  const { data, loading, error } = useAdminPageData(() => api.getStudentDetail(session.token, studentId), [studentId]);
  const { data: countriesData } = useAdminPageData(() => api.loadCountries(session.token), []);

  const [form, setForm] = useState<StudentForm>({});
  const [photo, setPhoto] = useState('');
  const [saving, setSaving] = useState(false);

  const student = useMemo(() => {
    const record = data?.student;
    return typeof record === 'object' && record !== null ? (record as Record<string, unknown>) : null;
  }, [data]);

  useEffect(() => {
    if (!student) return;
    setForm(buildStudentForm(student));
    setPhoto(asString(student.profile_picture) || asString(student.image));
  }, [student]);

  const countryNames = useMemo(
    () => toRecords(countriesData).map((c) => asString(c.name)).filter(Boolean).sort(),
    [countriesData],
  );

  const set = useCallback((key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value })), []);

  // Naji 2026-05-11 — Age is derived from DOB, not editable.
  useEffect(() => {
    if (!form.date_of_birth) return;
    const age = ageFromDob(form.date_of_birth, localTodayYmd());
    if (age === null) return;
    setForm((prev) => (prev.age === String(age) ? prev : { ...prev, age: String(age) }));
  }, [form.date_of_birth]);

  const backToView = () => onNavigate(`/admin/students/view/${studentId}`);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateStudentFull(session.token, studentId, { ...form, profile_picture: photo });
      toast.success('Student updated.');
      backToView();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLoader label="Loading student..." />;
  if (error || !student) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-destructive">
          {error || 'Student not found.'}
          <div className="mt-4"><Button variant="outline" onClick={() => onNavigate('/admin/students')}>Back to Students</Button></div>
        </CardContent>
      </Card>
    );
  }

  const f = (k: string) => form[k] ?? '';
  const text = (k: string, label: string, extra: { titleCase?: boolean; type?: string } = {}) => (
    <TextField label={label} value={f(k)} onChange={(v) => set(k, v)} {...extra} />
  );
  const select = (k: string, label: string, options: Array<{ value: string; label: string }>) => (
    <SelectField label={label} value={f(k)} onChange={(v) => set(k, v)} options={options} />
  );
  const districts = DISTRICTS_BY_STATE[f('state')];
  const saveButtons = (
    <>
      <Button variant="outline" size="sm" disabled={saving} onClick={backToView}>Cancel</Button>
      <Button size="sm" className="rounded-xl bg-[image:var(--gradient-primary)] px-4 shadow-[var(--shadow-soft)] hover:opacity-90" disabled={saving} onClick={() => { void handleSave(); }}>
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">Edit student profile</h1>
          <p className="text-xs text-muted-foreground">Update the learner&apos;s personal, contact and qualification details.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={backToView}>
          <ArrowLeft aria-hidden="true" className="size-4" /> Back to Student
        </Button>
      </div>

      <Panel>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <PhotoUpload
              value={photo}
              onChange={setPhoto}
              onUpload={async (file) => (await api.uploadFile(session.token, file)).url}
              fallbackInitials={(f('name') || '?').slice(0, 2).toUpperCase()}
            />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-foreground">{f('name') || 'Unnamed Student'}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {[asString(student.student_id), f('user_email')].filter(Boolean).join(' · ') || 'No student ID yet'}
              </p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Camera aria-hidden="true" className="size-3.5" /> Profile photo is cropped square before upload.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">{saveButtons}</div>
        </div>
      </Panel>

      <Panel>
        <SectionHeader icon={UserCircle2} title="Personal Information" description="Identity, contact and demographic details" />
        <div className="grid gap-4 md:grid-cols-2">
          {text('name', 'Name', { titleCase: true })}
          {text('user_email', 'Email', { type: 'email' })}
          {text('phone', 'Phone')}
          {text('alternate_phone', 'Alternate Phone')}
          {text('whatsapp_no', 'WhatsApp')}
          <div>
            <Label className="mb-1 text-xs">Date of Birth</Label>
            {/* Naji/Risha 2026-07-06 — masked dd/mm/yyyy field (stores ISO). */}
            <DmyDateInput value={f('date_of_birth')} onChange={(v) => set('date_of_birth', v)} />
          </div>
          <TextField label="Age" value={f('age')} onChange={() => undefined} readOnly hint="Auto-calculated from Date of Birth" />
          {select('gender', 'Gender', withCurrent(opts(GENDERS), f('gender')))}
          {select('marital_status', 'Marital Status', withCurrent(opts(MARITAL_STATUSES), f('marital_status')))}
          <SearchableSelect label="Nationality" value={f('nationality')} onChange={(v) => set('nationality', v)} options={countryNames} placeholder="Type to search countries…" />
          {text('aadhar_no', 'Aadhar No')}
          {text('passport_no', 'Passport No')}
          {text('father_name', 'Father Name', { titleCase: true })}
          {text('mother_name', 'Mother Name', { titleCase: true })}
          {text('guardian_name', 'Guardian Name', { titleCase: true })}
          {select('status', 'Status', withCurrent(ACCOUNT_STATUSES, f('status') || '1'))}
        </div>
      </Panel>

      <Panel>
        <SectionHeader icon={MapPin} title="Location & Address" description="Where the learner lives" />
        <div className="grid gap-4 md:grid-cols-2">
          <SearchableSelect label="Country" value={f('country')} onChange={(v) => set('country', v)} options={countryNames} placeholder="Type to search countries…" />
          <SearchableSelect label="State" value={f('state')} onChange={(v) => set('state', v)} options={INDIAN_STATES} placeholder="Type to search Indian states…" />
          {/* Naji 2026-05-12 — District is searchable when the state has a curated list; free text otherwise. */}
          {districts ? (
            <SearchableSelect label="City / District" value={f('city')} onChange={(v) => set('city', v)} options={districts} placeholder={`Type to search ${f('state')} districts…`} />
          ) : text('city', 'City / District', { titleCase: true })}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="edit-address" className="mb-1 text-xs">Permanent Address</Label>
            <textarea id="edit-address" className={TEXTAREA_CLASS} rows={3} value={f('address')} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-native-address" className="mb-1 text-xs">Correspondence Address</Label>
            <textarea id="edit-native-address" className={TEXTAREA_CLASS} rows={3} value={f('native_address')} onChange={(e) => set('native_address', e.target.value)} />
          </div>
        </div>
      </Panel>

      <Panel>
        <SectionHeader icon={GraduationCap} title="Qualification & Employment" description="Education background and work details" />
        <div className="grid gap-4 md:grid-cols-2">
          {select('highest_qualification', 'Highest Qualification', withCurrent(opts(QUALIFICATIONS), f('highest_qualification')))}
          {text('specialization', 'Specialization', { titleCase: true })}
          {text('institution_name', 'School / College', { titleCase: true })}
          {text('year_of_passing', 'Year of Passing')}
          {text('percentage_or_grade', 'Percentage / Grade')}
          {select('employment_status', 'Current Employment Status', withCurrent(opts(EMPLOYMENT_STATUSES), f('employment_status')))}
          {text('current_occupation', 'Current Occupation', { titleCase: true })}
          {select('experience_years', 'Experience', withCurrent(opts(EXPERIENCE_BUCKETS), f('experience_years')))}
        </div>
      </Panel>

      <div className="flex items-center justify-end gap-2">{saveButtons}</div>
    </div>
  );
}

function TextField({
  label, value, onChange, type, readOnly, hint, titleCase,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  hint?: string;
  titleCase?: boolean;
}) {
  return (
    <div>
      <Label className="mb-1 text-xs">{label}</Label>
      <Input
        type={type ?? 'text'}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onBlur={titleCase ? (e) => {
          const next = titleCaseEachWord(e.target.value);
          if (next !== e.target.value) onChange(next);
        } : undefined}
        readOnly={readOnly}
        className={readOnly ? 'cursor-not-allowed bg-muted/50 text-muted-foreground' : undefined}
      />
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div>
      <Label className="mb-1 text-xs">{label}</Label>
      <select aria-label={label} className={SELECT_CLASS} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
