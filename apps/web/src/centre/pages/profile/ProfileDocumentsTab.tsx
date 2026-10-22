import { useRef, useState } from 'react';
import { Download, FileCheck2, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { AuthSession } from '@ttii/frontend-core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { CentrePortalApi } from '../../centre-portal-api.js';
import { formatYmd } from '../../layout/centre-shell-model.js';
import { CHECKLIST_DOC_TYPE, DOC_ACCEPT, fileProblem, onFileCount, type ProfileData, type ProfileDocument } from './centre-profile-model.js';

interface Props { api: CentrePortalApi; session: AuthSession; profile: ProfileData; onChanged: () => void }

export function ProfileDocumentsTab({ api, session, profile, onChanged }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<ProfileDocument | null>(null);
  const [busyKey, setBusyKey] = useState('');
  const { onFile, total } = onFileCount(profile.documents);

  const pick = (doc: ProfileDocument) => {
    setTarget(doc);
    input.current?.click();
  };

  const onFilePicked = async (file: File | undefined) => {
    const doc = target;
    if (input.current) input.current.value = '';
    if (!file || !doc) return;
    const problem = fileProblem(file);
    if (problem) { toast.error(problem); return; }
    setBusyKey(doc.key);
    try {
      const uploaded = await api.uploadCentreFile(session.token, file);
      const docType = CHECKLIST_DOC_TYPE[doc.checklist] ?? 'Other Document';
      const result = await api.addPortalDocument(session.token, { docType, title: file.name, fileUrl: uploaded.url });
      if (result.status !== 1) throw new Error(typeof result.message === 'string' ? result.message : 'The document could not be saved.');
      toast.success('Document uploaded');
      onChanged();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'The document could not be uploaded.');
    } finally {
      setBusyKey('');
    }
  };

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="border-b border-border p-4">
        <p className="font-semibold">KYC &amp; Compliance Documents</p>
        <p className="text-xs text-muted-foreground">{onFile} of {total} on file</p>
      </div>
      <input ref={input} type="file" accept={DOC_ACCEPT} className="hidden" aria-label="Choose a document to upload" onChange={(e) => void onFilePicked(e.target.files?.[0])} />
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow><TableHead>Document</TableHead><TableHead>File</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {profile.documents.map((d) => (
              <TableRow key={d.key}>
                <TableCell className="font-medium"><span className="flex items-center gap-2"><FileCheck2 aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />{d.type}</span></TableCell>
                <TableCell className="max-w-56 truncate text-xs text-muted-foreground">{d.name || '—'}</TableCell>
                <TableCell className="text-xs">{d.date ? formatYmd(d.date) : '—'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn('border-transparent', d.onFile ? 'bg-success-soft text-success' : 'bg-destructive/10 text-destructive')}>{d.onFile ? 'On file' : 'Missing'}</Badge>
                </TableCell>
                <TableCell className="space-x-1 text-right">
                  {d.url ? (
                    <Button asChild variant="ghost" size="sm" aria-label={`Download ${d.type}`}>
                      <a href={d.url} target="_blank" rel="noopener noreferrer"><Download aria-hidden="true" className="h-4 w-4" /></a>
                    </Button>
                  ) : null}
                  {d.uploadable ? (
                    <Button variant="outline" size="sm" className="gap-1" disabled={busyKey !== ''} onClick={() => pick(d)}>
                      {busyKey === d.key ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Upload aria-hidden="true" className="h-3.5 w-3.5" />}
                      {d.onFile ? 'Replace' : 'Upload'}
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="border-t border-border p-4 text-xs text-muted-foreground">PDF or image, up to 10 MB. Documents TTII holds on record cannot be replaced here; contact TTII support to change them.</p>
    </Card>
  );
}
