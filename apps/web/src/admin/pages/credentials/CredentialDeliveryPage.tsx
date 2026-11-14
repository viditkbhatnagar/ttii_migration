import { useMemo, useState } from 'react';
import { Bell, Box, Copy, ExternalLink, PackageCheck, Printer, Settings2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { Pill, PageTitle } from '../../shared/components/ui-kit.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { messageFromError } from '../../shared/utils/admin-data-utils.js';
import { PillTab } from '../students/list-chrome.js';
import { CredentialGate } from './credential-gate.js';
import { DeliverySettingsDialog } from './DeliverySettingsDialog.js';
import { useCredentialPermissions } from './use-credential-permissions.js';
import { CredTable, type CredColumn } from './CredTable.js';
import {
  BatchCreateDialog, BatchDetailDialog, DuplicateDialog, NoticesDialog, PrintDialog, UpdateDialog,
} from './DeliveryDialogs.js';
import {
  BATCH_TYPE_LABEL, ITEM_STATUS_LABEL, ITEM_TABS, dmyAny, docTypeLabel, itemStatusTone, type DeliveryBatch, type DeliveryItem, type ItemTab,
} from './credential-delivery-model.js';

// Delivery Tracking (spec §1.4): the print queue, dispatch batches and the
// parcels in transit / delivered / returned, with the row actions the status
// allows. The server re-checks every move; this page only offers valid ones.

type Tab = ItemTab | 'batches';
const TAB_LABEL: Record<Tab, string> = { print: 'Print Queue', batches: 'Dispatch Batches', transit: 'In Transit', delivered: 'Delivered', returned: 'Returned' };
const TAB_ORDER: Tab[] = ['print', 'batches', 'transit', 'delivered', 'returned'];

type Dialog =
  | { kind: 'print' } | { kind: 'batch' } | { kind: 'batchDetail'; id: number }
  | { kind: 'update'; item: DeliveryItem } | { kind: 'duplicate'; item: DeliveryItem } | { kind: 'notices' } | { kind: 'settings' };

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
      {children}
    </button>
  );
}

