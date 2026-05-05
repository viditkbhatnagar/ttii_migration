import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
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
    if (!signature.trim()) { toast.error('Please sign in the signature box.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/apply/${encodeURIComponent(token)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form, signature: signature.trim(), documents }),
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

          <h2 className="pt-4 text-sm font-semibold text-slate-700">Documents</h2>
          <p className="text-xs text-slate-500">
            Upload supporting documents (ID proof, qualification certificates, photo). PDF / JPG / PNG; up to 10 MB each.
          </p>
          <DocumentUploads token={token} documents={documents} setDocuments={setDocuments} />

          <h2 className="pt-4 text-sm font-semibold text-slate-700">Signature</h2>
          <p className="text-xs text-slate-500">
            Sign in the box below to confirm that all the information provided is true and complete.
          </p>
          <SignaturePad value={signature} onChange={setSignature} />

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

interface UploadedDoc {
  name: string;
  url: string;
  key: string;
  size: number;
  contentType: string;
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
