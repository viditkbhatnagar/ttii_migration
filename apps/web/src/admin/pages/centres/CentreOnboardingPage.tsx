import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import { AgreementDialog, CertificateDialog } from './onboarding/affiliation-dialogs.js';
import { LeadDialog, ReasonDialog, SendLinkDialog } from './onboarding/lead-dialogs.js';
import { OnboardingDetail, type DetailDialog } from './onboarding/OnboardingDetail.js';
import { OnboardingList } from './onboarding/OnboardingList.js';
import { toOnboardingDetail, toOnboardingList, type OnbDetail, type OnbRow, type RowAction } from './onboarding/onboarding-model.js';
import { NotSetUpNotice } from './onboarding/onboarding-ui.js';
import { useOnboardingAction } from './onboarding/use-onboarding-action.js';

// Centres → Centre Onboarding (Naji 2026-10-22). /admin/centres/onboarding is
// the list; /admin/centres/onboarding/view/:id one record. The router remounts
// the page per path (key={pathname}), so the path is read once.

const LIST_PATH = '/admin/centres/onboarding';

function recordIdFromPath(): string {
  return /^\/admin\/centres\/onboarding\/view\/(\d+)/.exec(window.location.pathname)?.[1] ?? '';
}

export default function CentreOnboardingPage(props: AdminPageProps) {
  const id = useMemo(recordIdFromPath, []);
  return id ? <DetailScreen {...props} id={id} /> : <ListScreen {...props} />;
}

function LoadError({ error, onRetry, onBack }: { error: string; onRetry: () => void; onBack?: () => void }) {
  return (
    <Card>
      <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
        {error}
        <div className="mt-4 flex justify-center gap-2">
          {onBack ? <Button variant="outline" onClick={onBack}>Back to onboarding</Button> : null}
          <Button variant="outline" onClick={onRetry}>Retry</Button>
        </div>
      </CardContent>
    </Card>
  );
}

type ListDialog = { kind: 'lead'; row: OnbRow | null } | { kind: 'send'; row: OnbRow } | { kind: 'record'; row: OnbRow; dialog: 'agreement' | 'certificate' };

function ListScreen({ api, session, onNavigate }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(() => api.loadCentreOnboarding(session.token), []);
  const list = useMemo(() => toOnboardingList(data ?? {}), [data]);
  const [dialog, setDialog] = useState<ListDialog | null>(null);
  const { run } = useOnboardingAction(api, session.token);
  const view = (row: OnbRow) => onNavigate(`${LIST_PATH}/view/${row.id}`);

  const onStageAction = (row: OnbRow, action: RowAction) => {
    if (action === 'send' || action === 'resend') setDialog({ kind: 'send', row });
    else if (action === 'reopen') void run('reopen', { id: row.id }).then((res) => { if (res) reload(); });
    else setDialog({ kind: 'record', row, dialog: action });
  };

  if (loading) return <PageLoader label="Loading centre onboarding..." />;
  if (error) return <LoadError error={error} onRetry={reload} />;

  return (
    <>
      <OnboardingList
        list={list}
        handlers={{ onAdd: () => setDialog({ kind: 'lead', row: null }), onView: view, onEdit: (row) => setDialog({ kind: 'lead', row }), onStageAction }}
      />
      <LeadDialog open={dialog?.kind === 'lead'} row={dialog?.kind === 'lead' ? dialog.row : null} api={api} token={session.token} onClose={() => setDialog(null)} onDone={reload} />
      <SendLinkDialog open={dialog?.kind === 'send'} row={dialog?.kind === 'send' ? dialog.row : null} api={api} token={session.token} onClose={() => setDialog(null)} onDone={reload} />
      {dialog?.kind === 'record' ? (
        <RecordDialogs api={api} token={session.token} id={dialog.row.id} which={dialog.dialog} onClose={() => setDialog(null)} onDone={reload} />
      ) : null}
    </>
  );
}

/** Upload Signed Agreement / Generate Certificate from the list: they need the full record. */
function RecordDialogs({ api, token, id, which, onClose, onDone }: {
  api: AdminPageProps['api']; token: string; id: string; which: 'agreement' | 'certificate'; onClose: () => void; onDone: () => void;
}) {
  const { data } = useAdminPageData(() => api.loadCentreOnboardingRecord(token, id), [id]);
  const parsed = data ? toOnboardingDetail(data) : null;
  const detail: OnbDetail | null = parsed && parsed.ready ? parsed : null;
  const common = { open: detail !== null, detail, api, token, onClose, onDone };
  return which === 'agreement' ? <AgreementDialog {...common} /> : <CertificateDialog {...common} />;
}

function DetailScreen({ api, session, onNavigate, id }: AdminPageProps & { id: string }) {
  const { data, loading, error, reload } = useAdminPageData(() => api.loadCentreOnboardingRecord(session.token, id), [id]);
  const parsed = useMemo(() => (data ? toOnboardingDetail(data) : null), [data]);
  const [dialog, setDialog] = useState<DetailDialog | null>(null);
  const back = () => onNavigate(LIST_PATH);

  if (loading) return <PageLoader label="Loading centre..." />;
  if (error || !parsed) return <LoadError error={error ?? 'Centre onboarding record not found.'} onRetry={reload} onBack={back} />;
  if (!parsed.ready) {
    return (
      <div className="space-y-4">
        <PageTitle title="Centre Onboarding" />
        <NotSetUpNotice message={parsed.message} />
      </div>
    );
  }
  const detail = parsed;
  const close = () => setDialog(null);
  const common = { api, token: session.token, onClose: close, onDone: reload };

  return (
    <>
      <OnboardingDetail detail={detail} api={api} token={session.token} onBack={back} onNavigate={onNavigate} onDialog={setDialog} reload={reload} />
      <LeadDialog open={dialog === 'edit'} row={detail.record} {...common} />
      <SendLinkDialog open={dialog === 'send'} row={detail.record} {...common} />
      <ReasonDialog open={dialog === 'reject' || dialog === 'changes'} kind={dialog === 'reject' ? 'reject' : 'changes'} row={detail.record} {...common} />
      <AgreementDialog open={dialog === 'agreement'} detail={detail} {...common} />
      <CertificateDialog open={dialog === 'certificate'} detail={detail} {...common} />
    </>
  );
}
