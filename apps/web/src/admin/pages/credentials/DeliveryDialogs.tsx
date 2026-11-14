import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AuthSession } from '@ttii/frontend-core';
import { Button } from '@/components/ui/button';
import type { AdminPortalApi } from '../../admin-portal-api.js';
import { Pill } from '../../shared/components/ui-kit.js';
import { messageFromError } from '../../shared/utils/admin-data-utils.js';
import { CredDialog, Field, areaClass, controlClass } from './CredDialogShell.js';
import {
  BATCH_TYPE_LABEL, ITEM_STATUS_LABEL, dmyAny, dmyDashTime, itemStatusTone, type BatchDetail, type BatchType, type DeliveryItem,
  type DeliveryOverview, type ItemStatus,
} from './credential-delivery-model.js';

// The Delivery Tracking dialogs (spec §1.4): Print & record, Create Dispatch
// Batch, batch detail (packing list, Mark Dispatched, history), Update delivery
// and the Lost -> Duplicate reason. Every refusal from the server is toasted.

interface Common { api: AdminPortalApi; session: AuthSession; onDone: () => void }

async function openSigned(api: AdminPortalApi, token: string, kind: 'packing-list' | 'proof' | 'document', id: number): Promise<void> {
  try {
    window.open(await api.credSignedUrl(token, kind, id), '_blank', 'noopener,noreferrer');
  } catch (error: unknown) {
    toast.error(messageFromError(error));
  }
}

export function PrintDialog({ api, session, onDone, items, onClose }: Common & { items: DeliveryItem[]; onClose: () => void }) {
  const [serials, setSerials] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submit = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await api.credPrintItems(session.token, items.map((i) => i.id), serials);
      if (!result.ok) { toast.error(result.message); return; }
      toast.success('Print recorded.');
      onDone(); onClose();
    } catch (error: unknown) { toast.error(messageFromError(error)); } finally { setBusy(false); }
  };
  return (
    <CredDialog
      open onOpenChange={(o) => { if (!o) onClose(); }} title="Print Original copies" width={620}
      description="Open each PDF to print it on security paper, then record the print. Serials must be unique."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => void submit()} disabled={busy}>{busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null} Print &amp; record</Button></>}
    >
      <ul className="flex flex-col gap-3">
        {items.map((i) => (
          <li key={i.id} className="grid gap-2 rounded-xl border border-border p-3 @xl:grid-cols-[1fr_16rem] @xl:items-end">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{i.documentNo}</p>
              <p className="truncate text-xs text-muted-foreground">{i.learner} · {i.course || 'No course'}</p>
              <button type="button" onClick={() => void openSigned(api, session.token, 'document', i.documentId)} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Open PDF <ExternalLink aria-hidden="true" className="size-3" />
              </button>
            </div>
            <Field label="Security paper serial (optional)" htmlFor={`serial-${i.id}`}>
              <input id={`serial-${i.id}`} className={controlClass} value={serials[String(i.id)] ?? ''} maxLength={60}
                onChange={(e) => setSerials((s) => ({ ...s, [String(i.id)]: e.target.value }))} />
            </Field>
          </li>
        ))}
      </ul>
    </CredDialog>
  );
}

