import { useState } from 'react';
import { Award, Download, ExternalLink, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StudentLoader as PageLoader } from '@/student/components/StudentLoader';
import { cn } from '@/lib/utils';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import type { LearnerCredentialDocument, LearnerCredentialPending } from '../../student-portal-api.js';
import type { StudentPageProps } from '../../routing/student-routes.js';

// My Certificates: the learner's own issued credentials (download, share link,
// track the physical copy) and what is still pending, with the printed
// name/address confirmation. Data: /api/student/certificates/*.

const DIALOG_WIDTH = 'min(480px, calc(100vw - 2rem))';

const dmy = (value: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : value;
};

function documentPill(doc: LearnerCredentialDocument): { label: string; tone: string } {
  if (doc.status === 'revoked') return { label: 'Revoked', tone: 'bg-red-50 text-red-700' };
  if (doc.physicalStatus === 'Delivered') return { label: 'Delivered', tone: 'bg-emerald-50 text-emerald-700' };
  if (doc.physicalStatus === 'Dispatched') return { label: 'Dispatched', tone: 'bg-sky-50 text-sky-700' };
  return { label: 'Issued', tone: 'bg-violet-50 text-violet-700' };
}

function pendingTone(item: LearnerCredentialPending): string {
  if (item.label === 'On Hold') return 'bg-amber-50 text-amber-800';
  if (item.label === 'Not eligible yet') return 'bg-slate-100 text-slate-700';
  return 'bg-sky-50 text-sky-700';
}

function Pill({ tone, children }: { tone: string; children: string }) {
  return <span className={cn('inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold', tone)}>{children}</span>;
}

function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function ConfirmDialog({
  item, onClose, onSave,
}: { item: LearnerCredentialPending | null; onClose: () => void; onSave: (item: LearnerCredentialPending, name: string, address: string) => Promise<void> }) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent style={{ width: DIALOG_WIDTH, maxWidth: DIALOG_WIDTH }}>
        {item && <ConfirmForm key={item.enrolId} item={item} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmForm({ item, onSave }: { item: LearnerCredentialPending; onSave: (item: LearnerCredentialPending, name: string, address: string) => Promise<void> }) {
  const [name, setName] = useState(item.printedName || item.defaultName);
  const [address, setAddress] = useState(item.address);
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!name.trim() || !address.trim()) {
      toast.error('Confirm your printed name and delivery address.');
      return;
    }
    setSaving(true);
    try {
      await onSave(item, name.trim(), address.trim());
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle>Confirm printed details</DialogTitle>
      </DialogHeader>
      <form
        className="space-y-4"
        onSubmit={(e) => { e.preventDefault(); void submit(); }}
      >
        <p className="text-sm text-student-muted">{item.course}</p>
        <label className="block text-sm font-medium text-student-text">
          Name spelling (as it will print) *
          <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
        </label>
        <label className="block text-sm font-medium text-student-text">
          Delivery address *
          <textarea
            className="mt-1.5 min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={500}
          />
        </label>
        <Button type="submit" disabled={saving} className="w-full">{saving ? 'Saving...' : 'Confirm details'}</Button>
      </form>
    </>
  );
}

function PendingCard({ item, onConfirm }: { item: LearnerCredentialPending; onConfirm: (item: LearnerCredentialPending) => void }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 break-words text-base font-semibold text-student-text">{item.course}</h3>
        <Pill tone={pendingTone(item)}>{item.label}</Pill>
      </div>
      {item.message && <p className="mt-2 text-sm text-student-muted">{item.message}</p>}
      {item.canConfirm && (
        <div className="mt-4 space-y-3">
          {item.nameConfirmed && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="font-semibold">Name confirmed</p>
              <p className="mt-1 break-words">{item.printedName}</p>
              <p className="break-words whitespace-pre-line">{item.address}</p>
            </div>
          )}
          <Button type="button" variant="outline" onClick={() => onConfirm(item)}>
            {item.nameConfirmed ? 'Update confirmation' : 'Confirm printed name & address'}
          </Button>
        </div>
      )}
    </article>
  );
}

