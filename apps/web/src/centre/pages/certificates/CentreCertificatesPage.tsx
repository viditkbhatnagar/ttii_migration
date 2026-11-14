import { useState } from 'react';
import { Award, Download, PackageCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageLoader } from '@/components/ui/page-loader';
import { usePortalThemeClass } from '@/lib/portal-theme';
import { cn } from '@/lib/utils';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import type { CentrePortalApi } from '../../centre-portal-api.js';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { messageFromError } from '../../../admin/shared/utils/admin-data-utils.js';
import { CredDialog, Field, controlClass } from '../../../admin/pages/credentials/CredDialogShell.js';
import {
  ITEM_STATUS_LABEL, docTypeLabel, dmyAny, dmyDash, type CentreCertificatesData,
} from '../../../admin/pages/credentials/credential-delivery-model.js';
import { CARD, EmptyState, ErrorState, PageHeader, PillButton } from '../list-kit/ListKit.js';

// Centre portal -> Certificates (spec §1.10): the centre's learners' documents
// and parcels. The centre acknowledges a parcel that reached it and hands each
// document to its learner with a receiver name and an ID / signature proof.
// Everything is scoped server-side to the caller's own centre.

type Handover = CentreCertificatesData['handovers'][number];
type Tab = 'all' | 'awaiting' | 'done';

interface Ack { kind: 'ack'; batchId: number; batchNo: string }
interface Hand { kind: 'hand'; item: Handover }

