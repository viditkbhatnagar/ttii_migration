import { normaliseCentreApplication, type CentreApplication, type CentreApplicationErrors, type CentreFormDoc } from '@ttii/shared-types';

// The public centre application form's calls (/api/centre-form/{token}*).
// No login: the token in the URL is the credential.

const API_BASE = '/api';

export type CentreFormState =
  | { state: 'open'; ref: string; centreName: string; expiresAt: string; remarks: string; prefill: CentreApplication }
  | { state: 'closed'; reason: string; message: string };

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  if (res.status === 429) throw new Error('Too many requests. Please wait a few minutes and try again.');
  if (res.status === 413) throw new Error('File must be under 5 MB');
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) throw new Error(`Something went wrong (${res.status}). Please try again.`);
  return rec(await res.json());
}

export function toFormState(data: Record<string, unknown>): CentreFormState {
  if (data.state === 'open') {
    return {
      state: 'open',
      ref: str(data.ref),
      centreName: str(data.centreName),
      expiresAt: str(data.expiresAt),
      remarks: str(data.remarks),
      prefill: normaliseCentreApplication(data.prefill),
    };
  }
  return { state: 'closed', reason: str(data.reason) || 'invalid', message: str(data.message) || 'This link is not valid.' };
}

export async function loadCentreForm(token: string): Promise<CentreFormState> {
  const body = await readJson(await fetch(`${API_BASE}/centre-form/${encodeURIComponent(token)}`));
  if (body.status !== 1) throw new Error(str(body.message) || 'The form could not be loaded.');
  return toFormState(rec(body.data));
}

export async function uploadCentreFormFile(token: string, file: File): Promise<CentreFormDoc> {
  const fd = new FormData();
  fd.append('file', file);
  const body = await readJson(await fetch(`${API_BASE}/centre-form/${encodeURIComponent(token)}/upload`, { method: 'POST', body: fd }));
  const data = rec(body.data);
  if (body.status !== 1 || !str(data.url)) throw new Error(str(body.message) || 'Upload failed. Please try again.');
  // `sig` is the server's proof that it stored this file; it goes back on submit.
  return { name: str(data.name) || file.name, url: str(data.url), sig: str(data.sig) };
}

export type SubmitResult = { ok: true; ref: string } | { ok: false; message: string; errors: CentreApplicationErrors };

export async function submitCentreForm(token: string, form: CentreApplication, declaration: boolean): Promise<SubmitResult> {
  const res = await fetch(`${API_BASE}/centre-form/${encodeURIComponent(token)}/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ form, declaration }),
  });
  const body = await readJson(res);
  const data = rec(body.data);
  if (body.status === 1) return { ok: true, ref: str(data.ref) };
  const errors = rec(data.errors);
  return {
    ok: false,
    message: str(body.message) || 'The application could not be submitted.',
    errors: Object.fromEntries(Object.entries(errors).filter(([, v]) => typeof v === 'string')) as CentreApplicationErrors,
  };
}

/** Client-side check before uploading (the server checks the content again). */
export function uploadFileError(file: { type: string; size: number }): string {
  if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) return 'Choose a PDF, JPG or PNG file';
  if (file.size > 5 * 1024 * 1024) return 'File must be under 5 MB';
  return '';
}
