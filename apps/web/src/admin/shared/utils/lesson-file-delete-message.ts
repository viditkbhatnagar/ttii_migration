import { asNumber } from './admin-data-utils.js';

/**
 * Success text after deleting a Lesson Builder file. The API also removes the
 * file's OLDER hidden Content Library copies, and keeps a NEWER one, which the
 * student player then shows in the original's place (Risha 2026-09-24). Say
 * which happened, so no screen deletes library rows silently.
 */
export function lessonFileDeleteMessage(response: unknown): string {
  const envelope = (response ?? {}) as Record<string, unknown>;
  const data = (envelope.data ?? envelope) as Record<string, unknown>;
  const deleted = asNumber(data.mirrors_deleted);
  const kept = asNumber(data.mirrors_kept);
  if (Number.isFinite(kept) && kept > 0) {
    return 'Deleted. A newer Content Library item with the same name is now shown to students instead.';
  }
  if (Number.isFinite(deleted) && deleted > 0) {
    return `Deleted, together with its hidden duplicate${deleted === 1 ? '' : 's'} in the Content Library.`;
  }
  return 'Deleted.';
}
