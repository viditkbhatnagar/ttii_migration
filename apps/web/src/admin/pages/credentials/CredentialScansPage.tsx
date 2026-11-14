import { useState } from 'react';
import { Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DmyDateInput } from '@/components/ui/dmy-date-field';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { Pill, PageTitle } from '../../shared/components/ui-kit.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { messageFromError } from '../../shared/utils/admin-data-utils.js';
import { PillTab } from '../students/list-chrome.js';
import { CredDialog, Field, areaClass } from './CredDialogShell.js';
import { CredTable, type CredColumn } from './CredTable.js';
import { CredentialGate } from './credential-gate.js';
import {
  ALERT_TYPE_LABEL, SCAN_STATUS_LABEL, dmyAny, docTypeLabel, scanStatusTone, type AlertRow, type ScanRow,
} from './credential-delivery-model.js';

// Scan History (spec §1.5): every public lookup, and the alerts they raise.
// Reviewing an alert needs a note and works once only.

type Tab = 'all' | 'alerts' | 'notfound';
type AlertTab = 'open' | 'reviewed' | 'all';

function ReviewDialog({ api, token, alert, onClose, onDone }: { api: AdminPortalApi; token: string; alert: AlertRow; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (): Promise<void> => {
    setBusy(true);
    try {
      const r = await api.credReviewAlert(token, alert.id, note);
      if (!r.ok) { toast.error(r.message); return; }
      toast.success('Alert reviewed.');
      onDone(); onClose();
    } catch (e: unknown) { toast.error(messageFromError(e)); } finally { setBusy(false); }
  };
  return (
    <CredDialog open onOpenChange={(o) => { if (!o) onClose(); }} title="Review scan alert" width={520}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={() => void submit()}>Mark reviewed</Button></>}>
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border p-3 text-sm">
          <p className="font-medium">{ALERT_TYPE_LABEL[alert.type] ?? alert.type}</p>
          <p className="mt-1 text-muted-foreground">{alert.details}</p>
          <p className="mt-1 text-xs text-muted-foreground">{dmyAny(alert.createdAt)}</p>
        </div>
        <Field label="Review note *" htmlFor="alert-note" hint="A review is final and cannot be changed.">
          <textarea id="alert-note" className={areaClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </CredDialog>
  );
}

function ScansContent({ api, session }: AdminPageProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data, loading, error, reload } = useAdminPageData(() => api.credScans(session.token, { from, to }), [api, session.token, from, to]);
  const [tab, setTab] = useState<Tab>('all');
  const [alertTab, setAlertTab] = useState<AlertTab>('open');
  const [reviewing, setReviewing] = useState<AlertRow | null>(null);

  const scans = data?.scans ?? [];
  const alerts = (data?.alerts ?? []).filter((a) => alertTab === 'all' || a.reviewStatus === alertTab);
  const openPdf = async (documentId: number | null): Promise<void> => {
    if (!documentId) return;
    try { window.open(await api.credSignedUrl(session.token, 'document', documentId), '_blank', 'noopener,noreferrer'); } catch (e: unknown) { toast.error(messageFromError(e)); }
  };
  const cell = (row: ScanRow, text: string) => (row.documentId
    ? <button type="button" className="text-left text-sm hover:text-primary hover:underline" onClick={() => void openPdf(row.documentId)}>{text}</button>
    : <span>{text}</span>);

  const scanColumns: Array<CredColumn<ScanRow>> = [
    { key: 'at', label: 'Date / time (local)', value: (s) => s.at, text: (s) => dmyAny(s.at) },
    { key: 'vid', label: 'Verification ID', value: (s) => s.verificationId, render: (s) => cell(s, s.verificationId) },
    { key: 'learner', label: 'Learner', value: (s) => s.learner, filter: true, render: (s) => cell(s, s.learner) },
    { key: 'type', label: 'Document type', value: (s) => (s.docType === '-' ? '-' : docTypeLabel(s.docType)), filter: true },
    { key: 'no', label: 'Document no.', value: (s) => s.documentNo, render: (s) => cell(s, s.documentNo) },
    { key: 'course', label: 'Course', value: (s) => s.course, filter: true },
    { key: 'city', label: 'City', value: (s) => s.city, filter: true },
    { key: 'country', label: 'Country', value: (s) => s.country, filter: true },
    { key: 'device', label: 'Device', value: (s) => s.device, filter: true },
    { key: 'method', label: 'Method', value: (s) => (s.method === 'qr' ? 'QR' : 'Manual'), filter: true },
    { key: 'status', label: 'Status shown', value: (s) => SCAN_STATUS_LABEL[s.status] ?? s.status, filter: true, render: (s) => <Pill tone={scanStatusTone(s.status)}>{SCAN_STATUS_LABEL[s.status] ?? s.status}</Pill> },
  ];
  const alertColumns: Array<CredColumn<AlertRow>> = [
    { key: 'type', label: 'Type', value: (a) => ALERT_TYPE_LABEL[a.type] ?? a.type, filter: true },
    { key: 'details', label: 'Details', value: (a) => a.details, className: 'min-w-[16rem] text-sm' },
    { key: 'created', label: 'Created at', value: (a) => a.createdAt, text: (a) => dmyAny(a.createdAt) },
    { key: 'by', label: 'Reviewed by', value: (a) => a.reviewedBy || '-' },
    { key: 'at', label: 'Reviewed at', value: (a) => a.reviewedAt ?? '', text: (a) => dmyAny(a.reviewedAt) || '-' },
    { key: 'note', label: 'Note', value: (a) => a.note || '-', className: 'min-w-[12rem] text-sm' },
    { key: 'status', label: 'Review status', value: (a) => (a.reviewStatus === 'open' ? 'Open' : 'Reviewed'), filter: true, render: (a) => <Pill tone={a.reviewStatus === 'open' ? 'rose' : 'emerald'}>{a.reviewStatus === 'open' ? 'Open' : 'Reviewed'}</Pill> },
    {
      key: 'action', label: 'Action', value: () => '',
      render: (a) => (
        <span className="flex items-center gap-1">
          {a.documentId ? <button type="button" aria-label="Open alert document" title="Open alert document" className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary" onClick={() => void openPdf(a.documentId)}><Eye aria-hidden="true" className="size-4" /></button> : null}
          {a.reviewStatus === 'open' ? <Button size="sm" variant="outline" onClick={() => setReviewing(a)}>Review</Button> : null}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <PageTitle title="Scan History" subtitle="Verification scans for TTII-issued credentials" />
      {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {data && !data.ready ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{data.message}</p> : null}
      <p className="text-xs text-muted-foreground">City and country are not captured yet (no location service), so they show Unknown and the &quot;Multiple countries&quot; alert cannot fire.</p>
      <div className="flex flex-wrap items-end gap-3">
        <PillTab active={tab === 'all'} label="All scans" count={data?.counts.all ?? 0} onClick={() => setTab('all')} />
        <PillTab active={tab === 'alerts'} label="Alerts" count={data?.counts.openAlerts ?? 0} onClick={() => setTab('alerts')} />
        <PillTab active={tab === 'notfound'} label="Not-found attempts" count={data?.counts.notFound ?? 0} onClick={() => setTab('notfound')} />
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <div className="w-40"><Field label="From"><DmyDateInput value={from} onChange={setFrom} minYear={2024} maxYear={2100} /></Field></div>
          <div className="w-40"><Field label="To"><DmyDateInput value={to} onChange={setTo} minYear={2024} maxYear={2100} /></Field></div>
          {from || to ? <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); }}>Clear dates</Button> : null}
        </div>
      </div>
      {loading && !data ? <p className="py-12 text-center text-sm text-muted-foreground">Loading...</p> : tab === 'alerts' ? (
        <>
          <div className="flex gap-2">
            {(['open', 'reviewed', 'all'] as const).map((t) => <PillTab key={t} active={alertTab === t} label={t === 'open' ? 'Open' : t === 'reviewed' ? 'Reviewed' : 'All'} count={(data?.alerts ?? []).filter((a) => t === 'all' || a.reviewStatus === t).length} onClick={() => setAlertTab(t)} />)}
          </div>
          <CredTable key={alertTab} columns={alertColumns} rows={alerts} rowKey={(a) => a.id} empty="No alerts." noun="alerts" defaultSort={{ key: 'created', dir: 'desc' }} />
        </>
      ) : (
        <CredTable key={tab} columns={scanColumns} rows={tab === 'notfound' ? scans.filter((s) => s.status === 'not_found') : scans} rowKey={(s) => s.id} empty="No scans yet." noun="scans" searchPlaceholder="Search scans" defaultSort={{ key: 'at', dir: 'desc' }} />
      )}
      {reviewing ? <ReviewDialog api={api} token={session.token} alert={reviewing} onClose={() => setReviewing(null)} onDone={reload} /> : null}
    </div>
  );
}

export default function CredentialScansPage(props: AdminPageProps) {
  return <CredentialGate api={props.api} token={props.session.token} need="access"><ScansContent {...props} /></CredentialGate>;
}
