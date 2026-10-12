import { asString } from '../../shared/utils/admin-data-utils.js';
import {
  STATUS_LABEL,
  cohortTabCounts,
  filterCohortsIgnoringTab,
  sortCohorts,
  toCohortRow,
  type CohortFilters,
  type CohortRow,
  type CohortSortKey,
  type CohortTab,
} from '../cohorts/cohort-list-model.js';
import { matchesSearch, sortRows, type SortDir } from '../cohorts/list-model.js';

// Centre Cohorts view model (TTII 2026-10-12, Naji's CentreCohortsModule). The
// rows are the same GET /admin/centres/cohorts feed the Cohorts list reads, so
// this reuses the Cohorts model and only adds the Centre column. Every filter
// runs on the loaded rows: the route never read cohort_month / language_id /
// instructor_id / status, so on the old page those four filters did nothing.

export interface CentreCohortRow extends CohortRow {
  centreId: string;
  /** centres.centre_name, '' for a cohort not run by a centre. */
  centre: string;
}

export type CentreCohortSortKey = CohortSortKey | 'centre';

export function toCentreCohortRows(data: unknown): CentreCohortRow[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
    .map((r) => ({ ...toCohortRow(r), centreId: asString(r.centre_id), centre: asString(r.centre_name) }))
    .filter((r) => r.id);
}

/** Every filter except the tab; the search also matches the centre name. */
export function filterCentreCohortsIgnoringTab(rows: CentreCohortRow[], f: CohortFilters): CentreCohortRow[] {
  // The Cohorts filter returns the very objects it was given, so the cast keeps the centre fields.
  const base = filterCohortsIgnoringTab(rows, { ...f, search: '' }) as CentreCohortRow[];
  return base.filter((c) => matchesSearch(f.search, [c.cohortId, c.code, c.title, c.subject, c.instructor, c.centre, ...c.courses]));
}

export function filterCentreCohorts(rows: CentreCohortRow[], f: CohortFilters): CentreCohortRow[] {
  const base = filterCentreCohortsIgnoringTab(rows, f);
  return f.tab === 'all' ? base : base.filter((c) => c.status === f.tab);
}

export function centreCohortTabCounts(rows: CentreCohortRow[], f: CohortFilters): Record<CohortTab, number> {
  return cohortTabCounts(filterCentreCohortsIgnoringTab(rows, f));
}

export function sortCentreCohorts(rows: CentreCohortRow[], key: CentreCohortSortKey, dir: SortDir): CentreCohortRow[] {
  if (key === 'centre') return sortRows(rows, (c) => c.centre, dir);
  return sortCohorts(rows, key, dir) as CentreCohortRow[];
}

export function centreCohortCsvRows(rows: CentreCohortRow[]): Array<Array<string | number>> {
  return [
    ['Status', 'Centre', 'Cohort ID', 'Cohort Code', 'Cohort Date', 'Course', 'Subject', 'Language', 'Instructor', 'No. of Students', 'No. of Live Classes'],
    ...rows.map((c) => [
      STATUS_LABEL[c.status], c.centre, c.cohortId, c.code, c.month, c.courses.join('; '), c.subject, c.language, c.instructor, c.students, c.liveClasses,
    ]),
  ];
}
