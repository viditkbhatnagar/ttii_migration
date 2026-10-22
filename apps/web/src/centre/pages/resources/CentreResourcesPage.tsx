import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChevronRight, Download, FileArchive, FileImage, FileText, FolderOpen, FolderPlus, Loader2, Search, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageLoader } from '@/components/ui/page-loader';
import { usePortalThemeClass } from '@/lib/portal-theme';
import { cn } from '@/lib/utils';
import { messageFromError } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';
import { fmtDay } from '../kit/format.js';
import { CentrePageHeader, NoticeCard, PillTabs } from '../kit/page-kit.js';
import { filterFiles, filterFolders, fileSize, formatOf, kindOf, toResourceListing, type ResourceFile, type ResourceListing } from './resources-model.js';

interface Crumb { id: string; name: string }
const ROOT: Crumb = { id: '', name: 'All resources' };
const KIND_ICON = { image: FileImage, archive: FileArchive, document: FileText } as const;

function FileCard({ file }: { file: ResourceFile }) {
  const Icon = KIND_ICON[kindOf(file.format)];
  return (
    <Card className="flex flex-col gap-4 p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon className="h-5 w-5" /></div>
        <p className="min-w-0 break-words font-semibold leading-snug">{file.name}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {file.format && <Badge variant="outline">{file.format}</Badge>}
        <span>{fileSize(file.sizeBytes)}</span>
        <span className="ml-auto">{fmtDay(file.addedYmd)}</span>
      </div>
      {file.href ? (
        <Button asChild variant="outline" className="mt-auto gap-1.5">
          <a href={file.href} target="_blank" rel="noopener noreferrer" download><Download className="h-4 w-4" />Download</a>
        </Button>
      ) : (
        <Button variant="outline" className="mt-auto gap-1.5" disabled><Download className="h-4 w-4" />Not available</Button>
      )}
    </Card>
  );
}

