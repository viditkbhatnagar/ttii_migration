import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import App from '../src/App';

describe('App shell', () => {
  it('renders Phase 14 admin portal login shell', () => {
    const html = renderToString(<App />);

    expect(html).toContain('Phase 14 Admin React Portal');
    expect(html).toContain('API auth bridge');
    expect(html).toContain('Sign in and open portal');
  });
});
