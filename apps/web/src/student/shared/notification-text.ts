// Notification bodies are authored as HTML and sometimes carry broken-emoji
// artifacts (emoji stored in a non-utf8mb4 column collapse to "?") plus raw HTML
// entities. Render them as clean plain text: strip tags, decode entities
// (named + decimal + hex), drop runs of "?", space out inline check-emoji, and
// collapse whitespace. Used by the dashboard Recent Activity + the Notifications
// page so the same messy source data displays cleanly everywhere.
export function cleanNotificationText(raw: string): string {
  if (!raw) {
    return '';
  }
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#0?39;|&rsquo;/gi, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, code: string) => {
      const n = Number.parseInt(code, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : '';
    })
    .replace(/&#(\d+);/g, (_m, code: string) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCodePoint(n) : '';
    })
    .replace(/\?{2,}/g, ' ')
    .replace(/✅/g, ' ✅ ')
    .replace(/\s+/g, ' ')
    .trim();
}
