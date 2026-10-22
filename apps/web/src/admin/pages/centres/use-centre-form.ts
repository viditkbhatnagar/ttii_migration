import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { asString, messageFromError } from '../../shared/utils/admin-data-utils.js';
import {
  EMPTY_FORM, UPLOAD_MAX_BYTES, formFromProfile, fromApiErrors, setLocation, toPayload, validateForm,
  type CentreForm, type FormErrors, type FormKey, type FormMode,
} from './centre-form-model.js';
import { toProfile, type CentreProfile } from './centre-profile-model.js';

// State + submit for the Add / Edit Centre form, shared by the dialog (opened
// in place from the Directory and the Profile) and the /add, /edit/:id pages.

export interface SavedCentre {
  id: string;
  code: string;
  mode: 'add' | 'edit';
}

export interface CentreFormController {
  form: CentreForm;
  errors: FormErrors;
  saving: boolean;
  uploading: Partial<Record<FormKey, boolean>>;
  set: (key: FormKey, value: string) => void;
  pickLocation: (key: 'country' | 'state' | 'district', value: string) => void;
  upload: (key: FormKey, file: File | null | undefined) => Promise<void>;
  reset: (next: CentreForm) => void;
  submit: () => Promise<SavedCentre | null>;
}

const UPLOAD_TYPES = /\.(pdf|png|jpe?g)$/i;

export function useCentreForm(opts: {
  api: AdminPortalApi;
  token: string;
  mode: FormMode;
  initial: CentreForm;
  /** centres.id when editing. */
  centreId?: string | undefined;
}): CentreFormController {
  const { api, token, mode, centreId } = opts;
  const [form, setForm] = useState<CentreForm>(opts.initial);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Partial<Record<FormKey, boolean>>>({});

  const clearError = useCallback((key: FormKey) => {
    setErrors((e) => {
      if (!e[key]) return e;
      const { [key]: _gone, ...rest } = e;
      return rest;
    });
  }, []);

  const set = useCallback((key: FormKey, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    clearError(key);
  }, [clearError]);

  const pickLocation = useCallback((key: 'country' | 'state' | 'district', value: string) => {
    setForm((f) => setLocation(f, key, value));
    clearError(key);
    // A new country can change the PIN and mobile rules.
    if (key === 'country') { clearError('pin'); clearError('mobile'); }
  }, [clearError]);

  const upload = useCallback(async (key: FormKey, file: File | null | undefined) => {
    if (!file) return;
    if (file.size > UPLOAD_MAX_BYTES) { toast.error('File must be under 5 MB'); return; }
    if (!UPLOAD_TYPES.test(file.name)) { toast.error('Upload a PDF or an image (PNG / JPG).'); return; }
    setUploading((u) => ({ ...u, [key]: true }));
    try {
      const { url } = await api.uploadFile(token, file);
      set(key, url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
    }
  }, [api, token, set]);

  const reset = useCallback((next: CentreForm) => {
    setForm(next);
    setErrors({});
  }, []);

  const submit = useCallback(async (): Promise<SavedCentre | null> => {
    if (Object.values(uploading).some(Boolean)) { toast.error('Wait for the upload to finish.'); return null; }
    const local = validateForm(form, mode);
    setErrors(local);
    if (Object.keys(local).length > 0) { toast.error('Please fix the highlighted fields'); return null; }
    setSaving(true);
    try {
      const res = await api.saveCentre(token, toPayload(form, mode, centreId));
      if (!res.ok) {
        const server = fromApiErrors(res.data);
        if (Object.keys(server).length > 0) setErrors(server);
        toast.error(res.message || 'Could not save the centre.');
        return null;
      }
      if (res.data.email_delivered === false) toast.warning(res.message);
      else toast.success(res.message);
      return { id: asString(res.data.id) || centreId || '', code: asString(res.data.code), mode: mode.mode };
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the centre.');
      return null;
    } finally {
      setSaving(false);
    }
  }, [api, token, form, mode, centreId, uploading]);

  return { form, errors, saving, uploading, set, pickLocation, upload, reset, submit };
}

// ─── Where the form starts ─────────────────────────────────────────────────

export type CentreFormTarget =
  | { mode: 'add' }
  | { mode: 'edit'; centreId: string; profile?: CentreProfile | undefined };

export type CentreFormStart =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; initial: CentreForm; mode: FormMode; notice: string };

/** Loads what the form starts from: the next code (add) or the stored centre (edit). */
export function useCentreFormStart(api: AdminPortalApi, token: string, target: CentreFormTarget | null): CentreFormStart {
  const [loaded, setLoaded] = useState<CentreFormStart>({ state: 'loading' });
  const key = target ? (target.mode === 'add' ? 'add' : `edit:${target.centreId}`) : '';
  const given = target?.mode === 'edit' ? target.profile : undefined;

  useEffect(() => {
    // Closed: the next open starts from a fresh load (a just-used code must not be offered again).
    if (!target) { setLoaded({ state: 'loading' }); return undefined; }
    let cancelled = false;
    const ready = (initial: CentreForm, mode: FormMode, notice: string) => {
      if (!cancelled) setLoaded({ state: 'ready', initial, mode, notice });
    };
    if (target.mode === 'edit' && given) {
      ready(formFromProfile(given), { mode: 'edit', kycReady: given.kycReady }, given.notice);
      return () => { cancelled = true; };
    }
    setLoaded({ state: 'loading' });
    const load = target.mode === 'add'
      ? api.loadNextCentreCode(token).then((code) => ready({ ...EMPTY_FORM, centreId: code }, { mode: 'add', kycReady: true }, ''))
      : api.loadCentreProfile(token, target.centreId).then((raw) => {
          const p = toProfile(raw);
          ready(formFromProfile(p), { mode: 'edit', kycReady: p.kycReady }, p.notice);
        });
    load.catch((err: unknown) => {
      if (target.mode === 'add') {
        // The code is only a suggestion: the form still opens and the admin types one.
        ready({ ...EMPTY_FORM }, { mode: 'add', kycReady: true }, '');
        return;
      }
      if (!cancelled) setLoaded({ state: 'error', message: messageFromError(err) });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the target changes
  }, [key, given]);

  return loaded;
}

