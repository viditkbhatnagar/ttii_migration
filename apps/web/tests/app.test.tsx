import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import App from '../src/App';

describe('App shell', () => {
  it('renders the TTII LMS login shell', () => {
    const html = renderToString(<App />);

    // Core branding that actually appears in the current LoginHome.
    expect(html).toContain('Welcome');
    // Role selector is always present on the login form.
    expect(html).toContain('Login As');
    // The app title from index.html is not rendered server-side here —
    // instead assert the React app mounted without throwing.
    expect(html.length).toBeGreaterThan(500);
  });
});
