import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';

type ApiOk = { status: 1; data?: Record<string, unknown> };
type ApiErr = { status: number; message?: string };

const API_BASE = '/api';

function asString(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v;
}
function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

interface FormState {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  marital_status: string;
  father_name: string;
  mother_name: string;
  guardian_name: string;
  aadhar_no: string;
  passport_no: string;
  address: string;
  native_address: string;
  state: string;
  district: string;
  highest_qualification: string;
  previous_school: string;
  year_of_passing: string;
  percentage_or_grade: string;
  teaching_experience: string;
  employment_status: string;
  organization_name: string;
  experience_years: string;
  designation: string;
}

function emptyForm(): FormState {
  return {
    first_name: '', last_name: '', date_of_birth: '', gender: '', nationality: 'India',
    marital_status: '', father_name: '', mother_name: '', guardian_name: '',
    aadhar_no: '', passport_no: '', address: '', native_address: '', state: '', district: '',
    highest_qualification: '', previous_school: '', year_of_passing: '',
    percentage_or_grade: '', teaching_experience: '', employment_status: '',
    organization_name: '', experience_years: '', designation: '',
  };
}

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
  const [signature, setSignature] = useState<string>('');
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
          'first_name', 'last_name', 'date_of_birth', 'gender', 'nationality', 'marital_status',
          'father_name', 'mother_name', 'guardian_name', 'aadhar_no', 'passport_no',
          'address', 'native_address', 'state', 'district',
          'highest_qualification', 'previous_school', 'year_of_passing', 'percentage_or_grade',
          'teaching_experience', 'employment_status', 'organization_name',
          'experience_years', 'designation',
        ];
        if (asString(app.name)) {
          const parts = asString(app.name).split(/\s+/);
          next.first_name = parts[0] ?? '';
          next.last_name = parts.slice(1).join(' ');
        }
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
      const res = await fetch(`${API_BASE}/apply/${encodeURIComponent(token)}/save-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: form }),
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
    if (!form.first_name.trim()) { toast.error('First name is required.'); return; }
    if (!form.date_of_birth) { toast.error('Date of birth is required.'); return; }
    if (!signature.trim()) { toast.error('Please type your full name as signature.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/apply/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, signature: signature.trim() }),
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

          <h2 className="pt-2 text-sm font-semibold text-slate-700">Personal</h2>
          <div className="grid grid-cols-2 gap-4">
            <FieldText label="First Name *" value={form.first_name} onChange={update('first_name')} />
            <FieldText label="Last Name" value={form.last_name} onChange={update('last_name')} />
            <FieldText label="Date of Birth *" type="date" value={form.date_of_birth} onChange={update('date_of_birth')} />
            <FieldSelect label="Gender" value={form.gender} onChange={update('gender')} options={['', 'Male', 'Female', 'Other']} />
            <FieldText label="Nationality" value={form.nationality} onChange={update('nationality')} />
            <FieldSelect label="Marital Status" value={form.marital_status} onChange={update('marital_status')} options={['', 'Single', 'Married', 'Divorced', 'Widowed']} />
            <FieldText label="Father's Name" value={form.father_name} onChange={update('father_name')} />
            <FieldText label="Mother's Name" value={form.mother_name} onChange={update('mother_name')} />
            <FieldText label="Guardian's Name" value={form.guardian_name} onChange={update('guardian_name')} />
            <FieldText label="Aadhaar No" value={form.aadhar_no} onChange={update('aadhar_no')} />
            <FieldText label="Passport No" value={form.passport_no} onChange={update('passport_no')} />
          </div>

          <h2 className="pt-4 text-sm font-semibold text-slate-700">Address</h2>
          <div className="grid grid-cols-1 gap-4">
            <FieldTextArea label="Permanent Address" value={form.address} onChange={update('address')} />
            <FieldTextArea label="Correspondence / Native Address" value={form.native_address} onChange={update('native_address')} />
            <div className="grid grid-cols-2 gap-4">
              <FieldText label="State" value={form.state} onChange={update('state')} />
              <FieldText label="District" value={form.district} onChange={update('district')} />
            </div>
          </div>

          <h2 className="pt-4 text-sm font-semibold text-slate-700">Education</h2>
          <div className="grid grid-cols-2 gap-4">
            <FieldText label="Highest Qualification" value={form.highest_qualification} onChange={update('highest_qualification')} />
            <FieldText label="Previous School / Institute" value={form.previous_school} onChange={update('previous_school')} />
            <FieldText label="Year of Passing" value={form.year_of_passing} onChange={update('year_of_passing')} />
            <FieldText label="Percentage / Grade" value={form.percentage_or_grade} onChange={update('percentage_or_grade')} />
          </div>

          <h2 className="pt-4 text-sm font-semibold text-slate-700">Employment</h2>
          <div className="grid grid-cols-2 gap-4">
            <FieldSelect label="Employment Status" value={form.employment_status} onChange={update('employment_status')} options={['', 'Employed', 'Self-Employed', 'Unemployed', 'Student']} />
            <FieldText label="Organisation" value={form.organization_name} onChange={update('organization_name')} />
            <FieldText label="Designation" value={form.designation} onChange={update('designation')} />
            <FieldText label="Years of Experience" value={form.experience_years} onChange={update('experience_years')} />
            <FieldTextArea label="Teaching Experience (optional)" value={form.teaching_experience} onChange={update('teaching_experience')} />
          </div>

          <h2 className="pt-4 text-sm font-semibold text-slate-700">Confirm</h2>
          <p className="text-xs text-slate-500">
            By typing your full legal name below as your signature, you confirm that all the information provided is true and complete.
          </p>
          <FieldText label="Type your full name as signature *" value={signature} onChange={(e) => setSignature(e.target.value)} />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => { void handleSaveDraft(); }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button onClick={() => { void handleSubmit(); }} disabled={submitting} className="bg-student-primary hover:bg-student-primary/90">
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function FieldText({ label, value, type = 'text', onChange }: { label: string; value: string; type?: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={onChange} />
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
