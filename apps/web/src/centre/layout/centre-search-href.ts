import { resolveCentreRoute } from '../routing/centre-routes.js';
import type { SearchHit } from './centre-shell-model.js';

/**
 * Where a top-bar search hit goes: a page's own href; a record's detail page
 * when the portal registers one (/centre/applications/view/:id,
 * /centre/students/view/:id), otherwise its list with the code (or name) in ?q=.
 */
export function hitHref(hit: SearchHit): string {
  if (hit.kind === 'page') return hit.target;
  const base = hit.kind === 'application' ? '/centre/applications' : '/centre/students';
  const detail = `${base}/view/${encodeURIComponent(hit.target)}`;
  const route = resolveCentreRoute(detail);
  if (route && route.path.includes(':')) return detail;
  return `${base}?q=${encodeURIComponent(hit.code || hit.title)}`;
}
