import { useCallback, useEffect, useState } from 'react';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { toOverview, type SubjectRow } from './question-bank-model.js';

/**
 * Every live subject (unfiltered), for the subject pickers of Bulk Upload,
 * Move and Add Question. Loaded the first time `enabled` is true; null while
 * loading.
 */
export function useSubjectOptions(api: AdminPortalApi, token: string, enabled: boolean): { subjects: SubjectRow[] | null; reload: () => void } {
  const [subjects, setSubjects] = useState<SubjectRow[] | null>(null);
  const [wanted, setWanted] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => { if (enabled) setWanted(true); }, [enabled]);

  useEffect(() => {
    if (!wanted) return undefined;
    let live = true;
    api.loadQuestionBankOverview(token)
      .then((raw) => { if (live) setSubjects(toOverview(raw).subjects); })
      .catch(() => { if (live) setSubjects([]); });
    return () => { live = false; };
  }, [api, token, wanted, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { subjects, reload };
}
