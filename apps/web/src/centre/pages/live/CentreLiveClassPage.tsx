import { useEffect } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import type { CentrePageProps } from '../../routing/centre-routes.js';

/**
 * Live classes now live inside each cohort (Cohorts → a cohort → Live Sessions),
 * as in Naji's centre portal design. The old /centre/live address still works:
 * it sends the user to the Cohorts list.
 */
export default function CentreLiveClassPage({ onNavigate }: CentrePageProps) {
  useEffect(() => { onNavigate('/centre/cohorts'); }, [onNavigate]);
  return <PageLoader label="Live classes are now inside each cohort. Opening Cohorts..." />;
}
