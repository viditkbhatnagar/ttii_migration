import { useCallback, useMemo, useState } from 'react';
import { Briefcase, Building2, Shield, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { CentrePageHeader } from '../../layout/CentrePageHeader.js';
import { useOpenCentreSupport } from '../../layout/CentreLayoutContext.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { toProfileData } from './centre-profile-model.js';
import { ProfileAffiliationTab } from './ProfileAffiliationTab.js';
import { ProfileCentreTab } from './ProfileCentreTab.js';
import { ProfileDocumentsTab } from './ProfileDocumentsTab.js';
import { ProfileSecurityTab } from './ProfileSecurityTab.js';

// Naji's Profile page (src/routes/profile.tsx + ProfileTabs.tsx) on the
// centre's real record. Tabs: Centre, Affiliation, Documents, Security. His
// Users and Preferences tabs are not built (no backend). Centre details and
// affiliation are read-only: TTII changes them.

const TABS = ['centre', 'affiliation', 'documents', 'security'] as const;
type Tab = (typeof TABS)[number];

function initialTab(): Tab {
  const wanted = new URLSearchParams(window.location.search).get('tab');
  return (TABS as readonly string[]).includes(wanted ?? '') ? (wanted as Tab) : 'centre';
}

export default function CentreProfilePage({ api, session, onNavigate }: CentrePageProps) {
  const [version, setVersion] = useState(0);
  const { data: raw, loading, error } = useAdminPageData<unknown>(() => api.loadPortalProfile(session.token), [session.token, version]);
  const openSupport = useOpenCentreSupport(onNavigate);
  const profile = useMemo(() => (raw ? toProfileData(raw) : null), [raw]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const [tab, setTab] = useState<Tab>(initialTab);

  if (loading && !profile) return <DashboardLoader label="profile" />;
  if (error || !profile) {
    return <Card><CardContent role="alert" className="py-10 text-center text-sm text-destructive">{error || 'The profile could not be loaded.'}</CardContent></Card>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <CentrePageHeader title="Profile" subtitle="Centre details, affiliation, documents and account security." />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full">
        <TabsList className="h-auto flex-wrap bg-muted/50 p-1">
          <TabsTrigger value="centre" className="gap-1.5"><Building2 aria-hidden="true" className="h-4 w-4" />Centre</TabsTrigger>
          <TabsTrigger value="affiliation" className="gap-1.5"><Briefcase aria-hidden="true" className="h-4 w-4" />Affiliation</TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5"><Upload aria-hidden="true" className="h-4 w-4" />Documents</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield aria-hidden="true" className="h-4 w-4" />Security</TabsTrigger>
        </TabsList>
        <TabsContent value="centre" className="mt-6"><ProfileCentreTab profile={profile} onContactSupport={openSupport} /></TabsContent>
        <TabsContent value="affiliation" className="mt-6"><ProfileAffiliationTab profile={profile} /></TabsContent>
        <TabsContent value="documents" className="mt-6"><ProfileDocumentsTab api={api} session={session} profile={profile} onChanged={reload} /></TabsContent>
        <TabsContent value="security" className="mt-6"><ProfileSecurityTab api={api} session={session} /></TabsContent>
      </Tabs>
    </div>
  );
}
