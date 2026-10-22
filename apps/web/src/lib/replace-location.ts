/**
 * Redirect inside the SPA WITHOUT adding a history entry, so Back skips the
 * redirecting address instead of bouncing the user straight forward again.
 * (The app's navigate() pushes; this swaps the current entry and tells the
 * router to re-read the path.)
 */
export function replaceLocation(pathname: string): void {
  if (typeof window === 'undefined' || window.location.pathname === pathname) return;
  window.history.replaceState({}, '', pathname);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
