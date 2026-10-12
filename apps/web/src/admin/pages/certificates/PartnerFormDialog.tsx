import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Building2, Loader2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { titleCaseEachWord } from '@/lib/text-format';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { asString } from '../../shared/utils/admin-data-utils.js';
import {
  EMPTY_PARTNER_FORM,
  buildPartnerPayload,
  partnerFormFrom,
  validatePartner,
  type PartnerErrors,
  type PartnerForm,
  type PartnerRow,
} from './partner-model.js';

// New / Edit Certification Partner in Naji's layout (logo beside the four
// identity fields, then description, status and display order). Same fields,
// logo upload and body as the old dialog. Naji's per-course "contract terms"
// fee grid is not here: it needs new columns.

const WIDTH = 'min(720px, calc(100vw - 2rem))';
const SELECT_CLASS = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

export function PartnerFormDialog({
  open, editing, partners, api, token, onClose, onSaved,
}: {
  open: boolean;
  editing: PartnerRow | null;
  partners: PartnerRow[];
  api: AdminPortalApi;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PartnerForm>(EMPTY_PARTNER_FORM);
  const [errors, setErrors] = useState<PartnerErrors>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? partnerFormFrom(editing) : EMPTY_PARTNER_FORM);
    setErrors({});
  }, [open, editing]);

  const set = <K extends keyof PartnerForm>(k: K, v: PartnerForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const titleCaseOnBlur = (k: 'name' | 'country') => (e: React.FocusEvent<HTMLInputElement>) => {
    const next = titleCaseEachWord(e.target.value);
    if (next !== e.target.value) set(k, next);
  };

  const uploadLogo = async (file: File | null | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await api.uploadFile(token, file);
      set('logo', url);
      toast.success('Logo uploaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Logo upload failed.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const codeChanged = editing !== null && form.partner_code.trim() !== editing.code.trim();

  const submit = async () => {
    const found = validatePartner(form, partners.filter((p) => p.id !== editing?.id));
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      const payload = buildPartnerPayload(form);
      const res = editing
        ? await api.updateCertificationPartner(token, editing.id, payload)
        : await api.createCertificationPartner(token, payload);
      toast.success(asString(res.message) || (editing ? 'Partner updated.' : 'Partner created.'));
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save partner');
    } finally {
      setSaving(false);
    }
  };

  const field = (k: 'partner_code' | 'name' | 'short_name' | 'country', label: string, placeholder: string, required = false) => (
    <div className="space-y-1.5">
      <Label htmlFor={`partner-${k}`}>{label}{required ? <span className="text-destructive"> *</span> : null}</Label>
      <Input
        id={`partner-${k}`}
        value={form[k]}
        placeholder={placeholder}
        aria-invalid={k === 'partner_code' || k === 'name' ? Boolean(errors[k]) : undefined}
        onChange={(e) => set(k, e.target.value)}
        onBlur={k === 'name' || k === 'country' ? titleCaseOnBlur(k) : undefined}
      />
      {(k === 'partner_code' || k === 'name') && errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent style={{ width: WIDTH, maxWidth: WIDTH }} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle>{editing ? 'Edit Certification Partner' : 'New Certification Partner'}</DialogTitle>
          <DialogDescription>Academic partner or certification authority that awards certificates.</DialogDescription>
        </DialogHeader>
        <form id="partner-form" className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <Label>Logo</Label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void uploadLogo(e.target.files?.[0])} />
              <div className="grid size-20 place-items-center overflow-hidden rounded-xl border border-border bg-primary/5 text-primary">
                {form.logo ? <img src={form.logo} alt="Partner logo" className="size-full bg-white object-contain p-1" /> : <Building2 aria-hidden="true" className="size-6" />}
              </div>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? <Loader2 aria-hidden="true" className="size-3 animate-spin" /> : <Upload aria-hidden="true" className="size-3" />}
                  {form.logo ? 'Replace' : 'Upload'}
                </Button>
                {form.logo ? (
                  <Button type="button" size="sm" variant="ghost" className="h-7 px-2" aria-label="Remove logo" onClick={() => set('logo', '')}>
                    <X aria-hidden="true" className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              {field('partner_code', 'Partner Code', 'e.g. AAP-US', true)}
              {field('name', 'Partner Name', 'e.g. American Academy of Pediatrics', true)}
              {field('short_name', 'Partner Short Name', 'e.g. AAP')}
              {field('country', 'Country', 'e.g. United States')}
            </div>
          </div>
          {codeChanged && editing && editing.combinations > 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {editing.combinations} combination{editing.combinations === 1 ? '' : 's'} use this partner. Their codes were built from the old partner code and will not change.
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="partner-desc">Description</Label>
            <textarea
              id="partner-desc"
              rows={3}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.description}
              placeholder="Short description"
              onChange={(e) => set('description', e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="partner-status">Status</Label>
              <select id="partner-status" className={SELECT_CLASS} value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="partner-position">Display Order</Label>
              <Input id="partner-position" type="number" placeholder="Auto" value={form.position} onChange={(e) => set('position', e.target.value)} />
              {errors.position ? <p className="text-xs text-destructive">{errors.position}</p> : (
                <p className="text-[11px] text-muted-foreground">Lower numbers show first. Leave blank to add at the end.</p>
              )}
            </div>
          </div>
        </form>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-6 py-3">
          <Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button type="submit" form="partner-form" disabled={saving || uploading}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
