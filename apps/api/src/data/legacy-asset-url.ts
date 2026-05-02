/**
 * Resolve legacy file paths against the host that actually serves them.
 *
 * Background: most asset paths in the production DB are relative
 * (`uploads/students/.../image.jpg`, `uploads/lesson_files/...`). They
 * were uploaded by the old PHP LMS and the files live on
 * `lms.teachersindia.in`. APP_BASE_URL on the new droplet points at the
 * dead `api.teachersindia.in` host, so we hardcode the live legacy host
 * here. The same util also rewrites stale rows that were previously
 * stamped with the dead `api.` host.
 *
 * Pass-through cases:
 *   - Already-absolute URLs (http/https) — returned as-is unless they
 *     point at the dead `api.teachersindia.in` host (then rewritten).
 *   - Protocol-relative URLs (`//cdn...`).
 *   - Empty / null / undefined → empty string.
 */
const LEGACY_FILES_BASE_URL = 'https://lms.teachersindia.in';

export function toLegacyFileUrl(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.startsWith('https://api.teachersindia.in/') || trimmed.startsWith('http://api.teachersindia.in/')) {
      return trimmed.replace(/^https?:\/\/api\.teachersindia\.in/, LEGACY_FILES_BASE_URL);
    }
    return trimmed;
  }
  if (trimmed.startsWith('//')) return trimmed;
  return `${LEGACY_FILES_BASE_URL}/${trimmed.replace(/^\/+/, '')}`;
}
