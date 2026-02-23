import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { InlineNotice, MetricCard, PortalScaffold, ShellCard } from '../src/index';

describe('ShellCard', () => {
  it('renders key copy and theme class', () => {
    const html = renderToString(
      <ShellCard title="Phase 02" subtitle="Monorepo foundation" theme="dark" />,
    );

    expect(html).toContain('Phase 02');
    expect(html).toContain('Monorepo foundation');
    expect(html).toContain('shell-card--dark');
  });

  it('renders portal scaffold navigation and active state', () => {
    const html = renderToString(
      <PortalScaffold
        roleLabel="Student app"
        title="Learning cockpit"
        subtitle="Phase 11 foundation"
        navItems={[
          { id: 'dashboard', label: 'Dashboard', href: '/student' },
          { id: 'tasks', label: 'Tasks', href: '/student/tasks' },
        ]}
        activeHref="/student"
        onNavigate={() => undefined}
      >
        <div>Shell content</div>
      </PortalScaffold>,
    );

    expect(html).toContain('Learning cockpit');
    expect(html).toContain('portal-nav__item--active');
    expect(html).toContain('Shell content');
  });

  it('renders metric and notice primitives', () => {
    const html = renderToString(
      <div>
        <MetricCard label="Pending approvals" value="12" detail="Across 4 queues" tone="warning" />
        <InlineNotice tone="info" title="Auth state">
          Role guard checks are active.
        </InlineNotice>
      </div>,
    );

    expect(html).toContain('Pending approvals');
    expect(html).toContain('metric-card--warning');
    expect(html).toContain('Role guard checks are active.');
  });
});
