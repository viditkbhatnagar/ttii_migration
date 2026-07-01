// Counsellor Resources (Naji 2026-07-01) — matches the Lovable design: a grid of
// colourful folder cards that drill into a file table with Preview / Download.
// Read-only browse/download (admin manages the files). Reads the real nested
// /admin/resources/* data via api.admin (role 9 is in ADMIN_PORTAL_ROLES).

import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  ChevronRight,
  Download,
  Eye,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderOpen,
  Presentation,
  Search,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DashboardLoader } from '@/components/ui/dashboard-loader';
import { useAdminPageData } from '../../../admin/shared/hooks/useAdminPageData.js';
import { asNumber, asString, formatDate, toRecords } from '../../../admin/shared/utils/admin-data-utils.js';
import type { CounsellorPageProps } from '../../routing/counsellor-routes.js';

const FOLDER_GRADS = [
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-cyan-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-fuchsia-500 to-pink-500',
  'from-blue-600 to-indigo-600',
] as const;

function gradientFor(index: number): string {
  return FOLDER_GRADS[index % FOLDER_GRADS.length] ?? FOLDER_GRADS[0];
}

// Map a file's type/extension to a Lucide icon (mirrors the Lovable folder page).
function fileIcon(typeRaw: string, name: string): LucideIcon {
  const t = (typeRaw || name.split('.').pop() || '').toLowerCase();
  if (t.includes('pdf')) return FileText;
  if (t.includes('xls') || t.includes('sheet') || t.includes('csv')) return FileSpreadsheet;
  if (t.includes('ppt') || t.includes('present')) return Presentation;
  if (t.includes('zip') || t.includes('rar') || t.includes('archive')) return FileArchive;
  if (t.includes('png') || t.includes('jpg') || t.includes('jpeg') || t.includes('img') || t.includes('image') || t.includes('gif'))
    return FileImage;
  if (t.includes('mp4') || t.includes('mov') || t.includes('video')) return FileVideo;
  return FileText;
}

function fileSize(value: unknown): string {
  const n = asNumber(value);
  if (!Number.isFinite(n) || n <= 0) return asString(value) || '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function folderName(f: Record<string, unknown>): string {
  return asString(f.name) || asString(f.folder_name) || 'Folder';
}

export default function CounsellorResourcesPage({ api, session }: CounsellorPageProps) {
  const admin = api.admin;
  const [stack, setStack] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');

  const currentFolderId = stack.length > 0 ? (stack[stack.length - 1]?.id ?? '') : '';

  const { data, loading, error } = useAdminPageData(
    () => admin.loadResources(session.token, currentFolderId),
    [currentFolderId],
  );

  const folders = useMemo(() => (data ? toRecords(data.folders) : []), [data]);
  const files = useMemo(() => (data ? toRecords(data.files) : []), [data]);

  const q = search.trim().toLowerCase();
  const shownFolders = useMemo(
    () => (q ? folders.filter((f) => folderName(f).toLowerCase().includes(q)) : folders),
    [folders, q],
  );
  const shownFiles = useMemo(
    () => (q ? files.filter((f) => asString(f.name).toLowerCase().includes(q)) : files),
    [files, q],
  );

  const openFolder = (f: Record<string, unknown>): void => {
    setStack((prev) => [...prev, { id: asString(f.id), name: folderName(f) }]);
    setSearch('');
  };
  const goTo = (index: number): void => {
    setStack((prev) => (index < 0 ? [] : prev.slice(0, index + 1)));
    setSearch('');
  };

  if (loading) {
    return <DashboardLoader label="resources" tone="theme" />;
  }
  if (error) {
    return (
      <Card className="p-12 text-center shadow-[var(--shadow-soft)] border-border/70">
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      </Card>
    );
  }

  return (
    <main className="space-y-6">
      {/* Header + search */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {folders.length} folder{folders.length === 1 ? '' : 's'} · {files.length} file
            {files.length === 1 ? '' : 's'} available to download.
          </p>
        </div>
        <div className="relative w-full sm:w-[380px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search folders and files"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Breadcrumb (only inside a folder) */}
      {stack.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={() => goTo(-1)}>
            <ArrowLeft className="h-3.5 w-3.5" /> All Folders
          </Button>
          {stack.map((s, idx) => (
            <span key={s.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <button
                type="button"
                onClick={() => goTo(idx)}
                className={
                  idx === stack.length - 1
                    ? 'font-medium text-foreground'
                    : 'text-primary hover:underline'
                }
              >
                {s.name}
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {/* Folder grid — Lovable cards */}
      {shownFolders.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shownFolders.map((f, idx) => {
            const name = folderName(f);
            const count = asNumber(f.file_count) || asNumber(f.files_count) || asNumber(f.total_files);
            return (
              <button key={asString(f.id) || idx} type="button" onClick={() => openFolder(f)} className="text-left">
                <Card className="h-full p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm ${gradientFor(idx)}`}
                    >
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{name}</h3>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {count > 0 ? (
                          <Badge variant="secondary" className="gap-1">
                            <FileText className="h-3 w-3" /> {count} file{count === 1 ? '' : 's'}
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="gap-1">
                          <FolderOpen className="h-3 w-3" /> Open
                        </Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* File table — Lovable folder-detail style */}
      {shownFiles.length > 0 ? (
        <Card className="overflow-hidden p-0 shadow-[var(--shadow-soft)] border-border/70">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>File Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shownFiles.map((file, idx) => {
                const name = asString(file.name) || 'File';
                const type = asString(file.type);
                const path = asString(file.path) || asString(file.file);
                const Icon = fileIcon(type, name);
                return (
                  <TableRow key={asString(file.id) || idx} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="min-w-0 truncate font-medium">{name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {type ? (
                        <Badge variant="outline" className="uppercase">
                          {type}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fileSize(file.size)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(file.created_at) || '—'}</TableCell>
                    <TableCell className="text-right">
                      {path ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={path} target="_blank" rel="noopener noreferrer">
                              <Eye className="mr-1 h-4 w-4" /> Preview
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={path} target="_blank" rel="noopener noreferrer" download>
                              <Download className="mr-1 h-4 w-4" /> Download
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      {/* Empty state */}
      {shownFolders.length === 0 && shownFiles.length === 0 ? (
        <Card className="p-10 text-center shadow-[var(--shadow-soft)] border-border/70">
          <FolderOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {q
              ? 'No folders or files match your search.'
              : stack.length > 0
                ? 'This folder is empty.'
                : 'No resources available yet.'}
          </p>
        </Card>
      ) : null}
    </main>
  );
}
