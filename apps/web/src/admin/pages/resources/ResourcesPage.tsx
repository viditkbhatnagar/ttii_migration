import { useState, useMemo, useCallback } from 'react';
import { Folder, MoreHorizontal, Trash2, Pencil, ChevronRight, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageLoader } from '@/components/ui/page-loader';
import type { AdminPageProps } from '../../routing/admin-routes.js';
import { useAdminPageData } from '../../shared/hooks/useAdminPageData.js';
import { toRecords, asString, formatDate } from '../../shared/utils/admin-data-utils.js';
import { AdminPageHeader } from '../../shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn } from '../../shared/components/AdminDataTable.js';

export default function ResourcesPage({ api, session }: AdminPageProps) {
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showAddFile, setShowAddFile] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState('');
  const [newFilePath, setNewFilePath] = useState('');
  const [renameTarget, setRenameTarget] = useState<{ id: string; type: 'file' | 'folder'; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [saving, setSaving] = useState(false);

  const currentFolderId = folderStack.length > 0 ? (folderStack[folderStack.length - 1]?.id ?? '') : '';

  const { data, loading, error, reload } = useAdminPageData(
    () => api.loadResources(session.token, currentFolderId),
    [currentFolderId],
  );

  const folders = useMemo(() => (data ? toRecords(data.folders) : []), [data]);
  const files = useMemo(() => (data ? toRecords(data.files) : []), [data]);

  const handleFolderClick = useCallback((folder: Record<string, unknown>) => {
    setFolderStack((prev) => [...prev, { id: asString(folder.id), name: asString(folder.name) }]);
  }, []);

  const handleBreadcrumbClick = useCallback((index: number) => {
    if (index < 0) {
      setFolderStack([]);
    } else {
      setFolderStack((prev) => prev.slice(0, index + 1));
    }
  }, []);

  const handleAddFolder = useCallback(async () => {
    if (!newFolderName.trim()) return;
    setSaving(true);
    try {
      await api.addResourceFolder(session.token, currentFolderId, newFolderName.trim());
      setShowAddFolder(false);
      setNewFolderName('');
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, currentFolderId, newFolderName, reload]);

  const handleAddFile = useCallback(async () => {
    if (!newFileName.trim()) return;
    setSaving(true);
    try {
      await api.addResourceFile(session.token, {
        folderId: currentFolderId,
        name: newFileName.trim(),
        type: newFileType.trim(),
        size: 0,
        path: newFilePath.trim(),
      });
      setShowAddFile(false);
      setNewFileName('');
      setNewFileType('');
      setNewFilePath('');
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, currentFolderId, newFileName, newFileType, newFilePath, reload]);

  const handleDelete = useCallback(async (id: string, type: 'file' | 'folder') => {
    setSaving(true);
    try {
      await api.deleteResource(session.token, id, type);
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, reload]);

  const handleRename = useCallback(async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setSaving(true);
    try {
      await api.renameResource(session.token, renameTarget.id, renameTarget.type, renameValue.trim());
      setRenameTarget(null);
      setRenameValue('');
      reload();
    } catch { /* ignore */ } finally { setSaving(false); }
  }, [api, session.token, renameTarget, renameValue, reload]);

  const fileColumns: DataTableColumn[] = useMemo(() => [
    { key: 'name', label: 'File Name', sortable: true },
    { key: 'type', label: 'Type' },
    { key: 'size', label: 'Size' },
    { key: 'created_at', label: 'Upload Date', render: (v: unknown) => formatDate(v) },
    {
      key: '_actions',
      label: 'Actions',
      render: (_v: unknown, row: Record<string, unknown>) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Open row actions">
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {asString(row.path) && (
              <DropdownMenuItem asChild>
                <a href={asString(row.path)} target="_blank" rel="noopener noreferrer">Download</a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => { setRenameTarget({ id: asString(row.id), type: 'file', name: asString(row.name) }); setRenameValue(asString(row.name)); }}>
              <Pencil className="mr-2 h-4 w-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={() => { void handleDelete(asString(row.id), 'file'); }}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [handleDelete]);

  if (loading) {
    return <PageLoader label="Loading resources..." />;
  }

  if (error) {
    return (
      <Card>
        <CardContent role="alert" className="py-8 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <AdminPageHeader title="Resources" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddFolder(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add Folder
          </Button>
          <Button size="sm" onClick={() => setShowAddFile(true)}>
            <Plus className="mr-1 h-4 w-4" /> Upload File
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm">
        <button type="button" className="text-blue-600 hover:underline font-medium" onClick={() => handleBreadcrumbClick(-1)}>
          Home
        </button>
        {folderStack.map((folder, idx) => (
          <span key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <button
              type="button"
              className={idx === folderStack.length - 1 ? 'font-medium text-gray-900' : 'text-blue-600 hover:underline'}
              onClick={() => handleBreadcrumbClick(idx)}
            >
              {folder.name}
            </button>
          </span>
        ))}
      </nav>

      {folders.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {folders.map((folder, idx) => (
            <Card key={idx} className="cursor-pointer transition-shadow hover:shadow-md group relative">
              <CardContent className="flex items-center gap-3 py-4" onClick={() => handleFolderClick(folder)}>
                <Folder className="size-8 text-ttii-primary" />
                <span className="text-sm font-medium text-gray-800">
                  {asString(folder.name) || `Folder ${idx + 1}`}
                </span>
              </CardContent>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" aria-label="Open folder actions">
                      <MoreHorizontal className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setRenameTarget({ id: asString(folder.id), type: 'folder', name: asString(folder.name) }); setRenameValue(asString(folder.name)); }}>
                      <Pencil className="mr-2 h-4 w-4" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => { void handleDelete(asString(folder.id), 'folder'); }}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {files.length > 0 && <AdminDataTable columns={fileColumns} rows={files} />}

      {folders.length === 0 && files.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-400">
            No resources found.
          </CardContent>
        </Card>
      )}

      {/* Add Folder Dialog */}
      <Dialog open={showAddFolder} onOpenChange={setShowAddFolder}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Folder</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Folder Name</Label>
              <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Enter folder name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFolder(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => { void handleAddFolder(); }} disabled={saving || !newFolderName.trim()}>
              {saving ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload File Dialog */}
      <Dialog open={showAddFile} onOpenChange={setShowAddFile}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upload File</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>File Name</Label>
              <Input value={newFileName} onChange={(e) => setNewFileName(e.target.value)} placeholder="Enter file name" />
            </div>
            <div>
              <Label>File Type</Label>
              <Input value={newFileType} onChange={(e) => setNewFileType(e.target.value)} placeholder="e.g. pdf, doc, image" />
            </div>
            <div>
              <Label>File URL / Path</Label>
              <Input value={newFilePath} onChange={(e) => setNewFilePath(e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFile(false)} disabled={saving}>Cancel</Button>
            <Button onClick={() => { void handleAddFile(); }} disabled={saving || !newFileName.trim()}>
              {saving ? 'Uploading...' : 'Upload File'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renameTarget !== null} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename {renameTarget?.type === 'folder' ? 'Folder' : 'File'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>New Name</Label>
              <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="Enter new name" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)} disabled={saving}>Cancel</Button>
            <Button onClick={() => { void handleRename(); }} disabled={saving || !renameValue.trim()}>
              {saving ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
