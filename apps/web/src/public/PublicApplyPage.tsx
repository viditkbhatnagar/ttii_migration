import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseEachWord } from '@/lib/text-format';
// Naji UAT 2026-05-31 — Country / State / District as cascading
// dropdowns sourced from the shared location dataset.
import { COUNTRIES, INDIAN_STATES, getDistrictsForState } from '@/lib/locations';

type ApiOk = { status: 1; data?: Record<string, unknown> };
type ApiErr = { status: number; message?: string };

const API_BASE = '/api';

// Naji UAT 2026-05-31 — Highest Qualification is now a fixed dropdown
// instead of free text so the data stays clean.
const QUALIFICATION_OPTIONS: readonly string[] = [
  '10th / SSLC',
  '12th / HSC',
  'Diploma',
  'Undergraduate (Bachelor’s)',
  'Postgraduate (Master’s)',
  'Doctorate (PhD)',
  'Other',
];

// Year of Passing dropdown — current year down to 1970.
const YEAR_OPTIONS: readonly string[] = (() => {
  const current = new Date().getFullYear();
  const years: string[] = [];
  for (let y = current; y >= 1970; y--) years.push(String(y));
  return years;
})();

// Country name list for the Nationality + Country dropdowns.
const COUNTRY_NAMES: readonly string[] = COUNTRIES.map((c) => c.name);

function asString(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v;
}
function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

// Naji UAT 2026-05-31 — DOB must read + accept dd/mm/yyyy (the native
// <input type="date"> renders in the browser locale, which can't be
// overridden). We display/accept dd/mm/yyyy and keep the canonical
// yyyy-mm-dd internally so the backend is unaffected. Same pattern as
// GeneratePaymentLinkDialog.tsx.
function isoToDmy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
function dmyToIso(dmy: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dmy.trim());
  if (!m) return '';
  return `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}`;
}

