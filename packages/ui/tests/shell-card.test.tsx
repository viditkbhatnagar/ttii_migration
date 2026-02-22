import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ShellCard } from '../src/index';

describe('ShellCard', () => {
  it('renders key copy and theme class', () => {
    const html = renderToString(
      <ShellCard title="Phase 02" subtitle="Monorepo foundation" theme="dark" />,
    );

    expect(html).toContain('Phase 02');
    expect(html).toContain('Monorepo foundation');
    expect(html).toContain('shell-card--dark');
  });
});
