import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronDown, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageLoader } from '@/components/ui/page-loader';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { PhotoCropper } from './PhotoCropper';
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

const GENDER_OPTIONS: readonly string[] = ['Male', 'Female', 'Other'];
const MARITAL_OPTIONS: readonly string[] = ['Single', 'Married', 'Divorced', 'Widowed'];
const EMPLOYMENT_OPTIONS: readonly string[] = ['Employed', 'Self-employed', 'Unemployed', 'Student', 'Other'];

function asString(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v;
}
function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
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

/* ---------- Presentation primitives (ported from Naji's Lovable design) ----------
   The whole page is wrapped in `.counsellor-theme` (see the returned root
   div) which re-points the shadcn tokens (--primary → orange #F47C2C,
   --secondary-foreground → navy #0B2758, --secondary → #EEF4FF, --ring →
   orange, …) to the exact palette of the delivered design — identical to the
   already-shipped counsellor/Lovable design system. Shadows use the global
   --cn-shadow-* tokens so they resolve regardless of scope; the header navy is
   the literal #0B2758 (the design's --sidebar-bg). */
const labelCls = 'block text-sm font-semibold text-foreground mb-1.5';
const req = <span className="text-destructive"> *</span>;
const inputCls =
  'w-full rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring transition';
const readonlyCls =
  'w-full rounded-lg border border-input bg-secondary/60 px-3 py-2 text-sm text-foreground';
const sectionTitle = 'text-base font-semibold text-secondary-foreground mb-4';
const cardCls = 'bg-card rounded-2xl shadow-[var(--cn-shadow-card)] border border-border p-6 md:p-8';

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className={labelCls}>{label}{required && req}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* Custom Select (matches the design screenshot). Not a Radix Select, so it
   renders inline inside the themed subtree and cannot self-wipe on option
   churn — onChange only ever fires with a real option string. */
