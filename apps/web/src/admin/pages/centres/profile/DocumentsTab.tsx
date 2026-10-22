import { useMemo, useRef, useState } from 'react';
import { Eye, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useConfirm } from '@/components/confirm-dialog';
import type { AdminPortalApi } from '../../../admin-portal-api.js';
import { Pill } from '../../../shared/components/ui-kit.js';
import { nextSort, type SortDir } from '../../cohorts/list-model.js';
import { SortHead } from '../../students/list-chrome.js';
import { filterDocs, fmtDay, sortDocs, type DocRow, type DocSortKey } from '../centre-profile-model.js';
import { DocViewerDialog, SearchBox, type ViewedDocument } from '../centre-ui.js';
import { TAB_CARD, TabEmpty } from './profile-ui.js';

// "Documents & Certificates": the registration and affiliation documents, the
// Aadhaar / Passport and PAN uploads, every file uploaded here
// (centre_documents) and the affiliation agreements / certificates on record.
// Upload takes several files at once; only uploaded files can be deleted here
// (the others change through Edit Centre or Affiliation & Agreements).

const DOC_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

export function DocumentsTab({
  api, token, centreId, centreName, documents, canUpload, onChanged,
}: {
  api: AdminPortalApi;
  token: string;
  centreId: string;
  centreName: string;
  documents: DocRow[];
  /** false before the 2026-10-22 migration (centre_documents missing). */
  canUpload: boolean;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: DocSortKey; dir: SortDir }>({ key: 'type', dir: 'asc' });
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<ViewedDocument | null>(null);
  const rows = useMemo(() => sortDocs(filterDocs(documents, search), sort.key, sort.dir), [documents, search, sort]);
  const onSort = (k: DocSortKey) => setSort((s) => nextSort(s, k));

  const upload = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    const tooBig = list.filter((f) => f.size > DOC_UPLOAD_MAX_BYTES);
    if (tooBig.length > 0) toast.error(`${tooBig.map((f) => f.name).join(', ')}: each file must be under 25 MB`);
    const ok = list.filter((f) => f.size <= DOC_UPLOAD_MAX_BYTES);
    if (ok.length === 0) return;
    setUploading(true);
    let added = 0;
    try {
      for (const file of ok) {
        try {
          const { url } = await api.uploadFile(token, file);
          const res = await api.addCentreDocument(token, { centreId, title: file.name, fileUrl: url });
          if (!res.ok) { toast.error(res.message); break; }
          added += 1;
        } catch (err) {
          toast.error(`${file.name}: ${err instanceof Error ? err.message : 'upload failed'}`);
        }
      }
    } finally {
      setUploading(false);
      if (added > 0) {
        toast.success(`${added} document${added > 1 ? 's' : ''} uploaded`);
        onChanged();
      }
    }
  };

  const remove = async (d: DocRow) => {
    const yes = await confirm({
      title: `Delete "${d.name}"?`,
      description: 'The document is removed from this centre.',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!yes) return;
    try {
      const res = await api.deleteCentreDocument(token, d.id);
      if (!res.ok) { toast.error(res.message); return; }
      toast.success(res.message);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete the document.');
    }
  };

  return (
    <Card className={TAB_CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <h3 className="text-base font-semibold">Documents &amp; Certificates</h3>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <SearchBox value={search} onChange={setSearch} placeholder="Search documents…" className="min-w-0 flex-1 sm:flex-none" />
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            aria-label="Choose documents to upload"
            onChange={(e) => { void upload(e.target.files); e.target.value = ''; }}
          />
          <Button
            size="sm"
            className="h-9 gap-1.5"
            disabled={!canUpload || uploading}
            title={canUpload ? 'Upload one or more files' : 'Centre details storage is not set up yet'}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Upload aria-hidden="true" className="size-4" />}
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <TabEmpty icon={FileText} text="No documents match your search." />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <SortHead label="Document" k="name" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Type" k="type" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Date" k="date" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <SortHead label="Status" k="status" sortKey={sort.key} dir={sort.dir} onSort={onSort} />
                <TableHead className="text-right text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.key}>
                  <TableCell className="text-sm font-medium">
                    <span className="inline-flex items-center gap-2">
                      <FileText aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                      <span className="break-all">{d.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d.type}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDay(d.date)}</TableCell>
                  <TableCell>
                    <Pill tone={d.url ? 'emerald' : 'slate'} className="px-2 py-0.5 text-[11px]">{d.url ? 'On File' : 'Pending'}</Pill>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5"
                      disabled={!d.url}
                      onClick={() => setViewing({ title: d.name, subtitle: `${d.type} · ${centreName}`, url: d.url })}
                    >
                      <Eye aria-hidden="true" className="size-4" /> View
                    </Button>
                    {d.deletable ? (
                      <Button size="icon" variant="ghost" className="size-8 text-rose-600 hover:text-rose-700" aria-label={`Delete ${d.name}`} onClick={() => void remove(d)}>
                        <Trash2 aria-hidden="true" className="size-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <DocViewerDialog doc={viewing} onClose={() => setViewing(null)} />
    </Card>
  );
}
