import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { messageFromError } from '../../../shared/utils/admin-data-utils.js';
import { isPdfKey } from './settings-model.js';

const MAX_BYTES = 5 * 1024 * 1024;

/** Opens a private settings image through a short-lived signed URL. */
export async function openPrivateImage(api: AdminPortalApi, token: string, key: string): Promise<void> {
  try {
    const url = await api.credentialSettingFileUrl(token, key);
    if (!url) { toast.error('The image is not available right now.'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch (error) {
    toast.error(messageFromError(error) || 'The image is not available right now.');
  }
}

export function ImageField({ label, kind, value, onChange, api, token, allowPdf = false }: {
  label: string; kind: 'background' | 'signature'; value: string; onChange: (key: string) => void; api: AdminPortalApi; token: string;
  /** Also accept a PDF (the template's front artwork, printed as vector). */
  allowPdf?: boolean;
}) {
  const types = allowPdf ? ['image/png', 'image/jpeg', 'application/pdf'] : ['image/png', 'image/jpeg'];
  const rule = allowPdf ? 'PDF, PNG or JPG under 5 MB' : 'PNG or JPG image under 5 MB';
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!types.includes(file.type) || file.size > MAX_BYTES) {
      toast.error(`Choose a ${rule}`);
      if (input.current) input.current.value = '';
      return;
    }
    setBusy(true);
    try {
      const out = await api.uploadCredentialSettingImage(token, kind, file);
      onChange(out.key);
    } catch (error) {
      toast.error(messageFromError(error) || 'Upload failed');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input} type="file" accept={types.join(',')} aria-label={label} disabled={busy}
          className="block max-w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-xs"
          onChange={(e) => { void pick(e.target.files?.[0]); }}
        />
        {value ? (
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => { void openPrivateImage(api, token, value); }}>{isPdfKey(value) ? 'View uploaded PDF' : 'View uploaded image'}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>Remove</Button>
          </>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{busy ? 'Uploading...' : allowPdf
        ? "PDF (the designer's artwork, printed as vector with the learner's details on it), or PNG/JPG, up to 5 MB. Stored privately."
        : 'PNG or JPG, up to 5 MB. Stored privately.'}</p>
    </div>
  );
}
