import { toLegacyFileUrl } from '../data/legacy-asset-url.js';

const LEGACY_FILES_BASE_URL = 'https://lms.teachersindia.in';

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

/**
 * Build the legacy PHP-LMS `user_data` (or `userdata`) block exactly
 * as the Flutter mobile app expects it. Every field is a string (PHP's
 * json_encode kept the values from `users` columns quoted), and the
 * avatar resolves to a full URL with a dummy.jpg fallback so the
 * Flutter image widget never null-crashes.
 *
 * Ansaba UAT 2026-05-26 — side-by-side response comparison against
 * https://lms.teachersindia.in/api/profile/index and
 * https://lms.teachersindia.in/api/course/my_course revealed the new
 * Node port was using brand-new keys (`name`, `email`, `phone`,
 * `image`, `date_of_birth`) under a flat `data` object; the Flutter
 * app reads `data["user_data"]["user_image"]` / `["user_name"]` /
 * etc., so every field was undefined and the app crashed accessing
 * `[]` on null. This helper is the single source of truth for the
 * legacy user block shared by both routes.
 */
export function buildLegacyUserData(
  row: Record<string, unknown> | null,
  sessionToken: string,
): Record<string, unknown> {
  const r = row ?? {};
  const rawImage = str(r.profile_picture) || str(r.image);
  const userImageUrl = toLegacyFileUrl(rawImage) || `${LEGACY_FILES_BASE_URL}/uploads/dummy.jpg`;
  return {
    user_id: str(r.id),
    student_id: str(r.student_id),
    user_name: str(r.name),
    role_id: str(r.role_id),
    course_id: str(r.course_id),
    auth_token: sessionToken,
    user_email: str(r.user_email) || str(r.email),
    user_phone: str(r.phone),
    device_id: str(r.device_id),
    course_name: '',
    status: str(r.status) || '1',
    academic_year: str(r.academic_year),
    user_image: userImageUrl,
    dob: str(r.dob),
    privacy_policy: `${LEGACY_FILES_BASE_URL}/home/privacy_policy`,
  };
}
