import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verifyEmailWithFeedback } from '@/lib/email-verify-helper';
// Naji UAT 2026-05-16 — title-case name-like fields on blur.
import { titleCaseEachWord } from '@/lib/text-format';
import { cn } from '@/lib/utils';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { PhoneInput } from '../../shared/components/PhoneInput.js';
import { PhotoUpload } from '../../shared/components/PhotoUpload.js';
import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';

// Add / Edit Instructor in Naji's layout (InstructorFormDialog). Same fields,
// rules and payload as the old page: every field required on create, only the
// name on edit; email locked on edit and checked (format + deliverability) on
// blur when creating. "Same as phone" only copies the phone into WhatsApp.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InstructorForm {
  name: string;
  email: string;
  phoneCountryCode: string;
  phone: string;
  whatsappCountryCode: string;
  whatsapp_phone: string;
  qualification: string;
  bio: string;
  image: string;
  status: number;
}

const emptyForm: InstructorForm = {
  name: '', email: '',
  phoneCountryCode: '91', phone: '',
  whatsappCountryCode: '91', whatsapp_phone: '',
  qualification: '', bio: '', image: '', status: 1,
};

function splitPhone(raw: string): { code: string; number: string } {
  const m = raw.match(/^\+?(\d{1,4})\s+(.+)$/);
  return m ? { code: m[1] ?? '91', number: m[2] ?? '' } : { code: '91', number: raw };
}

/** A list row (or the detail page's profile in the same shape) → form values. */
function formFromRow(row: Record<string, unknown>): InstructorForm {
  const phone = splitPhone(asString(row.phone));
  const wa = splitPhone(asString(row.whatsapp_phone));
  return {
    name: asString(row.name),
    email: asString(row.user_email),
    phoneCountryCode: phone.code,
    phone: phone.number,
    whatsappCountryCode: wa.code,
    whatsapp_phone: wa.number,
    // The list returns highest_qualification; reading `qualification` (the old
    // page did) left the box empty and saving then cleared the stored value.
    qualification: asString(row.highest_qualification) || asString(row.qualification),
    bio: asString(row.biography || row.bio || row.description),
    image: asString(row.image) || asString(row.profile_picture),
    status: asNumber(row.status),
  };
}

