/**
 * A link the browser may follow: an absolute http(s) URL, else ''. Stored meeting
 * links are typed by centres/instructors, so rows saved before the API validated
 * them can hold javascript:/data: values that must never become clickable.
 */
export function httpUrlOrEmpty(value: unknown): string {
  if (typeof value !== 'string') return '';
  const url = value.trim();
  if (!url) return '';
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'https:' || protocol === 'http:' ? url : '';
  } catch {
    return '';
  }
}
