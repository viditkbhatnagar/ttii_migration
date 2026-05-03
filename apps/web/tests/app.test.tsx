import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import App from '../src/App';

describe('App shell', () => {
  it('renders the TTII LMS login shell', () => {
    const html = renderToString(<App />);

    // Core branding that actually appears in the current LoginHome.
    expect(html).toContain('Welcome');
    // Login form fields are always present even after the upfront role
    // dropdown was replaced by the post-password picker.
    expect(html).toContain('Email Address');
    expect(html).toContain('Sign In');
    // The app title from index.html is not rendered server-side here —
    // instead assert the React app mounted without throwing.
    expect(html.length).toBeGreaterThan(500);
  });
});
