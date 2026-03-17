import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AdminPageHeader } from '../../../admin/shared/components/AdminPageHeader.js';
import { AdminDataTable, type DataTableColumn, type DataTableAction } from '../../../admin/shared/components/AdminDataTable.js';
import { asString, toRecords, formatDate, messageFromError } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CentrePageProps } from '../../routing/centre-routes.js';

interface BreadcrumbEntry {
  id: string;
  name: string;
}

function formatFileSize(bytes: unknown): string {
  const size = typeof bytes === 'number' ? bytes : Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  return `${(size / 1024).toFixed(1)} KB`;
}

const fileColumns: DataTableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'type', label: 'Type', sortable: true },
  {
    key: 'size',
    label: 'Size',
    sortable: true,
    render: (value) => formatFileSize(value),
  },
  {
    key: 'created_at',
    label: 'Upload Date',
    sortable: true,
    render: (value) => formatDate(value),
  },
];

export default function CentreResourcesPage({ api, session }: CentrePageProps) {
  const [currentFolderId, setCurrentFolderId] = useState('');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([{ id: '', name: 'Root' }]);
  const [folders, setFolders] = useState<Record<string, unknown>[]>([]);
  const [files, setFiles] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFilePath, setNewFilePath] = useState('');

  const loadResources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.loadResources(session.token, currentFolderId);
      setFolders(toRecords(data.folders));
      setFiles(toRecords(data.files));
    } catch (err: unknown) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  }, [api, session.token, currentFolderId]);

  useEffect(() => {
    void loadResources();
  }, [loadResources]);

  const navigateToFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs((prev) => [...prev, { id: folderId, name: folderName }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    const entry = breadcrumbs[index];
    if (!entry) return;
    setCurrentFolderId(entry.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const handleAddFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await api.addFolder(session.token, currentFolderId, newFolderName.trim());
      setNewFolderName('');
      setFolderDialogOpen(false);
      void loadResources();
    } catch (err: unknown) {
      alert(messageFromError(err));
    }
  };

  const handleUploadFile = async () => {
    if (!newFileName.trim() || !newFilePath.trim()) return;
    try {
      await api.addFile(session.token, {
        folderId: currentFolderId,
        name: newFileName.trim(),
        type: newFileName.split('.').pop() ?? 'unknown',
        size: 0,
        path: newFilePath.trim(),
      });
      setNewFileName('');
      setNewFilePath('');
      setFileDialogOpen(false);
      void loadResources();
    } catch (err: unknown) {
      alert(messageFromError(err));
    }
  };

  const fileActions: DataTableAction[] = [
    { label: 'Download', onClick: (row) => alert(`Download: ${asString(row.name)}`) },
    { label: 'Rename', onClick: (row) => alert(`Rename: ${asString(row.name)}`) },
    { label: 'Delete', onClick: (row) => alert(`Delete: ${asString(row.name)}`), variant: 'destructive' },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-red-600">
          {error}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Resources">
        <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 bg-ttii-primary hover:bg-ttii-primary/90">
              + Upload File
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload File</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>File Name</Label>
                <Input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="Enter file name"
                />
              </div>
              <div className="space-y-2">
                <Label>File Path</Label>
                <Input
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  placeholder="Enter file path"
                />
              </div>
              <Button
                className="w-full bg-ttii-primary hover:bg-ttii-primary/90"
                onClick={() => void handleUploadFile()}
              >
                Upload
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-1.5">
              + Add Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Folder Name</Label>
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                />
              </div>
              <Button
                className="w-full bg-ttii-primary hover:bg-ttii-primary/90"
                onClick={() => void handleAddFolder()}
              >
                Create Folder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </AdminPageHeader>

      {/* Breadcrumb navigation */}
      <div className="flex items-center gap-1 text-sm text-gray-600">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.id || 'root'} className="flex items-center gap-1">
            {index > 0 && <span className="text-gray-400">&gt;</span>}
            <button
              type="button"
              className={
                index === breadcrumbs.length - 1
                  ? 'font-medium text-gray-900'
                  : 'text-blue-600 hover:underline'
              }
              onClick={() => navigateToBreadcrumb(index)}
            >
              {crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Folder grid */}
      {folders.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Folders</h2>
          <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            {folders.map((folder) => {
              const folderId = asString(folder.id) || asString(folder._id);
              const folderName = asString(folder.name) || asString(folder.folder_name);
              return (
                <Card
                  key={folderId}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => navigateToFolder(folderId, folderName)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="text-2xl">📁</span>
                    <span className="truncate text-sm font-medium text-gray-800">
                      {folderName}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* File table */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Files</h2>
        <AdminDataTable
          columns={fileColumns}
          rows={files}
          actions={fileActions}
          pageSize={10}
        />
      </div>
    </div>
  );
}
