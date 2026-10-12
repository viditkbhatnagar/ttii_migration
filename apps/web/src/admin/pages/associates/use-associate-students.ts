import { useMemo } from 'react';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import {
  studentQueryParams, toStudentPage, type AssociateStudentPage, type AssociateStudentRow, type StudentQuery,
} from './associate-mgmt-model.js';
import { useDebouncedValue, useServerList } from './use-server-list.js';

// Data hook behind Associate Students and the Commissions basis table:
// /admin/associates/students_list, paged / filtered / sorted on the server.

export function useAssociateStudents(api: AdminPortalApi, token: string, query: StudentQuery) {
  const search = useDebouncedValue(query.search);
  const list = useServerList(
    (params) => api.loadAssociateStudents(token, params),
    studentQueryParams({ ...query, search }),
  );
  const page = useMemo<AssociateStudentPage>(() => toStudentPage(list.data ?? {}), [list.data]);
  const exportAll = async (): Promise<AssociateStudentRow[]> =>
    toStudentPage(await api.loadAssociateStudents(token, { ...list.params, all: '1' })).rows;
  return { page, loaded: list.data !== null, loading: list.loading, error: list.error, reload: list.reload, exportAll };
}