export function BatchCreateDialog({ api, session, onDone, items, overview, onClose, onCreated }: Common & {
  items: DeliveryItem[]; overview: DeliveryOverview; onClose: () => void; onCreated: (batchId: number) => void;
}) {
  const centreIds = [...new Set(items.map((i) => i.centreId))];
  const [type, setType] = useState<BatchType>('to_centre');
  const [centreId, setCentreId] = useState<string>(centreIds.length === 1 && centreIds[0] ? String(centreIds[0]) : '');
  const [address, setAddress] = useState('');
  const [courierId, setCourierId] = useState('');
  const [awb, setAwb] = useState('');
  const [busy, setBusy] = useState(false);
  const office = type === 'office_collection';
  const suggested = useMemo(() => {
    if (type === 'to_centre') return overview.centres.find((c) => String(c.id) === centreId)?.address ?? '';
    if (type === 'to_learner') return items[0]?.learnerAddress ?? '';
    return '';
  }, [type, centreId, overview.centres, items]);
  useEffect(() => { setAddress(suggested); }, [suggested]);

  const submit = async (): Promise<void> => {
    setBusy(true);
    try {
      const result = await api.credCreateBatch(session.token, { itemIds: items.map((i) => i.id), type, centreId: Number(centreId) || 0, address, courierId: Number(courierId) || 0, awbNo: awb });
      if (!result.ok) { toast.error(result.message); return; }
      const batchId = result.data.id ?? 0;
      const list = batchId ? await api.credGeneratePackingList(session.token, batchId) : null;
      if (list && !list.ok) toast.error(`Batch packed, but the packing list failed: ${list.message}`);
      else toast.success('Batch packed; review before dispatch.');
      onDone(); onCreated(batchId); onClose();
    } catch (error: unknown) { toast.error(messageFromError(error)); } finally { setBusy(false); }
  };

  return (
    <CredDialog
      open onOpenChange={(o) => { if (!o) onClose(); }} title="Create Dispatch Batch" width={560} description={`${items.length} printed document${items.length === 1 ? '' : 's'}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => void submit()} disabled={busy}>{busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null} Pack &amp; generate list</Button></>}
    >
      <div className="grid gap-4 @xl:grid-cols-2">
        <Field label="Dispatch type" htmlFor="batch-type">
          <select id="batch-type" className={controlClass} value={type} onChange={(e) => setType(e.target.value as BatchType)}>
            {(Object.keys(BATCH_TYPE_LABEL) as BatchType[]).map((t) => <option key={t} value={t}>{BATCH_TYPE_LABEL[t]}</option>)}
          </select>
        </Field>
        {type === 'to_centre' ? (
          <Field label="Centre" htmlFor="batch-centre">
            <select id="batch-centre" className={controlClass} value={centreId} onChange={(e) => setCentreId(e.target.value)}>
              <option value="">Select centre</option>
              {overview.centres.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        ) : null}
        {!office ? (
          <>
            <div className="@xl:col-span-2">
              <Field label="Delivery address *" htmlFor="batch-address">
                <textarea id="batch-address" className={areaClass} value={address} onChange={(e) => setAddress(e.target.value)} />
              </Field>
            </div>
            <Field label="Courier partner" htmlFor="batch-courier">
              <select id="batch-courier" className={controlClass} value={courierId} onChange={(e) => setCourierId(e.target.value)}>
                <option value="">Select courier</option>
                {overview.couriers.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="AWB number *" htmlFor="batch-awb">
              <input id="batch-awb" className={controlClass} value={awb} maxLength={80} onChange={(e) => setAwb(e.target.value)} />
            </Field>
          </>
        ) : null}
      </div>
    </CredDialog>
  );
}

export function BatchDetailDialog({ api, session, onDone, batchId, onClose }: Common & { batchId: number; onClose: () => void }) {
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async (): Promise<void> => {
    try { setDetail(await api.credBatchDetail(session.token, batchId)); } catch (error: unknown) { toast.error(messageFromError(error)); }
  };
  useEffect(() => { void load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  const act = async (run: () => Promise<{ ok: boolean; message: string }>, done: string): Promise<void> => {
    setBusy(true);
    try {
      const r = await run();
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(done);
      await load(); onDone();
    } catch (error: unknown) { toast.error(messageFromError(error)); } finally { setBusy(false); }
  };

  const b = detail?.batch;
  const facts: Array<[string, string]> = b ? [
    ['Batch no.', b.batchNo], ['Type', b.typeLabel], ['Centre', b.centre || '-'], ['Address', b.address || '-'], ['Courier', b.courier || '-'], ['AWB', b.awbNo || '-'],
    ['Packed by', b.packedBy || '-'], ['Dispatched', dmyDashTime(b.dispatchedAt) || '-'], ['Status', b.status.replace('_', ' ')], ['Created', dmyDashTime(b.createdAt)], ['Received by', b.receivedBy || '-'],
  ] : [];
  return (
    <CredDialog open onOpenChange={(o) => { if (!o) onClose(); }} title={b?.batchNo ?? 'Dispatch batch'} width={760}
      footer={b ? (
        <>
          <Button variant="outline" disabled={busy} onClick={() => void (b.hasPackingList ? openSigned(api, session.token, 'packing-list', b.id) : act(() => api.credGeneratePackingList(session.token, b.id), 'Packing list generated.'))}>
            {b.hasPackingList ? 'Packing list PDF' : 'Generate packing list'}
          </Button>
          {b.status === 'packed' ? (
            <>
              {b.hasPackingList ? <Button variant="ghost" disabled={busy} onClick={() => void act(() => api.credGeneratePackingList(session.token, b.id), 'Packing list regenerated.')}>Regenerate</Button> : null}
              <Button disabled={busy || !b.hasPackingList} onClick={() => void act(() => api.credDispatchBatch(session.token, b.id), 'Batch dispatched.')}>Mark Dispatched</Button>
            </>
          ) : null}
        </>
      ) : undefined}
    >
      {!detail ? <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p> : (
        <div className="flex flex-col gap-5">
          <dl className="grid gap-x-6 gap-y-2 text-sm @xl:grid-cols-2">
            {facts.map(([k, v]) => (<div key={k} className="flex min-w-0 gap-2"><dt className="w-24 shrink-0 text-muted-foreground">{k}</dt><dd className="min-w-0 break-words font-medium">{v}</dd></div>))}
          </dl>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Documents</h3>
            <ul className="flex flex-col gap-1.5">
              {detail.items.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">{i.learner} · {i.documentNo}</span>
                  <Pill tone={itemStatusTone(i.status)}>{ITEM_STATUS_LABEL[i.status]}</Pill>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Dispatch history</h3>
            {detail.history.length === 0 ? <p className="text-xs text-muted-foreground">No history yet.</p> : (
              <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                {detail.history.map((h, idx) => (
                  <li key={`${h.at}-${idx}`}>{dmyDashTime(h.at)} · {h.user} · {h.action}{h.before || h.after ? ` · ${h.before} → ${h.after}` : ''}{h.reason ? ` · ${h.reason}` : ''}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </CredDialog>
  );
}

export function UpdateDialog({ api, session, onDone, item, onClose }: Common & { item: DeliveryItem; onClose: () => void }) {
  const [status, setStatus] = useState<ItemStatus | ''>(item.nextStatuses[0] ?? '');
  const [receiver, setReceiver] = useState('');
  const [remarks, setRemarks] = useState('');
  const [proof, setProof] = useState<{ key: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const needsProof = status === 'collected' || status === 'handed_over';
  const needsRemarks = status === 'returned' || status === 'address_issue' || status === 'lost';

  const pick = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB.'); return; }
    try { setProof(await api.credUploadProof(session.token, file)); } catch (error: unknown) { toast.error(messageFromError(error)); }
  };
  const submit = async (): Promise<void> => {
    if (!status) return;
    setBusy(true);
    try {
      const r = await api.credUpdateItem(session.token, item.id, { status, receiverName: receiver, proofKey: proof?.key ?? '', remarks });
      if (!r.ok) { toast.error(r.message); return; }
      toast.success('Delivery updated.');
      onDone(); onClose();
    } catch (error: unknown) { toast.error(messageFromError(error)); } finally { setBusy(false); }
  };
  return (
    <CredDialog open onOpenChange={(o) => { if (!o) onClose(); }} title="Update delivery" width={520} description={`${item.documentNo} · ${item.learner}`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => void submit()} disabled={busy || !status}>Save</Button></>}
    >
      <div className="flex flex-col gap-4">
        <Field label="New status" htmlFor="upd-status">
          <select id="upd-status" className={controlClass} value={status} onChange={(e) => setStatus(e.target.value as ItemStatus)}>
            {item.nextStatuses.map((s) => <option key={s} value={s}>{ITEM_STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        {needsProof ? (
          <>
            <Field label="Receiver name *" htmlFor="upd-receiver"><input id="upd-receiver" className={controlClass} value={receiver} maxLength={200} onChange={(e) => setReceiver(e.target.value)} /></Field>
            <Field label="ID photo / signed acknowledgement *" htmlFor="upd-proof" hint="JPG, PNG or PDF, up to 5 MB.">
              <input id="upd-proof" type="file" accept="image/jpeg,image/png,application/pdf" className="text-sm" onChange={(e) => void pick(e.target.files?.[0])} />
              {proof ? <span className="text-xs text-emerald-700">Uploaded: {proof.name}</span> : null}
            </Field>
          </>
        ) : null}
        <Field label={needsRemarks ? 'Remarks / exception reason *' : 'Remarks / exception reason'} htmlFor="upd-remarks">
          <textarea id="upd-remarks" className={areaClass} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </Field>
      </div>
    </CredDialog>
  );
}

export function DuplicateDialog({ api, session, onDone, item, onClose }: Common & { item: DeliveryItem; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (): Promise<void> => {
    setBusy(true);
    try {
      const r = await api.credDuplicateItem(session.token, item.id, reason);
      if (!r.ok) { toast.error(r.message); return; }
      toast.success(r.message);
      onDone(); onClose();
    } catch (error: unknown) { toast.error(messageFromError(error)); } finally { setBusy(false); }
  };
  return (
    <CredDialog open onOpenChange={(o) => { if (!o) onClose(); }} title="Duplicate copy" width={480} description={`${item.documentNo} was lost. A duplicate keeps the same document and verification IDs.`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => void submit()} disabled={busy}>Issue duplicate</Button></>}
    >
      <Field label="Duplicate reason *" htmlFor="dup-reason"><textarea id="dup-reason" className={areaClass} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </CredDialog>
  );
}

export function NoticesDialog({ notices, onClose }: { notices: Array<{ id: number; title: string; body: string; audience: string; at: string; emailStatus: string }>; onClose: () => void }) {
  return (
    <CredDialog open onOpenChange={(o) => { if (!o) onClose(); }} title="Credential notifications" width={680}>
      {notices.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No notifications yet.</p> : (
        <ul className="flex flex-col gap-2">
          {notices.map((n) => (
            <li key={n.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{n.title}</span><span className="text-xs text-muted-foreground">{dmyAny(n.at)}</span></div>
              {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
              <p className="mt-1 text-[11px] text-muted-foreground">{n.audience.replace('_', ' ')} · email {n.emailStatus.replace('_', ' ')}</p>
            </li>
          ))}
        </ul>
      )}
    </CredDialog>
  );
}
