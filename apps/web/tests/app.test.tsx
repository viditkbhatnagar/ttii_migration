import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import App from '../src/App';

describe('App shell', () => {
  it('renders migration foundation copy', () => {
    const html = renderToString(<App />);

    expect(html).toContain('Phase 02 platform foundation');
    expect(html).toContain('Monorepo ready');
    expect(html).toContain('Strict TypeScript baseline');
  });
});