// Age in whole years from an ISO yyyy-mm-dd date of birth.
function computeAge(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  const dob = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(dob.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
  return age >= 0 && age < 150 ? String(age) : '';
}

interface FormState {
  // Naji UAT 2026-05-31 — single Full Name field (was First + Last).
  // Split back into first_name / last_name on save/submit so the
  // backend payload is unchanged.
  full_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  marital_status: string;
  father_name: string;
  mother_name: string;
  guardian_name: string;
  aadhar_no: string;
  passport_no: string;
  // Naji 2026-05-08: contact info section — was missing entirely.
  // Naji UAT 2026-05-31 — email + phone are now read-only (prefilled
  // from the lead).
  email: string;
  phone: string;
  // Naji 2026-05-09 — phone + WhatsApp country codes (the admin form
  // captures these separately so PDFs / SMS use the right format).
  country_code: string;
  alternate_phone: string;
  whatsapp_no: string;
  whatsapp_country_code: string;
  // Naji 2026-05-09 — applicant profile photo (was admin-only).
  photo_url: string;
  country: string;
  address: string;
  native_address: string;
  state: string;
  district: string;
  highest_qualification: string;
  specialization: string;
  previous_school: string;
  year_of_passing: string;
  // percentage_or_grade removed from the UI (Naji UAT 2026-05-31) but
  // still sent as '' so the backend column stays tolerant.
  teaching_experience: string;
  employment_status: string;
  organization_name: string;
  experience_years: string;
  // Mapped to the "Current Occupation" label in the UI; backend field
  // name stays `designation`.
  designation: string;
}

interface EducationPathwayRow {
  qualification: string;
  specialization: string;
  institution: string;
  board: string;
  year_passed: string;
  marks: string;
}

// Course / offering / required-documents context surfaced by the
// /apply loader (Naji UAT 2026-05-31).
interface RequiredDocument {
  document_type_id: number;
  label: string;
  is_mandatory: boolean;
}

function emptyForm(): FormState {
  return {
    full_name: '', date_of_birth: '', gender: '', nationality: 'India',
    marital_status: '', father_name: '', mother_name: '', guardian_name: '',
    aadhar_no: '', passport_no: '',
    email: '', phone: '', country_code: '91', alternate_phone: '', whatsapp_no: '', whatsapp_country_code: '91', photo_url: '', country: 'India',
    address: '', native_address: '', state: '', district: '',
    highest_qualification: '', specialization: '', previous_school: '', year_of_passing: '',
    teaching_experience: '', employment_status: '',
    organization_name: '', experience_years: '', designation: '',
  };
}

// Split a single full name into first + remainder for the backend.
function splitName(full: string): { first_name: string; last_name: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  return { first_name: parts[0] ?? '', last_name: parts.slice(1).join(' ') };
}

// Build the backend payload from form state — maps Full Name → first/last
// and keeps percentage_or_grade as '' (removed from UI). Used by both
// save-draft and submit so the two stay in sync.
function toBackendForm(form: FormState): Record<string, string> {
  const { first_name, last_name } = splitName(form.full_name);
  return {
    first_name,
    last_name,
    date_of_birth: form.date_of_birth,
    gender: form.gender,
    nationality: form.nationality,
    marital_status: form.marital_status,
    father_name: form.father_name,
    mother_name: form.mother_name,
    guardian_name: form.guardian_name,
    aadhar_no: form.aadhar_no,
    passport_no: form.passport_no,
    email: form.email,
    phone: form.phone,
    country_code: form.country_code,
    alternate_phone: form.alternate_phone,
    whatsapp_no: form.whatsapp_no,
    whatsapp_country_code: form.whatsapp_country_code,
    photo_url: form.photo_url,
    country: form.country,
    address: form.address,
    native_address: form.native_address,
    state: form.state,
    district: form.district,
    highest_qualification: form.highest_qualification,
    specialization: form.specialization,
    previous_school: form.previous_school,
    year_of_passing: form.year_of_passing,
    percentage_or_grade: '',
    teaching_experience: form.teaching_experience,
    employment_status: form.employment_status,
    organization_name: form.organization_name,
    experience_years: form.experience_years,
    designation: form.designation,
  };
}

// Naji UAT 2026-05-17 — Student Declaration bullets shown as checkboxes
// in this form (every box must be ticked before submit) and also
// printed verbatim in the generated application PDF.
const DECLARATION_LINES: readonly string[] = [
  'I declare that all information provided in this application form is true and correct to the best of my knowledge and belief. I understand that any violation of this may result in cancellation of my admission by the organization.',
  "I agree to abide by all rules, regulations, and policies of the Teachers' Training Institute of India, and to maintain the required code of conduct, discipline, and academic standards.",
  'I acknowledge that the certificate will be issued only upon successful completion of all academic and attendance requirements, and I understand that the institute reserves the right to modify the course structure, schedule, or faculty as deemed necessary.',
  'I understand that fees once paid are strictly non-refundable and non-transferable under any circumstances.',
  'I consent to the institute contacting me via phone, email, or WhatsApp for academic and administrative purposes and authorize the use of my photograph and personal details for official, academic, or promotional purposes if required.',
];

/**
 * Public Application Form — Naji 2026-05-05, Phase D.
 *
 * Lives on `learn.teachersindia.in/apply/<token>`. No login. The
 * counsellor-generated token is single-use; the page hydrates the
 * form with whatever data we have on the application + any saved
 * draft. Save-as-draft and Submit. Signature is a typed full-name
 * confirmation (signature pad component is a future polish).
 */
export default function PublicApplyPage({ token }: { token: string }) {
  const [phase, setPhase] = useState<'loading' | 'error' | 'ready' | 'submitted'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [appName, setAppName] = useState<string>('');
  const [form, setForm] = useState<FormState>(emptyForm());
  // Naji UAT 2026-05-31 — Course + Offering shown read-only at the top.
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [offeringTitle, setOfferingTitle] = useState<string>('');
  // Course-driven document slots (Naji UAT 2026-05-31). When the loader
  // returns these, the Documents section renders one upload per slot.
  const [requiredDocs, setRequiredDocs] = useState<RequiredDocument[]>([]);
  const [signature, setSignature] = useState<string>('');
  // Naji UAT 2026-05-17 — five-point Student Declaration block as
  // explicit checkboxes the student must tick before they can submit.
  // Mirrors the bullets printed in the application PDF; the boolean
  // array indexes match DECLARATION_LINES (see below).
  const [declarations, setDeclarations] = useState<boolean[]>([false, false, false, false, false]);
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [educationPathway, setEducationPathway] = useState<EducationPathwayRow[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    void fetch(`${API_BASE}/apply/${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((res: unknown) => {
        if (cancelled) return;
        const wrap = asRecord(res);
        if ((wrap.status as number) !== 1) {
          setErrorMsg(asString(wrap.message) || 'Could not open application.');
          setPhase('error');
          return;
        }
        const data = asRecord(wrap.data);
        const app = asRecord(data.application);
        const draft = asRecord(data.draft);
        const next = emptyForm();
        // Hydrate from app (server fields have snake_case names matching FormState).
        const fields: Array<keyof FormState> = [
          'date_of_birth', 'gender', 'nationality', 'marital_status',
          'father_name', 'mother_name', 'guardian_name', 'aadhar_no', 'passport_no',
          'email', 'phone', 'country_code', 'alternate_phone', 'whatsapp_no', 'whatsapp_country_code', 'photo_url', 'country',
          'address', 'native_address', 'state', 'district',
          'highest_qualification', 'specialization', 'previous_school', 'year_of_passing',
          'teaching_experience', 'employment_status', 'organization_name',
          'experience_years', 'designation',
        ];
        // Naji UAT 2026-05-31 — single Full Name field. Hydrate from the
        // saved draft's full_name if present, else from the application's
        // name (or first_name + last_name).
        if (asString(draft.full_name)) {
          next.full_name = asString(draft.full_name);
        } else if (asString(app.name)) {
          next.full_name = asString(app.name);
        } else {
          next.full_name = `${asString(app.first_name)} ${asString(app.last_name)}`.trim();
        }
        // Pre-fill contact + email from the application's existing fields.
        if (asString(app.user_email)) next.email = asString(app.user_email);
        if (asString(app.phone)) next.phone = asString(app.phone);
        if (asString(app.second_phone)) next.alternate_phone = asString(app.second_phone);
        if (asString(app.whatsapp)) next.whatsapp_no = asString(app.whatsapp);
        // Country code prefilling (drop the leading + so the input shows just digits).
        if (asString(app.country_code)) next.country_code = asString(app.country_code).replace(/^\+/, '');
        if (asString(app.whatsapp_country_code)) next.whatsapp_country_code = asString(app.whatsapp_country_code).replace(/^\+/, '');
        if (asString(app.image)) next.photo_url = asString(app.image);
        for (const f of fields) {
          const v: unknown = draft[f] !== undefined ? draft[f] : app[f];
          if (v === undefined || v === null) continue;
          let s = '';
          if (typeof v === 'string') s = v;
          else if (v instanceof Date) s = v.toISOString().slice(0, 10);
          else if (typeof v === 'number' || typeof v === 'boolean') s = String(v);
          else continue;
          next[f] = s;
        }
        // Hydrate education pathway from server (if present).
        const pathwayRaw = data.education_pathway ?? draft.education_pathway;
        if (Array.isArray(pathwayRaw)) {
          const rows: EducationPathwayRow[] = [];
          for (const entry of pathwayRaw) {
            if (!entry || typeof entry !== 'object') continue;
            const r = entry as Record<string, unknown>;
            rows.push({
              qualification: asString(r.qualification),
              specialization: asString(r.specialization),
              institution: asString(r.institution),
              board: asString(r.board),
              year_passed: asString(r.year_passed),
              marks: asString(r.marks),
            });
          }
          if (rows.length > 0) setEducationPathway(rows);
        }
        // Naji UAT 2026-05-31 — course/offering read-only context +
        // course-driven required document slots.
        const courseInfo = asRecord(data.course);
        const offeringInfo = asRecord(data.offering);
        setCourseTitle(asString(courseInfo.title));
        setOfferingTitle(asString(offeringInfo.title) || asString(offeringInfo.offering_code));
        const reqDocsRaw = data.required_documents;
        if (Array.isArray(reqDocsRaw)) {
          const docs: RequiredDocument[] = [];
          for (const entry of reqDocsRaw) {
            if (!entry || typeof entry !== 'object') continue;
            const r = entry as Record<string, unknown>;
            const label = asString(r.label);
            if (!label) continue;
            docs.push({
              document_type_id: typeof r.document_type_id === 'number' ? r.document_type_id : 0,
              label,
              is_mandatory: Boolean(r.is_mandatory),
            });
          }
          setRequiredDocs(docs);
        }
        setForm(next);
        setAppName(asString(app.name) || asString(app.user_email));
        setPhase('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : 'Network error.');
        setPhase('error');
      });
    return () => { cancelled = true; };
  }, [token]);

  const update = <K extends keyof FormState>(key: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      // Persist the raw form (incl. the single full_name field) so the
      // draft round-trips exactly when the student reopens the link. Also
      // include the split first_name/last_name so any consumer reading the
      // draft as an application snapshot still sees them.
      const { first_name, last_name } = splitName(form.full_name);
      const res = await fetch(`${API_BASE}/apply/${encodeURIComponent(token)}/save-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: { ...form, first_name, last_name, percentage_or_grade: '', education_pathway: educationPathway } }),
      });
      const json = (await res.json()) as ApiOk | ApiErr;
      if (json.status === 1) toast.success('Draft saved.');
      else toast.error((json as ApiErr).message ?? 'Could not save draft.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // Naji UAT 2026-05-13 — public form now enforces the same required
    // fields as the admin Add Application form so leads can't submit a
    // blank application via the magic-link.
    // Naji UAT 2026-05-31 — Profile Photo + Signature are mandatory;
    // Full Name replaces First/Last; Aadhaar/Passport are conditionally
    // required (at least one); Percentage/Grade removed.
    if (!form.photo_url.trim()) { toast.error('Profile Photo is required.'); return; }
    const required: { value: string; label: string }[] = [
      { value: form.full_name.trim(), label: 'Full Name' },
      { value: form.date_of_birth, label: 'Date of Birth' },
      { value: form.gender, label: 'Gender' },
      { value: form.nationality.trim(), label: 'Nationality' },
      { value: form.marital_status, label: 'Marital Status' },
      { value: form.father_name.trim(), label: "Father's Name" },
      { value: form.mother_name.trim(), label: "Mother's Name" },
      { value: form.country.trim(), label: 'Country' },
      { value: form.state.trim(), label: 'State' },
      { value: form.district.trim(), label: 'District' },
      { value: form.address.trim(), label: 'Permanent Address' },
      { value: form.native_address.trim(), label: 'Correspondence / Native Address' },
      { value: form.highest_qualification.trim(), label: 'Highest Qualification' },
      { value: form.previous_school.trim(), label: 'School / College' },
      { value: form.year_of_passing.trim(), label: 'Year of Passing' },
      { value: form.employment_status, label: 'Employment Status' },
    ];
    const missing = required.find((r) => !r.value);
    if (missing) { toast.error(`${missing.label} is required.`); return; }
    // At least one of Aadhaar / Passport must be present. If Aadhaar is
    // given, Passport isn't mandatory, and vice-versa.
    if (!form.aadhar_no.trim() && !form.passport_no.trim()) {
      toast.error('Please provide either an Aadhaar number or a Passport number.');
      return;
    }
    if (!signature.trim()) { toast.error('Please sign in the signature box.'); return; }
    // Naji UAT 2026-05-31 — every mandatory course document must be uploaded.
    const missingDoc = requiredDocs.find(
      (d) => d.is_mandatory && !documents.some((doc) => doc.document_type_id === d.document_type_id),
    );
    if (missingDoc) { toast.error(`Please upload: ${missingDoc.label}.`); return; }
    if (declarations.some((checked) => !checked)) {
      toast.error('Please read and accept every declaration before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/apply/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form: toBackendForm(form), signature: signature.trim(), documents, education_pathway: educationPathway }),
      });
      const json = (await res.json()) as ApiOk | ApiErr;
      if (json.status === 1) {
        toast.success('Application submitted.');
        setPhase('submitted');
      } else {
        toast.error((json as ApiErr).message ?? 'Could not submit.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (phase === 'loading') return <PageLoader label="Opening application..." />;
  if (phase === 'error') {
    return (
      <main className="mx-auto w-[min(560px,calc(100%-2rem))] py-12 text-center">
        <Card><CardContent className="space-y-3 p-8">
          <h1 className="text-lg font-semibold text-red-600">Cannot open application</h1>
          <p className="text-sm text-slate-600">{errorMsg}</p>
        </CardContent></Card>
      </main>
    );
  }
  if (phase === 'submitted') {
    return (
      <main className="mx-auto w-[min(560px,calc(100%-2rem))] py-12 text-center">
        <Card><CardContent className="space-y-3 p-8">
          <h1 className="text-lg font-semibold text-emerald-600">Application submitted</h1>
          <p className="text-sm text-slate-600">
            Thank you. Your counsellor will review your application and confirm your enrolment by email.
          </p>
        </CardContent></Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-[min(800px,calc(100%-2rem))] py-8 space-y-4">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">TTII Application Form</h1>
            <p className="text-sm text-slate-500">{appName ? `Hi ${appName} — please review and complete the details below.` : 'Please complete the details below.'}</p>
          </div>

          {/* Course & Offering — Naji UAT 2026-05-31 — shown read-only at
              the top so the applicant can confirm what they're applying for.
              These are NOT editable. */}
          {courseTitle || offeringTitle ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">You are applying for</p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ReadOnlyField label="Course" value={courseTitle || '—'} />
                <ReadOnlyField label="Offering" value={offeringTitle || '—'} />
              </div>
            </div>
          ) : null}

          {/* Profile Photo — Naji 2026-05-09 — was admin-only. Naji UAT
              2026-05-31 — mandatory, plain file upload (no crop step). */}
          <h2 className="pt-2 text-sm font-semibold text-slate-700">Profile Photo *</h2>
          <PhotoUploader
            token={token}
            value={form.photo_url}
            onChange={(url) => setForm((p) => ({ ...p, photo_url: url }))}
          />

          <h2 className="pt-2 text-sm font-semibold text-slate-700">Personal</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Naji UAT 2026-05-31 — single Full Name field. */}
            <FieldText label="Full Name *" value={form.full_name} onChange={update('full_name')} titleCase />
            {/* DOB in dd/mm/yyyy + auto-computed read-only Age. */}
            <FieldDmyDate label="Date of Birth *" value={form.date_of_birth} onChange={(iso) => setForm((p) => ({ ...p, date_of_birth: iso }))} />
            <ReadOnlyField label="Age" value={computeAge(form.date_of_birth) || '—'} />
            <FieldSelect label="Gender *" value={form.gender} onChange={update('gender')} options={['', 'Male', 'Female', 'Other']} />
            <FieldSelect label="Nationality *" value={form.nationality} onChange={update('nationality')} options={['', ...COUNTRY_NAMES]} />
            <FieldSelect label="Marital Status *" value={form.marital_status} onChange={update('marital_status')} options={['', 'Single', 'Married', 'Divorced', 'Widowed']} />
            <FieldText label="Father's Name *" value={form.father_name} onChange={update('father_name')} titleCase />
            <FieldText label="Mother's Name *" value={form.mother_name} onChange={update('mother_name')} titleCase />
            <FieldText label="Guardian's Name" value={form.guardian_name} onChange={update('guardian_name')} titleCase />
            {/* Naji UAT 2026-05-31 — at least one of Aadhaar / Passport is
                required (validated on submit); neither is individually marked
                mandatory. */}
            <FieldText label="Aadhaar No" value={form.aadhar_no} onChange={update('aadhar_no')} />
            <FieldText label="Passport No" value={form.passport_no} onChange={update('passport_no')} />
          </div>
          <p className="-mt-2 text-xs text-slate-500">Provide at least one of Aadhaar No or Passport No.</p>

          {/* Contact Information — Naji 2026-05-08: was missing entirely;
              public form now mirrors the admin Add Application contact group.
              Naji UAT 2026-05-31 — Email + Phone (incl. country code) are
              read-only, prefilled from the lead. */}
          <h2 className="pt-4 text-sm font-semibold text-slate-700">Contact Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <ReadOnlyField label="Email" value={form.email || '—'} />
            <ReadOnlyField label="Phone" value={form.phone ? `+${form.country_code} ${form.phone}` : '—'} />
            <FieldText label="Alternate Phone" value={form.alternate_phone} onChange={update('alternate_phone')} />
            <PhoneFieldGroup
              label="WhatsApp Number"
              code={form.whatsapp_country_code}
              onCodeChange={update('whatsapp_country_code')}
              number={form.whatsapp_no}
              onNumberChange={update('whatsapp_no')}
            />
          </div>

          {/* Address — Naji UAT 2026-05-31 — Country / State / District are
              cascading dropdowns placed together; Country first, then State,
              then District. */}
          <h2 className="pt-4 text-sm font-semibold text-slate-700">Address</h2>
          <div className="grid grid-cols-1 gap-4">
            <FieldTextArea label="Permanent Address *" value={form.address} onChange={update('address')} />
            <FieldTextArea label="Correspondence / Native Address *" value={form.native_address} onChange={update('native_address')} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FieldSelect
                label="Country *"
                value={form.country}
                options={['', ...COUNTRY_NAMES]}
                onChange={(e) => {
                  const country = e.target.value;
                  // Changing Country resets State + District.
                  setForm((p) => ({ ...p, country, state: '', district: '' }));
                }}
              />
              <StateField
                country={form.country}
                value={form.state}
                onChange={(state) => setForm((p) => ({ ...p, state, district: '' }))}
              />
              <DistrictField
                country={form.country}
                state={form.state}
                value={form.district}
                onChange={(district) => setForm((p) => ({ ...p, district }))}
              />
            </div>
          </div>

          {/* Qualification — Naji UAT 2026-05-31 — Highest Qualification +
              Year of Passing are dropdowns; Percentage / Grade removed. */}
          <h2 className="pt-4 text-sm font-semibold text-slate-700">Qualification</h2>
          <div className="grid grid-cols-2 gap-4">
            <FieldSelect label="Highest Qualification *" value={form.highest_qualification} onChange={update('highest_qualification')} options={['', ...QUALIFICATION_OPTIONS]} />
            <FieldText label="Specialization" value={form.specialization} onChange={update('specialization')} titleCase />
            <FieldText label="School / College *" value={form.previous_school} onChange={update('previous_school')} titleCase />
            <FieldSelect label="Year of Passing *" value={form.year_of_passing} onChange={update('year_of_passing')} options={['', ...YEAR_OPTIONS]} />
          </div>

          {/* Education Pathway — multi-row repeater, mirrors the admin
              Application View. Naji 2026-05-08 — required to match
              "Application form information should be as per our Full Application." */}
          <h2 className="pt-4 text-sm font-semibold text-slate-700">Education Pathway</h2>
          <p className="text-xs text-slate-500">Add one row per qualification (school, diploma, bachelor's, etc.).</p>
          <EducationPathwayEditor rows={educationPathway} onChange={setEducationPathway} />

          {/* Employment — Naji UAT 2026-05-31 — only Employment Status,
              Current Occupation (designation), Experience, and Teaching
              Experience. Organisation removed from the UI (still sent as ''
              by toBackendForm so the backend column is untouched). */}
          <h2 className="pt-4 text-sm font-semibold text-slate-700">Employment</h2>
          <div className="grid grid-cols-2 gap-4">
            <FieldSelect label="Employment Status *" value={form.employment_status} onChange={update('employment_status')} options={['', 'Employed', 'Self-employed', 'Unemployed', 'Student', 'Other']} />
            <FieldText label="Current Occupation" value={form.designation} onChange={update('designation')} titleCase />
            <FieldText label="Experience" value={form.experience_years} onChange={update('experience_years')} />
            <FieldText label="Teaching Experience" value={form.teaching_experience} onChange={update('teaching_experience')} titleCase />
          </div>

          {/* Documents — Naji UAT 2026-05-31 — driven by the course's
              required-documents config when the loader returns it; otherwise
              the generic multi-file uploader. */}
          <h2 className="pt-4 text-sm font-semibold text-slate-700">Documents</h2>
          {requiredDocs.length > 0 ? (
            <>
              {/* Naji UAT 2026-05-31 — one upload box per document the course
                  requires (course_required_documents). Mandatory slots are
                  enforced on submit. */}
              <p className="text-xs text-slate-500">
                Upload each document required for your course. PDF / JPG / PNG; up to 10 MB each.
              </p>
              <PerDocumentUploads token={token} requiredDocs={requiredDocs} documents={documents} setDocuments={setDocuments} />
            </>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                Upload supporting documents (ID proof, qualification certificates, photo). PDF / JPG / PNG; up to 10 MB each.
              </p>
              <DocumentUploads token={token} documents={documents} setDocuments={setDocuments} />
            </>
          )}

          {/* Naji UAT 2026-05-17 — Declarations as checkboxes BEFORE
              the signature so the student explicitly acknowledges each
              point. Submit is blocked until all five are ticked. */}
          <h2 className="pt-4 text-sm font-semibold text-slate-700">Declarations</h2>
          <p className="text-xs text-slate-500">
            Please read and tick each point to confirm. All boxes must be ticked before you can submit.
          </p>
          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50/40 p-3">
            {DECLARATION_LINES.map((line, idx) => (
              <label key={idx} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-white">
                <input
                  type="checkbox"
                  checked={declarations[idx]}
                  onChange={(e) =>
                    setDeclarations((prev) => prev.map((v, i) => (i === idx ? e.target.checked : v)))
                  }
                  className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-slate-300 accent-student-primary"
                />
                <span className="text-xs leading-relaxed text-slate-700">{line}</span>
              </label>
            ))}
          </div>

          <h2 className="pt-4 text-sm font-semibold text-slate-700">Signature</h2>
          <p className="text-xs text-slate-500">
            Sign in the box below to confirm that all the information provided is true and complete.
          </p>
          <SignaturePad value={signature} onChange={setSignature} />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { void handleSaveDraft(); }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              onClick={() => { void handleSubmit(); }}
              disabled={submitting || declarations.some((v) => !v)}
              className="bg-student-primary hover:bg-student-primary/90"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

// Naji 2026-05-08 — multi-row Education Pathway editor for the public form.
// Mirrors the admin View page's table; saved as `education_pathway` array on
// the form payload. Backend persists rows into application_education_pathway.
function EducationPathwayEditor({
  rows,
  onChange,
}: {
  rows: EducationPathwayRow[];
  onChange: (rows: EducationPathwayRow[]) => void;
}) {
  const addRow = () =>
    onChange([
      ...rows,
      { qualification: '', specialization: '', institution: '', board: '', year_passed: '', marks: '' },
    ]);
  const updateRow = (idx: number, patch: Partial<EducationPathwayRow>) =>
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="text-xs italic text-slate-400">No entries yet — add your first qualification below.</p>
      ) : null}
      {rows.map((r, idx) => (
        <div key={idx} className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <FieldText label="Qualification" value={r.qualification} onChange={(e) => updateRow(idx, { qualification: e.target.value })} titleCase />
            <FieldText label="Specialization" value={r.specialization} onChange={(e) => updateRow(idx, { specialization: e.target.value })} titleCase />
            <FieldText label="Institution" value={r.institution} onChange={(e) => updateRow(idx, { institution: e.target.value })} titleCase />
            <FieldText label="Board / University" value={r.board} onChange={(e) => updateRow(idx, { board: e.target.value })} titleCase />
            <FieldText label="Year Passed" value={r.year_passed} onChange={(e) => updateRow(idx, { year_passed: e.target.value })} />
            <FieldText label="Marks / Grade" value={r.marks} onChange={(e) => updateRow(idx, { marks: e.target.value })} />
          </div>
          <div className="mt-2 flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(idx)}>
              Remove row
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        + Add Qualification Row
      </Button>
    </div>
  );
}

function FieldText({ label, value, type = 'text', onChange, titleCase }: { label: string; value: string; type?: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; titleCase?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={onChange}
        onBlur={titleCase ? (e) => {
          const next = titleCaseEachWord(e.target.value);
          if (next !== e.target.value) {
            // Synthesize a change event so the existing onChange handler updates the form state.
            const synthetic = { ...e, target: { ...e.target, value: next } } as React.ChangeEvent<HTMLInputElement>;
            onChange(synthetic);
          }
        } : undefined}
      />
    </div>
  );
}

function FieldSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={value} onChange={onChange}>
        {options.map((o) => (
          <option key={o} value={o}>{o || 'Select'}</option>
        ))}
      </select>
    </div>
  );
}

function FieldTextArea({ label, value, onChange }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <textarea className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={value} onChange={onChange} />
    </div>
  );
}

// Naji UAT 2026-05-31 — read-only display field (Course, Offering, Email,
// Phone, Age). Renders as a disabled-looking box, not an editable input.
function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex h-10 w-full items-center rounded-md border border-input bg-slate-50 px-3 py-2 text-sm text-slate-600">
        {value}
      </div>
    </div>
  );
}