function ReceiptDialog({ api, token, target, onClose, onDone, themeClass }: {
  api: CentrePortalApi; token: string; target: Ack | Hand; onClose: () => void; onDone: () => void; themeClass: string;
}) {
  const [receiver, setReceiver] = useState('');
  const [proof, setProof] = useState<{ key: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const isHand = target.kind === 'hand';
  const pick = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB.'); return; }
    try { setProof(await api.credCentreUploadProof(token, file)); } catch (e: unknown) { toast.error(messageFromError(e)); }
  };
  const submit = async (): Promise<void> => {
    setBusy(true);
    try {
      const r = target.kind === 'ack'
        ? await api.credCentreAcknowledge(token, target.batchId, receiver)
        : await api.credCentreHandover(token, target.item.id, receiver, proof?.key ?? '');
      if (!r.ok) { toast.error(r.message); return; }
      toast.success('Receipt recorded.');
      onDone(); onClose();
    } catch (e: unknown) { toast.error(messageFromError(e)); } finally { setBusy(false); }
  };
  return (
    <CredDialog open onOpenChange={(o) => { if (!o) onClose(); }} className={themeClass} width={480}
      title={isHand ? 'Mark handed over' : 'Acknowledge parcel received'} description={target.kind === 'ack' ? target.batchNo : `${target.item.documentNo} · ${target.item.learner}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={busy} onClick={() => void submit()}>Confirm receipt</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Receiver name *" htmlFor="ctr-receiver"><input id="ctr-receiver" className={controlClass} value={receiver} maxLength={200} onChange={(e) => setReceiver(e.target.value)} /></Field>
        {isHand ? (
          <Field label="ID photo / signed acknowledgement *" htmlFor="ctr-proof" hint="JPG, PNG or PDF, up to 5 MB.">
            <input id="ctr-proof" type="file" accept="image/jpeg,image/png,application/pdf" className="text-sm" onChange={(e) => void pick(e.target.files?.[0])} />
            {proof ? <span className="text-xs text-emerald-700">Uploaded: {proof.name}</span> : null}
          </Field>
        ) : null}
      </div>
    </CredDialog>
  );
}

export default function CentreCertificatesPage({ api, session }: CentrePageProps) {
  const themeClass = usePortalThemeClass();
  const { data, loading, error, reload } = useAdminPageData(() => api.credCentreOverview(session.token), [api, session.token]);
  const [tab, setTab] = useState<Tab>('all');
  const [target, setTarget] = useState<Ack | Hand | null>(null);

  const open = async (kind: 'document' | 'proof', id: number): Promise<void> => {
    try { window.open(await api.credCentreSignedUrl(session.token, kind, id), '_blank', 'noopener,noreferrer'); } catch (e: unknown) { toast.error(messageFromError(e)); }
  };

  if (loading && !data) return <PageLoader label="Loading certificates..." />;
  if (error && !data) return <div className="py-2"><ErrorState message={error} onRetry={reload} /></div>;
  const d: CentreCertificatesData = data ?? { ready: false, message: '', centre: '', documents: [], parcels: [], handovers: [], notices: [] };
  const rows = d.handovers.filter((h) => tab === 'all' || (tab === 'awaiting' ? h.status === 'delivered' : h.status === 'handed_over'));
  const count = (t: Tab): number => d.handovers.filter((h) => t === 'all' || (t === 'awaiting' ? h.status === 'delivered' : h.status === 'handed_over')).length;

  return (
    <div className="space-y-6 py-2">
      <PageHeader title="Certificates" subtitle="Learner documents and parcels for your centre" />
      {!d.ready && d.message ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{d.message}</p> : null}

      <section aria-labelledby="ctr-parcels">
        <h2 id="ctr-parcels" className="mb-3 text-base font-semibold">Parcels</h2>
        {d.parcels.length === 0 ? <EmptyState icon={PackageCheck} title="No parcels yet" body="Parcels sent to your centre appear here once TTII dispatches them." /> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {d.parcels.map((p) => (
              <Card key={p.id} className={cn(CARD, 'gap-2 p-4')}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{p.batchNo}</p>
                  <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold">{p.acknowledgedAt ? 'Received' : 'Dispatched'}</span>
                </div>
                <p className="text-xs text-muted-foreground">AWB {p.awbNo || '-'} · {p.courier || 'Courier'} · {p.itemCount} document{p.itemCount === 1 ? '' : 's'}</p>
                <p className="text-xs text-muted-foreground">Dispatched {dmyAny(p.dispatchedAt)}</p>
                {p.trackingUrl ? <a href={p.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">Track parcel</a> : null}
                {p.acknowledgedAt ? <p className="text-xs text-emerald-700">Received by {p.receivedBy || 'your centre'} on {dmyAny(p.acknowledgedAt)}</p> : (
                  <Button size="sm" onClick={() => setTarget({ kind: 'ack', batchId: p.id, batchNo: p.batchNo })}>Acknowledge parcel received</Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="ctr-handovers">
        <h2 id="ctr-handovers" className="mb-3 text-base font-semibold">Learner handovers</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          <PillButton active={tab === 'all'} onClick={() => setTab('all')} label="All" count={count('all')} />
          <PillButton active={tab === 'awaiting'} onClick={() => setTab('awaiting')} label="Awaiting handover" count={count('awaiting')} />
          <PillButton active={tab === 'done'} onClick={() => setTab('done')} label="Handed over" count={count('done')} />
        </div>
        <Card className={cn(CARD, 'gap-0 overflow-hidden p-0')}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>{['Learner', 'Document no.', 'Course', 'Parcel', 'Status', 'Receiver', 'Delivered at', 'Acknowledgement', 'Action'].map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No handovers in this view.</td></tr> : rows.map((h) => (
                  <tr key={h.id} className="border-t border-border/70">
                    <td className="px-4 py-2.5">{h.learner}</td><td className="px-4 py-2.5">{h.documentNo}</td><td className="px-4 py-2.5">{h.course || '-'}</td>
                    <td className="px-4 py-2.5">{h.batchNo}</td><td className="px-4 py-2.5">{ITEM_STATUS_LABEL[h.status]}</td><td className="px-4 py-2.5">{h.receiver || '-'}</td>
                    <td className="px-4 py-2.5">{dmyAny(h.deliveredAt) || '-'}</td>
                    <td className="px-4 py-2.5">{h.hasProof ? <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => void open('proof', h.id)}>View</button> : '-'}</td>
                    <td className="px-4 py-2.5">{h.canHandOver ? <Button size="sm" variant="outline" onClick={() => setTarget({ kind: 'hand', item: h })}>Mark handed over</Button> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section aria-labelledby="ctr-docs">
        <h2 id="ctr-docs" className="mb-3 text-base font-semibold">Learner documents</h2>
        {d.documents.length === 0 ? <EmptyState icon={Award} title="No documents yet" body="Credentials issued to your learners appear here." /> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {d.documents.map((doc) => (
              <Card key={doc.id} className={cn(CARD, 'gap-1.5 p-4')}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{docTypeLabel(doc.docType)}</p>
                  <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', doc.status === 'valid' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}>{doc.status === 'valid' ? 'Valid' : 'Revoked'}</span>
                </div>
                <p className="text-sm">{doc.learner}</p>
                <p className="text-xs text-muted-foreground">{doc.course || 'No course'}</p>
                <p className="text-xs text-muted-foreground">{doc.documentNo} · {dmyDash(doc.issueDate)}</p>
                {doc.physicalStatus ? <p className="text-xs text-muted-foreground">Physical copy: {ITEM_STATUS_LABEL[doc.physicalStatus as keyof typeof ITEM_STATUS_LABEL] ?? doc.physicalStatus}</p> : null}
                {doc.canDownload ? <Button size="sm" variant="outline" className="mt-1 w-fit gap-1.5" onClick={() => void open('document', doc.id)}><Download aria-hidden="true" className="size-4" /> Download PDF</Button> : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      {d.notices.length > 0 ? (
        <section aria-labelledby="ctr-notices">
          <h2 id="ctr-notices" className="mb-3 text-base font-semibold">Notifications</h2>
          <ul className="flex flex-col gap-2">{d.notices.slice(0, 10).map((n) => <li key={n.id} className="rounded-lg border border-border/70 bg-card p-3 text-sm"><span className="font-medium">{n.title}</span> <span className="text-xs text-muted-foreground">{dmyAny(n.at)}</span>{n.body ? <p className="text-xs text-muted-foreground">{n.body}</p> : null}</li>)}</ul>
        </section>
      ) : null}
      {target ? <ReceiptDialog api={api} token={session.token} target={target} onClose={() => setTarget(null)} onDone={reload} themeClass={themeClass} /> : null}
    </div>
  );
}