export default function CentreResourcesPage({ api, session }: CentrePageProps) {
  const portalTheme = usePortalThemeClass();
  const [trail, setTrail] = useState<Crumb[]>([ROOT]);
  const [topFolders, setTopFolders] = useState<Crumb[]>([]);
  const [listing, setListing] = useState<ResourceListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [fileOpen, setFileOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileLabel, setFileLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const current = trail[trail.length - 1] ?? ROOT;

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = toResourceListing(await api.loadResources(session.token, current.id));
      setListing(data);
      if (!current.id) setTopFolders(data.folders);
    } catch (err: unknown) {
      setError(messageFromError(err));
    }
  }, [api, session.token, current.id]);

  useEffect(() => { setListing(null); void load(); }, [load]);

  const files = useMemo(() => filterFiles(listing?.files ?? [], query), [listing, query]);
  const folders = useMemo(() => filterFolders(listing?.folders ?? [], query), [listing, query]);

  const pick = (id: string) => setTrail(id ? [ROOT, topFolders.find((f) => f.id === id) ?? { id, name: '' }] : [ROOT]);
  const categoryOptions = [{ value: '', label: 'All' }, ...topFolders.map((f) => ({ value: f.id, label: f.name }))];

  const addFolder = async () => {
    if (!folderName.trim()) { setDialogError('Enter a folder name.'); return; }
    setBusy(true);
    setDialogError(null);
    try {
      await api.addFolder(session.token, current.id, folderName.trim());
      setFolderName('');
      setFolderOpen(false);
      toast.success('Folder created');
      void load();
    } catch (err: unknown) { setDialogError(messageFromError(err)); } finally { setBusy(false); }
  };

  const uploadFile = async () => {
    if (!current.id) { setDialogError('Open a folder first, then upload into it.'); return; }
    if (!file) { setDialogError('Choose a file to upload.'); return; }
    setBusy(true);
    setDialogError(null);
    try {
      const uploaded = await api.uploadFile(session.token, file);
      await api.addFile(session.token, {
        folderId: current.id,
        name: fileLabel.trim() || file.name,
        type: formatOf(file.name).toLowerCase() || 'file',
        size: file.size,
        path: uploaded.url,
      });
      setFile(null);
      setFileLabel('');
      setFileOpen(false);
      toast.success('File uploaded');
      void load();
    } catch (err: unknown) { setDialogError(messageFromError(err)); } finally { setBusy(false); }
  };

  const actions = (
    <>
      <Button variant="outline" className="gap-1.5" onClick={() => { setDialogError(null); setFolderOpen(true); }}><FolderPlus className="h-4 w-4" />Add Folder</Button>
      <Button className="gap-1.5" disabled={!current.id} title={current.id ? undefined : 'Open a folder to upload into it'} onClick={() => { setDialogError(null); setFileOpen(true); }}><Upload className="h-4 w-4" />Upload File</Button>
    </>
  );
  const header = <CentrePageHeader title="Resources" subtitle="Admission and marketing material shared by TTII" actions={actions} />;

  if (error) return <div className="space-y-5">{header}<NoticeCard tone="error">{error}</NoticeCard></div>;
  if (!listing) return <PageLoader label="Loading resources..." />;

  const empty = files.length === 0 && folders.length === 0;

  return (
    <div className="space-y-5">
      {header}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <PillTabs label="Category" value={current.id} onChange={pick} options={categoryOptions} />
        <div className="relative lg:ml-auto">
          <label htmlFor="resource-search" className="sr-only">Search resources</label>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="resource-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search resources" className="w-full pl-9 lg:w-64" />
        </div>
      </div>

      {trail.length > 1 && (
        <nav aria-label="Folder path" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {trail.map((c, i) => (
            <span key={`${c.id}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              {i === trail.length - 1
                ? <span className="font-medium text-foreground">{c.name || listing.folderName}</span>
                : <button type="button" className="text-primary hover:underline" onClick={() => setTrail(trail.slice(0, i + 1))}>{c.name}</button>}
            </span>
          ))}
        </nav>
      )}

      {folders.length > 0 && (
        <section aria-label="Folders" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {folders.map((f) => (
            <button key={f.id} type="button" onClick={() => setTrail([...trail, { id: f.id, name: f.name }])}
              className={cn('flex items-center gap-3 rounded-xl border border-border/70 bg-card p-4 text-left shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-elegant)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary"><FolderOpen className="h-5 w-5" /></span>
              <span className="min-w-0 truncate text-sm font-medium">{f.name}</span>
            </button>
          ))}
        </section>
      )}

      {files.length > 0 && (
        <section aria-label="Files" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {files.map((f) => <FileCard key={f.id} file={f} />)}
        </section>
      )}

      {empty && (
        <NoticeCard>
          {query ? 'No resources match your search.' : current.id ? 'This folder is empty.' : 'No resources have been shared with your centre yet.'}
        </NoticeCard>
      )}

      <Dialog open={folderOpen} onOpenChange={(o) => { if (!busy) setFolderOpen(o); }}>
        <DialogContent className={portalTheme}>
          <DialogHeader>
            <DialogTitle>Add Folder</DialogTitle>
            <DialogDescription>{current.id ? `Inside ${current.name || listing.folderName}.` : 'At the top level.'}</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void addFolder(); }}>
            <div className="space-y-1.5">
              <Label htmlFor="folder-name">Folder name</Label>
              <Input id="folder-name" value={folderName} onChange={(e) => setFolderName(e.target.value)} maxLength={120} />
            </div>
            {dialogError && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{dialogError}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => setFolderOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={busy} className="gap-1.5">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Create Folder</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={fileOpen} onOpenChange={(o) => { if (!busy) setFileOpen(o); }}>
        <DialogContent className={portalTheme}>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>Into {current.name || listing.folderName}. Images and PDFs only.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void uploadFile(); }}>
            <div className="space-y-1.5">
              <Label htmlFor="resource-file">File</Label>
              <Input id="resource-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resource-label">Display name (optional)</Label>
              <Input id="resource-label" value={fileLabel} onChange={(e) => setFileLabel(e.target.value)} placeholder={file?.name ?? 'Defaults to the file name'} />
            </div>
            {dialogError && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{dialogError}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => setFileOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={busy} className="gap-1.5">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Upload</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
