import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Info, Save, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { COUNTRIES } from '@/lib/locations';
import { verifyEmailWithFeedback } from '@/lib/email-verify-helper';
import { titleCaseOnBlur } from '@/lib/text-format';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { PhoneInput } from '../../shared/components/PhoneInput.js';
import { PhotoUpload } from '../../shared/components/PhotoUpload.js';
import { serverResult } from '../students/student-view/student-view-model.js';
import type { StaffRow } from './staff-model.js';

// Add / Edit dialog for a counsellor or an associate, restyled after Naji's
// AddCounsellorDialog. Fields, validation and the request payload are exactly
// the old pages' (all fields required on add; on edit only the name; email
// format checked + verified on blur; temp password emailed on add). The one
// change: Date of Joining uses the dd/mm/yyyy input instead of a native date.

export type StaffKind = 'counsellor' | 'associate';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SELECT_CLASS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';

interface FormState {
  name: string; gender: string; dob: string; nationality: string; languages: string; email: string;
  countryCode: string; phone: string; qualification: string; doj: string; image: string; status: string;
}

const EMPTY: FormState = {
  name: '', gender: '', dob: '', nationality: 'India', languages: '', email: '',
  countryCode: '91', phone: '', qualification: '', doj: '', image: '', status: '1',
};

/** Prefill from a directory row exactly as the old Edit did. */
function fromRow(row: StaffRow): FormState {
  const r = row.raw;
  // Split stored "+91 9876543210" into ("91", "9876543210") for the input.
  const m = /^\+?(\d{1,4})\s+(.+)$/.exec(row.phone);
  return {
    name: row.name,
    gender: row.gender,
    dob: row.dob,
    nationality: typeof r.nationality === 'string' && r.nationality ? r.nationality : 'India',
    languages: row.languages,
    email: row.email,
    countryCode: m ? m[1] ?? '91' : '91',
    phone: m ? m[2] ?? '' : row.phone,
    qualification: row.qualification,
    doj: typeof r.doj === 'string' ? r.doj.slice(0, 10) : '',
    image: row.photo,
    status: String(Number(r.status) || 0),
  };
}

interface StaffFormDialogProps {
  kind: StaffKind;
  /** null = closed; 'add' = new; a row = edit that row. */
  target: 'add' | StaffRow | null;
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}

