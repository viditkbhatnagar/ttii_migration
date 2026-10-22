import { afterEach, describe, expect, test, vi } from 'vitest';

import { replaceLocation } from '../src/lib/replace-location';

// The web tests run in node: stub the few browser globals the helper touches.
function fakeWindow(pathname: string) {
  const win = {
    location: { pathname },
    history: { pushState: vi.fn(), replaceState: vi.fn((_s: unknown, _t: string, url: string) => { win.location.pathname = url; }) },
    dispatchEvent: vi.fn(),
  };
  vi.stubGlobal('window', win);
  vi.stubGlobal('PopStateEvent', class { constructor(public type: string) {} });
  return win;
}

describe('replaceLocation', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  test('swaps the current history entry instead of adding one, and notifies the router', () => {
    const win = fakeWindow('/centre/live');
    replaceLocation('/centre/cohorts');
    expect(win.history.replaceState).toHaveBeenCalledWith({}, '', '/centre/cohorts');
    expect(win.history.pushState).not.toHaveBeenCalled();
    expect(win.dispatchEvent).toHaveBeenCalledTimes(1);
  });

  test('does nothing when already there', () => {
    const win = fakeWindow('/centre/cohorts');
    replaceLocation('/centre/cohorts');
    expect(win.history.replaceState).not.toHaveBeenCalled();
    expect(win.dispatchEvent).not.toHaveBeenCalled();
  });
});