function DeliveryContent({ api, session }: AdminPageProps) {
  const { data, loading, error, reload } = useAdminPageData(() => api.credDeliveryOverview(session.token), [api, session.token]);
  const [tab, setTab] = useState<Tab>('print');
  const [selected, setSelected] = useState<number[]>([]);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const perms = useCredentialPermissions(api, session.token, session.roleId);
  const [notices, setNotices] = useState<Awaited<ReturnType<typeof api.credNotifications>>['rows']>([]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const batches = data?.batches ?? [];
  const tabItems = useMemo(() => (tab === 'batches' ? [] : items.filter((i) => (ITEM_TABS[tab] as readonly string[]).includes(i.status))), [items, tab]);
  const count = (t: Tab): number => (t === 'batches' ? batches.length : items.filter((i) => (ITEM_TABS[t] as readonly string[]).includes(i.status)).length);
  const chosen = items.filter((i) => selected.includes(i.id));
  const allValid = (status: string): boolean => chosen.length > 0 && chosen.every((i) => i.status === status && i.documentStatus === 'valid');
  const done = (): void => { setSelected([]); reload(); };

  const open = async (kind: 'proof' | 'document', id: number): Promise<void> => {
    try { window.open(await api.credSignedUrl(session.token, kind, id), '_blank', 'noopener,noreferrer'); } catch (e: unknown) { toast.error(messageFromError(e)); }
  };
  const showNotices = async (): Promise<void> => {
    try { setNotices((await api.credNotifications(session.token)).rows); setDialog({ kind: 'notices' }); } catch (e: unknown) { toast.error(messageFromError(e)); }
  };

  const toggle = (id: number): void => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const itemColumns: Array<CredColumn<DeliveryItem>> = [
    ...(tab === 'print' ? [{
      key: 'select', label: 'Select', value: (i: DeliveryItem) => (selected.includes(i.id) ? 1 : 0), className: 'w-10',
      render: (i: DeliveryItem) => (i.documentStatus === 'valid' ? <input type="checkbox" aria-label={`Select ${i.documentNo}`} checked={selected.includes(i.id)} onChange={() => toggle(i.id)} /> : null),
    }] : []),
    { key: 'documentNo', label: 'Document no.', value: (i) => i.documentNo, filter: true },
    { key: 'learner', label: 'Learner', value: (i) => i.learner, filter: true },
    { key: 'type', label: 'Type', value: (i) => docTypeLabel(i.docType), filter: true },
    { key: 'course', label: 'Course', value: (i) => i.course, filter: true },
    { key: 'centre', label: 'Centre', value: (i) => i.centre || '-', filter: true },
    { key: 'batch', label: 'Dispatch batch', value: (i) => i.batchNo || '-', filter: true },
    { key: 'awb', label: 'AWB', value: (i) => i.awbNo || '-' },
    { key: 'dispatched', label: 'Dispatched', value: (i) => i.dispatchedAt ?? '', text: (i) => dmyAny(i.dispatchedAt) || '-' },
    { key: 'serial', label: 'Security serial', value: (i) => i.securitySerial || '-' },
    { key: 'receiver', label: 'Receiver', value: (i) => i.receiver || '-' },
    { key: 'deliveredAt', label: 'Delivered at', value: (i) => i.deliveredAt ?? '', text: (i) => dmyAny(i.deliveredAt) || '-' },
    { key: 'remarks', label: 'Remarks', value: (i) => i.remarks || '-', className: 'max-w-[14rem] truncate text-sm' },
    {
      key: 'proof', label: 'Proof', value: (i) => (i.hasProof ? 'Yes' : '-'),
      render: (i) => (i.hasProof ? <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => void open('proof', i.id)}>View</button> : <span className="text-muted-foreground">-</span>),
    },
    {
      key: 'status', label: 'Status', value: (i) => ITEM_STATUS_LABEL[i.status], filter: true,
      render: (i) => (
        <span className="flex flex-wrap items-center gap-1">
          <Pill tone={itemStatusTone(i.status)}>{ITEM_STATUS_LABEL[i.status]}</Pill>
          {i.overdue ? <Pill tone="rose">Overdue</Pill> : null}
          {i.documentStatus !== 'valid' ? <Pill tone="slate">{i.documentStatus}</Pill> : null}
        </span>
      ),
    },
    {
      key: 'actions', label: 'Action', value: () => '',
      render: (i) => (
        <span className="flex items-center gap-0.5">
          {i.trackingUrl && i.documentStatus === 'valid' ? <a href={i.trackingUrl} target="_blank" rel="noopener noreferrer" aria-label="Track parcel" title="Track parcel" className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"><ExternalLink aria-hidden="true" className="size-4" /></a> : null}
          {i.status === 'print_queued' && i.documentStatus === 'valid' ? <IconAction label="Print document" onClick={() => { setSelected([i.id]); setDialog({ kind: 'print' }); }}><Printer aria-hidden="true" className="size-4" /></IconAction> : null}
          {i.status === 'printed' && i.documentStatus === 'valid' ? <IconAction label="Pack document" onClick={() => { setSelected([i.id]); setDialog({ kind: 'batch' }); }}><Box aria-hidden="true" className="size-4" /></IconAction> : null}
          {i.nextStatuses.length > 0 ? <IconAction label="Update delivery" onClick={() => setDialog({ kind: 'update', item: i })}><Truck aria-hidden="true" className="size-4" /></IconAction> : null}
          {i.status === 'lost' && i.documentStatus === 'valid' ? <IconAction label="Duplicate" onClick={() => setDialog({ kind: 'duplicate', item: i })}><Copy aria-hidden="true" className="size-4" /></IconAction> : null}
        </span>
      ),
    },
  ];

  const batchColumns: Array<CredColumn<DeliveryBatch>> = [
    { key: 'batchNo', label: 'Batch no.', value: (b) => b.batchNo },
    { key: 'type', label: 'Type', value: (b) => BATCH_TYPE_LABEL[b.type], filter: true },
    { key: 'centre', label: 'Centre', value: (b) => b.centre || '-', filter: true },
    { key: 'address', label: 'Address', value: (b) => b.address || '-', className: 'max-w-[14rem] truncate text-sm' },
    { key: 'courier', label: 'Courier', value: (b) => b.courier || '-', filter: true },
    { key: 'awb', label: 'AWB', value: (b) => b.awbNo || '-' },
    { key: 'packedBy', label: 'Packed by', value: (b) => b.packedBy || '-' },
    { key: 'dispatched', label: 'Dispatched', value: (b) => b.dispatchedAt ?? '', text: (b) => dmyAny(b.dispatchedAt) || '-' },
    { key: 'status', label: 'Status', value: (b) => b.status.replace('_', ' '), filter: true, render: (b) => <Pill tone={b.status === 'delivered' ? 'emerald' : b.status === 'packed' ? 'amber' : 'blue'}>{b.status.replace('_', ' ')}</Pill> },
    { key: 'created', label: 'Created', value: (b) => b.createdAt, text: (b) => dmyAny(b.createdAt) },
    { key: 'receivedBy', label: 'Received by', value: (b) => b.receivedBy || '-' },
    { key: 'actions', label: 'Action', value: () => '', render: (b) => <IconAction label="View dispatch batch" onClick={() => setDialog({ kind: 'batchDetail', id: b.id })}><PackageCheck aria-hidden="true" className="size-4" /></IconAction> },
  ];

  const common = { api, session, onDone: done };
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <PageTitle
        title="Delivery Tracking" subtitle="Print dispatches and credential deliveries"
        actions={(
          <>
            <Button variant="outline" className="gap-1.5" onClick={() => void showNotices()}><Bell aria-hidden="true" className="size-4" /> Notifications</Button>
            {perms?.settings ? <Button variant="outline" className="gap-1.5" onClick={() => setDialog({ kind: 'settings' })}><Settings2 aria-hidden="true" className="size-4" /> Delivery settings</Button> : null}
          </>
        )}
      />
      {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {data && !data.ready ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{data.message}</p> : null}
      <div className="flex flex-wrap gap-2">
        {TAB_ORDER.map((t) => <PillTab key={t} active={tab === t} label={TAB_LABEL[t]} count={count(t)} onClick={() => setTab(t)} />)}
      </div>
      {loading && !data ? <p className="py-12 text-center text-sm text-muted-foreground">Loading...</p> : tab === 'batches' ? (
        <CredTable columns={batchColumns} rows={batches} rowKey={(b) => b.id} empty="No dispatch batches yet." searchPlaceholder="Search batches" noun="batches" exportName="dispatch-batches" canExport={false} defaultSort={{ key: 'created', dir: 'desc' }} />
      ) : (
        <CredTable
          key={tab} columns={itemColumns} rows={tabItems} rowKey={(i) => i.id} empty="Nothing here yet." searchPlaceholder="Search documents" noun="documents"
          toolbar={tab === 'print' ? (
            <>
              <Button size="sm" variant="outline" className="gap-1.5" disabled={!allValid('print_queued')} onClick={() => setDialog({ kind: 'print' })}><Printer aria-hidden="true" className="size-4" /> Bulk print</Button>
              <Button size="sm" className="gap-1.5" disabled={!allValid('printed')} onClick={() => setDialog({ kind: 'batch' })}><Box aria-hidden="true" className="size-4" /> Create Dispatch Batch</Button>
            </>
          ) : null}
        />
      )}
      {dialog?.kind === 'print' ? <PrintDialog {...common} items={chosen} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'batch' && data ? <BatchCreateDialog {...common} items={chosen} overview={data} onClose={() => setDialog(null)} onCreated={(id) => { setTab('batches'); if (id) setDialog({ kind: 'batchDetail', id }); }} /> : null}
      {dialog?.kind === 'batchDetail' ? <BatchDetailDialog {...common} batchId={dialog.id} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'update' ? <UpdateDialog {...common} item={dialog.item} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'duplicate' ? <DuplicateDialog {...common} item={dialog.item} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'notices' ? <NoticesDialog notices={notices} onClose={() => setDialog(null)} /> : null}
      {dialog?.kind === 'settings' ? <DeliverySettingsDialog open onClose={() => setDialog(null)} onSaved={reload} api={api} token={session.token} /> : null}
    </div>
  );
}

export default function CredentialDeliveryPage(props: AdminPageProps) {
  return <CredentialGate api={props.api} token={props.session.token} need="access"><DeliveryContent {...props} /></CredentialGate>;
}
