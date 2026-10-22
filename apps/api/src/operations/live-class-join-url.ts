export const MAX_JOIN_URL_LENGTH = 1000;

/**
 * A meeting link typed by a person (manual / external live-class platform). It is
 * rendered as an <a href> to students, instructors and admins, so only absolute
 * http(s) URLs are accepted. Returns the trimmed URL, or null when it is unusable.
 */
export function validJoinUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.length > MAX_JOIN_URL_LENGTH) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? value : null;
  } catch {
    return null;
  }
}
