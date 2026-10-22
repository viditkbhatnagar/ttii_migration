import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { IndianRupee } from 'lucide-react';
import { istTodayYmd } from '@ttii/shared-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { PageTitle } from '../../shared/components/ui-kit.js';
import { messageFromError } from '../../shared/utils/admin-data-utils.js';
import { AgreementsTable, CertificatesTable, type AffiliationView } from './affiliation/AffiliationTables.js';
import { toAffiliation, type AgreementRow, type CertificateRow } from './affiliation/affiliation-model.js';
import { DocViewerDialog } from './onboarding/DocViewerDialog.js';
import { fmtDate, inr } from './onboarding/onboarding-model.js';
import { CancelButton, Field, ModalShell, NotSetUpNotice, type ViewerDoc } from './onboarding/onboarding-ui.js';

// Centres → Affiliation & Agreements (Naji 2026-10-22). Every signed agreement
// and affiliation certificate, including those of centres still in onboarding
// (shown with the lead's name and reserved code). Statuses are derived from
// the dates. One addition to the prototype: "Mark Fee Paid" on an agreement
// whose affiliation fee is unpaid (the prototype had no way to record a fee
// paid later; Wallet & Payment lists these fees).

export default function AffiliationAgreementsPage({ api, session }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(() => api.loadAffiliation(session.token), []);
  const aff = useMemo(() => toAffiliation(data ?? {}), [data]);
  const [view, setView] = useState<AffiliationView>('agreements');
  const [doc, setDoc] = useState<ViewerDoc | null>(null);
  const [paying, setPaying] = useState<AgreementRow | null>(null);
  const [regenerating, setRegenerating] = useState('');

  const regenerate = async (row: CertificateRow) => {
    setRegenerating(row.id);
    try {
      toast.success((await api.affiliationAction(session.token, 'regenerate_pdf', { certificate_id: row.id })).message);
      reload();
    } catch (err: unknown) {
      toast.error(messageFromError(err));
    } finally {
      setRegenerating('');
    }
  };

  if (loading) return <PageLoader label="Loading affiliation records..." />;
  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
          <div className="mt-4"><Button variant="outline" onClick={reload}>Retry</Button></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Centres</p>
        <PageTitle title="Affiliation & Agreements" subtitle="Affiliation agreements and certificates issued to centres." />
      </div>
      {!aff.ready ? <NotSetUpNotice message={aff.message} /> : null}
      {view === 'agreements' ? (
        <AgreementsTable rows={aff.agreements} view={view} onViewChange={setView} onView={setDoc} onMarkPaid={setPaying} />
      ) : (
        <CertificatesTable rows={aff.certificates} view={view} onViewChange={setView} onView={setDoc} onRegenerate={(r) => { void regenerate(r); }} regenerating={regenerating} />
      )}
      <DocViewerDialog doc={doc} onClose={() => setDoc(null)} />
      <MarkFeePaidDialog row={paying} api={api} token={session.token} onClose={() => setPaying(null)} onDone={reload} />
    </div>
  );
}

function MarkFeePaidDialog({ row, api, token, onClose, onDone }: {
  row: AgreementRow | null; api: AdminPageProps['api']; token: string; onClose: () => void; onDone: () => void;
}) {
  const [paidOn, setPaidOn] = useState(istTodayYmd());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (row) { setPaidOn(istTodayYmd()); setError(''); } }, [row]);
  if (!row) return null;
  const save = async () => {
    if (!paidOn) { setError('Required'); return; }
    if (paidOn > istTodayYmd()) { setError('Cannot be in the future'); return; }
    setBusy(true);
    try {
      toast.success((await api.affiliationAction(token, 'mark_fee_paid', { agreement_id: row.id, paid_on: paidOn })).message);
      onDone();
      onClose();
    } catch (err: unknown) {
      toast.error(messageFromError(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ModalShell
      open
      width={440}
      busy={busy}
      onClose={onClose}
      icon={<IndianRupee aria-hidden="true" className="size-4" />}
      title="Mark Fee Paid"
      description={`Agreement ${row.agreementNo} · ${row.centreName} · ${inr(row.feeAmount)} (effective ${fmtDate(row.effectiveDate)})`}
      footer={(
        <>
          <CancelButton onClick={onClose} disabled={busy} />
          <Button type="button" disabled={busy} onClick={() => { void save(); }}>{busy ? 'Saving...' : 'Mark Paid'}</Button>
        </>
      )}
    >
      <Field label="Paid on" htmlFor="fee-paid-on" required error={error}>
        <DmyDateInput id="fee-paid-on" value={paidOn} onChange={(v) => { setPaidOn(v); setError(''); }} />
      </Field>
      <p className="text-xs text-muted-foreground">This records a payment that has already been received; nothing is charged.</p>
    </ModalShell>
  );
}
