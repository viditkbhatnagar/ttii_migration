import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { asNumber, asString } from '../../shared/utils/admin-data-utils.js';
import { toExamResultsDetail, toExamResultsRows, type ExamResultsDetail as Detail } from './exam-results-model.js';
import { ExamResultsList } from './ExamResultsList.js';
import { ExamResultsDetail } from './ExamResultsDetail.js';

// Exam → Result (TTII 2026-10-08), after Naji's Result Management design.
// Replaces the flat attempt table that lived here: results are now worked out
// per exam — every subject sitting, pass/fail/absent per student, an overall
// result — and published from here in one action.
//
// The open exam lives in the URL (?exam=<id>) so the Exams table can deep-link
// to it and the browser back button returns to the list.

const BASE_PATH = '/admin/Exam_result/index';

function examFromUrl(): number | null {
  const id = asNumber(new URLSearchParams(window.location.search).get('exam'));
  return id > 0 ? id : null;
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card>
      <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
        {message}
        <div className="mt-4"><Button variant="outline" onClick={onRetry}>Retry</Button></div>
      </CardContent>
    </Card>
  );
}

function ExamResultView({ examId, api, session, onBack }: { examId: number; onBack: () => void } & Pick<AdminPageProps, 'api' | 'session'>) {
  const confirm = useConfirm();
  const [publishing, setPublishing] = useState(false);
  const { data, loading, error, reload } = useAdminPageData<Detail | null>(
    async () => {
      const raw = await api.getExamResultSheet(session.token, String(examId));
      return raw ? toExamResultsDetail(raw) : null;
    },
    [examId],
  );

  const publish = useCallback(async () => {
    if (!data) return;
    const flagged = data.totals.flagged;
    const ok = await confirm({
      title: 'Publish exam results?',
      description:
        `All ${data.totals.students} students of "${data.title}" will see their marks and result for every subject, and will be emailed.`
        + (flagged > 0 ? ` ${flagged} student${flagged === 1 ? ' has' : 's have'} a paper flagged for a possible technical issue.` : '')
        + ' Published results cannot be withdrawn from here.',
      confirmText: 'Publish results',
    });
    if (!ok) return;
    setPublishing(true);
    try {
      const res = await api.publishExamResultSheet(session.token, String(data.examId));
      const message = asString(res.message) || 'Done.';
      if (asNumber(res.status) === 1) {
        toast.success(message);
        reload();
      } else {
        toast.error(message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not publish the results.');
    } finally {
      setPublishing(false);
    }
  }, [api, session.token, data, confirm, reload]);

  if (loading) return <PageLoader label="Loading results…" />;
  if (error) return <ErrorCard message={error} onRetry={reload} />;
  if (!data) {
    return (
      <Card>
        <CardContent role="status" className="py-10 text-center text-sm text-muted-foreground">
          This exam could not be found.
          <div className="mt-4"><Button variant="outline" onClick={onBack}>Back to exam results</Button></div>
        </CardContent>
      </Card>
    );
  }
  return <ExamResultsDetail detail={data} publishing={publishing} onBack={onBack} onPublish={() => void publish()} />;
}

function ExamResultsListView({ api, session, onOpen }: { onOpen: (examId: number) => void } & Pick<AdminPageProps, 'api' | 'session'>) {
  // Only mounted while the list is on screen, so opening an exam (or arriving
  // on a deep link) never pays for the whole list. Cached, so coming back from
  // an exam paints at once and refreshes behind it.
  const { data, loading, error, reload } = useAdminPageData(
    async () => toExamResultsRows(await api.listExamResultSheets(session.token)),
    [],
    'admin:exam-results:list',
  );
  if (loading) return <PageLoader label="Loading exam results…" />;
  if (error) return <ErrorCard message={error} onRetry={reload} />;
  return <ExamResultsList rows={data ?? []} onOpen={onOpen} />;
}

export default function ExamResultPage({ api, session, onNavigate }: AdminPageProps) {
  const [openExam, setOpenExam] = useState<number | null>(examFromUrl);

  // The admin router fires popstate on every navigation (and the browser on
  // back/forward), so the URL stays the single source of the open exam.
  useEffect(() => {
    const sync = () => setOpenExam(examFromUrl());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  if (openExam !== null) {
    return <ExamResultView examId={openExam} api={api} session={session} onBack={() => onNavigate(BASE_PATH)} />;
  }
  return <ExamResultsListView api={api} session={session} onOpen={(examId) => onNavigate(`${BASE_PATH}?exam=${examId}`)} />;
}