// Naji UAT 2026-05-31 — Date of Birth shown + accepted as dd/mm/yyyy while
// the form stores the canonical ISO yyyy-mm-dd internally.
function FieldDmyDate({ label, value, onChange }: { label: string; value: string; onChange: (iso: string) => void }) {
  const [text, setText] = useState(isoToDmy(value));
  useEffect(() => { setText(isoToDmy(value)); }, [value]);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/yyyy"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const iso = dmyToIso(e.target.value);
          if (iso) onChange(iso);
        }}
      />
    </div>
  );
}

// Naji UAT 2026-05-31 — State input. Dropdown of Indian states when Country
// is India; free-text otherwise.
function StateField({ country, value, onChange }: { country: string; value: string; onChange: (state: string) => void }) {
  if (country === 'India') {
    return (
      <FieldSelect
        label="State *"
        value={value}
        options={['', ...INDIAN_STATES]}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return <FieldText label="State *" value={value} onChange={(e) => onChange(e.target.value)} titleCase />;
}

// Naji UAT 2026-05-31 — District input. Dropdown sourced from the selected
// Indian state when available; free-text fallback otherwise (non-India, or
// a state with no district list).
function DistrictField({ country, state, value, onChange }: { country: string; state: string; value: string; onChange: (district: string) => void }) {
  const districts = country === 'India' ? getDistrictsForState(state) : null;
  if (districts && districts.length > 0) {
    return (
      <FieldSelect
        label="District *"
        value={value}
        options={['', ...districts]}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return <FieldText label="District *" value={value} onChange={(e) => onChange(e.target.value)} titleCase />;
}

interface UploadedDoc {
  name: string;
  url: string;
  key: string;
  size: number;
  contentType: string;
  // Naji UAT 2026-05-31 — when the course defines required documents, each
  // upload is tagged with its slot so the admin can see which doc is which
  // and the form can enforce mandatory slots.
  document_type_id?: number;
  label?: string;
}

/**
 * SignaturePad — finger / mouse draw, captured as a PNG data URL.
 * Stored as `signature_data` on the application.
 */
function SignaturePad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Re-render the saved data URL when value changes from outside (e.g. clear).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (!value) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [value]);

  // Initialize canvas with a white background so the captured PNG isn't transparent.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1f2937';
  }, []);

  const point = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }, []);

  const handleStart = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = point(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const next = point(e);
    const last = lastPointRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(next.x, next.y);
      ctx.stroke();
    }
    lastPointRef.current = next;
  };

  const handleEnd = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="rounded-md border border-slate-200 bg-white">
        <canvas
          ref={canvasRef}
          width={560}
          height={160}
          className="block w-full touch-none"
          onPointerDown={handleStart}
          onPointerMove={handleMove}
          onPointerUp={handleEnd}
          onPointerLeave={handleEnd}
          onPointerCancel={handleEnd}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{value ? 'Signature captured.' : 'Sign anywhere in the box above.'}</p>
        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}