function Select({
  options,
  value,
  onChange,
  placeholder = 'Select',
  disabled,
}: {
  options: readonly string[];
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(value ?? '');
  const current = value !== undefined ? value : internal;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (opt: string) => {
    setInternal(opt);
    onChange?.(opt);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className={
          'w-full flex items-center justify-between gap-2 rounded-lg border border-input bg-secondary/40 px-3 py-2 text-sm text-left transition focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring disabled:opacity-60 disabled:cursor-not-allowed ' +
          (current ? 'text-foreground' : 'text-muted-foreground')
        }
      >
        <span className="truncate">{current || placeholder}</span>
        <ChevronDown className={'h-4 w-4 shrink-0 text-muted-foreground transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-border bg-card shadow-[var(--cn-shadow-card)] py-1 max-h-64 overflow-auto">
          {options.map((opt) => {
            const selected = opt === current;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => pick(opt)}
                className={
                  'w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left transition ' +
                  (selected
                    ? 'text-primary font-semibold bg-primary-soft/60 hover:bg-primary hover:text-primary-foreground'
                    : 'text-foreground hover:bg-primary hover:text-primary-foreground')
                }
              >
                <span className="truncate">{opt}</span>
                {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// data: URL → File so a cropped photo/document (a JPEG data URL from the
// PhotoCropper) can be handed to the SAME token-scoped multipart upload the
// non-cropped path uses. Keeps storage-backed uploads (DO Spaces) intact — we
// never persist a raw base64 string onto the application.
async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
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
 * Public Application Form — Naji 2026-05-05, Phase D.
 *
 * Lives on `learn.teachersindia.in/apply/<token>`. No login. The
 * counsellor-generated token is single-use; the page hydrates the
 * form with whatever data we have on the application + any saved
 * draft. Save-as-draft and Submit.
 *
 * Naji 2026-07-10 — reskinned to the delivered Lovable design (navy logo
 * header + orange/navy card sections, custom selects, dd/mm/yyyy DOB with
 * auto-Age, WhatsApp "Same as" toggles, "Same as Permanent Address" toggle,
 * Education Pathway repeater, PhotoCropper on the profile photo + document
 * images, and a canvas Signature gate). The data layer (state shape, load
 * effect, validation, upload endpoints, submit payload) is unchanged.
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
  const [declarations, setDeclarations] = useState<boolean[]>([false, false, false, false, false]);
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [educationPathway, setEducationPathway] = useState<EducationPathwayRow[]>([]);
  const [saving, setSaving] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  // Design-only convenience toggles (not persisted directly — they mirror
  // values into the existing FormState fields).
  const [whatsappSameAs, setWhatsappSameAs] = useState<'phone' | 'alternate' | null>(null);
  const [sameAsPermanent, setSameAsPermanent] = useState<boolean>(false);

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

  // Title-case name-like fields on blur (mirrors the previous FieldText behaviour).
  const blurTitle = (key: keyof FormState) => (e: React.FocusEvent<HTMLInputElement>) => {
    const nextValue = titleCaseEachWord(e.target.value);
    if (nextValue !== e.target.value) setForm((f) => ({ ...f, [key]: nextValue }));
  };

  // WhatsApp "Same as Phone / Alternate" toggles — mirror the chosen source
  // into the existing whatsapp fields and lock the inputs while active.
  const handleWhatsappSameAs = (source: 'phone' | 'alternate', checked: boolean) => {
    if (checked) {
      setWhatsappSameAs(source);
      setForm((f) => (source === 'phone'
        ? { ...f, whatsapp_country_code: f.country_code, whatsapp_no: f.phone }
        : { ...f, whatsapp_country_code: f.country_code, whatsapp_no: f.alternate_phone }));
    } else if (whatsappSameAs === source) {
      setWhatsappSameAs(null);
    }
  };

  const handleAlternateChange = (value: string) => {
    setForm((f) => {
      const nextForm: FormState = { ...f, alternate_phone: value };
      if (whatsappSameAs === 'alternate') nextForm.whatsapp_no = value;
      return nextForm;
    });
  };

  // "Same as Permanent Address" — mirror address → native_address and lock.
  const handlePermanentChange = (value: string) => {
    setForm((f) => {
      const nextForm: FormState = { ...f, address: value };
      if (sameAsPermanent) nextForm.native_address = value;
      return nextForm;
    });
  };

  const handleSameAsPermanent = (checked: boolean) => {
    setSameAsPermanent(checked);
    if (checked) setForm((f) => ({ ...f, native_address: f.address }));
  };

  // Country / State / District cascade — changing Country resets State +
  // District; changing State resets District (unchanged from the prior logic).
  const handleCountryChange = (value: string) => setForm((f) => ({ ...f, country: value, state: '', district: '' }));
  const handleStateChange = (value: string) => setForm((f) => ({ ...f, state: value, district: '' }));
  const handleDistrictChange = (value: string) => setForm((f) => ({ ...f, district: value }));

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
      <div className="counsellor-theme apply-form-theme min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--cn-bg-gradient)' }}>
        <div className={cn(cardCls, 'w-full max-w-md text-center')}>
          <h1 className="text-lg font-semibold text-destructive">Cannot open application</h1>
          <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (phase === 'submitted') {
    return (
      <div className="counsellor-theme apply-form-theme min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--cn-bg-gradient)' }}>
        <div className={cn(cardCls, 'w-full max-w-lg text-center')}>
          <div className="mx-auto h-12 w-12 rounded-full bg-success-soft flex items-center justify-center">
            <Check className="h-6 w-6 text-success" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-secondary-foreground">Application Submitted Successfully!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Thank you{appName ? <>, <span className="font-semibold text-foreground">{appName}</span></> : ''}. Your application has been received. Your counsellor will review it and confirm your enrolment by email.
          </p>
          {(courseTitle || offeringTitle) && (
            <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4 text-left">
              <p className="text-xs font-semibold tracking-wider text-info uppercase mb-3">Course Details</p>
              <div className="grid gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Course</p>
                  <p className="text-sm font-semibold text-foreground">{courseTitle || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Offering</p>
                  <p className="text-sm font-semibold text-foreground">{offeringTitle || '—'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const districtList = form.country === 'India' ? getDistrictsForState(form.state) : null;

  return (
    <div className="counsellor-theme apply-form-theme min-h-screen" style={{ background: 'var(--cn-bg-gradient)' }}>
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-8 md:pt-10">
        <header
          style={{ background: '#0B2758' }}
          className="rounded-2xl py-6 md:py-8 flex items-center justify-center shadow-[var(--cn-shadow-card)]"
        >
          <img src="/logos/ttii-full-white.svg" alt="Teachers' Training Institute of India" className="h-10 md:h-12 w-auto" />
        </header>
      </div>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
        {/* Header card */}
        <div className={cardCls}>
          <h1 className="text-xl md:text-2xl font-bold text-secondary-foreground text-center">Application Form</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            {appName ? `Hi ${appName}, please review and complete the details below.` : 'Please review and complete the details below.'}
          </p>

          {(courseTitle || offeringTitle) && (
            <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4 md:p-5">
              <p className="text-xs font-semibold tracking-wider text-info uppercase mb-3">You are applying for</p>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Course">
                  <div className={readonlyCls + ' whitespace-normal break-words leading-snug min-h-[2.5rem] flex items-center'}>{courseTitle || '—'}</div>
                </Field>
                <Field label="Offering">
                  <div className={readonlyCls + ' whitespace-normal break-words leading-snug min-h-[2.5rem] flex items-center'}>{offeringTitle || '—'}</div>
                </Field>
              </div>
            </div>
          )}
        </div>

        {/* Personal */}
        <div className={cardCls}>
          <h2 className={sectionTitle}>Personal</h2>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
            <div className="md:col-span-2">
              <PhotoUploader token={token} value={form.photo_url} onChange={(url) => setForm((p) => ({ ...p, photo_url: url }))} />
            </div>

            <Field label="Full Name" required>
              <input className={inputCls} value={form.full_name} onChange={update('full_name')} onBlur={blurTitle('full_name')} />
            </Field>
            <Field label="Date of Birth" required>
              <DmyDateInput value={form.date_of_birth} onChange={(iso) => setForm((p) => ({ ...p, date_of_birth: iso }))} className={inputCls} />
            </Field>
            <Field label="Age">
              <input readOnly value={computeAge(form.date_of_birth) || '—'} className={readonlyCls} />
            </Field>
            <Field label="Gender" required>
              <Select options={GENDER_OPTIONS} value={form.gender} onChange={(v) => setForm((p) => ({ ...p, gender: v }))} />
            </Field>
            <Field label="Nationality" required>
              <Select options={COUNTRY_NAMES} value={form.nationality} onChange={(v) => setForm((p) => ({ ...p, nationality: v }))} />
            </Field>
            <Field label="Marital Status" required>
              <Select options={MARITAL_OPTIONS} value={form.marital_status} onChange={(v) => setForm((p) => ({ ...p, marital_status: v }))} />
            </Field>
            <Field label="Father's Name" required>
              <input className={inputCls} value={form.father_name} onChange={update('father_name')} onBlur={blurTitle('father_name')} />
            </Field>
            <Field label="Mother's Name" required>
              <input className={inputCls} value={form.mother_name} onChange={update('mother_name')} onBlur={blurTitle('mother_name')} />
            </Field>
            <Field label="Guardian's Name">
              <input className={inputCls} value={form.guardian_name} onChange={update('guardian_name')} onBlur={blurTitle('guardian_name')} />
            </Field>
            <Field label="Aadhaar No">
              <input className={inputCls} value={form.aadhar_no} onChange={update('aadhar_no')} />
            </Field>
            <Field label="Passport No" hint="Provide at least one of Aadhaar No or Passport No.">
              <input className={inputCls} value={form.passport_no} onChange={update('passport_no')} />
            </Field>
          </div>
        </div>

        {/* Contact */}
        <div className={cardCls}>
          <h2 className={sectionTitle}>Contact Information</h2>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Email">
              <div className={readonlyCls}>{form.email || '—'}</div>
            </Field>
            <Field label="Phone">
              <div className={readonlyCls}>{form.phone ? `+${form.country_code} ${form.phone}` : '—'}</div>
            </Field>
            <Field label="Alternate Phone">
              <input className={inputCls} inputMode="tel" value={form.alternate_phone} onChange={(e) => handleAlternateChange(e.target.value)} />
            </Field>
            <Field label="WhatsApp Number">
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <input
                    aria-label="WhatsApp country code"
                    value={form.whatsapp_country_code}
                    disabled={!!whatsappSameAs}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setForm((f) => ({ ...f, whatsapp_country_code: digits }));
                    }}
                    placeholder="91"
                    className={cn('w-20 shrink-0 text-center', inputCls, whatsappSameAs && 'bg-secondary/60 cursor-not-allowed')}
                  />
                  <input
                    aria-label="WhatsApp number"
                    value={form.whatsapp_no}
                    disabled={!!whatsappSameAs}
                    onChange={update('whatsapp_no')}
                    inputMode="tel"
                    placeholder="9876543210"
                    className={cn(inputCls, 'flex-1', whatsappSameAs && 'bg-secondary/60 cursor-not-allowed')}
                  />
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={whatsappSameAs === 'phone'} onCheckedChange={(c) => handleWhatsappSameAs('phone', Boolean(c))} />
                    <span className="text-sm text-foreground">Same as Phone Number</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={whatsappSameAs === 'alternate'} onCheckedChange={(c) => handleWhatsappSameAs('alternate', Boolean(c))} />
                    <span className="text-sm text-foreground">Same as Alternate Number</span>
                  </label>
                </div>
              </div>
            </Field>
          </div>

          <h3 className="mt-8 text-sm font-semibold text-secondary-foreground mb-4">Address</h3>
          <div className="grid gap-5">
            <div className="grid md:grid-cols-3 gap-x-6 gap-y-5">
              <Field label="Country" required>
                <Select options={COUNTRY_NAMES} value={form.country} onChange={handleCountryChange} placeholder="Select country" />
              </Field>
              <Field label="State" required>
                {form.country === 'India' ? (
                  <Select options={INDIAN_STATES} value={form.state} onChange={handleStateChange} placeholder="Select state" />
                ) : (
                  <input
                    className={inputCls}
                    value={form.state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    onBlur={(e) => { const n = titleCaseEachWord(e.target.value); if (n !== e.target.value) handleStateChange(n); }}
                  />
                )}
              </Field>
              <Field label="District" required>
                {districtList && districtList.length > 0 ? (
                  <Select options={districtList} value={form.district} onChange={handleDistrictChange} placeholder="Select district" />
                ) : (
                  <input
                    className={inputCls}
                    value={form.district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    onBlur={(e) => { const n = titleCaseEachWord(e.target.value); if (n !== e.target.value) handleDistrictChange(n); }}
                  />
                )}
              </Field>
            </div>

            <Field label="Permanent Address" required>
              <textarea rows={4} className={inputCls} value={form.address} onChange={(e) => handlePermanentChange(e.target.value)} />
            </Field>

            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={sameAsPermanent} onCheckedChange={(c) => handleSameAsPermanent(Boolean(c))} />
              <span className="text-sm text-foreground">Same as Permanent Address</span>
            </label>

            <Field label="Correspondence / Native Address" required>
              <textarea
                rows={4}
                disabled={sameAsPermanent}
                className={cn(inputCls, sameAsPermanent && 'bg-secondary/60 cursor-not-allowed')}
                value={form.native_address}
                onChange={update('native_address')}
              />
            </Field>
          </div>
        </div>

        {/* Qualification */}
        <div className={cardCls}>
          <h2 className={sectionTitle}>Qualification</h2>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Highest Qualification" required>
              <Select options={QUALIFICATION_OPTIONS} value={form.highest_qualification} onChange={(v) => setForm((p) => ({ ...p, highest_qualification: v }))} />
            </Field>
            <Field label="Specialization">
              <input className={inputCls} value={form.specialization} onChange={update('specialization')} onBlur={blurTitle('specialization')} />
            </Field>
            <Field label="School / College" required>
              <input className={inputCls} value={form.previous_school} onChange={update('previous_school')} onBlur={blurTitle('previous_school')} />
            </Field>
            <Field label="Year of Passing" required>
              <Select options={YEAR_OPTIONS} value={form.year_of_passing} onChange={(v) => setForm((p) => ({ ...p, year_of_passing: v }))} placeholder="Select year" />
            </Field>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-secondary-foreground mb-1">Education Pathway</h3>
            <p className="text-sm text-muted-foreground">Add one row per qualification (school, diploma, bachelor's, etc.).</p>
            <EducationPathwayEditor rows={educationPathway} onChange={setEducationPathway} />
          </div>
        </div>

        {/* Employment */}
        <div className={cardCls}>
          <h2 className={sectionTitle}>Employment</h2>
          <div className="grid md:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Employment Status" required>
              <Select options={EMPLOYMENT_OPTIONS} value={form.employment_status} onChange={(v) => setForm((p) => ({ ...p, employment_status: v }))} />
            </Field>
            <Field label="Current Occupation">
              <input className={inputCls} value={form.designation} onChange={update('designation')} onBlur={blurTitle('designation')} />
            </Field>
            <Field label="Experience">
              <input className={inputCls} value={form.experience_years} onChange={update('experience_years')} />
            </Field>
            <Field label="Teaching Experience">
              <input className={inputCls} value={form.teaching_experience} onChange={update('teaching_experience')} onBlur={blurTitle('teaching_experience')} />
            </Field>
          </div>
        </div>

        {/* Documents */}
        <div className={cardCls}>
          <h2 className={sectionTitle}>Documents</h2>
          <p className="text-sm text-muted-foreground mb-5">
            {requiredDocs.length > 0
              ? 'Upload each document required for your course. PDF / JPG / PNG; up to 10 MB each.'
              : 'Upload supporting documents (ID proof, qualification certificates, photo). PDF / JPG / PNG; up to 10 MB each.'}
          </p>
          {requiredDocs.length > 0 ? (
            <PerDocumentUploads token={token} requiredDocs={requiredDocs} documents={documents} setDocuments={setDocuments} studentName={form.full_name} />
          ) : (
            <DocumentUploads token={token} documents={documents} setDocuments={setDocuments} />
          )}
        </div>

        {/* Declarations */}
        <div className={cardCls}>
          <h2 className={sectionTitle}>Declarations</h2>
          <p className="text-sm text-muted-foreground mb-5">Please read and tick each point to confirm. All boxes must be ticked before you can submit.</p>
          <div className="rounded-xl border border-border bg-secondary/30 p-5 space-y-4">
            {DECLARATION_LINES.map((line, idx) => (
              <label key={idx} className="flex gap-3 items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={declarations[idx] ?? false}
                  onChange={(e) => setDeclarations((prev) => prev.map((v, i) => (i === idx ? e.target.checked : v)))}
                  className="mt-1 h-4 w-4 rounded border-input accent-[var(--primary)]"
                />
                <span className="text-sm text-info leading-relaxed">{line}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Signature + actions */}
        <div className={cardCls}>
          <h2 className={sectionTitle}>Signature</h2>
          <p className="text-sm text-muted-foreground mb-4">Sign in the box below to confirm that all the information provided is true and complete.</p>
          <SignaturePad value={signature} onChange={setSignature} />

          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => { void handleSaveDraft(); }}
              disabled={saving}
              className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition shadow-[var(--cn-shadow-soft)] disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              type="button"
              disabled={submitting || declarations.some((v) => !v) || !signature.trim()}
              onClick={() => { void handleSubmit(); }}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-[var(--cn-shadow-soft)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </div>
      </main>
    </div>
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
    <div>
      {rows.length === 0 && <p className="mt-2 text-sm italic text-info">No entries yet — add your first qualification below.</p>}

      <div className="mt-3 space-y-4">
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl border border-border bg-secondary/30 p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-secondary-foreground">Qualification {i + 1}</p>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-xs font-semibold text-destructive hover:text-destructive/80 transition"
              >
                Remove
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
              <Field label="Qualification">
                <input
                  className={inputCls}
                  value={r.qualification}
                  onChange={(e) => updateRow(i, { qualification: e.target.value })}
                  onBlur={(e) => { const n = titleCaseEachWord(e.target.value); if (n !== e.target.value) updateRow(i, { qualification: n }); }}
                />
              </Field>
              <Field label="Specialization">
                <input className={inputCls} value={r.specialization} onChange={(e) => updateRow(i, { specialization: e.target.value })} />
              </Field>
              <Field label="Institution">
                <input
                  className={inputCls}
                  value={r.institution}
                  onChange={(e) => updateRow(i, { institution: e.target.value })}
                  onBlur={(e) => { const n = titleCaseEachWord(e.target.value); if (n !== e.target.value) updateRow(i, { institution: n }); }}
                />
              </Field>
              <Field label="Board / University">
                <input className={inputCls} value={r.board} onChange={(e) => updateRow(i, { board: e.target.value })} />
              </Field>
              <Field label="Year Passed">
                <Select options={YEAR_OPTIONS} value={r.year_passed} onChange={(v) => updateRow(i, { year_passed: v })} placeholder="Select year" />
              </Field>
              <Field label="Marks / Grade">
                <input className={inputCls} value={r.marks} onChange={(e) => updateRow(i, { marks: e.target.value })} />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="mt-4 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition shadow-[var(--cn-shadow-soft)]"
      >
        + Add Qualification
      </button>
    </div>
  );
}

/**
 * SignaturePad — finger / mouse draw, captured as a PNG data URL.
 * Stored as `signature_data` on the application. Canvas logic unchanged from
 * the prior implementation; only the wrapper chrome was restyled to the design.
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
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <canvas
          ref={canvasRef}
          width={600}
          height={192}
          className="block w-full h-48 touch-none cursor-crosshair"
          onPointerDown={handleStart}
          onPointerMove={handleMove}
          onPointerUp={handleEnd}
          onPointerLeave={handleEnd}
          onPointerCancel={handleEnd}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{value ? 'Signature captured.' : 'Sign anywhere in the box above.'}</p>
        <button
          type="button"
          onClick={handleClear}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition shadow-[var(--cn-shadow-soft)]"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

/**
 * DocumentUploads — generic multi-file uploader (fallback when the course
 * does not define required documents). Files go straight to the storage
 * provider via the public token-scoped upload endpoint. Logic unchanged;
 * only restyled to the design.
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
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,image/png,image/jpeg,image/jpg"
        className="hidden"
        onChange={(e) => { void handleFiles(e.target.files); }}
      />
      <button
        type="button"
        onClick={handlePick}
        disabled={uploading}
        className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition shadow-[var(--cn-shadow-soft)] disabled:opacity-60"
      >
        {uploading ? 'Uploading…' : 'Choose Files'}
      </button>
      {documents.length > 0 && (
        <div className="space-y-3">
          {documents.map((doc, idx) => (
            <div key={`${doc.key}-${idx}`} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/30 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-secondary-foreground">{doc.name}</p>
                <p className="text-xs text-muted-foreground">{(doc.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="text-xs font-semibold text-destructive hover:text-destructive/80 transition"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Naji UAT 2026-05-31 — one upload row per document the course requires
// (course_required_documents, surfaced by the /apply loader). Each upload is
// tagged with its document_type_id so the admin sees which file is which and
// the submit step can enforce the mandatory slots. Uploading again replaces
// that slot's file. Uses the same public /apply/:token/upload endpoint.
// Naji 2026-07-10 — restyled per-row (Upload/Replace/View), and image picks
// now go through the PhotoCropper before the (unchanged) upload call.
function PerDocumentUploads({
  token,
  requiredDocs,
  documents,
  setDocuments,
  studentName,
}: {
  token: string;
  requiredDocs: RequiredDocument[];
  documents: UploadedDoc[];
  setDocuments: (next: UploadedDoc[]) => void;
  studentName: string;
}) {
  const [busyTypeId, setBusyTypeId] = useState<number | null>(null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<RequiredDocument | null>(null);
  const [viewDoc, setViewDoc] = useState<UploadedDoc | null>(null);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const slug = (label: string) =>
    label.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'document';

  const doUpload = async (doc: RequiredDocument, file: File) => {
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

  const onPick = (doc: RequiredDocument, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} is larger than 10 MB.`); return; }
    if (file.type === 'image/jpeg' || file.type === 'image/png') {
      const reader = new FileReader();
      reader.onload = () => { setActiveDoc(doc); setRawImage(reader.result as string); setCropOpen(true); };
      reader.readAsDataURL(file);
    } else {
      void doUpload(doc, file);
    }
  };

  const onCropConfirm = async (dataUrl: string) => {
    setCropOpen(false);
    const doc = activeDoc;
    setRawImage(null);
    setActiveDoc(null);
    if (doc) {
      const file = await dataUrlToFile(dataUrl, `${slug(doc.label)}-${slug(studentName || 'student')}.jpg`);
      await doUpload(doc, file);
    }
  };

  return (
    <div className="space-y-3">
      {requiredDocs.map((d) => {
        const uploaded = documents.find((x) => x.document_type_id === d.document_type_id);
        const busy = busyTypeId === d.document_type_id;
        return (
          <div key={d.document_type_id || d.label} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/30 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-secondary-foreground">
                {d.label}{d.is_mandatory ? req : <span className="font-normal text-muted-foreground"> (optional)</span>}
              </p>
              {uploaded ? (
                <p className="text-xs text-primary truncate">{uploaded.name || 'Uploaded'}</p>
              ) : (
                <p className="text-xs text-muted-foreground">PDF / JPG / PNG, up to 10 MB</p>
              )}
            </div>
            <input
              ref={(el) => { inputRefs.current[d.document_type_id] = el; }}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              disabled={busy}
              onChange={(e) => onPick(d, e)}
            />
            <div className="shrink-0 flex items-center gap-2">
              {uploaded && (
                <button
                  type="button"
                  onClick={() => setViewDoc(uploaded)}
                  aria-label={`View ${d.label}`}
                  className="rounded-lg border border-border bg-card p-2 text-foreground hover:bg-muted transition shadow-[var(--cn-shadow-soft)]"
                >
                  <Eye className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRefs.current[d.document_type_id]?.click()}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition shadow-[var(--cn-shadow-soft)] disabled:opacity-60"
              >
                {busy ? 'Uploading…' : uploaded ? 'Replace' : 'Upload'}
              </button>
            </div>
          </div>
        );
      })}

      <PhotoCropper
        imageSrc={rawImage}
        open={cropOpen}
        onCancel={() => { setCropOpen(false); setRawImage(null); setActiveDoc(null); }}
        onConfirm={(c) => { void onCropConfirm(c); }}
      />

      <Dialog open={!!viewDoc} onOpenChange={(o) => !o && setViewDoc(null)}>
        <DialogContent className="counsellor-theme apply-form-theme w-[calc(100vw-2rem)] max-w-3xl max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{viewDoc?.label || 'Document'}</DialogTitle>
          </DialogHeader>
          {viewDoc && (
            viewDoc.contentType === 'application/pdf' ? (
              <iframe
                src={viewDoc.url}
                title={viewDoc.label || 'Document'}
                className="w-full h-[70vh] rounded-lg border border-border bg-secondary"
              />
            ) : (
              <img src={viewDoc.url} alt={viewDoc.label || 'Document'} className="max-w-full max-h-[70vh] mx-auto rounded-lg" />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Naji 2026-05-09 — single-image profile photo uploader. Uses the same
// /apply/:token/upload endpoint as documents. Naji 2026-07-10 — the picked
// image now goes through the PhotoCropper (zoom + rotation) and the cropped
// JPEG blob is uploaded via the SAME multipart endpoint, so form.photo_url
// still holds a storage-backed URL (never a raw base64 string).
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
  const [rawPhoto, setRawPhoto] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo must be under 5 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setRawPhoto(reader.result as string); setCropOpen(true); };
    reader.readAsDataURL(file);
  };

  const uploadCropped = async (dataUrl: string) => {
    setCropOpen(false);
    setUploading(true);
    try {
      const file = await dataUrlToFile(dataUrl, 'profile-photo.jpg');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_BASE}/apply/${encodeURIComponent(token)}/upload`, { method: 'POST', body: fd });
      const json = (await res.json()) as { status: number; message?: string; data?: Record<string, unknown> };
      if (json.status !== 1) { toast.error(json.message ?? 'Photo upload failed.'); return; }
      const url = typeof json.data?.url === 'string' ? json.data.url : '';
      if (url) onChange(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <p className={labelCls}>Profile Photo{req}</p>
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
        <div className="w-28 h-28 rounded-lg border-2 border-dashed border-border bg-secondary/40 flex items-center justify-center text-xs text-muted-foreground overflow-hidden">
          {value ? (
            <img src={value} alt="Profile" className="w-full h-full object-cover" />
          ) : uploading ? (
            'Uploading…'
          ) : (
            'No photo'
          )}
        </div>
        <div className="flex flex-col items-center md:items-start">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePick} />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition shadow-[var(--cn-shadow-soft)] disabled:opacity-60"
            >
              {value ? 'Change Photo' : 'Upload Photo'}
            </button>
            {rawPhoto && (
              <button
                type="button"
                onClick={() => setCropOpen(true)}
                disabled={uploading}
                className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition shadow-[var(--cn-shadow-soft)] disabled:opacity-60"
              >
                Crop &amp; Adjust
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">JPG / PNG, max 5 MB.</p>
        </div>
      </div>
      <PhotoCropper
        imageSrc={rawPhoto}
        open={cropOpen}
        onCancel={() => setCropOpen(false)}
        onConfirm={(c) => { void uploadCropped(c); }}
      />
    </div>
  );
}
