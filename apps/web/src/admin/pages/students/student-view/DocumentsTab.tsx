import { useState } from 'react';
import { toast } from 'sonner';
import { FileClock, FileText, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { AdminDataTable } from '../../../shared/components/AdminDataTable.js';
import { Pill } from '../../../shared/components/ui-kit.js';
import { asString, formatDate } from '../../../shared/utils/admin-data-utils.js';
import { EmptyLine, Panel, SectionHeader } from './student-view-ui.js';

// Documents tab — Naji UAT 2026-05-14 behaviour unchanged: Application
// Documents, Student Documents (Replace), Pending required documents (Upload),
// one label-driven upsert dialog (upload the file, then
// /admin/students/documents upsert by label, toast the server message, reload
// the analytics payload).

const fileLink = (v: unknown) => {
  const url = asString(v);
  if (!url) return '-';
  return <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">View</a>;
};

export function DocumentsTab({
  api, token, studentId, documents, pendingRequired, applicationDocuments, onUploaded,
}: {
  api: AdminPortalApi;
  token: string;
  studentId: string;
  documents: Record<string, unknown>[];
  pendingRequired: Record<string, unknown>[];
  applicationDocuments: Record<string, unknown>[];
  onUploaded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

  const openUpload = (l: string) => { setLabel(l); setOpen(true); };
  const close = () => { setOpen(false); setLabel(''); setBusy(false); };

  const handleFile = async (file: File) => {
    if (!label.trim()) { toast.error('Label is required.'); return; }
    setBusy(true);
    try {
      const uploaded = await api.uploadFile(token, file);
      const res = await api.upsertStudentDocument(token, { studentId, label: label.trim(), file: uploaded.url });
      const msg = typeof res.message === 'string' ? res.message : 'Saved.';
      if (res.status === 1) {
        toast.success(msg);
        close();
        onUploaded();
      } else {
        toast.error(msg);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const replacing = documents.some((d) => asString(d.label).toLowerCase() === label.toLowerCase());
  const width = 'min(448px, calc(100vw - 2rem))';
  return (
    <div className="space-y-6">
      {applicationDocuments.length > 0 ? (
        <Panel>
          <SectionHeader icon={FolderOpen} title="Application Documents" description="Uploaded with the application form" />
          <AdminDataTable
            columns={[
              { key: 'name', label: 'Name', render: (v) => asString(v) || '-' },
              { key: 'url', label: 'File', render: fileLink },
              { key: 'document_type_id', label: 'Slot', render: (v) => asString(v) || '-' },
            ]}
            rows={applicationDocuments}
          />
        </Panel>
      ) : null}

      <Panel>
        <SectionHeader icon={FileText} title="Student Documents" />
        {documents.length === 0 ? (
          <EmptyLine>No documents uploaded.</EmptyLine>
        ) : (
          <AdminDataTable
            columns={[
              { key: 'label', label: 'Label', render: (v) => asString(v) || '-' },
              { key: 'file', label: 'File', render: fileLink },
              { key: 'uploaded_at', label: 'Uploaded', render: (v) => formatDate(v) },
            ]}
            rows={documents}
            actions={[{ label: 'Replace', onClick: (row) => openUpload(asString(row.label)) }]}
          />
        )}
      </Panel>

      {pendingRequired.length > 0 ? (
        <Panel>
          <SectionHeader icon={FileClock} title="Pending Documents" description="Required by the student's enrolled courses but not yet uploaded." />
          <AdminDataTable
            columns={[
              { key: 'label', label: 'Required Document', render: (v) => asString(v) || '-' },
              { key: 'course_title', label: 'For Course', render: (v) => asString(v) || '-' },
              { key: 'is_mandatory', label: 'Mandatory', render: (v) => (v ? <Pill tone="rose">Required</Pill> : <Pill tone="slate">Optional</Pill>) },
            ]}
            rows={pendingRequired}
            actions={[{ label: 'Upload', onClick: (row) => openUpload(asString(row.label)) }]}
          />
        </Panel>
      ) : null}

      <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent style={{ width, maxWidth: width }} className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 [&>*]:min-w-0">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
            <DialogTitle>{replacing ? `Replace "${label}"` : `Upload "${label}"`}</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="doc-label" className="text-xs">Label</Label>
              <Input id="doc-label" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-file" className="text-xs">File</Label>
              <Input
                id="doc-file"
                type="file"
                accept="image/*,application/pdf"
                disabled={busy}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
              />
              <p className="text-xs text-muted-foreground">PDF, JPG, or PNG. Max 10 MB.{busy ? ' Uploading…' : ''}</p>
            </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" onClick={close} disabled={busy}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