/**
 * DocumentUploads — multi-file upload via the public token-scoped
 * upload endpoint. Files go straight to the storage provider (DO Spaces
 * in prod) and come back as { key, url } pairs which submit() persists
 * onto the application.
 */
function DocumentUploads({
  token,
  documents,
  setDocuments,
}: {
  token: string;
  documents: UploadedDoc[];
  setDocuments: (next: UploadedDoc[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handlePick = () => inputRef.current?.click();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const next = [...documents];
    try {
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 10 MB.`);
          continue;
        }
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${API_BASE}/apply/${encodeURIComponent(token)}/upload`, {
          method: 'POST',
          body: fd,
        });
        const json = (await res.json()) as { status: number; message?: string; data?: Record<string, unknown> };
        if (json.status !== 1) {
          toast.error(json.message ?? `Failed to upload ${file.name}.`);
          continue;
        }
        const data = json.data ?? {};
        next.push({
          name: file.name,
          url: typeof data.url === 'string' ? data.url : '',
          key: typeof data.key === 'string' ? data.key : '',
          size: file.size,
          contentType: file.type,
        });
      }
      setDocuments(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = (idx: number) => {
    const next = documents.filter((_, i) => i !== idx);
    setDocuments(next);
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,image/png,image/jpeg,image/jpg"
        className="hidden"
        onChange={(e) => { void handleFiles(e.target.files); }}
      />
      <Button type="button" variant="outline" onClick={handlePick} disabled={uploading}>
        {uploading ? 'Uploading...' : 'Choose Files'}
      </Button>
      {documents.length > 0 ? (
        <ul className="space-y-1.5 text-sm">
          {documents.map((doc, idx) => (
            <li key={`${doc.key}-${idx}`} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-slate-700">{doc.name}</p>
                <p className="text-xs text-slate-500">{(doc.size / 1024).toFixed(1)} KB</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemove(idx)}>Remove</Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// Naji UAT 2026-05-31 — one upload box per document the course requires
// (course_required_documents, surfaced by the /apply loader). Each upload is
// tagged with its document_type_id so the admin sees which file is which and
// the submit step can enforce the mandatory slots. Uploading again replaces
// that slot's file. Uses the same public /apply/:token/upload endpoint.
function PerDocumentUploads({
  token,
  requiredDocs,
  documents,
  setDocuments,
}: {
  token: string;
  requiredDocs: RequiredDocument[];
  documents: UploadedDoc[];
  setDocuments: (next: UploadedDoc[]) => void;
}) {
  const [busyTypeId, setBusyTypeId] = useState<number | null>(null);

  const uploadFor = async (doc: RequiredDocument, file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} is larger than 10 MB.`); return; }
    setBusyTypeId(doc.document_type_id);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/apply/${encodeURIComponent(token)}/upload`, { method: 'POST', body: fd });
      const json = (await res.json()) as { status: number; message?: string; data?: Record<string, unknown> };
      if (json.status !== 1) { toast.error(json.message ?? `Failed to upload ${file.name}.`); return; }
      const data = json.data ?? {};
      const uploaded: UploadedDoc = {
        name: file.name,
        url: typeof data.url === 'string' ? data.url : '',
        key: typeof data.key === 'string' ? data.key : '',
        size: file.size,
        contentType: file.type,
        document_type_id: doc.document_type_id,
        label: doc.label,
      };
      // Replace any existing upload for this slot; keep the others.
      const next = documents.filter((x) => x.document_type_id !== doc.document_type_id);
      next.push(uploaded);
      setDocuments(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusyTypeId(null);
    }
  };

  const removeFor = (typeId: number) => setDocuments(documents.filter((x) => x.document_type_id !== typeId));

  return (
    <div className="space-y-2">
      {requiredDocs.map((d) => {
        const uploaded = documents.find((x) => x.document_type_id === d.document_type_id);
        const busy = busyTypeId === d.document_type_id;
        return (
          <div key={d.document_type_id || d.label} className="rounded-md border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700">
                  {d.label}{d.is_mandatory ? ' *' : <span className="font-normal text-slate-400"> (optional)</span>}
                </p>
                {uploaded ? (
                  <p className="truncate text-xs text-emerald-600">Uploaded: {uploaded.name}</p>
                ) : (
                  <p className="text-xs text-slate-400">PDF / JPG / PNG, up to 10 MB</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {uploaded ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFor(d.document_type_id)}>Remove</Button>
                ) : null}
                <label className={`inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-slate-50 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                  {busy ? 'Uploading…' : uploaded ? 'Replace' : 'Upload'}
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => { const f = e.target.files?.[0] ?? null; e.target.value = ''; void uploadFor(d, f); }}
                  />
                </label>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Naji 2026-05-09 — single-image profile photo uploader. Uses the
// same /apply/:token/upload endpoint as documents. Public so no auth.
function PhotoUploader({
  token,
  value,
  onChange,
}: {
  token: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/apply/${encodeURIComponent(token)}/upload`, { method: 'POST', body: fd });
      const json = (await res.json()) as { status: number; message?: string; data?: Record<string, unknown> };
      if (json.status !== 1) {
        toast.error(json.message ?? 'Photo upload failed.');
        return;
      }
      const url = typeof json.data?.url === 'string' ? json.data.url : '';
      if (url) onChange(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-4">
      {value ? (
        <img src={value} alt="Profile" className="size-24 rounded-xl border border-slate-200 object-cover" />
      ) : (
        <div className="flex size-24 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">No photo</div>
      )}
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : value ? 'Change Photo' : 'Upload Photo'}
        </Button>
        <p className="text-xs text-slate-500">JPG / PNG, max 5 MB.</p>
      </div>
    </div>
  );
}

// Naji 2026-05-09 — country code + number side-by-side, mirrors the
// admin Add Application phone input.
function PhoneFieldGroup({
  label,
  code,
  onCodeChange,
  number,
  onNumberChange,
}: {
  label: string;
  code: string;
  onCodeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  number: string;
  onNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-slate-600">{label}</span>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => {
            const ev = { ...e, target: { ...e.target, value: e.target.value.replace(/\D/g, '').slice(0, 4) } } as React.ChangeEvent<HTMLInputElement>;
            onCodeChange(ev);
          }}
          placeholder="91"
          className="w-16 rounded-md border border-slate-200 px-3 py-2 text-sm text-center"
        />
        <input
          value={number}
          onChange={onNumberChange}
          inputMode="tel"
          placeholder="9876543210"
          className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
      </div>
    </label>
  );
}
