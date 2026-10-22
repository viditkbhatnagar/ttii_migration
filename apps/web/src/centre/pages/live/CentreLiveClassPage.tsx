import { useEffect } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { replaceLocation } from '../../../lib/replace-location.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';

/**
 * Live classes now live inside each cohort (Cohorts → a cohort → Live Sessions),
 * as in Naji's centre portal design. The old /centre/live address still works:
 * it sends the user to the Cohorts list.
 */
export default function CentreLiveClassPage(_props: CentrePageProps) {
  // Replace, not push: a pushed redirect makes the Back button loop back here.
  useEffect(() => { replaceLocation('/centre/cohorts'); }, []);
  return <PageLoader label="Live classes are now inside each cohort. Opening Cohorts..." />;
}