const initialsOf = (name: string) => name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export function InstructorFormDialog({
  open, initial, api, token, onClose, onSaved,
}: {
  open: boolean;
  /** null = Add; a list-shaped row = Edit. */
  initial: Record<string, unknown> | null;
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editingId = initial ? asString(initial._id || initial.id) : null;
  const [form, setForm] = useState<InstructorForm>(emptyForm);
  const [sameAsPhone, setSameAsPhone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initial ? formFromRow(initial) : emptyForm);
    setSameAsPhone(false);
  }, [open, initial]);

  const set = (patch: Partial<InstructorForm>) => setForm((f) => ({ ...f, ...patch }));
  const waCode = sameAsPhone ? form.phoneCountryCode : form.whatsappCountryCode;
  const waNumber = sameAsPhone ? form.phone : form.whatsapp_phone;

  const handleSubmit = async () => {
    if (!editingId) {
      const missing = !form.name.trim() || !form.email.trim() || !form.phone.trim()
        || !waNumber.trim() || !form.qualification.trim() || !form.bio.trim();
      if (missing) {
        toast.error('All fields are required.');
        return;
      }
    } else if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (form.email.trim() && !EMAIL_REGEX.test(form.email.trim())) {
      toast.error('Email is not a valid format.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() ? `+${form.phoneCountryCode} ${form.phone.trim()}` : undefined,
        country_code: form.phoneCountryCode,
        whatsapp_phone: waNumber.trim() ? `+${waCode} ${waNumber.trim()}` : undefined,
        whatsapp_country_code: waCode,
        qualification: form.qualification.trim() || undefined,
        bio: form.bio.trim() || undefined,
        image: form.image.trim() || undefined,
        status: form.status,
      };
      if (editingId) {
        await api.editInstructor(token, editingId, payload);
      } else {
        const res = await api.addInstructor(token, payload);
        const message = asString(res.message);
        if (message) toast.success(message);
      }
      onClose();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save instructor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent
        style={{ width: 'min(600px, calc(100vw - 2rem))', maxWidth: 'min(600px, calc(100vw - 2rem))' }}
        className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0"
      >
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}
        >
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>{editingId ? 'Edit Instructor' : 'Add Instructor'}</DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
            <div>
              <Label className="mb-2 block text-sm">Profile Photo</Label>
              <PhotoUpload
                value={form.image}
                onChange={(url) => set({ image: url })}
                onUpload={async (file) => (await api.uploadFile(token, file)).url}
                fallbackInitials={initialsOf(form.name)}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="inst-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="inst-name"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                onBlur={(e) => {
                  const next = titleCaseEachWord(e.target.value);
                  if (next !== e.target.value) set({ name: next });
                }}
                placeholder="Name"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid min-w-0 gap-1.5">
                <Label htmlFor="inst-phone">Phone <span className="text-destructive">*</span></Label>
                <PhoneInput
                  id="inst-phone"
                  countryCode={form.phoneCountryCode}
                  number={form.phone}
                  onChange={({ countryCode, number }) => set({ phoneCountryCode: countryCode, phone: number })}
                />
              </div>
              <div className="grid min-w-0 gap-1.5">
                <Label htmlFor="inst-whatsapp">Whatsapp <span className="text-destructive">*</span></Label>
                {sameAsPhone ? (
                  <Input id="inst-whatsapp" disabled value={form.phone ? `+${form.phoneCountryCode} ${form.phone}` : ''} placeholder="Same as phone" />
                ) : (
                  <PhoneInput
                    id="inst-whatsapp"
                    countryCode={form.whatsappCountryCode}
                    number={form.whatsapp_phone}
                    onChange={({ countryCode, number }) => set({ whatsappCountryCode: countryCode, whatsapp_phone: number })}
                  />
                )}
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Checkbox checked={sameAsPhone} onCheckedChange={(v) => setSameAsPhone(v === true)} /> Same as phone
                </label>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="inst-qual">Highest Qualification <span className="text-destructive">*</span></Label>
              <Input id="inst-qual" value={form.qualification} onChange={(e) => set({ qualification: e.target.value })} placeholder="e.g. Masters" />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="inst-email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="inst-email"
                type="email"
                value={form.email}
                disabled={!!editingId}
                onChange={(e) => set({ email: e.target.value })}
                placeholder="email@example.com"
                required
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (!v || editingId) return;
                  if (!EMAIL_REGEX.test(v)) {
                    toast.error('Email is not a valid format.');
                    return;
                  }
                  void verifyEmailWithFeedback(api, token, v, (corrected) => set({ email: corrected }));
                }}
              />
            </div>

            {!editingId && (
              <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/80">
                A secure temporary password will be auto-generated and emailed to{' '}
                <span className="font-medium text-primary">{form.email || 'this instructor'}</span> on save. They&rsquo;ll be prompted to change it on first sign-in.
              </p>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="inst-bio">Biography <span className="text-destructive">*</span></Label>
              <textarea
                id="inst-bio"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={form.bio}
                onChange={(e) => set({ bio: e.target.value })}
                placeholder="Enter biography (supports HTML)"
              />
            </div>

            <div className="grid gap-1.5">
              <Label id="inst-status-label">Status</Label>
              <div role="group" aria-labelledby="inst-status-label" className="flex gap-2">
                {[{ v: 1, label: 'Active' }, { v: 0, label: 'Inactive' }].map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    aria-pressed={form.status === s.v}
                    onClick={() => set({ status: s.v })}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      form.status === s.v ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-foreground hover:bg-muted',
                    )}
                  >
                    <span className={cn('size-1.5 rounded-full', s.v === 1 ? 'bg-emerald-500' : 'bg-slate-400')} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose} className="gap-1">
              <X aria-hidden="true" className="size-4" /> Cancel
            </Button>
            <Button type="submit" className="gap-1" disabled={saving || !form.name.trim() || !form.email.trim()}>
              {editingId ? <Pencil aria-hidden="true" className="size-4" /> : <Plus aria-hidden="true" className="size-4" />}
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Instructor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