export function StaffFormDialog({ kind, target, api, token, onClose, onSaved }: StaffFormDialogProps) {
  const isAdd = target === 'add';
  const editRow = target && target !== 'add' ? target : null;
  // Associates' email is fixed after creation (the edit endpoint ignores it).
  const emailLocked = kind === 'associate' && !isAdd;
  const noun = kind === 'counsellor' ? 'counsellor' : 'associate';
  const Noun = kind === 'counsellor' ? 'Counsellor' : 'Associate';
  const [f, setF] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target === 'add') setF(EMPTY);
    else if (target) setF(fromRow(target));
  }, [target]);

  const set = <K extends keyof FormState>(k: K) => (v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (isAdd) {
      const missing = !f.name.trim() || !f.gender || !f.dob || !f.nationality.trim() || !f.languages.trim()
        || !f.email.trim() || !f.phone.trim() || !f.qualification.trim() || !f.doj;
      if (missing) { toast.error('All fields are required.'); return; }
    } else if (!f.name.trim()) {
      toast.error('Full name is required.');
      return;
    }
    if (f.email.trim() && !EMAIL_REGEX.test(f.email.trim())) {
      toast.error('Email is not a valid format.');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: f.name.trim(),
        gender: f.gender,
        dob: f.dob,
        nationality: f.nationality.trim(),
        languages_spoken: f.languages.trim(),
        email: f.email.trim(),
        phone: f.phone.trim() ? `+${f.countryCode} ${f.phone.trim()}` : undefined,
        country_code: f.countryCode,
        highest_qualification: f.qualification.trim(),
        doj: f.doj,
        image: f.image.trim() || undefined,
        status: Number(f.status),
      };
      let res: Record<string, unknown>;
      if (isAdd) {
        res = kind === 'counsellor' ? await api.addCounsellor(token, payload) : await api.addAssociate(token, payload);
      } else if (editRow) {
        res = kind === 'counsellor'
          ? await api.editCounsellor(token, editRow.id, payload)
          : await api.editAssociate(token, editRow.id, payload);
      } else {
        return;
      }
      const { ok, message } = serverResult(res, isAdd ? `${Noun} added.` : `${Noun} updated.`);
      if (ok) toast.success(message); else toast.error(message);
      onClose();
      onSaved();
    } catch (err) {
      toast.error(`Failed to ${isAdd ? 'add' : 'update'} ${noun}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const initials = f.name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const id = (field: string) => `${kind}-${field}`;

  return (
    <Dialog open={target !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        style={{ width: 'min(720px, calc(100vw - 2rem))', maxWidth: 'min(720px, calc(100vw - 2rem))' }}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
      >
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <DialogTitle className="text-xl font-semibold">{isAdd ? `Add ${Noun}` : `Edit ${Noun}`}</DialogTitle>
            <DialogDescription>
              {isAdd ? `Create a new ${noun} profile. All fields are required.` : `Update details for ${editRow?.name || `this ${noun}`}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <div className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-muted/30 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Profile Photo</p>
                <p className="mb-2 text-xs text-muted-foreground">PNG or JPG. You can crop after choosing.</p>
                <PhotoUpload
                  value={f.image}
                  onChange={set('image')}
                  onUpload={async (file) => (await api.uploadFile(token, file)).url}
                  fallbackInitials={initials}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full Name" htmlFor={id('name')} required className="sm:col-span-2">
                <Input id={id('name')} value={f.name} onChange={(e) => set('name')(e.target.value)} onBlur={titleCaseOnBlur(set('name'))} placeholder="Full Name" required />
              </Field>
              <Field label="Email Address" htmlFor={id('email')} required>
                <Input
                  id={id('email')}
                  type="email"
                  value={f.email}
                  onChange={(e) => set('email')(e.target.value)}
                  placeholder="email@example.com"
                  disabled={emailLocked}
                  required
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (!v || emailLocked) return;
                    if (!EMAIL_REGEX.test(v)) { toast.error('Email is not a valid format.'); return; }
                    void verifyEmailWithFeedback(api, token, v, set('email'));
                  }}
                />
              </Field>
              <Field label="Phone Number" htmlFor={id('phone')} required>
                <PhoneInput
                  id={id('phone')}
                  countryCode={f.countryCode}
                  number={f.phone}
                  onChange={({ countryCode, number }) => setF((s) => ({ ...s, countryCode, phone: number }))}
                />
              </Field>
              <Field label="Gender" htmlFor={id('gender')} required>
                <select id={id('gender')} className={SELECT_CLASS} value={f.gender} onChange={(e) => set('gender')(e.target.value)}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Date of Birth" htmlFor={id('dob')} required>
                <DmyDateInput id={id('dob')} value={f.dob} onChange={set('dob')} />
              </Field>
              <Field label="Date of Joining" htmlFor={id('doj')} required>
                <DmyDateInput id={id('doj')} value={f.doj} onChange={set('doj')} maxYear={new Date().getFullYear() + 1} />
              </Field>
              <Field label="Nationality" htmlFor={id('nat')} required>
                <select id={id('nat')} className={SELECT_CLASS} value={f.nationality} onChange={(e) => set('nationality')(e.target.value)}>
                  <option value="">Select Nationality</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Languages Spoken" htmlFor={id('lang')} required>
                <Input id={id('lang')} value={f.languages} onChange={(e) => set('languages')(e.target.value)} placeholder="e.g. English, Hindi" />
              </Field>
              <Field label="Highest Qualification" htmlFor={id('qual')} required>
                <Input id={id('qual')} value={f.qualification} onChange={(e) => set('qualification')(e.target.value)} placeholder="e.g. Masters" />
              </Field>
              <Field label="Status" htmlFor={id('status')} required>
                <select id={id('status')} className={SELECT_CLASS} value={f.status} onChange={(e) => set('status')(e.target.value)}>
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </Field>
            </div>

            {isAdd ? (
              <p className="flex gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
                <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  A secure temporary password will be auto-generated and emailed to{' '}
                  <span className="font-semibold">{f.email || `this ${noun}`}</span> on save. They&rsquo;ll be prompted to change it on first sign-in.
                </span>
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="gap-1.5" disabled={saving || !f.name.trim() || (isAdd && !f.email.trim())}>
              {isAdd ? <UserPlus aria-hidden="true" className="size-4" /> : <Save aria-hidden="true" className="size-4" />}
              {saving ? 'Saving...' : isAdd ? `Create ${Noun}` : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, htmlFor, required, className, children }: {
  label: string; htmlFor: string; required?: boolean; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ''}`}>
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-foreground">
        {label}{required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}