function DocumentCard({ doc, busy, onDownload, onCopy }: { doc: LearnerCredentialDocument; busy: boolean; onDownload: (d: LearnerCredentialDocument) => void; onCopy: (d: LearnerCredentialDocument) => void }) {
  const pill = documentPill(doc);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="min-w-0 text-base font-semibold text-student-text">{doc.docTypeLabel}</h3>
        <Pill tone={pill.tone}>{pill.label}</Pill>
      </div>
      <p className="mt-1 break-words text-sm text-student-text">{doc.learner}</p>
      <p className="break-words text-sm text-student-muted">{doc.course}</p>
      <p className="mt-2 break-words text-sm text-student-muted">{doc.documentNo} · {dmy(doc.issueDate)}</p>
      <p className="text-sm text-student-muted">Physical copy: {doc.physicalStatus}</p>
      <p className="text-sm text-student-muted">First download: {doc.firstDownloadAt ? dmy(doc.firstDownloadAt) : 'Not yet'}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {doc.status === 'valid' && (
          <Button type="button" size="sm" disabled={busy} onClick={() => onDownload(doc)}>
            <Download aria-hidden="true" className="size-4" />
            {busy ? 'Preparing...' : 'Download PDF'}
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" onClick={() => onCopy(doc)}>
          <Link2 aria-hidden="true" className="size-4" />
          Verification link
        </Button>
        {doc.trackingUrl && (
          <Button asChild size="sm" variant="outline">
            <a href={doc.trackingUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" className="size-4" />
              Track
            </a>
          </Button>
        )}
      </div>
    </article>
  );
}

export default function StudentCertificatesPage({ api, session }: StudentPageProps) {
  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadCertificates(session.token),
    [api, session.token],
    `student:certificates:${session.userId}`,
  );
  const [confirming, setConfirming] = useState<LearnerCredentialPending | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const download = async (doc: LearnerCredentialDocument) => {
    setDownloadingId(doc.id);
    try {
      const blob = await api.fetchCertificatePdf(session.token, doc.id);
      saveBlob(blob, `${doc.documentNo.replace(/[^A-Za-z0-9._-]+/g, '-') || 'certificate'}.pdf`);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The PDF could not be downloaded.');
    } finally {
      setDownloadingId(null);
    }
  };

  const copyLink = async (doc: LearnerCredentialDocument) => {
    const ok = await copyText(`${window.location.origin}/v/${doc.verificationId}`);
    if (ok) toast.success('Verification link copied.');
    else toast.error('Could not copy the link.');
  };

  const saveConfirmation = async (item: LearnerCredentialPending, printedName: string, address: string) => {
    try {
      await api.confirmCertificateDetails(session.token, { enrolId: item.enrolId, printedName, address });
      toast.success('Details confirmed.');
      setConfirming(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your details.');
    }
  };

  const header = (
    <div>
      <h1 className="text-2xl font-bold text-student-text">My Certificates</h1>
      <p className="mt-1 text-sm text-student-muted">Your TTII certificates and marksheets</p>
    </div>
  );

  if (loading) return <PageLoader label="Loading your certificates..." />;
  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={reload}>Retry</Button>
        </div>
      </div>
    );
  }

  const documents = data?.documents ?? [];
  const pending = data?.pending ?? [];

  return (
    <div className="space-y-6">
      {header}
      {documents.length === 0 && pending.length === 0 && (
        <div role="status" className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Award aria-hidden="true" className="mx-auto mb-4 size-12 text-slate-300" />
          <p className="text-sm text-slate-600">Once your certificate is issued, you will find it here.</p>
        </div>
      )}
      {pending.length > 0 && (
        <section aria-labelledby="cert-pending" className="space-y-3">
          <h2 id="cert-pending" className="text-lg font-semibold text-student-text">Not yet issued</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {pending.map((item) => <PendingCard key={item.enrolId} item={item} onConfirm={setConfirming} />)}
          </div>
        </section>
      )}
      {documents.length > 0 && (
        <section aria-labelledby="cert-docs" className="space-y-3">
          <h2 id="cert-docs" className="text-lg font-semibold text-student-text">Documents</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} busy={downloadingId === doc.id} onDownload={(d) => void download(d)} onCopy={(d) => void copyLink(d)} />
            ))}
          </div>
        </section>
      )}
      <ConfirmDialog item={confirming} onClose={() => setConfirming(null)} onSave={saveConfirmation} />
    </div>
  );
}
