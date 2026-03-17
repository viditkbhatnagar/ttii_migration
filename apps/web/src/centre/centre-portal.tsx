import type { AuthSession } from '@ttii/frontend-core';
import { PortalScaffold } from '@ttii/ui';

import type { CentrePortalApi } from './centre-portal-api.js';
import { CentreRouter } from './routing/CentreRouter.js';
import { resolveCentreRoute } from './routing/centre-routes.js';

interface CentreSectionNavItem {
  id: string;
  label: string;
  href: string;
  subtitle: string;
}

const CENTRE_SECTION_NAV: readonly CentreSectionNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/centre/dashboard', subtitle: 'Centre KPIs' },
  { id: 'applications', label: 'Applications', href: '/centre/applications', subtitle: 'Lead pipeline' },
  { id: 'students', label: 'Students', href: '/centre/students', subtitle: 'Learner list' },
  { id: 'courses', label: 'Courses', href: '/centre/courses', subtitle: 'Assigned plans' },
  { id: 'cohorts', label: 'Cohorts', href: '/centre/cohorts', subtitle: 'Cohort operations' },
  { id: 'live', label: 'Live', href: '/centre/live', subtitle: 'Live class ops' },
  { id: 'resources', label: 'Resources', href: '/centre/resources', subtitle: 'Folders and files' },
  { id: 'wallet', label: 'Wallet', href: '/centre/wallet', subtitle: 'Funds and requests' },
  { id: 'support', label: 'Support', href: '/centre/support', subtitle: 'Support + training' },
] as const;

/** Nav item IDs visible to Associate (role_id=10) */
const ASSOCIATE_ALLOWED_IDS = new Set<string>([
  'dashboard',
  'applications',
  'students',
]);

function getCentreNavForRole(roleId: number): readonly CentreSectionNavItem[] {
  if (roleId !== 10) return CENTRE_SECTION_NAV;
  return CENTRE_SECTION_NAV.filter((item) => ASSOCIATE_ALLOWED_IDS.has(item.id));
}

export function normalizeCentrePath(pathname: string): string {
  const trimmed = pathname.trim();
  if (trimmed === '/centre' || trimmed === '/centre/') {
    return '/centre/dashboard';
  }
  return trimmed;
}

interface CentrePortalProps {
  pathname: string;
  session: AuthSession;
  api: CentrePortalApi;
  onNavigate: (href: string) => void;
  onLogout: () => void;
}

export function CentrePortal({ pathname, session, api, onNavigate, onLogout }: CentrePortalProps) {
  const route = resolveCentreRoute(pathname);
  const navItems = getCentreNavForRole(session.roleId);
  const activeSection = navItems.find((item) => pathname.startsWith(item.href));
  const roleLabel = session.roleId === 10 ? 'Associate App' : 'Centre App';

  return (
    <PortalScaffold
      roleLabel={roleLabel}
      title={session.roleId === 10 ? 'Associate portal' : 'Centre operations portal'}
      subtitle={session.roleId === 10 ? 'Manage your referrals and performance' : 'Manage applications, cohorts, live classes, and resources'}
      navItems={navItems.map((entry) => ({
        id: entry.id,
        label: entry.label,
        href: entry.href,
      }))}
      activeHref={activeSection?.href ?? pathname}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      {route && activeSection ? (
        <section className="border-l-4 border-teal-600 px-3.5 py-2.5 bg-cyan-50/80 rounded-r-xl leading-relaxed text-teal-900 mb-4">
          <p>{activeSection.subtitle} section running on migrated Node operations endpoints.</p>
        </section>
      ) : null}
      <CentreRouter pathname={pathname} api={api} session={session} onNavigate={onNavigate} />
    </PortalScaffold>
  );
}
